import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/* Renders a hidden HTML div → canvas → PDF download */
async function htmlToPDF(htmlContent, filename) {
  const container = document.createElement('div');
  container.style.cssText = [
    'position:fixed', 'left:-9999px', 'top:0',
    'width:794px', 'background:#ffffff',
    'font-family:Arial,Helvetica,sans-serif',
    'color:#1e293b', 'font-size:13px', 'line-height:1.5',
  ].join(';');
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, logging: false,
      backgroundColor: '#ffffff',
    });
    const imgData  = canvas.toDataURL('image/png');
    const pdf      = new jsPDF('p', 'mm', 'a4');
    const pdfW     = pdf.internal.pageSize.getWidth();
    const pdfH     = pdf.internal.pageSize.getHeight();
    const imgH     = (canvas.height * pdfW) / canvas.width;
    let   heightLeft = imgH;
    let   position  = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
    heightLeft -= pdfH;

    while (heightLeft > 0) {
      position -= pdfH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, imgH);
      heightLeft -= pdfH;
    }

    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

/* ── Shared style blocks ── */
const BASE_STYLE = `
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;background:#fff}
    .header{background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;padding:28px 36px;display:flex;justify-content:space-between;align-items:flex-start}
    .header-left h1{font-size:22px;font-weight:800;letter-spacing:-0.5px}
    .header-left p{font-size:11px;opacity:.75;margin-top:3px}
    .header-right{text-align:right}
    .header-right h2{font-size:16px;font-weight:700}
    .header-right p{font-size:11px;opacity:.75;margin-top:3px}
    .body{padding:28px 36px}
    .info-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px;background:#f8fafc;border-radius:10px;padding:16px;border:1px solid #e2e8f0}
    .info-item label{display:block;font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px}
    .info-item span{font-size:13px;font-weight:600;color:#1e293b}
    .section-title{font-size:13px;font-weight:700;color:#4f46e5;margin-bottom:10px;padding-bottom:5px;border-bottom:2px solid #e0e7ff}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead tr{background:#4f46e5;color:#fff}
    th{padding:9px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
    td{padding:9px 10px;border-bottom:1px solid #f1f5f9}
    tr:nth-child(even) td{background:#f8fafc}
    .pass{color:#10b981;font-weight:700}
    .fail{color:#ef4444;font-weight:700}
    .pending{color:#f59e0b;font-weight:700}
    .att-good{color:#10b981;font-weight:700}
    .att-warn{color:#f59e0b;font-weight:700}
    .att-bad{color:#ef4444;font-weight:700}
    .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
    .summary-row{display:flex;gap:16px;margin-top:14px}
    .summary-box{flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;text-align:center}
    .summary-box .val{font-size:20px;font-weight:800;color:#4f46e5}
    .summary-box .lbl{font-size:10px;color:#94a3b8;margin-top:3px}
  </style>
`;

function letterGrade(g) {
  if (g >= 90) return 'A+'; if (g >= 85) return 'A';
  if (g >= 80) return 'A-'; if (g >= 75) return 'B+';
  if (g >= 70) return 'B';  if (g >= 65) return 'B-';
  if (g >= 60) return 'C+'; if (g >= 50) return 'C';
  return 'F';
}

function infoGrid(items) {
  return `<div class="info-grid">${items.map(([label, val]) =>
    `<div class="info-item"><label>${label}</label><span>${val ?? '—'}</span></div>`
  ).join('')}</div>`;
}

function footer() {
  return `<div class="footer">
    <span>⚡ EduSense · AI-Powered University Management System</span>
    <span>Generated ${new Date().toLocaleDateString('en-GB')}</span>
  </div>`;
}

