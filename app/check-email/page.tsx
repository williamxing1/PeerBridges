"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, MailCheck, UserPlus } from "lucide-react";
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
        <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck size={38} aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-center text-2xl text-card-foreground sm:text-3xl">
            {t("auth.checkInbox")}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("auth.confirmationEmailSent")}
          </p>
          {email && (
            <p className="mt-3 break-all text-center text-sm font-medium text-card-foreground">{email}</p>
          )}
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">1</span>
                <MailCheck size={20} className="text-primary" />
                <h2 className="text-card-foreground">{t("auth.confirmEmailStep")}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("auth.confirmationHelp")}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">2</span>
                <UserPlus size={20} className="text-primary" />
                <h2 className="text-card-foreground">{t("auth.addTeacherWechatStep")}</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("auth.addTeacherWechatHelp", { teacher: "杨老师", wechat: "CallForEngTutors" })}</p>
              <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-sm font-medium text-card-foreground">CallForEngTutors</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("auth.teacherWillApprove", { teacher: "杨老师" })}</p>
            </div>
          </div>
          <Link
            href="/"
            className="mx-auto mt-7 flex w-full items-center justify-center rounded-xl border border-border px-5 py-3 text-sm text-card-foreground transition-colors hover:bg-accent sm:w-fit"
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
