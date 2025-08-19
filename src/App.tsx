import { useState, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  Volume2,
  Building2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import LoginForm from "./pages/Login";
import axios from "axios";
import SensorModal from "./components/SensorModal";
import ReportsModal from "./components/ReportsModal";
import HeatmapModal from "./components/HeatmapModal";
import SensorGraphModal from "./components/SensorGraphModal";
import AlertConfigModal from "./components/AlertConfigModal";

interface User {
  username: string;
  role: "admin" | "doctor" | "nurse";
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("token") ? true : false
  );
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState<any>([]);

  const [currentTime, _] = useState(new Date());
  const [timeFrame, setTimeFrame] = useState<"10m" | "1h" | "6h" | "1d">("1h");
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(
    new Set()
  );
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [isSensorModalOpen, setIsSensorModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [isSensorGraphModalOpen, setIsSensorGraphModalOpen] = useState(false);
  const [isAlertConfigModalOpen, setIsAlertConfigModalOpen] = useState(false);

  // Demo users for authentication
  const demoUsers = {
    admin: { password: "admin123", role: "admin" as const },
    doctor: { password: "doctor123", role: "doctor" as const },
    nurse: { password: "nurse123", role: "nurse" as const },
  };

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setLoginError("");

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const user = demoUsers[username as keyof typeof demoUsers];

    if (user && user.password === password) {
      setUser({ username, role: user.role });
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password. Please try again.");
    }

    setIsLoading(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setLoginError("");
    localStorage.removeItem("token");
  };

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTime(new Date());
  //   }, 5000);

  //   return () => clearInterval(timer);
  // }, []);

  useEffect(() => {
    const fetchData = () => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: "https://sound-level-django-xkm4b.ondigitalocean.app/soundlevel/dashboard/",
        headers: {},
      };

      axios
        .request(config)
        .then((response) => {
          console.log("Fetched data:", response.data);
          setDepartments(response.data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    };

    fetchData();

    const fetchDataStatistics = () => {
      const config = {
        method: "get",
        maxBodyLength: Infinity,
        url: "https://sound-level-django-xkm4b.ondigitalocean.app/soundlevel/dashboard_statistics/",
        headers: {},
      };

      axios
        .request(config)
        .then((response) => {
          console.log("Fetched data:", response.data);
          setStatistics(response.data);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
        });
    };

    fetchDataStatistics();

    const interval = setInterval(() => {
      fetchData();
      fetchDataStatistics();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (departments?.length) {
      const allIds = new Set(departments.map((dept: any) => dept.id));
      setExpandedDepartments(allIds);
    }
  }, [departments]);

  const toggleDepartment = (deptId: string) => {
    setExpandedDepartments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(deptId)) {
        newSet.delete(deptId);
      } else {
        newSet.add(deptId);
      }
      return newSet;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green":
        return "text-green-600 bg-green-50 border-green-200";
      case "yellow":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "red":
        return "text-red-600 bg-red-50 border-red-200";
      case "offline":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      case "red":
        return "bg-red-500";
      case "offline":
        return "bg-gray-400";
      default:
        return "bg-gray-500";
    }
  };

  const handleSensorClick = (sensor: any, department: any) => {
    setSelectedSensor(sensor);
    setSelectedDepartment(department);
    setIsSensorModalOpen(true);
  };

  const closeSensorModal = () => {
    setIsSensorModalOpen(false);
    setSelectedSensor(null);
    setSelectedDepartment(null);
  };

  const openReportsModal = () => {
    setIsReportsModalOpen(true);
  };

  const closeReportsModal = () => {
    setIsReportsModalOpen(false);
  };

  const openHeatmapModal = () => {
    setIsHeatmapModalOpen(true);
  };

  const closeHeatmapModal = () => {
    setIsHeatmapModalOpen(false);
  };

  const openSensorGraphModal = () => {
    setIsSensorGraphModalOpen(true);
  };

  const closeSensorGraphModal = () => {
    setIsSensorGraphModalOpen(false);
  };

  const openAlertConfigModal = () => {
    setIsAlertConfigModalOpen(true);
  };

  const closeAlertConfigModal = () => {
    setIsAlertConfigModalOpen(false);
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <LoginForm
        onLogin={handleLogin}
        error={loginError}
        isLoading={isLoading}
      />
    );
  }

  const getSensorStatusIcon = (signal?: number) => {
    if (signal === undefined || signal === null) {
      return <WifiOff className="h-3 w-3 text-gray-500" />;
    }

    if (signal < 20) {
      return <Wifi className="h-3 w-3 text-red-500" />;
    } else if (signal < 40) {
      return <Wifi className="h-3 w-3 text-yellow-500" />;
    } else {
      return <Wifi className="h-3 w-3 text-green-500" />;
    }
  };

  // const getTimeFrameData = (dept: Department) => {
  //   switch (timeFrame) {
  //     case "10m":
  //       return dept.tenMinData;
  //     case "1h":
  //       return dept.hourlyData;
  //     case "6h":
  //       return dept.sixHourData;
  //     case "1d":
  //       return dept.dailyData;
  //     default:
  //       return dept.hourlyData;
  //   }
  // };

  const getTimeFrameLabel = () => {
    switch (timeFrame) {
      case "10m":
        return "Last 2 Hours (10min intervals)";
      case "1h":
        return "Last 8 Hours (hourly)";
      case "6h":
        return "Last 24 Hours (6hr intervals)";
      case "1d":
        return "Last 7 Days (daily)";
      default:
        return "Hourly View";
    }
  };

  // const criticalDepartments = departments.filter(
  //   (d: any) => d.status === "critical"
  // ).length;
  // // const warningDepartments = departments.filter(
  // //   (d) => d.status === "warning"
  // // ).length;
  // const avgNoise = Math.round(
  //   departments.reduce((sum: any, d: any) => sum + d.currentNoise, 0) /
  //     departments.length
  // );
  // const totalSensors = departments.reduce(
  //   (sum: any, d: any) => sum + d.sensors.length,
  //   0
  // );
  // const offlineSensors = departments.reduce(
  //   (sum: any, d: any) =>
  //     sum + d.sensors.filter((s: any) => s.status === "offline").length,
  //   0
  // );

  const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
    // Cap values at 200 and set fixed range from 35 to 200
    const cappedData = data.map(value => Math.min(value, 200));
    const minRange = 35;
    const maxRange = 200;
    const range = maxRange - minRange;

    console.log("datasss", data);

    return (
      <div className="flex items-end h-6 sm:h-8 gap-0.5 sm:gap-1">
        {cappedData?.map((value, index) => (
          <div
            key={index}
            className={`w-1.5 sm:w-2 ${color} rounded-t-sm transition-all duration-300`}
            style={{
              height: `${Math.max(((value - minRange) / range) * 100, 5)}%`,
              minHeight: "3px",
            }}
          />
        ))}
      </div>
    );
  };

  console.log(departments, "departments");

  const getSensoresStatus = (sensor: any) => {
    console.log("sensor-------", sensor);

    if (!sensor.records || sensor.records.length === 0) return 0;

    const total = sensor.records.reduce((sum: any, record: any) => {
      return sum + parseFloat(record.avg);
    }, 0);

    const average = total / sensor.records.length;
    console.log("getSensoresAvg", average);
    return average;
  };

  // const getNoiseLevel = (house: any, red: any, yellow: any) => {
  //   for (const sensor of house.sensors) {
  //     if (!sensor.records || sensor.records.length === 0) continue;

  //     const total = sensor.records.reduce((sum: number, record: any) => {
  //       return sum + parseFloat(record.avg);
  //     }, 0);

  //     const average = total / sensor.records.length;

  //     console.log(`Sensor ${sensor.name} avg: ${average}`);

  //     // getSensoresStatus(sensor) >= sensor?.yellow &&
  //     // getSensoresStatus(sensor) < sensor?.red
  //     //   ? "warning"
  //     //   : getSensoresStatus(sensor) >= sensor?.red
  //     //   ? "critical"
  //     //   : "safe";

  //     console.log("average average", average);

  //     if (average >= yellow && average <= red) return "warning";
  //     if (average >= red) return "critical";
  //   }

  //   return "safe";
  // };

  // const getNoiseAverageDb = (house: any) => {
  //   let totalDb = 0;
  //   let totalRecords = 0;

  //   for (const sensor of house.sensors) {
  //     if (!sensor.records || sensor.records.length === 0) continue;

  //     for (const record of sensor.records) {
  //       totalDb += parseFloat(record.avg);
  //       totalRecords++;
  //     }
  //   }

  //   if (totalRecords === 0) return 0;

  //   const averageDb = totalDb / totalRecords;
  //   return averageDb;
  // };

  // const departmentStatus = (department: any, red: any, yellow: any) => {
  //   // departments.map((house: any) => ({
  //   //   name: house.name,
  //   //   noiseLevel: getNoiseLevel(house),
  //   // }));

  //   // console.log("departmentStatus", getNoiseLevel(department, red, yellow));
  //   return {
  //     name: department.name,
  //     noiseLevel: getNoiseLevel(department, red, yellow),
  //   };
  // };

  const getSensorAvgValues = (house: any, sensorId: any) => {
    const sensor = house.sensors.find((s: any) => s.id === sensorId);

    if (!sensor || !sensor.records || sensor.records.length === 0) {
      return []; // مفيش بيانات نرجع array فاضية
    }

    return sensor.records.map((record: any) => parseFloat(record.avg));
  };

  const getAllSensorsAvgValues = (house: any) => {
    return house.sensors.map((sensor: any) => {
      const values = sensor.records.map((record: any) =>
        parseFloat(record.avg)
      );
      const sum = values.reduce((acc: any, val: any) => acc + val, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      return Math.round(avg * 100) / 100; // تقريبه إلى رقم عشريين
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">
                  Hospital Noise Monitor
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  نظام مراقبة الضوضاء في المستشفى
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Time display */}
              <div className="hidden sm:flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs sm:text-sm text-gray-500">
                    Current Time
                  </div>
                  <div className="font-mono text-sm sm:text-lg font-semibold text-gray-800">
                    {currentTime.toLocaleTimeString("en-US", {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <div className="h-8 sm:h-12 w-px bg-gray-200" />
              </div>
              <div className="flex flex-col gap-3 items-center justify-between border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-800">
                    Mahmoud
                  </div>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full capitalize">
                    Doctor
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div>
              {/* View mode buttons */}
              {/* <div className="flex flex-col sm:flex-row gap-2">
                <div className="text-xs text-gray-500 hidden sm:block self-center mr-2">
                  Time Frame:
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setTimeFrame("10m")}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeFrame === "10m"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    10m
                  </button>
                  <button
                    onClick={() => setTimeFrame("1h")}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeFrame === "1h"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    1h
                  </button>
                  <button
                    onClick={() => setTimeFrame("6h")}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeFrame === "6h"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    6h
                  </button>
                  <button
                    onClick={() => setTimeFrame("1d")}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                      timeFrame === "1d"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    1d
                  </button>
                </div>
              </div> */}

              {/* Mobile User Info */}
              {/* <div className="sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-medium text-gray-800">
                    {user?.username}
                  </div>
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full capitalize">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                >
                  Logout
                </button>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Departments
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                  {statistics?.statistics?.total_departments}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
                  إجمالي الأقسام
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Building2 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Total Sensors
                </p>
                <p className="text-lg sm:text-2xl font-bold text-blue-600 mt-0.5 sm:mt-1">
                  {statistics?.statistics?.total_sensors}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
                  إجمالي أجهزة الاستشعار
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <Activity className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Critical Alerts
                </p>
                <p className="text-lg sm:text-2xl font-bold text-red-600 mt-0.5 sm:mt-1">
                  {statistics?.statistics?.red_sensors}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
                  تنبيهات حرجة
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Offline Sensors
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-600 mt-0.5 sm:mt-1">
                  {statistics?.statistics?.inactive_sensors}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
                  أجهزة غير متصلة
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-100 rounded-lg">
                <WifiOff className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">
                  Average Noise
                </p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                  {statistics?.statistics?.sensors_avg} LV
                </p>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1 hidden sm:block">
                  متوسط الضوضاء
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-gray-100 rounded-lg">
                <Volume2 className="h-4 w-4 sm:h-6 sm:w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Recent Alerts Section */}
        {/* <div className="lg:hidden mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-600" />
              Recent Alerts
              <span className="text-sm font-normal text-gray-500">
                التنبيهات الأخيرة
              </span>
            </h2>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    alert.severity === "critical"
                      ? "bg-red-50 border-red-400"
                      : "bg-yellow-50 border-yellow-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-base text-gray-800">
                        {alert.department}
                      </p>
                      <p className="text-sm text-gray-600">
                        {alert.departmentAr}
                      </p>
                      {alert.sensor && (
                        <p className="text-xs text-gray-500">{alert.sensor}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-base text-gray-900">
                        {alert.level} dB
                      </p>
                      <p className="text-xs text-gray-500">{alert.timestamp}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div> */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Department Monitoring */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  Department Noise Levels
                  <span className="text-xs sm:text-sm font-normal text-gray-500 mr-2 hidden sm:inline">
                    مستويات الضوضاء
                  </span>
                </h2>
                <div className="text-xs text-gray-500 hidden sm:block">
                  {getTimeFrameLabel()}
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-500 rounded-full"></div>
                    Safe
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-yellow-500 rounded-full"></div>
                    Warning
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full"></div>
                    Critical
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full"></div>
                    Offline
                  </div>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {departments?.map((dept: any) => (
                  <div
                    key={dept.id}
                    className={`rounded-lg border-2 transition-all duration-300 ${getStatusColor(
                      dept.color
                    )}`}
                  >
                    {/* Department Header */}
                    <div
                      className="p-3 sm:p-4 cursor-pointer"
                      onClick={() => toggleDepartment(dept.id)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex flex-col">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-800 flex items-center gap-2">
                              {dept.name}
                              {expandedDepartments.has(dept.id) ? (
                                <ChevronUp className="h-4 w-4 text-gray-500" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-gray-500" />
                              )}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600">
                              {dept.name_en}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                          <div className="text-left sm:text-right">
                            <div className="text-lg sm:text-2xl font-bold text-gray-900">
                              {Math.round(dept.avg)} LV
                            </div>
                            {/* <div className="text-xs text-gray-500">
                              Limit: {dept.threshold} dB
                            </div> */}
                          </div>
                          <div className="w-16 sm:w-24">
                            <MiniChart
                              data={getAllSensorsAvgValues(dept)}
                              color={getProgressColor(dept.color)}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 sm:mt-3">
                        <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                          <span>Noise Level</span>
                          <span>
                            {Math.round((dept?.avg / (dept.red * 1.5)) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                          <div
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${getProgressColor(
                              dept.color
                            )}`}
                            style={{
                              width: `${Math.min(
                                (dept?.avg / (dept.red * 1.5)) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Sensor Details */}
                    {expandedDepartments.has(dept.id) && (
                      <div className="border-t border-gray-200 bg-gray-50/50 p-3 sm:p-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Individual Sensors ({dept.sensors.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {dept.sensors.map((sensor: any) => (
                            <div
                              key={sensor.id}
                              onClick={() => handleSensorClick(sensor, dept)}
                              className={`p-3 rounded-lg border ${getStatusColor(
                                sensor.is_active ? sensor.color : "offline"
                              )} cursor-pointer hover:shadow-md transition-all duration-200`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h5 className="text-sm font-medium text-gray-800">
                                      {sensor.name}
                                    </h5>
                                    {getSensorStatusIcon(
                                      sensor.records.at(-1)?.wifi_signal
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-600">
                                    {sensor.name_en}
                                  </p>
                                  {sensor.records && sensor.records.length > 0 && sensor.records[sensor.records.length - 1].date_time && (
                                    <p className="text-xs text-gray-500">
                                      Last: {new Date(sensor.records[sensor.records.length - 1].date_time).toLocaleString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: false
                                      })}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">
                                    {!sensor.is_active
                                      ? "--"
                                      : Math.round(sensor.avg)}{" "}
                                    LV
                                  </div>
                                </div>
                              </div>
                              {/* 
                              <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                <span>Battery</span>
                                <span
                                  className={`font-medium ${getBatteryColor(
                                    sensor.batteryLevel
                                  )}`}
                                >
                                  {sensor.batteryLevel}%
                                </span>
                              </div> */}

                              {/* <div className="w-full bg-gray-200 rounded-full h-1">
                                <div
                                  className={`h-1 rounded-full transition-all duration-500 ${getProgressColor(
                                    sensor.status
                                  )}`}
                                  style={{
                                    width:
                                      sensor.status === "offline"
                                        ? "0%"
                                        : `${Math.min(
                                            (sensor.currentNoise / 80) * 100,
                                            100
                                          )}%`,
                                  }}
                                />
                              </div> */}

                              <div className="mt-2">
                                <MiniChart
                                  data={
                                    sensor.is_active
                                      ? getSensorAvgValues(dept, sensor.id)
                                      : [10, 9, 10, 6, 10, 8, 10, 6, 10, 9]
                                  }
                                  color={getProgressColor(
                                    sensor.is_active ? sensor.color : "offline"
                                  )}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
            {/* Recent Alerts - Desktop Only */}
            {/* <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                Recent Alerts
                <span className="text-xs sm:text-sm font-normal text-gray-500 hidden sm:inline">
                  التنبيهات الأخيرة
                </span>
              </h2>

              <div className="space-y-2 sm:space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-2 sm:p-3 rounded-lg border-l-4 ${
                      alert.severity === "critical"
                        ? "bg-red-50 border-red-400"
                        : "bg-yellow-50 border-yellow-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm sm:text-base text-gray-800">
                          {alert.department}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {alert.departmentAr}
                        </p>
                        {alert.sensor && (
                          <p className="text-xs text-gray-500">
                            {alert.sensor}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm sm:text-base text-gray-900">
                          {alert.level} dB
                        </p>
                        <p className="text-xs text-gray-500">
                          {alert.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div> */}

            {/* Sensor Status Overview */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                Sensor Status
                <span className="text-xs sm:text-sm font-normal text-gray-500 hidden sm:inline">
                  حالة أجهزة الاستشعار
                </span>
              </h2>

              <div className="space-y-3">
                {departments.map((dept: any) => {
                  const onlineSensors = dept.sensors.filter(
                    (s: any) => s.is_active
                  ).length;
                  const criticalSensors = dept.sensors.filter(
                    (s: any) => s.color === "red" && "red"
                  ).length;

                  return (
                    <div
                      key={dept.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {dept.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {onlineSensors}/{dept.sensors.length} online
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {criticalSensors > 0 && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                            {criticalSensors} critical
                          </span>
                        )}
                        <div className="flex gap-1">
                          {dept.sensors
                            .slice(0, 7)
                            .map((sensor: any, idx: any) => (
                              <div
                                key={idx}
                                className={`w-2 h-2 rounded-full ${
                                  !sensor.is_active
                                    ? "bg-gray-400"
                                    : sensor.color === "red"
                                    ? "bg-red-500"
                                    : sensor.color === "yellow"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }`}
                                title={`${sensor.name}: ${
                                  sensor.color === "red" ? "Critical" : "Safe"
                                }`}
                              />
                            ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions - Desktop Only */}
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">
                Quick Actions
              </h2>

              <div className="space-y-2 sm:space-y-3">
                <button 
                  onClick={openReportsModal}
                  className="w-full p-2 sm:p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm sm:text-base font-medium transition-colors"
                >
                  Generate Report
                </button>
                <button 
                  onClick={openHeatmapModal}
                  className="w-full p-2 sm:p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-sm sm:text-base font-medium transition-colors"
                >
                  الخريطة الحرارية والاتجاهات
                </button>
                <button 
                  onClick={openSensorGraphModal}
                  className="w-full p-2 sm:p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm sm:text-base font-medium transition-colors"
                >
                  📊 Sensor Graph Analysis
                </button>
                <button className="w-full p-2 sm:p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-sm sm:text-base font-medium transition-colors">
                  Export Sensor Data
                </button>
                <button 
                  onClick={openAlertConfigModal}
                  className="w-full p-2 sm:p-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-sm sm:text-base font-medium transition-colors"
                >
                  Configure Alerts
                </button>
                <a
                  target="_blank"
                  href="https://sound-level-dashboard.vision-jo.com/admin/soundlevel/"
                  className="w-full flex items-center justify-center p-2 sm:p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-sm sm:text-base font-medium transition-colors"
                >
                  Sensor Maintenance
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Sensor Status Overview */}
        <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Sensor Status
            <span className="text-sm font-normal text-gray-500">
              حالة أجهزة الاستشعار
            </span>
          </h2>

          <div className="space-y-3">
            {departments.map((dept: any) => {
              const onlineSensors = dept.sensors.filter(
                (s: any) => s.is_active
              ).length;
              const criticalSensors = dept.sensors.filter(
                (s: any) => getSensoresStatus(s) >= s.red && "critical"
              ).length;

              return (
                <div
                  key={dept.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {dept.name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {onlineSensors}/{dept.sensors.length} online
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {criticalSensors > 0 && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                        {criticalSensors} critical
                      </span>
                    )}
                    <div className="flex gap-1">
                      {dept.sensors.slice(0, 7).map((sensor: any, idx: any) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full ${
                            !sensor.is_active
                              ? "bg-gray-400"
                              : getSensoresStatus(sensor) >= sensor.red &&
                                "critical"
                              ? "bg-red-500"
                              : getSensoresStatus(sensor) >= sensor.yellow &&
                                getSensoresStatus(sensor) < sensor.red &&
                                "warning"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          title={`${sensor.name}: ${sensor.status}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: Quick Actions Section - Moved to the end */}
        <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Quick Actions
          </h2>

          <div className="space-y-3">
            <button 
              onClick={openReportsModal}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-base font-medium transition-colors"
            >
              Generate Report
            </button>
            <button 
              onClick={openHeatmapModal}
              className="w-full p-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-base font-medium transition-colors"
            >
              الخريطة الحرارية والاتجاهات
            </button>
            <button 
              onClick={openSensorGraphModal}
              className="w-full p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-base font-medium transition-colors"
            >
              📊 Sensor Graph Analysis
            </button>
            <button className="w-full p-3 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-base font-medium transition-colors">
              Export Sensor Data
            </button>
            <button 
              onClick={openAlertConfigModal}
              className="w-full p-3 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg text-base font-medium transition-colors"
            >
              Configure Alerts
            </button>
            <button className="w-full p-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-base font-medium transition-colors">
              Sensor Maintenance
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Modal */}
      <SensorModal
        sensor={selectedSensor}
        department={selectedDepartment}
        isOpen={isSensorModalOpen}
        onClose={closeSensorModal}
      />

      {/* Reports Modal */}
      <ReportsModal
        isOpen={isReportsModalOpen}
        onClose={closeReportsModal}
      />

      {/* Heatmap Modal */}
      <HeatmapModal
        isOpen={isHeatmapModalOpen}
        onClose={closeHeatmapModal}
        departments={departments}
      />

      {/* Sensor Graph Modal */}
      <SensorGraphModal
        isOpen={isSensorGraphModalOpen}
        onClose={closeSensorGraphModal}
        departments={departments}
      />

      {/* Alert Config Modal */}
      <AlertConfigModal
        isOpen={isAlertConfigModalOpen}
        onClose={closeAlertConfigModal}
        departments={departments}
      />
    </div>
  );
}

export default App;
