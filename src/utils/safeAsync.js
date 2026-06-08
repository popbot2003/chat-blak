export async function safeAsync(asyncFn, fallback = null) {
  try {
    return await asyncFn();
  } catch (error) {
    console.error("❌ safeAsync:", error.message);
    return fallback;
  }
}

export function safeJsonParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

export function safeGet(obj, path, fallback = null) {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? fallback;
  } catch {
    return fallback;
  }
}
