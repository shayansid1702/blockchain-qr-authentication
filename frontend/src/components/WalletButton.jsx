import { useWeb3 } from "../context/Web3Context";

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function WalletButton() {
  const { account, connecting, connect, error, isWrongNetwork, switchToSepolia } = useWeb3();

  if (isWrongNetwork) {
    return (
      <button
        onClick={switchToSepolia}
        className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
      >
        Wrong network — switch to Sepolia
      </button>
    );
  }

  if (account) {
    return (
      <span className="rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700">
        {shortenAddress(account)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={connect}
        disabled={connecting}
        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && <span className="max-w-xs text-xs text-rose-600">{error}</span>}
    </div>
  );
}
