import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, Download, BarChart3, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import axios from 'axios';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HourlyData {
  hour: string;
  avg: number | null;
  level: string;
}

interface PeriodData {
  name: string;
  range: string;
  avg: number;
  level: string;
}

interface DailyReport {
  date: string;
  timezone: string;
  units: string;
  thresholds: {
    low: number;
    high: number;
  };
  hours: HourlyData[];
  periods: PeriodData[];
}

const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDailyReport();
    }
  }, [isOpen, selectedDate]);

  const fetchDailyReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://sound-level-dashboard.vision-jo.com/soundlevel/dashboard/report/sensor_daily_report?date=${selectedDate}`,
        headers: {},
      };

      const response = await axios.request(config);
      setReportData(response.data);
    } catch (error) {
      console.error('Error fetching daily report:', error);
      setError('Failed to fetch report data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'normal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'no_data':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <TrendingUp className="h-4 w-4 text-blue-600 transform rotate-180" />;
      case 'normal':
        return <BarChart3 className="h-4 w-4 text-green-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'no_data':
        return <Clock className="h-4 w-4 text-gray-600" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const HourlyChart = () => {
    if (!reportData?.hours) return null;

    const maxValue = Math.max(...reportData.hours.filter(h => h.avg !== null).map(h => h.avg!));
    const minValue = Math.min(...reportData.hours.filter(h => h.avg !== null).map(h => h.avg!));
    const range = maxValue - minValue;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Hourly Noise Levels - {reportData.date}
        </h3>

        <div className="relative mb-6" style={{ height: '300px' }}>
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500 pr-2">
            <span>{maxValue.toFixed(0)} {reportData.units}</span>
            <span>{((maxValue + minValue) / 2).toFixed(0)} {reportData.units}</span>
            <span>{minValue.toFixed(0)} {reportData.units}</span>
          </div>

          {/* Chart area */}
          <div className="ml-12 relative bg-gray-50 rounded" style={{ height: '300px' }}>
            {/* Threshold lines */}
            <div 
              className="absolute w-full border-t-2 border-red-300 border-dashed"
              style={{ 
                top: `${((maxValue - reportData.thresholds.high) / range) * 300}px` 
              }}
            >
              <span className="absolute -top-5 right-2 text-xs text-red-600 bg-white px-1">
                High: {reportData.thresholds.high} {reportData.units}
              </span>
            </div>
            <div 
              className="absolute w-full border-t-2 border-yellow-300 border-dashed"
              style={{ 
                top: `${((maxValue - reportData.thresholds.low) / range) * 300}px` 
              }}
            >
              <span className="absolute -top-5 right-2 text-xs text-yellow-600 bg-white px-1">
                Low: {reportData.thresholds.low} {reportData.units}
              </span>
            </div>

            {/* Bars */}
            <div className="flex items-end justify-between h-full p-2 gap-1">
              {reportData.hours.map((hour, index) => {
                if (hour.avg === null) {
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full h-2 bg-gray-300 rounded opacity-50"></div>
                      <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                        {hour.hour}
                      </div>
                    </div>
                  );
                }

                const barHeight = ((hour.avg - minValue) / range) * 280;
                const barColor = hour.level === 'high' ? '#ef4444' : 
                               hour.level === 'normal' ? '#10b981' : '#3b82f6';
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center group relative">
                    <div
                      className="w-full rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                      style={{
                        height: `${Math.max(barHeight, 5)}px`,
                        backgroundColor: barColor,
                        minHeight: '5px'
                      }}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        <div>{hour.avg.toFixed(1)} {reportData.units}</div>
                        <div className="text-xs opacity-75 capitalize">{hour.level}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 transform -rotate-45 origin-top-left">
                      {hour.hour}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const exportToPDF = () => {
    // PDF export functionality would be implemented here
    console.log('Exporting to PDF...');
  };

  const exportToExcel = () => {
    // Excel export functionality would be implemented here
    console.log('Exporting to Excel...');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Daily Noise Report</h2>
              <p className="text-sm text-gray-600">تقرير الضوضاء اليومي</p>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64 text-red-600">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">{error}</p>
              </div>
            </div>
          ) : reportData ? (
            <div className="space-y-6">
              {/* Report Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">Report Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Date:</span>
                    <p className="font-bold text-blue-900">{reportData.date}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Timezone:</span>
                    <p className="font-bold text-blue-900">{reportData.timezone}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Units:</span>
                    <p className="font-bold text-blue-900">{reportData.units}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Data Points:</span>
                    <p className="font-bold text-blue-900">
                      {reportData.hours.filter(h => h.avg !== null).length}/24 hours
                    </p>
                  </div>
                </div>
              </div>

              {/* Period Analysis */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {reportData.periods.map((period, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-lg p-4 ${getLevelColor(period.level)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{period.name}</h4>
                      {getLevelIcon(period.level)}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">{period.range}</div>
                    <div className="text-2xl font-bold">
                      {period.avg.toFixed(1)} {reportData.units}
                    </div>
                    <div className="text-xs capitalize mt-1 opacity-75">
                      Level: {period.level}
                    </div>
                  </div>
                ))}
              </div>

              {/* Hourly Chart */}
              <HourlyChart />

              {/* Hourly Data Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-700">Hourly Breakdown</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hour
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average Level
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.hours.map((hour, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {hour.hour}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {hour.avg !== null ? `${hour.avg.toFixed(2)} ${reportData.units}` : 'No Data'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(hour.level)}`}>
                              {getLevelIcon(hour.level)}
                              {hour.level === 'no_data' ? 'No Data' : hour.level.charAt(0).toUpperCase() + hour.level.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Thresholds Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-800 mb-3">Threshold Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <span className="text-sm font-medium text-yellow-800">Low Threshold</span>
                    <span className="text-lg font-bold text-yellow-900">
                      {reportData.thresholds.low} {reportData.units}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-sm font-medium text-red-800">High Threshold</span>
                    <span className="text-lg font-bold text-red-900">
                      {reportData.thresholds.high} {reportData.units}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No report data available</p>
                <p className="text-sm">Select a date to generate report</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;