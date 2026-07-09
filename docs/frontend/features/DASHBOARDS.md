# Feature: Dashboards & Reporting

**Routes**: `/dashboard` (all roles), `/reports` (ADMIN + HOD)
**Access**: Dashboard — all roles; Reports — ADMIN and HOD
**Backend**: Planned endpoints (see API_REFERENCE.md — not yet implemented)

---

## Purpose

Dashboards give each role a quick situational overview. The Reports page provides deeper analytics on curriculum compliance, teacher performance, and lesson plan coverage.

---

## Dashboard — Role Views

The `/dashboard` route renders a different component based on the user's role.

---

### ADMIN Dashboard

**Stat Cards Row**:

| Card | Value | Source |
|------|-------|--------|
| Total Teachers | Count of active TEACHER users | `GET /users` (planned) |
| Curriculum Entries | Total active entries | `GET /curriculum` count |
| Roster Assignments | Total active roster slots | `GET /roaster` count |
| Plans This Week | Total lesson plans for current weekNo | `GET /lesson-plans?weekNo=` count |

**Charts**:

1. **Lesson Plans by Status** — Donut chart (DRAFT / SUBMITTED / APPROVED / REJECTED counts)
2. **Plans per Grade** — Bar chart: X = Grade, Y = count of approved plans this semester
3. **Compliance Rate Over Weeks** — Line chart: X = Week No, Y = % of rosters with an APPROVED plan

**Recent Activity Table**:
- Last 10 submitted lesson plans across all teachers
- Columns: Teacher, Grade, Subject, Week, Topic, Status, Submitted At

**Alerts Panel**:
- Teachers with no plans submitted for current week (list of names)
- Grades/subjects where no curriculum entry exists for the current week

---

### HOD Dashboard

**Stat Cards Row**:

| Card | Value |
|------|-------|
| Pending Review | Plans in SUBMITTED status |
| Approved This Week | Plans approved this week |
| Rejected This Month | Plans rejected this month |
| Teacher Compliance Rate | % teachers with an approved plan for current week |

**Pending Review Queue**:
- Table of all SUBMITTED lesson plans, sorted by submitted date (oldest first)
- Quick action: "Review" link → `/lesson-plans/:id`
- Highlight plans submitted more than 3 days ago in amber

**Per-Teacher Compliance Table**:
| Teacher | Rostered Slots | Approved Plans (this sem) | Coverage % |
|---------|---------------|--------------------------|------------|

**Approval Rate Trend** — Bar chart: X = Week No, Y = count of approved/rejected plans

---

### TEACHER Dashboard

**Stat Cards Row**:

| Card | Value |
|------|-------|
| My Plans (Total) | Total lesson plans I've created |
| Approved | Count of my APPROVED plans |
| Pending Review | Count of my SUBMITTED plans |
| Rejected | Count of my REJECTED plans |

**Current Week Status Banner**:
- For each of the teacher's roster slots this week, show a card:

```
┌─────────────────────────────────────────┐
│ Mathematics — Grade 5A                  │
│ Week 12                                 │
│ Status: ● APPROVED  ✓                   │
│ Topic: Introduction to Fractions        │
└─────────────────────────────────────────┘
```

Color of the card border matches the status (green = approved, yellow = draft, amber = missing).

**Quick Actions**:
- "Create This Week's Plans" button (visible if any current-week slots have no plan) → `/lesson-plans/new`

**My Plans Timeline**:
- List of my plans across all weeks, grouped by semester, sorted by weekNo
- Shows: Week No, Subject, Grade, Topic, Status badge, HOD comments (if rejected)

---

## Reports Page (`/reports`)

**Access**: ADMIN and HOD

Tabs:

1. **Coverage Report**
2. **Teacher Compliance Report**
3. **Curriculum Pacing Report**

---

### Tab 1: Coverage Report

Shows which curriculum entries have an approved lesson plan and which are missing.

**Filters**: Grade, Subject, Semester, Week range (from–to)

**Table**:

| Week | Standard Code | Subject | Grade | Lesson Plan | Status |
|------|-------------|---------|-------|-------------|--------|
| 1 | MATH-2.1 | Math | G2 | LP-001 | APPROVED |
| 2 | MATH-2.2 | Math | G2 | — | MISSING |
| 3 | MATH-2.3 | Math | G2 | LP-045 | SUBMITTED |

Row background: green (APPROVED), white (upcoming), amber (MISSING — past week), blue (SUBMITTED)

**Export**: "Export CSV" button — downloads the filtered table as a CSV file.

---

### Tab 2: Teacher Compliance Report

**Filters**: Semester, Grade

**Table**:

| Teacher | Grade | Subject | Section | Total Weeks | Plans Submitted | Plans Approved | Compliance % |
|---------|-------|---------|---------|-------------|----------------|----------------|-------------|

**Chart**: Bar chart per teacher showing compliance % vs target (100%).

Teachers below 80% highlighted in amber.

---

### Tab 3: Curriculum Pacing Report

Visual semester calendar showing the pacing status of curriculum coverage.

**Filters**: Grade, Subject, Semester

**Calendar grid**: Rows = weeks, Columns = subjects

Color coding:
- **Green**: Curriculum entry exists + approved lesson plan
- **Amber**: Curriculum entry exists, week passed, no approved plan (Behind Pacing)
- **Gray**: No curriculum entry mapped for this week (Not Relevant)
- **White**: Future week, no plan yet

**Not Relevant** logic: A curriculum week is "Not Relevant" if no active roster entry exists for that Grade + Subject combination. This prevents false "behind" alerts for subjects not taught in a given term.

---

## Computed Metrics (Frontend)

Since dedicated reporting endpoints don't exist yet, compute metrics from existing data:

```js
function computeComplianceRate(rosterSlots, lessonPlans, weekNo) {
  const total = rosterSlots.length;
  if (total === 0) return 0;

  const approved = rosterSlots.filter((slot) =>
    lessonPlans.some(
      (p) =>
        p.weekNo === weekNo &&
        p.gradeId === slot.gradeId &&
        p.subjectId === slot.subjectId &&
        p.status === 'APPROVED'
    )
  ).length;

  return Math.round((approved / total) * 100);
}
```

---

## Charts Library

Use **Recharts** for all charts:

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = {
  APPROVED:  '#16a34a',   // green-600
  SUBMITTED: '#2563eb',   // blue-600
  DRAFT:     '#ca8a04',   // yellow-600
  REJECTED:  '#dc2626',   // red-600
  MISSING:   '#f97316',   // orange-500
};
```

---

## Export to CSV

```js
// utils/exportCsv.js
export function exportToCsv(filename, rows) {
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => JSON.stringify(row[h] ?? '')).join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## TanStack Query Setup

```ts
// Until dedicated report endpoints exist, compose from existing queries:
const { data: allPlans } = useQuery({
  queryKey: ['lessonPlans', { semesterId }],
  queryFn: () => getLessonPlans({ semesterId }),
});

const { data: allRoster } = useQuery({
  queryKey: ['roster'],
  queryFn: () => getRoster(),
});

const { data: curriculum } = useQuery({
  queryKey: ['curriculum', { semesterId }],
  queryFn: () => getCurriculum({ semesterId }),
});
```

All metrics are derived from these three data sets via the computation functions above.
