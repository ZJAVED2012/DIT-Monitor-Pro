
import React from 'react';
import { DeviceStatus } from '../types';

interface StatusBadgeProps {
  status: DeviceStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    [DeviceStatus.ONLINE]: { color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50', label: 'Online' },
    [DeviceStatus.WARNING]: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', label: 'Warning' },
    [DeviceStatus.ERROR]: { color: 'bg-rose-500/20 text-rose-400 border-rose-500/50', label: 'Error' },
    [DeviceStatus.OFFLINE]: { color: 'bg-slate-500/20 text-slate-400 border-slate-500/50', label: 'Offline' },
  };

  const { color, label } = config[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${color} flex items-center gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === DeviceStatus.ONLINE ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`} />
      {label}
    </span>
  );
};

export default StatusBadge;
