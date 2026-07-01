# Hamro G&G Auto OS — Product Requirements Document

## Original Problem Statement
Build "Hamro G&G Auto OS", an advanced AI-powered automobile dealership management platform for Nepal, managing second-hand bikes/scooters. Core constraints: clean professional light theme, English language, NPR currency, BS (Bikram Sambat) date system.

## 18 Core Modules
1. Inventory Management  
2. Vendor Management  
3. AI Pricing Engine  
4. Stock Aging  
5. Customer CRM  
6. Sales Management  
7. Staff & Mechanic Management  
8. Finance & Accounting  
9. Partner Dashboard  
10. EMI Calculator  
11. Legal Documents  
12. Website Sync  
13. Marketing Automation  
14. Communication Center  
15. QR Vehicle System  
16. AI Chatbot  
17. Nepal Festival Intelligence  
18. Executive Dashboard  

## Tech Stack
- Frontend: React (CRA), Tailwind CSS, shadcn/UI, Recharts
- Backend: FastAPI (Python), MongoDB
- Auth: JWT (sessionStorage)
- AI: Emergent LLM Key (Gemini Flash via emergentintegrations)
- Dates: BS (Bikram Sambat) via `@sbmdkl/nepali-date-converter`
- QR: `qrcode.react`
- File Uploads: python-multipart

## Code Architecture
```
/app/
├── backend/
│   ├── server.py              # FastAPI app (1270 lines, refactored with helpers)
│   ├── requirements.txt
│   └── .env
├── frontend/src/
│   ├── App.js                 # React Router
│   ├── context/AuthContext.jsx
│   ├── utils/api.js, helpers.js, nepali-date.js
│   ├── components/BSDatePicker.jsx, VendorAutocomplete.jsx, Layout.jsx
│   └── pages/
│       ├── Inventory.jsx (233 lines)     # uses AddVehicleModal.jsx
│       ├── AddVehicleModal.jsx           # extracted from Inventory
│       ├── VehicleDetail.jsx (464 lines) # uses VehicleModals.jsx
│       ├── VehicleModals.jsx             # extracted: Expense, Job, Edit, QR modals
│       ├── Dashboard.jsx, Finance.jsx, Reports.jsx
│       ├── AIAssistant.jsx, Marketing.jsx, EMI.jsx
│       ├── Customers.jsx, JobCards.jsx, Vendors.jsx
│       └── ...other pages
└── memory/PRD.md, test_credentials.md
```

## What's Implemented (as of Feb 2026)

### All 18 Modules — Feature Complete
- Full CRUD for vehicles (Inventory), vendors, customers, job cards, spare parts
- AI Pricing, AI Festival Intelligence, AI Chatbot (Gemini Flash via Emergent LLM Key)
- QR Code generation per vehicle
- BS (Nepali) date system globally
- File uploads: vehicle photos, legal documents (Bluebook, Insurance)
- Vendor autocomplete search
- Marketing AI captions
- Finance dashboard: revenue, COGS, profit, partner splits
- EMI calculator with payment tracking
- Website sync simulation
- JWT auth via sessionStorage

### Code Quality Fixes (Feb 2026)
- XSS vulnerabilities fixed in AIAssistant.jsx
- Python `is` literal comparisons replaced with `==`
- JWT migrated from localStorage to sessionStorage
- Array index keys replaced with stable keys across all chart components
- Empty catch blocks now log errors in VehicleDetail.jsx
- `useMemo` added for expensive computations in Finance.jsx and VehicleDetail.jsx (placed before loading guards)
- Nested ternary removed in VehicleDetail.jsx financial cards
- VehicleDetail.jsx split: modals extracted to VehicleModals.jsx (464 lines vs 584)
- Inventory.jsx split: Add Vehicle form extracted to AddVehicleModal.jsx (233 lines vs 410)
- Backend complexity reduced: helper functions `_vehicle_investment`, `_vendor_payable`, `_emi_remaining`, `_aging_counts`, `_build_suggestions_context` extracted from `finance_summary`, `dashboard_stats`, `ai_suggestions`

## Deployment Configuration
- Vercel (frontend) + Railway (backend) split deployment
- See /app/DEPLOYMENT.md

## P0 / P1 / P2 Backlog

