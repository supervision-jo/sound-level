import React, { useState } from "react";

interface ApiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const BASE_URL = "https://sound-level.vision-jo.com/api/reports";

const ApiReportModal: React.FC<ApiReportModalProps> = ({ isOpen, onClose }) => {
  const today = new Date().toISOString().split("T")[0];

  const [reportId, setReportId] = useState<ReportId>(1);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    // Call the report endpoint as-is, without query parameters
    const url = `${BASE_URL}/report-${reportId}/`;

    try {
      setIsSubmitting(true);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Failed to generate report.";
        try {
          const data = await response.json();
          message = data?.detail || data?.message || data?.error || message;
        } catch {
          // ignore JSON parse errors and keep default message
        }
        throw new Error(message);
      }

      // Expect binary (Excel) and trigger a download in the browser
      const blob = await response.blob();

      // Try to get filename from Content-Disposition header if present
      const disposition = response.headers.get("content-disposition");
      let filename = `noise-report-${reportId}.xlsx`;

      if (disposition) {
        const match = disposition.match(/filename\*?=("?)([^"]+)\1/);
        if (match && match[2]) {
          filename = decodeURIComponent(match[2]);
        }
      }

      const urlObject = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlObject;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlObject);

      setSuccess(`Report ${reportId} downloaded as Excel.`);
    } catch (err) {
      console.error("Error generating report:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while generating report."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Generate Report
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Choose report name and date range
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>✕
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Report
            </label>
            <select
              value={reportId}
              onChange={(e) => setReportId(Number(e.target.value) as ReportId)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                <option key={id} value={id}>
                  Report {id}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                From date
              </label>
              <input
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                To date
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              {success}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {isSubmitting ? "Generating..." : "Generate report"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApiReportModal;
