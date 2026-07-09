# YIS LMS — Frontend Developer Guide

## Overview

YIS LMS (Learning Management System) is a school-focused platform that manages the full academic workflow:

```
Master Data → Curriculum → Weekly Lesson Plans → HOD Review → Timetable → Dashboards
```

### Roles

| Role    | Responsibilities |
|---------|-----------------|
| ADMIN   | Manages users, lookup data (grades/subjects/semesters), curriculum entries, roster (timetable slots) |
| HOD     | Reviews submitted lesson plans — approves or rejects with comments |
| TEACHER | Creates and submits weekly lesson plans; constrained to their roster assignments |

---

## Tech Stack (Recommended)

| Concern           | Choice |
|-------------------|--------|
| Framework         | React 18 (JavaScript) |
| Build tool        | Vite |
| Routing           | React Router v6 |
| Auth / UI State   | React Context + useReducer |
| Server State      | TanStack Query v5 |
| HTTP client       | Axios (with interceptor for JWT) |
| UI                | Shadcn/ui + Tailwind CSS |
| Forms             | React Hook Form |
| Tables            | TanStack Table v8 |
| Notifications     | Sonner (toast) |
| Date/time         | Day.js |
| Charts            | Recharts |

---

## Quick Start

```bash
# From the repo root
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL=http://localhost:5000/api
npm run dev
```

---

## Environment Variables

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Documentation Map

| File | Contents |
|------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Folder structure, routing strategy, state layers |
| [AUTH.md](./AUTH.md) | Login flow, JWT storage, role guards |
| [API_REFERENCE.md](./API_REFERENCE.md) | Every endpoint — method, path, body, response |
| [PAGES_AND_ROUTES.md](./PAGES_AND_ROUTES.md) | All pages, URL paths, role access |
| [COMPONENTS.md](./COMPONENTS.md) | Shared/reusable component specs |
| [features/MASTER_DATA.md](./features/MASTER_DATA.md) | Grade / Subject / Semester lookup management |
| [features/USERS.md](./features/USERS.md) | Admin user management |
| [features/CURRICULUM.md](./features/CURRICULUM.md) | Curriculum entry management |
| [features/ROSTER.md](./features/ROSTER.md) | Teacher roster / schedule assignment |
| [features/LESSON_PLANS.md](./features/LESSON_PLANS.md) | Teacher lesson plan creation & HOD review flow |
| [features/TIMETABLE.md](./features/TIMETABLE.md) | Timetable (Brown Sheet) generation & view |
| [features/DASHBOARDS.md](./features/DASHBOARDS.md) | Dashboards, reporting, compliance alerts |
