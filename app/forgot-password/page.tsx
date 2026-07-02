"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { BookOpen, LockKeyhole, MailCheck } from "lucide-react";
import { LanguageSelect, useLanguage } from "../i18n";
import { supabase } from "../../lib/supabase/client";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError("");

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password?type=recovery`,
    });

    if (resetError) {
      console.error("Failed to send forgot-password email", resetError);
      setError(resetError.message);
      setSending(false);
      return;
    }

    setSending(false);
    setSent(true);
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
            {sent ? (
              <MailCheck size={38} aria-hidden="true" />
            ) : (
              <LockKeyhole size={38} aria-hidden="true" />
            )}
          </div>

          <h1 className="mt-6 text-2xl text-card-foreground sm:text-3xl">
            {sent ? t("forgotPassword.sentTitle") : t("forgotPassword.title")}
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {sent ? t("forgotPassword.sentHelp") : t("forgotPassword.help")}
          </p>

          {!sent && (
            <form onSubmit={handleSubmit} className="mt-7 grid gap-4 text-left">
              <label className="grid gap-2 text-sm text-card-foreground">
                {t("auth.email")}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                />
              </label>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={sending}
                className="rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? t("forgotPassword.sending") : t("forgotPassword.send")}
              </button>
            </form>
          )}

          <Link
            href="/"
            className="mt-7 inline-flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 text-sm text-card-foreground transition-colors hover:bg-accent sm:w-auto"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </section>
    </main>
  );
}
