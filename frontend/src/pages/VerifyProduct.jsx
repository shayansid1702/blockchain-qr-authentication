import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { readOnlyContract } from "../context/Web3Context";
import { useWeb3 } from "../context/Web3Context";
import { getProduct, verifyProduct, getProductHistory, revokeProductSync, transferProductSync } from "../api/products";
import { parseOnChainProduct, unixToDateLabel, timestampToLabel } from "../utils/format";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StatusBadge";
import ErrorAlert from "../components/ErrorAlert";

export default function VerifyProduct() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { account, contract } = useWeb3();

  const [searchInput, setSearchInput] = useState(routeId || "");
  const [loading, setLoading] = useState(!!routeId);
  const [result, setResult] = useState(null); // "AUTHENTIC" | "REVOKED" | "INVALID"
  const [onChain, setOnChain] = useState(null);
  const [dbProduct, setDbProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [chainAdmin, setChainAdmin] = useState(null);

  useEffect(() => {
    readOnlyContract.admin().then(setChainAdmin).catch(() => {});
  }, []);

  const load = useCallback(async (productId) => {
    setLoading(true);
    setError(null);
    setOnChain(null);
    setDbProduct(null);
    setHistory([]);
    try {
      const exists = await readOnlyContract.productExists(productId);
      if (!exists) {
        setResult("INVALID");
        // Still log the failed attempt + surface any stray DB row.
        await verifyProduct(productId).catch(() => {});
        return;
      }

      const raw = await readOnlyContract.getProduct(productId);
      const parsed = parseOnChainProduct(raw);
      setOnChain(parsed);
      setResult(parsed.status === "REVOKED" ? "REVOKED" : "AUTHENTIC");

      const [verifyRes, historyRes] = await Promise.all([
        verifyProduct(productId).catch(() => null),
        getProductHistory(productId).catch(() => []),
      ]);
      if (verifyRes?.product) setDbProduct(verifyRes.product);
      else await getProduct(productId).then(setDbProduct).catch(() => {});
      setHistory(historyRes);
    } catch (err) {
      setError(err.message || "Failed to verify product");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (routeId) load(routeId);
  }, [routeId, load]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) navigate(`/verify/${encodeURIComponent(searchInput.trim())}`);
  };

  const isOwner = !!(account && onChain && account.toLowerCase() === onChain.currentOwner.toLowerCase());
  const isChainAdmin = !!(account && chainAdmin && account.toLowerCase() === chainAdmin.toLowerCase());
  const canRevoke = isOwner || isChainAdmin;

  const handleRevoke = async () => {
    if (!contract) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const tx = await contract.revokeProduct(routeId);
      const receipt = await tx.wait();
      await revokeProductSync(routeId, receipt.hash);
      await load(routeId);
    } catch (err) {
      setActionError(err.reason || err.message || "Revoke failed");
    } finally {
      setActionBusy(false);
    }
  };

  const handleTransfer = async () => {
    const toWallet = window.prompt("Enter the recipient's wallet address:");
    if (!toWallet) return;
    if (!contract) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const tx = await contract.transferProduct(routeId, toWallet);
      const receipt = await tx.wait();
      await transferProductSync(routeId, receipt.hash, toWallet);
      await load(routeId);
    } catch (err) {
      setActionError(err.reason || err.message || "Transfer failed");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Verify a product</h1>
      <p className="mt-1 text-sm text-slate-500">
        This checks the product record directly on the Sepolia blockchain — the
        authoritative source of truth.
      </p>

      <form onSubmit={handleSearch} className="mt-6 flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Product ID"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
        />
        <button className="rounded-md bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700">
          Verify
        </button>
      </form>

      {loading && <Spinner label="Checking the blockchain..." />}
      <ErrorAlert message={error} />

      {!loading && result === "INVALID" && (
        <div className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-lg font-semibold text-rose-700">Not found on-chain</p>
          <p className="mt-1 text-sm text-rose-600">
            No product with ID "{routeId}" is registered. This may be a counterfeit or an
            invalid code.
          </p>
        </div>
      )}

      {!loading && onChain && (
        <div className="mt-8 space-y-6">
          <div
            className={`rounded-lg border p-6 text-center ${
              result === "REVOKED"
                ? "border-rose-200 bg-rose-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p className={`text-lg font-semibold ${result === "REVOKED" ? "text-rose-700" : "text-emerald-700"}`}>
              {result === "REVOKED" ? "This product has been revoked" : "Authentic product"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Verified directly against the smart contract on Sepolia.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{onChain.productName}</h2>
                <p className="text-sm text-slate-500">{onChain.brand}</p>
              </div>
              <StatusBadge status={onChain.status} />
            </div>

            {dbProduct?.image_url && (
              <img
                src={dbProduct.image_url}
                alt={onChain.productName}
                className="mt-4 h-40 w-full rounded-md object-cover"
              />
            )}
            {dbProduct?.description && (
              <p className="mt-4 text-sm text-slate-600">{dbProduct.description}</p>
            )}

            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-slate-500">Product ID</dt>
              <dd className="font-mono text-slate-800">{onChain.productId}</dd>
              <dt className="text-slate-500">Batch number</dt>
              <dd className="text-slate-800">{onChain.batchNumber}</dd>
              <dt className="text-slate-500">Manufactured</dt>
              <dd className="text-slate-800">{unixToDateLabel(onChain.manufacturingDate)}</dd>
              <dt className="text-slate-500">Expiry</dt>
              <dd className="text-slate-800">{unixToDateLabel(onChain.expiryDate)}</dd>
              <dt className="text-slate-500">Manufacturer wallet</dt>
              <dd className="break-all font-mono text-xs text-slate-800">{onChain.manufacturer}</dd>
              <dt className="text-slate-500">Current owner</dt>
              <dd className="break-all font-mono text-xs text-slate-800">{onChain.currentOwner}</dd>
              {dbProduct?.manufacturer_name && (
                <>
                  <dt className="text-slate-500">Registered by</dt>
                  <dd className="text-slate-800">{dbProduct.manufacturer_name}</dd>
                </>
              )}
            </dl>

            {(canRevoke || isOwner) && onChain.status !== "REVOKED" && (
              <div className="mt-6 border-t border-slate-100 pt-4">
                <p className="text-sm font-medium text-slate-700">Owner / admin actions</p>
                <ErrorAlert message={actionError} />
                <div className="mt-2 flex gap-2">
                  {canRevoke && (
                    <button
                      onClick={handleRevoke}
                      disabled={actionBusy}
                      className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
                    >
                      Revoke
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={handleTransfer}
                      disabled={actionBusy}
                      className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                      Transfer ownership
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900">Transaction history</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {history.map((tx) => (
                  <li key={tx.tx_id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0">
                    <div>
                      <span className="font-medium text-slate-700">{tx.tx_type}</span>
                      <span className="ml-2 text-slate-400">{timestampToLabel(Math.floor(new Date(tx.created_at).getTime() / 1000))}</span>
                    </div>
                    <a
                      href={`https://sepolia.etherscan.io/tx/${tx.tx_hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-indigo-600 hover:underline"
                    >
                      {tx.tx_hash.slice(0, 10)}...
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
