# Feature: Roster Management

**Route**: `/roster`
**Access**: ADMIN only
**Backend**: `GET|POST|PUT|DELETE|PATCH /roaster`

---

## Purpose

The roster assigns teachers to specific grade + subject + section combinations on specific days and periods. It is the source of truth for:

1. **Teaching permissions** — A teacher can only create lesson plans for grade/subject combinations present in their roster.
2. **Timetable generation** — The roster is the raw data for the Brown Sheet timetable view.
3. **Compliance checking** — Weeks where a rostered teacher has no approved lesson plan are flagged as "Behind Pacing".

---

## RosterListPage

### Filter Bar

| Filter | Type | API Param |
|--------|------|-----------|
| Teacher | User select | `teacherId` |
| Grade | `LookupSelect` (GRADE) | `gradeId` |
| Subject | `LookupSelect` (SUBJECT) | `subjectId` |
| Section | Text input | `section` |
| Day | Day select | `day` |

### Table Columns

| Column | Field | Notes |
|--------|-------|-------|
| Teacher | `teacherId.name` | Populated |
| Grade | `gradeId.label` | |
| Subject | `subjectId.label` | |
| Section | `section` | |
| Day | `day` | |
| Period | `period` | |
| Time | `startTime – endTime` | Formatted |
| Status | `isActive` | Active / Inactive badge |
| Actions | — | Edit, Deactivate, Delete |

Default sort: Day order (Mon–Fri) → Period → Grade

### Header Actions
- "Add Roster Entry" button → opens `RosterFormModal`

---

## RosterFormModal

Shared modal for create and edit.

**Title**: "Add Roster Entry" / "Edit Roster Entry"

### Fields

| Field | Component | Validation |
|-------|-----------|-----------|
| Teacher | User select (active TEACHERs) | Required |
| Grade | `LookupSelect` (GRADE) | Required |
| Subject | `LookupSelect` (SUBJECT) | Required |
| Section | Text input | Required (e.g. "A", "B", "1A") |
| Day | Select | Required: Mon, Tue, Wed, Thu, Fri |
| Period | Number | Required, 1–10 |
| Start Time | Time picker | Required, HH:MM |
| End Time | Time picker | Required, HH:MM, must be after Start Time |

### Validation Schema

```ts
// React Hook Form validation rules (no Zod needed)
// Attach via register():
//   required: 'Teacher is required'
//   validate: (v) => v > startTime || 'End time must be after start time'
```

**On create**: `POST /roaster`
**On edit**: `PUT /roaster/:id`
**On success**: Close modal, invalidate `['roster']`, show toast.

---

## Roster Timetable Preview

Within the roster page, provide a toggle ("Table View" / "Grid View") that renders a mini timetable grid (days × periods) for the currently filtered teacher, showing their assignments as colored cells. This is a simplified version of the full timetable page.

---

## Deactivate vs Delete

| Action | Behavior |
|--------|---------|
| Deactivate | `PATCH /roaster/:id/deactivate` — hides from active lookups but lesson plan history preserved |
| Delete | `DELETE /roaster/:id` — hard delete, only safe if no lesson plans reference this slot |

Show a warning before delete: "This roster entry may be referenced by existing lesson plans."

---

## Roster-Driven Lesson Plan Permission

When a teacher opens `/lesson-plans/new`, the Grade and Subject dropdowns must be **pre-filtered** to only show options where that teacher has active roster entries.

Implementation:
1. Fetch teacher's roster entries: `GET /roaster?teacherId=<id>&isActive=true`
2. Extract unique `{ gradeId, subjectId }` pairs
3. Use those pairs to filter the Grade and Subject selects

```ts
// In LessonPlanFormPage (for TEACHER role)
const { data: myRoster } = useQuery({
  queryKey: ['roster', { teacherId: user.id }],
  queryFn: () => getRoster({ teacherId: user.id }),
  enabled: isTeacher,
});

const allowedGradeIds = [...new Set(myRoster?.map(r => r.gradeId._id))];
const allowedSubjectIds = [...new Set(myRoster?.map(r => r.subjectId._id))];
```

---

## TanStack Query Setup

```js
// src/api/roster.api.js
export const getRoster = (params) =>
  api.get('/roaster', { params }).then(r => r.data.data);

export const createRosterEntry = (body) =>
  api.post('/roaster', body).then(r => r.data.data);

export const updateRosterEntry = (id, body) =>
  api.put(`/roaster/${id}`, body).then(r => r.data.data);

export const deleteRosterEntry = (id) =>
  api.delete(`/roaster/${id}`);

export const deactivateRosterEntry = (id) =>
  api.patch(`/roaster/${id}/deactivate`);
```

Query key: `['roster', filters]`
