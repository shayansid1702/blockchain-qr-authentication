export default function StatCard({ label, value, accent = "indigo" }) {
  const accents = {
    indigo: "text-indigo-700 bg-indigo-50",
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    amber: "text-amber-700 bg-amber-50",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 inline-block rounded px-2 py-0.5 text-2xl font-bold ${accents[accent]}`}>
        {value}
      </p>
    </div>
  );
}
