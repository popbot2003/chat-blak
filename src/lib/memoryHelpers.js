// ============================================================
// memoryHelpers.js — كل منطق الذاكرة والرجوع لسجل المحادثات
// v3: retry logic للـ FK + إصلاح updateChatSummary
// ============================================================
import { supabase } from './supabase';

import {
  MEMORY_MIN_IMPORTANCE,
  MEMORY_INJECT_TOP_K,
  CHAT_REFERENCE_TOP_K,
  MEMORY_MAX_CONTENT_LEN,
  CHAT_SUMMARY_MAX_LEN,
  EXPLICIT_SAVE_PATTERNS,
  EXPLICIT_FORGET_PATTERNS,
} from '../config/constants';

// ─── 1) قراءة إعدادات المستخدم ─────────────────────────────
export async function getUserMemorySettings(userId) {
  if (!userId) return { memory_enabled: false, chat_reference_enabled: false };
  const { data, error } = await supabase
    .from('profiles')
    .select('memory_enabled, chat_reference_enabled')
    .eq('id', userId)
    .single();
  if (error) {
    console.error('[memory] failed to read settings:', error);
    return { memory_enabled: false, chat_reference_enabled: false };
  }
  return data;
}

// ─── 2) تحديث إعداد واحد ────────────────────────────────────
export async function updateMemorySetting(userId, field, value) {
  const allowed = ['memory_enabled', 'chat_reference_enabled'];
  if (!allowed.includes(field)) throw new Error('invalid setting field');
  const { error } = await supabase
    .from('profiles')
    .update({ [field]: value })
    .eq('id', userId);
  if (error) throw error;
}

// ─── 3) كشف الطلبات الصريحة ─────────────────────────────────
export function detectExplicitMemoryRequest(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  for (const re of EXPLICIT_SAVE_PATTERNS) {
    const m = trimmed.match(re);
    if (m && m[1] && m[1].trim().length > 1) {
      return {
        action: 'save',
        content: m[1].trim().slice(0, MEMORY_MAX_CONTENT_LEN),
      };
    }
  }

  for (const re of EXPLICIT_FORGET_PATTERNS) {
    const m = trimmed.match(re);
    if (m && m[1] && m[1].trim().length > 1) {
      return { action: 'forget', query: m[1].trim() };
    }
  }

  return null;
}

