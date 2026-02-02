import React, { useState, useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Select, { components, OptionProps, SingleValueProps } from "react-select";

interface ApiReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ReportId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const BASE_URL = "https://sound-level.vision-jo.com/api/reports";

const REPORT_CONFIG: {
  id: ReportId;
  filename: string;
  nameAr: string;
  nameEn: string;
}[] = [
  {
    id: 1,
    filename: "Percentage_of_Noise_Above_55dB_By_Sensor.xlsx",
    nameAr: "نسبة الضوضاء التي تتجاوز 55 ديسيبل حسب المستشعر",
    nameEn: "Percentage of Noise Above 55dB By Sensor",
  },
  {
    id: 2,
    filename: "All_Percentages_of_Noise_By_Sensor.xlsx",
    nameAr: "جميع نسب الضوضاء حسب المستشعر",
    nameEn: "All Percentages of Noise By Sensor",
  },
  {
    id: 3,
    filename: "Percentage_of_Noise_Above_55dB_By_Department.xlsx",
    nameAr: "نسبة الضوضاء التي تتجاوز 55 ديسيبل حسب القسم",
    nameEn: "Percentage of Noise Above 55dB By Department",
  },
  {
    id: 4,
    filename: "Percentage_of_Noise_Above_55dB_By_Department_And_Shift.xlsx",
    nameAr: "نسبة الضوضاء التي تتجاوز 55 ديسيبل حسب القسم والوردية",
    nameEn: "Percentage of Noise Above 55dB By Department And Shift",
  },
  {
    id: 5,
    filename: "Percentage_of_Noise_Above_55dB_By_Sensor_And_Shift.xlsx",
    nameAr: "نسبة الضوضاء التي تتجاوز 55 ديسيبل حسب المستشعر والوردية",
    nameEn: "Percentage of Noise Above 55dB By Sensor And Shift",
  },
  {
    id: 6,
    filename: "Sensors_Settings.xlsx",
    nameAr: "إعدادات المستشعرات",
    nameEn: "Sensors Settings",
  },
  {
    id: 7,
    filename: "Percentage_of_Noise_Exceedance_By_Date.xlsx",
    nameAr: "نسبة تجاوز مستويات الضوضاء حسب التاريخ",
    nameEn: "Percentage of Noise Exceedance By Date",
  },
  {
    id: 8,
    filename: "Percentage_of_Noise_Exceedance_By_Day_Of_Week.xlsx",
    nameAr: "نسبة تجاوز مستويات الضوضاء حسب أيام الأسبوع",
    nameEn: "Percentage of Noise Exceedance By Day Of Week",
  },
];

const getReportConfig = (id: ReportId) =>
  REPORT_CONFIG.find((r) => r.id === id) ?? {
    id,
    filename: `Report_${id}.xlsx`,
    nameAr: `تقرير ${id}`,
    nameEn: `Report ${id}`,
  };

interface SelectOption {
  value: ReportId;
  label: string;
  nameEn: string;
  nameAr: string;
}

const CustomOption = (props: OptionProps<SelectOption>) => {
  const { data } = props;
  return (
    <components.Option {...props}>
      <div className="flex items-center w-full">
        <span className="text-left flex-1" dir="ltr">
          {data.nameEn}
        </span>
        <span className="px-2 flex-shrink-0 text-slate-400">|</span>
        <span className="text-right flex-1" dir="rtl">
          {data.nameAr}
        </span>
      </div>
    </components.Option>
  );
};

const CustomSingleValue = (props: SingleValueProps<SelectOption>) => {
  const { data } = props;
  return (
    <components.SingleValue {...props}>
      <div className="flex items-center w-full">
        <span className="text-left flex-1" dir="ltr">
          {data.nameEn}
        </span>
        <span className="px-2 flex-shrink-0 text-slate-400">|</span>
        <span className="text-right flex-1" dir="rtl">
          {data.nameAr}
        </span>
      </div>
    </components.SingleValue>
  );
};

const dateToString = (date: Date | null): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [reportId, setReportId] = useState<ReportId>(1);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Transform REPORT_CONFIG to react-select format
  const selectOptions = useMemo<SelectOption[]>(() => {
    return REPORT_CONFIG.map((config) => ({
      value: config.id,
      label: `${config.nameEn} | ${config.nameAr}`, // Fallback label
      nameEn: config.nameEn,
      nameAr: config.nameAr,
    }));
  }, []);

  // Get current selected option
  const selectedOption = useMemo(() => {
    return selectOptions.find((option) => option.value === reportId) || selectOptions[0];
  }, [reportId, selectOptions]);

  if (!isOpen) {
    return null;
  }

  const handleGenerate = async () => {
    setError(null);
    setSuccess(null);

    // Basic date validation for range consistency
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
    const fromDateStr = dateToString(fromDate);
    const toDateStr = dateToString(toDate);
    
    if (fromDateStr) {
      params.append("start_date", fromDateStr);
    }
    if (toDateStr) {
      params.append("end_date", toDateStr);
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
        fromDateStr || undefined,
        toDateStr || undefined
      );

      const urlObject = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlObject;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(urlObject);

      setSuccess(
        `"${getReportConfig(reportId).nameEn}" downloaded as Excel.`
      );
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
      <div className="w-full max-w-4xl">
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
              <Select<SelectOption>
                value={selectedOption}
                onChange={(option) => {
                  if (option) {
                    setReportId(option.value);
                  }
                }}
                options={selectOptions}
                components={{
                  Option: CustomOption,
                  SingleValue: CustomSingleValue,
                }}
                isSearchable={false}
                styles={{
                  control: (base, state) => ({
                    ...base,
                    borderColor: state.isFocused ? "#3b82f6" : "#e2e8f0",
                    boxShadow: state.isFocused
                      ? "0 0 0 2px rgba(59, 130, 246, 0.1)"
                      : base.boxShadow,
                    backgroundColor: "rgb(248 250 252 / 0.6)",
                    borderRadius: "0.5rem",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.875rem",
                    minHeight: "42px",
                    "&:hover": {
                      borderColor: state.isFocused ? "#3b82f6" : "#cbd5e1",
                    },
                  }),
                  menu: (base) => ({
                    ...base,
                    borderRadius: "0.5rem",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected
                      ? "#3b82f6"
                      : state.isFocused
                      ? "#f1f5f9"
                      : "white",
                    color: state.isSelected ? "white" : "#1e293b",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.875rem",
                    "&:active": {
                      backgroundColor: state.isSelected ? "#3b82f6" : "#e2e8f0",
                    },
                  }),
                  singleValue: (base) => ({
                    ...base,
                    color: "#1e293b",
                    fontSize: "0.875rem",
                  }),
                }}
                className="react-select-container"
                classNamePrefix="react-select"
              />
              {/* <div className="mt-2 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
                <div className="flex items-start gap-2">
                  <div className="flex-1 text-right">
                    <p className="text-sm font-semibold text-slate-800">
                      {getReportConfig(reportId).nameAr}
                    </p>
                  </div>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-slate-800">
                      {getReportConfig(reportId).nameEn}
                    </p>
                  </div>
                </div>
              </div> */}
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
                  <DatePicker
                    selected={fromDate}
                    onChange={(date: Date | null) => setFromDate(date)}
                    dateFormat="dd/MM/yyyy"
                    wrapperClassName="w-full"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholderText="Select start date"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs text-slate-600">
                    To date <span className="text-slate-400">(optional)</span>
                  </label>
                  <DatePicker
                    selected={toDate}
                    onChange={(date: Date | null) => setToDate(date)}
                    dateFormat="dd/MM/yyyy"
                    wrapperClassName="w-full"
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    placeholderText="Select end date"
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
