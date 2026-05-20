import { createContext, useContext, useState, useEffect } from 'react';

export const TRANSLATIONS = {
  en: {
    // ── Nav items ────────────────────────────────────────────────────────────
    dashboard: 'Dashboard', attendance: 'My Attendance', emotions: 'My Emotions',
    schedule: 'Schedule', performance: 'Performance', grades: 'My Grades',
    portfolio: 'My Portfolio', chat: 'Community', moodle: 'Moodle',
    appeals: 'My Appeals', transcript: 'Transcript', announcements: 'Announcements',
    exams: 'Exam Schedule', degreeaudit: 'Degree Audit', resources: 'Study Resources',
    assignments: 'Assignments', gpa_calc: 'GPA Calculator', timetable: 'Timetable',
    digital_id: 'Digital ID Card', fee_history: 'Fee History', office_hours: 'Office Hours',
    notifications: 'Notifications',
    // Doctor nav
    live: 'Live Session', lectures: 'My Lectures', students: 'Students',
    analytics: 'Analytics', detector: 'Topic Detector', alerts: 'Alerts',
    ranalysis: 'R Analysis',
    // ── Page headings ─────────────────────────────────────────────────────────
    page_attendance: 'My Attendance', page_emotions: 'My Emotion Profile',
    page_schedule: 'My Schedule', page_performance: 'Performance Analytics',
    page_grades: 'My Exam Results', page_portfolio: 'My Academic Portfolio',
    page_appeals: 'My Appeals', page_transcript: 'Academic Transcript',
    page_announcements: 'Announcements', page_exams: 'Exam Schedule',
    page_degreeaudit: 'Degree Audit', page_resources: 'Study Resources',
    page_assignments: 'Assignments', page_chat: 'Community Chat',
    page_moodle: 'Moodle', page_dashboard: 'Dashboard',
    // Doctor page headings
    page_live: 'Live Session', page_lectures: 'My Lectures',
    page_students: 'Students', page_doc_grades: 'Exam Results',
    page_analytics: 'Analytics', page_detector: 'AI Topic Detector',
    page_alerts: 'Alerts', page_announcements_doc: 'Announcements',
    // ── Section sub-titles ────────────────────────────────────────────────────
    sub_attendance: 'Your attendance record across all enrolled courses',
    sub_emotions: 'Track your emotional engagement during lectures',
    sub_schedule: 'Your weekly course schedule and timings',
    sub_performance: 'Detailed analytics across all your courses',
    sub_grades: 'Your exam grades and academic performance',
    sub_portfolio: 'Your complete academic year summary',
    sub_appeals: 'Submit absence excuses and track your complaints',
    sub_transcript: 'Official record of your academic performance',
    sub_announcements: 'Posted by your lecturers for your enrolled courses',
    sub_exams: 'Your upcoming and past exam schedule',
    sub_degreeaudit: 'Track your progress toward graduation',
    sub_resources: 'Study materials shared by your instructors',
    sub_assignments: 'Submit your work and view grades from your instructors',
    // ── Common labels ─────────────────────────────────────────────────────────
    new_features: 'New Features', sign_out: 'Sign Out', light: 'Light', dark: 'Dark',
    welcome_back: 'Welcome back', no_notifications: 'No notifications yet',
    mark_all_read: 'Mark all read', sign_in: 'Sign In',
    choose_role: 'Choose your role to continue',
    username: 'USERNAME', password: 'PASSWORD',
    // Table / field labels
    course: 'Course', week: 'Week', status: 'Status', grade: 'Grade',
    date: 'Date', time: 'Time', room: 'Room', method: 'Method',
    name: 'Name', dept: 'Department', year_label: 'Year', credits: 'Credits',
    instructor: 'Instructor', days: 'Days', duration: 'Duration',
    total: 'Total', average: 'Average', highest: 'Highest',
    passed: 'Passed', failed: 'Failed', pending: 'Pending',
    // Status words
    present: 'Present', absent: 'Absent', excused: 'Excused',
    submitted: 'Submitted', graded: 'Graded', overdue: 'Overdue',
    not_submitted: 'Not Submitted', confirmed: 'Confirmed',
    approved: 'Approved', rejected: 'Rejected', under_review: 'Under Review',
    good_standing: 'Good Standing', at_risk: 'At Risk', low_attendance: 'Low Attendance',
    // Buttons / actions
    submit: 'Submit', cancel: 'Cancel', save: 'Save', close: 'Close',
    back: 'Back', search: 'Search', print: 'Print / Export PDF',
    download: 'Download', upload: 'Upload', resubmit: 'Resubmit',
    book: 'Book', view: 'View', edit: 'Edit', delete: 'Delete',
    export_pdf: 'Export PDF', download_receipt: 'Download Receipt',
    // Tabs
    tab_records: 'Records', tab_courses: 'By Course', tab_history: 'History',
    tab_fees: 'Fee History', tab_aid: 'Financial Aid',
    tab_book: 'Available Slots', tab_mine: 'My Bookings',
    // Misc content
    loading: 'Loading...', error: 'Error', no_data: 'No data available',
    no_announcements: 'No announcements yet', no_exams: 'No exams scheduled',
    no_resources: 'No resources available', no_assignments: 'No assignments',
    no_grades: 'No grades available yet', awaiting_grade: 'Submitted — awaiting grade',
    today: 'Today', now: 'Now', all: 'All', none: 'None',
    semester: 'Semester', academic_standing: 'Academic Standing',
    week_streak: 'Week Streak', attendance_rate: 'Attendance Rate',
    avg_engagement: 'Avg Engagement', attention_score: 'Attention Score',
    current_gpa: 'Current GPA', projected_gpa: 'Projected GPA',
    subjects_graded: 'Subjects Graded', letter_grade: 'Letter',
    // GPA Calc
    gpa_title: 'GPA What-If Calculator',
    gpa_sub: 'Drag sliders to see how new grades affect your GPA',
    expected_grade: 'Expected Grade',
    // Timetable
    timetable_title: 'Weekly Timetable', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
    // ID Card
    id_card_title: 'Digital Student ID', student_id: 'Student ID',
    scan_qr: 'Scan to verify', flip_card: 'Flip Card', download_id: 'Download ID',
    // Fee History
    fee_title: 'Fee History & Financial Aid',
    fee_sub: 'Your payment timeline and financial aid records',
    total_fees: 'Total Fees', paid: 'Paid', balance: 'Balance',
    // Office Hours
    oh_title: 'Office Hours Booking',
    oh_sub: 'Book a 15-minute slot with your instructor',
    available_slots: 'Available Slots', your_bookings: 'Your Bookings',
    book_slot: 'Book', cancel_booking: 'Cancel',
    // Plagiarism
    similarity: 'Similarity', originality_check: 'Originality Check',
    checking: 'Checking...', original: 'Original', low_sim: 'Low Similarity',
    medium_sim: 'Medium Similarity', high_sim: 'High Similarity',
    // Appeals
    appeal_type: 'Appeal Type', describe_issue: 'Describe your issue',
    submit_appeal: 'Submit Appeal', appeal_submitted: 'Appeal submitted successfully',
    // Emotion labels
    emotion_profile: 'Emotion Profile', engagement: 'Engagement', attention: 'Attention',
    confidence: 'Confidence', emotion: 'Emotion', lecture: 'Lecture',
    // Degree audit
    completed: 'Completed', in_progress: 'In Progress', not_started: 'Not Started',
    graduation_progress: 'Graduation Progress', requirements: 'Requirements',
    credits_earned: 'Credits Earned', credits_required: 'Credits Required',
    // Admin
    doctors: 'Lecturers', courses: 'Courses', enrollments: 'Enrollment Management',
    reg_fees: 'Registration & Fees', parents: 'Parents', settings: 'Settings',
    overview: 'Overview', child_risk: 'Child Risk Status',
    system_analytics: 'System Analytics', appeals_mgmt: 'Appeals Management',
    // Doctor
    doc_overview: 'Overview', enrolled_students: 'Enrolled Students',
    live_session: 'Live Session', start_session: 'Start Session',
    end_session: 'End Session', session_active: 'Session Active',
    present_today: 'Present Today', absent_today: 'Absent Today',
    grade_entry: 'Grade Entry', exam_results: 'Exam Results',
    publish_grades: 'Publish Grades', enter_grade: 'Enter Grade',
  },

  ar: {
    // ── Nav items ────────────────────────────────────────────────────────────
    dashboard: 'لوحة التحكم', attendance: 'حضوري', emotions: 'مشاعري',
    schedule: 'الجدول', performance: 'الأداء', grades: 'درجاتي',
    portfolio: 'ملفي', chat: 'المجتمع', moodle: 'مودل',
    appeals: 'تظلماتي', transcript: 'كشف الدرجات', announcements: 'الإعلانات',
    exams: 'جدول الامتحانات', degreeaudit: 'مراجعة الدرجة', resources: 'موارد الدراسة',
    assignments: 'الواجبات', gpa_calc: 'حاسبة المعدل', timetable: 'الجدول الأسبوعي',
    digital_id: 'الهوية الطلابية', fee_history: 'سجل المدفوعات', office_hours: 'ساعات المكتب',
    notifications: 'الإشعارات',
    // Doctor nav
    live: 'الجلسة المباشرة', lectures: 'محاضراتي', students: 'الطلاب',
    analytics: 'التحليلات', detector: 'كاشف الموضوع', alerts: 'التنبيهات',
    ranalysis: 'تحليل R',
    // ── Page headings ─────────────────────────────────────────────────────────
    page_attendance: 'سجل الحضور', page_emotions: 'ملف مشاعري',
    page_schedule: 'جدولي الدراسي', page_performance: 'تحليلات الأداء',
    page_grades: 'نتائج امتحاناتي', page_portfolio: 'ملفي الأكاديمي',
    page_appeals: 'تظلماتي', page_transcript: 'السجل الأكاديمي',
    page_announcements: 'الإعلانات', page_exams: 'جدول الامتحانات',
    page_degreeaudit: 'مراجعة متطلبات التخرج', page_resources: 'موارد الدراسة',
    page_assignments: 'الواجبات', page_chat: 'المجتمع',
    page_moodle: 'مودل', page_dashboard: 'لوحة التحكم',
    // Doctor page headings
    page_live: 'الجلسة المباشرة', page_lectures: 'محاضراتي',
    page_students: 'الطلاب', page_doc_grades: 'نتائج الامتحانات',
    page_analytics: 'التحليلات', page_detector: 'كاشف الموضوع بالذكاء الاصطناعي',
    page_alerts: 'التنبيهات', page_announcements_doc: 'الإعلانات',
    // ── Section sub-titles ────────────────────────────────────────────────────
    sub_attendance: 'سجل حضورك في جميع المقررات المسجلة',
    sub_emotions: 'تتبع حالتك العاطفية خلال المحاضرات',
    sub_schedule: 'جدولك الدراسي الأسبوعي وأوقات المقررات',
    sub_performance: 'تحليلات مفصلة لجميع مقرراتك',
    sub_grades: 'درجات امتحاناتك وأدائك الأكاديمي',
    sub_portfolio: 'ملخص عامك الأكاديمي الكامل',
    sub_appeals: 'تقديم أعذار الغياب ومتابعة شكاواك',
    sub_transcript: 'السجل الرسمي لأدائك الأكاديمي',
    sub_announcements: 'إعلانات أساتذتك لمقرراتك المسجلة',
    sub_exams: 'جدول امتحاناتك القادمة والماضية',
    sub_degreeaudit: 'تتبع تقدمك نحو التخرج',
    sub_resources: 'مواد دراسية شاركها أساتذتك',
    sub_assignments: 'قدم أعمالك واطلع على الدرجات',
    // ── Common labels ─────────────────────────────────────────────────────────
    new_features: 'ميزات جديدة', sign_out: 'تسجيل الخروج', light: 'فاتح', dark: 'داكن',
    welcome_back: 'مرحباً بعودتك', no_notifications: 'لا توجد إشعارات',
    mark_all_read: 'تعليم الكل كمقروء', sign_in: 'تسجيل الدخول',
    choose_role: 'اختر دورك للمتابعة',
    username: 'اسم المستخدم', password: 'كلمة المرور',
    // Table / field labels
    course: 'المادة', week: 'الأسبوع', status: 'الحالة', grade: 'الدرجة',
    date: 'التاريخ', time: 'الوقت', room: 'القاعة', method: 'الطريقة',
    name: 'الاسم', dept: 'القسم', year_label: 'السنة', credits: 'الساعات',
    instructor: 'الأستاذ', days: 'الأيام', duration: 'المدة',
    total: 'الإجمالي', average: 'المتوسط', highest: 'الأعلى',
    passed: 'ناجح', failed: 'راسب', pending: 'معلق',
    // Status words
    present: 'حاضر', absent: 'غائب', excused: 'مبرر',
    submitted: 'مُقدَّم', graded: 'مُقيَّم', overdue: 'منتهية المدة',
    not_submitted: 'لم يُقدَّم', confirmed: 'مؤكد',
    approved: 'مقبول', rejected: 'مرفوض', under_review: 'قيد المراجعة',
    good_standing: 'وضع جيد', at_risk: 'في خطر', low_attendance: 'حضور منخفض',
    // Buttons / actions
    submit: 'إرسال', cancel: 'إلغاء', save: 'حفظ', close: 'إغلاق',
    back: 'رجوع', search: 'بحث', print: 'طباعة / تصدير PDF',
    download: 'تحميل', upload: 'رفع', resubmit: 'إعادة التقديم',
    book: 'حجز', view: 'عرض', edit: 'تعديل', delete: 'حذف',
    export_pdf: 'تصدير PDF', download_receipt: 'تحميل الإيصال',
    // Tabs
    tab_records: 'السجلات', tab_courses: 'حسب المادة', tab_history: 'السجل',
    tab_fees: 'سجل الرسوم', tab_aid: 'المساعدات المالية',
    tab_book: 'المواعيد المتاحة', tab_mine: 'حجوزاتي',
    // Misc content
    loading: 'جارٍ التحميل...', error: 'خطأ', no_data: 'لا توجد بيانات',
    no_announcements: 'لا توجد إعلانات حتى الآن', no_exams: 'لا توجد امتحانات مجدولة',
    no_resources: 'لا توجد موارد متاحة', no_assignments: 'لا توجد واجبات',
    no_grades: 'لا توجد درجات بعد', awaiting_grade: 'مُقدَّم — في انتظار التقييم',
    today: 'اليوم', now: 'الآن', all: 'الكل', none: 'لا شيء',
    semester: 'الفصل الدراسي', academic_standing: 'الوضع الأكاديمي',
    week_streak: 'أسبوع متواصل', attendance_rate: 'نسبة الحضور',
    avg_engagement: 'متوسط التفاعل', attention_score: 'درجة الانتباه',
    current_gpa: 'المعدل الحالي', projected_gpa: 'المعدل المتوقع',
    subjects_graded: 'المواد المقيَّمة', letter_grade: 'التقدير',
    // GPA Calc
    gpa_title: 'حاسبة المعدل التراكمي',
    gpa_sub: 'اسحب المنزلقات لترى تأثير الدرجات على معدلك',
    expected_grade: 'الدرجة المتوقعة',
    // Timetable
    timetable_title: 'الجدول الأسبوعي', sun: 'أحد', mon: 'اثنين', tue: 'ثلاثاء', wed: 'أربعاء', thu: 'خميس',
    // ID Card
    id_card_title: 'الهوية الطلابية الرقمية', student_id: 'رقم الطالب',
    scan_qr: 'امسح للتحقق', flip_card: 'اقلب الهوية', download_id: 'تحميل الهوية',
    // Fee History
    fee_title: 'سجل الرسوم والمنح',
    fee_sub: 'جدول زمني للمدفوعات وسجلات المساعدات المالية',
    total_fees: 'إجمالي الرسوم', paid: 'مدفوع', balance: 'الرصيد',
    // Office Hours
    oh_title: 'حجز ساعات المكتب',
    oh_sub: 'احجز موعداً لمدة 15 دقيقة مع أستاذك',
    available_slots: 'المواعيد المتاحة', your_bookings: 'حجوزاتي',
    book_slot: 'حجز', cancel_booking: 'إلغاء',
    // Plagiarism
    similarity: 'نسبة التشابه', originality_check: 'فحص الأصالة',
    checking: 'جارٍ الفحص...', original: 'أصلي', low_sim: 'تشابه منخفض',
    medium_sim: 'تشابه متوسط', high_sim: 'تشابه عالٍ',
    // Appeals
    appeal_type: 'نوع التظلم', describe_issue: 'اشرح مشكلتك',
    submit_appeal: 'إرسال التظلم', appeal_submitted: 'تم إرسال التظلم بنجاح',
    // Emotion labels
    emotion_profile: 'ملف المشاعر', engagement: 'التفاعل', attention: 'الانتباه',
    confidence: 'الثقة', emotion: 'المشاعر', lecture: 'المحاضرة',
    // Degree audit
    completed: 'مكتمل', in_progress: 'جارٍ', not_started: 'لم يبدأ',
    graduation_progress: 'التقدم نحو التخرج', requirements: 'المتطلبات',
    credits_earned: 'الساعات المكتسبة', credits_required: 'الساعات المطلوبة',
    // Admin
    doctors: 'أعضاء هيئة التدريس', courses: 'المقررات', enrollments: 'إدارة التسجيلات',
    reg_fees: 'التسجيل والرسوم', parents: 'أولياء الأمور', settings: 'الإعدادات',
    overview: 'نظرة عامة', child_risk: 'حالة الطالب التحذيرية',
    system_analytics: 'تحليلات النظام', appeals_mgmt: 'إدارة التظلمات',
    // Doctor
    doc_overview: 'نظرة عامة', enrolled_students: 'الطلاب المسجلون',
    live_session: 'الجلسة المباشرة', start_session: 'بدء الجلسة',
    end_session: 'إنهاء الجلسة', session_active: 'الجلسة نشطة',
    present_today: 'الحضور اليوم', absent_today: 'الغياب اليوم',
    grade_entry: 'إدخال الدرجات', exam_results: 'نتائج الامتحانات',
    publish_grades: 'نشر الدرجات', enter_grade: 'أدخل الدرجة',
  },
};

const LanguageContext = createContext({ lang: 'en', t: k => k, toggleLang: () => {}, isRTL: false });

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('es_lang') || 'en');
  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem('es_lang', lang);
  }, [lang, isRTL]);

  function toggleLang() { setLang(l => l === 'en' ? 'ar' : 'en'); }
  function t(key) { return TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.en[key] ?? key; }

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() { return useContext(LanguageContext); }
export default LanguageContext;
