# AuthentiChain — Blockchain-Based QR Product Authentication System

A full-stack dApp for manufacturers to register products on the Ethereum
(Sepolia testnet) blockchain and generate QR codes that let anyone
independently verify a product's authenticity — no account or trust in a
central server required.

## Architecture

```
blockchain/   Solidity smart contract (Hardhat) — the source of truth
              for product authenticity, ownership, and history.
database/     MySQL schema — an off-chain, queryable mirror of on-chain
              data, plus things that don't belong on a public chain
              (user accounts, verification logs, analytics).
backend/      Express REST API — auth, manufacturer approval workflow,
              QR code generation, and syncing on-chain events to MySQL.
frontend/     React + Vite + Tailwind + ethers.js — manufacturer &
              admin dashboards, public verification page, MetaMask
              integration.
```

**Key principle:** the backend never holds a manufacturer's private key.
Manufacturers sign `registerProduct` / `revokeProduct` / `transferProduct`
transactions directly with their own MetaMask wallet; the backend only
caches the result afterward for fast queries and dashboards. The public
`/verify/:id` page reads directly from the smart contract, so it's
trustworthy even if the backend/database were compromised.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ and npm
- [MySQL](https://dev.mysql.com/downloads/) 8.x running locally
- [MetaMask](https://metamask.io/download/) browser extension
- A Sepolia RPC URL — free from [Alchemy](https://alchemy.com) or
  [Infura](https://infura.io)
- A Sepolia test wallet with test ETH — get some from a
  [faucet](https://sepoliafaucet.com)

## 1. Database setup

```bash
mysql -u root -p < database/schema.sql
```

This creates the `blockchain_qr_auth` database and a seed admin user
(`admin@example.com`). The seeded `password_hash` is a placeholder —
generate a real one and update it before logging in:

```bash
node -e "require('bcrypt').hash('YourChosenPassword', 10).then(console.log)"
```

```sql
UPDATE users SET password_hash = '<hash from above>' WHERE email = 'admin@example.com';
```

## 2. Smart contract (`blockchain/`)

```bash
cd blockchain
npm install
cp .env.example .env
```

Fill in `blockchain/.env`:

```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>
PRIVATE_KEY=<private key of a TEST-ONLY wallet, no 0x prefix issues either way>
```

Compile, test, and deploy:

```bash
npm run compile
npm test
npm run deploy:sepolia
```

`scripts/deploy.js` writes the deployed address + ABI to
`deployments/sepolia.json` — the backend and frontend both read the
contract address from there (copy it into their `.env` files below).

The deployer wallet automatically becomes the contract `admin` — this is
the wallet you'll need connected in MetaMask when approving manufacturers
from the Admin Dashboard later.

## 3. Backend (`backend/`)

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `backend/.env`:

```
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<your MySQL password>
DB_NAME=blockchain_qr_auth
JWT_SECRET=<generate with: openssl rand -hex 32>
JWT_EXPIRES_IN=8h
FRONTEND_ORIGIN=http://localhost:5173
SEPOLIA_RPC_URL=<same as blockchain/.env>
CONTRACT_ADDRESS=<address from deployments/sepolia.json>
```

Run it:

```bash
npm run dev
```

API available at `http://localhost:5000/api` (health check at `/api/health`).
Generated QR code images are served from `http://localhost:5000/uploads/qrcodes/`.

## 4. Frontend (`frontend/`)

```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_CONTRACT_ADDRESS=<same address as backend/.env>
VITE_SEPOLIA_RPC_URL=<same as blockchain/.env — used for read-only chain queries>
```

Run it:

```bash
npm run dev
```

App available at `http://localhost:5173`.

## Trying it end-to-end

1. **Register as a manufacturer** — connect a MetaMask wallet (any
   Sepolia-funded test account) and submit the signup form. The account
   starts unapproved.
2. **Approve it as admin** — log in with the seeded admin account, connect
   MetaMask using the **contract deployer's wallet** (import its private
   key from `blockchain/.env` into MetaMask if needed), and click
   **Approve**. This signs an `authorizeManufacturer` transaction on-chain
   and marks the account approved in the database.
3. **Register a product** — log in as the manufacturer, connect the same
   wallet used at signup, and fill out the product form. This signs
   `registerProduct` on-chain, then caches it in MySQL and generates a QR
   code.
4. **Verify it** — visit `/verify/<productId>` (or scan the generated QR).
   This checks the record directly against the deployed smart contract —
   no login needed.
5. **Revoke / transfer** — from the verify page, the product's current
   owner (or the contract admin, for revoke) can sign a
   `revokeProduct`/`transferProduct` transaction.

## Notes

- Never commit `.env` files — `.gitignore` already excludes them
  everywhere in this repo. Only `.env.example` templates are tracked.
- The `PRIVATE_KEY` in `blockchain/.env` should belong to a test-only
  wallet holding nothing but Sepolia test ETH.
- `blockchain/artifacts`, `blockchain/cache`, `frontend/dist`, and
  `backend/uploads/qrcodes/*` are build/runtime output and intentionally
  gitignored.
