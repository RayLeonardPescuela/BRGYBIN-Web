# BRGYBIN — Admin Web Portal

Web administration site for the BRGYBIN barangay waste-management app.
**Main Admin only** — collectors and residents are blocked from signing in.

Built with **React + Vite + React Router** and the Firebase compat SDK
(same project `brngybindb` as the mobile app).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs to dist/
npm run preview
```

## Pages

| Route            | Feature                                             |
| ---------------- | --------------------------------------------------- |
| `/login`         | Email/password login, forgot-password, admin guard  |
| `/`              | Dashboard: stats, next pickup, recent complaints    |
| `/schedules`     | Month calendar + collection/cleaning schedule CRUD  |
| `/complaints`    | Complaints & pickup requests, resolve/complete      |
| `/users`         | Users + roles (Main Admin / Collector / User) & sitios |
| `/rewards`       | Reward items CRUD + point QR generator + collector QR presets |
| `/announcements` | Rotating home-screen banner CRUD                    |
| `/notifications` | Push notification composer (all or per sitio)       |

## Notes

- `src/config/roles.js` mirrors `BRNGYBIN/config/roles.js` — keep both in sync.
- `src/config/firebase.js` mirrors `BRNGYBIN/config/firebase.js`.
- Firestore security rules live in `BRNGYBIN/firestore.rules` (paste into the
  Firebase console → Firestore → Rules).
- Deploy later with Firebase Hosting (`firebase deploy --only hosting`).
