import { useState }              from "react";
import { useNavigate }           from "react-router-dom";
import { t }                     from "./chatTheme";
import { useSidebarHistory }     from "../../hooks/useSidebarHistory";
import { highlightMatch }        from "../../utils/formatUtils";
import { LOGO_URL } from "../../constants";
/**
 * Avant : fetch + delete + formatage + rendu tous dans ce fichier.
 * Après : la logique métier est dans useSidebarHistory(),
 *         les helpers de formatage sont dans utils/formatUtils.js.
 *       il ne fait plus que du rendu.
 */
export default function ChatSidebar({ open, darkMode, selectedChat, onSelectChat, onNewChat }) {
  const th = t(darkMode);
  const navigate = useNavigate();

  const [search,    setSearch]    = useState("");
  const [hoveredId, setHoveredId] = useState(null);

  // ← toute la logique fetch/delete/format est maintenant ici
  const { history, loading, handleDelete } = useSidebarHistory(open);

  const filtered = history.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.preview.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      width: open ? "260px" : "0px",
      minWidth: open ? "260px" : "0px",
      background: th.sidebar,
      borderRight: `1px solid ${th.border}`,
      display: "flex", flexDirection: "column",
      overflow: "hidden", transition: "all 0.3s ease",
    }}>
      {open && (
        <>
          {/* Logo */}
          <div style={{
            padding: "20px 16px",
            borderBottom: `1px solid ${th.border}`,
            display: "flex", alignItems: "center", gap: "10px",
          }}>
            <img
              src={LOGO_URL}
              alt="SOCILIS"
              style={{ width: "32px", height: "32px", objectFit: "contain" }}
            />
            <div>
              <div style={{ fontWeight: "700", fontSize: "14px", letterSpacing: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ color: th.text }}>SOC</span>
                <span style={{ color: "#7FD832" }}>ILIS</span>
              </div>
              <div style={{ color: th.textMuted, fontSize: "9px", letterSpacing: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
                THREAT INTELLIGENCE
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <button
              onClick={onNewChat}
              style={{
                width: "100%", padding: "8px",
                background: "transparent",
                border: `1px dashed ${th.borderActive}`,
                borderRadius: "6px",
                color: th.accent, fontSize: "11px", letterSpacing: "2px",
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = th.accentSubtle}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              + NEW ANALYSIS
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%", padding: "8px",
                background: "transparent",
                border: "1px solid rgba(34,197,94,0.35)",
                borderRadius: "6px",
                color: "#22c55e", fontSize: "11px", letterSpacing: "2px",
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(34,197,94,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              ◈ DASHBOARD
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: "0 12px 10px" }}>
            <div
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                background: th.input,
                border: `1px solid ${th.border}`,
                borderRadius: "6px", padding: "6px 10px",
              }}
              onFocusCapture={e => e.currentTarget.style.borderColor = th.borderActive}
              onBlurCapture={e  => e.currentTarget.style.borderColor = th.border}
            >
              <span style={{ color: th.textFaint, fontSize: "11px", flexShrink: 0 }}>🔍</span>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: th.text, fontSize: "10px", letterSpacing: "0.5px",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{ background: "transparent", border: "none", color: th.textFaint, cursor: "pointer", fontSize: "12px", lineHeight: 1, padding: 0 }}
                >×</button>
              )}
            </div>
          </div>

          {/* Liste historique */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
            <div style={{
              fontSize: "9px", color: th.textFaint,
              letterSpacing: "3px", padding: "4px 8px 6px",
              fontFamily: "'JetBrains Mono', monospace",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span>HISTORY</span>
              {search && (
                <span style={{ color: th.accent, fontSize: "8px" }}>
                  {filtered.length} result{filtered.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div style={{ padding: "20px 10px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: th.textFaint, letterSpacing: "1px" }}>
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: "20px 10px", textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: th.textFaint, letterSpacing: "1px" }}>
                {history.length === 0 ? "No analysis performed" : "No results found"}
              </div>
            ) : (
              filtered.map(item => {
                const isHovered = hoveredId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectChat(item.id)}
                    onMouseEnter={() => setHoveredId(item.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      padding: "10px", borderRadius: "6px", marginBottom: "2px",
                      cursor: "pointer", position: "relative",
                      background: selectedChat === item.id ? th.accentSubtle : isHovered ? th.surfaceHover : "transparent",
                      border: selectedChat === item.id ? `1px solid ${th.borderActive}` : "1px solid transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: th.text, marginBottom: "3px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", paddingRight: isHovered ? "20px" : "0", fontFamily: "'JetBrains Mono', monospace" }}>
                      {highlightMatch(item.title, search, th)}
                    </div>
                    <div style={{ fontSize: "10px", color: th.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                      {highlightMatch(item.preview, search, th)}
                    </div>
                    <div style={{ fontSize: "9px", color: th.textFaint, marginTop: "2px", fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.date}
                    </div>

                    {isHovered && (
                      <button
                        onClick={(e) => handleDelete(e, item.id)}
                        title="Delete"
                        style={{
                          position: "absolute", top: "8px", right: "8px",
                          background: "transparent", border: "none", color: "#ef4444",
                          cursor: "pointer", fontSize: "13px", lineHeight: 1,
                          padding: "2px 4px", borderRadius: "4px", transition: "background 0.15s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.15)"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}