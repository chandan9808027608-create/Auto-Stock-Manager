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
- Layout with sidebar navigation
- Protected routes

### Inventory Management (Module 1)
- Add/View/Delete vehicles with full form
- Stock aging intelligence (Fresh/Normal/Slow/Dead)
- Vehicle detail page with expenses & job cards
- BS Date picker for Purchase Date (Year/Month/Day dropdowns)
- Inventory table shows dates in BS format ("2083 Jestha 21")

### BS Date System (Session 3)
- `@sbmdkl/nepali-date-converter` installed
- `utils/nepali-date.js` — full conversion utilities
- `components/BSDatePicker.jsx` — three-dropdown BS date input
- All date displays converted to BS format across Inventory + VehicleDetail
- Dashboard shows today's BS date in header ("21 Jestha 2083 BS")

### Dashboard (Module 18 partial)
- KPI cards: Available, Sold, Capital, Profit, Reserved, Customers, Jobs, Total
- Stock Aging bar chart
- Stock Alerts panel (Dead/Slow/Pending)
- **Accounting Summary** with BS-calendar tabs:
  - Today
  - This Month (BS) — filters by current BS month (e.g., Jestha 2083)
  - This Year (BS) — filters by current BS year (2083)
  - Shows: Total Cost, Total Sales, Net Profit

### Backend Endpoints (server.py ~920 lines)
- POST/GET /api/auth/login, /register, /me, /users
- CRUD /api/vehicles, /api/expenses, /api/jobs
- CRUD /api/customers, /api/team, /api/partners, /api/vendors
- GET /api/reports/dashboard
- GET /api/reports/accounting-summary?start_date=&end_date=
- POST /api/ai/suggestions (Gemini)
- POST /api/marketing/generate (Gemini)
- EMI endpoints

### Bug Fixes
- Form field focus loss on mobile (Field/inp/sel moved outside component)
- Form state reset on Cancel/Close/Open
- Year/Engine CC numeric spinner arrows removed (inputMode="numeric")

---

## Pending / In Progress

### P0 — Missing Routes
- `Vendors.jsx`, `Finance.jsx`, `Marketing.jsx`, `EMI.jsx` exist but NOT in App.js or Layout.jsx

### P0 — E2E Testing
- Comprehensive testing not yet run after the backend rewrite

### P1 — AI Features
- AI Pricing Engine (Module 3)
- AI Sales Chatbot (Module 16)
- Nepal Festival Intelligence — Dashain/Tihar modes (Module 17)
- AI endpoint exists at /api/ai/suggestions but frontend not fully integrated

### P1 — QR Code System (Module 15)
- Backend QR data endpoint exists at /vehicles/{id}/qr-data
- Frontend QR generation/display not built

### P1 — Legal Document Tracking (Module 11)
- Document status fields exist (bluebook, insurance, tax, transfer)
- File upload not yet implemented

### P2 — Website Sync (Module 12)
- Webhook structure for hamroauto.com.np sync

### P2 — Marketing Automation (Module 13)
- AI caption generation endpoint exists
- Frontend page exists but not routed

### P2 — Communication Center (Module 14)
- Not started

### P2 — Multi-branch Architecture
- Not started

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
