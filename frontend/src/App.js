import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const API = 'http://localhost:8000';

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg0: '#060a12', bg1: '#0c1220', bg2: '#111827', bg3: '#1a2235',
  border: 'rgba(99,130,255,0.12)', borderHover: 'rgba(99,130,255,0.3)',
  blue: '#6382ff', blueGlow: 'rgba(99,130,255,0.15)',
  teal: '#2dd4bf', tealGlow: 'rgba(45,212,191,0.15)',
  amber: '#f59e0b', amberGlow: 'rgba(245,158,11,0.15)',
  red: '#ef4444', redGlow: 'rgba(239,68,68,0.15)',
  green: '#22c55e', greenGlow: 'rgba(34,197,94,0.15)',
  orange: '#f97316',
  textPrimary: '#f0f4ff', textSecondary: '#8b9bb4', textMuted: '#4a5568',
};

const REGIONS = ['Middle East / Hormuz','Red Sea / Suez','East Asia','South Asia','Europe','North America','Ukraine / Black Sea','Taiwan Strait'];
const SECTORS = ['Energy / LPG','Semiconductors','Automotive','Pharmaceuticals','FMCG','Shipping / Logistics'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const riskColor = (s) => s === 'CRITICAL' ? C.red : s === 'HIGH' ? C.orange : s === 'MODERATE' ? C.amber : C.green;
const riskGlow  = (s) => s === 'CRITICAL' ? C.redGlow : s === 'HIGH' ? C.amberGlow : s === 'MODERATE' ? C.amberGlow : C.greenGlow;
const scoreColor = (v) => v > 65 ? C.red : v > 45 ? C.orange : v > 30 ? C.amber : C.green;

function useInterval(fn, ms) {
  const saved = useRef(fn);
  useEffect(() => { saved.current = fn; }, [fn]);
  useEffect(() => { const t = setInterval(() => saved.current(), ms); return () => clearInterval(t); }, [ms]);
}

// ── Gauge ─────────────────────────────────────────────────────────────────────
function Gauge({ value, color }) {
  const angle = (value / 100) * 180 - 90;
  const r = 70, cx = 90, cy = 80;
  const arcPath = (start, end, r) => {
    const s = { x: cx + r * Math.cos((start * Math.PI) / 180), y: cy + r * Math.sin((start * Math.PI) / 180) };
    const e = { x: cx + r * Math.cos((end   * Math.PI) / 180), y: cy + r * Math.sin((end   * Math.PI) / 180) };
    const large = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };
  const ndx = cx + (r - 14) * Math.cos((angle * Math.PI) / 180);
  const ndy = cy + (r - 14) * Math.sin((angle * Math.PI) / 180);
  return (
    <svg width="180" height="100" style={{ overflow: 'visible' }}>
      <path d={arcPath(180,360,r)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" strokeLinecap="round"/>
      <path d={arcPath(180, 180 + (value/100)*180, r)} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'all 1s cubic-bezier(.4,0,.2,1)' }}/>
      <circle cx={cx} cy={cy} r="6" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }}/>
      <line x1={cx} y1={cy} x2={ndx} y2={ndy} stroke={color} strokeWidth="2" strokeLinecap="round"
        style={{ transformOrigin: `${cx}px ${cy}px`, transition: 'all 1s cubic-bezier(.4,0,.2,1)' }}/>
      <text x={cx} y={cy + 22} textAnchor="middle" fill={color}
        style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, filter: `drop-shadow(0 0 6px ${color})` }}>
        {value}%
      </text>
    </svg>
  );
}

