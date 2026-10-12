import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, LogIn, Info, KeyRound } from "lucide-react";
import { auth, db } from "../config/firebase";
import { isMainAdmin } from "../config/roles";

const mapError = (code) => {
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email";
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password";
    case "auth/invalid-email":
      return "Invalid email address format";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    case "auth/network-request-failed":
      return "Network error. Check your connection";
    case "auth/user-disabled":
      return "This account has been disabled";
    default:
      return "Login failed. Please try again";
  }
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setBusy(true);
    try {
      const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
      const snap = await db.collection("users").doc(cred.user.uid).get();
      const data = snap.exists ? snap.data() : null;

      if (!isMainAdmin(data)) {
        await auth.signOut();
        setError("This portal is for Main Admins only.");
        return;
      }
      navigate("/", { replace: true });
    } catch (err) {
      setError(mapError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    setError("");
    setNotice("");
    if (!email.includes("@")) {
      setError("Enter your email above first, then click “Forgot password”");
      return;
    }
    setBusy(true);
    try {
      await auth.sendPasswordResetEmail(email.trim());
      setNotice("Password reset email sent — check your inbox.");
    } catch (err) {
      setError(mapError(err.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-aside">
        <img className="login-art" src="/images/zerowaste.png" alt="Zero waste" />
        <h2>Segregation. Pickup. Rewards.</h2>
        <p>
          Everything the barangay needs to keep every sitio clean — schedules, complaints,
          rewards and announcements in one place.
        </p>
      </div>

      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon lg logo">
            <img src="/images/garbagecan.png" alt="" />
          </div>
          <h1>BRGYBIN</h1>
          <p>Barangay Waste Management · Admin Portal</p>
        </div>

        {error && (
          <div className="banner banner-error">
            <Info size={16} /> {error}
          </div>
        )}
        {notice && (
          <div className="banner banner-success">
            <Info size={16} /> {notice}
          </div>
        )}

        <form onSubmit={submit} className="login-form">
          <label className="field">
            <span>Email</span>
            <div className="input-wrap">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                placeholder="admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>
          </label>

          <label className="field">
            <span>Password</span>
            <div className="input-wrap">
              <Lock size={18} className="input-icon" />
              <input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowPass((s) => !s)}
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <div className="login-row">
            <button type="button" className="link-btn" onClick={forgotPassword} disabled={busy}>
              <KeyRound size={14} /> Forgot password?
            </button>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? (
              <span className="btn-spinner" />
            ) : (
              <>
                <LogIn size={18} /> Sign in
              </>
            )}
          </button>
        </form>

        <div className="login-foot">
          Main Admin access only · Residents use the mobile app
        </div>
      </div>
    </div>
  );
}
