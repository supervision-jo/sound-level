import { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, X, ArrowLeft, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Department {
  id: number;
  name: string;
  name_en?: string;
}

interface HourSummary {
  hour_start?: string;
  period_start?: string;
  period_end?: string;
  date?: string;
  month?: string;
  percentage_above_35?: number;
  percentage_above_40?: number;
  percentage_above_45?: number;
  percentage_above_50?: number;
  percentage_above_55?: number;
  percentage_above_60?: number;
  percentage_above_65?: number;
  percentage_above_70?: number;
  percentage_above_75?: number;
  records_above_35?: number;
  records_above_40?: number;
  records_above_45?: number;
  records_above_50?: number;
  records_above_55?: number;
  records_above_60?: number;
  records_above_65?: number;
  records_above_70?: number;
  records_above_75?: number;
  total_records?: number;
}

interface DepartmentData {
  department_id: number;
  department_name: string;
  summaries: HourSummary[];
}

interface ApiResponse {
  departments: DepartmentData[];
}

const THRESHOLD_OPTIONS = [
  { key: "percentage_above_35", label: "> 35°C", color: "#8b5cf6" },
  { key: "percentage_above_40", label: "> 40°C", color: "#3b82f6" },
  { key: "percentage_above_45", label: "> 45°C", color: "#06b6d4" },
  { key: "percentage_above_50", label: "> 50°C", color: "#10b981" },
  { key: "percentage_above_55", label: "> 55°C", color: "#f59e0b" },
  { key: "percentage_above_60", label: "> 60°C", color: "#ef4444" },
  { key: "percentage_above_65", label: "> 65°C", color: "#dc2626" },
  { key: "percentage_above_70", label: "> 70°C", color: "#991b1b" },
  { key: "percentage_above_75", label: "> 75°C", color: "#7f1d1d" },
];

const getYesterdayDate = (): Date => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return yesterday;
};

const dateToString = (date: Date | null): string => {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    type?: string;
  }>;
}

