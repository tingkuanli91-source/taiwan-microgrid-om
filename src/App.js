import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import 'leaflet/dist/leaflet.css';
import './App.css';

// 修復 Leaflet 圖標問題
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// JSON 驅動的選單配置
const MENU_CONFIG = {
  desktop: [
    { id: 'overview', icon: '🏠', label: '總覽中心', description: '全台裝機總容量' },
    { id: 'sites', icon: '📍', label: '場域管理', description: '站點設備管理' },
    { id: 'live', icon: '⚡', label: '即時監控', description: '充放電曲線/SOC' },
    { id: 'alerts', icon: '🔔', label: '故障告警', description: '歷史告警/維修' },
    { id: 'automation', icon: '🤖', label: '自動化流程', description: '部署狀態' },
  ],
  mobile: [
    { id: 'overview', icon: '🗺️', label: 'Map' },
    { id: 'live', icon: '📊', label: 'Real-time' },
    { id: 'alerts', icon: '🔔', label: 'Alerts' },
    { id: 'profile', icon: '👤', label: 'Profile' },
  ]
};

// 微電網站點數據
const SITES_DATA = [
  { project_id: "TW-KEE-001", name: "基隆辦公室", location: { lat: 25.128, lng: 121.741 }, type: "BESS + Solar", capacity: "50kWh/10kWp", status: "active" },
  { project_id: "TW-TPE-001", name: "台北總部", location: { lat: 25.042, lng: 121.614 }, type: "Solar + ESS", capacity: "100kWh/25kWp", status: "active" },
  { project_id: "TW-TCH-001", name: "台中工業區", location: { lat: 24.142, lng: 120.684 }, type: "BESS + Solar + Generator", capacity: "200kWh/50kWp", status: "active" },
  { project_id: "TW-KHH-001", name: "高雄港", location: { lat: 22.627, lng: 120.301 }, type: "Solar + Wind + ESS", capacity: "150kWh/40kWp", status: "maintenance" },
  { project_id: "TW-HUA-001", name: "花蓮太陽能", location: { lat: 23.987, lng: 121.601 }, type: "Solar Farm", capacity: "300kWp", status: "active" }
];

// 模擬數據
const generateLiveData = () => {
  const data = [];
  for (let i = 23; i >= 0; i--) {
    const time = new Date(Date.now() - i * 3600000);
    data.push({
      time: `${time.getHours()}:00`,
      power: Math.random() * 100 + 20,
      soc: Math.random() * 30 + 40,
      grid: Math.random() * 50 + 10
    });
  }
  return data;
};

const ALERT_DATA = [
  { id: 1, time: '10:30', level: 'critical', message: '高雄港 - 通訊異常', site: 'TW-KHH-001' },
  { id: 2, time: '09:15', level: 'warning', message: '台北總部 - SOC 低於 50%', site: 'TW-TPE-001' },
  { id: 3, time: '08:45', level: 'info', message: '花蓮太陽能 - 發電效率 95%', site: 'TW-HUA-001' },
  { id: 4, time: '昨天', level: 'warning', message: '台中工業區 - 溫度過高', site: 'TW-TCH-001' },
];

