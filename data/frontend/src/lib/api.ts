export type TrendDirection = 'up' | 'down';

export type MetricDataPoint = {
  time: string;
  value: number;
};

export type MetricOverview = {
  value: number | null;
  unit: string;
  dataKey: 'value';
  history: MetricDataPoint[];
  trendValue: string;
  trendDirection: TrendDirection;
  statusText: string;
};

export type DeviceOverview = {
  device_code: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  type: 'sensor' | 'actuator';
  signal: 'strong' | 'weak';
  state?: boolean;
};

export type LogOverview = {
  id: number;
  time: string;
  timeLabel: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error' | 'routine';
};

export type DashboardOverview = {
  environment: {
    temperature: MetricOverview;
    humidity: MetricOverview;
    light: MetricOverview;
  };
  logs: LogOverview[];
  sensors: DeviceOverview[];
  actuators: DeviceOverview[];
  summary: {
    sensorsOnline: number;
    sensorsIssue: number;
    actuatorsOnline: number;
    actuatorsIssue: number;
  };
  alerts: Array<{
    id: number;
    message: string;
    severity: string;
  }>;
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    cache: 'no-store', // Prevent browser from caching polling requests
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  const payload = await response.json();
  return payload.data as T;
}

export function fetchDashboardOverview() {
  return request<DashboardOverview>('/api/gateway/overview');
}

export function sendDeviceCommand(params: {
  deviceCode: string;
  commandType: string;
  commandValue: string;
}) {
  return request('/api/commands', {
    method: 'POST',
    body: JSON.stringify({
      device_code: params.deviceCode,
      command_type: params.commandType,
      command_value: params.commandValue,
      issued_by: 'frontend-dashboard',
    }),
  });
}
