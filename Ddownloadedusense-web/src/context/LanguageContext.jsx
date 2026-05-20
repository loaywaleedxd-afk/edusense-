import { createContext, useContext, useState, useEffect } from 'react';

export const TRANSLATIONS = {
  en: {
    // Nav items
    dashboard: 'Dashboard', attendance: 'My Attendance', emotions: 'My Emotions',
    schedule: 'Schedule', performance: 'Performance', grades: 'My Grades',
    portfolio: 'My Portfolio', chat: 'Community', moodle: 'Moodle',
    appeals: 'My Appeals', transcript: 'Transcript', announcements: 'Announcements',
    exams: 'Exam Schedule', degreeaudit: 'Degree Audit', resources: 'Study Resources',
    assignments: 'Assignments', gpa_calc: 'GPA Calculator', timetable: 'Timetable',
    digital_id: 'Digital ID Card', fee_history: 'Fee History', office_hours: 'Office Hours',
    notifications: 'Notifications',
    // Labels
    new_features: 'New Features', sign_out: 'Sign Out', light: 'Light', dark: 'Dark',
    welcome_back: 'Welcome back', no_notifications: 'No notifications yet',
    mark_all_read: 'Mark all read', sign_in: 'Sign In',
    choose_role: 'Choose your role to continue',
    username: 'USERNAME', password: 'PASSWORD',
    // GPA Calc
    gpa_title: 'GPA What-If Calculator',
    gpa_sub: 'Drag sliders to see how new grades affect your GPA',
    current_gpa: 'Current GPA', projected_gpa: 'Projected GPA',
    course: 'Course', expected_grade: 'Expected Grade',
    // Timetable
    timetable_title: 'Weekly Timetable', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu',
    // ID Card
    id_card_title: 'Digital Student ID', department: 'Department', year: 'Year',
    student_id: 'Student ID', scan_qr: 'Scan to verify', flip_card: 'Flip Card',
    download_id: 'Download ID',
    // Fee History
    fee_title: 'Fee History & Financial Aid',
    fee_sub: 'Your payment timeline and financial aid records',
    total_fees: 'Total Fees', paid: 'Paid', balance: 'Balance', download_receipt: 'Download Receipt',
    // Office Hours
    oh_title: 'Office Hours Booking',
    oh_sub: 'Book a 15-minute slot with your instructor',
    available_slots: 'Available Slots', your_bookings: 'Your Bookings',
    book_slot: 'Book', cancel_booking: 'Cancel',
    // Plagiarism
    similarity: 'Similarity', originality_check: 'Originality Check',
    checking: 'Checking...', original: 'Original', low_sim: 'Low Similarity',
    medium_sim: 'Medium Similarity', high_sim: 'High Similarity',
    // Common
    loading: 'Loading...', error: 'Error', back: 'Back', submit: 'Submit',
    cancel: 'Cancel', save: 'Save', close: 'Close', search: 'Search',
    no_data: 'No data available', print: 'Print / Export PDF',
  },
  ar: {
    // Nav items
    dashboard: 'لوحة التحكم', attendance: 'حضوري', emotions: 'مشاعري',
    schedule: 'الجدول', performance: 'الأداء', grades: 'درجاتي',
    portfolio: 'ملفي', chat: 'المجتمع', moodle: 'مودل',
    appeals: 'تظلماتي', transcript: 'كشف الدرجات', announcements: 'الإعلانات',
    exams: 'جدول الامتحانات', degreeaudit: 'مراجعة الدرجة', resources: 'موارد الدراسة',
    assignments: 'الواجبات', gpa_calc: 'حاسبة المعدل', timetable: 'الجدول الأسبوعي',
    digital_id: 'الهوية الطلابية', fee_history: 'سجل المدفوعات', office_hours: 'ساعات المكتب',
    notifications: 'الإشعارات',
    // Labels
    new_features: 'ميزات جديدة', sign_out: 'تسجيل الخروج', light: 'فاتح', dark: 'داكن',
    welcome_back: 'مرحباً بعودتك', no_notifications: 'لا توجد إشعارات',
    mark_all_read: 'تعليم الكل كمقروء', sign_in: 'تسجيل الدخول',
    choose_role: 'اختر دورك للمتابعة',
    username: 'اسم المستخدم', password: 'كلمة المرور',
    // GPA Calc
    gpa_title: 'حاسبة المعدل التراكمي',
    gpa_sub: 'اسحب المنزلقات لترى تأثير الدرجات على معدلك',
    current_gpa: 'المعدل الحالي', projected_gpa: 'المعدل المتوقع',
    course: 'المادة', expected_grade: 'الدرجة المتوقعة',
    // Timetable
    timetable_title: 'الجدول الأسبوعي', sun: 'أحد', mon: 'اثنين', tue: 'ثلاثاء', wed: 'أربعاء', thu: 'خميس',
    // ID Card
    id_card_title: 'الهوية الطلابية الرقمية', department: 'القسم', year: 'السنة',
    student_id: 'رقم الطالب', scan_qr: 'امسح للتحقق', flip_card: 'اقلب الهوية',
    download_id: 'تحميل الهوية',
    // Fee History
    fee_title: 'سجل الرسوم والمنح',
    fee_sub: 'جدول زمني للمدفوعات وسجلات المساعدات المالية',
    total_fees: 'إجمالي الرسوم', paid: 'مدفوع', balance: 'الرصيد', download_receipt: 'تحميل الإيصال',
    // Office Hours
    oh_title: 'حجز ساعات المكتب',
    oh_sub: 'احجز موعداً لمدة 15 دقيقة مع أستاذك',
    available_slots: 'المواعيد المتاحة', your_bookings: 'حجوزاتك',
    book_slot: 'حجز', cancel_booking: 'إلغاء',
    // Plagiarism
    similarity: 'نسبة التشابه', originality_check: 'فحص الأصالة',
    checking: 'جارٍ الفحص...', original: 'أصلي', low_sim: 'تشابه منخفض',
    medium_sim: 'تشابه متوسط', high_sim: 'تشابه عالٍ',
    // Common
    loading: 'جارٍ التحميل...', error: 'خطأ', back: 'رجوع', submit: 'إرسال',
    cancel: 'إلغاء', save: 'حفظ', close: 'إغلاق', search: 'بحث',
    no_data: 'لا توجد بيانات', print: 'طباعة / تصدير PDF',
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