// 自定義發光標記
const createGlowIcon = (status) => {
  const color = status === 'active' ? '#00FF88' : status === 'maintenance' ? '#FFAA00' : '#FF4444';
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:16px;height:16px;background:${color};border-radius:50%;box-shadow:0 0 8px ${color},0 0 16px ${color};animation:pulse 2s infinite;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

// 側邊欄組件
const Sidebar = ({ activeMenu, setActiveMenu, isCollapsed, setIsCollapsed, isMobile }) => {
  const menuItems = isMobile ? MENU_CONFIG.mobile : MENU_CONFIG.desktop;
  
  if (isMobile) {
    return (
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mobile-nav"
      >
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`mobile-nav-item ${activeMenu === item.id ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
    >
      <div className="sidebar-header">
        <h1>{!isCollapsed && '台灣微網'}</h1>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="collapse-btn">
          {isCollapsed ? '→' : '←'}
        </button>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="nav-text"
              >
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </motion.div>
            )}
          </button>
        ))}
      </nav>
    </motion.div>
  );
};

// 總覽頁面
const OverviewPage = ({ onSiteSelect }) => (
  <div className="page overview-page">
    <div className="page-header">
      <h2>總覽中心</h2>
      <span className="subtitle">全台微電網站點監控</span>
    </div>
    
    <div className="stats-grid">
      <div className="stat-card">
        <span className="stat-icon">📍</span>
        <div className="stat-info">
          <span className="stat-value">{SITES_DATA.length}</span>
          <span className="stat-label">總站點</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">⚡</span>
        <div className="stat-info">
          <span className="stat-value">800 kW</span>
          <span className="stat-label">總裝機容量</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">🔋</span>
        <div className="stat-info">
          <span className="stat-value">500 kWh</span>
          <span className="stat-label">總儲能容量</span>
        </div>
      </div>
      <div className="stat-card">
        <span className="stat-icon">✅</span>
        <div className="stat-info">
          <span className="stat-value">{SITES_DATA.filter(s => s.status === 'active').length}</span>
          <span className="stat-label">運作中</span>
        </div>
      </div>
    </div>

    <div className="map-section">
      <h3>站點分布圖</h3>
      <div className="map-container">
        <MapContainer center={[23.5, 121]} zoom={7} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
          {SITES_DATA.map((site) => (
            <Marker
              key={site.project_id}
              position={[site.location.lat, site.location.lng]}
              icon={createGlowIcon(site.status)}
              eventHandlers={{ click: () => onSiteSelect(site) }}
            >
              <Popup>
                <div className="popup">
                  <strong>{site.name}</strong>
                  <br/>{site.type}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  </div>
);

// 即時監控頁面
const LiveDataPage = ({ selectedSite }) => {
  const [data] = useState(generateLiveData);
  
  return (
    <div className="page live-page">
      <div className="page-header">
        <h2>即時監控</h2>
        <span className="subtitle">即時充放電曲線 / SOC 狀態</span>
      </div>

      <div className="live-stats">
        <div className="live-stat">
          <div className="soc-ring">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#1a2744" strokeWidth="8" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#00D9FF" strokeWidth="8" 
                strokeDasharray="283" strokeDashoffset="100" strokeLinecap="round" 
                transform="rotate(-90 50 50)" />
            </svg>
            <div className="soc-value">
              <span className="value">65%</span>
              <span className="label">SOC</span>
            </div>
          </div>
        </div>
        <div className="live-stat">
          <span className="live-label">即時功率</span>
          <span className="live-value">156.8 kW</span>
        </div>
        <div className="live-stat">
          <span className="live-label">台電取電</span>
          <span className="live-value">45.2 kW</span>
        </div>
      </div>

      <div className="chart-section">
        <h3>功率趨勢 (24h)</h3>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00FF88" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00FF88" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#666" fontSize={11} />
            <YAxis stroke="#666" fontSize={11} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #00FF88', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="power" stroke="#00FF88" fill="url(#powerGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-section">
        <h3>SOC 電量狀態</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="time" stroke="#666" fontSize={11} />
            <YAxis stroke="#666" fontSize={11} domain={[0, 100]} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #00D9FF', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="soc" stroke="#00D9FF" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// 故障告警頁面
const AlertsPage = () => (
  <div className="page alerts-page">
    <div className="page-header">
      <h2>故障告警</h2>
      <span className="subtitle">歷史告警查詢 / 維修任務分派</span>
    </div>

    <div className="alerts-list">
      {ALERT_DATA.map((alert) => (
        <motion.div 
          key={alert.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className={`alert-item ${alert.level}`}
        >
          <div className="alert-icon">
            {alert.level === 'critical' ? '🔴' : alert.level === 'warning' ? '🟡' : '🔵'}
          </div>
          <div className="alert-content">
            <span className="alert-time">{alert.time}</span>
            <span className="alert-message">{alert.message}</span>
            <span className="alert-site">{alert.site}</span>
          </div>
          <button className="alert-action">處理</button>
        </motion.div>
      ))}
    </div>
  </div>
);

// 自動化流程頁面
const AutomationPage = () => {
  const deployments = [
    { name: 'Factory Power v3', status: 'ready', url: 'factory-power-v3.vercel.app', time: '2小時前' },
    { name: 'Microgrid Dashboard', status: 'ready', url: 'microgrid-dashboard.vercel.app', time: '3小時前' },
    { name: 'Factory Power Flow', status: 'ready', url: 'factory-pwr.vercel.app', time: '昨天' },
    { name: 'Type Keyboard', status: 'ready', url: 'type-keyboard.vercel.app', time: '2天前' },
  ];

  return (
    <div className="page automation-page">
      <div className="page-header">
        <h2>自動化流程</h2>
        <span className="subtitle">GitHub / Vercel 部署狀態</span>
      </div>

      <div className="deploy-list">
        {deployments.map((dep, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="deploy-card"
          >
            <div className="deploy-info">
              <span className="deploy-name">{dep.name}</span>
              <span className="deploy-url">{dep.url}</span>
              <span className="deploy-time">{dep.time}</span>
            </div>
            <span className={`deploy-status ${dep.status}`}>
              {dep.status === 'ready' ? '✅ 正常' : '⏳ 部署中'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 場域管理頁面
const SitesPage = ({ onSiteSelect }) => (
  <div className="page sites-page">
    <div className="page-header">
      <h2>場域管理</h2>
      <span className="subtitle">站點設備管理</span>
    </div>

    <div className="sites-grid">
      {SITES_DATA.map((site) => (
        <motion.div 
          key={site.project_id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="site-card"
          onClick={() => onSiteSelect(site)}
        >
          <div className="site-header">
            <span className="site-name">{site.name}</span>
            <span className={`site-status ${site.status}`}>
              {site.status === 'active' ? '● 運作中' : '⚠ 維護中'}
            </span>
          </div>
          <div className="site-info">
            <div className="info-row">
              <span className="label">編號</span>
              <span className="value">{site.project_id}</span>
            </div>
            <div className="info-row">
              <span className="label">類型</span>
              <span className="value">{site.type}</span>
            </div>
            <div className="info-row">
              <span className="label">容量</span>
              <span className="value">{site.capacity}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// 主應用
function App() {
  const [activeMenu, setActiveMenu] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedSite, setSelectedSite] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const renderPage = () => {
    switch (activeMenu) {
      case 'overview':
        return <OverviewPage onSiteSelect={setSelectedSite} />;
      case 'sites':
        return <SitesPage onSiteSelect={setSelectedSite} />;
      case 'live':
        return <LiveDataPage selectedSite={selectedSite} />;
      case 'alerts':
        return <AlertsPage />;
      case 'automation':
        return <AutomationPage />;
      case 'profile':
        return (
          <div className="page profile-page">
            <h2>設定</h2>
            <p style={{color:'#667'}}>基本系統設定與權限管理</p>
          </div>
        );
      default:
        return <OverviewPage onSiteSelect={setSelectedSite} />;
    }
  };

  return (
    <div className="app">
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobile={isMobile}
      />
      
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMenu}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        .leaflet-popup-content-wrapper { background: #1a1a2e; color: #fff; border-radius: 8px; }
        .leaflet-popup-tip { background: #1a1a2e; }
      `}</style>
    </div>
  );
}

export default App;
