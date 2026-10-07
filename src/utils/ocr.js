// src/utils/ocr.js
// يستخدم Tesseract.js من CDN (تم تحميله في index.html)

let workerPromise = null;

async function getWorker() {
  if (workerPromise) return workerPromise;

  workerPromise = (async () => {
    // Tesseract متاح عالمياً من CDN
    const worker = await window.Tesseract.createWorker("ara+eng", 1);
    return worker;
  })();

  return workerPromise;
}

export async function extractTextFromImage(imageFile, onProgress) {
  const worker = await getWorker();

  if (onProgress) {
    worker._logger = (m) => {
      if (m.status === "recognizing text") {
        onProgress(Math.round(m.progress * 100));
      }
    };
  }

  const { data } = await worker.recognize(imageFile);
  return (data.text || "").trim();
    }
