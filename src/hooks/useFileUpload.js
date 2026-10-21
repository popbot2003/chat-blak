// ============================================
// src/hooks/useFileUpload.js
// ✅ v4.0: يستخدم isUploaded بدلاً من fromStorage
// ============================================

import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { showToast, readFileAsText, getFileIcon } from "../utils/chatHelpers";
import { extractTextFromImage } from "../utils/ocr";
import {
  getPdfPageCount,
  uploadFileToStorage,
  insertUserFile,
  deleteFilesFromStorage,
} from "../utils/pdf";
import { CHAT_HISTORY_LIMIT } from "../config/constants";

export function useFileUpload({
  user,
  currentChatId,
  setCurrentChatId,
  messagesRef,
  setAllChats,
}) {
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);

  const uploadPendingFiles = useCallback(
    async (chatId) => {
      const filesToUpload = attachedFiles.filter(
        (f) => !f.isUploaded && f.rawFile
      );

      if (filesToUpload.length === 0) return attachedFiles;

      const uploadedFiles = [...attachedFiles];

      for (const f of filesToUpload) {
        try {
          setUploadProgress({
            name: f.name,
            percentage: 0,
            currentIndex: 1,
            totalFiles: filesToUpload.length,
          });

          const { path } = await uploadFileToStorage(
            f.rawFile,
            user.id,
            chatId,
            (percentage) => {
              setUploadProgress({
                name: f.name,
                percentage,
                currentIndex: 1,
                totalFiles: filesToUpload.length,
              });
            }
          );

          const record = await insertUserFile({
            user_id: user.id,
            chat_id: chatId,
            file_name: f.name,
            file_path: path,
            file_type:
              f.type === "application/pdf" ? "application/pdf" : "text",
            file_size: f.size || 0,
            content_text: f.content || null,
            page_count: f.pageCount || null,
          });

          const idx = uploadedFiles.findIndex((u) => u.id === f.id);
          if (idx !== -1) {
            uploadedFiles[idx] = {
              ...uploadedFiles[idx],
              filePath: path,
              isUploaded: true,
              recordId: record.id,
            };
          }
        } catch (err) {
          console.error(`[Upload] فشل رفع ${f.name}:`, err);
          showToast(`❌ فشل رفع ${f.name}`, "error");
        }
      }

      setUploadProgress(null);
      return uploadedFiles;
    },
    [attachedFiles, user.id]
  );

  const handleFileUpload = useCallback(
    async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      let chatId = currentChatId;
      if (!chatId) {
        chatId = Date.now().toString();
        setCurrentChatId(chatId);
      }

      const newFiles = [];

      for (const file of files) {
        if (file.type === "application/pdf") {
          try {
            showToast(`📄 جاري قراءة ${file.name}...`, "info");
            const pageCount = await getPdfPageCount(file);
            newFiles.push({
              id: Date.now() + Math.random(),
              name: file.name,
              type: "application/pdf",
              size: file.size,
              icon: "📄",
              content: "",
              rawFile: file,
              pdfFile: file,
              pageCount,
              fromStorage: false,
              isUploaded: false,
            });
            showToast(`✅ تم استلام ${file.name} (${pageCount} صفحة).`, "success");
          } catch (err) {
            console.error("[PDF] خطأ:", err);
            showToast(`❌ فشل قراءة ${file.name}`, "error");
          }
          continue;
        }

        if (file.type.startsWith("image/")) {
          try {
            showToast(`🔍 جاري استخراج النص من ${file.name}...`, "info");
            const ocrText = await extractTextFromImage(file);
            if (!ocrText || ocrText.length < 3) {
              showToast(
                `⚠️ لم يتم العثور على نص واضح في ${file.name}`,
                "error"
              );
              continue;
            }
            newFiles.push({
              id: Date.now() + Math.random(),
              name: file.name,
              type: "text/ocr",
              size: file.size,
              icon: "📝",
              content: `[نص مستخرج من صورة: ${file.name}]\n\n${ocrText}`,
              rawFile: file,
              fromStorage: false,
              isUploaded: false,
            });
            showToast(`✅ تم استخراج النص من ${file.name}`, "success");
          } catch (err) {
            console.error("[OCR] خطأ:", err);
            showToast(`❌ فشل استخراج النص من ${file.name}`, "error");
          }
          continue;
        }

        try {
          newFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            icon: getFileIcon(file),
            content: await readFileAsText(file),
            rawFile: file,
            fromStorage: false,
            isUploaded: false,
          });
        } catch {
          newFiles.push({
            id: Date.now() + Math.random(),
            name: file.name,
            type: file.type,
            size: file.size,
            icon: "❌",
            content: "خطأ",
            isUploaded: false,
          });
        }
      }

      if (newFiles.length === 0) return;

      // ✅ أضف الملفات أولاً
      setAttachedFiles((prev) => [...prev, ...newFiles]);

      // ✅ ثم ارفعها
      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        if (!f.rawFile) continue;

        try {
          setUploadProgress({
            name: f.name,
            percentage: 0,
            currentIndex: i + 1,
            totalFiles: newFiles.length,
          });

          const { path } = await uploadFileToStorage(
            f.rawFile,
            user.id,
            chatId,
            (percentage) => {
              setUploadProgress({
                name: f.name,
                percentage,
                currentIndex: i + 1,
                totalFiles: newFiles.length,
              });
            }
          );

          const record = await insertUserFile({
            user_id: user.id,
            chat_id: chatId,
            file_name: f.name,
            file_path: path,
            file_type:
              f.type === "application/pdf" ? "application/pdf" : "text",
            file_size: f.size || 0,
            content_text: f.content || null,
            page_count: f.pageCount || null,
          });

          // ✅ حدّث الملف: isUploaded فقط (احتفظ بـ rawFile و fromStorage)
          setAttachedFiles((prev) =>
            prev.map((u) =>
              u.id === f.id
                ? {
                    ...u,
                    filePath: path,
                    isUploaded: true,
                    recordId: record.id,
                  }
                : u
            )
          );
        } catch (err) {
          console.error(`[Upload] فشل رفع ${f.name}:`, err);
          showToast(`❌ فشل رفع ${f.name}`, "error");
          setAttachedFiles((prev) => prev.filter((u) => u.id !== f.id));
        }
      }

      showToast("✅ اكتمل رفع الملف. يمكنك الإرسال الآن.", "success");

      if (chatId) {
        try {
          const now = new Date().toISOString();

          const msgsToSave =
            messagesRef.current.length > 0
              ? messagesRef.current.slice(-CHAT_HISTORY_LIMIT)
              : [
                  {
                    role: "assistant",
                    content: "محادثة بالملفات",
                    id: Date.now(),
                  },
                ];

          const { error: chatSaveErr } = await supabase
            .from("chats")
            .upsert({
              id: chatId,
              user_id: user.id,
              title: "محادثة بالملفات",
              messages: msgsToSave,
              updated_at: now,
            });

          if (chatSaveErr) {
            console.warn(
              "[Chat] فشل حفظ المحادثة بعد الرفع:",
              chatSaveErr.message
            );
          } else {
            setAllChats((prev) => {
              const exists = prev.find((c) => c.id === chatId);
              const updated = {
                id: chatId,
                title: "محادثة بالملفات",
                date: now,
                messageCount: msgsToSave.length,
              };
              return exists
                ? [updated, ...prev.filter((c) => c.id !== chatId)]
                : [updated, ...prev];
            });
          }
        } catch (err) {
          console.warn("[Chat] خطأ في حفظ المحادثة:", err);
        }
      }

      setUploadProgress(null);
    },
    [
      user.id,
      currentChatId,
      setCurrentChatId,
      messagesRef,
      setAllChats,
    ]
  );

  const removeFile = useCallback(
    (fileId) => {
      const fileToRemove = attachedFiles.find((f) => f.id === fileId);
      if (fileToRemove?.filePath) {
        deleteFilesFromStorage([fileToRemove.filePath]).catch((err) =>
          console.warn("[Chat] فشل حذف الملف من Storage:", err.message)
        );
        supabase
          .from("user_files")
          .delete()
          .eq("file_path", fileToRemove.filePath)
          .then(({ error }) => {
            if (error) console.warn("[Chat] فشل حذف السجل:", error.message);
          });
      }

      setAttachedFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    [attachedFiles]
  );

  const restoreChatFiles = useCallback(async (chatId) => {
    if (!chatId) return;

    try {
      const { data: files, error } = await supabase
        .from("user_files")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error || !files || files.length === 0) return;

      const restoredFiles = files.map((f) => ({
        id: f.id,
        name: f.file_name,
        type: f.file_type,
        size: f.file_size,
        icon:
          f.file_type === "application/pdf"
            ? "📄"
            : f.file_type === "text/ocr"
            ? "📝"
            : "📎",
        content: f.content_text || "",
        pageCount: f.page_count,
        filePath: f.file_path,
        fromStorage: true,
        isUploaded: true,
      }));

      setAttachedFiles((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const toAdd = restoredFiles.filter((f) => !existingIds.has(f.id));
        return [...prev, ...toAdd];
      });
    } catch (err) {
      console.warn("[Chat] خطأ في استرجاع الملفات:", err.message);
    }
  }, []);

  return {
    attachedFiles,
    setAttachedFiles,
    uploadProgress,
    uploadPendingFiles,
    handleFileUpload,
    removeFile,
    restoreChatFiles,
  };
}
