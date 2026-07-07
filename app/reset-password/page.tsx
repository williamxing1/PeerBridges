"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { LanguageSelect, useLanguage } from "../i18n";
import { supabase } from "../../lib/supabase/client";

type RecoveryState = "verifying" | "ready" | "success" | "error";

function PasswordInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <label className="grid gap-2 text-sm text-card-foreground">
      {label}
      <span className="relative block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          minLength={6}
          required
          autoComplete="new-password"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 pr-12 outline-none transition-colors focus:border-primary"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={t(visible ? "common.hidePassword" : "common.showPassword")}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground transition-colors hover:text-card-foreground"
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<RecoveryState>("verifying");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function establishRecoverySession() {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const callbackType = searchParams.get("type") || hashParams.get("type");
      const tokenHash = searchParams.get("token_hash");
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const callbackError =
        searchParams.get("error_description") ||
        hashParams.get("error_description");

      if (callbackError) {
        console.error("Supabase password recovery callback failed", callbackError);
        if (!cancelled) {
          setError(callbackError);
          setState("error");
        }
        return;
      }

      if (callbackType !== "recovery" && !tokenHash) {
        if (!cancelled) {
          setError(t("passwordReset.invalidLink"));
          setState("error");
        }
        return;
      }

      if (tokenHash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "recovery",
        });
        if (verifyError) {
          console.error("Failed to verify password recovery token", verifyError);
          if (!cancelled) {
            setError(t("passwordReset.invalidLink"));
            setState("error");
          }
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          console.error("Failed to establish password recovery session", sessionError);
          if (!cancelled) {
            setError(t("passwordReset.invalidLink"));
            setState("error");
          }
          return;
        }
      } else {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error("Password recovery session was not available", sessionError);
          if (!cancelled) {
            setError(t("passwordReset.invalidLink"));
            setState("error");
          }
          return;
        }
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error("Failed to verify password recovery user", userError);
        if (!cancelled) {
          setError(t("passwordReset.invalidLink"));
          setState("error");
        }
        return;
      }

      window.history.replaceState(window.history.state, "", "/reset-password");
      if (!cancelled) setState("ready");
    }

    void establishRecoverySession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError(t("passwordReset.tooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("passwordReset.mismatch"));
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      console.error("Failed to update password from recovery session", updateError);
      setError(updateError.message);
      setSaving(false);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      console.error("Failed to close password recovery session", signOutError);
    }
    sessionStorage.removeItem("tutorflow-user");
    localStorage.removeItem("tutorflow-user");
    setNewPassword("");
    setConfirmPassword("");
    setSaving(false);
    setState("success");
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 min-w-0 shrink-0 items-center gap-2 border-b border-border bg-card px-3 sm:gap-4 sm:px-6">
        <div className="mr-0 flex shrink-0 items-center gap-2 sm:mr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen size={16} />
          </div>
          <span className="hidden text-card-foreground sm:block">PeerBridges</span>
        </div>
        <div className="flex-1" />
        <LanguageSelect />
      </header>

      <section className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            {state === "success" ? (
              <CheckCircle2 size={38} aria-hidden="true" />
            ) : (
              <LockKeyhole size={38} aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-6 text-2xl text-card-foreground sm:text-3xl">
            {state === "success" ? t("passwordReset.success") : t("passwordReset.title")}
          </h1>

          {state === "verifying" && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("passwordReset.verifying")}
            </p>
          )}

          {state === "ready" && (
            <>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t("passwordReset.help")}
              </p>
              <form onSubmit={handleSubmit} className="mt-7 grid gap-4 text-left">
                <PasswordInput
                  label={t("passwordReset.newPassword")}
                  value={newPassword}
                  onChange={setNewPassword}
                />
                <PasswordInput
                  label={t("passwordReset.confirmPassword")}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                />
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-1 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? t("passwordReset.changing") : t("passwordReset.submit")}
                </button>
              </form>
            </>
          )}

          {state === "error" && (
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-destructive">
              {error}
            </p>
          )}

          {(state === "success" || state === "error") && (
            <Link
              href="/"
              className="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 text-sm text-card-foreground transition-colors hover:bg-accent sm:w-auto"
            >
              {t("auth.backToLogin")}
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
