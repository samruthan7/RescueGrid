# RescueGrid

> **Emergency Incident Reporting & Monitoring Platform**  
> Built for **Code Clash 2026, Round 1: "Emergency Incident Reporting & Monitoring"**

RescueGrid bridges on-the-ground citizens and municipal disaster response authorities in real time. Citizens submit emergency incidents with geolocation and danger context, while an autonomous rule-based severity engine classifies threat levels. Incident commanders monitor real-time queues, dispatch statuses, and analytical charts in a dark gold emergency theme.

---

## Tech Stack & Architecture

- **Frontend**: React 18, Vite, Tailwind CSS (Black & Gold Theme), React Router v6, Axios, Recharts, Lucide React
- **3D Hero**: Three.js via `@react-three/fiber` and `@react-three/drei` (rotates slowly with `prefers-reduced-motion` accessible fallbacks)
- **Backend**: Node.js + Express REST API (CORS, Helmet, Morgan, Express-Rate-Limit)
- **Storage**: Persistent JSON file repository (`backend/data/incidents.json`) accessed strictly via `backend/repository.js` (zero-database dependency, 100% Windows compatible)
- **Security & Triage**: JWT Bearer auth for authority endpoints, rate-limited public reporting, pure rule-based severity scoring algorithm

---

## Quick Start (Windows PowerShell / CMD)

### 1. Prerequisites
- **Node.js**: v18+ (tested and verified on Node.js v24.21.0 & npm 11)

### 2. Install Dependencies

In **Terminal 1** (Backend):
```powershell
cd backend
npm install
```

In **Terminal 2** (Frontend):
```powershell
cd frontend
npm install
```

### 3. Seed Database & Run Unit Tests
```powershell
cd backend
npm run seed
npm test
```
*Inserts 12 realistic sample incidents across all 6 disaster categories and 4 severities.*

### 4. Start Applications

**Start Backend (Port 5000):**
```powershell
cd backend
npm start
```
*API runs at `http://localhost:5000`*

**Start Frontend (Port 5173):**
```powershell
cd frontend
npm run dev
```
*Open `http://localhost:5173` in your browser.*

---

## Authority Demo Credentials

Configured in `backend/.env`:
- **Username**: `admin`
- **Password**: `rescuegrid2026!`
- **Login URL**: `http://localhost:5173/authority/login` *(Use the 1-click "Quick Fill Demo Credentials" button)*

---

## 10-Point Deliverable Checklist

| # | Deliverable Requirement | Status | Verification Detail |
|---|-------------------------|--------|---------------------|
| 1 | **Emergency Reporting** | Passed | Citizen portal at `/report` with Title (min 5 chars), Description (min 20 chars with counter), Category cards, People Affected counter, and Contact inputs. |
| 2 | **GPS Geolocation** | Passed | One-click "Use my current location" via Geolocation API with graceful denial fallback; records latitude and longitude coordinates. |
| 3 | **Contextual Risk Questions** | Passed | Includes "Are people trapped?", "Is anyone in immediate danger?", and "Are there injuries?" labeled *unverified, as reported by you*. |
| 4 | **Data Persistence** | Passed | Incidents are saved atomically to `backend/data/incidents.json` via `backend/repository.js`, persisting across server restarts. |
| 5 | **Rule-Based Severity Engine** | Passed | `backend/severity.js` deterministically calculates score (0-3 Low, 4-6 Medium, 7-9 High, 10+ Critical) with keyword detection and override rules; verified with 8 unit tests. |
| 6 | **Citizen Confirmation & Tracking** | Passed | `/report/success/:id` and `/track` show Incident ID, severity badge, score, itemized reasons, status timeline, and the mandatory 112 disclaimer notice. |
| 7 | **Safe Field Sanitization** | Passed | Public tracking endpoint omits personal contact details; text inputs stripped of harmful scripts. |
| 8 | **Authority Authentication** | Passed | `/authority/login` authenticates credentials and issues signed JWT token protecting all `/api/admin/*` routes. |
| 9 | **Interactive Command Dashboard** | Passed | `/authority` displays 3D-tilt stat cards, 6-category Recharts bar chart, severity distribution chart, searchable/filterable table, and 15-second auto-refresh. |
| 10 | **Incident Lifecycle Management**| Passed | Slide-over panel allows updating status (Reported, Pending, In Progress, Resolved) with audit timeline, severity override, OSM map link, and deletion modal. |

---

## 2-Minute Demo Walkthrough Script

1. **Step 1: Open Public Landing Page (`http://localhost:5173/`)**
   - Point out the 3D rotating wireframe globe hero, the persistent 112 emergency banner, and the 3D tilt effect on the portal cards.
2. **Step 2: Submit a Critical Emergency (`/report`)**
   - Click **"Report an Emergency"**.
   - Select category: **"Building Collapse"**.
   - Enter title: `Partial structural collapse at North Station concourse`.
   - Enter description: `Main concrete pillar cracked. 7 shoppers trapped under debris, toxic gas leak odor reported.`.
   - Enter People Affected: `7`.
   - Set "Are people trapped?": **Yes**.
   - Set "Immediate danger to life?": **Yes**.
   - Click **"Use my current location"** or enter address: `4th & Market St, North Entrance`.
   - Click **"Submit Emergency Report"**.
3. **Step 3: Review Real-Time Algorithmic Triage (`/report/success/:id`)**
   - Observe the **Critical** badge with pulsing indicator.
   - Note the breakdown of reasons (e.g. *Building Collapse (+3)*, *People trapped (+3)*, *Critical keyword 'trapped' (+2)*, *Gas leak critical override*).
   - Copy the generated Incident ID (e.g. `INC-XXXXX`).
4. **Step 4: Public Tracking Verification (`/track`)**
   - Click **"Track Incident"** in the top navigation.
   - Paste the ID and search: confirm severity score, reasons, and status timeline appear without exposing private phone numbers or emails.
5. **Step 5: Authority Login (`/authority/login`)**
   - Click **"Authority Login"**.
   - Click **"Quick Fill Demo Credentials"** (`admin` / `rescuegrid2026!`) and sign in.
6. **Step 6: Dashboard Triage & Monitoring (`/authority`)**
   - Point out the top 3D-tilt stat cards and the gold Recharts category and severity charts.
   - Observe the newly reported Critical incident automatically positioned at the top of the table with red highlights.
   - Test the category, severity, and text search filters.
7. **Step 7: Incident Management & Lifecycle Updates**
   - Click **"Manage"** on your reported incident to open the management panel.
   - Click **"View Map"** to verify OpenStreetMap link.
   - Change Status to **"In Progress"** with note `Emergency Rescue Squad 3 dispatched` and click **"Update Status"**.
   - Click **"Override Severity"**, set to **"High"** with justification `Perimeter stabilized by on-scene battalion chief`, and apply.
   - Notice the toast confirmation and both the original and overridden severities logged in the audit trail.
8. **Step 8: Delete Report**
   - Scroll to the bottom of the panel, click **"Delete Report"**.
   - Confirm in the modal prompt (`"This cannot be undone"`).
   - Verify the incident is removed and stats update immediately.
