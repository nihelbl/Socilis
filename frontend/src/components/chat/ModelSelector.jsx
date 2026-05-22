import { useState, useRef, useEffect } from "react";
import { t } from "./chatTheme";

export const MODELS = [
  { id: "phi3-mini",  label: "Phi-3 Mini",  desc: "Fast · Lightweight"     },
  { id: "gemma3",     label: "Gemma 3",      desc: "Balanced · Precise" },
];

export default function ModelSelector({ darkMode, selectedModel, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const th = t(darkMode);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={{
        display: "flex", alignItems: "center", gap: "5px",
        background: "transparent", border: `1px solid ${open ? th.borderActive : th.border}`,
        borderRadius: "4px", padding: "3px 8px", color: th.textMuted,
        fontSize: "9px", letterSpacing: "1px", cursor: "pointer",
        fontFamily: "'JetBrains Mono',monospace", transition: "all 0.18s", whiteSpace: "nowrap",
      }}>
        <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: th.accent, boxShadow: `0 0 5px ${th.accent}`, flexShrink: 0 }} />
        <span style={{ color: th.accent, fontWeight: "600" }}>{current.label}</span>
        <span style={{ display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s", fontSize: "8px", color: th.textFaint }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          minWidth: "180px",
          background: darkMode ? "#060d16" : "#f0f6ff",
          border: `1px solid ${th.borderActive}`, borderRadius: "7px",
          overflow: "hidden",
          boxShadow: `0 8px 28px rgba(0,0,0,0.4), 0 0 0 1px ${th.accentGlow}`,
          zIndex: 50, animation: "fadeInUp 0.15s ease",
        }}>
          <div style={{ padding: "6px 10px 4px", fontSize: "8px", letterSpacing: "2px", color: th.textFaint, borderBottom: `1px solid ${th.border}`, fontFamily: "'JetBrains Mono',monospace" }}>MODÈLE IA</div>
          {MODELS.map(m => (
            <button key={m.id} onClick={() => { onSelect(m.id); setOpen(false); }} style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "8px 12px",
              background: selectedModel === m.id ? th.accentSubtle : "transparent",
              border: "none",
              borderLeft: selectedModel === m.id ? `2px solid ${th.accent}` : "2px solid transparent",
              cursor: "pointer", transition: "all 0.15s",
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "1px", color: selectedModel === m.id ? th.accent : th.text }}>{m.label}</div>
              <div style={{ fontSize: "8px", color: th.textFaint, marginTop: "2px" }}>{m.desc}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}