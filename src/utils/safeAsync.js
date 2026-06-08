async function safeAsync(asyncFn, fallback) {
  if (fallback === undefined) fallback = null;
  try {
    return await asyncFn();
  } catch (error) {
    console.error("❌ safeAsync:", error.message);
    return fallback;
  }
}

function safeJsonParse(str, fallback) {
  if (fallback === undefined) fallback = null;
  try {
    return JSON.parse(str);
  } catch (error) {
    return fallback;
  }
}

function safeGet(obj, path, fallback) {
  if (fallback === undefined) fallback = null;
  try {
    var keys = path.split('.');
    var result = obj;
    for (var i = 0; i < keys.length; i++) {
      if (result === null || result === undefined) return fallback;
      result = result[keys[i]];
    }
    return result !== undefined ? result : fallback;
  } catch (error) {
    return fallback;
  }
}

export { safeAsync, safeJsonParse, safeGet };
