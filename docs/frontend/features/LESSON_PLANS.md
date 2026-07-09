# Feature: Lesson Plans

**Routes**: `/lesson-plans`, `/lesson-plans/new`, `/lesson-plans/:id`, `/lesson-plans/:id/edit`
**Access**: TEACHER (create/edit/submit), HOD (approve/reject), ADMIN (view all, deactivate)
**Backend**: `GET|POST|PUT|PATCH /lesson-plans`

---

## Purpose

Lesson plans are the weekly deliverable from teachers. Each plan is linked to a specific curriculum entry (Grade + Subject + Semester + Week). The workflow is:

```
Teacher creates DRAFT → Teacher submits → HOD reviews → APPROVED or REJECTED
```

The system enforces that teachers can only plan for subjects they are rostered to teach.

---

## Status Workflow

```
[DRAFT] ──(submit)──► [SUBMITTED] ──(approve)──► [APPROVED]
                           │
                        (reject)
                           │
                           ▼
                       [REJECTED]
```

| Status | Who can act | Action |
|--------|------------|--------|
| DRAFT | Teacher | Edit, Submit, Delete |
| SUBMITTED | HOD | Approve, Reject |
| APPROVED | Admin | Deactivate (soft) |
| REJECTED | Teacher | View only (must create a new plan) |

---

## LessonPlanListPage

### Filter Bar

| Filter | Visible to | API Param |
|--------|-----------|-----------|
| Grade | All | `gradeId` |
| Subject | All | `subjectId` |
| Semester | All | `semesterId` |
| Week No | All | `weekNo` |
| Status | All | `status` |
| Teacher | ADMIN, HOD | `teacherId` |

The server handles role-scoping: TEACHERs only receive their own plans.

### Table Columns

| Column | Notes |
|--------|-------|
| Teacher | Hidden for TEACHER role (always self) |
| Grade | |
| Subject | |
| Semester | |
| Week No | |
| Topic | |
| Status | `StatusBadge` component |
| Submitted At | Formatted date, empty if DRAFT |
| Actions | Role-dependent (see below) |

### Header Actions
- TEACHER: "New Lesson Plan" button → `/lesson-plans/new`

### Row Actions (role-dependent)

| Role | DRAFT | SUBMITTED | APPROVED | REJECTED |
|------|-------|-----------|----------|---------|
| TEACHER | Edit, Submit | View | View | View |
| HOD | View | Approve, Reject | View | View |
| ADMIN | View | View | Deactivate | View |

---

## LessonPlanFormPage (TEACHER only)

### Step 1 — Curriculum Selection

**Purpose**: Link the plan to a specific curriculum entry.

**Fields** (cascading dropdowns):
1. **Grade** — filtered to teacher's rostered grades
2. **Subject** — filtered to teacher's rostered subjects for the selected grade
3. **Semester** — all active semesters
4. **Week No** — 1–52

On selecting all four, call `GET /curriculum?gradeId=&subjectId=&semesterId=&weekNo=` and display the matching curriculum entry below the selects:

```
Standard Code: ELA-2.1
Description:   Students will identify main idea and supporting details...
Skills:        Reading comprehension, annotation
Input:         Textbook Chapter 3, graphic organizer
Process:       Guided reading → partner activity → independent summary
Outcome:       Written paragraph identifying main idea with evidence
```

If no curriculum entry exists for the selection, show an alert: "No curriculum entry found for this combination. Contact your administrator."

### Step 2 — Plan Details

| Field | Input | Required | Notes |
|-------|-------|---------|-------|
| Topic | Text | Yes | Specific lesson topic |
| Resource | Textarea | No | Materials, textbooks, links |
| Assessment | Textarea | No | Assessment method used |

### Submit Actions (bottom of form)

- **"Save as Draft"** — `POST /lesson-plans` (status defaults to DRAFT) or `PUT /lesson-plans/:id`
- **"Save & Submit"** — Save then immediately `PATCH /lesson-plans/:id/submit`

