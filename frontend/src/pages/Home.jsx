import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const [productId, setProductId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (productId.trim()) {
      navigate(`/verify/${encodeURIComponent(productId.trim())}`);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
        Verify any product's authenticity on the blockchain
      </h1>
      <p className="mt-4 text-lg text-slate-600">
        Every product registered on AuthentiChain is recorded on the Ethereum Sepolia
        testnet. Scan the QR code on the product, or enter its ID below, to independently
        verify it — no account required.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex justify-center gap-2">
        <input
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          placeholder="Enter a product ID..."
          className="w-80 rounded-md border border-slate-300 px-4 py-2 focus:border-indigo-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700"
        >
          Verify
        </button>
      </form>

      <div className="mt-16 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">1. Manufacturer registers</h3>
          <p className="mt-2 text-sm text-slate-600">
            Approved manufacturers sign a transaction with their own wallet to record a
            product's identity permanently on-chain.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">2. QR code generated</h3>
          <p className="mt-2 text-sm text-slate-600">
            A QR code linking to this product's public verification page is generated and
            can be printed on the packaging.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">3. Anyone can verify</h3>
          <p className="mt-2 text-sm text-slate-600">
            Scanning the code checks the record directly against the smart contract —
            no need to trust a central server.
          </p>
        </div>
      </div>
    </div>
  );
}
