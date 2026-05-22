// CreateUserModal.jsx
import { btn, inputField, fieldLabel, successMsg, errorText } from "./styles";
import ModalShell from "./ModalShell";
import Field      from "./Field";
import { useCreateForm } from "./useUserForm";

export default function CreateUserModal({ darkMode, onClose }) {
  const { form, set, errors, success, submit } = useCreateForm(onClose);

  return (
    <ModalShell
      onClose={onClose} darkMode={darkMode}
      accentColor="rgba(0,200,80,0.35)" titleIcon="＋" title="CREATE USER"
    >
      {success ? (
        <div style={successMsg}>✓ User created successfully</div>
      ) : (
        <>
          <Field label="FULL NAME"   darkMode={darkMode} value={form.name}     onChange={set("name")}     placeholder="Ex: Racha OUZNADJI"    error={errors.name} />
          <Field label="USERNAME"        darkMode={darkMode} value={form.pseudo}   onChange={set("pseudo")}   placeholder="Ex: nouryams"        error={errors.pseudo} />
          <Field label="EMAIL"         darkMode={darkMode} value={form.email}    onChange={set("email")}    placeholder="analyst@mobilis.dz"  error={errors.email} type="email" />
          <Field label="PASSWORD"  darkMode={darkMode} value={form.password} onChange={set("password")} placeholder="••••••••"            error={errors.password} type="password" />

          <div style={{ marginBottom: "12px" }}>
            <label style={fieldLabel}>ROLE</label>
            <select value={form.role} onChange={set("role")} style={{ ...inputField(darkMode), cursor: "pointer", color: darkMode ? "#e2f0ff" : "#0a1628" }}>
              <option value="1">Standard User</option>
              <option value="0">Administrator</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={onClose} style={btn("transparent", "1px solid rgba(0,168,255,0.2)", "rgba(160,210,255,0.55)")}>CANCEL</button>
            <button onClick={submit}  style={btn("rgba(0,200,80,0.12)", "1px solid rgba(0,200,80,0.35)", "#34d399")}>CREATE</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}