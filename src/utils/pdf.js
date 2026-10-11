// ============================================
// src/utils/pdf.js
// استخراج النص من ملفات PDF باستخدام pdf.js
// pdf.js محمّل من CDN في index.html
// ✅ جديد 1: الفهرس الكامل (20,000 حرف)
// ✅ جديد 2: البحث باسم الفصل/الدرس في الفهرس
// ✅ جديد 3: استخراج نص الدفعات (للصفحات الكبيرة)
// ✅ جديد 4: تحميل PDF من URL (Supabase Storage)
// ============================================

import { supabase } from "../lib/supabase";

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
 * تحميل PDF من File object (الطريقة القديمة)
 * @param {File} file - ملف PDF
 * @returns {Promise<PDFDocumentProxy>}
 */
async function loadPdfFromFile(file) {
  const pdfjsLib = getPdfLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

/**
 * ✅ جديد: تحميل PDF من URL (Supabase Storage)
 * @param {string} url - رابط الملف في Storage
 * @returns {Promise<PDFDocumentProxy>}
 */
async function loadPdfFromUrl(url) {
  const pdfjsLib = getPdfLib();
  const loadingTask = pdfjsLib.getDocument({ url });
  return await loadingTask.promise;
}

/**
 * ✅ دالة موحّدة: تُحدد تلقائيًا إذا كان الملف File أو URL
 * @param {File|string} source - File object أو URL
 * @returns {Promise<PDFDocumentProxy>}
 */
async function loadPdf(source) {
  if (typeof source === "string") {
    return await loadPdfFromUrl(source);
  }
  return await loadPdfFromFile(source);
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
 * @param {File|string} source - File أو URL
 * @returns {Promise<number>}
 */
export async function getPdfPageCount(source) {
  const pdf = await loadPdf(source);
  return pdf.numPages;
}

/**
 * استخراج النص من نطاق صفحات محدد
 * @param {File|string} source - File أو URL
 * @param {number} startPage - من صفحة (1-indexed)
 * @param {number} endPage - إلى صفحة (1-indexed)
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<string>} النص المستخرج
 */
export async function extractPdfText(source, startPage, endPage, onProgress) {
  const pdf = await loadPdf(source);

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
 * ✅ يحاول جمع الفهرس كاملًا عبر عدة صفحات (حتى 20,000 حرف)
 * @param {File|string} source
 * @param {(current: number, total: number) => void} [onProgress]
 * @returns {Promise<{found: boolean, text: string, page: number}>}
 */
export async function findToc(source, onProgress) {
  const pdf = await loadPdf(source);
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

        // ✅ الفهرس الكامل: من بداية الكلمة إلى 20,000 حرف بعدها
        const start = Math.max(0, idx - 200);
        let combined = pageText.slice(start);

        // نجمع مع الصفحات التالية إذا كان الفهرس طويلًا
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
 * البحث عن فصل/درس بالاسم في الفهرس
 * @param {File|string} source
 * @param {string} title - اسم الفصل/الدرس (مثل "الفصل الأول")
 * @returns {Promise<{found: boolean, pages: string, title: string, startPage?: number, endPage?: number}>}
 */
export async function findSectionByTitle(source, title) {
  const pdf = await loadPdf(source);
  const numPages = pdf.numPages;

  // نبحث في أول 30 وآخر 15 صفحة
  const pagesToCheck = new Set();
  for (let i = 1; i <= Math.min(30, numPages); i++) pagesToCheck.add(i);
  for (let i = Math.max(1, numPages - 15); i <= numPages; i++)
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

  // استخرج النص حول العنوان
  const start = Math.max(0, idx - 200);
  const end = Math.min(fullTocText.length, idx + 500);
  const excerpt = fullTocText.slice(start, end).trim();

  // ابحث عن أرقام الصفحات في المقتطف
  const pagePatterns = excerpt.match(
    /\d{1,4}(?:\s*[-–—]\s*\d{1,4})?/g
  );

  if (!pagePatterns || pagePatterns.length === 0) {
    return { found: false, pages: "", title: "" };
  }

  // أول رقم كصفحة البداية
  const firstNumber = parseInt(pagePatterns[0].split(/[-–—]/)[0], 10);

  // إذا وجد نطاق صريح (40-80)
  const rangePattern = excerpt.match(
    /(\d{1,4})\s*[-–—]\s*(\d{1,4})/
  );

  let startPage = firstNumber;
  let endPage = firstNumber;

  if (rangePattern) {
    startPage = parseInt(rangePattern[1], 10);
    endPage = parseInt(rangePattern[2], 10);
  }

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

// ============================================
// ✅ Supabase Storage Functions
// ============================================

/**
 * رفع ملف إلى Supabase Storage
 * @param {File} file - الملف
 * @param {string} userId - معرف المستخدم
 * @param {string} chatId - معرف المحادثة
 * @returns {Promise<{path: string, publicUrl: string}>}
 */
export async function uploadFileToStorage(file, userId, chatId) {
  if (!supabase) {
    throw new Error("Supabase غير متاح.");
  }

  // مسار الملف: {user_id}/{chat_id}/{timestamp}_{file_name}
  // هذا يتوافق مع سياسات Storage التي أنشأناها
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${chatId}/${timestamp}_${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("user-files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error("فشل رفع الملف: " + uploadError.message);
  }

  return {
    path: filePath,
    publicUrl: null, // Private bucket - لا يوجد public URL
  };
}

/**
 * الحصول على URL موقّع لتحميل ملف من Storage
 * (Private bucket يحتاج signed URL)
 * @param {string} filePath - مسار الملف
 * @param {number} expiresIn - مدة الصلاحية بالثواني (افتراضي: ساعة)
 * @returns {Promise<string>} - URL مؤقت
 */
export async function getFileSignedUrl(filePath, expiresIn = 3600) {
  if (!supabase) {
    throw new Error("Supabase غير متاح.");
  }

  const { data, error } = await supabase.storage
    .from("user-files")
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new Error("فشل إنشاء رابط الملف: " + error.message);
  }

  return data.signedUrl;
}

/**
 * حذف ملف من Supabase Storage
 * @param {string} filePath - مسار الملف
 * @returns {Promise<boolean>}
 */
export async function deleteFileFromStorage(filePath) {
  if (!supabase) {
    throw new Error("Supabase غير متاح.");
  }

  const { error } = await supabase.storage
    .from("user-files")
    .remove([filePath]);

  if (error) {
    console.warn("[Storage] فشل حذف الملف:", error.message);
    return false;
  }

  return true;
}

/**
 * حذف عدة ملفات دفعة واحدة
 * @param {string[]} filePaths - مصفوفة مسارات
 * @returns {Promise<boolean>}
 */
export async function deleteFilesFromStorage(filePaths) {
  if (!supabase || !filePaths || filePaths.length === 0) {
    return true;
  }

  const { error } = await supabase.storage
    .from("user-files")
    .remove(filePaths);

  if (error) {
    console.warn("[Storage] فشل حذف الملفات:", error.message);
    return false;
  }

  return true;
}

// ============================================
// ✅ Supabase Database Functions (user_files)
// ============================================

/**
 * إضافة سجل ملف في جدول user_files
 * @param {Object} fileData
 * @returns {Promise<Object>}
 */
export async function insertUserFile(fileData) {
  const { data, error } = await supabase
    .from("user_files")
    .insert(fileData)
    .select()
    .single();

  if (error) {
    throw new Error("فشل حفظ بيانات الملف: " + error.message);
  }

  return data;
}

/**
 * جلب ملفات محادثة معينة
 * @param {string} chatId
 * @returns {Promise<Array>}
 */
export async function getUserFilesByChatId(chatId) {
  const { data, error } = await supabase
    .from("user_files")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[user_files] فشل جلب الملفات:", error.message);
    return [];
  }

  return data || [];
}

/**
 * حذف سجل ملف (يُستخدم عادة قبل حذف الملف من Storage)
 * @param {string} fileId
 * @returns {Promise<boolean>}
 */
export async function deleteUserFileRecord(fileId) {
  const { error } = await supabase
    .from("user_files")
    .delete()
    .eq("id", fileId);

  if (error) {
    console.warn("[user_files] فشل حذف السجل:", error.message);
    return false;
  }

  return true;
}