### Validation Rules (React Hook Form)

```js
// Applied via register() on each field:
curriculumId: { required: 'Curriculum entry is required' }
gradeId:      { required: 'Grade is required' }
subjectId:    { required: 'Subject is required' }
semesterId:   { required: 'Semester is required' }
weekNo:       { required: true, min: { value: 1, message: 'Min week is 1' }, max: { value: 52, message: 'Max week is 52' } }
topic:        { required: 'Topic is required' }
// resource and assessment are optional — no rules needed
```

---

## LessonPlanDetailPage

### Layout

**Top section**: Plan metadata  
- Status badge (large, prominent)  
- Teacher name, Grade, Subject, Semester, Week No  
- Created at, Submitted at

**Curriculum Reference Panel** (read-only, collapsible):
- Standard Code + Description
- Skills, Input, Process, Outcome (2×2 grid of cards)

**Lesson Plan Content**:
- Topic (heading style)
- Resource (formatted block)
- Assessment (formatted block)

**Review Section** (shown if reviewed):
- Reviewed by: HOD name
- Reviewed at: formatted date
- Comments: HOD's comments (shown prominently if REJECTED)

### Action Bar (sticky bottom or top right)

| Viewer | Status | Actions |
|--------|--------|---------|
| TEACHER | DRAFT | "Edit Plan" · "Submit Plan" |
| TEACHER | SUBMITTED | (none — awaiting review) |
| TEACHER | REJECTED | "Create New Plan" (link to /new prefilled) |
| HOD | SUBMITTED | "Approve" · "Reject" |
| ADMIN | any | "Deactivate" |

### ReviewModal

Triggered by HOD clicking "Approve" or "Reject":

- **Approve**: Optional comments field. Button: "Approve Plan" (green)
- **Reject**: Required comments field (min 10 chars). Button: "Reject Plan" (red)

On submit: call `PATCH /lesson-plans/:id/approve` or `/reject` with `{ comments }`.

---

## Behind Pacing Alert

On the lesson plan list and teacher dashboard, compute pacing for the current week:

```js
function computePacingStatus(roster, lessonPlans, currentWeek) {
  return roster.map((slot) => {
    const plan = lessonPlans.find(
      (p) =>
        p.gradeId === slot.gradeId &&
        p.subjectId === slot.subjectId &&
        p.weekNo === currentWeek
    );
    return {
      ...slot,
      pacingStatus: !plan
        ? 'MISSING'
        : plan.status === 'APPROVED'
        ? 'ON_TRACK'
        : plan.status,
    };
  });
}
```

Display an amber banner at the top of the teacher's lesson plan list if any current-week slots are MISSING or DRAFT/SUBMITTED past Sunday.

---

## TanStack Query Setup

```js
// src/api/lessonPlan.api.js
export const getLessonPlans = (params) =>
  api.get('/lesson-plans', { params }).then(r => r.data.data);

export const getLessonPlanById = (id) =>
  api.get(`/lesson-plans/${id}`).then(r => r.data.data);

export const createLessonPlan = (body) =>
  api.post('/lesson-plans', body).then(r => r.data.data);

export const updateLessonPlan = (id, body) =>
  api.put(`/lesson-plans/${id}`, body).then(r => r.data.data);

export const submitLessonPlan = (id) =>
  api.patch(`/lesson-plans/${id}/submit`).then(r => r.data.data);

export const approveLessonPlan = (id, comments) =>
  api.patch(`/lesson-plans/${id}/approve`, { comments }).then(r => r.data.data);

export const rejectLessonPlan = (id, comments) =>
  api.patch(`/lesson-plans/${id}/reject`, { comments }).then(r => r.data.data);
```

Query keys:
```ts
['lessonPlans', filters]       // list
['lessonPlan', id]             // detail
```
