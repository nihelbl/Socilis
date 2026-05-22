import { t } from "./chatTheme";

export default function TypingIndicator({ darkMode }) {
  const th = t(darkMode);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", marginBottom: "18px", animation: "fadeInUp 0.25s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
        <div style={{
          width: "22px", height: "22px", borderRadius: "50%",
          background: "linear-gradient(135deg, #1a2a3a, #2a4060)",
          border: `1px solid ${th.border}`,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px",
        }}>🛡</div>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "9px", fontWeight: "700", letterSpacing: "2px", color: "#4ade80" }}>TI-ENGINE</span>
      </div>
      <div style={{
        background: th.botBubble, border: `1px solid ${th.border}`,
        borderRadius: "10px 10px 10px 2px", padding: "12px 18px",
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: "10px", color: "#4ade80", letterSpacing: "2px" }}>Analysis in progress...</span>
        <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          {[0,1,2].map(i => (
            <span key={i} style={{
              display: "inline-block", width: "5px", height: "5px", borderRadius: "50%",
              background: "#4ade80",
              animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
        </span>
      </div>
    </div>
  );
}