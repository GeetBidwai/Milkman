import { useState } from "react";

import { uploadProductsCsv } from "../api";

export default function AdminUploadCSV() {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!file) {
      setError("Choose a CSV file to upload.");
      return;
    }

    try {
      setUploading(true);
      const response = await uploadProductsCsv(file);
      setMessage(
        response?.message
          ? `${response.message}${typeof response.created_count === "number" ? ` (${response.created_count} created)` : ""}`
          : "Products uploaded successfully"
      );
      setFile(null);
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
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
          key={file ? file.name : "empty"}
          className="block w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
        <button
          type="submit"
          disabled={uploading}
          className="w-full rounded-2xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </form>
    </div>
  );
}
