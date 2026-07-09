# Feature: Curriculum Management

**Route**: `/curriculum`, `/curriculum/new`, `/curriculum/:id/edit`, `/curriculum/:id`
**Access**: ADMIN only
**Backend**: `GET|POST|PUT|DELETE|PATCH /curriculum`

---

## Purpose

The curriculum is the academic backbone. Each curriculum entry represents one standard (e.g. "ELA-1.1") for a specific Grade + Subject + Semester + Week. Teachers must link their lesson plans to a curriculum entry — this enforces curriculum compliance.

---

## CurriculumListPage

### Filter Bar

| Filter | Type | API Param |
|--------|------|-----------|
| Grade | `LookupSelect` (GRADE) | `gradeId` |
| Subject | `LookupSelect` (SUBJECT) | `subjectId` |
| Semester | `LookupSelect` (SEMESTER) | `semesterId` |
| Week No | Number input | `weekNo` |

All filters are optional. Applied as query params to `GET /curriculum`.

### Table Columns

| Column | Field | Notes |
|--------|-------|-------|
| Standard Code | `standardCode` | e.g. "ELA-1.1" |
| Grade | `gradeId.label` | Populated via join |
| Subject | `subjectId.label` | |
| Semester | `semesterId.label` | |
| Week | `weekNo` | |
| Skills | `skills` | Truncated, full on hover |
| Active | `isActive` | Badge |
| Actions | — | Edit, Deactivate, Delete |

Default sort: Semester → Week No → Standard Code

### Header Actions
- "Add Curriculum Entry" button → navigate to `/curriculum/new`

---

## CurriculumFormPage

Used for both **create** (`/curriculum/new`) and **edit** (`/curriculum/:id/edit`).

### Form Sections

**Section 1: Classification**

| Field | Component | Notes |
|-------|-----------|-------|
| Grade | `LookupSelect` (GRADE) | Required |
| Subject | `LookupSelect` (SUBJECT) | Required |
| Semester | `LookupSelect` (SEMESTER) | Required |
| Week No | Number input | Required, 1–52 |

**Section 2: Standard**

| Field | Component | Notes |
|-------|-----------|-------|
| Standard Code | Text input | Required, e.g. "MATH-2.3" |
| Standard Description | Textarea | Required |

**Section 3: Learning Details**

| Field | Component | Notes |
|-------|-----------|-------|
| Skills | Textarea | Required — skills addressed |
| Input | Textarea | Required — resources/inputs |
| Process | Textarea | Required — teaching process |
| Outcome | Textarea | Required — expected outcomes |

### Submit Behavior

**Create**: `POST /curriculum` → on success: navigate to `/curriculum` with success toast

**Edit**: `PUT /curriculum/:id` → on success: navigate to `/curriculum/:id` with success toast

### Validation Rules (React Hook Form)

```js
// Applied via register() on each field:
gradeId:             { required: 'Grade is required' }
subjectId:           { required: 'Subject is required' }
semesterId:          { required: 'Semester is required' }
weekNo:              { required: true, min: { value: 1, message: 'Min 1' }, max: { value: 52, message: 'Max 52' } }
standardCode:        { required: 'Standard code is required' }
standardDescription: { required: 'Description is required' }
skills:              { required: 'Skills are required' }
input:               { required: 'Input is required' }
process:             { required: 'Process is required' }
outcome:             { required: 'Outcome is required' }
```

---

## CurriculumDetailPage

Read-only view of a single curriculum entry. Accessible from the list row click or from a lesson plan's linked curriculum.

**Sections**:
1. Classification card: Grade, Subject, Semester, Week No, Standard Code
2. Standard Description (full text)
3. Learning breakdown: Skills / Input / Process / Outcome (2×2 grid)
4. Linked Lesson Plans section: table of plans that reference this curriculum entry, with status badges

**Admin Actions**: Edit button, Deactivate button

---

## Deactivate vs Delete

| Action | Behavior | When to use |
|--------|---------|-------------|
| Deactivate | Sets `isActive: false`, hides from teacher dropdowns | Entry has linked lesson plans |
| Delete | Hard delete | Entry was created in error, no linked plans |

Always show a warning before delete if any lesson plans reference this curriculum.

---

## TanStack Query Setup

```ts
// Query keys
['curriculum']                     // list (no filters)
['curriculum', filters]            // list with filters object
['curriculum', 'detail', id]       // single entry

// Invalidation after mutate
queryClient.invalidateQueries({ queryKey: ['curriculum'] });
```

---

## Curriculum Compliance Logic (Frontend)

When displaying lesson plans or timetable cells, compute compliance status by comparing curriculum entries against approved lesson plans:

```js
// complianceStatus values: 'APPROVED' | 'SUBMITTED' | 'DRAFT' | 'MISSING' | 'NOT_RELEVANT'
function getCurriculumCompliance(curriculum, lessonPlans) {
  const match = lessonPlans.find(
    (p) =>
      p.curriculumId === curriculum._id ||
      (p.gradeId === curriculum.gradeId &&
        p.subjectId === curriculum.subjectId &&
        p.semesterId === curriculum.semesterId &&
        p.weekNo === curriculum.weekNo)
  );

  if (!match) return 'MISSING';
  return match.status;
}
```

- `MISSING` → shown as "Behind Pacing" alert (amber)
- `APPROVED` → shown as compliant (green)
- Curriculum with no roster assignment → "Not Relevant" (gray)