// ── World SVG Map ─────────────────────────────────────────────────────────────
function WorldRiskMap({ worldRisk, onRegionClick }) {
  const hotspots = [
    { id: 'ME',  x: 385, y: 195, label: 'Hormuz',     region: 'Middle East / Hormuz' },
    { id: 'RS',  x: 370, y: 215, label: 'Red Sea',    region: 'Red Sea / Suez' },
    { id: 'EA',  x: 530, y: 175, label: 'East Asia',  region: 'East Asia' },
    { id: 'SA',  x: 460, y: 210, label: 'S. Asia',    region: 'South Asia' },
    { id: 'EU',  x: 330, y: 150, label: 'Europe',     region: 'Europe' },
    { id: 'NA',  x: 155, y: 165, label: 'N. America', region: 'North America' },
    { id: 'UA',  x: 360, y: 155, label: 'Ukraine',    region: 'Ukraine / Black Sea' },
    { id: 'TW',  x: 545, y: 195, label: 'Taiwan',     region: 'Taiwan Strait' },
  ];

  const getRegionRisk = (region) => {
    const r = worldRisk.find(w => w.name === region);
    return r ? r.risk : 0.3;
  };

  const riskToColor = (risk) => {
    if (risk > 0.65) return C.red;
    if (risk > 0.45) return C.orange;
    if (risk > 0.30) return C.amber;
    return C.green;
  };

  return (
    <div style={{ position: 'relative', width: '100%', background: `linear-gradient(180deg, rgba(6,10,18,0) 0%, rgba(10,15,30,0.8) 100%)` }}>
      {/* Simplified world map SVG paths */}
      <svg viewBox="0 0 720 360" style={{ width: '100%', display: 'block' }}>
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a2235" stopOpacity="1"/>
            <stop offset="100%" stopColor="#060a12" stopOpacity="1"/>
          </radialGradient>
          {hotspots.map(h => (
            <radialGradient key={h.id} id={`glow_${h.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={riskToColor(getRegionRisk(h.region))} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={riskToColor(getRegionRisk(h.region))} stopOpacity="0"/>
            </radialGradient>
          ))}
        </defs>
        <rect width="720" height="360" fill="url(#mapGlow)" rx="12"/>
        {/* Ocean grid lines */}
        {[60,120,180,240,300].map(y => (
          <line key={y} x1="0" y1={y} x2="720" y2={y} stroke="rgba(99,130,255,0.04)" strokeWidth="1"/>
        ))}
        {[90,180,270,360,450,540,630].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="360" stroke="rgba(99,130,255,0.04)" strokeWidth="1"/>
        ))}
        {/* Continents — simplified shapes */}
        {/* North America */}
        <path d="M80,80 L180,70 L210,100 L220,130 L200,160 L190,190 L160,200 L130,180 L100,150 L75,120 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* South America */}
        <path d="M170,210 L210,200 L220,240 L215,280 L200,310 L180,320 L160,300 L150,260 L155,230 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* Europe */}
        <path d="M290,90 L360,80 L370,105 L355,125 L330,130 L310,120 L290,110 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* Africa */}
        <path d="M295,140 L355,135 L375,170 L370,220 L355,260 L330,280 L305,265 L285,225 L280,185 L285,155 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* Middle East */}
        <path d="M360,145 L415,140 L425,170 L410,195 L385,200 L360,185 L355,165 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* South Asia */}
        <path d="M415,165 L470,160 L480,195 L465,225 L440,230 L420,210 L410,185 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* East Asia */}
        <path d="M470,100 L575,90 L590,130 L575,170 L545,185 L510,175 L480,155 L465,130 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* Australia */}
        <path d="M510,250 L580,245 L600,280 L585,310 L555,320 L520,305 L505,275 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>
        {/* Russia */}
        <path d="M355,60 L640,50 L650,90 L580,95 L480,100 L400,95 L355,80 Z"
          fill="rgba(30,45,80,0.7)" stroke="rgba(99,130,255,0.2)" strokeWidth="0.8"/>

        {/* Trade routes */}
        <path d="M370,210 Q390,230 400,250 Q420,280 450,290 Q500,300 540,270 Q570,245 590,220"
          fill="none" stroke="rgba(99,130,255,0.25)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <path d="M155,165 Q200,180 250,195 Q310,210 360,205 Q390,200 410,195"
          fill="none" stroke="rgba(99,130,255,0.2)" strokeWidth="1.5" strokeDasharray="4 3"/>
        <path d="M370,205 Q380,215 385,215"
          fill="none" stroke="rgba(239,68,68,0.5)" strokeWidth="2" strokeDasharray="3 2"/>

        {/* Hotspot pulse rings + dots */}
        {hotspots.map(h => {
          const risk = getRegionRisk(h.region);
          const col  = riskToColor(risk);
          const pct  = Math.round(risk * 100);
          return (
            <g key={h.id} style={{ cursor: 'pointer' }} onClick={() => onRegionClick(h.region)}>
              {/* Outer pulse */}
              <circle cx={h.x} cy={h.y} r={22} fill={`url(#glow_${h.id})`} opacity="0.7">
                <animate attributeName="r" values="18;28;18" dur={`${2 + risk}s`} repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.7;0.1;0.7" dur={`${2 + risk}s`} repeatCount="indefinite"/>
              </circle>
              {/* Mid ring */}
              <circle cx={h.x} cy={h.y} r={12} fill="none" stroke={col} strokeWidth="1" opacity="0.5">
                <animate attributeName="r" values="10;16;10" dur={`${2+risk}s`} repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.5;0.1;0.5" dur={`${2+risk}s`} repeatCount="indefinite"/>
              </circle>
              {/* Core dot */}
              <circle cx={h.x} cy={h.y} r={5} fill={col} style={{ filter: `drop-shadow(0 0 6px ${col})` }}/>
              {/* Label */}
              <text x={h.x} y={h.y - 12} textAnchor="middle" fill={col}
                style={{ fontFamily: 'Manrope', fontSize: 9, fontWeight: 600 }}>{h.label}</text>
              <text x={h.x} y={h.y + 18} textAnchor="middle" fill={col}
                style={{ fontFamily: 'JetBrains Mono', fontSize: 8 }}>{pct}%</text>
            </g>
          );
        })}

        {/* Straits label */}
        <text x={386} y={208} textAnchor="middle" fill="rgba(239,68,68,0.8)"
          style={{ fontFamily: 'JetBrains Mono', fontSize: 7 }}>⚠ HORMUZ</text>

        {/* Legend */}
        {[['LOW','#22c55e'],['MOD','#f59e0b'],['HIGH','#f97316'],['CRIT','#ef4444']].map(([l,c],i) => (
          <g key={l} transform={`translate(${600 + i * 0}, ${330 + i * 0})`}>
            <circle cx={16 + i*38} cy={345} r={4} fill={c} style={{ filter: `drop-shadow(0 0 4px ${c})` }}/>
            <text x={24 + i*38} y={349} fill="rgba(255,255,255,0.5)"
              style={{ fontFamily: 'Manrope', fontSize: 8 }}>{l}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, unit, color, sub, icon, blink }) {
  return (
    <div style={{
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: '14px 18px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 20%, ${color}08 0%, transparent 70%)` }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ fontSize: 11, color: C.textSecondary, fontFamily: 'Manrope', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
        <span style={{ fontSize: 16 }}>{icon}</span>
      </div>
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontFamily: 'Syne', fontSize: 26, fontWeight: 800, color, filter: `drop-shadow(0 0 8px ${color})`,
          ...(blink ? { animation: 'blink 1.5s ease-in-out infinite' } : {}) }}>{value}</span>
        {unit && <span style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary }}>{unit}</span>}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, fontFamily: 'Manrope' }}>{sub}</div>}
    </div>
  );
}

