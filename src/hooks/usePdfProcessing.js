// ============================================
// src/hooks/usePdfProcessing.js
// كل منطق معالجة ملفات PDF (صفحات، فصول، فهرس)
// يستخدم Map-Reduce + OCR
// ============================================

import { useCallback } from "react";
import { supabase } from "../lib/supabase";
import { showToast } from "../utils/chatHelpers";
import {
  smartDetectIntent,
  executeRequestForSummary,
} from "../utils/intentDetection";
import {
  getPdfMapPrompt,
  getPdfReducePrompt,
} from "../config/prompts";
import {
  extractPdfText,
  findToc,
  findSectionByTitle,
  getFileSignedUrl,
} from "../utils/pdf";

export function usePdfProcessing({
  user,
  attachedFiles,
  setAttachedFiles,
  executeRequest,
  setMessages,
  setLoading,
  setStreamingText,
  setInput,
  sortMessagesByTime,
  messagesRef,
}) {
  // ─────────────────────────────────────────
  // 1. طلب الفهرس
  // ─────────────────────────────────────────
  const handleTocRequest = useCallback(async () => {
    const pdfFile = attachedFiles.find((f) => f.type === "application/pdf");
    if (!pdfFile) {
      showToast("⚠️ لم يُعثر على ملف PDF.", "error");
      return;
    }

    const userMsgId = Date.now();
    const userMsg = {
      role: "user",
      content: "اعرض الفهرس",
      id: userMsgId,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setStreamingText("");

    try {
      showToast("🔍 جاري البحث عن الفهرس...", "info");

      const pdfSource = pdfFile.filePath
        ? await getFileSignedUrl(pdfFile.filePath, 3600)
        : pdfFile.rawFile || pdfFile.pdfFile;

      const result = await findToc(pdfSource);

      if (result.found) {
        const tocText = `📋 **فهرس الملف: ${pdfFile.name}**\n\n${result.text}`;
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: tocText,
              id: Date.now(),
            },
          ])
        );
        showToast("✅ تم العثور على الفهرس.", "success");
      } else {
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content:
                "⚠️ لم يُعثر على فهرس في هذا الملف.\n\nيمكنك تحديد أرقام الصفحات التي تريدها.",
              id: Date.now(),
            },
          ])
        );
        showToast("⚠️ لا يوجد فهرس.", "info");
      }
    } catch (err) {
      console.error("[PDF] خطأ في قراءة الفهرس:", err);
      setMessages((prev) =>
        sortMessagesByTime([
          ...prev,
          {
            role: "assistant",
            content: "❌ خطأ في قراءة PDF: " + err.message,
            id: Date.now(),
          },
        ])
      );
      showToast("❌ فشل قراءة PDF.", "error");
    } finally {
      setLoading(false);
      setStreamingText("");
    }
  }, [
    attachedFiles,
    setMessages,
    setLoading,
    setStreamingText,
    setInput,
    sortMessagesByTime,
  ]);

  // ─────────────────────────────────────────
  // 2. طلب فصل بالاسم
  // ─────────────────────────────────────────
  const handlePdfSectionRequest = useCallback(
    async (pdfFile, sectionTitle, userPrompt) => {
      setLoading(true);
      setStreamingText("");
      setInput("");

      try {
        showToast("🔍 جاري البحث عن الفصل في الفهرس...", "info");

        const pdfSource = pdfFile.filePath
          ? await getFileSignedUrl(pdfFile.filePath, 3600)
          : pdfFile.rawFile || pdfFile.pdfFile;

        const result = await findSectionByTitle(pdfSource, sectionTitle);

        if (!result.found) {
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              { role: "user", content: userPrompt, id: Date.now() },
              {
                role: "assistant",
                content:
                  `⚠️ لم أجد "${sectionTitle}" في الفهرس.\n\n` +
                  `يمكنك:\n- كتابة "اعرض الفهرس" لرؤية العناوين المتاحة.\n- أو تحديد أرقام صفحات مباشرة.`,
                id: Date.now() + 1,
              },
            ])
          );
          setLoading(false);
          return;
        }

        showToast(
          `✅ وُجد "${result.title}" في الصفحات ${result.startPage}-${result.endPage}`,
          "success"
        );

        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            { role: "user", content: userPrompt, id: Date.now() },
            {
              role: "assistant",
              content: `📖 وُجد **${result.title}** في الصفحات **${result.startPage}-${result.endPage}**. جاري المعالجة على دفعات...`,
              id: Date.now() + 1,
            },
          ])
        );

        setLoading(false);

        await handlePdfPagesRequest(
          pdfFile,
          result.startPage,
          result.endPage,
          null
        );
      } catch (err) {
        console.error("[PDF] خطأ في البحث عن الفصل:", err);
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: "❌ خطأ: " + err.message,
              id: Date.now(),
            },
          ])
        );
        showToast("❌ فشل البحث عن الفصل.", "error");
        setLoading(false);
      }
    },
    [setMessages, setLoading, setStreamingText, setInput, sortMessagesByTime]
  );

  // ─────────────────────────────────────────
  // 3. طلب صفحات (Map-Reduce + OCR)
  // ─────────────────────────────────────────
  const handlePdfPagesRequest = useCallback(
    async (pdfFile, startPage, endPage, userPrompt) => {
      const CHUNK_SIZE = 4;
      const totalPages = pdfFile.pageCount || endPage;
      const safeEnd = Math.min(endPage, totalPages);
      const safeStart = Math.max(1, startPage);

      if (safeStart > safeEnd) {
        showToast("⚠️ نطاق صفحات غير صالح.", "error");
        return;
      }

      setInput("");
      setLoading(true);
      setStreamingText("");

      const totalChunks = Math.ceil((safeEnd - safeStart + 1) / CHUNK_SIZE);
      const partialSummaries = [];
      const failedChunks = [];

      try {
        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const chunkStart = safeStart + chunkIndex * CHUNK_SIZE;
          const chunkEnd = Math.min(
            chunkStart + CHUNK_SIZE - 1,
            safeEnd
          );

          showToast(
            `🔍 استخراج الصفحات ${chunkStart}-${chunkEnd} (${chunkIndex + 1}/${totalChunks})...`,
            "info"
          );

          try {
            const pdfSource = pdfFile.filePath
              ? await getFileSignedUrl(pdfFile.filePath, 3600)
              : pdfFile.rawFile || pdfFile.pdfFile;

            const chunkText = await extractPdfText(
              pdfSource,
              chunkStart,
              chunkEnd,
              {
                enableOcr: true,
                onOcrProgress: (pageNum, from, to) => {
                  const totalInChunk = to - from + 1;
                  const currentIdx = pageNum - from + 1;
                  showToast(
                    `🔍 الصفحة ${pageNum} صورة — OCR (${currentIdx}/${totalInChunk})...`,
                    "info"
                  );
                },
              }
            );

            if (!chunkText || chunkText.trim().length < 10) {
              failedChunks.push(`${chunkStart}-${chunkEnd} (نص فارغ)`);
              continue;
            }

            const mapRequestText = getPdfMapPrompt(
              userPrompt,
              pdfFile.name,
              chunkStart,
              chunkEnd,
              totalPages,
              chunkText
            );

            const summary = await executeRequestForSummary(mapRequestText);
            if (summary) {
              partialSummaries.push(summary);
            } else {
              failedChunks.push(
                `${chunkStart}-${chunkEnd} (فشل التلخيص)`
              );
            }
          } catch (chunkErr) {
            console.error(
              `[PDF] فشل الجزء ${chunkStart}-${chunkEnd}:`,
              chunkErr
            );
            failedChunks.push(
              `${chunkStart}-${chunkEnd} (${chunkErr.message})`
            );
          }

          if (chunkIndex < totalChunks - 1) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }

        if (partialSummaries.length === 0) {
          setMessages((prev) =>
            sortMessagesByTime([
              ...prev,
              {
                role: "assistant",
                content:
                  "❌ لم أتمكن من تلخيص أي جزء من الملف. قد تكون الصفحات صوراً بدون نص واضح.",
                id: Date.now(),
              },
            ])
          );
          setLoading(false);
          return;
        }

        showToast("🔄 جاري دمج الملخصات في ملخص نهائي...", "info");

        const combinedSummaries = partialSummaries
          .map((s, i) => `--- ملخص الجزء ${i + 1} ---\n${s}`)
          .join("\n\n");

        const reduceRequestText = getPdfReducePrompt(
          userPrompt,
          pdfFile.name,
          safeStart,
          safeEnd,
          combinedSummaries
        );

        await executeRequest(reduceRequestText, userPrompt);
      } catch (err) {
        console.error("[PDF] خطأ عام:", err);
        setMessages((prev) =>
          sortMessagesByTime([
            ...prev,
            {
              role: "assistant",
              content: "❌ خطأ في قراءة PDF: " + err.message,
              id: Date.now(),
            },
          ])
        );
        showToast("❌ فشل قراءة PDF.", "error");
      } finally {
        setLoading(false);
        setStreamingText("");
      }
    },
    [
      setInput,
      setLoading,
      setStreamingText,
      setMessages,
      sortMessagesByTime,
      executeRequest,
    ]
  );

  return {
    handleTocRequest,
    handlePdfSectionRequest,
    handlePdfPagesRequest,
  };
}
