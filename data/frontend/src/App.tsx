import React, { useEffect, useState } from 'react';
import {
  Thermometer,
  Droplets,
  Sun,
  Camera,
  Lock,
  Unlock,
  Fan,
  Lightbulb,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Info,
  Clock,
  Settings,
  Bell,
  Home,
  ShieldCheck,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  LayoutDashboard,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
  XAxis,
  Tooltip,
} from 'recharts';
import {
  DashboardOverview,
  DeviceOverview,
  LogOverview,
  MetricOverview,
  fetchDashboardOverview,
  sendDeviceCommand,
} from './lib/api';

const fallbackOverview: DashboardOverview = {
  environment: {
    temperature: {
      value: 26.8,
      unit: 'deg C',
      dataKey: 'value',
      history: [
        { time: '12:00 AM', value: 22.5 },
        { time: '04:00 AM', value: 21.0 },
        { time: '08:00 AM', value: 23.5 },
        { time: '12:00 PM', value: 25.0 },
        { time: '04:00 PM', value: 27.5 },
        { time: '08:00 PM', value: 25.5 },
        { time: '11:00 PM', value: 26.8 },
      ],
      trendValue: '+1.3 deg',
      trendDirection: 'up',
      statusText: 'Warm',
    },
    humidity: {
      value: 42,
      unit: '%',
      dataKey: 'value',
      history: [
        { time: '12:00 AM', value: 45 },
        { time: '04:00 AM', value: 46 },
        { time: '08:00 AM', value: 44 },
        { time: '12:00 PM', value: 42 },
        { time: '04:00 PM', value: 40 },
        { time: '08:00 PM', value: 43 },
        { time: '11:00 PM', value: 42 },
      ],
      trendValue: '-1.0%',
      trendDirection: 'down',
      statusText: 'Normal',
    },
    light: {
      value: 650,
      unit: 'Lux',
      dataKey: 'value',
      history: [
        { time: '12:00 AM', value: 0 },
        { time: '04:00 AM', value: 0 },
        { time: '08:00 AM', value: 250 },
        { time: '12:00 PM', value: 800 },
        { time: '04:00 PM', value: 650 },
        { time: '08:00 PM', value: 150 },
        { time: '11:00 PM', value: 650 },
      ],
      trendValue: '+500',
      trendDirection: 'up',
      statusText: 'Bright',
    },
  },
  logs: [
    { id: 1, time: '', timeLabel: '10:45 AM', message: 'Face recognized: unlocking door', type: 'success' },
    { id: 2, time: '', timeLabel: '10:42 AM', message: 'Human recognized at front door', type: 'info' },
    { id: 3, time: '', timeLabel: '10:30 AM', message: 'Living room lights turned on manually', type: 'routine' },
    { id: 4, time: '', timeLabel: '09:15 AM', message: 'High temperature threshold reached: fan automation suggested', type: 'warning' },
    { id: 5, time: '', timeLabel: '08:00 AM', message: 'Humidity sensor disconnected', type: 'error' },
  ],
  sensors: [
    { device_code: 'TEMP_SENSOR', name: 'Temperature Sensor', status: 'online', type: 'sensor', signal: 'strong' },
    { device_code: 'HUM_SENSOR', name: 'Humidity Sensor', status: 'error', type: 'sensor', signal: 'weak' },
    { device_code: 'LIGHT_SENSOR', name: 'Light Sensor', status: 'online', type: 'sensor', signal: 'weak' },
    { device_code: 'CAMERA_FRONT', name: 'Front Door Camera', status: 'online', type: 'sensor', signal: 'strong' },
  ],
  actuators: [
    { device_code: 'DOOR_LOCK', name: 'Smart Door Lock', status: 'online', type: 'actuator', signal: 'strong', state: false },
    { device_code: 'LIVING_LIGHTS', name: 'Living Room Lights', status: 'online', type: 'actuator', signal: 'strong', state: true },
    { device_code: 'HVAC_FAN', name: 'HVAC Mini Fan', status: 'error', type: 'actuator', signal: 'weak', state: false },
  ],
  summary: {
    sensorsOnline: 3,
    sensorsIssue: 1,
    actuatorsOnline: 2,
    actuatorsIssue: 1,
  },
  alerts: [],
};

