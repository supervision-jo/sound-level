import React, { useState } from "react";
import { FileSpreadsheet } from "lucide-react";

interface ApiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const BASE_URL = "https://sound-level.vision-jo.com/api/reports";

const REPORT_CONFIG: { id: ReportId; filename: string }[] = [
  { id: 1, filename: "Noise_Levels_By_Shift_Per_Sensor.xlsx" },
  { id: 2, filename: "Hourly_Noise_Levels_By_Sensor.xlsx" },
  { id: 3, filename: "Hourly_Noise_Levels_By_Department.xlsx" },
  { id: 4, filename: "Noise_Levels_By_Shift_Per_Department.xlsx" },
  { id: 5, filename: "Detailed_Sensor_Noise_Report_By_Shift.xlsx" },
  { id: 6, filename: "Noise_Sensor_Configuration_And_Settings.xlsx" },
  { id: 7, filename: "Daily_Noise_Levels_By_Sensor.xlsx" },
  { id: 8, filename: "Weekly_Hourly_Noise_Patterns_By_Sensor.xlsx" },
];

const getReportConfig = (id: ReportId) =>
  REPORT_CONFIG.find((r) => r.id === id) ?? {
    id,
    filename: `Report_${id}.xlsx`,
  };

const getReportLabel = (id: ReportId) => {
  const { filename } = getReportConfig(id);
  const base = filename.replace(/\.xlsx$/i, "");
  return base.replace(/_/g, " ");
};

const buildFilenameWithDates = (
  baseFilename: string,
  fromDate?: string,
  toDate?: string
) => {
  const dotIndex = baseFilename.lastIndexOf(".");
  const namePart =
    dotIndex > 0 ? baseFilename.slice(0, dotIndex) : baseFilename;
  const extPart = dotIndex > 0 ? baseFilename.slice(dotIndex) : ".xlsx";

  let suffix = "";
  if (fromDate && toDate) {
    suffix = `_${fromDate}_to_${toDate}`;
  } else if (fromDate) {
    suffix = `_${fromDate}_and_after`;
  } else if (toDate) {
    suffix = `_until_${toDate}`;
  }

  return `${namePart}${suffix}${extPart}`;
};

const ApiReportModal: React.FC<ApiReportModalProps> = ({ isOpen, onClose }) => {
  const today = new Date().toISOString().split("T")[0];

  const [reportId, setReportId] = useState<ReportId>(1);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    // Basic date validation against today's date and range consistency
    if (fromDate && fromDate > today) {
      setError("Start date cannot be in the future.");
      return;
    }

    if (toDate && toDate > today) {
      setError("End date cannot be in the future.");
      return;
    }

    if (fromDate && toDate && fromDate > toDate) {
      setError("Start date cannot be after end date.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    const params = new URLSearchParams();
    if (fromDate) {
      params.append("start_date", fromDate);
    }
    if (toDate) {
      params.append("end_date", toDate);
    }

    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/report-${reportId}/?${queryString}`
      : `${BASE_URL}/report-${reportId}/`;

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

      // Build a descriptive filename based on report type and optional dates
      const baseFilename = getReportConfig(reportId).filename;
      const filename = buildFilenameWithDates(
        baseFilename,
        fromDate || undefined,
        toDate || undefined
      );

      const urlObject = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlObject;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlObject);

      setSuccess(`"${getReportLabel(reportId)}" downloaded as Excel.`);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6 sm:px-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white shadow-2xl border border-blue-100/60 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/60">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <FileSpreadsheet className="h-4 w-4" />
                </span>
                Generate Excel Report
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                Select a report and optional date range to download data.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <span className="sr-only">Close</span>✕
            </button>
          </div>

          {/* Body */}
          <div className="px-5 sm:px-6 py-5 space-y-4 sm:space-y-5">
            {/* Report selector */}
            <div className="space-y-1.5">
              <label className="block text-xs sm:text-sm font-medium text-slate-700">
                Report template
              </label>
              <select
                value={reportId}
                onChange={(e) =>
                  setReportId(Number(e.target.value) as ReportId)
                }
                className="block w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {REPORT_CONFIG.map((config) => (
                  <option key={config.id} value={config.id}>
                    {getReportLabel(config.id)}
                  </option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm font-medium text-slate-700">
                  Date range
                </p>
                <p className="text-[11px] text-slate-500">
                  Leave empty to export all available data.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs text-slate-600">
                    From date <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-600">
                    To date <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Feedback messages */}
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs sm:text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs sm:text-sm text-emerald-700">
                {success}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 px-5 sm:px-6 py-3.5 bg-slate-50/60">
            <p className="text-[11px] sm:text-xs text-slate-500">
              Reports are generated in real time from the latest measurements.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-50" />
                <span>
                  {isSubmitting ? "Generating..." : "Generate report"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiReportModal;
