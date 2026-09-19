const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProductAuthentication", function () {
  let contract;
  let admin, manufacturer, unauthorized, customer;

  // Reusable sample product data
  const productId = "PROD-001";
  const productName = "Wireless Earbuds X1";
  const brand = "AcmeAudio";
  const batchNumber = "BATCH-2026-01";
  const manufacturingDate = Math.floor(Date.now() / 1000) - 86400; // yesterday
  const expiryDate = Math.floor(Date.now() / 1000) + 86400 * 365; // 1 year from now

  beforeEach(async function () {
    [admin, manufacturer, unauthorized, customer] = await ethers.getSigners();

    const ProductAuthentication = await ethers.getContractFactory("ProductAuthentication");
    contract = await ProductAuthentication.deploy();
    await contract.waitForDeployment();

    // Authorize a manufacturer wallet (simulating admin approval workflow)
    await contract.connect(admin).authorizeManufacturer(manufacturer.address);
  });

  // ------------------------------------------------------------
  describe("Product Registration", function () {
    it("should register a new product successfully", async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );

      const product = await contract.getProduct(productId);
      expect(product.productId).to.equal(productId);
      expect(product.productName).to.equal(productName);
      expect(product.brand).to.equal(brand);
      expect(product.manufacturer).to.equal(manufacturer.address);
      expect(product.currentOwner).to.equal(manufacturer.address);
      expect(product.status).to.equal(0); // ACTIVE
    });

    it("should emit a ProductRegistered event", async function () {
      await expect(
        contract.connect(manufacturer).registerProduct(
          productId, productName, brand, batchNumber, manufacturingDate, expiryDate
        )
      )
        .to.emit(contract, "ProductRegistered")
        .withArgs(productId, manufacturer.address, productName, anyUint());
    });

    it("should prevent duplicate product IDs", async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );

      await expect(
        contract.connect(manufacturer).registerProduct(
          productId, "Different Name", brand, batchNumber, manufacturingDate, expiryDate
        )
      ).to.be.revertedWith("ProductAuthentication: product already registered");
    });

    it("should reject registration from an unauthorized wallet", async function () {
      await expect(
        contract.connect(unauthorized).registerProduct(
          productId, productName, brand, batchNumber, manufacturingDate, expiryDate
        )
      ).to.be.revertedWith("ProductAuthentication: caller is not an authorized manufacturer");
    });

    it("should reject an empty productId", async function () {
      await expect(
        contract.connect(manufacturer).registerProduct(
          "", productName, brand, batchNumber, manufacturingDate, expiryDate
        )
      ).to.be.revertedWith("ProductAuthentication: productId required");
    });

    it("should reject expiry date earlier than manufacturing date", async function () {
      await expect(
        contract.connect(manufacturer).registerProduct(
          productId, productName, brand, batchNumber, manufacturingDate, manufacturingDate - 1000
        )
      ).to.be.revertedWith("ProductAuthentication: expiry must be after manufacturing date");
    });
  });

  // ------------------------------------------------------------
  describe("Product Retrieval & Verification", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );
    });

    it("should confirm productExists() returns true for a registered product", async function () {
      expect(await contract.productExists(productId)).to.equal(true);
    });

    it("should confirm productExists() returns false for an unknown product", async function () {
      expect(await contract.productExists("NON-EXISTENT-ID")).to.equal(false);
    });

    it("should revert getProduct() for a non-existent product", async function () {
      await expect(contract.getProduct("NON-EXISTENT-ID")).to.be.revertedWith(
        "ProductAuthentication: product does not exist"
      );
    });

    it("anyone (even without a wallet role) should be able to read product data", async function () {
      const product = await contract.connect(customer).getProduct(productId);
      expect(product.productName).to.equal(productName);
    });
  });

  // ------------------------------------------------------------
  describe("Product Revocation", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );
    });

    it("should allow the manufacturer to revoke their own product", async function () {
      await contract.connect(manufacturer).revokeProduct(productId);
      const product = await contract.getProduct(productId);
      expect(product.status).to.equal(1); // REVOKED
    });

    it("should allow the admin to revoke any product", async function () {
      await contract.connect(admin).revokeProduct(productId);
      const product = await contract.getProduct(productId);
      expect(product.status).to.equal(1); // REVOKED
    });

    it("should emit a ProductRevoked event", async function () {
      await expect(contract.connect(manufacturer).revokeProduct(productId))
        .to.emit(contract, "ProductRevoked")
        .withArgs(productId, manufacturer.address, anyUint());
    });

    it("should reject revocation from an unrelated authorized manufacturer", async function () {
      // authorize a second manufacturer who did NOT create this product
      await contract.connect(admin).authorizeManufacturer(unauthorized.address);
      await expect(
        contract.connect(unauthorized).revokeProduct(productId)
      ).to.be.revertedWith("ProductAuthentication: only manufacturer or admin can revoke");
    });

    it("should reject revoking an already-revoked product", async function () {
      await contract.connect(manufacturer).revokeProduct(productId);
      await expect(
        contract.connect(manufacturer).revokeProduct(productId)
      ).to.be.revertedWith("ProductAuthentication: already revoked");
    });
  });

  // ------------------------------------------------------------
  describe("Ownership Transfer", function () {
    beforeEach(async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );
    });

    it("should allow the current owner to transfer ownership", async function () {
      await contract.connect(manufacturer).transferProduct(productId, customer.address);
      const product = await contract.getProduct(productId);
      expect(product.currentOwner).to.equal(customer.address);
      expect(product.status).to.equal(2); // SOLD
    });

    it("should emit a ProductTransferred event", async function () {
      await expect(
        contract.connect(manufacturer).transferProduct(productId, customer.address)
      )
        .to.emit(contract, "ProductTransferred")
        .withArgs(productId, manufacturer.address, customer.address, anyUint());
    });

    it("should reject transfer from a non-owner", async function () {
      await expect(
        contract.connect(unauthorized).transferProduct(productId, customer.address)
      ).to.be.revertedWith("ProductAuthentication: only current owner can transfer");
    });

    it("should reject transfer to the zero address", async function () {
      await expect(
        contract.connect(manufacturer).transferProduct(productId, ethers.ZeroAddress)
      ).to.be.revertedWith("ProductAuthentication: invalid new owner");
    });

    it("should reject transferring a revoked product", async function () {
      await contract.connect(manufacturer).revokeProduct(productId);
      await expect(
        contract.connect(manufacturer).transferProduct(productId, customer.address)
      ).to.be.revertedWith("ProductAuthentication: cannot transfer a revoked product");
    });
  });

  // ------------------------------------------------------------
  describe("Product History", function () {
    it("should record REGISTERED, TRANSFERRED, and REVOKED events in order", async function () {
      await contract.connect(manufacturer).registerProduct(
        productId, productName, brand, batchNumber, manufacturingDate, expiryDate
      );
      await contract.connect(manufacturer).transferProduct(productId, customer.address);

      // customer now owns it; admin (not owner) revokes as admin override
      await contract.connect(admin).revokeProduct(productId);

      const history = await contract.getProductHistory(productId);
      expect(history.length).to.equal(3);
      expect(history[0].action).to.equal("REGISTERED");
      expect(history[1].action).to.equal("TRANSFERRED");
      expect(history[2].action).to.equal("REVOKED");
    });
  });

  // ------------------------------------------------------------
  describe("Manufacturer Authorization (Admin controls)", function () {
    it("should reject a non-admin trying to authorize a manufacturer", async function () {
      await expect(
        contract.connect(manufacturer).authorizeManufacturer(unauthorized.address)
      ).to.be.revertedWith("ProductAuthentication: caller is not admin");
    });

    it("should emit ManufacturerAuthorized when admin authorizes a wallet", async function () {
      await expect(contract.connect(admin).authorizeManufacturer(unauthorized.address))
        .to.emit(contract, "ManufacturerAuthorized")
        .withArgs(unauthorized.address, anyUint());
    });

    it("should prevent a revoked manufacturer from registering new products", async function () {
      await contract.connect(admin).revokeManufacturer(manufacturer.address);
      await expect(
        contract.connect(manufacturer).registerProduct(
          productId, productName, brand, batchNumber, manufacturingDate, expiryDate
        )
      ).to.be.revertedWith("ProductAuthentication: caller is not an authorized manufacturer");
    });
  });
});

// Helper: chai-matchers' anyValue equivalent for uint timestamps,
// since block.timestamp is not deterministic across test runs.
function anyUint() {
  const { anyUint: anyUintMatcher } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
  return anyUintMatcher;
}
