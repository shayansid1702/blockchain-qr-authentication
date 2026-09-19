import contractAbi from "./contractAbi.json";

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const CONTRACT_ABI = contractAbi;

// Sepolia testnet chain id (decimal 11155111 / hex 0xaa36a7).
export const SEPOLIA_CHAIN_ID = 11155111n;
export const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
