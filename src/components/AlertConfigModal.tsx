import React, { useState, useEffect } from 'react';
import { X, Bell, Settings, Save, Plus, Trash2, Volume2, Clock, Users, Mail, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: any[];
}

interface AlertRule {
  id: string;
  name: string;
  department: string;
  sensor: string;
  threshold: number;
  duration: number; // in minutes
  notificationMethods: string[];
  recipients: string[];
  isActive: boolean;
  createdAt: string;
}

const AlertConfigModal: React.FC<AlertConfigModalProps> = ({ isOpen, onClose, departments }) => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [newRule, setNewRule] = useState<Partial<AlertRule>>({
    name: '',
    department: '',
    sensor: '',
    threshold: 70,
    duration: 5,
    notificationMethods: ['email'],
    recipients: [''],
    isActive: true
  });

  useEffect(() => {
    if (isOpen) {
      loadAlertRules();
    }
  }, [isOpen]);

  const loadAlertRules = () => {
    // Load from localStorage or API
    const savedRules = localStorage.getItem('alertRules');
    if (savedRules) {
      setAlertRules(JSON.parse(savedRules));
    } else {
      // Default rules
      const defaultRules: AlertRule[] = [
        {
          id: '1',
          name: 'ICU Critical Alert',
          department: 'ICU',
          sensor: 'all',
          threshold: 75,
          duration: 3,
          notificationMethods: ['email', 'sms', 'push'],
          recipients: ['admin@hospital.com', 'icu-head@hospital.com'],
          isActive: true,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'Emergency Room Warning',
          department: 'Emergency',
          sensor: 'all',
          threshold: 80,
          duration: 2,
          notificationMethods: ['email', 'push'],
          recipients: ['emergency@hospital.com'],
          isActive: true,
          createdAt: new Date().toISOString()
        }
      ];
      setAlertRules(defaultRules);
      localStorage.setItem('alertRules', JSON.stringify(defaultRules));
    }
  };

  const saveAlertRules = (rules: AlertRule[]) => {
    localStorage.setItem('alertRules', JSON.stringify(rules));
    setAlertRules(rules);
  };

  const handleCreateRule = () => {
    if (!newRule.name || !newRule.department || !newRule.threshold || !newRule.duration) {
      toast.error('Please fill in all required fields');
      return;
    }

    const rule: AlertRule = {
      id: Date.now().toString(),
      name: newRule.name!,
      department: newRule.department!,
      sensor: newRule.sensor || 'all',
      threshold: newRule.threshold!,
      duration: newRule.duration!,
      notificationMethods: newRule.notificationMethods || ['email'],
      recipients: newRule.recipients?.filter(r => r.trim()) || [],
      isActive: newRule.isActive ?? true,
      createdAt: new Date().toISOString()
    };

    const updatedRules = [...alertRules, rule];
    saveAlertRules(updatedRules);
    
    setNewRule({
      name: '',
      department: '',
      sensor: '',
      threshold: 70,
      duration: 5,
      notificationMethods: ['email'],
      recipients: [''],
      isActive: true
    });
    setIsCreating(false);
    toast.success('Alert rule created successfully!');
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;

    const updatedRules = alertRules.map(rule => 
      rule.id === editingRule.id ? editingRule : rule
    );
    saveAlertRules(updatedRules);
    setEditingRule(null);
    toast.success('Alert rule updated successfully!');
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = alertRules.filter(rule => rule.id !== ruleId);
    saveAlertRules(updatedRules);
    toast.success('Alert rule deleted successfully!');
  };

  const toggleRuleStatus = (ruleId: string) => {
    const updatedRules = alertRules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    );
    saveAlertRules(updatedRules);
    toast.success('Alert rule status updated!');
  };

  const getSelectedDepartment = (deptId: string) => {
    return departments.find(d => d.id === deptId);
  };

  const addRecipient = (rule: Partial<AlertRule>, setRule: (rule: Partial<AlertRule>) => void) => {
    const recipients = [...(rule.recipients || []), ''];
    setRule({ ...rule, recipients });
  };

  const removeRecipient = (index: number, rule: Partial<AlertRule>, setRule: (rule: Partial<AlertRule>) => void) => {
    const recipients = rule.recipients?.filter((_, i) => i !== index) || [];
    setRule({ ...rule, recipients });
  };

  const updateRecipient = (index: number, value: string, rule: Partial<AlertRule>, setRule: (rule: Partial<AlertRule>) => void) => {
    const recipients = [...(rule.recipients || [])];
    recipients[index] = value;
    setRule({ ...rule, recipients });
  };

  const RuleForm = ({ 
    rule, 
    setRule, 
    onSave, 
    onCancel, 
    title 
  }: { 
    rule: Partial<AlertRule>, 
    setRule: (rule: Partial<AlertRule>) => void, 
    onSave: () => void, 
    onCancel: () => void,
    title: string 
  }) => {
    const selectedDept = rule.department ? getSelectedDepartment(rule.department) : null;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-4">
        <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-blue-600" />
          {title}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rule Name *
            </label>
            <input
              type="text"
              value={rule.name || ''}
              onChange={(e) => setRule({ ...rule, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., ICU Critical Alert"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Department *
            </label>
            <select
              value={rule.department || ''}
              onChange={(e) => setRule({ ...rule, department: e.target.value, sensor: '' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} - {dept.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Sensor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sensor
            </label>
            <select
              value={rule.sensor || 'all'}
              onChange={(e) => setRule({ ...rule, sensor: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              disabled={!selectedDept}
            >
              <option value="all">All Sensors in Department</option>
              {selectedDept?.sensors?.map((sensor: any) => (
                <option key={sensor.id} value={sensor.id}>
                  {sensor.name} - {sensor.name_en}
                </option>
              ))}
            </select>
          </div>

          {/* Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Noise Threshold (LV) *
            </label>
            <input
              type="number"
              value={rule.threshold || 70}
              onChange={(e) => setRule({ ...rule, threshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="35"
              max="120"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration (minutes) *
            </label>
            <input
              type="number"
              value={rule.duration || 5}
              onChange={(e) => setRule({ ...rule, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              min="1"
              max="60"
            />
            <p className="text-xs text-gray-500 mt-1">
              Alert will trigger if noise exceeds threshold for this duration
            </p>
          </div>

          {/* Notification Methods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Methods
            </label>
            <div className="space-y-2">
              {['email', 'sms', 'push'].map(method => (
                <label key={method} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rule.notificationMethods?.includes(method) || false}
                    onChange={(e) => {
                      const methods = rule.notificationMethods || [];
                      if (e.target.checked) {
                        setRule({ ...rule, notificationMethods: [...methods, method] });
                      } else {
                        setRule({ ...rule, notificationMethods: methods.filter(m => m !== method) });
                      }
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize flex items-center gap-1">
                    {method === 'email' && <Mail className="h-4 w-4" />}
                    {method === 'sms' && <Smartphone className="h-4 w-4" />}
                    {method === 'push' && <Bell className="h-4 w-4" />}
                    {method}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipients
          </label>
          <div className="space-y-2">
            {(rule.recipients || ['']).map((recipient, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => updateRecipient(index, e.target.value, rule, setRule)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="email@example.com or +1234567890"
                />
                {(rule.recipients?.length || 0) > 1 && (
                  <button
                    onClick={() => removeRecipient(index, rule, setRule)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => addRecipient(rule, setRule)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
            >
              <Plus className="h-4 w-4" />
              Add Recipient
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Rule
          </button>
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
            <div className="p-3 bg-orange-100 rounded-lg">
              <Bell className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Alert Configuration</h2>
              <p className="text-sm text-gray-600">إعداد تنبيهات الضوضاء</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Create New Rule Button */}
          {!isCreating && !editingRule && (
            <div className="mb-6">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create New Alert Rule
              </button>
            </div>
          )}

          {/* Create New Rule Form */}
          {isCreating && (
            <RuleForm
              rule={newRule}
              setRule={setNewRule}
              onSave={handleCreateRule}
              onCancel={() => setIsCreating(false)}
              title="Create New Alert Rule"
            />
          )}

          {/* Edit Rule Form */}
          {editingRule && (
            <RuleForm
              rule={editingRule}
              setRule={setEditingRule}
              onSave={handleUpdateRule}
              onCancel={() => setEditingRule(null)}
              title="Edit Alert Rule"
            />
          )}

          {/* Existing Rules */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              Existing Alert Rules ({alertRules.length})
            </h3>

            {alertRules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No alert rules configured yet</p>
                <p className="text-sm">Create your first alert rule to get started</p>
              </div>
            ) : (
              alertRules.map((rule) => {
                const dept = getSelectedDepartment(rule.department);
                const sensor = rule.sensor === 'all' ? null : dept?.sensors?.find((s: any) => s.id === rule.sensor);

                return (
                  <div
                    key={rule.id}
                    className={`border rounded-lg p-4 ${
                      rule.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-800">{rule.name}</h4>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              rule.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Department:</span>
                            <p className="font-medium">{dept?.name || 'Unknown'}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Sensor:</span>
                            <p className="font-medium">
                              {rule.sensor === 'all' ? 'All Sensors' : sensor?.name || 'Unknown'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Threshold:</span>
                            <p className="font-medium flex items-center gap-1">
                              <Volume2 className="h-4 w-4" />
                              {rule.threshold} LV
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Duration:</span>
                            <p className="font-medium flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {rule.duration} min
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600">Methods:</span>
                            <div className="flex gap-1">
                              {rule.notificationMethods.map(method => (
                                <span
                                  key={method}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                >
                                  {method}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">
                              {rule.recipients.length} recipient(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => toggleRuleStatus(rule.id)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            rule.isActive
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {rule.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => setEditingRule(rule)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Alert System Status */}
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert System Status
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Active Rules:</span>
                <p className="font-bold text-blue-900">
                  {alertRules.filter(r => r.isActive).length}
                </p>
              </div>
              <div>
                <span className="text-blue-700">Total Rules:</span>
                <p className="font-bold text-blue-900">{alertRules.length}</p>
              </div>
              <div>
                <span className="text-blue-700">System Status:</span>
                <p className="font-bold text-green-600">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertConfigModal;