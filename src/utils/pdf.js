// ============================================
// src/utils/pdf.js
// استخراج النص من ملفات PDF باستخدام pdf.js
// pdf.js محمّل من CDN في index.html
// ✅ جديد 1: الفهرس الكامل (20,000 حرف)
// ✅ جديد 2: البحث باسم الفصل/الدرس في الفهرس
// ✅ جديد 3: استخراج نص الدفعات (للصفحات الكبيرة)
// ============================================

/**
 * التأكد من تحميل pdfjsLib
 */
function getPdfLib() {
  if (!window.pdfjsLib) {
    throw new Error(
      "pdf.js غير محمّل. تأكد من إضافة CDN في index.html"
    );
  }
  return window.pdfjsLib;
}

/**
 * قراءة ملف PDF وإرجاع كائن PDFDocument
 * @param {File} file - ملف PDF
 * @returns {Promise<PDFDocumentProxy>}
 */
async function loadPdf(file) {
  const pdfjsLib = getPdfLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * استخراج نص صفحة واحدة
 * @param {PDFPageProxy} page
 * @returns {Promise<string>}
 */
async function extractPageText(page) {
  const textContent = await page.getTextContent();

  let pageText = "";
  let lastY = null;

  for (const item of textContent.items) {
    if (typeof item.str !== "string") continue;

    // كشف تغيير السطر
    if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
      pageText += "\n";
    }

    pageText += item.str;
    lastY = item.transform[5];
  }

  return pageText.trim();
}

/**
 * إرجاع عدد صفحات PDF
 * @param {File} file
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(file) {
  const pdf = await loadPdf(file);
  return pdf.numPages;
}

/**
 * استخراج النص من نطاق صفحات محدد
 * @param {File} file - ملف PDF
 * @param {number} startPage - من صفحة (1-indexed)
 * @param {number} endPage - إلى صفحة (1-indexed)
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<string>} النص المستخرج
 */
export async function extractPdfText(file, startPage, endPage, onProgress) {
  const pdf = await loadPdf(file);

  const from = Math.max(1, Math.min(startPage, pdf.numPages));
  const to = Math.max(from, Math.min(endPage, pdf.numPages));

  const total = to - from + 1;
  const pagesText = [];

  for (let i = from; i <= to; i++) {
    const page = await pdf.getPage(i);
    const pageText = await extractPageText(page);

    pagesText.push(`─── صفحة ${i} ───\n${pageText}`);
    if (onProgress) onProgress(i - from + 1, total);
  }

  return pagesText.join("\n\n");
}

/**
 * البحث عن الفهرس في أول 20 وآخر 10 صفحات
 * ✅ جديد: يحاول جمع الفهرس كاملًا عبر عدة صفحات
 * @param {File} file
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<{found: boolean, text: string, page: number}>}
 */
export async function findToc(file, onProgress) {
  const pdf = await loadPdf(file);
  const numPages = pdf.numPages;

  const firstPages = Math.min(20, numPages);
  const lastPages = Math.min(10, numPages);

  const pagesToCheck = new Set();
  for (let i = 1; i <= firstPages; i++) pagesToCheck.add(i);
  for (let i = Math.max(1, numPages - lastPages + 1); i <= numPages; i++) {
    pagesToCheck.add(i);
  }

  const sortedPages = Array.from(pagesToCheck).sort((a, b) => a - b);
  const total = sortedPages.length;
  let current = 0;

  const tocKeywords = [
    "الفهرس",
    "فهرس",
    "المحتويات",
    "محتويات",
    "المحتوى",
    "contents",
    "table of contents",
    "toc",
    "index",
  ];

  for (const pageNum of sortedPages) {
    current++;
    if (onProgress) onProgress(current, total);

    const page = await pdf.getPage(pageNum);
    const pageText = await extractPageText(page);
    const lowerText = pageText.toLowerCase();

    for (const kw of tocKeywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        const idx = lowerText.indexOf(kw.toLowerCase());

        // ✅ الفهرس الكامل: نأخذ من بداية الكلمة إلى 20,000 حرف بعدها
        const start = Math.max(0, idx - 200);
        let combined = pageText.slice(start);

        // ✅ نجمع مع الصفحة التالية إذا كان الفهرس طويلًا
        let nextPageNum = pageNum + 1;
        while (
          combined.length < 20000 &&
          nextPageNum <= numPages &&
          nextPageNum <= pageNum + 5
        ) {
          const nextPage = await pdf.getPage(nextPageNum);
          const nextText = await extractPageText(nextPage);
          combined += "\n\n" + nextText;
          nextPageNum++;
        }

        return {
          found: true,
          text: combined.slice(0, 20000).trim(),
          page: pageNum,
        };
      }
    }
  }

  return { found: false, text: "", page: -1 };
}