// ── Slider Input ──────────────────────────────────────────────────────────────
function SliderInput({ label, value, min, max, step, onChange, unit, color }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary, fontWeight: 500 }}>{label}</label>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: color || C.blue, fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <div style={{ position: 'relative', height: 6 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}/>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${C.blue}, ${color || C.blue})`, transition: 'width 0.1s' }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{ position: 'absolute', inset: 0, width: '100%', opacity: 0, cursor: 'pointer', height: '100%' }}/>
      </div>
    </div>
  );
}

// ── Driver Bar ────────────────────────────────────────────────────────────────
function DriverBar({ factor, contribution, icon, i }) {
  const max = 15;
  const pct = Math.min((contribution / max) * 100, 100);
  const col = pct > 70 ? C.red : pct > 45 ? C.orange : C.amber;
  return (
    <div style={{ marginBottom: 12, animation: `fadeIn 0.4s ${i * 0.1}s both` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textPrimary, fontWeight: 500 }}>{factor}</span>
        </div>
        <span style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: col }}>{contribution.toFixed(1)}</span>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${col}80, ${col})`,
          borderRadius: 3, boxShadow: `0 0 8px ${col}60`, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }}/>
      </div>
    </div>
  );
}

// ── Feed item ─────────────────────────────────────────────────────────────────
function FeedItem({ event, severity, region, time, i }) {
  const col = severity === 'CRITICAL' ? C.red : severity === 'HIGH' ? C.orange : C.amber;
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: `1px solid ${C.border}`,
      animation: `fadeIn 0.3s ${i * 0.08}s both` }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, marginTop: 5, flexShrink: 0,
        boxShadow: `0 0 6px ${col}`, animation: severity === 'CRITICAL' ? 'blink 1.2s ease-in-out infinite' : 'none' }}/>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textPrimary, lineHeight: 1.4 }}>{event}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: col,
            background: `${col}15`, padding: '1px 6px', borderRadius: 3 }}>{severity}</span>
          <span style={{ fontFamily: 'Manrope', fontSize: 10, color: C.textMuted }}>{region}</span>
          <span style={{ fontFamily: 'Manrope', fontSize: 10, color: C.textMuted, marginLeft: 'auto' }}>{time}</span>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [form, setForm] = useState({
    region: 'Middle East / Hormuz', sector: 'Energy / LPG',
    freight_rate: 2847, oil_price: 91.4,
    iran_israel_tension: 7.2, hormuz_risk: 6.8,
    inventory_days: 22, news_sentiment: -0.4, supplier_concentration: 0.55,
  });
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [metrics,   setMetrics]   = useState(null);
  const [worldRisk, setWorldRisk] = useState([]);
  const [feed,      setFeed]      = useState([]);
  const [freight,   setFreight]   = useState(null);
  const [tab,       setTab]       = useState('predict');

  const fetchMetrics = useCallback(async () => {
    try { const r = await axios.get(`${API}/metrics`);    setMetrics(r.data); } catch {}
  }, []);
  const fetchWorld   = useCallback(async () => {
    try { const r = await axios.get(`${API}/world-risk`); setWorldRisk(r.data); } catch {}
  }, []);
  const fetchFeed    = useCallback(async () => {
    try { const r = await axios.get(`${API}/live-feed`);  setFeed(r.data); } catch {}
  }, []);
  const fetchFreight = useCallback(async () => {
    try { const r = await axios.get(`${API}/freight-history`); setFreight(r.data); } catch {}
  }, []);

  useEffect(() => {
    fetchMetrics(); fetchWorld(); fetchFeed(); fetchFreight();
  }, []);
  useInterval(fetchMetrics, 4000);
  useInterval(fetchWorld,   8000);

  const predict = async () => {
    setLoading(true);
    try {
      const r = await axios.post(`${API}/predict`, form);
      setResult(r.data);
    } catch (e) {
      // fallback local
      const score = 0.65;
      setResult({ risk_score: score, risk_percent: 65, severity: 'HIGH', severity_color: C.orange,
        summary: 'Significant disruption risk. Activate contingency plans.',
        top_drivers: [{ factor: 'Iran–Israel Tension', contribution: 11.5, icon: '⚡' }],
        recommendations: ['Activate alternate sourcing', 'Increase safety stock'],
        financial_loss_est_m: 120, hormuz_closure_probability: 62 });
    }
    setLoading(false);
  };

  const mainColor = result ? scoreColor(result.risk_percent) : C.blue;
  const sevColor  = result ? riskColor(result.severity) : C.blue;

  const freightChartData = freight ? {
    labels: freight.labels,
    datasets: [{
      label: 'Freight Rate (USD)',
      data: freight.values,
      fill: true,
      borderColor: C.blue,
      backgroundColor: `${C.blue}18`,
      pointRadius: 3,
      pointBackgroundColor: C.blue,
      tension: 0.4,
    }]
  } : null;

  const freightOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false },
      tooltip: { bodyFont: { family: 'JetBrains Mono', size: 11 }, titleFont: { family: 'Manrope', size: 12 } } },
    scales: {
      x: { grid: { color: 'rgba(99,130,255,0.06)' }, ticks: { color: C.textSecondary, font: { family: 'Manrope', size: 10 }, maxTicksLimit: 8 } },
      y: { grid: { color: 'rgba(99,130,255,0.06)' }, ticks: { color: C.textSecondary, font: { family: 'JetBrains Mono', size: 10 } } },
    },
    annotation: { annotations: { crisis: { type: 'line', xMin: 12, xMax: 12, borderColor: `${C.red}80`, borderWidth: 1, borderDash: [4,3] } } }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg0, color: C.textPrimary, fontFamily: 'Manrope' }}>
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.8} 50%{opacity:.4} }
        * { box-sizing: border-box; }
        input[type=range] { -webkit-appearance:none; }
        select, option { background: #111827; color: #f0f4ff; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,130,255,0.3); border-radius: 2px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
        borderBottom: `1px solid ${C.border}`, padding: '0 32px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⛓️</div>
            <div>
              <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
                background: `linear-gradient(90deg, ${C.blue}, ${C.teal})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ChainGuard AI
              </div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'JetBrains Mono', marginTop: -2 }}>
                SUPPLY CHAIN INTELLIGENCE PLATFORM
              </div>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[['predict','🔮 Predict'],['dashboard','📊 Dashboard'],['map','🗺️ Risk Map']].map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                background: tab === t ? `${C.blue}20` : 'transparent',
                border: `1px solid ${tab === t ? C.blue : 'transparent'}`,
                color: tab === t ? C.blue : C.textSecondary,
                borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
                fontFamily: 'Manrope', fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
              }}>{l}</button>
            ))}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: C.textPrimary }}>Rutvik Prajapati</div>
            <div style={{ fontFamily: 'Manrope', fontSize: 10, color: C.textMuted }}>AIDTM · AI Solution Architect</div>
          </div>
        </div>
      </div>

      {/* ── Live Ticker ── */}
      <div style={{ background: `${C.red}0a`, borderBottom: `1px solid ${C.red}30`,
        padding: '6px 32px', display: 'flex', gap: 32, overflowX: 'hidden' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'blink 1s infinite' }}/>
          <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.red, fontWeight: 600 }}>LIVE</span>
        </div>
        {metrics && (
          <div style={{ display: 'flex', gap: 28, fontSize: 11, fontFamily: 'JetBrains Mono', color: C.textSecondary, alignItems: 'center' }}>
            <span>GLOBAL RISK INDEX: <span style={{ color: C.orange }}>{metrics.global_disruption_index}</span></span>
            <span>HORMUZ RISK: <span style={{ color: C.red }}>{metrics.hormuz_risk_index}</span></span>
            <span>FREIGHT: <span style={{ color: C.amber }}>USD {metrics.freight_rate_usd?.toLocaleString()}</span></span>
            <span>OIL: <span style={{ color: C.amber }}>${metrics.oil_price_usd}/bbl</span></span>
            <span>LPG INDEX: <span style={{ color: C.teal }}>{metrics.lpg_price_index}</span></span>
            <span>ACTIVE DISRUPTIONS: <span style={{ color: C.red }}>{metrics.active_disruptions}</span></span>
            <span>VESSELS REROUTED TODAY: <span style={{ color: C.orange }}>{metrics.vessels_rerouted_today}</span></span>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 32px' }}>

        {/* ── PREDICT TAB ── */}
        {tab === 'predict' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20 }}>

            {/* Left: Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 15, fontWeight: 700, marginBottom: 16, color: C.textPrimary }}>
                  🎯 Risk Parameters
                </div>

                {/* Region & Sector */}
                {[['region','Region', REGIONS],['sector','Sector', SECTORS]].map(([key,lbl,opts]) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary, fontWeight: 500, display: 'block', marginBottom: 6 }}>{lbl}</label>
                    <select value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={{
                      width: '100%', background: C.bg3, border: `1px solid ${C.border}`, color: C.textPrimary,
                      borderRadius: 8, padding: '8px 12px', fontFamily: 'Manrope', fontSize: 13,
                      cursor: 'pointer', outline: 'none',
                    }}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}

                <div style={{ height: 1, background: C.border, margin: '16px 0' }}/>

                <SliderInput label="Iran–Israel Tension" value={form.iran_israel_tension} min={0} max={10} step={0.1}
                  onChange={v => setForm(p => ({...p, iran_israel_tension: v}))} unit="/10" color={C.red}/>
                <SliderInput label="Hormuz Risk Score" value={form.hormuz_risk} min={0} max={10} step={0.1}
                  onChange={v => setForm(p => ({...p, hormuz_risk: v}))} unit="/10" color={C.orange}/>
                <SliderInput label="Freight Rate (USD)" value={form.freight_rate} min={800} max={6000} step={50}
                  onChange={v => setForm(p => ({...p, freight_rate: v}))} unit=" USD" color={C.amber}/>
                <SliderInput label="Oil Price (USD/bbl)" value={form.oil_price} min={40} max={150} step={1}
                  onChange={v => setForm(p => ({...p, oil_price: v}))} unit=" $" color={C.amber}/>
                <SliderInput label="Inventory Days" value={form.inventory_days} min={1} max={90} step={1}
                  onChange={v => setForm(p => ({...p, inventory_days: v}))} unit=" days" color={C.teal}/>
                <SliderInput label="Supplier Concentration" value={form.supplier_concentration} min={0.1} max={1} step={0.01}
                  onChange={v => setForm(p => ({...p, supplier_concentration: v}))} unit="" color={C.blue}/>
                <SliderInput label="News Sentiment" value={form.news_sentiment} min={-1} max={1} step={0.05}
                  onChange={v => setForm(p => ({...p, news_sentiment: v}))} unit="" color={C.teal}/>

                <button onClick={predict} disabled={loading} style={{
                  width: '100%', marginTop: 8, padding: '13px',
                  background: loading ? C.bg3 : `linear-gradient(135deg, ${C.blue}, ${C.teal})`,
                  border: 'none', borderRadius: 10, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Syne', fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
                  boxShadow: loading ? 'none' : `0 4px 24px ${C.blueGlow}`,
                  transition: 'all 0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                  {loading ? <><div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/> Analysing...</>
                    : '⚡ RUN PREDICTION'}
                </button>
              </div>
            </div>

            {/* Right: Results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {!result ? (
                <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  height: 300, gap: 12 }}>
                  <div style={{ fontSize: 48 }}>⛓️</div>
                  <div style={{ fontFamily: 'Syne', fontSize: 18, fontWeight: 700, color: C.textSecondary }}>Set parameters and run prediction</div>
                  <div style={{ fontFamily: 'Manrope', fontSize: 13, color: C.textMuted }}>Powered by XGBoost + LSTM hybrid model</div>
                </div>
              ) : (
                <>
                  {/* Main risk card */}
                  <div style={{ background: C.bg2, border: `1px solid ${sevColor}40`, borderRadius: 16, padding: 24,
                    position: 'relative', overflow: 'hidden', animation: 'fadeIn 0.5s both' }}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 80% 50%, ${sevColor}08, transparent 70%)` }}/>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'center' }}>
                        <Gauge value={result.risk_percent} color={sevColor}/>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: sevColor, marginTop: 4,
                          background: `${sevColor}18`, padding: '3px 12px', borderRadius: 20,
                          boxShadow: `0 0 12px ${sevColor}40` }}>
                          {result.severity}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'Syne', fontSize: 22, fontWeight: 800, color: C.textPrimary, marginBottom: 8 }}>
                          Risk Score: <span style={{ color: sevColor }}>{result.risk_percent}%</span>
                        </div>
                        <div style={{ fontFamily: 'Manrope', fontSize: 14, color: C.textSecondary, marginBottom: 16, lineHeight: 1.6 }}>
                          {result.summary}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                          <div style={{ background: C.bg3, borderRadius: 10, padding: '10px 14px',
                            border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Manrope', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Est. Financial Risk</div>
                            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: C.red, marginTop: 4 }}>
                              ${result.financial_loss_est_m}M
                            </div>
                          </div>
                          <div style={{ background: C.bg3, borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Manrope', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Hormuz Closure Risk</div>
                            <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: C.orange, marginTop: 4 }}>
                              {result.hormuz_closure_probability}%
                            </div>
                          </div>
                          {result.lpg_price_impact_pct && (
                            <div style={{ background: C.bg3, borderRadius: 10, padding: '10px 14px', border: `1px solid ${C.border}` }}>
                              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Manrope', textTransform: 'uppercase', letterSpacing: '0.1em' }}>LPG Price Impact</div>
                              <div style={{ fontFamily: 'Syne', fontSize: 20, fontWeight: 800, color: C.amber, marginTop: 4 }}>
                                +{result.lpg_price_impact_pct}%
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Drivers + Recommendations */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.textPrimary }}>
                        📊 Top Risk Drivers
                      </div>
                      {result.top_drivers.map((d, i) => <DriverBar key={i} {...d} i={i}/>)}
                    </div>
                    <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                      <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 14, color: C.textPrimary }}>
                        🛡️ AI Recommendations
                      </div>
                      {result.recommendations.map((r, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 12, animation: `fadeIn 0.4s ${i*0.1}s both` }}>
                          <div style={{ width: 22, height: 22, borderRadius: 6, background: `${C.teal}20`, border: `1px solid ${C.teal}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: C.teal, flexShrink: 0, fontFamily: 'Syne', fontWeight: 700 }}>
                            {i+1}
                          </div>
                          <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary, lineHeight: 1.5 }}>{r}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Live feed */}
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>📡 Live Intelligence Feed</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.red, animation: 'blink 1.2s infinite' }}/>
                    <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.red }}>LIVE</span>
                  </div>
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {feed.map((f, i) => <FeedItem key={i} {...f} i={i}/>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD TAB ── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Stat cards */}
            {metrics && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
                <StatCard label="Global Disruption Index" value={metrics.global_disruption_index} color={C.orange} icon="🌐" sub="↑ +4.2 this week" blink/>
                <StatCard label="Hormuz Risk Index" value={metrics.hormuz_risk_index} color={C.red} icon="🛢️" sub="Iran–Israel escalation" blink/>
                <StatCard label="Red Sea Risk Index" value={metrics.red_sea_risk_index} color={C.orange} icon="🚢" sub="Houthi activity high"/>
                <StatCard label="Freight Rate" value={metrics.freight_rate_usd?.toLocaleString()} unit=" USD" color={C.amber} icon="📦" sub="Freightos Baltic Index"/>
                <StatCard label="Oil Price" value={`$${metrics.oil_price_usd}`} color={C.amber} icon="⛽" sub="Brent crude / barrel"/>
                <StatCard label="LPG Price Index" value={metrics.lpg_price_index} color={C.teal} icon="🔥" sub="Asia spot market"/>
                <StatCard label="Active Disruptions" value={metrics.active_disruptions} color={C.red} icon="⚠️" sub="Across all regions"/>
                <StatCard label="Vessels Rerouted" value={metrics.vessels_rerouted_today} color={C.blue} icon="🛳️" sub="Today via Cape"/>
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>
                  📈 Freight Rate History (2023–2024)
                </div>
                <div style={{ fontFamily: 'Manrope', fontSize: 11, color: C.textMuted, marginBottom: 16 }}>
                  Red Sea crisis spike visible from Jan 2024
                </div>
                <div style={{ height: 220 }}>
                  {freightChartData && <Line data={freightChartData} options={freightOptions}/>}
                </div>
              </div>
              <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>
                  🌍 Region Risk Heatmap
                </div>
                <div style={{ fontFamily: 'Manrope', fontSize: 11, color: C.textMuted, marginBottom: 16 }}>
                  Current disruption risk by region
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {worldRisk.sort((a,b) => b.risk-a.risk).map(r => {
                    const col = r.risk > 0.65 ? C.red : r.risk > 0.45 ? C.orange : r.risk > 0.30 ? C.amber : C.green;
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary, width: 160, flexShrink: 0 }}>{r.name}</div>
                        <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${r.risk*100}%`, background: `linear-gradient(90deg, ${col}80, ${col})`,
                            borderRadius: 4, boxShadow: `0 0 8px ${col}60`, transition: 'width 1s' }}/>
                        </div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: 11, color: col, width: 40, textAlign: 'right' }}>
                          {Math.round(r.risk*100)}%
                        </div>
                        <div style={{ fontFamily: 'Manrope', fontSize: 10, color: r.trend==='up'?C.red:r.trend==='down'?C.green:C.textMuted }}>
                          {r.trend==='up'?'↑':r.trend==='down'?'↓':'→'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Geopolitical events */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, marginBottom: 16, color: C.textPrimary }}>
                ⚡ Active Geopolitical Risk Factors
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  { label: 'Iran–Israel Escalation', weight: 22, active: true, color: C.red, desc: 'Hormuz closure probability 64%. LPG routes under threat.' },
                  { label: 'Red Sea / Houthi Crisis', weight: 18, active: true, color: C.orange, desc: 'Maersk, MSC suspend transits. 30% of traffic rerouted.' },
                  { label: 'Russia–Ukraine Conflict', weight: 12, active: true, color: C.orange, desc: 'Grain exports halted. Black Sea corridor blocked.' },
                  { label: 'Taiwan Strait Tensions', weight: 8, active: false, color: C.amber, desc: 'PLA military exercises increase frequency.' },
                  { label: 'US/EU Sanctions Regime', weight: 7, active: true, color: C.amber, desc: 'Iran petrochemical sector newly sanctioned.' },
                  { label: 'Suez Canal Risk', weight: 5, active: false, color: C.teal, desc: 'Capacity reduced. 18% transit fee hike.' },
                ].map((ev, i) => (
                  <div key={i} style={{ background: C.bg3, border: `1px solid ${ev.active ? ev.color+'40' : C.border}`,
                    borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12,
                      width: 8, height: 8, borderRadius: '50%', background: ev.active ? ev.color : C.textMuted,
                      boxShadow: ev.active ? `0 0 8px ${ev.color}` : 'none',
                      animation: ev.active ? 'blink 1.5s infinite' : 'none' }}/>
                    <div style={{ fontFamily: 'Syne', fontSize: 13, fontWeight: 700, color: ev.color, marginBottom: 4 }}>{ev.label}</div>
                    <div style={{ fontFamily: 'Manrope', fontSize: 11, color: C.textSecondary, lineHeight: 1.5, marginBottom: 8 }}>{ev.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${ev.weight * 4}%`, background: ev.color, borderRadius: 2 }}/>
                      </div>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: ev.color }}>w={ev.weight}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attribution footer */}
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'Syne', fontSize: 14, fontWeight: 700, color: C.textPrimary }}>ChainGuard AI — Research Assignment</div>
                <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                  Rutvik Prajapati · AIDTM · AI Solution Architecture · 2024–25
                </div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'Manrope', fontSize: 11, color: C.textMuted }}>
                <div>Model: XGBoost + BiLSTM + Isolation Forest</div>
                <div>Data: GDELT · SCRN · Freightos Baltic Index · UN Comtrade</div>
              </div>
            </div>
          </div>
        )}

        {/* ── MAP TAB ── */}
        {tab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'Syne', fontSize: 16, fontWeight: 800, color: C.textPrimary }}>🗺️ Global Supply Chain Risk Map</div>
                  <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textMuted, marginTop: 2 }}>Click any hotspot to run prediction for that region</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite' }}/>
                  <span style={{ fontFamily: 'JetBrains Mono', fontSize: 10, color: C.green }}>LIVE DATA</span>
                </div>
              </div>
              <WorldRiskMap worldRisk={worldRisk} onRegionClick={(region) => { setForm(p => ({...p, region})); setTab('predict'); }}/>
            </div>

            {/* Region cards below map */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {worldRisk.sort((a,b) => b.risk-a.risk).map(r => {
                const col = r.risk > 0.65 ? C.red : r.risk > 0.45 ? C.orange : r.risk > 0.30 ? C.amber : C.green;
                return (
                  <div key={r.id} onClick={() => { setForm(p => ({...p, region: r.name})); setTab('predict'); }}
                    style={{ background: C.bg2, border: `1px solid ${col}30`, borderRadius: 12, padding: '14px 16px',
                      cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => e.currentTarget.style.border = `1px solid ${col}80`}
                    onMouseLeave={e => e.currentTarget.style.border = `1px solid ${col}30`}>
                    <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 90% 10%, ${col}08, transparent 60%)` }}/>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontFamily: 'Manrope', fontSize: 12, color: C.textSecondary, fontWeight: 600 }}>{r.name}</div>
                      <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 800, color: col }}>
                        {Math.round(r.risk*100)}%
                      </div>
                    </div>
                    <div style={{ fontFamily: 'Manrope', fontSize: 10, color: C.textMuted, marginTop: 4 }}>{r.sector}</div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 10 }}>
                      <div style={{ height: '100%', width: `${r.risk*100}%`, background: col, borderRadius: 2,
                        boxShadow: `0 0 6px ${col}` }}/>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: 'JetBrains Mono', fontSize: 9, color: col,
                        background: `${col}15`, padding: '2px 8px', borderRadius: 3 }}>
                        {r.risk > 0.65 ? 'CRITICAL' : r.risk > 0.45 ? 'HIGH' : r.risk > 0.30 ? 'MODERATE' : 'LOW'}
                      </span>
                      <span style={{ fontFamily: 'Manrope', fontSize: 10, color: r.trend==='up'?C.red:r.trend==='down'?C.green:C.textMuted }}>
                        {r.trend==='up'?'↑ Rising':r.trend==='down'?'↓ Falling':'→ Stable'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
