import React, { useState, useEffect } from 'react';
import { X, BarChart3, Calendar, TrendingUp, Download, Activity } from 'lucide-react';

interface SensorGraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
}

type TimePeriod = 'hour' | '6hour' | 'day' | 'week' | 'month';

const SensorGraphModal: React.FC<SensorGraphModalProps> = ({ isOpen, onClose, departments }) => {
  const [selectedSensor, setSelectedSensor] = useState<any>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('day');
  const [graphData, setGraphData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);

  const timeMapping: Record<TimePeriod, number> = {
    hour: 3600,
    '6hour': 21600,
    day: 86400,
    week: 604800,
    month: 2592000,
  };

  useEffect(() => {
    if (!selectedSensor) {
      setGraphData([]);
      setStatistics(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const cutoff = Date.now() - timeMapping[timePeriod] * 1000;

    const filteredRecords = (selectedSensor.records || []).filter((record: any) => {
      if (!record?.date_time) {
        return true;
      }
      const recordTime = new Date(record.date_time).getTime();
      if (Number.isNaN(recordTime)) {
        return true;
      }
      return recordTime >= cutoff;
    });

    const nextData = filteredRecords.length ? filteredRecords : generateMockData();
    setGraphData(nextData);
    calculateStatistics(nextData);
    setLoading(false);
  }, [selectedSensor, timePeriod]);

  const generateMockData = () => {
    const now = new Date();
    const data = [];
    let intervals = 24;
    let intervalMs = 60 * 60 * 1000; // 1 hour

    switch (timePeriod) {
      case 'hour':
        intervals = 12;
        intervalMs = 5 * 60 * 1000; // 5 minutes
        break;
      case '6hour':
        intervals = 36;
        intervalMs = 10 * 60 * 1000; // 10 minutes
        break;
      case 'day':
        intervals = 24;
        intervalMs = 60 * 60 * 1000; // 1 hour
        break;
      case 'week':
        intervals = 7;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
      case 'month':
        intervals = 30;
        intervalMs = 24 * 60 * 60 * 1000; // 1 day
        break;
    }

    for (let i = intervals - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * intervalMs));
      const baseNoise = 45 + Math.sin((date.getHours() || 12) * Math.PI / 12) * 15;
      const randomVariation = (Math.random() - 0.5) * 10;
      const weekendFactor = [0, 6].includes(date.getDay()) ? 0.8 : 1;
      
      data.push({
        id: i,
        avg: Math.max(35, (baseNoise + randomVariation) * weekendFactor).toFixed(1),
        date_time: date.toISOString(),
        wifi_signal: Math.floor(Math.random() * 40) + 60
      });
    }

    return data;
  };

  const calculateStatistics = (data: any[]) => {
    if (!data || data.length === 0) return;

    const values = data.map(record => parseFloat(record.avg));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Find peak and quiet periods
    const sortedData = [...data].sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
    const peak = sortedData[0];
    const quiet = sortedData[sortedData.length - 1];

    setStatistics({
      max: max.toFixed(1),
      min: min.toFixed(1),
      avg: avg.toFixed(1),
      peak: {
        value: parseFloat(peak.avg).toFixed(1),
        time: peak.date_time
      },
      quiet: {
        value: parseFloat(quiet.avg).toFixed(1),
        time: quiet.date_time
      },
      totalReadings: data.length
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    switch (timePeriod) {
      case 'hour':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      case '6hour':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      case 'day':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      case 'week':
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      case 'month':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'hour': return 'Last Hour';
      case '6hour': return 'Last 6 Hours';
      case 'day': return 'Last 24 Hours';
      case 'week': return 'Last Week';
      case 'month': return 'Last Month';
      default: return 'Last 24 Hours';
    }
  };

  const getBarColor = (value: number) => {
    if (!selectedSensor) return '#3b82f6';
    
    if (value >= selectedSensor.red) return '#ef4444';
    if (value >= selectedSensor.yellow) return '#f59e0b';
    return '#10b981';
  };

  const BarChart = () => {
    if (!graphData || graphData.length === 0) return null;

    const maxValue = Math.max(...graphData.map(d => parseFloat(d.avg)));
    const minValue = Math.min(...graphData.map(d => parseFloat(d.avg)));
    const range = maxValue - minValue;
    const chartHeight = 300;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            Noise Level Analysis - {getTimePeriodLabel()}
          </h3>
          <button 
            className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors text-sm"
            onClick={() => {/* Export functionality */}}
          >
            <Download className="h-4 w-4 inline mr-1" />
            Export
          </button>
        </div>

        <div className="relative" style={{ height: chartHeight + 60 }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{maxValue.toFixed(0)} LV</span>
            <span>{((maxValue + minValue) / 2).toFixed(0)} LV</span>
            <span>{minValue.toFixed(0)} LV</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 relative bg-gray-50 rounded" style={{ height: chartHeight }}>
            {/* Threshold lines */}
            {selectedSensor && (
              <>
                <div 
                  className="absolute w-full border-t-2 border-red-300 border-dashed"
                  style={{ 
                    top: `${((maxValue - selectedSensor.red) / range) * chartHeight}px` 
                  }}
                >
                  <span className="absolute -top-5 right-2 text-xs text-red-600 bg-white px-1">
                    Critical: {selectedSensor.red} LV
                  </span>
                </div>
                <div 
                  className="absolute w-full border-t-2 border-yellow-300 border-dashed"
                  style={{ 
                    top: `${((maxValue - selectedSensor.yellow) / range) * chartHeight}px` 
                  }}
                >
                  <span className="absolute -top-5 right-2 text-xs text-yellow-600 bg-white px-1">
                    Warning: {selectedSensor.yellow} LV
                  </span>
                </div>
              </>
            )}

            {/* Bars */}
            <div className="flex items-end justify-between h-full p-2 gap-1">
              {graphData.map((record, index) => {
                const value = parseFloat(record.avg);
                const barHeight = ((value - minValue) / range) * (chartHeight - 20);
                
                return (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group relative"
                  >
                    <div
                      className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{
                        height: `${Math.max(barHeight, 5)}px`,
                        backgroundColor: getBarColor(value),
                        minHeight: '5px'
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        <div>{value} LV</div>
                        <div className="text-xs opacity-75">
                          {formatDateTime(record.date_time)}
                        </div>
                        {record.wifi_signal && (
                          <div className="text-xs opacity-75">
                            Signal: {record.wifi_signal}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis labels */}
          <div className="ml-12 mt-2 flex justify-between text-xs text-gray-500">
            <span>{graphData.length > 0 ? formatDateTime(graphData[0].date_time) : 'Start'}</span>
            <span>Now</span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Sensor Graph Analysis</h2>
              <p className="text-sm text-gray-600">تحليل بياني لأجهزة الاستشعار</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sensor Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Department & Sensor
              </label>
              <div className="space-y-2">
                <select
                  value={selectedDepartment?.id || ''}
                  onChange={(e) => {
                    const dept = departments.find(d => d.id === e.target.value);
                    setSelectedDepartment(dept);
                    setSelectedSensor(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} - {dept.name_en}
                    </option>
                  ))}
                </select>
                
                {selectedDepartment && (
                  <select
                    value={selectedSensor?.id || ''}
                    onChange={(e) => {
                      const sensor = selectedDepartment.sensors.find((s: any) => s.id === e.target.value);
                      setSelectedSensor(sensor);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose Sensor</option>
                    {selectedDepartment.sensors.map((sensor: any) => (
                      <option key={sensor.id} value={sensor.id}>
                        {sensor.name} - {sensor.name_en}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Time Period Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <div className="grid grid-cols-5 gap-2">
                {(['hour', '6hour', 'day', 'week', 'month'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    {period === '6hour' ? '6H' : period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!selectedSensor ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">Select a sensor to view analysis</p>
                <p className="text-sm">اختر جهاز استشعار لعرض التحليل</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistics Cards */}
              {statistics && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.avg}</div>
                    <div className="text-sm text-blue-700">Average LV</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{statistics.max}</div>
                    <div className="text-sm text-red-700">Peak LV</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.min}</div>
                    <div className="text-sm text-green-700">Minimum LV</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.totalReadings}</div>
                    <div className="text-sm text-purple-700">Total Readings</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <div className="text-lg font-bold text-gray-600">
                      {selectedSensor.is_active ? 'Online' : 'Offline'}
                    </div>
                    <div className="text-sm text-gray-700">Status</div>
                  </div>
                </div>
              )}

              {/* Bar Chart */}
              <BarChart />

              {/* Peak and Quiet Times */}
              {statistics && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Peak Reading
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-red-700">Level:</span>
                        <span className="font-bold text-red-900">{statistics.peak.value} LV</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-red-700">Time:</span>
                        <span className="font-bold text-red-900">
                          {formatDateTime(statistics.peak.time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-green-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 transform rotate-180" />
                      Quietest Reading
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-green-700">Level:</span>
                        <span className="font-bold text-green-900">{statistics.quiet.value} LV</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">Time:</span>
                        <span className="font-bold text-green-900">
                          {formatDateTime(statistics.quiet.time)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sensor Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Sensor Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Name:</span>
                    <p className="font-medium">{selectedSensor.name}</p>
                    <p className="text-sm text-gray-500">{selectedSensor.name_en}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Department:</span>
                    <p className="font-medium">{selectedDepartment.name}</p>
                    <p className="text-sm text-gray-500">{selectedDepartment.name_en}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Thresholds:</span>
                    <p className="text-sm">
                      <span className="text-yellow-600">Warning: {selectedSensor.yellow} LV</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-red-600">Critical: {selectedSensor.red} LV</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SensorGraphModal;