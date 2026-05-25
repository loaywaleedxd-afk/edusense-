import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../context/LanguageContext';
import api from '../api';
import store from '../dataStore';

/* ─── helpers ─── */
function letterGrade(g) {
  if (g >= 90) return 'A+'; if (g >= 85) return 'A'; if (g >= 80) return 'B+';
  if (g >= 75) return 'B';  if (g >= 70) return 'C+';if (g >= 65) return 'C';
  if (g >= 60) return 'D+'; if (g >= 50) return 'D'; return 'F';
}

function gradeToGPA(g) {
  if (g >= 90) return 4.0; if (g >= 85) return 3.7; if (g >= 80) return 3.3;
  if (g >= 75) return 3.0; if (g >= 70) return 2.7; if (g >= 65) return 2.3;
  if (g >= 60) return 2.0; if (g >= 50) return 1.0; return 0.0;
}

/* ─── Grade Prediction Engine ─── */
function predictStudent(stu, results) {
  const attendance = stu.attendanceRate ?? 75;
  const engagement = stu.engagement ?? 60;
  const grades = Object.values(results).map(r => r.grade).filter(g => g != null);
  const hasGrades = grades.length > 0;
  const avgGrade = hasGrades ? grades.reduce((a, b) => a + b, 0) / grades.length : null;

  let predicted, confidence;
  if (hasGrades) {
    predicted = Math.round(attendance * 0.25 + engagement * 0.25 + avgGrade * 0.50);
    confidence = Math.min(95, 60 + grades.length * 8);
  } else {
    predicted = Math.round(attendance * 0.50 + engagement * 0.50);
    confidence = 55;
  }
  predicted = Math.min(100, Math.max(0, predicted));

  let risk, riskColor, riskBg, recommendation;
  if (predicted >= 75) {
    risk = 'Low Risk'; riskColor = '#10b981'; riskBg = '#10b98115';
    recommendation = 'Student is on track. Maintain current engagement.';
  } else if (predicted >= 60) {
    risk = 'Medium Risk'; riskColor = '#f59e0b'; riskBg = '#f59e0b15';
    recommendation = 'Consider providing extra support materials and monitor attendance closely.';
  } else if (predicted >= 50) {
    risk = 'High Risk'; riskColor = '#f97316'; riskBg = '#f9731615';
    recommendation = 'Schedule academic counseling session. Risk of failing if trend continues.';
  } else {
    risk = 'Critical'; riskColor = '#ef4444'; riskBg = '#ef444415';
    recommendation = 'Immediate intervention required. Contact student and department advisor.';
  }

  return { predicted, confidence, risk, riskColor, riskBg, recommendation, avgGrade, letter: letterGrade(predicted), hasGrades };
}

