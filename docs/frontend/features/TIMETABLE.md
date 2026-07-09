# Feature: Timetable (Brown Sheet)

**Route**: `/timetable`
**Access**: All roles (ADMIN, HOD, TEACHER)
**Backend**: Requires a planned `GET /timetable` endpoint (see API_REFERENCE.md)

---

## Purpose

The timetable (equivalent to the school's "Brown Sheet") is a visual grid showing the weekly schedule for a class section. It displays:

- Which teacher teaches which subject in each time slot
- The lesson plan status for the current week (compliance color coding)
- Pacing alerts for behind-schedule weeks

This is a **read-only** view generated from roster data + lesson plan statuses.

---

## UI Layout

### Filter Bar (top of page)

| Filter | Type | Notes |
|--------|------|-------|
| Grade | `LookupSelect` (GRADE) | Required to load grid |
| Section | Text / Select | Required |
| Semester | `LookupSelect` (SEMESTER) | Required |
| Week No | Number | Defaults to current week |

### Timetable Grid

A 2D grid:
- **Rows**: Periods (Period 1 through Period N)
- **Columns**: Days of the week (Monday–Friday)

Each cell contains:
```
┌─────────────────────────┐
│ Mathematics             │  ← Subject name
│ Mr. Ahmed               │  ← Teacher name
│ ● APPROVED              │  ← Lesson plan status badge (colored dot)
└─────────────────────────┘
```

Empty cells (no roster entry) are shown as gray with "—".

### Cell Color Coding

| Condition | Cell Background | Label |
|-----------|----------------|-------|
| Lesson plan APPROVED | Green | ✓ Approved |
| Lesson plan SUBMITTED | Blue | Pending Review |
| Lesson plan DRAFT | Yellow | Draft |
| No lesson plan (week not passed) | White | No Plan |
| No lesson plan (week already past) | Amber/Orange | Behind Pacing |
| No curriculum entry mapped | Light gray | Not Relevant |

---

## Data Assembly (Frontend)

Since the backend's timetable endpoint may not be ready, the frontend can assemble the grid from existing endpoints:

```js
async function assembleTimetable(gradeId, section, semesterId, weekNo) {
  const [rosterSlots, lessonPlans] = await Promise.all([
    getRoster({ gradeId, section }),
    getLessonPlans({ gradeId, semesterId, weekNo }),
  ]);

  // Map: { day -> { period -> { slot, plan } } }
  const grid = {};

  for (const slot of rosterSlots) {
    if (!grid[slot.day]) grid[slot.day] = {};
    const plan = lessonPlans.find(
      p => p.subjectId === slot.subjectId && p.teacherId === slot.teacherId
    ) ?? null;
    grid[slot.day][slot.period] = {
      subject: slot.subjectId,
      teacher: slot.teacherId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      plan,
      complianceStatus: deriveCellStatus(plan, weekNo),
    };
  }

  return grid;
}

function deriveCellStatus(plan, weekNo) {
  if (!plan) {
    const currentWeek = getCurrentWeekNo();
    return weekNo < currentWeek ? 'BEHIND' : 'NO_PLAN';
  }
  return plan.status; // 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'
}
```

---

## Week Navigation

Provide Previous / Next week navigation buttons:
```
← Week 11    Week 12 (Current)    Week 13 →
```

The "Current" badge is shown on the active school week. Week number is computed using Day.js:

```ts
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(weekOfYear);

const currentWeek = dayjs().week();
```

---

## Print / Export (Brown Sheet)

The timetable page should offer a "Print" or "Export PDF" action that renders the grid in a print-friendly layout:

- Landscape orientation
- School name header
- Grade, Section, Semester, Week in subheader
- Color cells replaced with text status labels (for B&W printing compatibility)
- Teacher signatures row at the bottom (empty lines for physical sign-off)

Implementation: use `window.print()` with a dedicated `@media print` CSS class, or a library like `react-to-print`.

---

## Green Sheet vs Brown Sheet

| Sheet | Definition |
|-------|-----------|
| Green Sheet | Master curriculum plan (all weeks, all subjects, all grades) = Curriculum module |
| Brown Sheet | Weekly timetable with lesson plan status = This timetable view |

The Green Sheet is effectively `GET /curriculum` displayed in a grid format. Consider adding a "Curriculum Grid" tab on this page that shows all weeks for a Grade + Subject + Semester in a calendar-style view.

---

## Curriculum Grid (Green Sheet) Sub-View

A secondary tab on the timetable page showing the full-semester curriculum plan for one Grade + Subject:

**Layout**: A scrollable table:
- **Rows**: Week 1 through Week N
- **Columns**: Standard Code, Description, Skills, Lesson Plan Status

Color coding mirrors the timetable: green = approved, amber = behind, white = upcoming.

---

## TanStack Query Setup

```ts
// Assembled from two existing queries (until dedicated endpoint exists)
useQuery({
  queryKey: ['timetable', { gradeId, section, semesterId, weekNo }],
  queryFn: () => assembleTimetable(gradeId, section, semesterId, weekNo),
  enabled: !!(gradeId && section && semesterId && weekNo),
});
```

---

## Planned Backend Endpoint

When backend implements `GET /timetable`, switch to consuming that directly:

```js
// Future
export const getTimetable = (params) =>
  api.get('/timetable', { params }).then(r => r.data.data);
```

The response shape should be the pre-assembled grid object to avoid multiple round trips.
