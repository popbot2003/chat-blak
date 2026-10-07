// ============================================
// src/utils/ocr.js
// استخراج النص من الصور باستخدام Tesseract.js
// Tesseract محمّل من CDN في index.html
// ============================================

let workerPromise = null;

/**
 * إنشاء worker مرة واحدة وإعادة استخدامه
 * (أول تحميل يستغرق 10-20 ثانية لأن بيانات اللغة العربية تُحمّل)
 */
async function getWorker() {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    if (!window.Tesseract) {
      throw new Error(
        "Tesseract.js غير محمّل. تأكد من إضافة CDN في index.html"
      );
    }

    const worker = await window.Tesseract.createWorker("ara+eng", 1, {
      logger: () => {}, // لا نريد logs افتراضية
    });

    return worker;
  })();

  return workerPromise;
}

/**
 * استخراج النص من صورة
 * @param {File} imageFile - ملف الصورة
 * @param {(percent: number) => void} [onProgress] - callback للتقدم
 * @returns {Promise<string>} النص المستخرج
 */
export async function extractTextFromImage(imageFile, onProgress) {
  const worker = await getWorker();

  // progress callback
  if (onProgress) {
    worker._logger = (m) => {
      if (m.status === "recognizing text") {
        onProgress(Math.round(m.progress * 100));
      }
    };
  }

  const { data } = await worker.recognize(imageFile);

  const text = (data.text || "").trim();

  return text;
}

/**
 * إغلاق الـ worker (اختياري)
 */
export async function terminateOcr() {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch (err) {
      console.warn("[OCR] terminate failed:", err);
    }
    workerPromise = null;
  }
      }
