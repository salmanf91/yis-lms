# API Reference

Base URL: `VITE_API_BASE_URL` (e.g. `http://localhost:5000/api`)

All protected endpoints require:
```
Authorization: Bearer <JWT>
```

Standard response envelope:
```json
{ "success": true, "message": "...", "data": { ... } }
```

---

## Auth

### POST `/auth/register`
Register a new user. First call creates an ADMIN; subsequent calls require `role: HOD | TEACHER`.

**Body**
```json
{ "name": "string", "email": "string", "password": "string", "role": "HOD | TEACHER" }
```

**Response 200/201**
```json
{ "id": "...", "name": "...", "email": "...", "role": "ADMIN | HOD | TEACHER" }
```

---

### POST `/auth/login`
**Body**
```json
{ "email": "string", "password": "string" }
```

**Response 200**
```json
{
  "token": "<jwt>",
  "user": { "id": "...", "name": "...", "email": "...", "role": "ADMIN | HOD | TEACHER" }
}
```

**Errors**: `400` missing fields, `401` invalid credentials

---

## Users (Admin only)

### POST `/users`
Create a user as admin (bypasses public registration restrictions).

**Body**
```json
{ "name": "string", "email": "string", "password": "string", "role": "HOD | TEACHER" }
```

---

## Lookup (Admin only)

Lookups are the master reference data: **GRADE**, **SUBJECT**, **SEMESTER**.

### POST `/lookup`
**Body**
```json
{ "type": "GRADE | SUBJECT | SEMESTER", "code": "G1", "label": "Grade 1", "order": 1 }
```

### GET `/lookup/all`
Returns all lookups grouped. No query params.

**Response**
```json
[{ "_id": "...", "type": "GRADE", "code": "G1", "label": "Grade 1", "order": 1, "isActive": true }]
```

### GET `/lookup/:type`
Filter by type. `:type` = `GRADE` | `SUBJECT` | `SEMESTER`

### PUT `/lookup/:id`
**Body**: any subset of `{ code, label, order, isActive }`

### DELETE `/lookup/:id`
Hard delete. Prefer deactivation in practice.

---

## Curriculum (Admin only)

### POST `/curriculum`
**Body**
```json
{
  "gradeId": "<lookupId>",
  "subjectId": "<lookupId>",
  "semesterId": "<lookupId>",
  "weekNo": 1,
  "standardCode": "ELA-1.1",
  "standardDescription": "...",
  "skills": "...",
  "input": "...",
  "process": "...",
  "outcome": "..."
}
```

### GET `/curriculum`
**Query params** (all optional): `gradeId`, `subjectId`, `semesterId`, `weekNo`

### GET `/curriculum/:id`

### PUT `/curriculum/:id`
**Body**: any subset of curriculum fields.

### DELETE `/curriculum/:id`

### PATCH `/curriculum/:id/deactivate`

---

## Roster (Admin only)

Roster defines which teacher teaches which subject/grade/section on which day and period.

### POST `/roaster`
**Body**
```json
{
  "teacherId": "<userId>",
  "gradeId": "<lookupId>",
  "subjectId": "<lookupId>",
  "section": "A",
  "day": "Monday",
  "period": 1,
  "startTime": "08:00",
  "endTime": "08:45"
}
```

**Validations (backend)**:
- `teacherId` must be a valid active TEACHER
- `gradeId` / `subjectId` must be valid active lookups

### GET `/roaster`
**Query params** (all optional): `teacherId`, `gradeId`, `subjectId`, `day`, `section`

### PUT `/roaster/:id`
**Body**: any subset of roster fields.

### DELETE `/roaster/:id`

### PATCH `/roaster/:id/deactivate`

---

## Lesson Plans

Role-based visibility: TEACHER sees own plans; HOD sees all submitted/approved/rejected plans; ADMIN sees all.

### POST `/lesson-plans` — Teacher only
**Body**
```json
{
  "curriculumId": "<curriculumId>",
  "gradeId": "<lookupId>",
  "subjectId": "<lookupId>",
  "semesterId": "<lookupId>",
  "weekNo": 3,
  "topic": "Fractions Introduction",
  "resource": "Textbook p.45, worksheet",
  "assessment": "Exit ticket"
}
```
`teacherId` is auto-set from JWT. Status defaults to `DRAFT`.

### GET `/lesson-plans`
**Query params** (all optional): `gradeId`, `subjectId`, `semesterId`, `weekNo`, `status`, `teacherId`

Role filtering is applied server-side.

### GET `/lesson-plans/:id`

### PUT `/lesson-plans/:id` — Teacher only (DRAFT status)
**Body**: any subset of lesson plan fields. Fails if status is not DRAFT.

### PATCH `/lesson-plans/:id/submit` — Teacher only
No body. Transitions `DRAFT → SUBMITTED`.

### PATCH `/lesson-plans/:id/approve` — HOD only
**Body**
```json
{ "comments": "Looks good" }
```
Transitions `SUBMITTED → APPROVED`.

### PATCH `/lesson-plans/:id/reject` — HOD only
**Body**
```json
{ "comments": "Please add more assessment detail" }
```
Transitions `SUBMITTED → REJECTED`.

### PATCH `/lesson-plans/:id/deactivate` — Admin only

---

## Status Transition Summary

```
DRAFT ──submit──► SUBMITTED ──approve──► APPROVED
                      │
                   reject
                      │
                      ▼
                  REJECTED
```

A REJECTED plan cannot be re-submitted via the current API. The teacher must create a new plan.

---

## Timetable / Brown Sheet (Planned)

> **Note**: This endpoint does not exist yet in the backend. The frontend should call this once implemented.

### GET `/timetable`
**Query params**: `gradeId`, `semesterId`, `section`

Expected response: A 2D grid (days × periods) with teacher, subject, and lesson plan compliance status per cell.

---

## Dashboard / Reports (Planned)

> **Note**: These endpoints do not exist yet. Frontend should display loading/empty states gracefully.

### GET `/reports/summary`
Admin summary: total plans by status, compliance rate.

### GET `/reports/teacher/:teacherId`
Per-teacher plan completion rate vs roster.

### GET `/reports/compliance`
Curriculum coverage: weeks where no lesson plan has been submitted or approved.

---

## Error Codes Reference

| HTTP | Meaning |
|------|---------|
| 400  | Validation error / bad request body |
| 401  | Missing or invalid JWT |
| 403  | Authenticated but wrong role |
| 404  | Resource not found |
| 500  | Internal server error |
