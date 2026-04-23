# MediScan Admin Panel — Kiro Context File

> Copy this file into the root of your `mediscan-admin` repo.
> When you open a new chat with Kiro, say: "Read KIRO_CONTEXT.md first" — this gives Kiro full context instantly.

---

## What Is This Project?

This is the **MediScan Admin Panel** — a standalone web app for hospital administrators to manage the MediScan platform. It is a plain HTML/CSS/JS project (no build tools, no framework) that connects to Firebase (Firestore + Auth).

It was originally built inside the main `mediscan` repo under an `admin/` folder, then moved to its own repo for separate Netlify deployment.

---

## Firebase Project

- **Project ID**: `mediscan-5534e`
- **Auth Domain**: `mediscan-5534e.firebaseapp.com`
- **Firestore DB**: same project as the patient-facing app
- **Firebase SDK version**: `10.12.0` (loaded from CDN, no npm)

The Firebase config is hardcoded in `js/admin-firebase.js` — no `.env` file needed.

---

## Repo Structure

```
mediscan-admin/
├── index.html              ← Admin login page (entry point)
├── dashboard.html          ← Platform stats (patients, appointments, scans, symptoms)
├── appointments.html       ← View & update all patient appointments
├── patients.html           ← View all registered patients + activity counts
├── doctors.html            ← Add / Edit / Remove doctors (CRUD)
├── css/
│   └── admin.css           ← Full design system (sidebar, cards, badges, modals, toasts)
└── js/
    ├── admin-firebase.js   ← Firebase init + exports all Firestore/Auth helpers
    ├── admin-auth.js       ← Sign in, sign out, role check, route guard
    ├── admin-db.js         ← All Firestore queries (read/write)
    ├── admin-nav.js        ← Sidebar: active link highlight, user info, sign out
    ├── dashboard.js        ← Dashboard page logic
    ├── appointments.js     ← Appointments page logic
    ├── patients.js         ← Patients page logic
    └── doctors.js          ← Doctors page logic
```

---

## How Authentication Works

1. Admin enters email + password on `index.html`
2. `admin-auth.js → adminSignIn()` calls Firebase `signInWithEmailAndPassword`
3. On success, it checks Firestore: `admins/{uid}` must exist with `role: "admin"`
4. If the document doesn't exist → signs out, shows "Access denied. Admin privileges required."
5. If it exists → redirects to `dashboard.html`
6. Every protected page calls `requireAdminAuth()` at load time — redirects to `index.html` if not authenticated

### To Create an Admin User

You need a document in Firestore `admins` collection:
- **Document ID**: the user's Firebase Auth UID
- **Fields**: `role: "admin"`, `email: "..."`, `name: "..."`

Do this via Firebase Console → Firestore → `admins` collection → Add document.
Or use the `create-admin.html` helper page (delete it after use).

---

## Firestore Data Structure

```
admins/
  {uid}/
    role: "admin"
    email: string
    name: string

users/                          ← patient accounts (read-only for admin)
  {userId}/
    displayName: string
    email: string
    createdAt: timestamp
    appointments/
      {appointmentId}/
        patientName: string
        doctorName: string
        date: string            ← ISO date string e.g. "2026-04-23"
        time: string
        status: "pending" | "confirmed" | "cancelled"
    analyses/
      {analysisId}/             ← medical scan results
    symptoms/
      {symptomId}/              ← symptom check results

doctors/
  {doctorId}/
    name: string
    specialty: string
    address: string
    phone: string
    rating: number              ← 1.0 to 5.0
    createdAt: timestamp
```

---

## Firestore Security Rules (in main mediscan repo)

The rules live in `firestore.rules` in the **main mediscan repo** (not here).
Key rule: `isAdmin()` checks if `admins/{uid}` exists for the requesting user.

```javascript
function isAdmin() {
  return request.auth != null &&
         exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}
```

Admins can:
- Read all `users/{userId}` documents
- Read/write all `appointments`, `analyses`, `symptoms` (collectionGroup)
- Read/write `doctors` collection

**To deploy rule changes**: run `firebase deploy --only firestore:rules` from the main mediscan repo.

---

## Design System (admin.css)

| Token | Value |
|-------|-------|
| Sidebar background | `#1e293b` |
| Primary blue | `#2563EB` |
| Danger red | `#ef4444` |
| Success green | `#22c55e` |
| Warning yellow | `#f59e0b` |
| Sidebar collapses at | `768px` |

Badge classes: `.badge-confirmed` (green), `.badge-pending` (yellow), `.badge-cancelled` (red)

---

## Pages & What Each Does

### `index.html` — Login
- Email + password form
- Shows error banner on failed login
- Auto-redirects to `dashboard.html` if already signed in as admin

### `dashboard.html` — Stats
- Shows 4 stat cards: Total Patients, Total Appointments, Total Scans, Symptom Checks
- Fetches counts via `getDashboardStats()` in `admin-db.js`
- Shows skeleton loaders while fetching, "—" on error

