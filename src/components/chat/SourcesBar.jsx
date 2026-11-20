// ============================================
// src/components/chat/SourcesBar.jsx — BLACK 🖤
// أيقونات المصادر تحت الرد، تفتح قائمة منسدلة
// ============================================

import { useState } from "react";

const MAX_ICONS = 4; // أقصى عدد أيقونات تظهر

export default function SourcesBar({ sources }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  const icons  = sources.slice(0, MAX_ICONS);
  const extra  = sources.length - MAX_ICONS;

  return (
    <div className="sources-bar" dir="rtl">
      {/* ─── صف الأيقونات ─── */}
      <button
        type="button"
        className="sources-bar__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${sources.length} مصادر`}
      >
        <div className="sources-bar__icons">
          {icons.map((s, i) => (
            <img
              key={i}
              src={s.favicon}
              alt={s.domain}
              className="sources-bar__favicon"
              style={{ zIndex: icons.length - i }}
              onError={(e) => {
                // fallback: أول حرف من الدومين
                e.target.style.display = "none";
                e.target.nextSibling?.style && (e.target.nextSibling.style.display = "flex");
              }}
            />
          ))}
          {extra > 0 && (
            <span className="sources-bar__extra">+{extra}</span>
          )}
        </div>
        <span className="sources-bar__label">
          {sources.length} {sources.length === 1 ? "مصدر" : "مصادر"}
        </span>
        <span className="sources-bar__chevron" aria-hidden="true">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* ─── القائمة المنسدلة ─── */}
      {open && (
        <ul className="sources-bar__list">
          {sources.map((s, i) => (
            <li key={i} className="sources-bar__item">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="sources-bar__link"
              >
                <img
                  src={s.favicon}
                  alt=""
                  className="sources-bar__favicon sources-bar__favicon--sm"
                  onError={(e) => {
                    e.target.style.display = "none";
                  }}
                />
                <span className="sources-bar__num">[{i + 1}]</span>
                <span className="sources-bar__info">
                  <span className="sources-bar__title">{s.title}</span>
                  <span className="sources-bar__domain">{s.domain}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