/* ── GRADES PDF ── */
export async function exportGradesPDF({ studentName, studentId, dept, year, email, results, courses }) {
  const entries = Object.entries(results || {});
  const grades  = entries.map(([, v]) => v.grade);
  const avg     = grades.length ? +(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : 0;
  const passed  = grades.filter(g => g >= 50).length;
  const highest = grades.length ? Math.max(...grades) : 0;

  const rows = entries.map(([cid, rec]) => {
    const course = courses.find(c => c.id === cid);
    const g = rec.grade;
    const status = g >= 50 ? 'pass' : 'fail';
    return `<tr>
      <td>${course?.name || cid}</td>
      <td>${cid}</td>
      <td style="text-align:center;font-weight:700">${g}%</td>
      <td style="text-align:center;font-weight:700">${letterGrade(g)}</td>
      <td style="text-align:center" class="${status}">${g >= 50 ? 'Pass' : 'Fail'}</td>
    </tr>`;
  }).join('');

  const html = `${BASE_STYLE}
  <div class="header">
    <div class="header-left"><h1>EduSense</h1><p>AI-Powered University Management System</p></div>
    <div class="header-right"><h2>Grade Report</h2><p>Generated ${new Date().toLocaleDateString('en-GB')}</p></div>
  </div>
  <div class="body">
    ${infoGrid([['Name', studentName], ['Student ID', studentId], ['Department', dept], ['Year', year], ['Email', email || '—']])}
    <div class="section-title">Course Grades</div>
    <table>
      <thead><tr><th>Course Name</th><th>Code</th><th style="text-align:center">Grade</th><th style="text-align:center">Letter</th><th style="text-align:center">Status</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No grades recorded yet</td></tr>'}</tbody>
    </table>
    <div class="summary-row">
      <div class="summary-box"><div class="val">${grades.length}</div><div class="lbl">Subjects Graded</div></div>
      <div class="summary-box"><div class="val">${avg}%</div><div class="lbl">Average</div></div>
      <div class="summary-box"><div class="val">${passed}/${grades.length}</div><div class="lbl">Passed</div></div>
      <div class="summary-box"><div class="val">${highest}%</div><div class="lbl">Highest</div></div>
    </div>
    ${footer()}
  </div>`;

  await htmlToPDF(html, `grades_${studentId}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── TRANSCRIPT PDF ── */
export async function exportTranscriptPDF({ stu, rows, semGPA, standing, semester, fee }) {
  const tableRows = rows.map(r => {
    const attClass = r.att >= 75 ? 'att-good' : r.att >= 60 ? 'att-warn' : 'att-bad';
    const gradeStr = r.grade != null ? `${r.grade}%` : '—';
    const letter   = r.grade != null ? letterGrade(r.grade) : '—';
    const statusCls = r.grade != null ? (r.grade >= 50 ? 'pass' : 'fail') : 'pending';
    const statusTxt = r.grade != null ? (r.grade >= 50 ? 'Pass' : 'Fail') : 'Pending';
    return `<tr>
      <td>${r.course.name}</td>
      <td>${r.course.code}</td>
      <td style="text-align:center">3</td>
      <td style="text-align:center" class="${attClass}">${r.att}%</td>
      <td style="text-align:center;font-weight:700">${gradeStr}</td>
      <td style="text-align:center;font-weight:700">${letter}</td>
      <td style="text-align:center" class="${statusCls}">${statusTxt}</td>
    </tr>`;
  }).join('');

  const html = `${BASE_STYLE}
  <div class="header">
    <div class="header-left"><h1>EduSense</h1><p>AI-Powered University Management System</p></div>
    <div class="header-right"><h2>Official Transcript</h2><p>${semester}</p></div>
  </div>
  <div class="body">
    ${infoGrid([
      ['Full Name', stu.name], ['Student ID', stu.id],
      ['Department', stu.dept], ['Year of Study', stu.year],
      ['Email', stu.email || '—'], ['Semester', semester],
      ['Semester GPA', semGPA], ['Academic Standing', standing],
      ['Fee Status', fee?.paid ? '✓ Cleared' : '⚠ Pending'],
    ])}
    <div class="section-title">Course Record — ${semester}</div>
    <table>
      <thead><tr><th>Course</th><th>Code</th><th style="text-align:center">Credits</th><th style="text-align:center">Attendance</th><th style="text-align:center">Grade</th><th style="text-align:center">Letter</th><th style="text-align:center">Status</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
    <div class="summary-row">
      <div class="summary-box"><div class="val">${rows.length * 3}</div><div class="lbl">Total Credit Hours</div></div>
      <div class="summary-box"><div class="val">${semGPA}</div><div class="lbl">Semester GPA</div></div>
      <div class="summary-box"><div class="val">${standing}</div><div class="lbl">Academic Standing</div></div>
    </div>
    ${footer()}
  </div>`;

  await htmlToPDF(html, `transcript_${stu.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── PORTFOLIO PDF ── */
export async function exportPortfolioPDF({ stu, courses, results, attendanceRate, gpa, standing }) {
  const courseRows = courses.map(c => {
    const rec = (results || {})[c.id];
    const g = rec?.grade;
    return `<tr>
      <td>${c.name}</td>
      <td>${c.code}</td>
      <td>${c.doctorName || '—'}</td>
      <td>${c.daysLabel || '—'}</td>
      <td style="text-align:center;font-weight:700">${g != null ? g + '%' : '—'}</td>
      <td style="text-align:center;font-weight:700" class="${g != null ? (g >= 50 ? 'pass' : 'fail') : 'pending'}">${g != null ? letterGrade(g) : 'Pending'}</td>
    </tr>`;
  }).join('');

  const html = `${BASE_STYLE}
  <div class="header">
    <div class="header-left"><h1>EduSense</h1><p>AI-Powered University Management System</p></div>
    <div class="header-right"><h2>Student Portfolio</h2><p>Academic Year 2024–2025</p></div>
  </div>
  <div class="body">
    ${infoGrid([
      ['Name', stu.name], ['Student ID', stu.id],
      ['Department', stu.dept], ['Year', stu.year],
      ['Email', stu.email || '—'], ['GPA', gpa ?? '—'],
      ['Attendance', `${attendanceRate}%`], ['Standing', standing],
    ])}
    <div class="section-title">Enrolled Courses</div>
    <table>
      <thead><tr><th>Course</th><th>Code</th><th>Instructor</th><th>Schedule</th><th style="text-align:center">Grade</th><th style="text-align:center">Letter</th></tr></thead>
      <tbody>${courseRows || '<tr><td colspan="6" style="text-align:center;color:#94a3b8;padding:20px">No courses enrolled</td></tr>'}</tbody>
    </table>
    ${footer()}
  </div>`;

  await htmlToPDF(html, `portfolio_${stu.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── STUDENT REPORT (Admin / Doctor use) ── */
export async function exportStudentReportPDF({ student, courses, results }) {
  const courseRows = courses.map((c, i) => {
    const rec = (results || {})[c.id];
    const g = rec?.grade;
    const att = Math.min(100, Math.max(50, (student.attendanceRate || 75) + ((i * 17) % 20) - 10));
    return `<tr>
      <td>${c.name}</td>
      <td>${c.code}</td>
      <td style="text-align:center;font-weight:700">${g != null ? g + '%' : '—'}</td>
      <td style="text-align:center;font-weight:700">${g != null ? letterGrade(g) : '—'}</td>
      <td style="text-align:center" class="${att >= 75 ? 'att-good' : att >= 60 ? 'att-warn' : 'att-bad'}">${att}%</td>
    </tr>`;
  }).join('');

  const html = `${BASE_STYLE}
  <div class="header">
    <div class="header-left"><h1>EduSense</h1><p>AI-Powered University Management System</p></div>
    <div class="header-right"><h2>Academic Portfolio</h2><p>Generated ${new Date().toLocaleDateString('en-GB')}</p></div>
  </div>
  <div class="body">
    ${infoGrid([
      ['Name', student.name], ['Student ID', student.id],
      ['Department', student.dept], ['Year', student.year],
      ['Email', student.email || '—'], ['GPA', student.gpa ?? '—'],
      ['Attendance', `${student.attendanceRate}%`], ['Engagement', `${student.engagement}%`],
    ])}
    <div class="section-title">Course Grades</div>
    <table>
      <thead><tr><th>Course</th><th>Code</th><th style="text-align:center">Grade</th><th style="text-align:center">Letter</th><th style="text-align:center">Attendance</th></tr></thead>
      <tbody>${courseRows || '<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:20px">No courses enrolled</td></tr>'}</tbody>
    </table>
    <div class="summary-row">
      <div class="summary-box"><div class="val">${student.gpa ?? '—'}</div><div class="lbl">GPA</div></div>
      <div class="summary-box"><div class="val">${student.attendanceRate}%</div><div class="lbl">Attendance</div></div>
      <div class="summary-box"><div class="val">${student.engagement}%</div><div class="lbl">Engagement</div></div>
      <div class="summary-box"><div class="val">${student.attentionScore}%</div><div class="lbl">Attention</div></div>
    </div>
    ${footer()}
  </div>`;

  await htmlToPDF(html, `student_report_${student.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
