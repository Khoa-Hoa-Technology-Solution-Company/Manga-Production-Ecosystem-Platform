# AGENTS.md — Manga Production Ecosystem Platform

Operating instructions for AI coding agents. Read this file before every task.

---

## 0. Project overview

**MangaFlow** is a manga production workflow platform. It has three apps in a single monorepo:

| App | Path | Description |
|-----|------|-------------|
| **BE** | `BE/` | REST API + WebSocket server |
| **FE** | `FE/` | Web dashboard (studio, reader hub, editor portal) |
| **MB** | `MB/` | Mobile companion app (reader + studio) |

Live deployment: https://manga-production-ecosystem-platform-web.onrender.com/

---

## 1. Stack

### Backend (`BE/`)
- **Runtime**: Node.js 22, TypeScript (ES2022, CommonJS)
- **Framework**: Express 4
- **Database**: MongoDB via Mongoose 8
- **Auth**: JWT (jsonwebtoken + bcryptjs), RBAC middleware
- **Realtime**: Socket.IO 4
- **File storage**: Local uploads + Cloudflare R2 (S3-compatible via @aws-sdk/client-s3)
- **Validation**: express-validator
- **API docs**: Swagger (swagger-jsdoc + swagger-ui-express)
- **Security**: helmet, express-rate-limit, CORS

### Frontend (`FE/`)
- **Framework**: React 19, TypeScript
- **Bundler**: Vite 8
- **Styling**: Tailwind CSS 4 (via `@tailwindcss/vite` plugin)
- **Routing**: react-router-dom 7
- **HTTP client**: Axios
- **Icons**: lucide-react
- **i18n**: i18next + react-i18next (en, vi)
- **Realtime**: socket.io-client
- **Canvas**: Fabric.js 7 (studio workspace)

### Mobile (`MB/`)
- **Framework**: React Native 0.83 + Expo SDK 55
- **Routing**: expo-router (file-based)
- **State**: React context (AuthProvider)
- **Icons**: lucide-react-native
- **Storage**: @react-native-async-storage/async-storage
- **Navigation**: @react-navigation (bottom tabs)
- **Path alias**: `@/*` → `./src/*`, `@/assets/*` → `./assets/*`

> **Expo version matters.** Always reference https://docs.expo.dev/versions/v55.0.0/ before writing MB code. API surfaces change between SDK versions.

---

## 2. Layout

```
Manga-Production-Ecosystem-Platform/
├── BE/                          # Backend
│   └── src/
│       ├── app.ts               # Express app setup (middleware, routes)
│       ├── server.ts            # HTTP + Socket.IO bootstrap
│       ├── config/              # env.ts, db.ts, swagger.ts
│       ├── models/              # Mongoose schemas (User, Series, Chapter, Page, Task, Zone, Annotation, Comment, Vote, Notification)
│       ├── controllers/         # Request handlers (*.controller.ts)
│       ├── routes/              # Express routers (*.routes.ts)
│       ├── middleware/           # auth, rbac, chapterAccess, errorHandler, upload, validate
│       ├── services/            # notification, storage (R2), workflow
│       ├── socket/              # Socket.IO event handlers
│       └── utils/               # jwt, seed
├── FE/                          # Web frontend
│   └── src/
│       ├── App.tsx              # Router + layout composition
│       ├── main.tsx             # Entry point
│       ├── index.css            # Global styles
│       ├── components/
│       │   ├── layout/          # Shell, Sidebar, Footer, ProtectedRoute
│       │   ├── sections/        # Page-level components (DashboardPage, StudioPage, etc.)
│       │   ├── ui/              # Reusable primitives (Button, etc.)
│       │   └── utils/           # Utility components
│       ├── lib/                 # api.ts (Axios), auth.tsx (context), socket.ts
│       ├── i18n/                # en.json, vi.json, index.ts
│       └── assets/
├── MB/                          # Mobile app
│   └── src/
│       ├── app/                 # expo-router pages (_layout, index, login, explore, studio, read/)
│       ├── components/          # UI components, animated-icon, app-tabs
│       ├── lib/                 # api.ts, auth.tsx
│       ├── constants/
│       ├── hooks/
│       └── global.css
├── .github/workflows/ci.yml    # CI: build FE + BE, lint FE + MB
├── package.json                 # Root scripts (dev:fe, dev:be, dev:mb, etc.)
└── .env.example                 # All env vars documented
```

### Do not modify
- `node_modules/`, `dist/`, `.expo/`, `uploads/` — generated/runtime directories
- `BE/src/config/swagger.ts` — large auto-maintained Swagger spec, edit only if adding/changing API endpoints
- `.github/workflows/ci.yml` — unless specifically asked to change CI

---

## 3. Commands

All commands run from project root unless noted.

| Action | Command |
|--------|---------|
| **FE dev** | `npm run dev:fe` |
| **FE build** | `npm run build:fe` |
| **FE lint** | `npm run lint:fe` |
| **BE dev** | `npm run dev:be` |
| **BE build** | `cd BE && npm run build` |
| **BE seed** | `npm run seed:be` |
| **MB start** | `npm run dev:mb` |
| **MB lint** | `npm run lint:mb` |
| **Install deps (per app)** | `cd <APP> && npm install` |

- FE dev server: `http://localhost:5173`
- BE API server: `http://localhost:3000`
- Swagger docs: `http://localhost:3000/api-docs`
- Health check: `GET /api/health`

