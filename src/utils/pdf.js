// ============================================
// src/utils/pdf.js
// استخراج النص من ملفات PDF باستخدام pdf.js
// pdf.js محمّل من CDN في index.html
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
    const textContent = await page.getTextContent();

    // دمج النص مع الحفاظ على الفواصل
    let pageText = "";
    let lastY = null;

    for (const item of textContent.items) {
      if (typeof item.str !== "string") continue;

      // كشف تغيير السطر (y يختلف)
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += "\n";
      }

      pageText += item.str;
      lastY = item.transform[5];
    }

    pagesText.push(`─── صفحة ${i} ───\n${pageText.trim()}`);
    if (onProgress) onProgress(i - from + 1, total);
  }

  return pagesText.join("\n\n");
}

/**
 * البحث عن الفهرس في أول 20 وآخر 5 صفحات
 * @param {File} file
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<{found: boolean, text: string, page: number}>}
 */
export async function findToc(file, onProgress) {
  const pdf = await loadPdf(file);
  const numPages = pdf.numPages;

  const firstPages = Math.min(20, numPages);
  const lastPages = Math.min(5, numPages);

  // قائمة الصفحات التي سنفحصها (بدون تكرار)
  const pagesToCheck = new Set();
  for (let i = 1; i <= firstPages; i++) pagesToCheck.add(i);
  for (let i = Math.max(1, numPages - lastPages + 1); i <= numPages; i++) {
    pagesToCheck.add(i);
  }

  const sortedPages = Array.from(pagesToCheck).sort((a, b) => a - b);
  const total = sortedPages.length;
  let current = 0;

  // كلمات دالة على الفهرس (عربي + إنجليزي)
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
    const textContent = await page.getTextContent();

    let pageText = "";
    let lastY = null;

    for (const item of textContent.items) {
      if (typeof item.str !== "string") continue;
      if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
        pageText += "\n";
      }
      pageText += item.str;
      lastY = item.transform[5];
    }

    const lowerText = pageText.toLowerCase();

    // هل يحتوي على كلمة دالة؟
    for (const kw of tocKeywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        // استخرج مساحة معقولة حول الكلمة
        const idx = lowerText.indexOf(kw.toLowerCase());
        const start = Math.max(0, idx - 100);
        const end = Math.min(pageText.length, idx + 3000);

        return {
          found: true,
          text: pageText.slice(start, end).trim(),
          page: pageNum,
        };
      }
    }
  }

  return { found: false, text: "", page: -1 };
}
