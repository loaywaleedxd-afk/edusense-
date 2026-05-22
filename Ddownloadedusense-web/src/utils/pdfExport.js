import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND = '⚡ EduSense';
const INDIGO = [99, 102, 241];
const GRAY   = [100, 116, 139];

function header(doc, title, subtitle) {
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('EduSense', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Powered University Management System', 14, 19);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(title, 210 - 14, 12, { align: 'right' });

  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 210 - 14, 19, { align: 'right' });
  }

  doc.setTextColor(0, 0, 0);
  return 36;
}

function footer(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-GB')} · EduSense Academic System`,
      14, 290
    );
    doc.text(`Page ${i} of ${pageCount}`, 210 - 14, 290, { align: 'right' });
  }
}

function infoGrid(doc, y, items) {
  const colW = 46;
  items.forEach(([label, value], i) => {
    const x = 14 + (i % 4) * colW;
    const row = Math.floor(i / 4);
    const ry = y + row * 16;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), x, ry);
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value ?? '—'), x, ry + 6);
  });
  const rows = Math.ceil(items.length / 4);
  return y + rows * 16 + 4;
}

function letterGrade(g) {
  if (g >= 90) return 'A+';
  if (g >= 85) return 'A';
  if (g >= 80) return 'A-';
  if (g >= 75) return 'B+';
  if (g >= 70) return 'B';
  if (g >= 65) return 'B-';
  if (g >= 60) return 'C+';
  if (g >= 50) return 'C';
  return 'F';
}

/* ── GRADES PDF ── */
export function exportGradesPDF({ studentName, studentId, dept, year, email, results, courses }) {
  const doc = new jsPDF();
  let y = header(doc, 'Grade Report', `Generated ${new Date().toLocaleDateString('en-GB')}`);

  y = infoGrid(doc, y, [
    ['Student', studentName],
    ['ID', studentId],
    ['Department', dept],
    ['Year', year],
    ['Email', email || '—'],
  ]);

  y += 4;

  const entries = Object.entries(results || {});
  const grades  = entries.map(([, v]) => v.grade);
  const avg     = grades.length ? +(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : 0;
  const passed  = grades.filter(g => g >= 50).length;

  const rows = entries.map(([cid, rec]) => {
    const course = courses.find(c => c.id === cid);
    const g = rec.grade;
    return [course?.name || cid, cid, `${g}%`, letterGrade(g), g >= 50 ? 'Pass' : 'Fail'];
  });

  autoTable(doc, {
    startY: y,
    head: [['Course Name', 'Code', 'Grade', 'Letter', 'Status']],
    body: rows,
    headStyles: { fillColor: INDIGO, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 4) {
        data.cell.styles.textColor = data.cell.raw === 'Pass' ? [16, 185, 129] : [239, 68, 68];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(`Subjects Graded: ${grades.length}   Average: ${avg}%   Passed: ${passed}/${grades.length}`, 14, finalY);

  footer(doc);
  doc.save(`grades_${studentId}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── TRANSCRIPT PDF ── */
export function exportTranscriptPDF({ stu, rows, semGPA, standing, semester, fee }) {
  const doc = new jsPDF();
  let y = header(doc, 'Official Transcript', semester);

  y = infoGrid(doc, y, [
    ['Full Name',        stu.name],
    ['Student ID',       stu.id],
    ['Department',       stu.dept],
    ['Year of Study',    stu.year],
    ['Email',            stu.email || '—'],
    ['Semester',         semester],
    ['Semester GPA',     semGPA],
    ['Academic Standing', standing],
    ['Fee Status',       fee?.paid ? 'Cleared' : 'Pending'],
  ]);

  y += 4;

  const tableRows = rows.map(r => [
    r.course.name,
    r.course.code,
    '3',
    `${r.att}%`,
    r.grade != null ? `${r.grade}%` : '—',
    r.grade != null ? letterGrade(r.grade) : '—',
    r.grade != null ? (r.grade >= 50 ? 'Pass' : 'Fail') : 'Pending',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Course', 'Code', 'Credits', 'Attendance', 'Grade', 'Letter', 'Status']],
    body: tableRows,
    headStyles: { fillColor: INDIGO, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'center' },
    },
    didParseCell(data) {
      if (data.section === 'body' && data.column.index === 6) {
        const v = data.cell.raw;
        data.cell.styles.textColor = v === 'Pass' ? [16, 185, 129] : v === 'Fail' ? [239, 68, 68] : [245, 158, 11];
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.section === 'body' && data.column.index === 3) {
        const pct = parseInt(data.cell.raw);
        data.cell.styles.textColor = pct >= 75 ? [16, 185, 129] : pct >= 60 ? [245, 158, 11] : [239, 68, 68];
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(
    `Total Credit Hours: ${rows.length * 3}   Semester GPA: ${semGPA}   Academic Standing: ${standing}`,
    14, finalY
  );

  footer(doc);
  doc.save(`transcript_${stu.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

/* ── PORTFOLIO PDF ── */
export function exportPortfolioPDF({ stu, courses, results, attendanceRate, gpa, standing }) {
  const doc = new jsPDF();
  let y = header(doc, 'Student Portfolio', `Academic Year 2024–2025`);

  y = infoGrid(doc, y, [
    ['Name',             stu.name],
    ['Student ID',       stu.id],
    ['Department',       stu.dept],
    ['Year',             stu.year],
    ['Email',            stu.email || '—'],
    ['GPA',              gpa ?? '—'],
    ['Attendance',       `${attendanceRate}%`],
    ['Standing',         standing],
  ]);

  y += 4;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...INDIGO);
  doc.text('Enrolled Courses', 14, y);
  y += 6;

  const courseRows = courses.map(c => {
    const rec = (results || {})[c.id];
    return [
      c.name,
      c.code,
      c.doctorName || '—',
      c.daysLabel || '—',
      rec ? `${rec.grade}%` : 'Pending',
      rec ? letterGrade(rec.grade) : '—',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Course', 'Code', 'Instructor', 'Schedule', 'Grade', 'Letter']],
    body: courseRows,
    headStyles: { fillColor: INDIGO, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  footer(doc);
  doc.save(`portfolio_${stu.id}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
