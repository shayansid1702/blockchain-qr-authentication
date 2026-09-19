import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import { createProduct } from "../api/products";
import { dateToUnixSeconds } from "../utils/format";
import ErrorAlert from "../components/ErrorAlert";
import WalletButton from "../components/WalletButton";

const initialForm = {
  contractProductId: "",
  productName: "",
  brand: "",
  batchNumber: "",
  manufacturingDate: "",
  expiryDate: "",
  description: "",
  imageUrl: "",
};

const STEPS = {
  IDLE: "idle",
  ON_CHAIN: "on_chain",
  SYNCING: "syncing",
  DONE: "done",
};

export default function RegisterProduct() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(STEPS.IDLE);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const { contract, account, isConnected, isWrongNetwork } = useWeb3();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setQrCodeUrl(null);

    if (!isConnected) {
      setError("Connect your MetaMask wallet first.");
      return;
    }
    if (isWrongNetwork) {
      setError("Switch MetaMask to the Sepolia testnet first.");
      return;
    }

    try {
      setStep(STEPS.ON_CHAIN);
      const tx = await contract.registerProduct(
        form.contractProductId,
        form.productName,
        form.brand,
        form.batchNumber,
        dateToUnixSeconds(form.manufacturingDate),
        dateToUnixSeconds(form.expiryDate)
      );
      const receipt = await tx.wait();

      setStep(STEPS.SYNCING);
      const { qrCodeUrl: newQrCodeUrl } = await createProduct({
        contractProductId: form.contractProductId,
        productName: form.productName,
        brand: form.brand,
        batchNumber: form.batchNumber,
        manufacturingDate: form.manufacturingDate,
        expiryDate: form.expiryDate || null,
        description: form.description || null,
        imageUrl: form.imageUrl || null,
        registrationTxHash: receipt.hash,
      });

      setQrCodeUrl(newQrCodeUrl);
      setStep(STEPS.DONE);
    } catch (err) {
      setError(err.reason || err.message || "Registration failed");
      setStep(STEPS.IDLE);
    }
  };

  const apiBase = import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, "");

  if (step === STEPS.DONE) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-emerald-700">Product registered!</h1>
        <p className="mt-2 text-sm text-slate-600">
          "{form.productName}" is now recorded on-chain. Print this QR code on the
          packaging — anyone can scan it to verify authenticity.
        </p>
        {qrCodeUrl && (
          <img src={`${apiBase}${qrCodeUrl}`} alt="Product QR code" className="mx-auto mt-6 h-56 w-56 rounded-md border border-slate-200" />
        )}
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => {
              setForm(initialForm);
              setQrCodeUrl(null);
              setStep(STEPS.IDLE);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Register another
          </button>
          <button
            onClick={() => navigate("/manufacturer")}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Register a new product</h1>
      <p className="mt-1 text-sm text-slate-500">
        This writes the product to the blockchain with your own wallet signature, then
        caches it in our database for search and QR generation.
      </p>

      <div className="mt-4 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
        <span className="text-sm text-slate-600">Signing wallet:</span>
        <WalletButton />
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <ErrorAlert message={error} />

        <Field
          label="Product ID (unique, used on-chain)"
          value={form.contractProductId}
          onChange={update("contractProductId")}
          required
          placeholder="e.g. SKU-2026-000123"
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Product name" value={form.productName} onChange={update("productName")} required />
          <Field label="Brand" value={form.brand} onChange={update("brand")} required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Batch number" value={form.batchNumber} onChange={update("batchNumber")} required />
          <Field label="Image URL (optional)" value={form.imageUrl} onChange={update("imageUrl")} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Manufacturing date" type="date" value={form.manufacturingDate} onChange={update("manufacturingDate")} required />
          <Field label="Expiry date (optional)" type="date" value={form.expiryDate} onChange={update("expiryDate")} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
          <textarea
            value={form.description}
            onChange={update("description")}
            rows={3}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={step !== STEPS.IDLE}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {step === STEPS.ON_CHAIN && "Confirm in MetaMask..."}
          {step === STEPS.SYNCING && "Saving..."}
          {step === STEPS.IDLE && "Register product"}
        </button>
      </form>
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
