
import React, { useState, useEffect, useMemo } from 'react';
import { Device, DeviceStatus, SystemStats, Alert } from './types';
import { createInitialDevices, updateDevices } from './utils/mockData';
import StatusBadge from './components/StatusBadge';
import MetricChart from './components/MetricChart';
import GeminiInsights from './components/GeminiInsights';
import DeviceDetailModal from './components/DeviceDetailModal';
import AlertToast from './components/AlertToast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type SortKey = 'name' | 'status' | 'update';
type SortOrder = 'asc' | 'desc';

const App: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<DeviceStatus | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Alert system state
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());

  // Configurable thresholds
  const [cpuThreshold, setCpuThreshold] = useState<number>(90);
  const [ramThreshold, setRamThreshold] = useState<number>(90);
  const [alertDuration, setAlertDuration] = useState<number>(60); // seconds

  // Initialize and tick data
  useEffect(() => {
    setDevices(createInitialDevices(16));
    const interval = setInterval(() => {
      setDevices(prev => updateDevices(prev));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Monitor for alerts based on dynamic thresholds and duration
  useEffect(() => {
    if (devices.length === 0) return;

    // Data points are gathered every 3 seconds (as per the interval above)
    const pointsNeeded = Math.max(1, Math.ceil(alertDuration / 3));
    const newAlerts: Alert[] = [];

    devices.forEach(device => {
      // Ensure we have enough history to evaluate the duration
      if (device.metrics.length < pointsNeeded) return;

      const recentMetrics = device.metrics.slice(-pointsNeeded);
      const latestMetric = device.metrics[device.metrics.length - 1];
      
      // Check CPU against dynamic threshold
      const cpuExceeded = recentMetrics.every(m => m.cpu > cpuThreshold);
      // Check RAM against dynamic threshold
      const ramExceeded = recentMetrics.every(m => m.ram > ramThreshold);

      if (cpuExceeded) {
        const alertId = `${device.id}-CPU-${cpuThreshold}-${alertDuration}`;
        if (!dismissedAlertIds.has(alertId)) {
          newAlerts.push({
            id: alertId,
            deviceId: device.id,
            deviceName: device.name,
            metricType: 'CPU',
            value: latestMetric.cpu,
            timestamp: Date.now()
          });
        }
      }

      if (ramExceeded) {
        const alertId = `${device.id}-RAM-${ramThreshold}-${alertDuration}`;
        if (!dismissedAlertIds.has(alertId)) {
          newAlerts.push({
            id: alertId,
            deviceId: device.id,
            deviceName: device.name,
            metricType: 'RAM',
            value: latestMetric.ram,
            timestamp: Date.now()
          });
        }
      }
    });

    // Merge only unique new alerts
    setActiveAlerts(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const filteredNew = newAlerts.filter(a => !existingIds.has(a.id));
      if (filteredNew.length === 0) return prev;
      return [...prev, ...filteredNew];
    });
  }, [devices, dismissedAlertIds, cpuThreshold, ramThreshold, alertDuration]);

  const handleDismissAlert = (id: string) => {
    setDismissedAlertIds(prev => new Set([...prev, id]));
    setActiveAlerts(prev => prev.filter(a => a.id !== id));
  };

  // Compute stats
  const stats: SystemStats = useMemo(() => {
    const online = devices.filter(d => d.status === DeviceStatus.ONLINE).length;
    const warnings = devices.filter(d => d.status === DeviceStatus.WARNING).length;
    const errors = devices.filter(d => d.status === DeviceStatus.ERROR).length;
    const avgCpu = devices.reduce((acc, d) => acc + (d.metrics[d.metrics.length - 1]?.cpu || 0), 0) / (devices.length || 1);
    const avgRam = devices.reduce((acc, d) => acc + (d.metrics[d.metrics.length - 1]?.ram || 0), 0) / (devices.length || 1);

    return {
      totalDevices: devices.length,
      onlineCount: online,
      warningCount: warnings,
      errorCount: errors,
      avgCpuUsage: avgCpu,
      avgRamUsage: avgRam,
    };
  }, [devices]);

  // Priority for status sorting
  const statusPriority = {
    [DeviceStatus.ERROR]: 0,
    [DeviceStatus.WARNING]: 1,
    [DeviceStatus.ONLINE]: 2,
    [DeviceStatus.OFFLINE]: 3,
  };

  // Filtered and Sorted devices
  const processedDevices = useMemo(() => {
    let result = devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.ip.includes(search);
      const matchesStatus = filterStatus === 'ALL' || d.status === filterStatus;
      return matchesSearch && matchesStatus;
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortKey === 'status') {
        comparison = statusPriority[a.status] - statusPriority[b.status];
      } else if (sortKey === 'update') {
        comparison = b.lastUpdate - a.lastUpdate;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [devices, search, filterStatus, sortKey, sortOrder]);

  const selectedDevice = useMemo(() => 
    devices.find(d => d.id === selectedDeviceId) || null
  , [devices, selectedDeviceId]);

  const pieData = [
    { name: 'Online', value: stats.onlineCount, color: '#10b981' },
    { name: 'Warning', value: stats.warningCount, color: '#f59e0b' },
    { name: 'Error', value: stats.errorCount, color: '#f43f5e' },
    { name: 'Offline', value: Math.max(0, stats.totalDevices - stats.onlineCount - stats.warningCount - stats.errorCount), color: '#64748b' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Alert Notification Container */}
      <div className="fixed top-6 right-6 z-[100] w-full max-w-sm space-y-4">
        {activeAlerts.map(alert => (
          <AlertToast key={alert.id} alert={alert} onDismiss={handleDismissAlert} />
        ))}
      </div>

      {/* Sidebar - Desktop Only */}
      <aside className="w-full lg:w-64 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex-shrink-0 p-6 flex flex-col sticky top-0 h-auto lg:h-screen overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Pulse<span className="text-indigo-500">Monitor</span></h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">v3.4.0 PRO</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 mb-8">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-indigo-600/10 text-indigo-400 rounded-lg font-medium transition-all group">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all group">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Nodes
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-all group">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 2v-6m-8 13h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            Analytics
          </a>
        </nav>

        {/* Alert Configuration UI */}
        <div className="mb-6 pt-6 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Alert Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">CPU Threshold (%)</label>
              <input 
                type="number" 
                min="0" max="100" 
                value={cpuThreshold} 
                onChange={(e) => setCpuThreshold(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">RAM Threshold (%)</label>
              <input 
                type="number" 
                min="0" max="100" 
                value={ramThreshold} 
                onChange={(e) => setRamThreshold(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Duration (seconds)</label>
              <input 
                type="number" 
                min="3" step="3"
                value={alertDuration} 
                onChange={(e) => setAlertDuration(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="text-[9px] text-slate-500 mt-1 italic">Threshold must persist for this time.</p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="p-4 bg-slate-800/40 rounded-xl">
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-widest font-bold">Network Load</p>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-mono text-slate-300">{(stats.avgCpuUsage).toFixed(1)}% CPU</span>
              <span className="text-xs text-indigo-400">Stable</span>
            </div>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-indigo-500 h-full transition-all duration-1000" 
                style={{ width: `${stats.avgCpuUsage}%` }}
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 lg:space-y-8">
        
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase">Health OK</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Healthy Nodes</h3>
            <p className="text-3xl font-bold text-white mt-1">{stats.onlineCount} <span className="text-sm text-slate-500 font-normal">/ {stats.totalDevices}</span></p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded uppercase">Attention</span>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Critical Errors</h3>
            <p className="text-3xl font-bold text-white mt-1">{stats.errorCount}</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
            </div>
            <h3 className="text-slate-400 text-sm font-medium">Average CPU Load</h3>
            <p className="text-3xl font-bold text-white mt-1">{stats.avgCpuUsage.toFixed(1)}%</p>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl shadow-sm overflow-hidden flex flex-col items-center justify-center">
            <div className="w-full h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-widest mt-[-10px]">Status Distribution</h3>
          </div>
        </div>

        {/* Gemini Insights Section */}
        <GeminiInsights devices={processedDevices} />

        {/* Filters and Controls */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
          <div className="relative w-full xl:w-96">
            <input 
              type="text" 
              placeholder="Search by device name or IP..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
            <svg className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</span>
               <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-transparent text-white text-sm py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="ALL" className="bg-slate-800">All Nodes</option>
                <option value={DeviceStatus.ONLINE} className="bg-slate-800">Online</option>
                <option value={DeviceStatus.WARNING} className="bg-slate-800">Warning</option>
                <option value={DeviceStatus.ERROR} className="bg-slate-800">Error</option>
                <option value={DeviceStatus.OFFLINE} className="bg-slate-800">Offline</option>
              </select>
            </div>

            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Sort:</span>
               <select 
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="bg-transparent text-white text-sm py-1.5 focus:outline-none cursor-pointer"
              >
                <option value="name" className="bg-slate-800">Name</option>
                <option value="status" className="bg-slate-800">Severity</option>
                <option value="update" className="bg-slate-800">Recent Activity</option>
              </select>
              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="p-1 hover:bg-slate-700 rounded transition-colors text-indigo-400"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                <svg className={`w-4 h-4 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl p-1 flex">
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Device Grid/List */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6' : 'space-y-4'}>
          {processedDevices.map(device => (
            <div 
              key={device.id} 
              onClick={() => setSelectedDeviceId(device.id)}
              className="bg-slate-800 border border-slate-700 rounded-2xl p-5 hover:border-indigo-500/50 transition-all group shadow-sm hover:shadow-indigo-500/5 cursor-pointer active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    device.type === 'SERVER' ? 'bg-blue-500/10 text-blue-500' :
                    device.type === 'ROUTER' ? 'bg-purple-500/10 text-purple-500' :
                    device.type === 'DATABASE' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {device.type === 'SERVER' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>}
                    {device.type === 'ROUTER' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.192 9.192 0 0112.158 0M4.929 4.929l14.142 14.142" /></svg>}
                    {device.type === 'DATABASE' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
                    {device.type === 'IOT' && <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold group-hover:text-indigo-400 transition-colors">{device.name}</h4>
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{device.ip}</p>
                  </div>
                </div>
                <StatusBadge status={device.status} />
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>CPU Usage</span>
                    <span className="font-mono">{device.metrics[device.metrics.length - 1]?.cpu.toFixed(0)}%</span>
                  </div>
                  <MetricChart 
                    data={device.metrics} 
                    metric="cpu" 
                    color="#6366f1" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Memory</p>
                    <p className="text-lg font-bold text-slate-200">{device.metrics[device.metrics.length - 1]?.ram.toFixed(0)}%</p>
                    <div className="w-full bg-slate-700 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-blue-400 h-full" style={{ width: `${device.metrics[device.metrics.length - 1]?.ram}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Network</p>
                    <p className="text-lg font-bold text-slate-200">{device.metrics[device.metrics.length - 1]?.network.toFixed(0)}%</p>
                    <div className="w-full bg-slate-700 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-purple-400 h-full" style={{ width: `${device.metrics[device.metrics.length - 1]?.network}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {device.location}
                  </span>
                  <span>Last seen {Math.floor((Date.now() - device.lastUpdate) / 1000)}s ago</span>
                </div>
              </div>
            </div>
          ))}

          {processedDevices.length === 0 && (
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500">
              <svg className="w-16 h-16 opacity-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-lg font-medium">No matching devices found</p>
              <button onClick={() => {setSearch(''); setFilterStatus('ALL')}} className="mt-4 text-indigo-400 hover:text-indigo-300 transition-colors">Clear all filters</button>
            </div>
          )}
        </div>
      </main>

      {/* Modal Overlay */}
      {selectedDevice && (
        <DeviceDetailModal 
          device={selectedDevice} 
          onClose={() => setSelectedDeviceId(null)} 
        />
      )}
    </div>
  );
};

export default App;
