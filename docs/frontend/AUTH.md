# Authentication & Authorization

## Login Flow

```
User fills /login form
    │
    ▼
POST /auth/login
    │
    ├── 401 → show "Invalid credentials" toast
    │
    └── 200 → call login(token, user) from AuthContext
             → stored in localStorage + context state
             → redirect to /dashboard
```

## AuthContext

Defined in `src/context/AuthContext.jsx`. See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full implementation.

**Exposed values via `useAuth()`**:

| Value | Type | Description |
|-------|------|-------------|
| `token` | string \| null | JWT from backend |
| `user` | object \| null | `{ id, name, email, role }` |
| `login(token, user)` | function | Stores auth in context + localStorage |
| `logout()` | function | Clears auth from context + localStorage |

---

## LoginPage

```jsx
// src/features/auth/LoginPage.jsx
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { loginUser } from '../../api/auth.api';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (data) => {
    try {
      const res = await loginUser(data);
      login(res.token, res.user);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register('email', { required: 'Email is required' })}
        type="email"
        placeholder="Email"
      />
      {errors.email && <p>{errors.email.message}</p>}

      <input
        {...register('password', { required: 'Password is required' })}
        type="password"
        placeholder="Password"
      />
      {errors.password && <p>{errors.password.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## ProtectedRoute

```jsx
// src/router/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, user } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

Usage in router:
```jsx
<Route path="/curriculum" element={
  <ProtectedRoute allowedRoles={['ADMIN']}>
    <CurriculumListPage />
  </ProtectedRoute>
} />
```

---

## Logout

```jsx
const { logout } = useAuth();

// Call from Topbar logout button:
const handleLogout = () => {
  logout();
  navigate('/login');
};
```

The Axios interceptor also triggers logout automatically on any `401` response (clears localStorage + redirects to `/login`).

---

## Sidebar Navigation — Role Visibility Matrix

| Nav Item        | ADMIN | HOD | TEACHER |
|-----------------|:-----:|:---:|:-------:|
| Dashboard       | ✓     | ✓   | ✓       |
| Master Data     | ✓     |     |         |
| Users           | ✓     |     |         |
| Curriculum      | ✓     |     |         |
| Roster          | ✓     |     |         |
| Lesson Plans    | ✓     | ✓   | ✓       |
| Timetable       | ✓     | ✓   | ✓       |
| Reports         | ✓     | ✓   |         |

---

## JWT Details

- Expiry: **8 hours** (set by backend)
- On expiry the server returns `401` → Axios interceptor clears localStorage and redirects to `/login`
- No refresh token mechanism — user must log in again

---

## First-Run Setup

On first deployment, no users exist. Call `POST /auth/register` with any credentials — the system auto-assigns `ADMIN` to the first account. Subsequent registrations are `HOD` or `TEACHER` only, or the admin creates users via `POST /users`.
