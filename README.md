# SchoolHub Mobile

React Native (Expo) + TypeScript client for the **SchoolHub** school-management platform.
It is a feature-for-feature port of the SchoolHub web frontend and talks to the **same
ASP.NET Core backend** — no separate API, no mock data.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Expo SDK 57 / React Native 0.86 |
| Language | TypeScript (strict) |
| Navigation | `@react-navigation/native` + `native-stack`, with a custom drawer shell |
| Token storage | `expo-secure-store` (Keychain / Keystore) |
| Icons | `@expo/vector-icons` (Feather family) |

---

## Getting started

```bash
npm install
cp .env.example .env     # then set EXPO_PUBLIC_API_BASE_URL
npm start
```

### Environment

`.env` is **git-ignored**; only `.env.example` is tracked.

```ini
EXPO_PUBLIC_API_BASE_URL=http://localhost:5000
```

Point this at your backend origin. Controller routes already include the `api/`
prefix, so the value must **not** end in `/api`.

> **Android emulator:** use `http://10.0.2.2:5000` — `localhost` resolves to the
> emulator itself, not your development machine.
>
> **Physical device:** use your machine's LAN IP (e.g. `http://192.168.1.10:5000`)
> and ensure the API allows the origin.

---

## Architecture

```
src/
  api/          # one module per backend controller; all go through client.ts
  components/
    common/     # Button, Card, Input, Modal, Select, Badge, Screen, ListPanel...
    dashboard/  # StatCard, ActivityPanel, AnnouncementsPanel
    layout/     # TopBar, Drawer, PageHeader
  context/      # AuthContext (JWT session)
  hooks/        # useAsync, useDebouncedValue
  lib/          # formatting helpers
  navigation/   # AppShell, navItems (role gates), NavigationContext, types
  screens/      # one folder per feature
  theme/        # colors, tokens, shared styles
```

### Navigation model

The web app uses a collapsible sidebar. A sidebar does not map cleanly to a phone,
so the mobile shell presents the **same items as a slide-in drawer**, opened from
the top bar. `navItems.ts` is the single source of truth for labels, icons and
**role permissions**, mirroring the web `data/navigation.ts` exactly — including
which pages are hidden (Profile) and which are Admin-only.

`AppShell` renders the active screen from a `SCREENS` route table. Any route not
yet ported falls back to a `ComingSoon` panel, so the drawer is always navigable.

### Auth & session

`api/client.ts` mirrors the web `lib/api.ts`:

- Bearer token from `expo-secure-store` on every request.
- A `401` triggers **one** silent refresh via `/api/auth/refresh`, then replays the
  original request once. Refreshes are de-duplicated behind a single in-flight
  promise, because the backend **rotates** refresh tokens and parallel refreshes
  would invalidate each other.
- If refresh fails, a session-expired event clears the auth state and the app
  returns to the login screen.

### Theme

Ported 1:1 from the web `index.css` `@theme` block — the `ink` text ramp, `line` /
`lineSoft` / `canvas` surfaces, and the `mint` brand ramp. Status pills, card
borders and active-nav gradients use the same values, so the two clients are
visually identical.

---

## Features

Legend: done = ported and wired · todo = not yet ported

| Module | Roles | Status |
| --- | --- | --- |
| Login / Register | all | done |
| School Overview (admin dashboard) | Admin | done |
| Teacher / Student / Parent dashboards | respective | done |
| Student Info | Admin, Teacher | done |
| Teachers | Admin | done |
| Academics (classes, sections, subjects) | Admin, Teacher | done |
| Timetable | all | done |
| Attendance | all | done |
| Examinations | Admin, Teacher, Student | done |
| Assignments | Admin, Teacher, Student | done |
| Fees Collection | Admin | done |
| Communicate (announcements + inbox) | all | done |
| Events | all | done |
| Reports | Admin | todo |
| Audit Logs | Admin | todo |
| My Profile | all | done |

---

## Scripts

```bash
npm start      # Expo dev server
npm run android
npm run ios
npx tsc --noEmit   # typecheck
```