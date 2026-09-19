-- ============================================================
-- Blockchain-Based QR Product Authentication System
-- MySQL Schema — CLOUD / MANAGED HOST VARIANT
-- ============================================================
-- Use this instead of schema.sql when loading into a managed MySQL
-- host (Clever Cloud, PlanetScale, Railway, RDS, etc.) that gives you
-- one pre-provisioned database and does not grant CREATE DATABASE.
--
-- Run it directly against your already-provisioned database, e.g.:
--   mysql -h <host> -P <port> -u <user> -p<password> <database> < database/schema.cloud.sql
--
-- For local development, use database/schema.sql instead (it creates
-- its own `blockchain_qr_auth` database via CREATE DATABASE).
-- ============================================================

-- ------------------------------------------------------------
-- Table: users
-- Stores login credentials for Admins and Manufacturer staff.
-- Customers do NOT need accounts (public verification, no login).
-- ------------------------------------------------------------
CREATE TABLE users (
    user_id         INT AUTO_INCREMENT PRIMARY KEY,
    full_name       VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL,
    password_hash   VARCHAR(255)  NOT NULL,   -- bcrypt hash, never plaintext
    role            ENUM('ADMIN', 'MANUFACTURER') NOT NULL DEFAULT 'MANUFACTURER',
    is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: manufacturers
-- Business-level details for a manufacturer organization.
-- ------------------------------------------------------------
CREATE TABLE manufacturers (
    manufacturer_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    company_name        VARCHAR(150) NOT NULL,
    wallet_address       VARCHAR(42)  NOT NULL,  -- Ethereum address, 0x + 40 hex chars
    contact_email       VARCHAR(150),
    contact_phone       VARCHAR(20),
    business_address    VARCHAR(255),
    is_approved         BOOLEAN NOT NULL DEFAULT FALSE, -- Admin must approve before they can register products
    approved_by         INT NULL,               -- admin user_id who approved
    approved_at         TIMESTAMP NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_manufacturers_user
        FOREIGN KEY (user_id) REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_manufacturers_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(user_id)
        ON DELETE SET NULL,

    UNIQUE KEY uq_manufacturers_wallet (wallet_address),
    INDEX idx_manufacturers_user (user_id),
    INDEX idx_manufacturers_approved (is_approved)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: products
-- A queryable MIRROR of the on-chain product record, plus
-- off-chain-only extras (e.g. free-text description, image URL).
-- ------------------------------------------------------------
CREATE TABLE products (
    product_db_id         INT AUTO_INCREMENT PRIMARY KEY,
    contract_product_id   VARCHAR(100) NOT NULL,   -- the productId used in the smart contract
    manufacturer_id        INT NOT NULL,
    product_name           VARCHAR(150) NOT NULL,
    brand                  VARCHAR(100) NOT NULL,
    batch_number            VARCHAR(100) NOT NULL,
    manufacturing_date      DATE NOT NULL,
    expiry_date              DATE NULL,
    description             TEXT NULL,               -- off-chain only: extra info, not needed for authenticity
    image_url                VARCHAR(255) NULL,       -- off-chain only: product photo
    qr_code_url               VARCHAR(255) NULL,       -- path/URL to generated QR image
    status                    ENUM('ACTIVE', 'REVOKED', 'SOLD') NOT NULL DEFAULT 'ACTIVE',
    current_owner_wallet       VARCHAR(42) NOT NULL,     -- mirrors on-chain currentOwner
    registration_tx_hash        VARCHAR(66) NOT NULL,     -- tx hash of registerProduct()
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_products_manufacturer
        FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(manufacturer_id)
        ON DELETE RESTRICT,

    UNIQUE KEY uq_products_contract_id (contract_product_id),
    INDEX idx_products_manufacturer (manufacturer_id),
    INDEX idx_products_status (status),
    INDEX idx_products_batch (batch_number)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: verification_logs
-- Every time a customer (or anyone) scans a QR code / hits the
-- verify endpoint, we log it here.
-- ------------------------------------------------------------
CREATE TABLE verification_logs (
    log_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_product_id VARCHAR(100) NOT NULL,   -- not a strict FK: allow logging verification attempts
                                                   -- for product IDs that don't exist (invalid scans)
    result             ENUM('AUTHENTIC', 'INVALID', 'REVOKED') NOT NULL,
    ip_address         VARCHAR(45) NULL,          -- IPv4/IPv6
    user_agent         VARCHAR(255) NULL,
    verified_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_verification_product (contract_product_id),
    INDEX idx_verification_result (result),
    INDEX idx_verification_date (verified_at)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Table: blockchain_transactions
-- Audit trail of every on-chain interaction our system initiated
-- (register / revoke / transfer).
-- ------------------------------------------------------------
CREATE TABLE blockchain_transactions (
    tx_id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    contract_product_id VARCHAR(100) NOT NULL,
    tx_hash              VARCHAR(66) NOT NULL,
    tx_type               ENUM('REGISTER', 'REVOKE', 'TRANSFER') NOT NULL,
    from_wallet            VARCHAR(42) NOT NULL,
    to_wallet               VARCHAR(42) NULL,        -- populated for TRANSFER
    status                  ENUM('PENDING', 'CONFIRMED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    gas_used                 BIGINT NULL,
    block_number             BIGINT NULL,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at               TIMESTAMP NULL,

    UNIQUE KEY uq_blockchain_tx_hash (tx_hash),
    INDEX idx_blockchain_tx_product (contract_product_id),
    INDEX idx_blockchain_tx_status (status),
    INDEX idx_blockchain_tx_type (tx_type)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Seed: create a default admin user for first login.
-- This placeholder hash will NOT match any password -- generate a
-- real one and UPDATE it before logging in, e.g.:
--   node -e "require('bcrypt').hash('YourPassword', 10).then(console.log)"
--   UPDATE users SET password_hash = '<hash>' WHERE email = 'admin@example.com';
-- ------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('System Admin', 'admin@example.com', '$2b$10$replace_with_real_bcrypt_hash', 'ADMIN');
