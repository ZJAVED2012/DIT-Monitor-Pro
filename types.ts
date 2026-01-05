
export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export type DeviceType = 'SERVER' | 'ROUTER' | 'DATABASE' | 'IOT';

export interface MetricPoint {
  timestamp: number;
  cpu: number;
  ram: number;
  disk: number;
  network: number;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location: string;
  ip: string;
  metrics: MetricPoint[];
  lastUpdate: number;
}

export interface SystemStats {
  totalDevices: number;
  onlineCount: number;
  warningCount: number;
  errorCount: number;
  avgCpuUsage: number;
  avgRamUsage: number;
}

export interface Alert {
  id: string;
  deviceId: string;
  deviceName: string;
  metricType: 'CPU' | 'RAM';
  value: number;
  timestamp: number;
}
