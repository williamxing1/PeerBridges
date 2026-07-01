"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, MailCheck } from "lucide-react";
import { LanguageSelect, useLanguage } from "../i18n";

function CheckEmailContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

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
            <MailCheck size={38} aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-2xl text-card-foreground sm:text-3xl">
            {t("auth.checkInbox")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("auth.confirmationEmailSent")}
          </p>
          {email && (
            <p className="mt-3 break-all text-sm font-medium text-card-foreground">{email}</p>
          )}
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            {t("auth.confirmationHelp")}
          </p>
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

export default function CheckEmailPage() {
  return (
    <Suspense fallback={null}>
      <CheckEmailContent />
    </Suspense>
  );
}
