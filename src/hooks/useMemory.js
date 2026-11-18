// ============================================================
// useMemory.js — hook للتحكم في إعدادات الذاكرة من الواجهة
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import {
  getUserMemorySettings,
  updateMemorySetting,
  listMemories,
  deleteMemory,
  deleteMatchingMemories,
} from '../lib/memoryHelpers';

export function useMemory(userId) {
  const [settings, setSettings] = useState({
    memory_enabled: false,
    chat_reference_enabled: false,
  });
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);

  // ─── قراءة الإعدادات من القاعدة ───────────────────────────
  const refreshSettings = useCallback(async () => {
    if (!userId) return;
    const s = await getUserMemorySettings(userId);
    setSettings(s);
  }, [userId]);

  // ─── قراءة قائمة الذكريات ─────────────────────────────────
  const refreshMemories = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const list = await listMemories(userId);
    setMemories(list);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    refreshMemories();
  }, [refreshMemories]);

  // ─── تبديل مفتاح (تفاؤلي — يرجّع لو فشل) ───────────────────
  const toggleSetting = useCallback(
    async (field) => {
      if (!userId) return;
      if (!['memory_enabled', 'chat_reference_enabled'].includes(field)) return;

      const next = !settings[field];
      setSettings((s) => ({ ...s, [field]: next })); // تفاؤلي

      try {
        await updateMemorySetting(userId, field, next);
      } catch (err) {
        console.error('[useMemory] toggle failed:', err);
        setSettings((s) => ({ ...s, [field]: !next })); // رجوع
        throw err;
      }
    },
    [userId, settings]
  );

  // ─── حذف ذكرى واحدة ───────────────────────────────────────
  const removeMemory = useCallback(
    async (memoryId) => {
      await deleteMemory(userId, memoryId);
      setMemories((list) => list.filter((m) => m.id !== memoryId));
    },
    [userId]
  );

  // ─── حذف ذكريات مطابقة لطلب "انسى" ────────────────────────
  const removeMatching = useCallback(
    async (query) => {
      const n = await deleteMatchingMemories(userId, query);
      await refreshMemories();
      return n;
    },
    [userId, refreshMemories]
  );

  return {
    settings,
    memories,
    loading,
    toggleSetting,
    refreshSettings,
    refreshMemories,
    removeMemory,
    removeMatching,
  };
}
