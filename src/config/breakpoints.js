// ============================================================
//  Breakpoints Configuration
//  ------------------------------------------------------------
//  نقطة واحدة لكل نقاط التوقف في المشروع.
//  أي تعديل على حدود الشاشات لازم يتم من هنا فقط.
//  متوافق مع الـ CSS media queries في App.css
// ============================================================

// ------------------------------------------------------------
//  القيم الأساسية (بالـ pixels)
// ------------------------------------------------------------
export const BREAKPOINTS = Object.freeze({
  xs: 0,      // موبايل صغير جدًا   (0    - 479)
  sm: 480,    // موبايل كبير        (480  - 639)
  md: 640,    // تابلت صغير         (640  - 1023)
  lg: 1024,   // ديسكتوب            (1024 - 1279)
  xl: 1280,   // ديسكتوب كبير       (1280 - 1535)
  xxl: 1536,  // شاشات عريضة        (1536+)
});

// ------------------------------------------------------------
//  الحد الفاصل بين موبايل وديسكتوب
//  (يستخدم بكثرة في الشروط السريعة)
// ------------------------------------------------------------
export const MOBILE_MAX = BREAKPOINTS.md - 1; // 639
export const TABLET_MAX = BREAKPOINTS.lg - 1; // 1023

// ------------------------------------------------------------
//  استعلامات CSS جاهزة (Media Queries)
//  استخدمها مباشرة في useMediaQuery أو matchMedia
// ------------------------------------------------------------
export const MEDIA = Object.freeze({
  // Mobile First (min-width)
  sm:  `(min-width: ${BREAKPOINTS.sm}px)`,
  md:  `(min-width: ${BREAKPOINTS.md}px)`,
  lg:  `(min-width: ${BREAKPOINTS.lg}px)`,
  xl:  `(min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,

  // Max-width (للحالات التي تحتاج تحديد "أصغر من")
  belowSm:  `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  belowMd:  `(max-width: ${MOBILE_MAX}px)`,   // موبايل
  belowLg:  `(max-width: ${TABLET_MAX}px)`,   // موبايل + تابلت

  // نطاقات (Range)
  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${TABLET_MAX}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
});

// ------------------------------------------------------------
//  دوال مساعدة للاستخدام داخل JavaScript
//  (لا تعتمد عليها في الـ render — استخدم useMediaQuery بدلًا منها)
// ------------------------------------------------------------
const getWidth = () =>
  typeof window !== 'undefined' ? window.innerWidth : BREAKPOINTS.lg;

export const isMobile  = () => getWidth() <  BREAKPOINTS.md;
export const isTablet  = () => getWidth() >= BREAKPOINTS.md && getWidth() < BREAKPOINTS.lg;
export const isDesktop = () => getWidth() >= BREAKPOINTS.lg;

/**
 * يرجع اسم الفئة الحالية للشاشة
 * @returns {'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'}
 */
export const getCurrentBreakpoint = () => {
  const w = getWidth();
  if (w >= BREAKPOINTS.xxl) return 'xxl';
  if (w >= BREAKPOINTS.xl)  return 'xl';
  if (w >= BREAKPOINTS.lg)  return 'lg';
  if (w >= BREAKPOINTS.md)  return 'md';
  if (w >= BREAKPOINTS.sm)  return 'sm';
  return 'xs';
};

// ------------------------------------------------------------
//  تصدير افتراضي (اختياري للاستخدام السريع)
// ------------------------------------------------------------
export default BREAKPOINTS;
