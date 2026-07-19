"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, UserCheck, UserX, X } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { countryLabelForValue } from "../data/countries";
import { useLanguage, type TranslationKey } from "../i18n";

type PendingProfile = {
  uid: string;
  role: "student" | "tutor";
  name: string;
  email: string;
  created_at: string;
  student_wechat_id: string | null;
  parent_wechat_id: string | null;
  student_email: string | null;
  parent_email: string | null;
  communication_recipient: "student" | "parent" | "both" | null;
  preferred_communication: "wechat" | "email" | null;
  notification_method: "wechat" | "email" | "phone" | null;
};

type RoleDetails = Record<string, unknown> & { uid: string };

function recipientLabel(value: PendingProfile["communication_recipient"], role: PendingProfile["role"], t: ReturnType<typeof useLanguage>["t"]) {
  if (!value) return "—";
  if (value === "both") return t(role === "tutor" ? "auth.communicationRecipient.tutorAndParent" : "auth.communicationRecipient.studentAndParent");
  if (value === "student" && role === "tutor") return t("auth.communicationRecipient.tutor");
  return t(`auth.communicationRecipient.${value}` as TranslationKey);
}

function readableLabel(key: string) {
  return key.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function ApproveNewUsersPage() {
  const { lang, t } = useLanguage();
  const [profiles, setProfiles] = useState<PendingProfile[]>([]);
  const [roleDetails, setRoleDetails] = useState<Map<string, RoleDetails>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decision, setDecision] = useState<{ profile: PendingProfile; approved: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPendingProfiles() {
      setLoading(true);
      setError("");
      const [profilesResult, studentsResult, tutorsResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("uid, role, name, email, created_at, student_wechat_id, parent_wechat_id, student_email, parent_email, communication_recipient, preferred_communication, notification_method")
          .in("role", ["student", "tutor"])
          .is("approved", null)
          .order("created_at", { ascending: true }),
        supabase.from("student_profiles").select("*"),
        supabase.from("tutor_profiles").select("*"),
      ]);

      if (cancelled) return;
      const firstError = profilesResult.error ?? studentsResult.error ?? tutorsResult.error;
      if (firstError) {
        setError(firstError.message);
        setLoading(false);
        return;
      }

      const details = new Map<string, RoleDetails>();
      [...(studentsResult.data ?? []), ...(tutorsResult.data ?? [])].forEach((row) => {
        const typedRow = row as RoleDetails;
        details.set(typedRow.uid, typedRow);
      });
      setProfiles((profilesResult.data ?? []) as PendingProfile[]);
      setRoleDetails(details);
      setLoading(false);
    }

    void loadPendingProfiles();
    return () => { cancelled = true; };
  }, []);

  async function confirmDecision() {
    if (!decision) return;
    setSaving(true);
    setError("");
    const { error: approvalError } = await supabase.rpc("admin_set_profile_approval", {
      p_user_uid: decision.profile.uid,
      p_approved: decision.approved,
    });
    if (approvalError) {
      setError(approvalError.message);
      setSaving(false);
      return;
    }
    setProfiles((current) => current.filter((profile) => profile.uid !== decision.profile.uid));
    setDecision(null);
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-foreground">{t("admin.approveNewUsers")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("admin.approveNewUsersHelp")}</p>
      </div>

      {error && <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : profiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto text-primary" size={32} />
          <p className="mt-3 text-card-foreground">{t("admin.noPendingUsers")}</p>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {profiles.map((profile) => {
            const details = roleDetails.get(profile.uid);
            const hiddenFields = new Set(["uid", "class_link", "meeting_password", "referrer", "trial_teacher", "how_found_out"]);
            const extraDetails = Object.entries(details ?? {}).filter(([key, value]) => !hiddenFields.has(key) && value !== null && value !== "");
            return (
              <article key={profile.uid} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-card-foreground">{profile.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t(profile.role === "student" ? "common.student" : "common.tutor")}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs text-amber-800">{t("admin.awaitingApproval")}</span>
                </div>

                <dl className="mt-4 divide-y divide-border border-y border-border text-sm">
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("admin.loginEmail")}</dt><dd className="break-all text-card-foreground">{profile.email}</dd></div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("admin.registeredAt")}</dt><dd className="text-card-foreground">{new Date(profile.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium", timeStyle: "short" })}</dd></div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("auth.communicationRecipient")}</dt><dd className="text-card-foreground">{recipientLabel(profile.communication_recipient, profile.role, t)}</dd></div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("auth.preferredCommunication")}</dt><dd className="text-card-foreground">{profile.preferred_communication ? t(`auth.preferredCommunication.${profile.preferred_communication}` as TranslationKey) : "—"}</dd></div>
                  <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("auth.notificationMethod")}</dt><dd className="text-card-foreground">{profile.notification_method ? t(`auth.notificationMethod.${profile.notification_method}` as TranslationKey) : "—"}</dd></div>
                  {profile.student_wechat_id && <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t(profile.role === "tutor" ? "auth.tutorWechatId" : "auth.studentWechatId")}</dt><dd className="break-all text-card-foreground">{profile.student_wechat_id}</dd></div>}
                  {profile.parent_wechat_id && <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("auth.parentWechatId")}</dt><dd className="break-all text-card-foreground">{profile.parent_wechat_id}</dd></div>}
                  {profile.student_email && <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t(profile.role === "tutor" ? "auth.tutorCommunicationEmail" : "auth.studentCommunicationEmail")}</dt><dd className="break-all text-card-foreground">{profile.student_email}</dd></div>}
                  {profile.parent_email && <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]"><dt className="text-xs text-muted-foreground">{t("auth.parentCommunicationEmail")}</dt><dd className="break-all text-card-foreground">{profile.parent_email}</dd></div>}
                  {extraDetails.map(([key, value]) => (
                    <div key={key} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                      <dt className="text-xs text-muted-foreground">{key === "introduction" ? t(profile.role === "student" ? "auth.studentIntroduction" : "auth.tutorIntroduction") : readableLabel(key)}</dt>
                      <dd className="whitespace-pre-wrap break-words text-card-foreground">{key === "country" ? countryLabelForValue(String(value), lang) : String(value)}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setDecision({ profile, approved: false })} className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 px-4 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10">
                    <UserX size={16} /> {t("admin.rejectUser")}
                  </button>
                  <button type="button" onClick={() => setDecision({ profile, approved: true })} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90">
                    <UserCheck size={16} /> {t("admin.approveUser")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Dialog.Root open={Boolean(decision)} onOpenChange={(open) => { if (!open && !saving) setDecision(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Dialog.Title className="text-lg text-card-foreground">{t(decision?.approved ? "admin.confirmApprovalTitle" : "admin.confirmRejectionTitle")}</Dialog.Title>
                <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {decision?.approved
                    ? t("admin.confirmWechatAdded", { name: decision.profile.name })
                    : t("admin.confirmRejectUser", { name: decision?.profile.name ?? "" })}
                </Dialog.Description>
              </div>
              <Dialog.Close disabled={saving} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"><X size={16} /></Dialog.Close>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Dialog.Close disabled={saving} className="rounded-xl border border-border px-4 py-2 text-sm text-card-foreground hover:bg-accent disabled:opacity-50">{t("common.cancel")}</Dialog.Close>
              <button type="button" disabled={saving} onClick={() => void confirmDecision()} className={`rounded-xl px-4 py-2 text-sm disabled:opacity-50 ${decision?.approved ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                {saving ? t("common.loading") : t(decision?.approved ? "admin.approveUser" : "admin.rejectUser")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
