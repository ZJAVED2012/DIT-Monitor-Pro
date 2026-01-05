
import React, { useEffect } from 'react';
import { Device, DeviceStatus } from '../types';
import StatusBadge from './StatusBadge';
import MetricChart from './MetricChart';

interface DeviceDetailModalProps {
  device: Device;
  onClose: () => void;
}

const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({ device, onClose }) => {
  // Close on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const latest = device.metrics[device.metrics.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              device.status === DeviceStatus.ONLINE ? 'bg-emerald-500/10 text-emerald-500' :
              device.status === DeviceStatus.ERROR ? 'bg-rose-500/10 text-rose-500' :
              'bg-slate-500/10 text-slate-500'
            }`}>
               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white leading-none">{device.name}</h2>
                <StatusBadge status={device.status} />
              </div>
              <p className="text-slate-400 mt-1 font-mono text-sm uppercase tracking-wider">{device.ip} • {device.type} • {device.location}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'CPU Load', value: `${latest?.cpu.toFixed(1)}%`, color: 'text-indigo-400' },
              { label: 'RAM Usage', value: `${latest?.ram.toFixed(1)}%`, color: 'text-blue-400' },
              { label: 'Disk IO', value: `${latest?.disk.toFixed(1)}%`, color: 'text-emerald-400' },
              { label: 'Network', value: `${latest?.network.toFixed(1)}%`, color: 'text-purple-400' },
            ].map((m, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
                <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{m.label}</p>
                <p className={`text-xl font-mono font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Detailed Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                CPU Utilization History
              </h3>
              <div className="h-48">
                <MetricChart data={device.metrics} metric="cpu" color="#6366f1" />
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                Memory Usage History
              </h3>
              <div className="h-48">
                <MetricChart data={device.metrics} metric="ram" color="#3b82f6" />
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Network Throughput History
              </h3>
              <div className="h-48">
                <MetricChart data={device.metrics} metric="network" color="#10b981" />
              </div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Disk Activity History
              </h3>
              <div className="h-48">
                <MetricChart data={device.metrics} metric="disk" color="#f59e0b" />
              </div>
            </div>
          </div>

          {/* Node Configuration */}
          <div className="bg-slate-800/30 border border-slate-700/50 p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">Node Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">Hardware ID</span>
                <span className="text-slate-200 font-mono text-sm">{device.id}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">System IP</span>
                <span className="text-slate-200 font-mono text-sm">{device.ip}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">Data Region</span>
                <span className="text-slate-200 font-mono text-sm">{device.location}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">Polling Interval</span>
                <span className="text-slate-200 font-mono text-sm">3000ms</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">Last Update</span>
                <span className="text-slate-200 font-mono text-sm">{new Date(device.lastUpdate).toLocaleTimeString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/50 py-2">
                <span className="text-slate-500 text-sm">Security Layer</span>
                <span className="text-emerald-500 font-mono text-sm">AES-256-GCM</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeviceDetailModal;
