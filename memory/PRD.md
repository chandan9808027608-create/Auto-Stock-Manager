# Hamro G&G Auto OS — PRD

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

### P1 — Legal Document Tracking (Module 11)
- Document status fields exist (bluebook, insurance, tax, transfer)
- File upload not yet implemented

### P1 — Website Sync (Module 12)
- Webhook structure for hamroauto.com.np sync not started

### P2 — Marketing Automation (Module 13)
- AI caption generation endpoint exists (`/api/marketing/generate`)
- Marketing.jsx page needs to be wired to the endpoint

### P2 — Communication Center (Module 14)
- Not started

### P2 — Multi-branch Architecture
- Not started

### P2 — Finance Page
- Finance.jsx exists and routes but needs full backend wiring

### P2 — EMI Calculator
- EMI.jsx exists with UI but loan plan CRUD needs backend wiring

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
