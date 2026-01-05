
import { Device, DeviceStatus, DeviceType, MetricPoint } from '../types';

const DEVICE_NAMES = [
  'US-WEST-SRV-01', 'EU-CENTRAL-DB-02', 'AS-SOUTH-IOT-09', 'US-EAST-RTR-04',
  'CLOUD-API-GW', 'CACHE-REDIS-01', 'NODE-WORKER-05', 'LEGACY-MAINFRAME',
  'PROD-ELK-STACK', 'MESSAGING-RABBIT', 'STORAGE-SAN-01', 'FIREWALL-PFE'
];

const LOCATIONS = ['San Francisco', 'Frankfurt', 'Mumbai', 'New York', 'Tokyo', 'London'];

const generateMetricPoint = (prev?: MetricPoint): MetricPoint => {
  const drift = () => (Math.random() - 0.5) * 10;
  return {
    timestamp: Date.now(),
    cpu: Math.min(100, Math.max(0, (prev?.cpu ?? Math.random() * 40 + 20) + drift())),
    ram: Math.min(100, Math.max(0, (prev?.ram ?? Math.random() * 50 + 30) + drift())),
    disk: Math.min(100, Math.max(0, (prev?.disk ?? Math.random() * 10 + 60) + drift())),
    network: Math.min(100, Math.max(0, (prev?.network ?? Math.random() * 20 + 10) + drift())),
  };
};

export const createInitialDevices = (count: number = 12): Device[] => {
  return Array.from({ length: count }).map((_, i) => {
    const type: DeviceType = ['SERVER', 'ROUTER', 'DATABASE', 'IOT'][Math.floor(Math.random() * 4)] as DeviceType;
    const initialMetrics: MetricPoint[] = [];
    let lastMetric: MetricPoint | undefined;
    
    for (let j = 0; j < 20; j++) {
      lastMetric = generateMetricPoint(lastMetric);
      initialMetrics.push(lastMetric);
    }

    return {
      id: `dev-${i}`,
      name: DEVICE_NAMES[i % DEVICE_NAMES.length],
      type,
      status: Math.random() > 0.8 ? DeviceStatus.WARNING : DeviceStatus.ONLINE,
      location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
      ip: `192.168.${Math.floor(Math.random() * 254)}.${Math.floor(Math.random() * 254)}`,
      metrics: initialMetrics,
      lastUpdate: Date.now(),
    };
  });
};

export const updateDevices = (devices: Device[]): Device[] => {
  return devices.map(d => {
    // Random status changes occasionally
    let newStatus = d.status;
    const roll = Math.random();
    if (roll > 0.98) newStatus = DeviceStatus.WARNING;
    else if (roll > 0.995) newStatus = DeviceStatus.ERROR;
    else if (roll > 0.999) newStatus = DeviceStatus.OFFLINE;
    else if (roll < 0.1 && newStatus !== DeviceStatus.ONLINE) newStatus = DeviceStatus.ONLINE;

    const newMetric = generateMetricPoint(d.metrics[d.metrics.length - 1]);
    const updatedMetrics = [...d.metrics.slice(1), newMetric];

    return {
      ...d,
      status: newStatus,
      metrics: updatedMetrics,
      lastUpdate: Date.now(),
    };
  });
};
