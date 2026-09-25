// ============================================================
//  useMediaQuery Hook
//  ------------------------------------------------------------
//  يراقب تطابق استعلام CSS معين ويتفاعل مع تغيّر حجم الشاشة.
//  يستخدم matchMedia API الحديثة (بدل window.resize)
//  ويدعم SSR (يرجع false عند عدم توفر window).
// ============================================================

import { useEffect, useState } from 'react';

/**
 * @param {string} query - استعلام CSS مثل '(max-width: 639px)'
 * @returns {boolean} - هل الاستعلام مطابق حاليًا؟
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 639px)');
 * const isDesktop = useMediaQuery('(min-width: 1024px)');
 */
export function useMediaQuery(query) {
  // نتحقق من توفر window لتجنب أخطاء SSR
  const getInitial = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mql = window.matchMedia(query);

    // مزامنة القيمة الحالية فورًا (لو تغيّرت بين render و effect)
    setMatches(mql.matches);

    const handler = (event) => setMatches(event.matches);

    // دعم المتصفحات الحديثة
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }

    // دعم Safari القديم
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}

export default useMediaQuery;
