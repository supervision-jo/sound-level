import { useState, useEffect, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Volume2,
  Building2,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  FileSpreadsheet,
} from "lucide-react";
import LoginForm from "./pages/Login";
import SensorModal from "./components/SensorModal";
import ApiReportModal from "./components/ApiReportModal";
import HeatmapModal from "./components/HeatmapModal";
import SensorGraphModal from "./components/SensorGraphModal";
import AlertConfigModal from "./components/AlertConfigModal";
import { Navigate } from "react-router";

const SENSOR_DATA_WS_URL = "wss://sound-level.vision-jo.com/ws/sensor-data/";
const LOGIN_API_URL = "https://sound-level.vision-jo.com/api/auth/login/";
const WS_RECONNECT_DELAY = 5000;
const WS_HEARTBEAT_INTERVAL = 30000;
const SENSOR_STALE_TIMEOUT_MS = 15 * 60 * 1000;
const USER_STORAGE_KEY = "userProfile";

interface User {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

const pickString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }
  return undefined;
};

const loadStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.username === "string") {
      return parsed as User;
    }
    return null;
  } catch (error) {
    console.warn("Failed to parse stored user", error);
    return null;
  }
};

const persistUser = (userData: User | null) => {
  try {
    if (!userData) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return;
    }
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
  } catch (error) {
    console.warn("Failed to persist user", error);
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("token") ? true : false
  );
  const [user, setUser] = useState<User | null>(null);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [departments, setDepartments] = useState<any[]>([]);

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

  const handleLogin = async (username: string, password: string) => {
    setIsLoading(true);
    setLoginError("");

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch (_error) {
        data = null;
      }

      if (!response.ok) {
        const message =
          data?.detail ??
          data?.message ??
          data?.error ??
          "Invalid username or password. Please try again.";
        throw new Error(message);
      }

      if (!data) {
        throw new Error("Unexpected empty response from server.");
      }

      const accessToken =
        data.access ?? data.token ?? data.access_token ?? data?.data?.token;
      const refreshToken =
        data.refresh ?? data.refresh_token ?? data?.data?.refresh;

      if (!accessToken) {
        throw new Error("Authentication token missing in response.");
      }

      localStorage.setItem("token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      } else {
        localStorage.removeItem("refreshToken");
      }

      const apiUser =
        data.user ??
        data.profile ??
        data.data?.user ??
        data.data?.profile ??
        data;

      const normalizedUser: User = {
        username:
          pickString(
            apiUser?.username,
            data?.username,
            data?.user_name,
            username
          ) ?? username,
        firstName: pickString(
          apiUser?.first_name,
          apiUser?.firstName,
          data?.first_name,
          data?.firstName
        ),
        lastName: pickString(
          apiUser?.last_name,
          apiUser?.lastName,
          data?.last_name,
          data?.lastName
        ),
        email: pickString(apiUser?.email, data?.email, data?.user_email),
      };

      setUser(normalizedUser);
      persistUser(normalizedUser);
      setIsAuthenticated(true);
      setLoginError("");
    } catch (error) {
      console.error("Login failed:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to login. Please try again.";
      setLoginError(message);
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      persistUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setLoginError("");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    persistUser(null);
  };

  // useEffect(() => {
  //   const timer = setInterval(() => {
  //     setCurrentTime(new Date());
  //   }, 5000);

  //   return () => clearInterval(timer);
  // }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let shouldReconnect = true;

    const handlePayload = (payload: any) => {
      if (!payload || payload.type === "pong") {
        return;
      }

      const departmentsPayload = Array.isArray(payload)
        ? payload
        : payload.departments ?? payload.data;

      if (Array.isArray(departmentsPayload)) {
        setDepartments(departmentsPayload);
      }
    };

    console.log(departments);

    const clearHeartbeat = () => {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const startHeartbeat = () => {
      clearHeartbeat();
      heartbeatTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, WS_HEARTBEAT_INTERVAL);
    };

    const connect = () => {
      ws = new WebSocket(SENSOR_DATA_WS_URL);

      ws.onopen = () => {
        console.info("Sensor websocket connected");
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          // console.log("WebSocket payload received:", payload);
          handlePayload(payload);
        } catch (error) {
          console.error("Failed to parse websocket payload", error);
        }
      };

      ws.onerror = (event) => {
        console.error("Sensor websocket error", event);
      };

      ws.onclose = (event) => {
        console.warn("Sensor websocket closed", event.reason || event.code);
        clearHeartbeat();

        if (shouldReconnect) {
          reconnectTimer = setTimeout(connect, WS_RECONNECT_DELAY);
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }

      clearHeartbeat();
      ws?.close();
      ws = null;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (departments?.length) {
      const allIds = new Set(departments.map((dept: any) => dept.id));
      setExpandedDepartments(allIds);
    }
  }, [departments]);

  useEffect(() => {
    const syncAuthState = () => {
      const hasToken = Boolean(localStorage.getItem("token"));
      setIsAuthenticated((prev) => (prev === hasToken ? prev : hasToken));

      if (!hasToken) {
        if (user !== null) {
          setUser(null);
        }
        persistUser(null);
      } else if (!user) {
        const storedUser = loadStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
      }
    };

    const handleVisibility = () => {
      if (!document.hidden) {
        syncAuthState();
      }
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("storage", syncAuthState);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (user !== null) {
        setUser(null);
      }
      persistUser(null);
      return;
    }

    if (!user) {
      const storedUser = loadStoredUser();
      if (storedUser) {
        setUser(storedUser);
      }
    } else {
      persistUser(user);
    }
  }, [isAuthenticated, user]);

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

  const getSensorStatusIcon = (sensor: any) => {
    const status = getWifiSignalStatus(sensor);

    if (status === "offline") {
      return <WifiOff className="h-3 w-3 text-gray-500" />;
    }

    const colorClass =
      status === "green"
        ? "text-green-500"
        : status === "yellow"
        ? "text-yellow-500"
        : "text-red-500";

    return <Wifi className={`h-3 w-3 ${colorClass}`} />;
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

  const parseAverageValue = (value: unknown) => {
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : 0;
    }
    const parsed = parseFloat(value as string);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const isSensorActive = (sensor: any) => {
    if (!sensor) {
      return false;
    }

    if (!sensor.is_active) {
      return false;
    }

    const lastUpdateRaw = sensor.last_data_update;
    if (!lastUpdateRaw) {
      return true;
    }

    const lastUpdate = new Date(lastUpdateRaw);
    if (Number.isNaN(lastUpdate.getTime())) {
      return true;
    }

    const elapsed = Date.now() - lastUpdate.getTime();
    return elapsed <= SENSOR_STALE_TIMEOUT_MS;
  };

  const getSensorValues = (sensor: any) => {
    if (!sensor || !isSensorActive(sensor)) {
      return [];
    }

    const recordValues =
      sensor.records?.map((record: any) =>
        parseAverageValue(record?.avg ?? record?.level)
      ) ?? [];

    const validValues = recordValues.filter(
      (value: number) => Number.isFinite(value) && value > 0
    );

    if (validValues.length) {
      return validValues;
    }

    const fallback = parseAverageValue(sensor?.avg);
    return Number.isFinite(fallback) && fallback > 0 ? [fallback] : [];
  };

  const getSensorAverage = (sensor: any) => {
    const values = getSensorValues(sensor);
    if (!values.length) {
      return 0;
    }
    const sum = values.reduce((acc: number, value: number) => acc + value, 0);
    return sum / values.length;
  };

  const getSensorThresholds = (sensor: any) => {
    const yellowStartRaw =
      sensor?.dashboard_yellow_light_start ?? sensor?.yellow;
    const redStartRaw = sensor?.dashboard_red_light_start ?? sensor?.red;

    const yellowStart = Number.isFinite(Number(yellowStartRaw))
      ? Number(yellowStartRaw)
      : 60;

    const redStart = Number.isFinite(Number(redStartRaw))
      ? Number(redStartRaw)
      : yellowStart + 10;

    return { yellowStart, redStart };
  };

  const getSensorNoiseStatus = (sensor: any) => {
    if (!isSensorActive(sensor)) {
      return "offline";
    }

    const average = getSensorAverage(sensor);
    if (!Number.isFinite(average) || average <= 0) {
      return "offline";
    }

    const { yellowStart, redStart } = getSensorThresholds(sensor);

    if (average >= redStart) {
      return "red";
    }

    if (average >= yellowStart) {
      return "yellow";
    }

    return "green";
  };

  const getLatestWifiSignal = (sensor: any) => {
    if (!sensor) {
      return null;
    }

    const latestRecordSignal = sensor.records?.at?.(-1)?.wifi_signal;
    if (typeof latestRecordSignal === "number") {
      return latestRecordSignal;
    }

    if (typeof sensor?.wifi_signal === "number") {
      return sensor.wifi_signal;
    }

    return null;
  };

  // Wi-Fi RSSI thresholds (dBm) derived from common signal-strength guidelines
  const getWifiSignalStatus = (sensor: any) => {
    if (!isSensorActive(sensor)) {
      return "offline";
    }

    const signal = getLatestWifiSignal(sensor);
    if (typeof signal !== "number") {
      return "offline";
    }

    if (signal >= -60) {
      return "green";
    }

    if (signal >= -75) {
      return "yellow";
    }

    if (signal >= -85) {
      return "red";
    }

    return "offline";
  };

  const getDepartmentAverage = (dept: any) => {
    const sensors = Array.isArray(dept?.sensors) ? dept.sensors : [];
    if (!sensors.length) {
      return 0;
    }

    let total = 0;
    let count = 0;

    sensors.forEach((sensor: any) => {
      const values = getSensorValues(sensor);
      values.forEach((value: any) => {
        total += value;
        count += 1;
      });
    });

    if (!count) {
      return Number.isFinite(dept?.avg) ? dept.avg : 0;
    }

    return total / count;
  };

  const getDepartmentThresholds = (dept: any) => {
    const sensors = Array.isArray(dept?.sensors) ? dept.sensors : [];
    if (!sensors.length) {
      return { yellowStart: 60, redStart: 70 };
    }

    let yellowSum = 0;
    let redSum = 0;
    let yellowCount = 0;
    let redCount = 0;

    sensors.forEach((sensor: any) => {
      const { yellowStart, redStart } = getSensorThresholds(sensor);
      if (Number.isFinite(yellowStart)) {
        yellowSum += yellowStart;
        yellowCount += 1;
      }
      if (Number.isFinite(redStart)) {
        redSum += redStart;
        redCount += 1;
      }
    });

    const yellowStart = yellowCount > 0 ? yellowSum / yellowCount : 60;
    const redStart = redCount > 0 ? redSum / redCount : yellowStart + 10;

    return { yellowStart, redStart };
  };

  const getDepartmentNoiseStatus = (
    dept: any,
    thresholds?: { yellowStart: number; redStart: number }
  ) => {
    const sensors = Array.isArray(dept?.sensors) ? dept.sensors : [];
    const deptAverage = getDepartmentAverage(dept);

    if (!Number.isFinite(deptAverage) || deptAverage <= 0) {
      return "offline";
    }

    const hasActiveSensor = sensors.some((sensor: any) =>
      isSensorActive(sensor)
    );

    if (!hasActiveSensor) {
      return "offline";
    }

    const { yellowStart, redStart } =
      thresholds ?? getDepartmentThresholds(dept);

    if (deptAverage >= redStart) {
      return "red";
    }

    if (deptAverage >= yellowStart) {
      return "yellow";
    }

    return "green";
  };

  const dashboardStats = useMemo(() => {
    const summary = {
      totalDepartments: departments.length,
      totalSensors: 0,
      criticalSensors: 0,
      offlineSensors: 0,
      averageNoise: 0,
    };

    if (!departments.length) {
      return summary;
    }

    let noiseSum = 0;
    let noiseSamples = 0;

    departments.forEach((dept: any) => {
      const sensors = Array.isArray(dept?.sensors) ? dept.sensors : [];
      summary.totalSensors += sensors.length;

      sensors.forEach((sensor: any) => {
        const noiseStatus = getSensorNoiseStatus(sensor);
        if (noiseStatus === "red" || noiseStatus === "yellow") {
          summary.criticalSensors += 1;
        }

        const wifiStatus = getWifiSignalStatus(sensor);
        if (wifiStatus === "offline") {
          summary.offlineSensors += 1;
        }

        const sensorAvg = getSensorAverage(sensor);
        if (sensorAvg > 0) {
          noiseSum += sensorAvg;
          noiseSamples += 1;
        }
      });
    });

    summary.averageNoise =
      noiseSamples > 0 ? Math.round((noiseSum / noiseSamples) * 100) / 100 : 0;

    return summary;
  }, [departments]);

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

  const normalizeChartValues = (values?: Array<number | string>) => {
    if (!values || !values.length) {
      return [];
    }

    return values.map((value) => {
      const parsed = parseAverageValue(value);
      return Math.max(parsed, 0);
    });
  };

  const MiniChart = ({ data, color }: { data: number[]; color: string }) => {
    const normalizedValues = normalizeChartValues(data);
    const cappedData = normalizedValues.map((value) => Math.min(value, 200));

    if (!cappedData.length) {
      return <div className="h-8 sm:h-10 flex items-end" />;
    }

    const minValue = Math.min(...cappedData);
    const maxValue = Math.max(...cappedData);
    const paddedMin = Math.max(Math.min(minValue, 35), 0);
    const paddedMax = Math.max(maxValue, paddedMin + 10);
    const range = paddedMax - paddedMin;

    return (
      <div className="flex items-end h-8 sm:h-12 gap-0.5 sm:gap-1">
        {cappedData.map((value, index) => (
          <div
            key={index}
            className={`w-1.5 sm:w-2 ${color} rounded-t-sm transition-all duration-300`}
            style={{
              height: `${Math.max(((value - paddedMin) / range) * 100, 8)}%`,
              minHeight: "6px",
            }}
          />
        ))}
      </div>
    );
  };

  // console.log(departments, "departments");

  const getSensoresStatus = (sensor: any) => {
    return getSensorAverage(sensor);
  };

  const displayFullName = [user?.firstName, user?.lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");

  const userEmail = typeof user?.email === "string" ? user.email.trim() : "";

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

  const getSensorAvgValues = (sensor: any) => {
    return getSensorValues(sensor);
  };

  const getAllSensorsAvgValues = (dept: any) => {
    const sensors = Array.isArray(dept?.sensors) ? dept.sensors : [];
    return sensors.map((sensor: any) => {
      const avg = getSensorAverage(sensor);
      return Math.round(avg * 100) / 100;
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
              <div className="flex flex-col gap-2 items-end sm:items-start border-gray-100 text-right sm:text-left">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.username ?? "User"}
                  </div>
                  {displayFullName && (
                    <div className="text-xs text-gray-600">
                      {displayFullName}
                    </div>
                  )}
                  {userEmail && (
                    <div className="text-xs text-gray-500">{userEmail}</div>
                  )}
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
        <div className="flex flex-col xl:flex-row gap-6 sm:gap-8 mb-6 sm:mb-8">
          <div className="flex-1">
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
              <div className="bg-white p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Departments
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-0.5 sm:mt-1">
                      {dashboardStats.totalDepartments}
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
                      {dashboardStats.totalSensors}
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
                      {dashboardStats.criticalSensors}
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
                      {dashboardStats.offlineSensors}
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
                      {dashboardStats.averageNoise} dB
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
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Quick Actions
              </h2>
              <p className="text-xs text-gray-500">
                Run common workflows in one click
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={openReportsModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 transition-colors"
              >
                <FileSpreadsheet className="h-4 w-4 text-blue-50" />
                <span>Generate report</span>
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://sound-level.vision-jo.com/admin",
                    "_blank"
                  )
                }
                className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Settings
              </button>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                {departments?.map((dept: any) => {
                  const deptAverage = getDepartmentAverage(dept);
                  const deptThresholds = getDepartmentThresholds(dept);
                  const departmentStatus = getDepartmentNoiseStatus(
                    dept,
                    deptThresholds
                  );
                  const maxRange =
                    Number.isFinite(deptThresholds.redStart) &&
                    deptThresholds.redStart > 0
                      ? deptThresholds.redStart * 1.5
                      : 120;
                  const progressRatio =
                    maxRange > 0 ? (deptAverage / maxRange) * 100 : 0;
                  const clampedRatio = Math.min(
                    Math.max(progressRatio, 0),
                    100
                  );

                  return (
                    <div
                      key={dept.id}
                      className={`h-full flex flex-col rounded-lg border-2 transition-all duration-300 ${getStatusColor(
                        departmentStatus
                      )}`}
                    >
                      {/* Department Header */}
                      <div
                        className="p-3 sm:p-4"
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
                              {/* <p className="text-xs sm:text-sm text-gray-600">
                              {dept.name}
                            </p> */}
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                            <div className="text-left sm:text-right">
                              <div className="text-lg sm:text-2xl font-bold text-gray-900">
                                {Math.round(deptAverage)} dB
                              </div>
                            </div>
                            <div className="w-16 sm:w-24">
                              <MiniChart
                                data={getAllSensorsAvgValues(dept)}
                                color={getProgressColor(departmentStatus)}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 sm:mt-3">
                          <div className="flex justify-between text-xs sm:text-sm text-gray-600 mb-1">
                            <span>Noise Level</span>
                            <span>{Math.round(clampedRatio)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                            <div
                              className={`h-1.5 sm:h-2 rounded-full transition-all duration-500 ${getProgressColor(
                                departmentStatus
                              )}`}
                              style={{
                                width: `${clampedRatio}%`,
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
                            {dept.sensors.map((sensor: any) => {
                              const wifiStatus = getWifiSignalStatus(sensor);
                              const noiseStatus = getSensorNoiseStatus(sensor);
                              return (
                                <div
                                  key={sensor.id}
                                  onClick={() =>
                                    handleSensorClick(sensor, dept)
                                  }
                                  className={`p-3 rounded-lg border ${getStatusColor(
                                    noiseStatus
                                  )} hover:shadow-md transition-all duration-200`}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h5 className="text-sm font-medium text-gray-800">
                                          {sensor.name}
                                        </h5>
                                        {getSensorStatusIcon(sensor)}
                                      </div>
                                      <p className="text-xs text-gray-600">
                                        {sensor.name_en}
                                      </p>
                                      <div className="mt-1 text-[11px] text-gray-500 space-y-0.5">
                                        {sensor.sensor_name && (
                                          <p className="truncate">
                                            {sensor.sensor_name}
                                          </p>
                                        )}
                                        {sensor.sensor_number && (
                                          <p>
                                            Sensor #: {sensor.sensor_number}
                                          </p>
                                        )}
                                        {sensor.floor && (
                                          <p>Floor: {sensor.floor}</p>
                                        )}
                                        {sensor.last_data_update && (
                                          <p>
                                            Updated:{" "}
                                            {new Date(
                                              sensor.last_data_update
                                            ).toLocaleString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              hour12: false,
                                            })}
                                          </p>
                                        )}
                                      </div>
                                      {sensor.records &&
                                        sensor.records.length > 0 &&
                                        sensor.records[
                                          sensor.records.length - 1
                                        ].date_time && (
                                          <p className="text-xs text-gray-500">
                                            Last:{" "}
                                            {new Date(
                                              sensor.records[
                                                sensor.records.length - 1
                                              ].date_time
                                            ).toLocaleString("en-US", {
                                              month: "short",
                                              day: "numeric",
                                              hour: "2-digit",
                                              minute: "2-digit",
                                              hour12: false,
                                            })}
                                          </p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-lg font-bold text-gray-900">
                                        {!isSensorActive(sensor)
                                          ? "--"
                                          : Math.round(
                                              getSensorAverage(sensor)
                                            )}{" "}
                                        dB
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
                                        isSensorActive(sensor)
                                          ? getSensorAvgValues(sensor)
                                          : [10, 9, 10, 6, 10, 8, 10, 6, 10, 9]
                                      }
                                      color={getProgressColor(noiseStatus)}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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
            {/* <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
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
            </div> */}
          </div>
        </div>

        {/* Mobile: Sensor Status Overview */}
        {/* <div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 p-4 mt-6">
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
        </div> */}
      </div>

      {/* Sensor Modal
      <SensorModal
        sensor={selectedSensor}
        department={selectedDepartment}
        isOpen={isSensorModalOpen}
        onClose={closeSensorModal}
      />
      */}

      {/* API Reports Modal (simple selector for report 1–8 + date range) */}
      <ApiReportModal isOpen={isReportsModalOpen} onClose={closeReportsModal} />

      {/* Heatmap Modal */}
      {/* <HeatmapModal
        isOpen={isHeatmapModalOpen}
        onClose={closeHeatmapModal}
        departments={departments}
      /> */}

      {/* Sensor Graph Modal */}
      {/* <SensorGraphModal
        isOpen={isSensorGraphModalOpen}
        onClose={closeSensorGraphModal}
        departments={departments}
      /> */}

      {/* Alert Config Modal */}
      {/* <AlertConfigModal
        isOpen={isAlertConfigModalOpen}
        onClose={closeAlertConfigModal}
        departments={departments}
      /> */}
    </div>
  );
}

export default App;
