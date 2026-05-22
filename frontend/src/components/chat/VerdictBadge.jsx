import { memo } from "react";

const VERDICT_MAP = {
  malicious:  { bg: "rgba(248,113,113,0.1)",  border: "#f87171", text: "#fca5a5", label: "⚠ MALICIOUS" },
  clean:      { bg: "rgba(74,222,128,0.1)",   border: "#4ade80", text: "#86efac", label: "✓ CLEAN"    },
  suspicious: { bg: "rgba(251,146,60,0.1)",   border: "#fb923c", text: "#fdba74", label: "⚡ SUSPICIOUS"  },
  critical:   { bg: "rgba(239,68,68,0.12)",   border: "#ef4444", text: "#fca5a5", label: "🔴 CRITICAL" },
};

const VerdictBadge = memo(function VerdictBadge({ verdict }) {
  const c = VERDICT_MAP[verdict] || VERDICT_MAP.suspicious;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "4px",
      padding: "3px 10px", borderRadius: "4px",
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
      fontSize: "9px", fontWeight: "700", letterSpacing: "2px",
      fontFamily: "'JetBrains Mono',monospace", whiteSpace: "nowrap",
    }}>
      {c.label}
    </span>
  );
});

export default VerdictBadge;