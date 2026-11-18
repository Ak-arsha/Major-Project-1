# Healthcare Navigator – Agentic AI Care Assistant (Patient Portal)

> **Major Project (Semester 7)**  
> **Repository:** [https://github.com/Ak-arsha/Major-Project-1](https://github.com/Ak-arsha/Major-Project-1)

Healthcare Navigator is an intelligent healthcare assistant and multi-agent coordination system tailored for patient outpatient care. It unifies verified Indian doctor & hospital discovery, automated OPD appointment booking with consultation fee transparency, WHO-grounded medical question answering (RAG), clinical triage guidance, and an IRDAI-indexed health insurance policy navigator into a single, polished patient interface.

---

## 🌟 Key Features

### 1. 🔐 Patient Portal Authentication & Session Gate
- **Dedicated Patient Authentication:** Secure sign-in and account registration at `/login` protecting personal patient health workflows.
- **Strict Credential Validation:** Only registered patient accounts (or the one-click evaluation demo patient) can authenticate; unregistered logins require account creation.
- **Isolated User Sessions:** Each registered patient has an independent, private session. Booked appointments and consultation details remain private to the patient.
- **🚀 One-Click Demo Access:** Instant evaluation login for demo patient **Alex Sharma** (`patient@healthnavigator.ai`).

### 2. 🩺 Doctor & Hospital Discovery
- Search over 4,000+ verified Indian doctors and hospitals across specialties and cities.
- Filter by city (Delhi, Mumbai, Bengaluru, Ahmedabad, etc.), specialty, or hospital name.
- Transparent display of consultation fees (e.g. ₹500, ₹800, ₹1000).

### 3. 📅 Outpatient (OPD) Appointment Scheduling & Fee Breakdown
- 7-day OPD availability calendar with slot capacity tracking and real-time selection.
- **Consultation Fee & Payment Transparency:** Clear fee breakdown during booking (OPD consultation fee, ₹0 platform fee, payment payable at hospital OPD counter upon arrival via Cash/UPI).
- **Patient Scoping:** Patients view only their own active and past appointments.
- Double-booking prevention and instant slot release upon cancellation or rescheduling.

### 4. 📚 Medical Knowledge Assistant (WHO-Grounded RAG)
- Query-answering agent grounded in World Health Organization (WHO) medical literature.
- Delivers evidence-based guidance with citations and clinical references.

### 5. 🛡️ Insurance Navigator & Policy Finder
- Search and compare Indian health insurance policies indexed from IRDAI regulatory filings.
- Comprehensive policy details (sum insured options, PED waiting periods, copay terms, and network benefits) with reliable local fallback.

### 6. 🚨 Emergency Clinical Triage
- Symptom assessment engine providing clear guidance on urgency levels (Emergency, Urgent Care, Routine Visit, or Home Care).

---

## 🏗️ System Architecture

```
major_project_sem7/
├── frontend/                     # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/           # UI components (auth, layout, dashboard, common)
│   │   │   ├── auth/             # ProtectedRoute and role guards
│   │   │   └── layout/           # Sidebar, Topbar, Logo
│   │   ├── context/              # AuthContext (RBAC state & demo accounts)
│   │   ├── pages/                # Auth, Dashboard, Appointments, DoctorHospital, etc.
│   │   ├── services/             # API services (appointment, healthcare, rag)
│   │   └── styles/               # Design tokens, layouts, base & auth CSS
│   ├── package.json
│   ├── vite.config.js            # Vite build configuration (preserveSymlinks enabled)
│   └── vercel.json               # SPA routing rewrite configuration
│
├── backend/                      # FastAPI Python REST API
│   ├── main.py                   # FastAPI entrypoint with CORS & RAG lifespan
│   ├── database.py               # SQLite connection with Vercel serverless /tmp fallback
│   ├── appointment_routes.py     # Doctor schedules, slots & appointment booking
│   ├── healthcare_routes.py      # Doctor & hospital directory queries
│   ├── insurance_routes.py       # Insurance document QA & processing
│   ├── policy_finder_routes.py   # IRDAI policy search and fact filtering
│   └── policy_finder_database.py # Policy database with serverless runtime support
│
├── data/                         # SQLite databases & knowledge documents
│   ├── healthcare.db             # Doctors, hospitals, appointment slots
│   └── policy_finder.db          # IRDAI insurance policies & clause facts
│
├── package.json                  # Root build script for Vercel & monorepo deployers
└── vercel.json                   # Root Vercel zero-config deployment specification
```

---

## 🚀 Deployment on Vercel

The repository is configured for **zero-config 1-click deployment on Vercel**.

### Option A: Deploy from GitHub (Recommended)
1. Fork or push changes to [https://github.com/Janediaa/major_project_sem7](https://github.com/Janediaa/major_project_sem7).
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import the `major_project_sem7` repository.
4. **Vercel will automatically detect:**
   - **Framework Preset:** `Vite`
   - **Build Command:** `cd frontend && npm install && npm run build`
   - **Output Directory:** `frontend/dist`
5. *(Optional)* Add Environment Variables if connecting to an external FastAPI backend:
   - `VITE_API_BASE_URL`: `https://your-backend-api.vercel.app` (or leave empty to use relative/mock mode)
6. Click **Deploy**. Vercel will complete the build and assign your production URL.

### Option B: Deploy using Vercel CLI
```bash
# Install Vercel CLI globally if not already installed
npm install -g vercel

# From the project root, login and deploy
vercel
vercel --prod
```

---

## 💻 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+ / v3.13)
- uv or pip

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will start on `http://localhost:5173`.

### 3. Backend Setup
```bash
# In the repository root
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Run FastAPI backend
uvicorn backend.main:app --reload --port 8000
```
API documentation is available at `http://localhost:8000/docs`.

---

## 🔒 Evaluation Accounts Summary

| Role | Name | Email | Password | Pre-configured Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Patient** | Alex Sharma | `patient@healthnavigator.ai` | Any (or 1-click) | Self-service booking, symptom triage, insurance search |
| **Doctor** | Dr. Sarah Jenkins | `dr.jenkins@healthnavigator.ai` | Any (or 1-click) | OPD consultation calendar, schedule availability |
| **Admin** | Dr. Raymond Holt | `admin@healthnavigator.ai` | Any (or 1-click) | Full hospital system oversight & platform controls |

---

## 📄 License
Academic Major Project – Semester 7.
