"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase/client";
import { countryLabelForValue } from "../data/countries";
import { useLanguage } from "../i18n";

export type ProfilePerson = {
  uid: string;
  role: "student" | "tutor";
  name: string;
};

type ProfileDetail = {
  label: string;
  value: string;
};

function labelFromColumn(column: string) {
  return column
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PersonProfileDetails({ person, showAdministrativeFields = false }: { person: ProfilePerson | null; showAdministrativeFields?: boolean }) {
  const { t, lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [details, setDetails] = useState<ProfileDetail[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!person) {
        setDetails([]);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setDetails([]);

      const profileTable = person.role === "student" ? "student_profiles" : "tutor_profiles";
      const [baseProfileResult, roleProfileResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, email, created_at, student_wechat_id, parent_wechat_id, student_email, parent_email, communication_recipient, preferred_communication, notification_method, time_zone, rules_acknowledged_at")
          .eq("uid", person.uid)
          .maybeSingle(),
        supabase
          .from(profileTable)
          .select("*")
          .eq("uid", person.uid)
          .maybeSingle(),
      ]);
      const { data: baseProfile, error: baseError } = baseProfileResult;

      if (baseError || !baseProfile) {
        if (!cancelled) {
          setError(baseError?.message || t("dashboard.profileLoadError"));
          setLoading(false);
        }
        return;
      }

      const { data: roleProfile, error: roleError } = roleProfileResult;

      if (roleError) {
        if (!cancelled) {
          setError(roleError.message);
          setLoading(false);
        }
        return;
      }

      const hiddenFields = new Set(
        person.role === "student"
          ? ["uid", "referrer", "trial_teacher"]
          : ["uid", "how_found_out"]
      );

      const roleDetails = Object.entries(roleProfile ?? {})
        .filter(([key, value]) => !hiddenFields.has(key) && value !== null && value !== "")
        .map(([key, value]) => ({
          label: key === "introduction"
            ? t(person.role === "student" ? "auth.studentIntroduction" : "auth.tutorIntroduction")
            : labelFromColumn(key),
          value: key === "country" ? countryLabelForValue(String(value), lang) : String(value),
        }));

      if (!cancelled) {
        setDetails([
          { label: t("common.name"), value: baseProfile.name },
          ...(showAdministrativeFields
            ? [
                { label: t("admin.accountId"), value: person.uid },
                { label: t("admin.loginEmail"), value: baseProfile.email },
                { label: t("admin.registeredAt"), value: new Date(baseProfile.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }) },
                { label: t("admin.timeZone"), value: baseProfile.time_zone || t("common.none") },
                { label: t("admin.rulesAcknowledged"), value: baseProfile.rules_acknowledged_at ? new Date(baseProfile.rules_acknowledged_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : t("common.no") },
                { label: t("admin.notificationMethod"), value: baseProfile.notification_method ? t(`auth.notificationMethod.${baseProfile.notification_method}` as "auth.notificationMethod.wechat" | "auth.notificationMethod.email" | "auth.notificationMethod.phone") : t("common.none") },
              ]
            : []),
          ...(baseProfile.communication_recipient
            ? [{
                label: t("auth.communicationRecipient"),
                value: baseProfile.communication_recipient === "both"
                  ? t(person.role === "tutor"
                    ? "auth.communicationRecipient.tutorAndParent"
                    : "auth.communicationRecipient.studentAndParent")
                  : baseProfile.communication_recipient === "student" && person.role === "tutor"
                    ? t("auth.communicationRecipient.tutor")
                    : t(`auth.communicationRecipient.${baseProfile.communication_recipient}` as "auth.communicationRecipient.student" | "auth.communicationRecipient.parent"),
              }]
            : []),
          ...(baseProfile.student_wechat_id
            ? [{
                label: t(person.role === "tutor" ? "auth.tutorWechatId" : "auth.studentWechatId"),
                value: baseProfile.student_wechat_id,
              }]
            : []),
          ...(baseProfile.parent_wechat_id
            ? [{ label: t("auth.parentWechatId"), value: baseProfile.parent_wechat_id }]
            : []),
          ...(baseProfile.student_email
            ? [{
                label: t(person.role === "tutor" ? "auth.tutorCommunicationEmail" : "auth.studentCommunicationEmail"),
                value: baseProfile.student_email,
              }]
            : []),
          ...(baseProfile.parent_email
            ? [{ label: t("auth.parentCommunicationEmail"), value: baseProfile.parent_email }]
            : []),
          ...(baseProfile.preferred_communication
            ? [{
                label: t("auth.preferredCommunication"),
                value: t(`auth.preferredCommunication.${baseProfile.preferred_communication}` as "auth.preferredCommunication.wechat" | "auth.preferredCommunication.email"),
              }]
            : []),
          ...roleDetails,
        ]);
        setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [person, t, lang, showAdministrativeFields]);

  if (!person) {
    return <p className="text-sm text-muted-foreground">{t("admin.selectPersonPrompt")}</p>;
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  }

  if (error) {
    return <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>;
  }

  return (
    <div>
      <div className="divide-y divide-border border-y border-border">
        {details.map((detail) => (
          <div key={detail.label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <p className="text-xs text-muted-foreground">{detail.label}</p>
            <p className="whitespace-pre-wrap break-words text-sm text-card-foreground">{detail.value}</p>
          </div>
        ))}
      </div>
      {person.role === "student" && (
        <p className="mt-4 text-sm text-muted-foreground">
          {t("speakingSamples.profileLinkLabel")}: {" "}
          <Link
            href={`/speaking-samples/${person.uid}`}
            className="break-all text-primary hover:underline"
          >
            peerbridges.org/speaking-samples/{person.uid}
          </Link>
        </p>
      )}
    </div>
  );
}
