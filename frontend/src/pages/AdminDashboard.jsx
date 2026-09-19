import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardStats } from "../api/dashboard";
import { listManufacturers, approveManufacturer } from "../api/manufacturers";
import { listProducts } from "../api/products";
import { useWeb3 } from "../context/Web3Context";
import StatCard from "../components/StatCard";
import StatusBadge from "../components/StatusBadge";
import Spinner from "../components/Spinner";
import ErrorAlert from "../components/ErrorAlert";
import WalletButton from "../components/WalletButton";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvingId, setApprovingId] = useState(null);
  const [approveError, setApproveError] = useState(null);
  const { contract } = useWeb3();

  const loadAll = () => {
    setLoading(true);
    Promise.all([getDashboardStats(), listManufacturers(), listProducts()])
      .then(([s, m, p]) => {
        setStats(s);
        setManufacturers(m);
        setProducts(p);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(loadAll, []);

  const handleApprove = async (manufacturer) => {
    setApproveError(null);
    if (!contract) {
      setApproveError("Connect the admin wallet first — approval also authorizes the wallet on-chain.");
      return;
    }
    setApprovingId(manufacturer.manufacturer_id);
    try {
      const tx = await contract.authorizeManufacturer(manufacturer.wallet_address);
      await tx.wait();
      await approveManufacturer(manufacturer.manufacturer_id);
      loadAll();
    } catch (err) {
      setApproveError(err.reason || err.message || "Approval failed");
    } finally {
      setApprovingId(null);
    }
  };

  const pending = manufacturers.filter((m) => !m.is_approved);
  const approved = manufacturers.filter((m) => m.is_approved);

  if (loading) return <Spinner label="Loading dashboard..." />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <WalletButton />
      </div>

      <ErrorAlert message={error} />

      {stats && (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total products" value={stats.totalProducts} />
          <StatCard label="Active" value={stats.activeProducts} accent="emerald" />
          <StatCard label="Revoked" value={stats.revokedProducts} accent="rose" />
          <StatCard label="Sold" value={stats.soldProducts} accent="amber" />
          <StatCard label="Manufacturers" value={stats.totalManufacturers} />
          <StatCard label="Verifications" value={stats.totalVerifications} />
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Pending manufacturer approvals</h2>
        <ErrorAlert message={approveError} />
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No pending requests.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Wallet</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pending.map((m) => (
                  <tr key={m.manufacturer_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{m.company_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.full_name} · {m.email}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.wallet_address}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleApprove(m)}
                        disabled={approvingId === m.manufacturer_id}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {approvingId === m.manufacturer_id ? "Approving..." : "Approve"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Approved manufacturers</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {approved.map((m) => (
            <div key={m.manufacturer_id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="font-medium text-slate-800">{m.company_name}</p>
              <p className="text-xs text-slate-500">{m.email}</p>
              <p className="mt-1 truncate font-mono text-xs text-slate-400">{m.wallet_address}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">All products</h2>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No products registered yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Manufacturer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.product_db_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{p.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{p.manufacturer_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/verify/${encodeURIComponent(p.contract_product_id)}`}
                        className="text-indigo-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
