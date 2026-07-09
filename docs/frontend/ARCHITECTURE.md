# Frontend Architecture

## Folder Structure

```
frontend/
├── public/
├── src/
│   ├── api/                        # Axios instance + per-resource API functions
│   │   ├── axios.js                # Base instance with JWT interceptor
│   │   ├── auth.api.js
│   │   ├── lookup.api.js
│   │   ├── curriculum.api.js
│   │   ├── roster.api.js
│   │   ├── lessonPlan.api.js
│   │   ├── timetable.api.js        # (future endpoint)
│   │   └── dashboard.api.js        # (future endpoint)
│   │
│   ├── components/                 # Shared/reusable UI components
│   │   ├── ui/                     # Shadcn primitives (auto-generated)
│   │   ├── layout/
│   │   │   ├── AppShell.jsx        # Sidebar + topbar wrapper
│   │   │   ├── Sidebar.jsx
│   │   │   └── Topbar.jsx
│   │   ├── DataTable.jsx           # Generic TanStack Table wrapper
│   │   ├── StatusBadge.jsx         # DRAFT / SUBMITTED / APPROVED / REJECTED
│   │   ├── ConfirmDialog.jsx
│   │   ├── FormField.jsx           # RHF error wrapper
│   │   └── PageHeader.jsx
│   │
│   ├── context/
│   │   └── AuthContext.jsx         # Auth state via React Context + useReducer
│   │
│   ├── features/                   # Feature-sliced modules
│   │   ├── auth/
│   │   │   └── LoginPage.jsx
│   │   ├── master-data/
│   │   │   ├── LookupListPage.jsx
│   │   │   └── LookupFormModal.jsx
│   │   ├── users/
│   │   │   ├── UserListPage.jsx
│   │   │   └── UserCreateModal.jsx
│   │   ├── curriculum/
│   │   │   ├── CurriculumListPage.jsx
│   │   │   ├── CurriculumFormPage.jsx
│   │   │   └── CurriculumDetailPage.jsx
│   │   ├── roster/
│   │   │   ├── RosterListPage.jsx
│   │   │   └── RosterFormModal.jsx
│   │   ├── lesson-plans/
│   │   │   ├── LessonPlanListPage.jsx
│   │   │   ├── LessonPlanFormPage.jsx
│   │   │   ├── LessonPlanDetailPage.jsx
│   │   │   └── ReviewModal.jsx
│   │   ├── timetable/
│   │   │   ├── TimetablePage.jsx
│   │   │   └── TimetableFilters.jsx
│   │   └── dashboards/
│   │       ├── AdminDashboard.jsx
│   │       ├── HodDashboard.jsx
│   │       └── TeacherDashboard.jsx
│   │
│   ├── hooks/
│   │   ├── useAuth.js              # Consumes AuthContext
│   │   └── useLookups.js           # Fetches all lookup types
│   │
│   ├── router/
│   │   ├── index.jsx               # createBrowserRouter definition
│   │   ├── ProtectedRoute.jsx      # Auth + role guard wrapper
│   │   └── routes.js               # Route path constants
│   │
│   ├── utils/
│   │   ├── formatDate.js
│   │   └── cn.js                   # Tailwind class merger
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env.example
├── index.html
├── tailwind.config.js
└── vite.config.js
```

---

## State Layers

### 1. Auth State — React Context + useReducer

All auth state (token, user, role) lives in `AuthContext`. Persisted to `localStorage` manually on each dispatch.

```jsx
// src/context/AuthContext.jsx
import { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext(null);

const initialState = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return { token: action.payload.token, user: action.payload.user };

    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return { token: null, user: null };

    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = (token, user) => dispatch({ type: 'LOGIN', payload: { token, user } });
  const logout = () => dispatch({ type: 'LOGOUT' });

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

Wrap the app:
```jsx
// src/main.jsx
import { AuthProvider } from './context/AuthContext';

root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);
```

### 2. Server State — TanStack Query

All API calls go through `useQuery` / `useMutation`. Query keys follow the pattern:

```js
['lookup', type]          // e.g. ['lookup', 'GRADE']
['curriculum', filters]
['lessonPlans', filters]
['roster', filters]
```

Invalidate on mutation:
```js
queryClient.invalidateQueries({ queryKey: ['curriculum'] });
```

### 3. UI State — local `useState`

Modal open/close, form dirty state, selected row — kept local to the component.

---

## Axios Instance + JWT Interceptor

The Axios interceptor reads the token from `localStorage` directly (no store import needed).

```js
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

---

## Routing Strategy

All authenticated routes live under `<AppShell>`. Role-specific tabs are hidden via `useAuth()` — the backend still enforces permissions independently.

```
/login                          (public)
/                               → redirect to /dashboard
/dashboard                      (all roles)
/master-data                    (ADMIN only)
/users                          (ADMIN only)
/curriculum                     (ADMIN only)
/curriculum/new                 (ADMIN only)
/curriculum/:id/edit            (ADMIN only)
/roster                         (ADMIN only)
/lesson-plans                   (TEACHER + HOD + ADMIN)
/lesson-plans/new               (TEACHER only)
/lesson-plans/:id               (all roles)
/lesson-plans/:id/edit          (TEACHER only — DRAFT status)
/timetable                      (all roles)
/reports                        (ADMIN + HOD)
```

---

## useAuth Hook

Used everywhere to read auth state and role:

```js
// src/hooks/useAuth.js
// Re-export from context for convenience
export { useAuth } from '../context/AuthContext';
```

Usage in components:
```jsx
import { useAuth } from '../hooks/useAuth';

function Sidebar() {
  const { user } = useAuth();

  return (
    <nav>
      {user?.role === 'ADMIN' && <NavItem to="/master-data" label="Master Data" />}
      {user?.role === 'ADMIN' && <NavItem to="/curriculum" label="Curriculum" />}
      <NavItem to="/lesson-plans" label="Lesson Plans" />
    </nav>
  );
}
```

Role helper (optional, avoids repeated string comparisons):
```js
// src/hooks/useRole.js
import { useAuth } from './useAuth';

export function useRole() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    role,
    isAdmin:      role === 'ADMIN',
    isHod:        role === 'HOD',
    isTeacher:    role === 'TEACHER',
    isAdminOrHod: role === 'ADMIN' || role === 'HOD',
  };
}
```

---

## Form Validation

React Hook Form only (no Zod). Use built-in validation rules:

```jsx
const { register, handleSubmit, formState: { errors } } = useForm();

<input
  {...register('standardCode', { required: 'Standard code is required' })}
/>
{errors.standardCode && <p className="text-red-500 text-sm">{errors.standardCode.message}</p>}
```

For select fields (LookupSelect), use `Controller`:
```jsx
<Controller
  name="gradeId"
  control={control}
  rules={{ required: 'Grade is required' }}
  render={({ field }) => (
    <LookupSelect type="GRADE" value={field.value} onChange={field.onChange} />
  )}
/>
```
