import { useState }          from "react";
import { useNavigate }       from "react-router-dom";
import { LOGO_URL, COLORS }  from "../constants";
import { PageBackground }    from "../styles/background";
import { useAuthForm }       from "../hooks/useAuthForm";
import StyledInput           from "../components/auth/StyledInput";
import ForgotPasswordModal   from "../components/auth/ForgotPasswordModal";

const G = COLORS.green;

const BTN_STYLE = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
  width: "100%", padding: "12px 22px",
  background: "rgba(127,216,50,0.05)",
  border: "1px solid rgba(127,216,50,0.3)",
  borderRadius: "8px",
  color: G, fontSize: "0.68rem", letterSpacing: "0.22em",
  fontFamily: "'DM Mono', monospace", fontWeight: 600,
  transition: "all 0.2s", textTransform: "uppercase",
};

export default function Auth() {
  const navigate = useNavigate();
  const { email, setEmail, password, setPassword, error, loading, handleSubmit } = useAuthForm();
  const [showForgot, setShowForgot] = useState(false);

  return (
    <div style={{
      position: "relative", minHeight: "100vh", display: "flex",
      alignItems: "center", justifyContent: "center",
      background: "#040a12", overflow: "hidden",
      fontFamily: "'DM Mono', monospace",
    }}>
      <PageBackground />

      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "420px",
        background: "rgba(4,10,18,0.75)",
        border: "1px solid rgba(127,216,50,0.1)",
        borderRadius: "16px", padding: "44px 40px",
        backdropFilter: "blur(24px)",
        boxShadow: "0 0 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(127,216,50,0.05)",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 28, height: 28, borderTop: `1px solid ${G}`, borderLeft: `1px solid ${G}`, borderRadius: "16px 0 0 0", opacity: 0.4 }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderBottom: `1px solid ${G}`, borderRight: `1px solid ${G}`, borderRadius: "0 0 16px 0", opacity: 0.4 }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "8px" }}>
          <img src={LOGO_URL} alt="Socilis" style={{ height: "72px", width: "auto", marginBottom: "12px", filter: "drop-shadow(0 0 16px rgba(0,200,255,0.5)) drop-shadow(0 0 32px rgba(127,216,50,0.2))" }} />
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: "1.7rem", fontWeight: 800, letterSpacing: "0.15em" }}>
            <span style={{ color: "#fff" }}>SOC</span>
            <span style={{ color: G, filter: "drop-shadow(0 0 12px rgba(127,216,50,0.4))" }}>ILIS</span>
          </div>
        </div>

        <div style={{ textAlign: "center", marginBottom: "32px", fontSize: "0.58rem", letterSpacing: "0.25em", color: "rgba(255,255,255,0.2)", textTransform: "uppercase" }}>
          // Secure Access Portal
        </div>

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,60,60,0.06)", border: "1px solid rgba(255,60,60,0.2)", borderRadius: "6px", padding: "10px 14px", marginBottom: "20px" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ff4444", flexShrink: 0, display: "inline-block" }} />
            <span style={{ color: "#ff8080", fontSize: "0.75rem", fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>{error}</span>
          </div>
        )}

        <StyledInput label="Email Address" type="email"    value={email}    onChange={e => setEmail(e.target.value)}    placeholder="analyst@socilis.com" />
        <StyledInput label="Password"      type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••••••" />

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px", marginTop: "-8px" }}>
          <button
            onClick={() => setShowForgot(true)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(127,216,50,0.45)", fontSize: "0.65rem", letterSpacing: "0.08em", fontFamily: "'DM Mono', monospace", transition: "color 0.2s", padding: 0, textDecoration: "underline", textUnderlineOffset: "3px" }}
            onMouseEnter={e => e.currentTarget.style.color = G}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(127,216,50,0.45)"}
          >
            FORGOT PASSWORD?
          </button>
        </div>

        <button
          onClick={handleSubmit} disabled={loading}
          style={{ ...BTN_STYLE, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.5 : 1 }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = "rgba(127,216,50,0.1)"; e.currentTarget.style.borderColor = "rgba(127,216,50,0.5)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(127,216,50,0.05)"; e.currentTarget.style.borderColor = "rgba(127,216,50,0.3)"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          {loading ? (
            <>
              <span style={{ width: 8, height: 8, borderRadius: "50%", border: `1.5px solid ${G}`, borderTopColor: "transparent", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
              AUTHENTICATING...
            </>
          ) : "LOGIN"}
        </button>

        <button
          onClick={() => navigate("/home")}
          style={{ display: "block", width: "100%", textAlign: "center", marginTop: "16px", fontSize: "0.65rem", letterSpacing: "0.12em", color: "rgba(255,255,255,0.2)", background: "transparent", border: "none", cursor: "pointer", transition: "color 0.2s", fontFamily: "'DM Mono', monospace" }}
          onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
          onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
        >
          ← Return to <span style={{ color: G }}>SOCILIS</span>
        </button>
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}