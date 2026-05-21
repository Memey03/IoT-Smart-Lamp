import React, { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import { Activity, Power, PowerOff, Droplets, Thermometer, RadioReceiver } from 'lucide-react';

const BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';

export default function App() {
  const [connected, setConnected] = useState(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [relays, setRelays] = useState<boolean[]>([false, false, false, false]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const clientRef = useRef<mqtt.MqttClient | null>(null);

  useEffect(() => {
    // Connect to the public MQTT broker
    const client = mqtt.connect(BROKER_URL, {
      clientId: `iot_dashboard_${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      connectTimeout: 5000,
    });
    clientRef.current = client;

    client.on('connect', () => {
      setConnected(true);
      client.subscribe([
        'home/sensor/suhu',
        'home/sensor/kelembapan',
        'home/relay/1/status',
        'home/relay/2/status',
        'home/relay/3/status',
        'home/relay/4/status'
      ]);
    });

    client.on('message', (topic, message) => {
      const payload = message.toString();
      setLastUpdate(new Date());

      if (topic === 'home/sensor/suhu') {
        const val = parseFloat(payload);
        if (!isNaN(val)) setTemperature(val);
      } else if (topic === 'home/sensor/kelembapan') {
        const val = parseFloat(payload);
        if (!isNaN(val)) setHumidity(val);
      } else if (topic.startsWith('home/relay/') && topic.endsWith('/status')) {
        const parts = topic.split('/');
        const relayId = parseInt(parts[2], 10);
        if (relayId >= 1 && relayId <= 4) {
          setRelays((prev) => {
            const next = [...prev];
            next[relayId - 1] = payload.toUpperCase() === 'ON';
            return next;
          });
        }
      }
    });

    client.on('close', () => setConnected(false));
    client.on('error', () => setConnected(false));
    client.on('offline', () => setConnected(false));

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, []);

  const publishControl = (topic: string, message: string) => {
    if (clientRef.current && connected) {
      clientRef.current.publish(topic, message);
    }
  };

  const setAllRelays = (state: boolean) => {
    const payload = state ? 'ON' : 'OFF';
    for (let i = 1; i <= 4; i++) {
      publishControl(`home/relay/${i}/set`, payload);
    }
  };

  const toggleRelay = (index: number) => {
    const currentState = relays[index];
    const payload = currentState ? 'OFF' : 'ON';
    publishControl(`home/relay/${index + 1}/set`, payload);
  };

  const controlVariasi = (cmd: string) => {
    publishControl('home/variasi/set', cmd);
  };

  return (
    <div className="min-h-screen bg-brand-dark-bg text-white font-sans p-4 md:p-8 flex flex-col justify-between max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#222] pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-brand-pink rounded-lg flex items-center justify-center">
             <Activity className="h-6 w-6 text-black" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              SMART<span className="text-brand-pink">IOT</span> DASHBOARD
            </h1>
            <p className="text-xs text-gray-500 uppercase tracking-widest">HiveMQ MQTT Broker v3.1</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-[#111] px-4 py-2 rounded-full border border-[#222]">
          <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-brand-green animate-pulse' : 'bg-red-500'}`}></div>
          <span className={`text-sm font-medium tracking-wide ${connected ? 'text-brand-green' : 'text-red-500'}`}>
            {connected ? 'MQTT CONNECTED' : 'DISCONNECTED'}
          </span>
          <span className="text-gray-600 mx-2 flex-shrink-0">|</span>
          <span className="text-xs text-gray-400 hidden sm:inline">broker.hivemq.com:8884</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* Sensors Section */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          {/* Temperature Card */}
          <div className="bg-brand-card border border-[#222] rounded-xl p-6 flex-1 flex flex-col justify-between glow-pink">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Temperature</h3>
              <span className="text-brand-pink bg-brand-pink/10 px-2 py-1 rounded text-xs">CELSIUS</span>
            </div>
            <div className="mt-4">
              <div className="text-6xl font-light">
                {temperature !== null ? temperature.toFixed(1) : '--'}
                <span className="text-3xl text-gray-400">°C</span>
              </div>
              <div className="w-full bg-[#222] h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-brand-pink h-full transition-all duration-500" 
                  style={{ width: `${Math.min(Math.max(((temperature || 0) + 10) / 60 * 100, 0), 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Thermometer className="w-4 h-4 text-brand-pink" />
              <span>Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Waiting...'}</span>
            </div>
          </div>

          {/* Humidity Card */}
          <div className="bg-brand-card border border-[#222] rounded-xl p-6 flex-1 flex flex-col justify-between glow-green">
            <div className="flex justify-between items-start">
              <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider">Humidity</h3>
              <span className="text-brand-green bg-brand-green/10 px-2 py-1 rounded text-xs">PERCENTAGE</span>
            </div>
            <div className="mt-4">
              <div className="text-6xl font-light">
                {humidity !== null ? humidity.toFixed(1) : '--'}
                <span className="text-3xl text-gray-400">%</span>
              </div>
              <div className="w-full bg-[#222] h-1.5 rounded-full mt-4 overflow-hidden">
                <div 
                  className="bg-brand-green h-full transition-all duration-500" 
                  style={{ width: `${Math.min(Math.max(humidity || 0, 0), 100)}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
              <Droplets className="w-4 h-4 text-brand-green" />
              <span>Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Waiting...'}</span>
            </div>
          </div>
        </section>

        {/* Global Command & Relays */}
        <section className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Global Command Center */}
          <div className="bg-gradient-to-br from-[#121212] to-[#0a0a0a] border border-[#222] rounded-xl p-6">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] mb-6">Global Command Center</h3>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => setAllRelays(true)}
                className="flex-1 min-w-[120px] bg-brand-green text-black font-bold py-4 rounded-lg hover:brightness-110 active:scale-95 transition-all text-sm uppercase cursor-pointer"
              >
                ALL ON
              </button>
              <button 
                onClick={() => setAllRelays(false)}
                className="flex-1 min-w-[120px] bg-[#222] text-white font-bold py-4 rounded-lg hover:bg-[#333] active:scale-95 transition-all text-sm uppercase border border-[#333] cursor-pointer"
              >
                ALL OFF
              </button>
              <button 
                onClick={() => controlVariasi('variasi1')}
                className="flex-1 min-w-[120px] bg-[#1a1a1a] border border-brand-pink text-brand-pink font-bold py-4 rounded-lg hover:bg-brand-pink/10 transition-all text-sm uppercase cursor-pointer"
              >
                VARIASI 1
              </button>
              <button 
                onClick={() => controlVariasi('variasi2')}
                className="flex-1 min-w-[120px] bg-[#1a1a1a] border border-brand-pink text-brand-pink font-bold py-4 rounded-lg hover:bg-brand-pink/10 transition-all text-sm uppercase cursor-pointer"
              >
                VARIASI 2
              </button>
              <button 
                onClick={() => controlVariasi('stop')}
                className="flex-1 min-w-[120px] bg-red-600 text-white font-bold py-4 rounded-lg hover:bg-red-700 active:scale-95 transition-all text-sm uppercase cursor-pointer"
              >
                STOP
              </button>
            </div>
          </div>

          {/* Relays Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            {[1, 2, 3, 4].map((id, idx) => {
              const isActive = relays[idx];
              return (
                <div key={id} className="bg-brand-card border border-[#222] rounded-xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-brand-green glow-green' : 'bg-gray-600'}`}></div>
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Lampu {id}</p>
                      <p className={`text-sm font-medium uppercase ${isActive ? 'text-brand-green' : 'text-gray-500'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleRelay(idx)}
                    className="relative inline-flex items-center cursor-pointer focus:outline-none"
                    aria-pressed={isActive}
                  >
                    <div className={`w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-brand-green' : 'bg-[#333]'}`}></div>
                    <div className={`absolute left-[2px] top-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              );
            })}
          </div>

        </section>
      </main>

      <footer className="mt-8 pt-4 border-t border-[#222] flex flex-col sm:flex-row justify-between items-center text-[10px] text-gray-500 uppercase tracking-widest gap-2">
        <div>System State: <span className="text-gray-300">Operational</span></div>
        <div>Session ID: <span className="text-gray-300">IOT-NODE-{Math.floor(Math.random() * 90000) + 10000}</span></div>
        <div>Last Data Pulse: <span className="text-brand-pink">{lastUpdate ? lastUpdate.toISOString().replace('T', ' ').slice(0, 23) : 'WAITING...'}</span></div>
      </footer>
    </div>
  );
}
