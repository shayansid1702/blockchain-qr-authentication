import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listProducts } from "../api/products";
import { useAuth } from "../context/AuthContext";
import Spinner from "../components/Spinner";
import StatusBadge from "../components/StatusBadge";
import ErrorAlert from "../components/ErrorAlert";

export default function ManufacturerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const isApproved = user?.manufacturer?.isApproved;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.manufacturer?.companyName || "My Dashboard"}
          </h1>
          <p className="text-sm text-slate-500">Products you've registered on-chain.</p>
        </div>
        <Link
          to="/manufacturer/register-product"
          className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
            isApproved ? "bg-indigo-600 hover:bg-indigo-700" : "pointer-events-none bg-slate-300"
          }`}
        >
          + Register product
        </Link>
      </div>

      {!isApproved && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Your account is pending admin approval. You'll be able to register products once
          approved.
        </div>
      )}

      <ErrorAlert message={error} />
      {loading ? (
        <Spinner />
      ) : products.length === 0 ? (
        <p className="mt-8 text-center text-sm text-slate-500">No products registered yet.</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_db_id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{p.product_name}</p>
                    <p className="text-xs text-slate-400">{p.brand}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.batch_number}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(p.created_at).toLocaleDateString()}
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
    </div>
  );
}
