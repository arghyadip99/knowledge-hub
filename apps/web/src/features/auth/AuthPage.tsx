import { Brain, Chrome, LockKeyhole, UserRound } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { saveSession, type AuthSession } from "./session";

type Props = { onAuthenticated: (session: AuthSession) => void };
type Mode = "login" | "signup";
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;

export function AuthPage({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [identity, setIdentity] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const complete = (session: AuthSession) => {
    saveSession(session);
    onAuthenticated(session);
  };

  useEffect(() => {
    if (!googleClientId) return;
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () =>
      window.google?.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }: { credential: string }) => {
          try {
            complete(
              await api<AuthSession>("/api/auth/google", {
                method: "POST",
                body: JSON.stringify({ idToken: credential }),
              }),
            );
          } catch (requestError) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "Google sign-in failed",
            );
          }
        },
      });
    document.head.append(script);
    return () => script.remove();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await api<AuthSession>(
        mode === "login" ? "/api/auth/login" : "/api/auth/signup",
        {
          method: "POST",
          body: JSON.stringify(
            mode === "login"
              ? { identity, password }
              : { email: identity, username, displayName, password },
          ),
        },
      );
      complete(session);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to continue",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand">
          <span className="brand-mark">
            <Brain size={20} />
          </span>
          <span>
            Second Brain<small>Knowledge Hub</small>
          </span>
        </div>
        <p className="eyebrow">PRIVATE KNOWLEDGE, SHARED DELIBERATELY</p>
        <h1>
          Build a mind
          <br />
          <em>worth returning to.</em>
        </h1>
        <p>
          Your admin curates the library. Readers can explore published
          knowledge without changing it.
        </p>
      </section>
      <section className="auth-card">
        <p className="eyebrow">WELCOME</p>
        <h2>
          {mode === "login"
            ? "Continue your learning."
            : "Create your reader account."}
        </h2>
        <form onSubmit={submit}>
          {mode === "signup" && (
            <>
              <label>
                Name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>
              <label>
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </label>
            </>
          )}
          <label>
            {mode === "login" ? "Email or username" : "Email"}
            <input
              value={identity}
              onChange={(event) => setIdentity(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={mode === "signup" ? 10 : undefined}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="add full" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "login"
                ? "Log in"
                : "Create account"}
          </button>
        </form>
        {googleClientId ? (
          <button
            className="google-button"
            onClick={() => window.google?.accounts.id.prompt()}
          >
            <Chrome size={17} />
            Continue with Google
          </button>
        ) : (
          <p className="auth-hint">
            <LockKeyhole size={14} /> Google sign-in appears after
            `VITE_GOOGLE_CLIENT_ID` is configured.
          </p>
        )}
        <button
          className="auth-switch"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Log in"}
        </button>
        <small className="auth-role">
          <UserRound size={13} /> The first account is the local admin; later
          accounts are readers.
        </small>
      </section>
    </main>
  );
}
