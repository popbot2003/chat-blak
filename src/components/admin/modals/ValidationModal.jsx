
Commit changes
There was an error committing your changes: popbot2003 has committed since you started editing. See what changed
Commit message
Refactor ValidationModal for responsiveness and clarity
Copilot commit message generated: Refactor ValidationModal for responsiveness and clarity
Extended description
Refactor ValidationModal component for responsiveness and improved styling. Added hooks for better state management and updated JSX structure for clarity.
Message and description suggested by Copilot.
Direct commit or PR

Commit directly to the main branch

Create a new branch for this commit and start a pull request Learn more about pull requests
Skip to content
popbot2003
chat-blak
Repository navigation
Code
Issues
Pull requests
Agents
Actions
Projects
Wiki
Security and quality
Insights
Settings
chat-blak/src/components/admin/modals
/
ValidationModal.jsx
in
main

Edit

Preview
Indent mode

Spaces
Indent size

2
Line wrap mode

No wrap
Editing ValidationModal.jsx file contents
 
288
289
290
291
292
293
294
295
296
297
298
299
300
301
302
303
304
305
306
307
308
309
310
311
312
313
314
315
316
317
318
319
320
321
322
323
324
325
326
327
328
329
330
331
332
333
334
335
336
337
338
339
340
341
342
343
344
345
346
                <div
                  key={result.id ?? idx}
                  style={{
                    ...resultRowStyle,
                    background: result.valid
                      ? "rgba(16,185,129,0.05)"
                      : "rgba(239,68,68,0.05)",
                    borderRight: `3px solid ${
                      result.valid ? "#10b981" : "#ef4444"
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontWeight: "bold",
                      fontSize: isMobile ? "13px" : "14px",
                      wordBreak: "break-word",
                    }}
                  >
                    {result.name}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "10px" : "11px",
                      opacity: 0.6,
                      fontFamily: "monospace",
                      marginTop: "2px",
                      wordBreak: "break-all",
                    }}
                    title={result.value}
                  >
                    {result.value}
                  </div>
                  <div
                    style={{
                      fontSize: isMobile ? "11px" : "12px",
                      marginTop: "6px",
                      color: result.valid ? "#10b981" : "#ef4444",
                      fontWeight: "600",
                    }}
                  >
                    {result.valid ? "✅ صالح" : `❌ ${result.reason}`}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ===== الذيل ===== */}
          <div style={footerStyle}>
            <button onClick={onClose} style={bottomBtnStyle}>
              إغلاق
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
