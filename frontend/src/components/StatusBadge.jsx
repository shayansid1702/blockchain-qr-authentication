const STYLES = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  AUTHENTIC: "bg-emerald-100 text-emerald-700",
  SOLD: "bg-sky-100 text-sky-700",
  REVOKED: "bg-rose-100 text-rose-700",
  INVALID: "bg-rose-100 text-rose-700",
  PENDING: "bg-amber-100 text-amber-700",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STYLES[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}
