import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_CHAIN_ID_HEX,
} from "../config/contract";

const Web3Context = createContext(null);

// Read-only provider/contract, usable without MetaMask installed or
// connected -- powers the public /verify/:id page for anyone.
const readOnlyProvider = new JsonRpcProvider(import.meta.env.VITE_SEPOLIA_RPC_URL);
export const readOnlyContract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readOnlyProvider);

export function Web3Provider({ children }) {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  const isWrongNetwork = chainId !== null && chainId !== SEPOLIA_CHAIN_ID;

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask is not installed. Please install it to continue.");
      return;
    }
    setConnecting(true);
    setError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const newSigner = await provider.getSigner();

      setAccount(accounts[0]);
      setChainId(network.chainId);
      setSigner(newSigner);
      setContract(new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, newSigner));
    } catch (err) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
      });
    } catch (err) {
      setError(err.message || "Failed to switch network");
    }
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setContract(null);
    setChainId(null);
  }, []);

  // React to the user switching accounts/networks in MetaMask itself.
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        connect();
      }
    };
    const handleChainChanged = () => {
      connect();
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    account,
    signer,
    contract,
    chainId,
    connecting,
    error,
    isConnected: !!account,
    isWrongNetwork,
    connect,
    disconnect,
    switchToSepolia,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used within a Web3Provider");
  return ctx;
}
