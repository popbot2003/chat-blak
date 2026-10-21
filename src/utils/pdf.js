// ============================================
// src/utils/pdf.js
// استخراج النص من ملفات PDF باستخدام pdf.js
// ✅ جديد: OCR احتياطي للصفحات المصورة
// ============================================

import { supabase } from "../lib/supabase";
import * as tus from "tus-js-client";

function getPdfLib() {
  if (!window.pdfjsLib) {
    throw new Error("pdf.js غير محمّل. تأكد من إضافة CDN في index.html");
  }
  return window.pdfjsLib;
}

async function loadPdfFromFile(file) {
  const pdfjsLib = getPdfLib();
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  return await loadingTask.promise;
}

async function loadPdfFromUrl(url) {
  const pdfjsLib = getPdfLib();
  const loadingTask = pdfjsLib.getDocument({ url });
  return await loadingTask.promise;
}

async function loadPdf(source) {
  if (typeof source === "string") {
    return await loadPdfFromUrl(source);
  }
  return await loadPdfFromFile(source);
}

async function extractPageText(page) {
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

  return pageText.trim();
}

/**
 * ✅ جديد: OCR على صفحة PDF (تحويلها إلى صورة ثم استخراج النص)
 * @param {PDFPageProxy} page
 * @param {number} pageNum
 * @returns {Promise<string>}
 */
async function ocrPdfPage(page, pageNum) {
  try {
    const { extractTextFromImage } = await import("./ocr");

    // 2.0 للحصول على دقة أعلى لـ OCR
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const context = canvas.getContext("2d");

    await page.render({ canvasContext: context, viewport }).promise;

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );

    if (!blob) {
      canvas.width = 0;
      canvas.height = 0;
      return "";
    }

    const file = new File([blob], `page-${pageNum}.png`, {
      type: "image/png",
    });

    const text = await extractTextFromImage(file);

    // تحرير الذاكرة
    canvas.width = 0;
    canvas.height = 0;

    return text || "";
  } catch (err) {
    console.error(`[OCR] فشل استخراج نص الصفحة ${pageNum}:`, err);
    return "";
  }
}

export async function getPdfPageCount(source) {
  const pdf = await loadPdf(source);
  return pdf.numPages;
}

/**
 * ✅ استخراج النص من نطاق صفحات، مع OCR احتياطي
 * @param {File|string} source
 * @param {number} startPage
 * @param {number} endPage
 * @param {Object} [options]
 * @param {boolean} [options.enableOcr=true] - تفعيل OCR للصفحات المصورة
 * @param {(current: number, total: number) => void} [options.onProgress]
 * @param {(pageNum: number, from: number, to: number) => void} [options.onOcrProgress]
 * @returns {Promise<string>}
 */
export async function extractPdfText(source, startPage, endPage, options = {}) {
  const { enableOcr = true, onProgress, onOcrProgress } = options;
  const pdf = await loadPdf(source);

  const from = Math.max(1, Math.min(startPage, pdf.numPages));
  const to = Math.max(from, Math.min(endPage, pdf.numPages));
  const total = to - from + 1;
  const pagesText = [];

  for (let i = from; i <= to; i++) {
    const page = await pdf.getPage(i);
    let pageText = await extractPageText(page);

    // ✅ OCR احتياطي إذا كانت الصفحة صورة
    if ((!pageText || pageText.trim().length < 10) && enableOcr) {
      console.log(`[PDF] الصفحة ${i} بدون نص — تشغيل OCR...`);
      if (onOcrProgress) onOcrProgress(i, from, to);
      pageText = await ocrPdfPage(page, i);
    }

    pagesText.push(
      `─── صفحة ${i} ───\n${pageText || "[لا يوجد نص في هذه الصفحة]"}`
    );
    if (onProgress) onProgress(i - from + 1, total);
  }

  return pagesText.join("\n\n");
}

/**
 * البحث عن الفهرس (بدون OCR — الفهرس عادةً نصي)
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
    "الفهرس", "فهرس", "المحتويات", "محتويات", "المحتوى",
    "contents", "table of contents", "toc", "index",
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
        const start = Math.max(0, idx - 200);
        let combined = pageText.slice(start);
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
        return { found: true, text: combined.slice(0, 20000).trim(), page: pageNum };
      }
    }
  }

  return { found: false, text: "", page: -1 };
}

export async function findSectionByTitle(source, title) {
  const pdf = await loadPdf(source);
  const numPages = pdf.numPages;

  const pagesToCheck = new Set();
  for (let i = 1; i <= Math.min(30, numPages); i++) pagesToCheck.add(i);
  for (let i = Math.max(1, numPages - 15); i <= numPages; i++)
    pagesToCheck.add(i);

  const sortedPages = Array.from(pagesToCheck).sort((a, b) => a - b);

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
  let idx = lowerToc.indexOf(lowerTitle);

  if (idx === -1) {
    const firstWord = cleanTitle.split(/\s+/)[0].toLowerCase();
    if (firstWord.length > 2) {
      idx = lowerToc.indexOf(firstWord);
    }
  }

  if (idx === -1) {
    return { found: false, pages: "", title: "" };
  }

  const start = Math.max(0, idx - 200);
  const end = Math.min(fullTocText.length, idx + 500);
  const excerpt = fullTocText.slice(start, end).trim();

  const pagePatterns = excerpt.match(/\d{1,4}(?:\s*[-–—]\s*\d{1,4})?/g);
  if (!pagePatterns || pagePatterns.length === 0) {
    return { found: false, pages: "", title: "" };
  }

  const firstNumber = parseInt(pagePatterns[0].split(/[-–—]/)[0], 10);
  const rangePattern = excerpt.match(/(\d{1,4})\s*[-–—]\s*(\d{1,4})/);

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

export async function uploadFileToStorage(file, userId, chatId, onProgress) {
  if (!supabase) {
    throw new Error("Supabase غير متاح.");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${chatId}/${timestamp}_${safeName}`;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const projectId = supabaseUrl.replace("https://", "").split(".")[0];

  if (!projectId) {
    throw new Error("لم يتم العثور على projectId في إعدادات Supabase.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("المستخدم غير مسجل الدخول. لا يمكن رفع الملف.");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: "user-files",
        objectName: filePath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024,
      onError: function (error) {
        console.error("[Upload] فشل الرفع:", error);
        reject(new Error("فشل رفع الملف: " + error.message));
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = parseFloat(
          ((bytesUploaded / bytesTotal) * 100).toFixed(1)
        );
        if (onProgress) onProgress(percentage, bytesUploaded, bytesTotal);
      },
      onSuccess: function () {
        if (onProgress) onProgress(100);
        resolve({ path: filePath, publicUrl: null });
      },
    });

    upload.findPreviousUploads().then(function (previousUploads) {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch(() => {
      upload.start();
    });
  });
}

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

export async function deleteFilesFromStorage(filePaths) {
  if (!supabase || !filePaths || filePaths.length === 0) return true;
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