---

## 4. Domain model

### User roles (RBAC)
| Role | Description |
|------|-------------|
| `mangaka` | Series owner. Creates series, chapters, assigns tasks. Full studio access. |
| `assistant` | Production helper. Works on assigned tasks (drawing, inking, coloring, etc.). |
| `editor` | Reviews and approves manuscripts. Has editor portal access. |
| `editorial_board` | Senior editorial oversight. |
| `reader` | Reads published chapters. Basic access only. |

### Core entities
- **Series** → has many **Chapters** → has many **Pages**
- **Pages** → has many **Zones** (regions on a page for collaborative editing)
- **Zones** → has many **Annotations** (review feedback on specific areas)
- **Chapters** → has many **Tasks** (production workflow items)
- **Chapters** → has **Votes** and **Comments** (reader engagement)
- **Users** → receives **Notifications** (realtime via Socket.IO)

### Auth flow
1. `POST /api/auth/register` or `POST /api/auth/login` → returns JWT
2. All protected routes use `authenticate` middleware → reads `Bearer` token → attaches `req.user`
3. Role checks via `authorize(...roles)` middleware
4. Chapter-level access via `chapterAccess` middleware

---

## 5. Conventions

### Naming
- **BE models**: PascalCase singular (`User.ts`, `Chapter.ts`)
- **BE controllers**: `<entity>.controller.ts`
- **BE routes**: `<entity>.routes.ts`
- **BE middleware**: camelCase (`auth.ts`, `rbac.ts`, `errorHandler.ts`)
- **BE services**: `<entity>.service.ts`
- **FE pages**: PascalCase with `Page` suffix (`DashboardPage`, `StudioPage`)
- **FE components**: PascalCase (`Sidebar.tsx`, `Shell.tsx`)
- **MB screens**: lowercase file names in `src/app/` (expo-router convention)
- **MB components**: kebab-case files (`app-tabs.tsx`, `animated-icon.tsx`)

### Import style
- **BE**: Named exports for middleware/utils, default export for Express app
- **FE**: Named exports for components, default export for `App`
- **MB**: `@/*` path alias for `src/*` imports

### Error handling
- **BE**: Central `errorHandler` middleware catches all. Controllers return early with `res.status(xxx).json({ error: '...' })` and `return`.
- Controllers use `async` functions with try/catch. Errors are not thrown — they are returned as JSON responses.

### API conventions
- All API routes prefixed with `/api/`
- JSON request/response bodies
- Error shape: `{ error: string }`
- Auth errors: 401. Permission errors: 403. Validation: 400. Duplicates: 409. Server: 500.

### Frontend auth pattern
- `useAuth()` hook from `lib/auth.tsx` (React context)
- `ProtectedRoute`, `ProtectedReaderRoute`, `ProtectedMangakaRoute`, `ProtectedEditorRoute` wrappers
- Socket connects on auth, disconnects on logout

### Mobile auth pattern
- `AuthProvider` wraps entire app in `_layout.tsx`
- `useAuth()` hook returns `{ isAuthenticated, loading, ... }`
- Shows `LoginScreen` when unauthenticated, `AppTabs` when authenticated

### Environment variables
- **BE**: Direct `process.env` via `config/env.ts` (centralized)
- **FE**: `VITE_` prefix (Vite convention)
- **MB**: `EXPO_PUBLIC_` prefix (Expo convention)

---

## 6. Testing

No test framework is currently set up. CI runs build and lint only.

If adding tests:
- Use Vitest for FE (already on Vite)
- Use Jest for BE
- Use Jest + React Native Testing Library for MB

---

## 7. Deployment

- FE is deployed on Render (static site build)
- BE is deployed on Render (Node.js service)
- File storage: local `uploads/` dir for dev, Cloudflare R2 for production
- MongoDB: connection string via `MONGODB_URI` env var

---

## 8. Common pitfalls

- **CORS**: BE allows localhost origins + any `192.168.*` origin. When adding a new deployed domain, add it to `CORS_ORIGIN` env var (comma-separated).
- **Helmet**: `crossOriginResourcePolicy` is set to `cross-origin` so FE can load images from BE. Don't remove this.
- **Rate limiting**: 200 requests per 15 minutes on `/api/`. Increase if load testing.
- **Body size**: JSON body limit is 10MB. File uploads go through multer with a 50MB limit.
- **Password field**: `select: false` on User schema. Must explicitly `.select('+password')` when comparing passwords.
- **Socket.IO**: Server is attached to the same HTTP server as Express. Events are in `BE/src/socket/index.ts`.
- **Tailwind v4**: FE uses Tailwind 4 with the Vite plugin (`@tailwindcss/vite`), not the PostCSS plugin. No `tailwind.config.js` — configuration is done in CSS.
- **Expo SDK 55**: MB uses Expo SDK 55. Check versioned docs before using any Expo API.

---

## 9. Forbidden

- Do not add an ORM on top of Mongoose. The project uses Mongoose directly.
- Do not switch from Tailwind to another CSS framework in FE.
- Do not add Redux, Zustand, or other state management in FE/MB — both use React context.
- Do not change the monorepo structure (moving FE/BE/MB into a `packages/` dir, adding workspaces, etc.) unless explicitly asked.
- Do not install Prettier project-wide — there is no shared formatting config.

---

## 10. Project Learnings

- (empty — append corrections here as one-liners)