/**
 * ✅ جديد: البحث عن فصل/درس بالاسم في الفهرس
 * @param {File} file
 * @param {string} title - اسم الفصل/الدرس (مثل "الفصل الأول")
 * @returns {Promise<{found: boolean, pages: string, title: string}>}
 */
export async function findSectionByTitle(file, title) {
  const pdf = await loadPdf(file);
  const numPages = pdf.numPages;

  // نبحث في أول 30 وآخر 15 صفحة
  const pagesToCheck = new Set();
  for (let i = 1; i <= Math.min(30, numPages); i++) pagesToCheck.add(i);
  for (
    let i = Math.max(1, numPages - 15);
    i <= numPages;
    i++
  )
    pagesToCheck.add(i);

  const sortedPages = Array.from(pagesToCheck).sort((a, b) => a - b);

  // تنظيف العنوان من الكلمات الزائدة
  const cleanTitle = title
    .replace(/^(ما هو|ما هي|اشرح|لخص|اقرأ|استخرج)\s+/i, "")
    .replace(/\s+(في الكتاب|في الملف|من الكتاب|من الملف)$/i, "")
    .trim();

  const lowerTitle = cleanTitle.toLowerCase();

  let fullTocText = "";

  for (const pageNum of sortedPages) {
    const page = await pdf.getPage(pageNum);
    const pageText = await extractPageText(page);
    fullTocText += "\n" + pageText;
  }

  const lowerToc = fullTocText.toLowerCase();

  // 1) البحث الدقيق
  let idx = lowerToc.indexOf(lowerTitle);

  // 2) إذا لم يوجد، البحث عن أول كلمة
  if (idx === -1) {
    const firstWord = cleanTitle.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 2) {
      idx = lowerToc.indexOf(firstWord);
    }
  }

  if (idx === -1) {
    return { found: false, pages: "", title: "" };
  }

  // استخرج النص حول العنوان (200 حرف قبل، 500 حرف بعد)
  const start = Math.max(0, idx - 200);
  const end = Math.min(fullTocText.length, idx + 500);
  const excerpt = fullTocText.slice(start, end).trim();

  // ابحث عن أرقام الصفحات في هذا المقتطف
  // أنماط: 40، 40-80، 40 - 80، ٤٠، إلخ
  const pagePatterns = excerpt.match(
    /\d{1,4}(?:\s*[-–—]\s*\d{1,4})?/g
  );

  if (!pagePatterns || pagePatterns.length === 0) {
    return { found: false, pages: "", title: "" };
  }

  // أخذ أول رقم كصفحة البداية
  const firstNumber = parseInt(pagePatterns[0].split(/[-–—]/)[0], 10);

  // إذا وجد نطاق صريح (40-80)، نستخدمه
  const rangePattern = excerpt.match(
    /(\d{1,4})\s*[-–—]\s*(\d{1,4})/
  );

  let startPage = firstNumber;
  let endPage = firstNumber;

  if (rangePattern) {
    startPage = parseInt(rangePattern[1], 10);
    endPage = parseInt(rangePattern[2], 10);
  }

  // التحقق من صحة الأرقام
  if (startPage < 1 || startPage > numPages) {
    return { found: false, pages: "", title: "" };
  }

  return {
    found: true,
    pages: `${startPage}-${endPage}`,
    title: cleanTitle,
    startPage,
    endPage,
    excerpt,
  };
}
