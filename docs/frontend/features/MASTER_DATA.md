# Feature: Master Data (Lookup Management)

**Route**: `/master-data`
**Access**: ADMIN only
**Backend**: `GET|POST|PUT|DELETE /lookup`

---

## Purpose

Lookup values are the foundation of the entire system. Every grade, subject, and semester referenced in curriculum, roster, and lesson plans comes from this table. Admins must populate this data before any other module can function.

---

## UI Layout

### Tabs

Three tabs on the same page:
- **Grades** (`type: GRADE`)
- **Subjects** (`type: SUBJECT`)
- **Semesters** (`type: SEMESTER`)

Each tab shows its own independent table and "Add" button.

---

## Data Table — Columns

| Column | Source Field | Notes |
|--------|-------------|-------|
| Code | `code` | e.g. "G1", "MATH", "SEM1" |
| Label | `label` | e.g. "Grade 1", "Mathematics" |
| Order | `order` | Used for sort order in dropdowns |
| Status | `isActive` | Active / Inactive badge |
| Actions | — | Edit, Delete |

Sort by `order` ascending by default.

---

## LookupFormModal

Shared modal for both create and edit.

**Title**: "Add Grade" / "Edit Grade" (substituting the type label)

**Fields**:

| Field | Validation |
|-------|-----------|
| Code | Required, unique (backend enforced), uppercase recommended |
| Label | Required |
| Order | Required, positive integer |

**On submit (create)**: `POST /lookup` with `{ type, code, label, order }`
**On submit (edit)**: `PUT /lookup/:id` with changed fields

---

## Delete Behavior

- Show `ConfirmDialog` before calling `DELETE /lookup/:id`
- Warning: "Deleting a lookup that is referenced by curriculum or roster entries may cause data inconsistency. Consider deactivating instead."
- After delete: invalidate `['lookup', type]` query

---

## TanStack Query Setup

```js
// src/api/lookup.api.js
export const getLookupsByType = (type) =>
  api.get(`/lookup/${type}`).then(r => r.data.data);

export const getAllLookups = () =>
  api.get('/lookup/all').then(r => r.data.data);

export const createLookup = (body) =>
  api.post('/lookup', body).then(r => r.data.data);

export const updateLookup = (id, body) =>
  api.put(`/lookup/${id}`, body).then(r => r.data.data);

export const deleteLookup = (id) =>
  api.delete(`/lookup/${id}`);
```

Query key convention: `['lookup', 'GRADE']`, `['lookup', 'SUBJECT']`, `['lookup', 'SEMESTER']`

---

## Seed Order

Recommended order for initial data entry:
1. **Semesters** (e.g. Semester 1, Semester 2)
2. **Grades** (e.g. Grade 1 through Grade 12)
3. **Subjects** (e.g. Mathematics, English, Science)

All three must exist before curriculum entries can be created.

---

## Important Notes

- `LookupSelect` component (in `COMPONENTS.md`) caches lookups via TanStack Query — all dropdowns system-wide share this cache.
- Deactivating a lookup (`isActive: false`) hides it from new selections but does not break existing references.
- The `order` field controls the display order in dropdowns — use increments of 10 (10, 20, 30…) to allow future insertions.
