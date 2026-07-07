"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useLanguage } from "../i18n";

type RulesRole = "student" | "tutor";
type NotificationMethod = "wechat" | "email" | "phone";

function nextBeijingMidnight(weekday: 5 | 6) {
  const beijingNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const currentWeekday = beijingNow.getUTCDay();
  let daysUntil = (weekday - currentWeekday + 7) % 7;
  if (daysUntil === 0) daysUntil = 7;

  return new Date(Date.UTC(
    beijingNow.getUTCFullYear(),
    beijingNow.getUTCMonth(),
    beijingNow.getUTCDate() + daysUntil,
    -8,
  ));
}

function formatLocalDeadline(deadline: Date, lang: string) {
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  const weekday = deadline.toLocaleString(locale, {
    weekday: "long",
  });
  const time = deadline.toLocaleString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return lang === "zh" ? `每周${weekday} ${time}` : `${weekday} at ${time} each week`;
}

export function AccountRulesDialog({
  open,
  required,
  role,
  notificationMethod,
  onOpenChange,
  onAcknowledge,
}: {
  open: boolean;
  required: boolean;
  role: RulesRole;
  notificationMethod: NotificationMethod | null;
  onOpenChange: (open: boolean) => void;
  onAcknowledge: () => Promise<void>;
}) {
  const { lang, t } = useLanguage();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setScrolledToBottom(false);
      setError("");
    }
  }, [open]);

  const selectedNotificationMethod = notificationMethod ?? "email";
  const method = t(`auth.notificationMethod.${selectedNotificationMethod}` as
      | "auth.notificationMethod.wechat"
      | "auth.notificationMethod.email"
      | "auth.notificationMethod.phone");
  const bookingDeadline = formatLocalDeadline(nextBeijingMidnight(6), lang);
  const availabilityDeadline = formatLocalDeadline(nextBeijingMidnight(5), lang);
  const notificationExample = role === "student"
    ? t("rules.studentNotificationExample")
    : t("rules.tutorNotificationExample");
  const sharedRules = [
    t("rules.contact"),
    t("rules.contactPrivacy"),
    <>
      {t("rules.notifications", { method, example: notificationExample })}{" "}
      <strong>{t("rules.checkAppFrequently")}</strong>
      {t(role === "tutor" ? "rules.tutorCheckAppDetails" : "rules.studentCheckAppDetails")}
    </>,
    t("rules.join"),
    t(role === "student" ? "rules.studentStrikes" : "rules.tutorStrikes", {
      deadline: role === "student" ? bookingDeadline : availabilityDeadline,
    }),
  ];
  const studentRules = [
    t("rules.studentDeadlines", { bookingDeadline, availabilityDeadline }),
    t("rules.studentFeedback"),
    t("rules.studentPassword"),
    t("rules.studentRecurring"),
    <>
      <strong>{t("rules.actionRequired")}</strong>{" "}
      {t("rules.studentSamples")}
    </>,
  ];
  const tutorRules = [
    t("rules.tutorDeadlines", { availabilityDeadline, bookingDeadline }),
    t("rules.tutorAfterDeadline", { deadline: availabilityDeadline }),
    t("rules.tutorEvaluation"),
    t("rules.tutorStudentSamples"),
    t("rules.tutorMeeting"),
  ];
  const rules = [...sharedRules, ...(role === "student" ? studentRules : tutorRules)];

  async function acknowledge() {
    setSaving(true);
    setError("");
    try {
      await onAcknowledge();
    } catch (acknowledgeError) {
      setError(
        acknowledgeError instanceof Error
          ? acknowledgeError.message
          : t("rules.acknowledgeError"),
      );
      setSaving(false);
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!required || nextOpen) onOpenChange(nextOpen);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[70] flex max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl border border-border bg-card p-5 shadow-2xl sm:p-6"
          onEscapeKeyDown={(event) => required && event.preventDefault()}
          onPointerDownOutside={(event) => required && event.preventDefault()}
        >
          {!required && (
            <Dialog.Close
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground"
              aria-label={t("common.close")}
            >
              <X size={18} />
            </Dialog.Close>
          )}

          <Dialog.Title className="pr-10 text-xl text-card-foreground">
            {t("rules.title")}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {required ? t("rules.requiredHelp") : t("rules.help")}
          </Dialog.Description>

          <div
            className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-xl border border-border bg-background p-4"
            onScroll={(event) => {
              const element = event.currentTarget;
              if (element.scrollTop + element.clientHeight >= element.scrollHeight - 8) {
                setScrolledToBottom(true);
              }
            }}
          >
            <ol className="list-decimal space-y-4 pl-5 text-sm leading-relaxed text-card-foreground">
              {rules.map((rule, index) => <li key={index}>{rule}</li>)}
            </ol>
            <p className="mt-6 text-xs text-muted-foreground">{t("rules.footer")}</p>
          </div>

          {required && (
            <div className="mt-4">
              {!scrolledToBottom && (
                <p className="mb-2 text-center text-xs text-muted-foreground">
                  {t("rules.scrollHint")}
                </p>
              )}
              {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
              <button
                type="button"
                disabled={!scrolledToBottom || saving}
                onClick={() => void acknowledge()}
                className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? t("rules.saving") : t("rules.understand")}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