### P2 — Upcoming
- Communication Center (Module 14) — unified inbox UI completeness
- EMI Calculator — full CRUD verification & payment history UI
- Multi-branch architecture expansion
- Partner Dashboard — profit split visualization
- Staff commission tracking
RD

## Original Problem Statement
Build an advanced AI-powered automobile dealership management platform for Nepal (Hamro G&G Auto Enterprises) for second-hand bikes/scooters.

**Core Constraints:** Clean professional light theme, English language, NPR currency, BS (Bikram Sambat) date system.

---

## Architecture
- **Frontend:** React (CRA) + Tailwind + shadcn/UI
- **Backend:** FastAPI + MongoDB (Motor async)
- **Auth:** JWT (admin/admin123)
- **AI:** Emergent LLM Key (Gemini 3 Flash)
- **BS Dates:** `@sbmdkl/nepali-date-converter` npm package

---

## What's Been Implemented

### Auth & Core (Session 1)
- JWT login with admin user (admin / admin123)
- Layout with 13-item sidebar navigation
- Protected routes

### Inventory Management (Module 1)
- Add/View/Delete vehicles with full form
- Stock aging intelligence (Fresh/Normal/Slow/Dead)
- Vehicle detail page with expenses & job cards
- BS Date picker for Purchase Date (Year/Month/Day dropdowns)
- Inventory table shows dates in BS format ("2083 Jestha 21")
- **Vendor Autocomplete** in "Purchased From" field — searches DB as you type

### BS Date System (Session 3)
- `@sbmdkl/nepali-date-converter` installed
- `utils/nepali-date.js` — full conversion utilities
- `components/BSDatePicker.jsx` — three-dropdown BS date input
- All date displays converted to BS format across Inventory + VehicleDetail
- Dashboard shows today's BS date in header ("22 Jestha 2083 BS")

### Dashboard (Module 18 partial)
- KPI cards: Available, Sold, Capital, Profit, Reserved, Customers, Jobs, Total
- Stock Aging bar chart + Stock Alerts panel
- **Accounting Summary** with BS-calendar tabs (Today / This Month / This Year)

### AI Assistant (Modules 3, 16, 17) — Session 4
- **Sales Chatbot** — AI answers customer questions, knows current stock
- **AI Pricing Engine** — suggests sell price based on vehicle details + Nepal market
- **Festival Intelligence** — detects upcoming Nepali festivals, gives business strategy
- **Business Advisor** — general inventory/finance/vendor recommendations
- All powered by Gemini 3 Flash via Emergent LLM Key

### QR Code System (Module 15) — Session 4
- QR Label button on VehicleDetail page
- Generates QR code with vehicle info (brand, model, year, reg#, price)
- Print button for physical labels
- Uses `qrcode.react` package

### Frontend Routes Fixed — Session 4
- Vendors, Finance, Marketing, EMI pages now routed in App.js + sidebar
- All 13 nav items working

### Backend Endpoints (~1050 lines, server.py)
- POST/GET /api/auth/*
- CRUD /api/vehicles, /api/expenses, /api/jobs
- CRUD /api/customers, /api/team, /api/partners, /api/vendors
- GET /api/vendors/search?q= (autocomplete)
- GET /api/reports/dashboard
- GET /api/reports/accounting-summary?start_date=&end_date=
- POST /api/ai/suggestions (Business Advisor)
- POST /api/ai/price-suggestion (AI Pricing Engine)
- GET /api/ai/festival-intelligence
- POST /api/ai/chatbot
- POST /api/marketing/generate
- EMI endpoints

### Bug Fixes
- Form field focus loss on mobile (Field/inp/sel moved outside component)
- Form state reset on Cancel/Close/Open
- Year/Engine CC numeric spinner arrows removed (inputMode="numeric")
- App.js duplicate ProtectedRoute fixed

---

## Pending / In Progress

### P2 — Communication Center (Module 14)
- Not started

### P2 — Multi-branch Architecture
- Not started

### P2 — EMI Calculator wiring
- EMI.jsx exists with UI but loan plan CRUD needs backend verification

---

## Backlog (Future)
- EMI / Financing calculator (Module 10)
- Partner Dashboard with profit split (Module 9)
- Finance & Accounting full module (Module 8)
- Staff commission tracking (Module 7)
- Website Integration (Module 12)
- Nepali Festival mode (Module 17)

---

## Default Credentials
- Username: admin
- Password: admin123
