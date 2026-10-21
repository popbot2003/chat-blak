// ============================================
// src/utils/pdf.js
// استخراج النص من ملفات PDF باستخدام pdf.js
// pdf.js محمّل من CDN في index.html
// ✅ جديد 1: الفهرس الكامل (20,000 حرف)
// ✅ جديد 2: البحث باسم الفصل/الدرس في الفهرس
// ✅ جديد 3: استخراج نص الدفعات (للصفحات الكبيرة)
// ✅ جديد 4: تحميل PDF من URL (Supabase Storage)
// ✅ جديد 5: الرفع القابل للاستئناف (TUS) للملفات الكبيرة
// ============================================

import { supabase } from "../lib/supabase";
import * as tus from "tus-js-client"; // ✅ مكتبة الرفع القابل للاستئناف

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

// ... (باقي الدوال كما هي: loadPdfFromFile, loadPdfFromUrl, loadPdf, extractPageText, getPdfPageCount, extractPdfText, findToc, findSectionByTitle) ...

// ============================================
// ✅ Supabase Storage Functions
// ============================================

/**
 * رفع ملف إلى Supabase Storage باستخدام الرفع القابل للاستئناف (TUS)
 * ✅ يعمل مع الملفات الكبيرة (أكثر من 6 ميغابايت) والشبكات غير المستقرة
 * @param {File} file - الملف
 * @param {string} userId - معرف المستخدم
 * @param {string} chatId - معرف المحادثة
 * @returns {Promise<{path: string}>}
 */
export async function uploadFileToStorage(file, userId, chatId) {
  if (!supabase) {
    throw new Error("Supabase غير متاح.");
  }

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${userId}/${chatId}/${timestamp}_${safeName}`;

  // استخراج projectId من رابط Supabase
  // مثال: https://abcdefgh.supabase.co -> abcdefgh
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
  const projectId = supabaseUrl.replace("https://", "").split(".")[0];

  if (!projectId) {
    throw new Error("لم يتم العثور على projectId في إعدادات Supabase.");
  }

  // الحصول على جلسة المستخدم للمصادقة
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("المستخدم غير مسجل الدخول. لا يمكن رفع الملف.");
  }

  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(file, {
      // ✅ استخدام نطاق التخزين المباشر لتحسين الأداء مع الملفات الكبيرة
      endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
      retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "x-upsert": "false", // لا نريد استبدال الملفات الموجودة
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true, // مهم للسماح بإعادة رفع نفس الملف لاحقاً
      metadata: {
        bucketName: "user-files",
        objectName: filePath,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // ✅ 6 ميغابايت لكل جزء (قيمة ثابتة في Supabase)
      onError: function (error) {
        console.error("[Upload] فشل الرفع القابل للاستئناف:", error);
        reject(new Error("فشل رفع الملف: " + error.message));
      },
      onProgress: function (bytesUploaded, bytesTotal) {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(1);
        console.log(`[Upload] ${percentage}% (${bytesUploaded} / ${bytesTotal})`);
      },
      onSuccess: function () {
        console.log("[Upload] ✅ تم رفع الملف بنجاح:", filePath);
        resolve({
          path: filePath,
          publicUrl: null,
        });
      },
    });

    // محاولة استئناف رفع سابق (إذا كان قد بدأ ثم انقطع)
    upload.findPreviousUploads().then(function (previousUploads) {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    }).catch(() => {
      // إذا فشل البحث عن رفع سابق، ابدأ من جديد
      upload.start();
    });
  });
}

// ... (باقي الدوال كما هي: getFileSignedUrl, deleteFileFromStorage, deleteFilesFromStorage, insertUserFile, getUserFilesByChatId, deleteUserFileRecord) ...
