import React, { useState, useEffect } from 'react';
import { X, Map, TrendingUp, Calendar, Filter, Download } from 'lucide-react';
import axios from 'axios';

interface HeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
}

type ViewMode = 'heatmap' | 'trends';
type TimeRange = 'hour' | 'day' | 'week' | 'month';

const HeatmapModal: React.FC<HeatmapModalProps> = ({ isOpen, onClose, departments }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('heatmap');
  const [timeRange, setTimeRange] = useState<TimeRange>('day');
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [trendsData, setTrendsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchHeatmapData();
      fetchTrendsData();
    }
  }, [isOpen, timeRange, selectedFloor]);

  const fetchHeatmapData = async () => {
    setLoading(true);
    try {
      // محاكاة بيانات الخريطة الحرارية
      const mockHeatmapData = departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        name_en: dept.name_en,
        avg: dept.avg,
        color: dept.color,
        position: getRandomPosition(),
        sensors: dept.sensors.map((sensor: any) => ({
          ...sensor,
          position: getRandomPosition()
        }))
      }));
      
      setHeatmapData(mockHeatmapData);
    } catch (error) {
      console.error('Error fetching heatmap data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      // محاكاة بيانات الاتجاهات
      const mockTrendsData = generateTrendsData();
      setTrendsData(mockTrendsData);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    }
  };

  const getRandomPosition = () => ({
    x: Math.random() * 80 + 10, // 10% to 90% of container width
    y: Math.random() * 70 + 15  // 15% to 85% of container height
  });

  const generateTrendsData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const dayData = {
        date: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('ar', { weekday: 'short' }),
        hours: []
      };

      // إنشاء بيانات لكل ساعة
      for (let hour = 0; hour < 24; hour++) {
        const baseNoise = 45 + Math.sin(hour * Math.PI / 12) * 15; // نمط يومي طبيعي
        const randomVariation = (Math.random() - 0.5) * 10;
        const weekendFactor = [0, 6].includes(date.getDay()) ? 0.7 : 1; // أقل ضوضاء في عطلة نهاية الأسبوع
        
        dayData.hours.push({
          hour,
          avg: Math.max(35, baseNoise + randomVariation) * weekendFactor,
          peak: Math.max(40, (baseNoise + randomVariation + 10) * weekendFactor),
          departments: departments.map(dept => ({
            id: dept.id,
            name: dept.name,
            avg: Math.max(35, (baseNoise + randomVariation + (Math.random() - 0.5) * 5) * weekendFactor)
          }))
        });
      }
      
      data.push(dayData);
    }
    
    return data;
  };

  const getNoiseColor = (level: number) => {
    if (level >= 70) return '#ef4444'; // أحمر
    if (level >= 60) return '#f97316'; // برتقالي
    if (level >= 50) return '#eab308'; // أصفر
    return '#22c55e'; // أخضر
  };

  const getNoiseIntensity = (level: number) => {
    return Math.min(Math.max((level - 35) / 35, 0.1), 1);
  };

  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case 'hour': return 'آخر ساعة';
      case 'day': return 'آخر 24 ساعة';
      case 'week': return 'آخر أسبوع';
      case 'month': return 'آخر شهر';
      default: return 'آخر 24 ساعة';
    }
  };

  const HeatmapView = () => (
    <div className="space-y-6">
      {/* خريطة المستشفى */}
      <div className="bg-gray-50 rounded-lg p-6 relative" style={{ minHeight: '500px' }}>
        <div className="absolute inset-4 bg-white rounded border-2 border-gray-300 relative overflow-hidden">
          {/* خطوط الشبكة */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* أقسام المستشفى */}
          {heatmapData.map((dept) => (
            <div key={dept.id} className="absolute" style={{ zIndex: 2 }}>
              {/* منطقة القسم */}
              <div
                className="rounded-lg border-2 p-4 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer"
                style={{
                  left: `${dept.position.x}%`,
                  top: `${dept.position.y}%`,
                  backgroundColor: `${getNoiseColor(dept.avg)}20`,
                  borderColor: getNoiseColor(dept.avg),
                  minWidth: '120px',
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className="text-center">
                  <h4 className="font-bold text-sm text-gray-800">{dept.name}</h4>
                  <p className="text-xs text-gray-600 mb-2">{dept.name_en}</p>
                  <div className="text-lg font-bold" style={{ color: getNoiseColor(dept.avg) }}>
                    {Math.round(dept.avg)} LV
                  </div>
                </div>
              </div>

              {/* أجهزة الاستشعار */}
              {dept.sensors.map((sensor: any, index: number) => (
                <div
                  key={sensor.id}
                  className="absolute w-3 h-3 rounded-full border-2 border-white shadow-lg transition-all duration-300 hover:scale-150 cursor-pointer"
                  style={{
                    left: `${dept.position.x + (index - dept.sensors.length/2) * 8}%`,
                    top: `${dept.position.y + 15}%`,
                    backgroundColor: getNoiseColor(sensor.avg || 45),
                    opacity: getNoiseIntensity(sensor.avg || 45),
                    transform: 'translate(-50%, -50%)',
                    zIndex: 3
                  }}
                  title={`${sensor.name}: ${Math.round(sensor.avg || 45)} LV`}
                />
              ))}
            </div>
          ))}

          {/* مفتاح الألوان */}
          <div className="absolute bottom-4 right-4 bg-white p-3 rounded-lg shadow-lg border" style={{ zIndex: 4 }}>
            <h5 className="text-sm font-bold text-gray-800 mb-2">مستوى الضوضاء</h5>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }}></div>
                <span className="text-xs">آمن (&lt;50 LV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }}></div>
                <span className="text-xs">تحذير (50-60 LV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }}></div>
                <span className="text-xs">مرتفع (60-70 LV)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }}></div>
                <span className="text-xs">حرج (&gt;70 LV)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {heatmapData.filter(d => d.avg < 50).length}
          </div>
          <div className="text-sm text-green-700">أقسام آمنة</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {heatmapData.filter(d => d.avg >= 50 && d.avg < 60).length}
          </div>
          <div className="text-sm text-yellow-700">تحذيرات</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {heatmapData.filter(d => d.avg >= 60 && d.avg < 70).length}
          </div>
          <div className="text-sm text-orange-700">مرتفعة</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {heatmapData.filter(d => d.avg >= 70).length}
          </div>
          <div className="text-sm text-red-700">حرجة</div>
        </div>
      </div>
    </div>
  );

  const TrendsView = () => {
    const last7Days = trendsData.slice(-7);
    const hourlyPattern = Array.from({ length: 24 }, (_, hour) => {
      const hourData = trendsData.flatMap(day => 
        day.hours.filter((h: any) => h.hour === hour)
      );
      const avgNoise = hourData.reduce((sum: number, h: any) => sum + h.avg, 0) / hourData.length;
      return { hour, avg: avgNoise };
    });

    return (
      <div className="space-y-6">
        {/* الاتجاه الأسبوعي */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            الاتجاه الأسبوعي
          </h4>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {last7Days.map((day, index) => {
              const dayAvg = day.hours.reduce((sum: number, h: any) => sum + h.avg, 0) / day.hours.length;
              return (
                <div key={index} className="text-center">
                  <div className="text-xs text-gray-600 mb-1">{day.dayName}</div>
                  <div 
                    className="h-20 rounded flex items-end justify-center text-white text-xs font-bold"
                    style={{ 
                      backgroundColor: getNoiseColor(dayAvg),
                      opacity: getNoiseIntensity(dayAvg)
                    }}
                  >
                    {Math.round(dayAvg)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* النمط اليومي */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            النمط اليومي (متوسط 24 ساعة)
          </h4>
          <div className="grid grid-cols-12 gap-1 mb-4">
            {hourlyPattern.map((hourData, index) => (
              <div key={index} className="text-center">
                <div className="text-xs text-gray-600 mb-1">
                  {hourData.hour.toString().padStart(2, '0')}
                </div>
                <div 
                  className="h-16 rounded flex items-end justify-center text-white text-xs font-bold"
                  style={{ 
                    backgroundColor: getNoiseColor(hourData.avg),
                    opacity: getNoiseIntensity(hourData.avg)
                  }}
                >
                  {Math.round(hourData.avg)}
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-500 text-center">
            الساعات (00-23)
          </div>
        </div>

        {/* تحليل الذروة */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h5 className="font-bold text-red-800 mb-3">ساعات الذروة</h5>
            <div className="space-y-2">
              {hourlyPattern
                .sort((a, b) => b.avg - a.avg)
                .slice(0, 3)
                .map((hour, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-red-700">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <span className="font-bold text-red-900">
                      {Math.round(hour.avg)} LV
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-bold text-green-800 mb-3">ساعات الهدوء</h5>
            <div className="space-y-2">
              {hourlyPattern
                .sort((a, b) => a.avg - b.avg)
                .slice(0, 3)
                .map((hour, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-green-700">
                      {hour.hour.toString().padStart(2, '0')}:00
                    </span>
                    <span className="font-bold text-green-900">
                      {Math.round(hour.avg)} LV
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* اتجاهات الأقسام */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-bold text-gray-800 mb-4">اتجاهات الأقسام</h4>
          <div className="space-y-3">
            {departments.slice(0, 5).map((dept) => {
              const deptTrend = trendsData.slice(-7).map(day => {
                const deptData = day.hours.map((h: any) => 
                  h.departments.find((d: any) => d.id === dept.id)?.avg || 0
                );
                return deptData.reduce((sum: number, val: number) => sum + val, 0) / deptData.length;
              });
              
              return (
                <div key={dept.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-800">{dept.name}</div>
                    <div className="text-sm text-gray-600">{dept.name_en}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {deptTrend.map((value, index) => (
                        <div
                          key={index}
                          className="w-2 h-8 rounded"
                          style={{
                            backgroundColor: getNoiseColor(value),
                            opacity: getNoiseIntensity(value)
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-sm font-bold text-gray-900 ml-2">
                      {Math.round(dept.avg)} LV
                    </div>
                  </div>
                </div>
              );
            })}
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
              <Map className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {viewMode === 'heatmap' ? 'الخريطة الحرارية للضوضاء' : 'تحليل الاتجاهات'}
              </h2>
              <p className="text-sm text-gray-600">
                {viewMode === 'heatmap' ? 'توزيع الضوضاء في المستشفى' : 'أنماط الضوضاء الزمنية'}
              </p>
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
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'heatmap'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Map className="h-4 w-4 inline mr-2" />
                الخريطة الحرارية
              </button>
              <button
                onClick={() => setViewMode('trends')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  viewMode === 'trends'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-2" />
                تحليل الاتجاهات
              </button>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="hour">آخر ساعة</option>
                <option value="day">آخر 24 ساعة</option>
                <option value="week">آخر أسبوع</option>
                <option value="month">آخر شهر</option>
              </select>
            </div>

            {/* Export Button */}
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <Download className="h-4 w-4 inline mr-2" />
              تصدير
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {viewMode === 'heatmap' ? <HeatmapView /> : <TrendsView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeatmapModal;