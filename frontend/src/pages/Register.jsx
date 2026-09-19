import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerManufacturer } from "../api/manufacturers";
import { useWeb3 } from "../context/Web3Context";
import ErrorAlert from "../components/ErrorAlert";
import WalletButton from "../components/WalletButton";

const initialForm = {
  fullName: "",
  email: "",
  password: "",
  companyName: "",
  contactEmail: "",
  contactPhone: "",
  businessAddress: "",
};

export default function Register() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { account } = useWeb3();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!account) {
      setError("Connect your MetaMask wallet first — this becomes your authorized product-registration address.");
      return;
    }

    setSubmitting(true);
    try {
      await registerManufacturer({ ...form, walletAddress: account });
      setSuccess(
        "Registration submitted! An admin must approve your account before you can register products. You'll be able to log in once approved."
      );
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Register as a manufacturer</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your account will be reviewed by an admin before you can register products
        on-chain.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <span className="text-sm text-slate-600">Wallet address (used for on-chain authorization):</span>
        <WalletButton />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ErrorAlert message={error} />
        {success && (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Full name" value={form.fullName} onChange={update("fullName")} required />
          <Field label="Company name" value={form.companyName} onChange={update("companyName")} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Login email" type="email" value={form.email} onChange={update("email")} required />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} required minLength={8} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact email" type="email" value={form.contactEmail} onChange={update("contactEmail")} />
          <Field label="Contact phone" value={form.contactPhone} onChange={update("contactPhone")} />
        </div>
        <Field label="Business address" value={form.businessAddress} onChange={update("businessAddress")} />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {submitting ? "Submitting..." : "Submit registration"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}
