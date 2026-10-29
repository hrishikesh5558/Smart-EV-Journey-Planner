# SMART EV – Intelligent Charging & Range Planner

> **Manual input EV range planner: enter your battery status and journey details to instantly calculate whether your charge is sufficient for any trip.**

---

## 📌 Project Overview

**Smart EV** is a production-grade, full-stack web application designed to help electric vehicle (EV) drivers determine whether their current battery charge and remaining driving range are sufficient for a planned journey.

Smart EV uses **manual input** – no image uploads, no OCR, no Tesseract. Drivers enter their current battery readings directly, enabling fast and reliable range calculations on any device.

**Core workflow:**

1. **Register / Login** – Create a secure account with JWT-protected authentication.
2. **Add Your Vehicle** – Save your EV with battery capacity, rated range, and a nickname.
3. **Open EV Range Planner** – Enter battery percentage, estimated remaining range, and journey distance.
4. **Set Safety Reserve** – Configure a safety buffer percentage (default: 15%).
5. **Calculate Range** – Backend computes usable range and remaining journey margin.
6. **View Recommendation** – Clear verdict: sufficient or charging recommended.
7. **Save Journey** – Persist results to MongoDB under your account.
8. **View History** – Review, inspect, and delete your past journey calculations.

---

## ⚡ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, React Router v7, TanStack Query v5, Tailwind CSS, Framer Motion, Lucide React, Axios |
| **Backend** | Python 3.8+, FastAPI, Pydantic v2, PyMongo, Uvicorn, Python-Jose (JWT), Passlib / Bcrypt |
| **Database** | MongoDB (Local Community Server / MongoDB Atlas) |
| **Testing** | Pytest, AnyIO, HTTPX |

---

## 📋 System Prerequisites

1. **Python**: Version 3.8 or higher (Python 3.10+ recommended).
2. **Node.js**: Version 18.0.0 or higher with `npm`.
3. **MongoDB**: MongoDB Community Server running on port `27017`, or a MongoDB Atlas URI.

---

## ⚙️ Environment Configuration

### Backend (`backend/.env`)

```env
APP_SECRET_KEY=dev-secret-key-smart-ev-change-in-production
APP_ENV=development
DEBUG=true
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DATABASE=smart_ev_db
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
JWT_ALGORITHM=HS256
UPLOAD_DIR=uploads
MAX_UPLOAD_SIZE_MB=10
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

---

## 🚀 Installation & Running the Application

### Step 1 – Start MongoDB

Ensure MongoDB is running locally:

```powershell
# Check status
Get-Service MongoDB

# Start if stopped
Start-Service MongoDB
```

Connect to `mongodb://127.0.0.1:27017` in MongoDB Compass to inspect the `smart_ev_db` database.

Collections created automatically:
- `users` – registered user accounts
- `vehicles` – garage EVs per user
- `journeys` – saved range calculations per user

### Step 2 – Start the Backend

```powershell
cd c:\evcar\smart-ev\backend

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Available at:
- **API Base URL**: `http://127.0.0.1:8000`
- **Health Check**: `http://127.0.0.1:8000/api/health`
- **Swagger Docs**: `http://127.0.0.1:8000/api/docs`
- **ReDoc**: `http://127.0.0.1:8000/api/redoc`

### Step 3 – Start the Frontend

```powershell
cd c:\evcar\smart-ev\frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```

Navigate to: **`http://localhost:5173`**

---

## 🧮 Range Calculation Formula

The backend applies the following deterministic formula to all manual inputs:

```
Safety Reserve Distance = Estimated Remaining Range × Reserve Percentage / 100
Usable Range            = Estimated Remaining Range − Safety Reserve Distance
Remaining Journey Margin = Usable Range − Planned Journey Distance
```

**Example** (Battery: 80%, Range: 250 km, Journey: 180 km, Reserve: 15%):

```
Safety Reserve Distance = 250 × 15 / 100 = 37.5 km
Usable Range            = 250 − 37.5      = 212.5 km
Remaining Journey Margin = 212.5 − 180   = +32.5 km  ✓ Sufficient
```