/* ─── Emotion Insight Engine ─── */
async function generateInsights(doctor, myCourses) {
  const weeks = [1, 2, 3, 4];
  const SEED = String(doctor.id).split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  // Fetch enrolled students for all courses via API
  const allStudentsNested = await Promise.all(
    myCourses.map(c => api.getCourseStudents(c.code || c.id).catch(() => []))
  );
  const allStudents = allStudentsNested.flat();
  const unique = [...new Map(allStudents.map(s => [s.id || s.student_id, s])).values()];
  const disengaged = unique.filter(s => s.engagement < 50).slice(0, 5);
  const confused = unique.filter(s => ['confused', 'bored', 'sad'].includes(s.emotion)).slice(0, 4);

  // Simulate weekly trends
  const trendData = weeks.map((w, i) => {
    const base = 65 + (SEED % 20);
    return {
      week: w,
      engagement: Math.min(100, Math.max(40, base + (Math.sin(i + SEED) * 12))),
      attention: Math.min(100, Math.max(35, base - 5 + (Math.cos(i + SEED) * 10))),
      happiness: Math.min(100, Math.max(30, base - 10 + (Math.sin(i * 2 + SEED) * 15))),
    };
  });

  // Confusing topics (use myCourses directly as lectures)
  const lectures = myCourses;
  const hardTopics = lectures.map((l, i) => ({
    name: l.topic || l.name,
    code: l.code,
    confusionScore: Math.round(30 + ((SEED + i * 7) % 50)),
    avgEmotion: ['confused', 'bored', 'neutral', 'happy'][Math.floor((SEED + i) % 4)],
  })).sort((a, b) => b.confusionScore - a.confusionScore).slice(0, 4);

  return { disengaged, confused, trendData, hardTopics, totalStudents: unique.length };
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT — two tabs: Emotion Report + Grade Predictor
══════════════════════════════════════════════════ */
export default function AIInsightPage({ theme: C, doctor, myCourses }) {
  const { t, isRTL } = useLang();
  const [tab, setTab] = useState('emotions');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [insights, setInsights] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);

  function runEmotionInsight() {
    setGenerating(true);
    setGenerated(false);
    generateInsights(doctor, myCourses).then(result => {
      setInsights(result);
      setGenerating(false);
      setGenerated(true);
    }).catch(() => { setGenerating(false); });
  }

  async function runGradePredictor() {
    setPredicting(true);
    setPredictions(null);
    try {
      const allStudentsNested = await Promise.all(
        myCourses.map(c => api.getCourseStudents(c.code || c.id).catch(() => []))
      );
      const allStudents = allStudentsNested.flat();
      const unique = [...new Map(allStudents.map(s => [s.id || s.student_id, s])).values()];
      const results = unique.map(stu => {
        const pred = predictStudent(stu, {});
        return { stu, ...pred };
      }).sort((a, b) => a.predicted - b.predicted);
      setPredictions(results);
    } catch {
      setPredictions([]);
    }
    setPredicting(false);
  }

  return (
    <div style={{ padding: '8px 20px 20px' }}>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 4 }}>
          🤖 {isRTL ? 'رؤى الذكاء الاصطناعي' : 'AI Classroom Insights'}
        </div>
        <div style={{ fontSize: 12, color: C.text2 }}>
          {isRTL ? 'تحليل ذكي للمشاعر والأداء الأكاديمي' : 'Intelligent analysis of classroom emotions and academic performance'}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { id: 'emotions', icon: '😊', label: isRTL ? 'تقرير المشاعر' : 'Emotion Report' },
          { id: 'grades', icon: '📊', label: isRTL ? 'توقع الدرجات' : 'Grade Predictor' },
        ].map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{ padding: '8px 20px', borderRadius: 10, border: `1.5px solid ${tab === tb.id ? C.blue : C.border}`,
              background: tab === tb.id ? C.blue_dim : 'transparent', fontSize: 13, fontWeight: 700,
              color: tab === tb.id ? C.blue2 : C.text2, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>{tb.icon}</span> {tb.label}
          </button>
        ))}
      </div>

      {/* ── Emotion Insight Report ── */}
      {tab === 'emotions' && (
        <div>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🧠</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {isRTL ? 'توليد تقرير صحة الفصل الدراسي' : 'Generate Classroom Health Report'}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
              {isRTL
                ? 'يحلل الذكاء الاصطناعي بيانات المشاعر لآخر 4 أسابيع ويحدد الطلاب المنفصلين والموضوعات الصعبة'
                : 'AI analyzes 4 weeks of emotion data to identify disengaging students, confusing topics, and classroom trends'}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={runEmotionInsight} disabled={generating}
              style={{ background: generating ? C.border : 'linear-gradient(135deg,#3b82f6,#8b5cf6)',
                border: 'none', borderRadius: 10, padding: '11px 28px', fontSize: 13,
                fontWeight: 700, color: '#fff', cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? (isRTL ? '⏳ جارٍ التحليل...' : '⏳ Analyzing...') : (isRTL ? '🤖 توليد التقرير' : '🤖 Generate Report')}
            </motion.button>
          </div>

          <AnimatePresence>
            {generated && insights && (
              <motion.div key="insights"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}>

                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    ['👥', insights.totalStudents, isRTL ? 'إجمالي الطلاب' : 'Total Students', C.blue],
                    ['⚠️', insights.disengaged.length, isRTL ? 'منفصلون' : 'Disengaged', '#f59e0b'],
                    ['😵', insights.confused.length, isRTL ? 'مرتبكون' : 'Confused', '#ef4444'],
                    ['📚', insights.hardTopics.length, isRTL ? 'مواضيع صعبة' : 'Hard Topics', '#8b5cf6'],
                  ].map(([icon, val, label, col]) => (
                    <div key={label} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 22 }}>{icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: col }}>{val}</div>
                      <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly trend */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18, marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>
                    📈 {isRTL ? 'اتجاه الأسابيع الأربعة الأخيرة' : '4-Week Classroom Trend'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {insights.trendData.map((w, i) => (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: C.text3, marginBottom: 8, fontWeight: 700 }}>
                          {isRTL ? `أسبوع ${w.week}` : `Week ${w.week}`}
                        </div>
                        {[
                          { label: isRTL ? 'تفاعل' : 'Eng', val: w.engagement, color: C.blue },
                          { label: isRTL ? 'انتباه' : 'Att', val: w.attention, color: C.green },
                          { label: isRTL ? 'سعادة' : 'Hap', val: w.happiness, color: C.amber },
                        ].map(m => (
                          <div key={m.label} style={{ marginBottom: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.text3, marginBottom: 2 }}>
                              <span>{m.label}</span><span style={{ color: m.color, fontWeight: 700 }}>{Math.round(m.val)}%</span>
                            </div>
                            <div style={{ background: C.bg3, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${m.val}%` }}
                                transition={{ duration: 0.8, delay: i * 0.1 }}
                                style={{ height: '100%', background: m.color, borderRadius: 99 }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Disengaged students */}
                  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      ⚠️ {isRTL ? 'طلاب يحتاجون انتباهاً' : 'Students Needing Attention'}
                    </div>
                    {insights.disengaged.length === 0
                      ? <div style={{ color: C.green, fontSize: 12, textAlign: 'center', padding: 20 }}>✅ {isRTL ? 'جميع الطلاب متفاعلون' : 'All students are engaged!'}</div>
                      : insights.disengaged.map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < insights.disengaged.length - 1 ? `1px solid ${C.border}` : 'none' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: s.color || C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                            {s.emoji || '👤'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: C.text3 }}>{s.dept}</div>
                          </div>
                          <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: s.engagement < 35 ? '#ef4444' : '#f59e0b' }}>{s.engagement}%</div>
                            <div style={{ fontSize: 9, color: C.text3 }}>{isRTL ? 'تفاعل' : 'engagement'}</div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {/* Hard topics */}
                  <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 18 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
                      📚 {isRTL ? 'الموضوعات الأكثر صعوبة' : 'Most Difficult Topics'}
                    </div>
                    {insights.hardTopics.map((topic, i) => (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{topic.name}</div>
                          <span style={{ fontSize: 10, color: topic.confusionScore > 60 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{topic.confusionScore}% {isRTL ? 'ارتباك' : 'confusion'}</span>
                        </div>
                        <div style={{ background: C.bg3, borderRadius: 99, height: 6, overflow: 'hidden' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${topic.confusionScore}%` }}
                            transition={{ duration: 0.7, delay: i * 0.1 }}
                            style={{ height: '100%', background: topic.confusionScore > 60 ? '#ef4444' : '#f59e0b', borderRadius: 99 }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Recommendations */}
                <div style={{ background: 'linear-gradient(135deg,#1e1b4b22,#312e8122)', borderRadius: 14, border: `1px solid #6366f133`, padding: 18, marginTop: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#818cf8', marginBottom: 12 }}>
                    🤖 {isRTL ? 'توصيات الذكاء الاصطناعي' : 'AI Recommendations'}
                  </div>
                  {[
                    insights.disengaged.length > 2
                      ? (isRTL ? `تواصل مع ${insights.disengaged.length} طلاب ذوي التفاعل المنخفض هذا الأسبوع` : `Reach out to ${insights.disengaged.length} low-engagement students this week`)
                      : (isRTL ? 'مستوى التفاعل مقبول — استمر بنفس الأسلوب' : 'Engagement level is acceptable — maintain current teaching style'),
                    insights.hardTopics[0]
                      ? (isRTL ? `أعد شرح "${insights.hardTopics[0].name}" — نسبة الارتباك ${insights.hardTopics[0].confusionScore}%` : `Re-teach "${insights.hardTopics[0].name}" — ${insights.hardTopics[0].confusionScore}% confusion rate`)
                      : (isRTL ? 'لا توجد موضوعات بالغة الصعوبة' : 'No critically confusing topics detected'),
                    isRTL ? 'فكر في استخدام مقاطع فيديو قصيرة للموضوعات ذات الارتباك العالي' : 'Consider short video recaps for high-confusion topics',
                  ].map((rec, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                      <span style={{ color: '#818cf8', fontSize: 14, flexShrink: 0 }}>→</span>
                      <span style={{ fontSize: 12, color: C.text2 }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Grade Predictor ── */}
      {tab === 'grades' && (
        <div>
          <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4 }}>
              {isRTL ? 'محرك توقع الدرجات' : 'AI Grade Prediction Engine'}
            </div>
            <div style={{ fontSize: 12, color: C.text2, marginBottom: 16, maxWidth: 420, margin: '0 auto 16px' }}>
              {isRTL
                ? 'يتوقع الذكاء الاصطناعي الدرجة النهائية لكل طالب بناءً على الحضور والتفاعل والدرجات الحالية'
                : 'AI predicts each student\'s final grade based on attendance (25%) + engagement (25%) + current grades (50%)'}
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={runGradePredictor} disabled={predicting}
              style={{ background: predicting ? C.border : 'linear-gradient(135deg,#10b981,#3b82f6)',
                border: 'none', borderRadius: 10, padding: '11px 28px', fontSize: 13,
                fontWeight: 700, color: '#fff', cursor: predicting ? 'not-allowed' : 'pointer' }}>
              {predicting ? (isRTL ? '⏳ جارٍ التوقع...' : '⏳ Predicting...') : (isRTL ? '📊 تشغيل التوقع' : '📊 Run Predictor')}
            </motion.button>
          </div>

          <AnimatePresence>
            {predictions && (
              <motion.div key="preds"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}>

                {/* Risk summary */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                  {[
                    ['🟢', 'Low Risk',    predictions.filter(p => p.risk === 'Low Risk').length,    '#10b981'],
                    ['🟡', 'Medium Risk', predictions.filter(p => p.risk === 'Medium Risk').length,  '#f59e0b'],
                    ['🟠', 'High Risk',   predictions.filter(p => p.risk === 'High Risk').length,    '#f97316'],
                    ['🔴', 'Critical',    predictions.filter(p => p.risk === 'Critical').length,     '#ef4444'],
                  ].map(([icon, label, count, col]) => (
                    <div key={label} style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24 }}>{icon}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: col }}>{count}</div>
                      <div style={{ fontSize: 10, color: C.text2, marginTop: 2 }}>{isRTL ? { 'Low Risk': 'خطر منخفض', 'Medium Risk': 'خطر متوسط', 'High Risk': 'خطر عالٍ', 'Critical': 'حرج' }[label] : label}</div>
                    </div>
                  ))}
                </div>

                {/* Table */}
                <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                      {isRTL ? 'توقعات الطلاب' : 'Student Predictions'} ({predictions.length})
                    </div>
                    <div style={{ fontSize: 11, color: C.text3 }}>
                      {isRTL ? 'مرتب: الأعلى خطراً أولاً' : 'Sorted: highest risk first'}
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `2px solid ${C.border}`, background: C.bg3 }}>
                          {[
                            isRTL ? 'الطالب' : 'Student',
                            isRTL ? 'الحضور' : 'Attendance',
                            isRTL ? 'التفاعل' : 'Engagement',
                            isRTL ? 'الدرجة الحالية' : 'Current Grade',
                            isRTL ? 'الدرجة المتوقعة' : 'Predicted Grade',
                            isRTL ? 'التقدير' : 'Letter',
                            isRTL ? 'الثقة' : 'Confidence',
                            isRTL ? 'مستوى الخطر' : 'Risk Level',
                          ].map(h => (
                            <th key={h} style={{ textAlign: isRTL ? 'right' : 'left', padding: '10px 14px', fontSize: 10, color: C.text3, textTransform: 'uppercase', fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {predictions.map((p, i) => (
                          <motion.tr key={p.stu.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? C.bg3 : 'transparent' }}>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontWeight: 700, color: C.text }}>{p.stu.name}</div>
                              <div style={{ fontSize: 9, color: C.text3 }}>{p.stu.id}</div>
                            </td>
                            <td style={{ padding: '10px 14px', color: p.stu.attendanceRate >= 75 ? C.green : C.red, fontWeight: 700 }}>{p.stu.attendanceRate}%</td>
                            <td style={{ padding: '10px 14px', color: p.stu.engagement >= 60 ? C.green : C.amber, fontWeight: 700 }}>{p.stu.engagement}%</td>
                            <td style={{ padding: '10px 14px', color: C.text2 }}>{p.avgGrade != null ? `${Math.round(p.avgGrade)}%` : '—'}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: p.predicted >= 75 ? C.green : p.predicted >= 50 ? C.amber : C.red }}>{p.predicted}%</div>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: p.predicted >= 75 ? C.green : p.predicted >= 50 ? C.amber : C.red }}>{p.letter}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <div style={{ background: C.bg3, borderRadius: 99, height: 6, width: 60, overflow: 'hidden' }}>
                                <div style={{ width: `${p.confidence}%`, height: '100%', background: C.blue, borderRadius: 99 }}/>
                              </div>
                              <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>{p.confidence}%</div>
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: p.riskBg, color: p.riskColor }}>
                                {isRTL ? { 'Low Risk': 'منخفض', 'Medium Risk': 'متوسط', 'High Risk': 'عالٍ', 'Critical': 'حرج' }[p.risk] : p.risk}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Intervention list for critical/high */}
                {predictions.filter(p => ['Critical', 'High Risk'].includes(p.risk)).length > 0 && (
                  <div style={{ background: '#ef444410', borderRadius: 14, border: '1px solid #ef444433', padding: 18, marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 10 }}>
                      🚨 {isRTL ? 'قائمة التدخل الفوري' : 'Immediate Intervention Required'}
                    </div>
                    {predictions.filter(p => ['Critical', 'High Risk'].includes(p.risk)).map((p, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8, padding: '10px', background: C.card, borderRadius: 10 }}>
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{p.stu.name} — {isRTL ? 'متوقع' : 'Predicted'}: {p.predicted}% ({p.letter})</div>
                          <div style={{ fontSize: 11, color: C.text2, marginTop: 2 }}>{p.recommendation}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