### `appointments.html` — Appointments
- Table of all appointments across all patients (collectionGroup query)
- Columns: Patient Name, Doctor, Date, Time, Status, Actions
- Confirm / Cancel buttons update Firestore in real time (optimistic update + rollback on error)
- Client-side search by patient name or doctor name

### `patients.html` — Patients
- Table of all registered users
- Columns: Name, Email, Joined Date, Appointments, Scans, Symptoms
- Sub-collection counts fetched in parallel per patient
- Client-side search by name or email
- Skeleton loader while fetching

### `doctors.html` — Doctors CRUD
- Card grid of all doctors
- "Add Doctor" button opens a modal form
- Each card has Edit (opens pre-filled modal) and Remove (with confirm dialog)
- Form validation: all fields required, rating must be 1.0–5.0
- Toast notifications on success/failure

---

## Key Functions Reference

### `admin-auth.js`
| Function | What it does |
|----------|-------------|
| `adminSignIn({ email, password })` | Signs in + verifies admin role. Returns `{ ok, error }` |
| `verifyAdminRole(uid)` | Checks `admins/{uid}` exists with `role === 'admin'` |
| `requireAdminAuth()` | Route guard — redirects to login if not admin. Returns admin user object |
| `adminSignOut()` | Signs out + redirects to `index.html` |
| `getAdminUser()` | Returns `{ uid, email, name }` of current user |
| `mapAuthError(code)` | Maps Firebase error codes to human-readable strings |

### `admin-db.js`
| Function | What it does |
|----------|-------------|
| `getDashboardStats()` | Returns `{ users, appointments, analyses, symptoms }` counts |
| `getAllAppointments()` | CollectionGroup query, ordered by date desc, enriched with `userId` |
| `updateAppointmentStatus(userId, appointmentId, status)` | Updates appointment status field |
| `getAllPatients()` | All docs from `users` collection |
| `getPatientCounts(userId)` | Sub-collection sizes for one patient |
| `getAllDoctors()` | All docs from `doctors` collection |
| `addDoctor(data)` | Creates new doctor doc, returns new ID |
| `updateDoctor(doctorId, data)` | Merge update on doctor doc |
| `deleteDoctor(doctorId)` | Deletes doctor doc |

### `admin-nav.js`
| Function | What it does |
|----------|-------------|
| `initNav(adminUser)` | Call on every protected page — sets active link, populates sidebar user, wires sign out + hamburger |

---

## What Is Complete ✅

- Admin login with role verification
- Dashboard with live stats
- Appointments management (view, confirm, cancel, search)
- Patients list (with sub-collection counts, search, skeleton loader)
- Doctors CRUD (add, edit, delete, form validation, toasts)
- Sidebar navigation with active state, mobile hamburger
- Firestore security rules

---

## What Still Needs Doing ⚠️

1. **Create the first admin user** — no admin document exists in Firestore yet.
   - Go to Firebase Console → Firestore → create `admins/{your-uid}` with `role: "admin"`
   - OR open `create-admin.html` in browser to do it via form (delete after use)

2. **Deploy to Netlify**:
   - Connect this repo to Netlify
   - Build command: *(leave empty)*
   - Publish directory: `.`

3. **Optional — property tests** (marked with `*` in the original spec tasks):
   - Tests for `verifyAdminRole`, `mapAuthError`, `getDashboardStats`, filter functions, form validation, etc.
   - These are nice-to-have, not blocking

4. **Optional — real-time updates**:
   - Currently all data is fetched once on page load
   - Could add Firestore `onSnapshot` listeners for live updates without refresh

5. **Optional — pagination**:
   - Patient and appointment lists load all documents at once
   - For large datasets, add Firestore pagination with `limit()` + `startAfter()`

---

## Common Issues & Fixes

| Problem | Cause | Fix |
|---------|-------|-----|
| "Access denied. Admin privileges required." | No `admins/{uid}` doc in Firestore | Create the doc via Firebase Console |
| Blank page / redirect loop | `requireAdminAuth()` failing silently | Check browser console for Firebase errors |
| Stats show "—" | Firestore security rules blocking collectionGroup reads | Check rules allow `isAdmin()` for collectionGroup paths |
| Doctors not loading | `doctors` collection empty or rules blocking | Add a doctor via the form, check rules |
| Appointments table empty | No appointments in Firestore yet | Have a patient book an appointment in the main app first |

---

## Netlify Deployment Notes

- No build step needed — pure static HTML
- Set publish directory to `.` (repo root)
- No environment variables needed (Firebase config is in `js/admin-firebase.js`)
- Suggested site name: `mediscan-admin` → `mediscan-admin.netlify.app`

---

## Related Repos

| Repo | URL | Purpose |
|------|-----|---------|
| `mediscan` | your-main-repo | Patient-facing app + Firestore rules |
| `mediscan-admin` | this repo | Admin panel (this file) |

Both share Firebase project `mediscan-5534e`.
