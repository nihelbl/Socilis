import { useState } from "react";
import { authApi } from "../../../api/auth";

const validateEmail = (email) => /\S+@\S+\.\S+/.test(email);

// ─── Hook : création d'utilisateur ──────────────────────────────────────────
export function useCreateForm(onDone) {
  const [form, setForm]       = useState({ name: "", pseudo: "", email: "", password: "", role: "1" });
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.name.trim())          e.name     = "Name is required";
    if (!form.pseudo.trim())        e.pseudo   = "Username is required";
    if (!validateEmail(form.email)) e.email    = "Invalid email";
    if (form.password.length < 6)   e.password = "Minimum 6 characters";
    return e;
  };

  const submit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); // reset erreurs avant envoi

    try {
      await authApi.createUser(form.email, form.password);
      setSuccess(true);
      setTimeout(onDone, 1400);
    } catch (err) {
      setErrors({ email: err.message || "Error occurred while creating the user" });
    }
  };

  return { form, set, errors, success, submit };
}

// ─── Hook : suppression d'utilisateur (2 étapes) ────────────────────────────
export function useDeleteForm(onDone) {
  const [email,      setEmail]      = useState("");
  const [pseudo,     setPseudo]     = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [step,       setStep]       = useState(1);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState(false);
  const [submitting, setSubmitting] = useState(false); // ← verrou anti double-clic

  const nextStep = () => {
    if (!pseudo.trim())        { setError("Username is required"); return; }
    if (!validateEmail(email)) { setError("Invalid email"); return; }
    setError(""); setStep(2);
  };

  const back = () => { setStep(1); setConfirm(""); setError(""); };

  const submit = async () => {
    if (confirm !== "DELETE") { setError('Type exactly "DELETE"'); return; }
    if (submitting) return; // bloque le double-clic
    setSubmitting(true);

    try {
      const users = await authApi.listUsers();
      const user  = users.find(u => u.email === email);

      if (!user) { setError("User not found"); return; }
      if (user.role === "superadmin") { setError("Cannot delete the superadmin"); return; }

      await authApi.deleteUser(user.id);
      setSuccess(true);
      setTimeout(onDone, 1400);
    } catch (err) {
      setError(err.message || "Error occurred while deleting the user");
    } finally {
      setSubmitting(false);
    }
  };

  return { email, setEmail, pseudo, setPseudo, confirm, setConfirm, step, error, setError, success, submitting, nextStep, back, submit };
}