type MetricColor = 'orange' | 'blue' | 'amber';

function getDeviceIcon(device: DeviceOverview) {
  switch (device.device_code) {
    case 'TEMP_SENSOR':
      return Thermometer;
    case 'HUM_SENSOR':
      return Droplets;
    case 'LIGHT_SENSOR':
      return Sun;
    case 'CAMERA_FRONT':
      return Camera;
    case 'DOOR_LOCK':
      return device.state ? Unlock : Lock;
    case 'LIVING_LIGHTS':
      return Lightbulb;
    case 'HVAC_FAN':
      return Fan;
    default:
      return Activity;
  }
}

const MetricCard = ({
  title,
  icon: Icon,
  metric,
  color,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  metric: MetricOverview;
  color: MetricColor;
}) => {
  const isUp = metric.trendDirection === 'up';
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const theme = {
    orange: { text: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', stroke: '#f97316' },
    blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30', stroke: '#3b82f6' },
    amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30', stroke: '#f59e0b' },
  }[color];

  return (
    <div className="bg-[#161b22] border border-zinc-800/60 rounded-[1.5rem] p-5 flex flex-col relative overflow-hidden h-[220px]">
      <div className="relative z-10 pointer-events-none flex flex-col h-full">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl shrink-0 ${theme.bg} ${theme.text}`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <h3 className="text-slate-400 text-xs font-semibold tracking-wider uppercase leading-tight">{title}</h3>
          </div>
          <span className={`px-2.5 py-1 rounded-full border ${theme.border} ${theme.text} text-[11px] font-medium bg-[#161b22] shrink-0`}>
            {metric.statusText}
          </span>
        </div>

        <div className="flex items-baseline gap-1 mb-2 mt-1">
          <span className="text-4xl font-semibold text-white tracking-tight">
            {metric.value ?? '--'}
          </span>
          <span className="text-slate-400 text-lg font-medium ml-1">{metric.unit}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium">
          <TrendIcon size={16} className={theme.text} strokeWidth={2.5} />
          <span className="text-slate-400">{metric.trendValue} from last hour</span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[100px] z-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={metric.history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`color-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.4} />
                <stop offset="95%" stopColor={theme.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#f4f4f5', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              itemStyle={{ color: '#f4f4f5', fontWeight: 600 }}
              labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '12px' }}
              formatter={(val: number) => [`${val}${metric.unit === '%' ? '%' : metric.unit === 'Lux' ? ' Lux' : ` ${metric.unit}`}`, title]}
              labelFormatter={(label: string) => `Time: ${label}`}
            />
            <XAxis dataKey="time" hide />
            <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
            <Area
              type="monotone"
              dataKey={metric.dataKey}
              stroke={theme.stroke}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#color-${title})`}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (nextValue: boolean) => void;
  disabled?: boolean;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => !disabled && onChange(!checked)}
    className={`
      relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
      transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75
      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      ${checked ? 'bg-emerald-500' : 'bg-zinc-700'}
    `}
  >
    <span
      aria-hidden="true"
      className={`
        pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0
        transition duration-200 ease-in-out
        ${checked ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

const DeviceRow = ({
  device,
  onToggle,
  busy = false,
}: {
  device: DeviceOverview;
  onToggle?: (nextValue: boolean) => void;
  busy?: boolean;
}) => {
  const Icon = getDeviceIcon(device);
  const isOnline = device.status === 'online';
  const isError = device.status === 'error';

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-800/50 text-zinc-600'}`}>
          <Icon size={20} />
        </div>
        <div>
          <h4 className={`font-medium ${isOnline ? 'text-zinc-200' : 'text-zinc-500'}`}>{device.name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online
              </span>
            ) : isError ? (
              <span className="flex items-center gap-1 text-xs font-medium text-rose-400">
                <AlertTriangle size={12} />
                Error
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-medium text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-600"></span>
                Offline
              </span>
            )}
            <span className="text-zinc-700 text-xs">|</span>
            <span className={`flex items-center gap-1 text-xs font-medium ${isOnline ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? (device.signal === 'strong' ? '98%' : '75%') : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center">
        {device.type === 'sensor' ? (
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider px-2 py-1 bg-zinc-800 rounded-md">
            Monitoring
          </span>
        ) : (
          <ToggleSwitch checked={Boolean(device.state)} onChange={(nextValue) => onToggle?.(nextValue)} disabled={!isOnline || busy} />
        )}
      </div>
    </div>
  );
};

const LogEntry = ({ log }: { log: LogOverview }) => {
  const getIconAndColor = (type: LogOverview['type']) => {
    switch (type) {
      case 'success':
        return { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20' };
      case 'info':
        return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' };
      case 'error':
        return { icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10', border: 'border-rose-400/20' };
      default:
        return { icon: Activity, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' };
    }
  };

  const { icon: Icon, color, bg, border } = getIconAndColor(log.type);

  return (
    <div className={`flex gap-4 p-3 rounded-xl border ${border} ${bg} transition-colors`}>
      <div className={`mt-0.5 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${log.type === 'routine' ? 'text-zinc-300' : 'text-zinc-100'}`}>
          {log.message}
        </p>
        <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-500 font-mono">
          <Clock size={10} />
          {log.timeLabel}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [overview, setOverview] = useState<DashboardOverview>(fallbackOverview);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [busyDeviceCode, setBusyDeviceCode] = useState<string | null>(null);

  const loadOverview = async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const data = await fetchDashboardOverview();
      setOverview(data);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadOverview();

    // Poll the backend for new data every 3 seconds
    const intervalId = setInterval(() => {
      void loadOverview({ silent: true });
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const handleToggleDevice = async (device: DeviceOverview, nextState: boolean) => {
    try {
      setBusyDeviceCode(device.device_code);

      const isDoor = device.device_code === 'DOOR_LOCK';
      await sendDeviceCommand({
        deviceCode: device.device_code,
        commandType: isDoor ? 'LOCK' : 'POWER',
        commandValue: isDoor ? (nextState ? 'UNLOCK' : 'LOCK') : nextState ? 'ON' : 'OFF',
      });

      await loadOverview({ silent: true });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update device');
    } finally {
      setBusyDeviceCode(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A] text-zinc-100 font-sans selection:bg-emerald-500/30">
      <header className="sticky top-0 z-50 h-16 border-b border-zinc-800/50 flex items-center justify-between px-6 bg-[#0A0A0A]/80 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3 w-1/3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 shrink-0">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-semibold tracking-tight">Aegis Home</h1>
            <p className="text-[11px] text-zinc-500">
              {isLoading ? 'Connecting to backend...' : isRefreshing ? 'Refreshing live data...' : 'Live mock backend connected'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3 ml-auto">
          <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors relative">
            <Bell size={20} />
            {overview.summary.sensorsIssue + overview.summary.actuatorsIssue > 0 && (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 border-2 border-[#0A0A0A]"></span>
            )}
          </button>
          <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-full transition-colors hidden sm:block">
            <Settings size={20} />
          </button>
          <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden ml-1 shrink-0">
            <img src="https://picsum.photos/seed/avatar/100/100" alt="User" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Home size={18} className="text-zinc-400" />
                <h2 className="text-lg font-medium text-zinc-200">Environment</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard title="Temperature" metric={overview.environment.temperature} icon={Thermometer} color="orange" />
                <MetricCard title="Humidity" metric={overview.environment.humidity} icon={Droplets} color="blue" />
                <MetricCard title="Light Intensity" metric={overview.environment.light} icon={Sun} color="amber" />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-zinc-200">Security Log</h2>
                <button
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  onClick={() => void loadOverview({ silent: true })}
                >
                  Refresh
                </button>
              </div>
              <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col h-[400px]">
                <div className="p-3 bg-zinc-800/30 border-b border-zinc-800/50 flex items-center justify-between text-xs font-medium text-zinc-400">
                  <span>Live System Logs</span>
                  <span className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                    </span>
                    Recording
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {overview.logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <LogEntry log={log} />
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 20px; }
        @keyframes handtrack-flash {
          0%   { opacity: 0.7; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
