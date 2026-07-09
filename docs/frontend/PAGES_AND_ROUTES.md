# Pages & Routes

## Route Table

| Path | Component | Roles | Description |
|------|-----------|-------|-------------|
| `/login` | `LoginPage` | Public | Email + password login |
| `/` | Redirect | — | Redirects to `/dashboard` |
| `/dashboard` | `AdminDashboard` / `HodDashboard` / `TeacherDashboard` | All | Role-specific dashboard |
| `/master-data` | `LookupListPage` | ADMIN | Manage grades, subjects, semesters |
| `/users` | `UserListPage` | ADMIN | View and create users |
| `/curriculum` | `CurriculumListPage` | ADMIN | Browse/filter curriculum entries |
| `/curriculum/new` | `CurriculumFormPage` | ADMIN | Create new curriculum entry |
| `/curriculum/:id/edit` | `CurriculumFormPage` | ADMIN | Edit existing curriculum entry |
| `/curriculum/:id` | `CurriculumDetailPage` | ADMIN | Read-only detail view |
| `/roster` | `RosterListPage` | ADMIN | View and manage teaching roster |
| `/lesson-plans` | `LessonPlanListPage` | All | Role-filtered list |
| `/lesson-plans/new` | `LessonPlanFormPage` | TEACHER | Create new lesson plan |
| `/lesson-plans/:id` | `LessonPlanDetailPage` | All | Detail + HOD review actions |
| `/lesson-plans/:id/edit` | `LessonPlanFormPage` | TEACHER | Edit DRAFT plan |
| `/timetable` | `TimetablePage` | All | Weekly timetable grid (Brown Sheet) |
| `/reports` | `ReportsPage` | ADMIN, HOD | Compliance and coverage reports |

---

## Page Specifications

### `/login` — LoginPage

**Layout**: Centered card, no sidebar.

**Elements**:
- School logo / name
- Email input
- Password input
- "Login" submit button
- Error message area (invalid credentials)

**Behavior**:
- On success: store JWT, redirect to `/dashboard`
- On 401: show inline error "Invalid email or password"
- On 400: show field-level errors

---

### `/dashboard` — Dashboard (role-specific)

Renders different components based on `user.role`:

| Role | Component | Key Widgets |
|------|-----------|-------------|
| ADMIN | `AdminDashboard` | Total users, curriculum count, roster coverage, recent lesson plans by status |
| HOD | `HodDashboard` | Pending review count, approval rate, teacher compliance overview |
| TEACHER | `TeacherDashboard` | My lesson plans (by status), current week plan status, roster this week |

---

### `/master-data` — LookupListPage (ADMIN)

Three tabs: **Grades**, **Subjects**, **Semesters**.

Each tab shows:
- Filterable table: Code, Label, Order, Active
- "Add" button → opens `LookupFormModal`
- Row actions: Edit (inline modal), Delete (with confirmation)

---

### `/users` — UserListPage (ADMIN)

**Table columns**: Name, Email, Role, Active, Created At, Actions

**Actions**:
- "Add User" button → opens `UserCreateModal`
- Per-row: Deactivate (soft delete via admin action)

---

### `/curriculum` — CurriculumListPage (ADMIN)

**Filter bar**: Grade dropdown, Subject dropdown, Semester dropdown, Week No input

**Table columns**: Standard Code, Grade, Subject, Semester, Week No, Skills, Active, Actions

**Actions**:
- "Add Curriculum" → navigate to `/curriculum/new`
- Edit → navigate to `/curriculum/:id/edit`
- Deactivate → confirm dialog, call `PATCH /curriculum/:id/deactivate`
- Delete → confirm dialog

---

### `/curriculum/new` and `/curriculum/:id/edit` — CurriculumFormPage (ADMIN)

**Form fields**:

| Field | Input Type | Notes |
|-------|-----------|-------|
| Grade | Select | From `GET /lookup/GRADE` |
| Subject | Select | From `GET /lookup/SUBJECT` |
| Semester | Select | From `GET /lookup/SEMESTER` |
| Week No | Number | 1–52 |
| Standard Code | Text | e.g. "ELA-1.1" |
| Standard Description | Textarea | |
| Skills | Textarea | |
| Input | Textarea | Resources/inputs used |
| Process | Textarea | Teaching process description |
| Outcome | Textarea | Expected learning outcomes |

---

### `/roster` — RosterListPage (ADMIN)

**Filter bar**: Teacher, Grade, Section, Day

**Table columns**: Teacher Name, Grade, Subject, Section, Day, Period, Start Time, End Time, Active, Actions

**Actions**:
- "Add Roster Entry" → opens `RosterFormModal`
- Edit → opens prefilled `RosterFormModal`
- Deactivate / Delete

**RosterFormModal fields**:

| Field | Input Type | Notes |
|-------|-----------|-------|
| Teacher | Select | Active teachers from users list |
| Grade | Select | From lookup GRADE |
| Subject | Select | From lookup SUBJECT |
| Section | Text | e.g. "A", "B" |
| Day | Select | Monday–Friday |
| Period | Number | 1–8 |
| Start Time | Time | HH:MM |
| End Time | Time | HH:MM |

---

### `/lesson-plans` — LessonPlanListPage (All roles)

**Filter bar**: Grade, Subject, Semester, Week No, Status (DRAFT/SUBMITTED/APPROVED/REJECTED)
- ADMIN/HOD also see: Teacher filter

**Table columns**: Teacher, Grade, Subject, Semester, Week No, Topic, Status badge, Submitted At, Actions

**Actions** (role-dependent):
- TEACHER: "New Plan" button; Edit (DRAFT only); Submit (DRAFT only)
- HOD: Approve / Reject (SUBMITTED only)
- All: View detail

---

### `/lesson-plans/new` and `/lesson-plans/:id/edit` — LessonPlanFormPage (TEACHER)

**Step 1 — Pick Curriculum**: Select Grade → Subject → Semester → Week No → system auto-loads matching curriculum entry and displays it read-only.

**Step 2 — Plan Details**:

| Field | Input Type | Notes |
|-------|-----------|-------|
| Topic | Text | Lesson topic |
| Resource | Textarea | Optional — materials used |
| Assessment | Textarea | Optional — assessment method |

**Validation**: Teacher must have a roster entry matching the selected Grade + Subject before submitting.

---

### `/lesson-plans/:id` — LessonPlanDetailPage (All roles)

**Sections**:
1. **Plan Info**: Grade, Subject, Semester, Week No, Teacher, Status badge
2. **Curriculum Reference**: Read-only display of the linked curriculum's Standard Code, Description, Skills, Input, Process, Outcome
3. **Lesson Plan Content**: Topic, Resource, Assessment
4. **Review Info** (if reviewed): Reviewed By, Reviewed At, Comments
5. **Actions** (role-dependent):
   - TEACHER + DRAFT: "Edit" | "Submit"
   - HOD + SUBMITTED: "Approve" | "Reject" → opens `ReviewModal`
   - ADMIN: "Deactivate"

---

### `/timetable` — TimetablePage (All roles)

See [features/TIMETABLE.md](./features/TIMETABLE.md) for full spec.

---

### `/reports` — ReportsPage (ADMIN, HOD)

See [features/DASHBOARDS.md](./features/DASHBOARDS.md) for full spec.
