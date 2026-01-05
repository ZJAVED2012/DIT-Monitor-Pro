
import React from 'react';
import { Alert } from '../types';

interface AlertToastProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

const AlertToast: React.FC<AlertToastProps> = ({ alert, onDismiss }) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-rose-500/50 rounded-xl p-4 shadow-2xl shadow-rose-500/10 flex items-start gap-4 animate-in slide-in-from-right-full duration-300">
      <div className="w-10 h-10 rounded-lg bg-rose-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-6 h-6 text-rose-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-4">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Critical Alert</h4>
          <span className="text-[10px] text-slate-500 font-mono">{new Date(alert.timestamp).toLocaleTimeString()}</span>
        </div>
        <p className="text-slate-300 text-sm mt-1">
          <span className="font-bold text-rose-400">{alert.deviceName}</span> {alert.metricType} usage has exceeded 90% for over 60 seconds.
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs font-mono text-rose-400 bg-rose-400/10 px-2 py-0.5 rounded">Current: {alert.value.toFixed(1)}%</span>
          <button 
            onClick={() => onDismiss(alert.id)}
            className="text-xs text-slate-400 hover:text-white font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertToast;
