# Feature: User Management

**Route**: `/users`
**Access**: ADMIN only
**Backend**: `POST /users`, `POST /auth/register` (for first admin)

---

## Purpose

Admins manage HOD and TEACHER accounts. Users are assigned to roster entries; their role controls what they can do across the system.

---

## UI Layout

### UserListPage

**Header**: "Users" + "Add User" button (top right)

**Table columns**:

| Column | Source Field | Notes |
|--------|-------------|-------|
| Name | `name` | |
| Email | `email` | |
| Role | `role` | Colored badge: ADMIN (purple), HOD (blue), TEACHER (green) |
| Status | `isActive` | Active / Inactive |
| Created | `createdAt` | Formatted date |
| Actions | — | Deactivate (soft) |

**Filters**: Role dropdown, Active/Inactive toggle

---

## UserCreateModal

**Title**: "Add User"

**Fields**:

| Field | Input | Validation |
|-------|-------|-----------|
| Full Name | Text | Required |
| Email | Email | Required, valid format |
| Password | Password | Required, min 8 chars |
| Role | Select | HOD or TEACHER (ADMIN cannot be created here) |

**On submit**: `POST /users` with `{ name, email, password, role }`

**On success**: Close modal, show success toast, invalidate users query.

---

## Deactivate User

- No hard delete of users exposed in the API.
- If backend adds a deactivate user endpoint, call `PATCH /users/:id/deactivate`.
- Until then, show the deactivate button as disabled with tooltip "Contact system administrator".
- A deactivated teacher's roster entries remain but they can no longer log in.

---

## Role Badges

```tsx
const roleBadgeConfig = {
  ADMIN:   { label: 'Admin',   className: 'bg-purple-100 text-purple-800' },
  HOD:     { label: 'HOD',     className: 'bg-blue-100   text-blue-800'   },
  TEACHER: { label: 'Teacher', className: 'bg-green-100  text-green-800'  },
};
```

---

## TanStack Query Setup

Since there is no dedicated `GET /users` endpoint yet (only `POST /users`), the user list will require the backend to add a list endpoint. For now:

```ts
// Placeholder — awaiting GET /users endpoint
export const getUsers = () =>
  api.get<ApiResponse<User[]>>('/users').then(r => r.data.data);

export const createUserByAdmin = (body: CreateUserDto) =>
  api.post<ApiResponse<User>>('/users', body).then(r => r.data.data);
```

> **Backend gap**: `GET /users` is not yet implemented. Track this with the backend team. The user list page should show an empty state or a "coming soon" notice until this endpoint is available.

---

## Notes

- Teachers must exist in the system before they can be assigned to roster entries.
- HODs must exist before lesson plans can be reviewed (the HOD's user ID is stored on approved/rejected plans).
- The current auth system does not support password reset — admins must create new accounts if a user forgets their password.