### Recommendation Logic

| Condition | Status | Recommendation Message |
|-----------|--------|------------------------|
| Journey distance ≤ Usable range | **Feasible** | "Your estimated driving range appears sufficient for this journey with the selected safety reserve." |
| Journey distance > Usable range | **Charging Recommended** | "Charging before departure or planning a charging stop is recommended." |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, returns JWT tokens |
| `GET` | `/api/auth/me` | Current user profile |
| `PUT` | `/api/auth/profile` | Update profile |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/vehicles` | List saved vehicles |
| `POST` | `/api/vehicles` | Add vehicle to garage |
| `PUT` | `/api/vehicles/{id}` | Update vehicle |
| `DELETE` | `/api/vehicles/{id}` | Delete vehicle |
| `POST` | `/api/journeys/calculate` | Stateless range calculation (no DB write) |
| `POST` | `/api/journeys/save` | Calculate and persist to MongoDB |
| `GET` | `/api/journeys/history` | Authenticated user's journey history |
| `GET` | `/api/journeys/{id}` | Single journey record |
| `DELETE` | `/api/journeys/{id}` | Delete own journey (user-isolated) |
| `GET` | `/api/journeys/stats/summary` | Dashboard statistics |
| `GET` | `/api/health` | Backend and database health check |

---

## 📂 Project Structure

```
smart-ev/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py             # Register, login, profile, token refresh
│   │   │   ├── vehicles.py         # Vehicle CRUD & garage management
│   │   │   ├── journeys.py         # Journey calculate, save, history, delete
│   │   │   └── charging_stations.py# Charging station lookup
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings & environment loader
│   │   │   └── security.py         # Bcrypt password hashing & JWT tokens
│   │   ├── database/
│   │   │   └── mongodb.py          # PyMongo client, connection, indexes
│   │   ├── models/                 # Data entities (User, Vehicle, Journey)
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── services/
│   │   │   └── range_service.py    # Range sufficiency calculation engine
│   │   └── main.py                 # FastAPI app & router mounting
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components & layouts
│   │   ├── contexts/               # React AuthContext (JWT session management)
│   │   ├── pages/
│   │   │   ├── LandingPage.tsx           # Product showcase & features
│   │   │   ├── LoginPage.tsx             # Secure login with validation
│   │   │   ├── RegisterPage.tsx          # Account registration
│   │   │   ├── DashboardOverview.tsx     # Live MongoDB summary & active vehicle
│   │   │   ├── EVRangePlannerPage.tsx    # Manual input range calculator
│   │   │   ├── GaragePage.tsx            # Vehicle CRUD & battery specs
│   │   │   ├── JourneyHistoryPage.tsx    # Past journey calculations
│   │   │   ├── ChargingStationsPage.tsx  # Charging station finder
│   │   │   └── SettingsPage.tsx          # Profile & preferences
│   │   ├── services/               # Axios API client & service modules
│   │   └── types/                  # TypeScript interface definitions
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🛡️ Security & User Isolation

- All journeys are user-scoped: queries always filter by `user_id`.
- Users cannot access or delete another user's journey records.
- JWT access tokens expire after 60 minutes; refresh tokens after 7 days.
- Passwords are hashed with Bcrypt before storage.

---

## 🛠️ Common Errors & Solutions

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `ServerSelectionTimeoutError` | MongoDB not running | Run `Start-Service MongoDB` in PowerShell |
| `409 Conflict` on register | Email already registered | Use a unique email or log in |
| `401 Unauthorized` | Expired JWT token | Log out and log back in |
| Port 8000 / 5173 in use | Another process on that port | Stop the process or use `--port 8001` |
| `CORS` errors in browser | Frontend URL not in CORS_ORIGINS | Add your URL to `CORS_ORIGINS` in `.env` |

---

## ⚖️ Disclaimer

*The calculations provided by Smart EV are estimates based on driver-provided telemetry and configured safety buffers. Actual driving range will vary depending on road conditions, terrain, elevation, speed, ambient temperature, cabin climate control, battery degradation, and driving style. Always maintain sufficient charge for unexpected detours.*
