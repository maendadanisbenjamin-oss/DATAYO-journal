"use client";

import { useState } from "react";
import { BarChart3, LogIn, ShieldCheck, Zap } from "lucide-react";
import type { Dict } from "@/lib/i18n";
import type { Profile } from "@/lib/types";

export default function AuthScreen({
  d,
  devMode,
  onDone,
}: {
  d: Dict;
  devMode: boolean;
  onDone: (p: Profile) => Promise<void>;
}) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const r = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const j = await r.json();

      if (!r.ok) {
        throw new Error(j.error || d.error);
      }

      if (mode === "register") {
        setRegistered(true);
        setPassword("");
        return;
      }

      await onDone(j.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : d.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f0d9a8] to-[#c9a557] text-[#17130a] shadow-[0_0_24px_-6px_rgba(216,181,109,0.6)]">
            <BarChart3 size={20} />
          </span>
          <span className="text-[15px] font-extrabold tracking-tight text-white">
            {d.appName}
          </span>
        </div>

        <div>
          <h1 className="max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight text-white">
            {d.authTagline}
          </h1>
          <ul className="mt-8 space-y-3 text-[14px] text-mut">
            <li className="flex items-center gap-3">
              <Zap size={16} className="text-gold" /> {d.live}
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-gold" /> {d.devices}
            </li>
            <li className="flex items-center gap-3">
              <BarChart3 size={16} className="text-gold" /> {d.analysisStats}
            </li>
          </ul>
        </div>

        <p className="text-[12px] text-mut">
          © {new Date().getFullYear()} {d.appName}
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="yj-card w-full max-w-md p-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {mode === "login" ? d.login : d.register}
          </h2>

          {devMode && (
            <p className="mt-1 text-[12.5px] text-mut">{d.demoHint}</p>
          )}

          {registered ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-4">
                <p className="font-semibold text-white">
                  Demande d'inscription envoyée
                </p>
                <p className="mt-2 text-[12.5px] leading-5 text-mut">
                  Votre compte est actuellement en attente d'approbation par
                  un administrateur. Vous pourrez vous connecter dès que votre
                  compte sera activé.
                </p>
              </div>

              <button
                type="button"
                className="yj-btn yj-btn-primary w-full"
                onClick={() => {
                  setRegistered(false);
                  setMode("login");
                  setError(null);
                }}
              >
                {d.login}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-6 space-y-4">
                {mode === "register" && (
                  <label className="block">
                    <span className="yj-label mb-1.5 block">
                      {d.fullName}
                    </span>
                    <input
                      className="yj-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                )}

                <label className="block">
                  <span className="yj-label mb-1.5 block">{d.email}</span>
                  <input
                    className="yj-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>

                <label className="block">
                  <span className="yj-label mb-1.5 block">{d.password}</span>
                  <input
                    className="yj-input"
                    type="password"
                    required
                    minLength={mode === "register" ? 8 : 1}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={
                      mode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                  />
                </label>
              </div>

              {error && (
                <p className="mt-4 rounded-lg border border-down/30 bg-down/10 px-3 py-2 text-[12.5px] text-down">
                  {error}
                </p>
              )}

              <button
                className="yj-btn yj-btn-primary mt-6 w-full"
                disabled={busy}
              >
                <LogIn size={16} />
                {busy
                  ? "..."
                  : mode === "login"
                    ? d.login
                    : d.register}
              </button>

              <p className="mt-5 text-center text-[12.5px] text-mut">
                {mode === "login" ? d.noAccountYet : d.haveAccount}{" "}
                <button
                  type="button"
                  className="font-semibold text-gold hover:underline"
                  onClick={() => {
                    setMode(mode === "login" ? "register" : "login");
                    setError(null);
                    setRegistered(false);
                  }}
                >
                  {mode === "login" ? d.register : d.login}
                </button>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
