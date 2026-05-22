import { useNavigate }      from "react-router-dom";
import { t }                from "./chatTheme";
import { useAuth }          from "../../context/AuthContext";
import { useDarkMode }      from "../../context/DarkModeContext";
import RoleGuard, { ROLES } from "../auth/RoleGuard";
import ModalShell           from "./settings/ModalShell";

export default function SettingsModal({ onClose, onOpenAdminModal }) {
  const navigate             = useNavigate();
  const { darkMode, toggle } = useDarkMode();
  const th                   = t(darkMode);
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = () => { logout(); navigate("/auth"); };

  return (
    <ModalShell
      onClose={onClose}
      darkMode={darkMode}
      accentColor={th.borderActive}
      titleIcon="⚙"
      title="PARAMETERS"
      maxWidth="320px"
      zIndex={999}
    >
      {/* User card */}
      <div style={{ background: th.accentSubtle, border: `1px solid ${th.border}`, borderRadius: "7px", padding: "12px", marginBottom: "10px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: `linear-gradient(135deg, ${th.accentDim}, ${th.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", boxShadow: `0 0 12px ${th.accentGlow}`, flexShrink: 0 }}>
          {isAdmin ? "🛡" : "👤"}
        </div>
        <div>
          <div style={{ color: th.text, fontSize: "12px", fontWeight: "700", letterSpacing: "1px" }}>{user?.name ?? "SOC Analyst"}</div>
          <div style={{ color: th.textMuted, fontSize: "9px", marginTop: "2px" }}>{user?.email ?? "—"}</div>
          <div style={{ display: "inline-block", marginTop: "4px", padding: "2px 7px", borderRadius: "3px", fontSize: "8px", letterSpacing: "2px", background: isAdmin ? "rgba(255,180,0,0.12)" : "rgba(0,200,80,0.1)", border: isAdmin ? "1px solid rgba(255,180,0,0.3)" : "1px solid rgba(0,200,80,0.25)", color: isAdmin ? "#fbbf24" : "#34d399" }}>
            {isAdmin ? "ADMIN" : "USER"}
          </div>
        </div>
      </div>

      {/* Dark mode toggle */}
      <div onClick={toggle} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 12px", background: th.accentSubtle, border: `1px solid ${th.border}`, borderRadius: "7px", marginBottom: "10px", cursor: "pointer" }}>
        <span style={{ color: th.text, fontSize: "11px", letterSpacing: "1.5px" }}>{darkMode ? "🌙 Dark Mode" : "☀️ Mode Clair"}</span>
        <div style={{ width: "38px", height: "20px", borderRadius: "10px", background: darkMode ? th.accent : "rgba(255,255,255,0.2)", border: `1px solid ${th.border}`, position: "relative", transition: "all 0.3s" }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#fff", position: "absolute", top: "2px", left: darkMode ? "20px" : "2px", transition: "all 0.3s" }} />
        </div>
      </div>

      {/* Admin */}
      <RoleGuard allowedRoles={[ROLES.ADMIN]}>
        <div style={{ marginBottom: "10px" }}>
          <div style={{ fontSize: "9px", color: "#fbbf24", letterSpacing: "2.5px", marginBottom: "8px", paddingBottom: "6px", borderBottom: "1px solid rgba(255,180,0,0.15)" }}>🛡 ADMINISTRATION</div>
          {[
            { label: "＋ CREATE USER",    type: "create", bg: "rgba(0,200,80,0.07)",  border: "rgba(0,200,80,0.25)",  color: "#34d399", hov: "rgba(0,200,80,0.14)"  },
            { label: "✕ DELETE USER", type: "delete", bg: "rgba(239,68,68,0.07)", border: "rgba(239,68,68,0.25)", color: "#fca5a5", hov: "rgba(239,68,68,0.14)" },
          ].map(({ label, type, bg, border, color, hov }) => (
            <button key={type} onClick={() => onOpenAdminModal(type)}
              onMouseEnter={e => e.currentTarget.style.background = hov}
              onMouseLeave={e => e.currentTarget.style.background = bg}
              style={{ width: "100%", padding: "10px", marginBottom: "8px", background: bg, border: `1px solid ${border}`, borderRadius: "7px", color, fontSize: "10px", letterSpacing: "2px", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace", transition: "all 0.2s" }}>
              {label}
            </button>
          ))}
        </div>
      </RoleGuard>

      {/* Logout */}
      <button onClick={handleLogout} style={{ width: "100%", padding: "10px", background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.25)", borderRadius: "7px", color: "#fca5a5", fontSize: "10px", letterSpacing: "2.5px", cursor: "pointer", fontFamily: "'JetBrains Mono',monospace" }}>
        ⏻ LOG OUT
      </button>
    </ModalShell>
  );
}