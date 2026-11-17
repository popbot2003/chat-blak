// ============================================================
// BLAK — Responsive breakpoints
// Device categories and layout boundary are intentionally distinct:
// mobile: < 640px, tablet: 640–1023px, desktop: >= 1024px.
// The compact chat/sidebar layout is shared by mobile and tablet.
// ============================================================

export const BREAKPOINTS = Object.freeze({
  xs: 0,
  sm: 480,
  md: 640,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
});

export const MOBILE_MAX = BREAKPOINTS.md - 1; // 639
export const TABLET_MAX = BREAKPOINTS.lg - 1; // 1023
export const COMPACT_LAYOUT_MAX = TABLET_MAX; // CSS chat layout boundary

export const MEDIA = Object.freeze({
  sm: `(min-width: ${BREAKPOINTS.sm}px)`,
  md: `(min-width: ${BREAKPOINTS.md}px)`,
  lg: `(min-width: ${BREAKPOINTS.lg}px)`,
  xl: `(min-width: ${BREAKPOINTS.xl}px)`,
  xxl: `(min-width: ${BREAKPOINTS.xxl}px)`,

  belowSm: `(max-width: ${BREAKPOINTS.sm - 1}px)`,
  belowMd: `(max-width: ${MOBILE_MAX}px)`,
  belowLg: `(max-width: ${TABLET_MAX}px)`,

  tablet: `(min-width: ${BREAKPOINTS.md}px) and (max-width: ${TABLET_MAX}px)`,
  compactChat: `(max-width: ${COMPACT_LAYOUT_MAX}px)`,
  desktop: `(min-width: ${BREAKPOINTS.lg}px)`,
});

const getWidth = () =>
  typeof window !== "undefined" ? window.innerWidth : BREAKPOINTS.lg;

export const isMobile = () => getWidth() < BREAKPOINTS.md;
export const isTablet = () =>
  getWidth() >= BREAKPOINTS.md && getWidth() <= TABLET_MAX;
export const isDesktop = () => getWidth() >= BREAKPOINTS.lg;

export const getCurrentBreakpoint = () => {
  const width = getWidth();
  if (width >= BREAKPOINTS.xxl) return "xxl";
  if (width >= BREAKPOINTS.xl) return "xl";
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  if (width >= BREAKPOINTS.sm) return "sm";
  return "xs";
};

export default BREAKPOINTS;
