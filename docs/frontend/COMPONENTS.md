# Shared Components

All shared components live in `src/components/`. Feature-specific components live inside their feature folder.

---

## Layout

### `AppShell`

Wraps all authenticated pages. Renders `Sidebar` + `Topbar` + page content via `<Outlet />`.

```jsx
<AppShell>
  <Outlet />
</AppShell>
```

### `Sidebar`

Vertical nav list. Items shown/hidden based on `user.role` from `useAuth()`. Active item highlighted with route match.

```jsx
const navItems = [
  { label: 'Dashboard',    path: '/dashboard',    roles: ['ADMIN','HOD','TEACHER'] },
  { label: 'Master Data',  path: '/master-data',  roles: ['ADMIN'] },
  { label: 'Users',        path: '/users',        roles: ['ADMIN'] },
  { label: 'Curriculum',   path: '/curriculum',   roles: ['ADMIN'] },
  { label: 'Roster',       path: '/roster',       roles: ['ADMIN'] },
  { label: 'Lesson Plans', path: '/lesson-plans', roles: ['ADMIN','HOD','TEACHER'] },
  { label: 'Timetable',    path: '/timetable',    roles: ['ADMIN','HOD','TEACHER'] },
  { label: 'Reports',      path: '/reports',      roles: ['ADMIN','HOD'] },
];
```

### `Topbar`

Shows: page title, user name + role badge, logout button.

---

## DataTable

Generic table built on TanStack Table v8. Accepts column defs and data.

**Props**:
- `columns` — TanStack column def array
- `data` — array of row objects
- `isLoading` — shows skeleton rows when true
- `emptyMessage` — string shown when data is empty
- `onRowClick` — optional row click handler

Features:
- Column sorting (click header)
- Pagination
- Loading skeleton (3 placeholder rows)
- Empty state message

---

## StatusBadge

Renders a colored pill for lesson plan status.

**Props**: `status` — one of `'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'`

```jsx
// Color mapping
const config = {
  DRAFT:     { label: 'Draft',     className: 'bg-gray-100  text-gray-700'  },
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-100  text-blue-700'  },
  APPROVED:  { label: 'Approved',  className: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejected',  className: 'bg-red-100   text-red-700'   },
};
```

---

## ComplianceBadge

Used in timetable and dashboard to show curriculum pacing status.

**Props**: `status` — one of `'ON_TRACK' | 'BEHIND' | 'NOT_RELEVANT'`

| Status | Color | Meaning |
|--------|-------|---------|
| ON_TRACK | Green | Lesson plan approved for this week |
| BEHIND | Amber | Week passed, no approved plan |
| NOT_RELEVANT | Gray | Curriculum not mapped to any roster slot |

---

## ConfirmDialog

Reusable confirmation modal for destructive actions.

**Props**:
- `open` — boolean
- `title` — string
- `description` — string
- `confirmLabel` — string (default: `"Confirm"`)
- `cancelLabel` — string (default: `"Cancel"`)
- `variant` — `'default' | 'destructive'`
- `onConfirm` — function
- `onCancel` — function
- `isLoading` — boolean

---

## FormField

Wrapper combining a label, an input, and error message display. Works with React Hook Form.

**Props**:
- `label` — string
- `error` — error message string (from RHF `errors`)
- `required` — boolean
- `children` — the actual input element

```jsx
<FormField label="Standard Code" error={errors.standardCode?.message} required>
  <input {...register('standardCode', { required: 'Required' })} />
</FormField>
```

---

## PageHeader

Consistent page title + optional action button area.

**Props**:
- `title` — string
- `subtitle` — string (optional)
- `action` — JSX element (optional, e.g. an "Add New" button)

---

## FilterBar

Horizontal row of filter controls.

**Props**:
- `filters` — array of filter config objects:
  ```js
  { key: 'gradeId', label: 'Grade', type: 'select', options: [...] }
  { key: 'weekNo',  label: 'Week',  type: 'number' }
  { key: 'topic',   label: 'Topic', type: 'input'  }
  ```
- `onChange(values)` — called on any filter change
- `onReset` — clears all filters

---

## ReviewModal

Used by HOD on the lesson plan detail page to approve or reject.

**Props**:
- `open` — boolean
- `action` — `'approve' | 'reject'`
- `onSubmit(comments)` — called with the entered comments
- `onCancel` — function
- `isLoading` — boolean

Rules:
- Comments are **required** for reject (min 10 characters)
- Comments are **optional** for approve
- Submit button label: "Approve Plan" / "Reject Plan"

---

## LookupSelect

Dropdown populated from `GET /lookup/:type`. Results cached by TanStack Query.

**Props**:
- `type` — `'GRADE' | 'SUBJECT' | 'SEMESTER'`
- `value` — selected ID string
- `onChange(id)` — called with the selected `_id`
- `placeholder` — string (optional)
- `disabled` — boolean (optional)

Use this everywhere a grade/subject/semester dropdown is needed. Avoids duplicate API calls via shared TanStack Query cache.

---

## WeekBadge

Displays week number with optional pacing indicator.

**Props**:
- `weekNo` — number
- `status` — `'ON_TRACK' | 'BEHIND' | 'NOT_RELEVANT'` (optional)
