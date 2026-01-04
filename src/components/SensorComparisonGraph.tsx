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
import { Calendar, TrendingUp, X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

interface Sensor {
  id: number;
  sensor_number: number;
  sensor_name: string;
  department_name: string;
  floor_name?: string | null;
  is_active?: boolean;
}

interface HourSummary {
  hour_start: string;
  percentage_above_35: number;
  percentage_above_40: number;
  percentage_above_45: number;
  percentage_above_50: number;
  percentage_above_55: number;
  percentage_above_60: number;
  percentage_above_65: number;
  percentage_above_70: number;
  percentage_above_75: number;
}

interface SensorData {
  sensor_id: number;
  sensor_name: string;
  summaries: HourSummary[];
}

interface ApiResponse {
  sensors: SensorData[];
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

const getYesterdayDate = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split("T")[0];
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

export default function SensorComparisonGraph() {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedSensors, setSelectedSensors] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(getYesterdayDate());
  const [endDate, setEndDate] = useState(getYesterdayDate());
  const [selectedThreshold, setSelectedThreshold] = useState<string>(
    "percentage_above_50"
  );
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSensors, setLoadingSensors] = useState(true);
  const [showSensorDropdown, setShowSensorDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSensors();
  }, []);

  useEffect(() => {
    if (graphData.length > 0 && selectedSensors.length > 0) {
      fetchGraphData();
    }
  }, [selectedThreshold]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowSensorDropdown(false);
        setSearchTerm("");
      }
    };

    if (showSensorDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSensorDropdown]);

  const fetchSensors = async () => {
    setLoadingSensors(true);
    try {
      const response = await fetch(
        "https://sound-level.vision-jo.com/api/sensors/list/"
      );
      const data = await response.json();
      console.log("=== RAW API RESPONSE ===");
      console.log(JSON.stringify(data, null, 2));

      const allSensors = Array.isArray(data) ? data : data.sensors || [];
      console.log("=== FIRST SENSOR STRUCTURE ===");
      if (allSensors.length > 0) {
        console.log("First sensor:", allSensors[0]);
        console.log("Available keys:", Object.keys(allSensors[0]));
        console.log("id:", allSensors[0].id);
        console.log("sensor_number:", allSensors[0].sensor_number);
      }

      const activeSensors = allSensors.filter(
        (s: Sensor) => s.is_active !== false
      );
      console.log("Total sensors:", allSensors.length);
      console.log("Active sensors:", activeSensors.length);
      setSensors(activeSensors);
    } catch (error) {
      console.error("Error fetching sensors:", error);
    } finally {
      setLoadingSensors(false);
    }
  };

  const fetchGraphData = async () => {
    if (selectedSensors.length === 0) return;

    setLoading(true);
    try {
      const sensorIds = selectedSensors.join(",");
      console.log("=== FETCHING GRAPH DATA ===");
      console.log("Selected sensor IDs:", sensorIds);
      console.log("Date range:", startDate, "to", endDate);

      const url = `https://sound-level.vision-jo.com/api/hour-summaries/graph/?sensor_ids=${sensorIds}&start_date=${startDate}&end_date=${endDate}`;
      console.log("API URL:", url);

      const response = await fetch(url);
      const data: ApiResponse = await response.json();
      console.log("Graph API Response:", data);

      const processedData = processDataForGraph(data);
      setGraphData(processedData);
    } catch (error) {
      console.error("Error fetching graph data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processDataForGraph = (data: ApiResponse) => {
    if (!data.sensors || data.sensors.length === 0) return [];

    const allHours = new Set<string>();
    data.sensors.forEach((sensor) => {
      sensor.summaries.forEach((summary) => {
        allHours.add(summary.hour_start);
      });
    });

    const sortedHours = Array.from(allHours).sort();

    return sortedHours.map((hour) => {
      const dataPoint: any = {
        hour: new Date(hour).toLocaleString("ar-SA", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
        }),
        fullDate: hour,
      };

      data.sensors.forEach((sensor) => {
        const summary = sensor.summaries.find((s) => s.hour_start === hour);
        if (summary) {
          dataPoint[`sensor_${sensor.sensor_id}`] =
            summary[selectedThreshold as keyof HourSummary];
        }
      });

      return dataPoint;
    });
  };

  const toggleSensor = (sensorId: number) => {
    console.log("=== TOGGLE SENSOR ===");
    console.log("SensorId to toggle:", sensorId);
    console.log("Current selectedSensors:", selectedSensors);
    setSelectedSensors((prev) => {
      const newSelection = prev.includes(sensorId)
        ? prev.filter((s) => s !== sensorId)
        : [...prev, sensorId];
      console.log("New selectedSensors:", newSelection);
      return newSelection;
    });
  };

  const SENSOR_COLORS = [
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

  const getSensorColor = (sensorIndex: number) => {
    return SENSOR_COLORS[sensorIndex % SENSOR_COLORS.length];
  };

  const selectedSensorDetails = sensors.filter((s) =>
    selectedSensors.includes(s.id)
  );

  const filteredSensors = sensors.filter((sensor) => {
    if (!searchTerm.trim()) {
      return true;
    }

    const searchLower = searchTerm.toLowerCase();
    return (
      sensor.sensor_name?.toLowerCase().includes(searchLower) ||
      sensor.department_name?.toLowerCase().includes(searchLower) ||
      (sensor.floor_name &&
        sensor.floor_name.toLowerCase().includes(searchLower))
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
                مقارنة أجهزة الاستشعار
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
                أجهزة الاستشعار{" "}
                {sensors.length > 0 && `(${sensors.length} متاح)`}
              </label>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowSensorDropdown(!showSensorDropdown)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right bg-white hover:bg-gray-50 transition-colors"
                >
                  {selectedSensors.length === 0
                    ? "اختر أجهزة الاستشعار"
                    : `تم اختيار ${selectedSensors.length} جهاز`}
                </button>

                {showSensorDropdown && (
                  <div className="absolute z-10 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    <div className="sticky top-0 bg-white p-3 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="ابحث عن جهاز استشعار..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      />
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {loadingSensors ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          جاري التحميل...
                        </div>
                      ) : filteredSensors.length === 0 ? (
                        <div className="px-4 py-8 text-center text-gray-500">
                          {sensors.length === 0
                            ? "لا توجد أجهزة استشعار متاحة"
                            : "لا توجد نتائج"}
                        </div>
                      ) : (
                        filteredSensors.map((sensor) => (
                          <label
                            key={sensor.id}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={selectedSensors.includes(sensor.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                console.log("=== CHECKBOX CLICKED ===");
                                console.log(
                                  "Sensor clicked:",
                                  sensor.id,
                                  sensor.sensor_name
                                );
                                console.log("Sensor object:", sensor);
                                toggleSensor(sensor.id);
                              }}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex-1 text-right">
                              <div className="font-semibold text-gray-800">
                                {sensor.sensor_name}
                              </div>
                              <div className="text-sm text-gray-600">
                                {sensor.department_name}
                                {sensor.floor_name && ` - ${sensor.floor_name}`}
                              </div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ البداية
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  تاريخ النهاية
                </label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pr-10 pl-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 [&::-webkit-calendar-picker-indicator]:hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {selectedSensorDetails.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedSensorDetails.map((sensor) => (
                <div
                  key={sensor.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm"
                >
                  <div className="text-right">
                    <div className="font-semibold">{sensor.sensor_name}</div>
                    <div className="text-xs text-blue-600">
                      {sensor.department_name}
                      {sensor.floor_name && ` - ${sensor.floor_name}`}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSensor(sensor.id)}
                    className="hover:bg-blue-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mb-8">
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
            disabled={selectedSensors.length === 0 || loading}
            className="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
          >
            {loading ? "جاري التحميل..." : "عرض البيانات"}
          </button>

          {graphData.length > 0 && (
            <div className="mt-8 bg-gradient-to-br from-gray-50 to-white p-6 rounded-xl border-2 border-gray-100">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  الرسم البياني
                </h2>
                <div className="flex flex-wrap gap-4 justify-center p-4 bg-white rounded-lg border border-gray-200">
                  {selectedSensorDetails.map((sensor, index) => (
                    <div
                      key={sensor.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
                    >
                      <div
                        className="w-6 h-1.5 rounded-full"
                        style={{ backgroundColor: getSensorColor(index) }}
                      />
                      <span className="text-sm font-bold text-gray-800">
                        {sensor.sensor_name}
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        ({sensor.department_name})
                      </span>
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
                      dx: -20, // move left
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
                  {selectedSensorDetails.map((sensor, sensorIndex) => (
                    <Line
                      key={sensor.id}
                      type="monotone"
                      dataKey={`sensor_${sensor.id}`}
                      name={`${sensor.sensor_name} (${sensor.department_name})`}
                      stroke={getSensorColor(sensorIndex)}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
