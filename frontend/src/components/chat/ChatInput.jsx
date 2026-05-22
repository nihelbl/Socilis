import { useState } from "react";
import ModelSelector from "./ModelSelector";
import { t } from "./chatTheme";

export default function ChatInput({ darkMode, input, loading, selectedModel, onModelChange, onInputChange, onKeyDown, onSend }) {
  const th = t(darkMode);
  const canSend = input.trim() && !loading;
  const [focused, setFocused] = useState(false);

  return (
    <div style={{
      padding: "10px 14px 14px", borderTop: `1px solid ${th.border}`, flexShrink: 0,
      background: darkMode ? "rgba(5,11,18,0.97)" : "rgba(240,246,255,0.97)",
      backdropFilter: "blur(8px)",
    }}>
      <div style={{
        display: "flex", flexDirection: "column",
        background: th.input,
        border: `1px solid ${focused || input ? th.borderActive : th.border}`,
        borderRadius: "8px", padding: "2px 4px 6px 12px",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: focused || input ? `0 0 16px ${th.accentGlow}` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace", fontSize: "13px", fontWeight: "700",
            color: canSend ? th.accent : th.textFaint, userSelect: "none",
            transition: "color 0.2s", flexShrink: 0,
          }}>$</span>
          <input
            value={input} onChange={onInputChange} onKeyDown={onKeyDown}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            disabled={loading}
            placeholder="Enter an IOC (hash, IP, URL, domain, Mail, CVE)..."
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: th.text, fontSize: "12px",
              fontFamily: "'JetBrains Mono',monospace", letterSpacing: "0.4px",
              padding: "10px 0", opacity: loading ? 0.5 : 1,
            }}
          />
          {input && (
            <button onClick={() => onInputChange({ target: { value: "" } })} style={{
              background: "transparent", border: "none", color: th.textFaint,
              fontSize: "14px", cursor: "pointer", padding: "2px 4px",
              borderRadius: "3px", transition: "color 0.15s", flexShrink: 0,
            }}>×</button>
          )}
          <button onClick={() => onSend()} disabled={!canSend} style={{
            padding: "7px 16px",
            background: canSend ? `linear-gradient(135deg, ${th.accentDim}, ${th.accent})` : th.accentSubtle,
            border: "none", borderRadius: "6px",
            color: canSend ? "#fff" : th.textFaint,
            fontSize: "9px", letterSpacing: "2px",
            cursor: canSend ? "pointer" : "not-allowed",
            fontFamily: "'JetBrains Mono',monospace", fontWeight: "700",
            transition: "all 0.2s",
            boxShadow: canSend ? `0 0 12px ${th.accentGlow}` : "none",
            whiteSpace: "nowrap", flexShrink: 0,
          }}>▶ ANALYZE </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", paddingTop: "5px", paddingLeft: "18px", borderTop: `1px solid ${th.border}`, marginTop: "2px" }}>
          <ModelSelector darkMode={darkMode} selectedModel={selectedModel} onSelect={onModelChange} />
          <div style={{ flex: 1 }} />
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "8px", color: th.textFaint, letterSpacing: "1.5px" }}>↵ SEND </span>
        </div>
      </div>
    </div>
  );
}