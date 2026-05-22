import { btn, inputField, fieldLabel, errorText, successMsg } from "./styles";
import ModalShell from "./ModalShell";
import { useDeleteForm } from "./useUserForm";

export default function DeleteUserModal({ darkMode, onClose }) {
  const {
    email, setEmail, pseudo, setPseudo,
    confirm, setConfirm, step, error, setError,
    success, submitting, nextStep, back, submit,
  } = useDeleteForm(onClose);

  const inp = { ...inputField(darkMode, !!error), color: darkMode ? "#e2f0ff" : "#0a1628" };

  return (
    <ModalShell
      onClose={onClose} darkMode={darkMode}
      accentColor="rgba(239,68,68,0.4)" titleIcon="⚠" title="DELETE USER"
    >
      {success ? (
        <div style={successMsg}>✓ User deleted</div>

      ) : step === 1 ? (
        <>
          <p style={{ color: "rgba(160,210,255,0.55)", fontSize: "10px", lineHeight: "1.6", marginBottom: "16px" }}>
            Enter the email of the user to delete. This action is irreversible.
          </p>
          <div style={{ marginBottom: "12px" }}>
            <label style={fieldLabel}>USERNAME</label>
            <input
              style={{ ...inputField(darkMode, false), color: darkMode ? "#e2f0ff" : "#0a1628" }}
              type="text" value={pseudo} placeholder="Ex: nouryams"
              onChange={e => { setPseudo(e.target.value); setError(""); }}
            />
          </div>
          <div style={{ marginBottom: "12px" }}>
            <label style={fieldLabel}>EMAIL</label>
            <input
              style={inp} type="email" value={email} placeholder="user@mobilis.dz"
              onChange={e => { setEmail(e.target.value); setError(""); }}
            />
          </div>
          {error && <div style={errorText}>{error}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose}  style={btn("transparent", "1px solid rgba(0,168,255,0.2)", "rgba(160,210,255,0.55)")}>CANCEL</button>
            <button onClick={nextStep} style={btn("rgba(239,68,68,0.1)", "1px solid rgba(239,68,68,0.35)", "#f87171")}>CONTINUE →</button>
          </div>
        </>

      ) : (
        <>
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "10px 12px", marginBottom: "16px" }}>
            <div style={{ fontSize: "9px", color: "rgba(160,210,255,0.28)", letterSpacing: "2px", marginBottom: "4px" }}>TARGETED ACCOUNT</div>
            <div style={{ fontSize: "12px", color: "#f87171" }}>{email}</div>
          </div>
          <p style={{ color: "rgba(160,210,255,0.55)", fontSize: "10px", lineHeight: "1.6", marginBottom: "14px" }}>
            To confirm, type <strong style={{ color: "#f87171" }}>DELETE</strong> below:
          </p>
          <div style={{ marginBottom: "12px" }}>
            <input
              style={inp} value={confirm} placeholder="DELETE"
              onChange={e => { setConfirm(e.target.value); setError(""); }}
            />
            {error && <div style={errorText}>{error}</div>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={back}
              disabled={submitting}
              style={btn("transparent", "1px solid rgba(0,168,255,0.2)", "rgba(160,210,255,0.55)")}
            >
              ← RETURN
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              style={{
                ...btn("rgba(239,68,68,0.15)", "1px solid rgba(239,68,68,0.45)", "#f87171"),
                opacity: submitting ? 0.6 : 1,
                cursor:  submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "..." : "DELETE"}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}