const CustomLegend = ({ payload }: CustomLegendProps) => {
  if (!payload) return null;

  const parseLabel = (label: string) => {
    const match = label.match(/^(.+?)\s*\((.+?)\)$/);
    if (match) {
      return {
        mainText: match[1].trim(),
        parenthesesText: match[2].trim(),
      };
    }
    return {
      mainText: label,
      parenthesesText: null,
    };
  };

  return (
    <div className="pt-5 flex flex-wrap justify-center gap-2">
      {payload.map((entry, index) => {
        const { mainText, parenthesesText } = parseLabel(entry.value);
        return (
          <div
            key={`item-${index}`}
            className="inline-flex items-center gap-2 px-3 py-2"
          >
            <span
              className="w-6 h-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm">
              <span className="font-bold">{mainText}</span>
              {parenthesesText && (
                <span className="text-xs font-medium text-gray-600">
                  {" "}
                  ({parenthesesText})
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function DepartmentComparisonGraph() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(getYesterdayDate());
  const [endDate, setEndDate] = useState<Date | null>(getYesterdayDate());
  const [selectedThreshold, setSelectedThreshold] = useState<string>(
    "percentage_above_50"
  );
  const [selectedPeriod, setSelectedPeriod] = useState<string>("day");
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(true);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [hasFetchedData, setHasFetchedData] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDepartmentDropdown(false);
        setSearchTerm("");
      }
    };

    if (showDepartmentDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDepartmentDropdown]);

  const fetchDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const response = await fetch(
        "https://sound-level.vision-jo.com/api/departments/list/"
      );
      const data = await response.json();
      console.log("=== RAW API RESPONSE ===");
      console.log(JSON.stringify(data, null, 2));

      const allDepartments = Array.isArray(data) ? data : data.departments || [];
      console.log("=== FIRST DEPARTMENT STRUCTURE ===");
      if (allDepartments.length > 0) {
        console.log("First department:", allDepartments[0]);
        console.log("Available keys:", Object.keys(allDepartments[0]));
      }

      console.log("Total departments:", allDepartments.length);
      setDepartments(allDepartments);
    } catch (error) {
      console.error("Error fetching departments:", error);
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchGraphData = async () => {
    if (selectedDepartments.length === 0 || !startDate || !endDate) return;

    setLoading(true);
    try {
      const startDateStr = dateToString(startDate);
      const endDateStr = dateToString(endDate);
      console.log("=== FETCHING GRAPH DATA ===");
      console.log("Selected department IDs:", selectedDepartments);
      console.log("Date range:", startDateStr, "to", endDateStr);
      console.log("Period:", selectedPeriod);

      // Fetch data for each department separately and combine
      const departmentPromises = selectedDepartments.map(async (deptId) => {
        const url = `https://sound-level.vision-jo.com/api/hour-summaries/graph/department/?department_id=${deptId}&start_date=${startDateStr}&end_date=${endDateStr}&period=${selectedPeriod}`;
        console.log("API URL for department", deptId, ":", url);
        
        const response = await fetch(url);
        const data = await response.json();
        return data;
      });

      const departmentResponses = await Promise.all(departmentPromises);
      console.log("Graph API Responses:", departmentResponses);

      // Combine all department responses into a single structure
      const combinedData: ApiResponse = {
        departments: departmentResponses.flatMap((response) => {
          // Handle both array and object responses
          if (Array.isArray(response)) {
            return response;
          }
          // The API returns an object with departments array
          if (response.departments && Array.isArray(response.departments)) {
            return response.departments;
          }
          // If response is a single department object
          if (response.department_id || response.department_name) {
            return [response];
          }
          return [];
        }),
      };
      
      console.log("Combined data structure:", combinedData);

      const processedData = processDataForGraph(combinedData, selectedPeriod);
      setGraphData(processedData);
      setHasFetchedData(true);
    } catch (error) {
      console.error("Error fetching graph data:", error);
      setHasFetchedData(true);
    } finally {
      setLoading(false);
    }
  };

  const formatDateLabel = (dateString: string, period: string): string => {
    const date = new Date(dateString);
    
    switch (period) {
      case "hour":
        return date.toLocaleString("ar-SA", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      case "day":
      case "week":
        return date.toLocaleString("ar-SA", {
          month: "short",
          day: "numeric",
        });
      case "month":
        return date.toLocaleString("ar-SA", {
          month: "short",
          year: "numeric",
        });
      case "year":
        return date.toLocaleString("ar-SA", {
          year: "numeric",
        });
      default:
        return date.toLocaleString("ar-SA", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        });
    }
  };

  const getPercentageValue = (summary: HourSummary, threshold: string): number | undefined => {
    // First try to get percentage directly
    const percentageKey = threshold as keyof HourSummary;
    if (summary[percentageKey] !== undefined && typeof summary[percentageKey] === 'number') {
      return summary[percentageKey] as number;
    }
    
    // If percentage not available, calculate from records
    const recordsKey = threshold.replace('percentage_above', 'records_above') as keyof HourSummary;
    const records = summary[recordsKey] as number | undefined;
    const totalRecords = summary.total_records;
    
    if (records !== undefined && totalRecords !== undefined && totalRecords > 0) {
      return (records / totalRecords) * 100;
    }
    
    return undefined;
  };

  const processDataForGraph = (data: ApiResponse, period: string) => {
    if (!data.departments || data.departments.length === 0) {
      console.log("No departments in data");
      return [];
    }

    console.log("Processing data for graph, departments count:", data.departments.length);
    data.departments.forEach((dept, idx) => {
      console.log(`Department ${idx}:`, dept.department_id, dept.department_name, "summaries:", dept.summaries?.length);
    });

    const allTimePoints = new Set<string>();
    
    // Collect time points based on period type
    data.departments.forEach((department) => {
      if (!department.summaries || department.summaries.length === 0) {
        console.log(`Department ${department.department_id} has no summaries`);
        return;
      }
      
      department.summaries.forEach((summary) => {
        if (period === "hour") {
          if (summary.hour_start) {
            allTimePoints.add(summary.hour_start);
          }
        } else if (period === "month") {
          // For month period, use month field
          const timePoint = summary.month || summary.period_start;
          if (timePoint) {
            allTimePoints.add(timePoint);
          }
        } else {
          // For other periods (day, week, year), use period_start or date
          const timePoint = summary.period_start || summary.date;
          if (timePoint) {
            allTimePoints.add(timePoint);
          }
        }
      });
    });

    console.log("Collected time points:", Array.from(allTimePoints));
    const sortedTimePoints = Array.from(allTimePoints).sort();
    console.log("Sorted time points:", sortedTimePoints);

    return sortedTimePoints.map((timePoint) => {
      const dataPoint: any = {
        hour: formatDateLabel(timePoint, period),
        fullDate: timePoint,
      };

      data.departments.forEach((department) => {
        let summary: HourSummary | undefined;
        
        if (period === "hour") {
          summary = department.summaries.find((s) => s.hour_start === timePoint);
        } else if (period === "month") {
          // For month period, match by month or period_start
          summary = department.summaries.find(
            (s) => (s.month && s.month === timePoint) || (s.period_start && s.period_start === timePoint)
          );
        } else {
          // For other periods (day, week, year), match by period_start or date
          summary = department.summaries.find(
            (s) => (s.period_start && s.period_start === timePoint) || (s.date && s.date === timePoint)
          );
        }
        
        if (summary) {
          const percentageValue = getPercentageValue(summary, selectedThreshold);
          if (percentageValue !== undefined) {
            dataPoint[`department_${department.department_id}`] = percentageValue;
          } else {
            console.warn(`No percentage value found for department ${department.department_id} at timePoint ${timePoint}`);
          }
        } else {
          console.warn(`No summary found for department ${department.department_id} at timePoint ${timePoint}`);
        }
      });

      return dataPoint;
    });
  };

  const toggleDepartment = (departmentId: number) => {
    console.log("=== TOGGLE DEPARTMENT ===");
    console.log("DepartmentId to toggle:", departmentId);
    console.log("Current selectedDepartments:", selectedDepartments);
    setSelectedDepartments((prev) => {
      const newSelection = prev.includes(departmentId)
        ? prev.filter((d) => d !== departmentId)
        : [...prev, departmentId];
      console.log("New selectedDepartments:", newSelection);
      return newSelection;
    });
  };

  const DEPARTMENT_COLORS = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#ec4899",
    "#14b8a6",
    "#f97316",
  ];

  const getDepartmentColor = (departmentIndex: number) => {
    return DEPARTMENT_COLORS[departmentIndex % DEPARTMENT_COLORS.length];
  };

  const selectedDepartmentDetails = departments.filter((d) =>
    selectedDepartments.includes(d.id)
  );

  const filteredDepartments = departments.filter((department) => {
    if (!searchTerm.trim()) {
      return true;
    }

    const searchLower = searchTerm.toLowerCase();
    return (
      department.name?.toLowerCase().includes(searchLower) ||
      department.name_en?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6"
    >
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                مقارنة الأقسام
              </h1>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <span>Back to Dashboard</span>
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                الأقسام{" "}
                {departments.length > 0 && `(${departments.length} متاح)`}
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right bg-white hover:bg-gray-50 transition-colors"
                >
                  {selectedDepartments.length === 0
                    ? "اختر الأقسام"
                    : `تم اختيار ${selectedDepartments.length} قسم`}
                </button>

                {showDepartmentDropdown && (
                  <div className="absolute z-10 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="sticky top-0 bg-white p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="ابحث عن قسم..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingDepartments ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          جاري التحميل...
                        </div>
                      ) : filteredDepartments.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          {departments.length === 0
                            ? "لا توجد أقسام متاحة"
                            : "لا توجد نتائج"}
                        </div>
                      ) : (
                        filteredDepartments.map((department) => (
                          <label
                            key={department.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedDepartments.includes(department.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                console.log("=== CHECKBOX CLICKED ===");
                                console.log(
                                  "Department clicked:",
                                  department.id,
                                  department.name
                                );
                                console.log("Department object:", department);
                                toggleDepartment(department.id);
                              }}
                              className="w-5 h-5 cursor-pointer text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1 text-right">
                              <div className="font-semibold text-gray-800">
                                {department.name}
                              </div>
                              {department.name_en && (
                                <div className="text-sm text-gray-600">
                                  {department.name_en}
                                </div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ البداية
                </label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => setStartDate(date)}
                  dateFormat="dd/MM/yyyy"
                  wrapperClassName="w-full"
                  className="w-full pr-4 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
                  placeholderText="اختر التاريخ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ النهاية
                </label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => setEndDate(date)}
                  dateFormat="dd/MM/yyyy"
                  wrapperClassName="w-full"
                  className="w-full pr-4 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-gray-300"
                  placeholderText="اختر التاريخ"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  الفترة الزمنية
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full pr-4 pl-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-right hover:bg-gray-50 transition-colors"
                >
                  <option value="hour">ساعة</option>
                  <option value="day">يوم</option>
                  <option value="week">أسبوع</option>
                  <option value="month">شهر</option>
                  <option value="year">سنة</option>
                </select>
              </div>
            </div>
          </div>

          {selectedDepartmentDetails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDepartmentDetails.map((department) => (
                <div
                  key={department.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm"
                >
                  <div className="text-right">
                    <div className="font-semibold">{department.name}</div>
                    {department.name_en && (
                      <div className="text-xs text-blue-600">
                        {department.name_en}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleDepartment(department.id)}
                    className="hover:bg-blue-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="my-4">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              عتبات درجة الحرارة
            </label>
            <div className="flex flex-wrap gap-3">
              {THRESHOLD_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
                  style={{
                    backgroundColor:
                      selectedThreshold === option.key
                        ? `${option.color}15`
                        : "white",
                    borderColor:
                      selectedThreshold === option.key
                        ? option.color
                        : "#e5e7eb",
                  }}
                >
                  <input
                    type="radio"
                    name="threshold"
                    checked={selectedThreshold === option.key}
                    onChange={() => setSelectedThreshold(option.key)}
                    className="w-4 h-4 focus:ring-2"
                    style={{ accentColor: option.color }}
                  />
                  <span
                    className="font-semibold text-sm"
                    style={{
                      color:
                        selectedThreshold === option.key
                          ? option.color
                          : "#374151",
                    }}
                  >
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={fetchGraphData}
            disabled={selectedDepartments.length === 0 || loading}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? "جاري التحميل..." : "عرض البيانات"}
          </button>

          {hasFetchedData && !loading && (
            <>
              {graphData.length > 0 ? (
                <div className="mt-8 bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-100">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                      الرسم البياني
                    </h2>
                    <div className="flex flex-wrap gap-4 justify-center p-4 bg-white rounded-lg border border-gray-200">
                      {selectedDepartmentDetails.map((department, index) => (
                        <div
                          key={department.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
                        >
                          <div
                            className="w-6 h-1.5 rounded-full"
                            style={{ backgroundColor: getDepartmentColor(index) }}
                          />
                          <span className="text-sm font-bold text-gray-800">
                            {department.name}
                          </span>
                          {department.name_en && (
                            <span className="text-xs font-medium text-gray-600">
                              ({department.name_en})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={600}>
                    <LineChart data={graphData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="hour"
                        tick={{ fontSize: 12, dy: 60, dx: -40 }}
                        stroke="#6b7280"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis
                        label={{
                          value: "النسبة المئوية (%)",
                          angle: -90,
                          dx: -20,
                        }}
                        tick={{ fontSize: 12, dx: -15 }}
                        stroke="#6b7280"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          border: "2px solid #e5e7eb",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend content={<CustomLegend />} />
                      {selectedDepartmentDetails.map((department, departmentIndex) => (
                        <Line
                          key={department.id}
                          type="monotone"
                          dataKey={`department_${department.id}`}
                          name={`${department.name}${department.name_en ? ` (${department.name_en})` : ""}`}
                          stroke={getDepartmentColor(departmentIndex)}
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-8 bg-gradient-to-br from-gray-50 to-white p-12 rounded-xl border-2 border-gray-100 shadow-sm">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="mb-6 p-4 bg-gray-100 rounded-full">
                      <BarChart3 className="w-16 h-16 text-gray-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-3">
                      لا توجد بيانات متاحة
                    </h3>
                    <p className="text-gray-600 max-w-md mb-6">
                      لا توجد بيانات للعرض في الفترة الزمنية المحددة. يرجى
                      محاولة اختيار فترة زمنية مختلفة أو أقسام أخرى.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center text-sm text-gray-500">
                      <span className="px-3 py-1 bg-gray-100 rounded-full">
                        {selectedDepartmentDetails.length > 0
                          ? `${selectedDepartmentDetails.length} قسم`
                          : "لا توجد أقسام محددة"}
                      </span>
                      {startDate && endDate && (
                        <span className="px-3 py-1 bg-gray-100 rounded-full">
                          {dateToString(startDate)} - {dateToString(endDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

