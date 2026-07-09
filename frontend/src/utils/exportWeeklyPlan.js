import * as XLSX from 'xlsx';

export function exportWeeklyPlanToExcel(data, weekNo, gradeLabel, sectionLabel, semesterLabel) {
  const { plans = [], roster = [], days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] } = data;

  // Find unique subjects from roster
  const subjectsMap = new Map();
  roster.forEach(r => {
    if (r.subjectId && r.subjectId._id) {
      subjectsMap.set(r.subjectId._id, r.subjectId.label);
    }
  });
  
  const subjects = Array.from(subjectsMap.values());
  const subjectIds = Array.from(subjectsMap.keys());

  const wsData = [];
  const merges = [];

  // Header rows
  wsData.push(["WEEKLY PLAN"]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: subjects.length + 1 } });
  
  wsData.push([`Grade: ${gradeLabel} ${sectionLabel || ''}`, "", `Week ${weekNo}`, "", `Semester: ${semesterLabel}`]);
  // Merge "Grade", "Week", "Semester" if needed, skipping for now to keep it simple.
  
  wsData.push(["Dear Parents / Guardians"]);
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: subjects.length + 1 } });
  
  wsData.push(["Kindly note that we will be covering the following topics for the next week"]);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: subjects.length + 1 } });
  
  wsData.push([]);

  // Table Headers
  const headerRow = ["Days", "Type", ...subjects];
  wsData.push(headerRow);
  let currentRow = 6; // Next row index

  // Data rows
  days.forEach(day => {
    const rowTopic = [day, "Topic"];
    const rowClasswork = ["", "Classwork"];
    const rowHomework = ["", "Homework"];

    subjectIds.forEach(subId => {
      // Check if subject is taught on this day
      const isTaughtOnDay = roster.some(r => r.subjectId?._id === subId && r.day === day && r.isActive);
      
      if (!isTaughtOnDay) {
        rowTopic.push("-");
        rowClasswork.push("-");
        rowHomework.push("-");
        return;
      }

      // Find the plan for this subject
      const plan = plans.find(p => (p.subjectId?._id || p.subjectId) === subId);
      
      if (plan) {
        rowTopic.push(plan.topic || "");
        rowClasswork.push(plan.resource || "");
        rowHomework.push(plan.assessment || "");
      } else {
        rowTopic.push("");
        rowClasswork.push("");
        rowHomework.push("");
      }
    });

    wsData.push(rowTopic);
    wsData.push(rowClasswork);
    wsData.push(rowHomework);

    // Merge day cell vertically
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow + 2, c: 0 } });
    currentRow += 3;
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!merges'] = merges;

  // Styling (basic width adjustments since XLSX free doesn't support deep styling without pro)
  const cols = [{wch: 10}, {wch: 15}];
  subjects.forEach(() => cols.push({wch: 25}));
  ws['!cols'] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Weekly Plan");
  
  const fileName = `Weekly_Plan_${gradeLabel}_${sectionLabel || ''}_Week${weekNo}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

