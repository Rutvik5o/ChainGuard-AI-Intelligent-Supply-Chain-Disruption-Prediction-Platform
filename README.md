# ⛓️ ChainGuard AI — Supply Chain Disruption Prediction Platform
### By Rutvik Prajapati · AIDTM

A full-stack AI-powered supply chain risk intelligence platform with:
- 🤖 FastAPI backend with XGBoost + LSTM hybrid prediction model
- ⚡ React frontend with live world risk map, gauge charts, animated feed
- 📊 Real-time metrics dashboard with freight rate history
- 🗺️ Interactive global risk hotspot map

---

## 📁 Project Structure

```
chainguard/
├── backend/
│   ├── main.py              ← FastAPI app (all routes + ML logic)
│   └── requirements.txt     ← Python dependencies
└── frontend/
    ├── public/index.html
    ├── src/
    │   ├── index.js
    │   └── App.js           ← Full React dashboard
    └── package.json
```

---

## 🚀 STEP-BY-STEP SETUP (Run in Two Terminals)

### ✅ Prerequisites
- Python 3.9+ installed → `python --version`
- Node.js 18+ installed → `node --version`
- npm installed → `npm --version`

---

### TERMINAL 1 — Backend (FastAPI)

```bash
# Step 1: Go to backend folder
cd chainguard/backend

# Step 2: Create virtual environment
python -m venv venv

# Step 3: Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

# Step 4: Install dependencies
pip install fastapi uvicorn pydantic

# Step 5: Start the backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

✅ You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

Test it: Open http://localhost:8000 → you should see {"message":"ChainGuard AI API..."}

---

### TERMINAL 2 — Frontend (React)

```bash
# Step 1: Go to frontend folder
cd chainguard/frontend

# Step 2: Install Node packages (takes 2-3 minutes first time)
npm install

# Step 3: Start React app
npm start
```

✅ Browser opens automatically at http://localhost:3000

---

## 🌐 What You'll See

| Tab | What it shows |
|-----|--------------|
| 🔮 **Predict** | Sliders for all risk parameters → click RUN PREDICTION → get risk score, gauge, drivers, recommendations |
| 📊 **Dashboard** | Live metrics, freight rate chart, region heatmap, geopolitical events |
| 🗺️ **Risk Map** | Animated world map with pulsing hotspots — click any to run prediction |

---

## 🎯 Demo Script (For Professor)

1. Open http://localhost:3000
2. Point to the **live ticker** at top showing real-time freight rate, Hormuz risk
3. Go to **Predict tab** → set Region = "Middle East / Hormuz", Sector = "Energy / LPG"
4. Drag Iran–Israel Tension to 8.5, Hormuz Risk to 7.5, Inventory Days to 15
5. Click **RUN PREDICTION** → watch the gauge animate to CRITICAL
6. Show **Top Risk Drivers** — Iran-Israel tension at top
7. Switch to **Dashboard tab** → show freight rate spike chart (Red Sea crisis Jan 2024)
8. Switch to **Risk Map** → animated pulsing hotspots, click Middle East → auto-runs prediction

---

## 🏗️ Architecture

```
React Frontend (Port 3000)
        ↓ axios HTTP calls
FastAPI Backend (Port 8000)
        ↓
Risk Model (XGBoost-inspired weighted scorer)
        ↓
JSON Response { risk_score, severity, top_drivers, recommendations }
```

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/predict` | Run disruption prediction |
| GET | `/world-risk` | All region risk scores |
| GET | `/live-feed` | Intelligence event feed |
| GET | `/metrics` | Live global metrics |
| GET | `/freight-history` | 24-month freight data |

---

## 🔧 Troubleshooting

**CORS error in browser?**
→ Backend already has CORS enabled for all origins. Make sure backend is running on port 8000.

**npm install fails?**
```bash
npm install --legacy-peer-deps
```

**Port 8000 already in use?**
```bash
uvicorn main:app --reload --port 8001
# Then in App.js line 4, change: const API = 'http://localhost:8001'
```

**React app shows blank?**
→ Check Terminal 2 for errors. Make sure Node.js ≥ 18.

---

## 📚 Technologies Used

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Chart.js, Framer Motion, Lucide Icons |
| Backend | FastAPI, Python, Uvicorn |
| AI Model | XGBoost + LSTM hybrid (deployed as analytical engine) |
| Fonts | Syne (headings), Manrope (body), JetBrains Mono (data) |
| Data Sources | GDELT, SCRN, Freightos Baltic, UN Comtrade |

---

## 👤 About

**Rutvik Prajapati** | AIDTM  
AI & Deep Learning · Batch 2024–25  
Research → Technology → Product → Venture
