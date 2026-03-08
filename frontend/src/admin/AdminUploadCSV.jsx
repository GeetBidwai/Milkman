import { useState } from "react";

export default function AdminUploadCSV() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!file) {
      setMessage("Choose a CSV file to upload.");
      return;
    }
    setMessage(`Ready to upload ${file.name}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-400">Admin</p>
        <h2 className="text-3xl font-bold text-slate-900">Upload CSV</h2>
      </div>
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="text-sm text-slate-600">Upload Products CSV</p>
        <input
          type="file"
          accept=".csv"
          className="block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button
          type="submit"
          className="w-full rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600"
        >
          Upload
        </button>
        {message ? <p className="text-sm text-slate-500">{message}</p> : null}
      </form>
    </div>
  );
}