// ─── 4) حفظ ذكرى (مع retry لو المحادثة لسه ما اتخزنتش) ─────
export async function saveMemory(userId, chatId, content, importance, source = 'auto') {
  if (!userId || !content) return null;

  const safeContent = content.slice(0, MEMORY_MAX_CONTENT_LEN).trim();
  const safeImportance = Math.max(1, Math.min(5, importance || MEMORY_MIN_IMPORTANCE));

  const basePayload = {
    user_id: userId,
    content: safeContent,
    importance: safeImportance,
    source,
  };

  // منع التكرار
  const { data: existing } = await supabase
    .from('memories')
    .select('id, importance')
    .eq('user_id', userId)
    .eq('content', safeContent)
    .limit(1)
    .maybeSingle();

  if (existing) {
    if (existing.importance < safeImportance) {
      await supabase
        .from('memories')
        .update({ importance: safeImportance, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
    }
    return existing.id;
  }

  // محاولة الحفظ (بـ chat_id لو موجود)
  const tryInsert = async (payload) =>
    supabase.from('memories').insert(payload).select('id').single();

  let payload = { ...basePayload, chat_id: chatId || null };
  let { data, error } = await tryInsert(payload);

  // لو FK فشل — المحادثة لسه ما اتخزنتش. نستنى 3.5 ثانية ونجرب تاني
  if (error?.code === '23503' && payload.chat_id) {
    console.info('[memory] FK retry after delay (chat not yet saved)...');
    await new Promise((r) => setTimeout(r, 3500));
    ({ data, error } = await tryInsert(payload));
  }

  // لو لسه فشل — نحفظ على مستوى المستخدم (chat_id = null)
  if (error?.code === '23503') {
    console.warn('[memory] chat not found, saving at user-level');
    ({ data, error } = await tryInsert({ ...basePayload, chat_id: null }));
  }

  if (error) {
    console.error('[memory] save failed:', error);
    return null;
  }
  return data.id;
}

// ─── 5) حذف ذكرى واحدة ──────────────────────────────────────
export async function deleteMemory(userId, memoryId) {
  const { error } = await supabase
    .from('memories')
    .delete()
    .eq('id', memoryId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ─── 6) حذف الذكريات المطابقة ───────────────────────────────
export async function deleteMatchingMemories(userId, query) {
  if (!query) return 0;
  const escaped = query.replace(/[%_\\]/g, '\\$&');
  const { data, error } = await supabase
    .from('memories')
    .delete()
    .eq('user_id', userId)
    .ilike('content', `%${escaped}%`)
    .select('id');
  if (error) {
    console.error('[memory] delete matching failed:', error);
    return 0;
  }
  return data?.length || 0;
}

// ─── 7) قائمة كل الذكريات ───────────────────────────────────
export async function listMemories(userId) {
  const { data, error } = await supabase
    .from('memories')
    .select('id, content, importance, source, created_at, chat_id')
    .eq('user_id', userId)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[memory] list failed:', error);
    return [];
  }
  return data || [];
}

// ─── 8) تحميل الذكريات للبرومبت ─────────────────────────────
export async function loadMemoriesForPrompt(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('memories')
    .select('content, importance')
    .eq('user_id', userId)
    .gte('importance', MEMORY_MIN_IMPORTANCE)
    .order('importance', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(MEMORY_INJECT_TOP_K);
  if (error) {
    console.error('[memory] load for prompt failed:', error);
    return [];
  }
  return data || [];
}

// ─── 9) البحث في ملخصات المحادثات ───────────────────────────
export async function searchChatSummaries(userId, query) {
  if (!userId || !query || query.trim().length < 3) return [];
  const { data, error } = await supabase.rpc('search_chat_summaries', {
    p_user_id: userId,
    p_query: query,
    p_limit: CHAT_REFERENCE_TOP_K,
  });
  if (error) {
    console.error('[memory] summary search failed:', error);
    return [];
  }
  return data || [];
}

// ─── 10) بناء بلوك البرومبت ─────────────────────────────────
export function buildMemoryPromptBlock(memories, summaries) {
  const parts = [];

  if (memories && memories.length) {
    const lines = memories.map((m) => `- ${m.content}`).join('\n');
    parts.push(
      `## حقائق محفوظة عن المستخدم (ذاكرة طويلة المدى)\n${lines}\n\nاستخدمها لو مفيدة، وما تكرّرهاش حرفيًا في كل رد.`
    );
  }

  if (summaries && summaries.length) {
    const lines = summaries
      .map((s, i) => `[${i + 1}] (${s.chat_title || 'محادثة سابقة'}): ${s.summary}`)
      .join('\n');
    parts.push(
      `## ملخصات من محادثات سابقة قد تكون ذات صلة\n${lines}\n\nلو استخدمت معلومة منها، أشر إنها من محادثة سابقة.`
    );
  }

  return parts.join('\n\n');
}

// ─── 11) JSON parser آمن ────────────────────────────────────
function parseJsonSafe(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch { /* ignore */ }

  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ─── 12) استخراج الذكريات + الملخص ──────────────────────────
export async function extractMemoriesAndSummary({
  messages,
  wantMemories = true,
  wantSummary = true,
}) {
  if (!wantMemories && !wantSummary) return { memories: [], summary: null };

  const convo = messages
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'المستخدم' : 'المساعد'}: ${m.content}`)
    .join('\n')
    .slice(0, 6000);

  const systemPrompt = `أنت مستخرج معلومات صامت. رجّع JSON فقط، بدون أي شرح، بالشكل ده:

{
  "memories": [{"content": "...", "importance": 1-5}],
  "summary": "..."
}

قواعد الذكريات:
- احفظ الحقائق الثابتة المهمة فقط: اسم المستخدم، شغله، مشروعه، تفضيلاته الدائمة، قراراته.
- تجاهل الأسئلة العابرة، التفاصيل المؤقتة، والمحتوى العام.
- importance = 3 للحقائق المهمة، 4 لتفضيلات شخصية قوية، 5 لحقائق هوية أساسية.
- ما تحفظش أي حاجة أهميتها أقل من 3.
- كل ذكرى جملة واحدة قصيرة (أقل من 200 حرف).
- أقصى 3 ذكريات في الاستخراج الواحد.

قواعد الملخص:
- ملخص قصير (2-4 جمل) للموضوع الأساسي في المحادثة.
- لو المحادثة تحية أو سؤال عابر، خلي الملخص null.

${wantMemories ? '' : 'ما تولّدش memories، خليها [].'}
${wantSummary ? '' : 'ما تولّدش summary، خليه null.'}

أرجع JSON فقط.`;

  try {
    const { data, error } = await supabase.functions.invoke('hyper-responder', {
      body: {
        messages: [
          {
            role: 'user',
            content: `المحادثة:\n${convo}\n\nاستخرج الذكريات والملخص. JSON فقط:`,
          },
        ],
        systemPrompt,
        mode: 'fast',
        temperature: 0.1,
        max_completion_tokens: 600,
      },
    });

    if (error) {
      console.error('[memory] extract edge function failed:', error);
      return { memories: [], summary: null };
    }

    const raw = data?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonSafe(raw);

    if (!parsed) {
      console.warn('[memory] extract returned non-JSON:', raw.slice(0, 200));
      return { memories: [], summary: null };
    }

    const memories = Array.isArray(parsed.memories)
      ? parsed.memories
          .filter((m) => m && typeof m.content === 'string')
          .map((m) => ({
            content: m.content.trim().slice(0, MEMORY_MAX_CONTENT_LEN),
            importance: Number(m.importance) || MEMORY_MIN_IMPORTANCE,
          }))
          .filter((m) => m.content.length > 1 && m.importance >= MEMORY_MIN_IMPORTANCE)
          .slice(0, 3)
      : [];

    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 10
        ? parsed.summary.trim().slice(0, CHAT_SUMMARY_MAX_LEN)
        : null;

    return { memories, summary };
  } catch (err) {
    console.error('[memory] extract error:', err);
    return { memories: [], summary: null };
  }
}

// ─── 13) تحديث summary في chats ─────────────────────────────
export async function updateChatSummary(chatId, summary) {
  if (!chatId || !summary) return;
  const { error } = await supabase
    .from('chats')
    .update({ summary })
    .eq('id', chatId);
  if (error) console.error('[memory] update summary failed:', error);
}
