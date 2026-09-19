// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProductAuthentication
/// @notice Stores minimal, essential product-authenticity data on-chain so
///         anyone (customer, auditor, another company) can independently
///         verify a product without trusting a centralized database.
/// @dev Deployed to an Ethereum testnet (Sepolia). This contract intentionally
///      stores ONLY the fields needed to prove authenticity and ownership.
///      Everything else (user accounts, detailed descriptions, images,
///      analytics) lives off-chain in MySQL — see database/schema.sql.
contract ProductAuthentication {

    // ------------------------------------------------------------------
    // ENUMS
    // ------------------------------------------------------------------

    /// @notice Lifecycle status of a product.
    /// ACTIVE  -> genuine and currently valid
    /// REVOKED -> manufacturer/admin has flagged it (recalled, counterfeit found, etc.)
    /// SOLD    -> ownership has passed to an end customer/retailer (still authentic)
    enum ProductStatus { ACTIVE, REVOKED, SOLD }

    // ------------------------------------------------------------------
    // STRUCTS
    // ------------------------------------------------------------------

    /// @notice Core on-chain record for a single product.
    /// @dev String fields are kept short and essential on purpose — every
    ///      byte stored on-chain costs gas permanently. Long free-text
    ///      descriptions belong in MySQL, not here.
    struct Product {
        string productId;          // unique external ID (matches MySQL contract_product_id)
        string productName;
        string brand;
        string batchNumber;
        uint256 manufacturingDate; // stored as unix timestamp
        uint256 expiryDate;        // stored as unix timestamp (0 = no expiry)
        address manufacturer;      // wallet that originally registered the product
        address currentOwner;      // current holder (starts as manufacturer)
        ProductStatus status;
        uint256 createdAt;         // block timestamp at registration
        bool exists;               // guards against "empty struct" false positives
    }

    /// @notice One entry in a product's ownership/status history.
    struct HistoryEntry {
        address actor;         // who performed the action
        string action;         // "REGISTERED" | "TRANSFERRED" | "REVOKED"
        uint256 timestamp;
    }

    // ------------------------------------------------------------------
    // STATE VARIABLES
    // ------------------------------------------------------------------

    address public admin; // contract deployer / super-admin (can add/remove manufacturers)

    /// @notice productId => Product record
    mapping(string => Product) private products;

    /// @notice productId => list of history entries (registration, transfers, revocation)
    mapping(string => HistoryEntry[]) private productHistory;

    /// @notice wallet address => is this address an authorized manufacturer?
    mapping(address => bool) public authorizedManufacturers;

    // ------------------------------------------------------------------
    // EVENTS
    // ------------------------------------------------------------------

    event ProductRegistered(
        string indexed productId,
        address indexed manufacturer,
        string productName,
        uint256 timestamp
    );

    event ProductTransferred(
        string indexed productId,
        address indexed from,
        address indexed to,
        uint256 timestamp
    );

    event ProductRevoked(
        string indexed productId,
        address indexed revokedBy,
        uint256 timestamp
    );

    event ManufacturerAuthorized(address indexed manufacturer, uint256 timestamp);
    event ManufacturerRevoked(address indexed manufacturer, uint256 timestamp);

    // ------------------------------------------------------------------
    // MODIFIERS
    // ------------------------------------------------------------------

    modifier onlyAdmin() {
        require(msg.sender == admin, "ProductAuthentication: caller is not admin");
        _;
    }

    /// @dev Only the contract admin OR an explicitly authorized manufacturer
    ///      wallet may register products. This is the on-chain enforcement
    ///      layer; the backend/DB approval workflow is an additional,
    ///      off-chain UX gate on top of this.
    modifier onlyAuthorized() {
        require(
            msg.sender == admin || authorizedManufacturers[msg.sender],
            "ProductAuthentication: caller is not an authorized manufacturer"
        );
        _;
    }

    modifier productMustExist(string memory productId) {
        require(products[productId].exists, "ProductAuthentication: product does not exist");
        _;
    }

    // ------------------------------------------------------------------
    // CONSTRUCTOR
    // ------------------------------------------------------------------

    constructor() {
        admin = msg.sender;
        // The deployer is auto-authorized so the system is usable immediately.
        authorizedManufacturers[msg.sender] = true;
    }

    // ------------------------------------------------------------------
    // ADMIN FUNCTIONS: manufacturer authorization
    // ------------------------------------------------------------------

    /// @notice Grant a wallet address permission to register products.
    /// @dev Called by admin after approving a manufacturer in the off-chain
    ///      MySQL workflow (manufacturers.is_approved).
    function authorizeManufacturer(address manufacturerWallet) external onlyAdmin {
        require(manufacturerWallet != address(0), "ProductAuthentication: zero address");
        authorizedManufacturers[manufacturerWallet] = true;
        emit ManufacturerAuthorized(manufacturerWallet, block.timestamp);
    }

    /// @notice Revoke a wallet's permission to register new products.
    /// @dev Does NOT affect products already registered by this wallet.
    function revokeManufacturer(address manufacturerWallet) external onlyAdmin {
        authorizedManufacturers[manufacturerWallet] = false;
        emit ManufacturerRevoked(manufacturerWallet, block.timestamp);
    }

    // ------------------------------------------------------------------
    // CORE FUNCTIONS
    // ------------------------------------------------------------------

    /// @notice Register a new product on-chain.
    /// @dev Reverts if a product with the same productId already exists —
    ///      this is the on-chain duplicate-prevention guarantee.
    function registerProduct(
        string memory productId,
        string memory productName,
        string memory brand,
        string memory batchNumber,
        uint256 manufacturingDate,
        uint256 expiryDate
    ) external onlyAuthorized {
        require(bytes(productId).length > 0, "ProductAuthentication: productId required");
        require(!products[productId].exists, "ProductAuthentication: product already registered");
        require(manufacturingDate > 0, "ProductAuthentication: invalid manufacturing date");
        if (expiryDate != 0) {
            require(expiryDate > manufacturingDate, "ProductAuthentication: expiry must be after manufacturing date");
        }

        products[productId] = Product({
            productId: productId,
            productName: productName,
            brand: brand,
            batchNumber: batchNumber,
            manufacturingDate: manufacturingDate,
            expiryDate: expiryDate,
            manufacturer: msg.sender,
            currentOwner: msg.sender,
            status: ProductStatus.ACTIVE,
            createdAt: block.timestamp,
            exists: true
        });

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "REGISTERED",
            timestamp: block.timestamp
        }));

        emit ProductRegistered(productId, msg.sender, productName, block.timestamp);
    }

    /// @notice Fetch the full on-chain record for a product.
    /// @dev Reverts if the product does not exist — callers should check
    ///      productExists() first if they want a non-reverting check.
    function getProduct(string memory productId)
        external
        view
        productMustExist(productId)
        returns (Product memory)
    {
        return products[productId];
    }

    /// @notice Cheap existence check that never reverts — ideal for the
    ///         public verification page to distinguish "not found" from
    ///         other errors.
    function productExists(string memory productId) public view returns (bool) {
        return products[productId].exists;
    }

    /// @notice Mark a product as REVOKED (e.g., recalled, found counterfeit).
    /// @dev Only the original manufacturer or the admin can revoke.
    function revokeProduct(string memory productId)
        external
        onlyAuthorized
        productMustExist(productId)
    {
        Product storage p = products[productId];
        require(
            msg.sender == p.manufacturer || msg.sender == admin,
            "ProductAuthentication: only manufacturer or admin can revoke"
        );
        require(p.status != ProductStatus.REVOKED, "ProductAuthentication: already revoked");

        p.status = ProductStatus.REVOKED;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "REVOKED",
            timestamp: block.timestamp
        }));

        emit ProductRevoked(productId, msg.sender, block.timestamp);
    }

    /// @notice Transfer ownership of a product (e.g., manufacturer -> retailer -> customer).
    /// @dev Only the CURRENT owner may transfer. Automatically marks the
    ///      product as SOLD once it leaves the manufacturer's wallet, unless
    ///      it has been revoked (revoked products cannot be transferred).
    function transferProduct(string memory productId, address newOwner)
        external
        productMustExist(productId)
    {
        Product storage p = products[productId];
        require(msg.sender == p.currentOwner, "ProductAuthentication: only current owner can transfer");
        require(newOwner != address(0), "ProductAuthentication: invalid new owner");
        require(p.status != ProductStatus.REVOKED, "ProductAuthentication: cannot transfer a revoked product");

        address previousOwner = p.currentOwner;
        p.currentOwner = newOwner;
        p.status = ProductStatus.SOLD;

        productHistory[productId].push(HistoryEntry({
            actor: msg.sender,
            action: "TRANSFERRED",
            timestamp: block.timestamp
        }));

        emit ProductTransferred(productId, previousOwner, newOwner, block.timestamp);
    }

    /// @notice Get the full history (registration, transfers, revocation) of a product.
    function getProductHistory(string memory productId)
        external
        view
        productMustExist(productId)
        returns (HistoryEntry[] memory)
    {
        return productHistory[productId];
    }
}
