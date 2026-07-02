"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Search, Users } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";

type ContactRole = "student" | "tutor" | "admin";
type ContactMode = "wechat" | "email";

type Contact = {
  uid: string;
  role: ContactRole;
  name: string;
  email: string;
  wechat_id: string;
};

export function CommunicationsPage({
  viewerRole,
}: {
  viewerRole: ContactRole;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ContactMode>("wechat");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<ContactRole | "all">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isAdmin = viewerRole === "admin";
  const allowedRoles = useMemo<ContactRole[]>(() => {
    if (viewerRole === "student") return ["tutor", "admin"];
    if (viewerRole === "tutor") return ["student", "admin"];
    return ["student", "tutor", "admin"];
  }, [viewerRole]);

  const helpKey =
    viewerRole === "student"
      ? "communications.studentHelp"
      : viewerRole === "tutor"
        ? "communications.tutorHelp"
        : "communications.adminHelp";

  const roleLabels: Record<ContactRole, string> = {
    student: t("common.student"),
    tutor: t("common.teacher"),
    admin: t("communications.administrator"),
  };

  useEffect(() => {
    let cancelled = false;

    async function loadContacts() {
      setLoading(true);
      setError("");

      const { data, error: contactsError } = await supabase.rpc("get_allowed_contacts");

      if (contactsError) {
        console.error("get_allowed_contacts failed", contactsError);
        if (!cancelled) {
          setError(contactsError.message);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        setContacts(
          ((data ?? []) as Contact[])
            .filter((contact) => allowedRoles.includes(contact.role))
            .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name)),
        );
        setSelectedUids([]);
        setLoading(false);
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [allowedRoles]);

  const selectedContacts = contacts.filter((contact) => selectedUids.includes(contact.uid));
  const selectedValues = selectedContacts.map((contact) => (mode === "wechat" ? contact.wechat_id : contact.email));
  const mailtoHref = `mailto:${selectedContacts.map((contact) => contact.email).join(",")}`;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredContacts = contacts.filter((contact) => {
    const matchesRole = roleFilter === "all" || contact.role === roleFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      contact.name.toLowerCase().includes(normalizedQuery) ||
      contact.email.toLowerCase().includes(normalizedQuery) ||
      contact.wechat_id.toLowerCase().includes(normalizedQuery);

    return matchesRole && matchesQuery;
  });

  function toggleContact(uid: string) {
    setSelectedUids((current) =>
      current.includes(uid) ? current.filter((selectedUid) => selectedUid !== uid) : [...current, uid]
    );
  }

  function selectRole(role: ContactRole) {
    setSelectedUids(contacts.filter((contact) => contact.role === role).map((contact) => contact.uid));
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-foreground">{t("communications.title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(helpKey)}</p>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setMode("wechat")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              mode === "wechat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <MessageCircle size={15} />
            {t("communications.wechat")}
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              mode === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <Mail size={15} />
            {t("communications.email")}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid min-h-[28rem] min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm text-card-foreground">
                {isAdmin ? t("communications.selectContacts") : t("communications.selectContact")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedUids.length} {t("common.selected")}
              </p>
            </div>

            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selectRole("student")}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-card-foreground transition-colors hover:bg-accent"
                >
                  {t("communications.selectAllStudents")}
                </button>
                <button
                  type="button"
                  onClick={() => selectRole("tutor")}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-card-foreground transition-colors hover:bg-accent"
                >
                  {t("communications.selectAllTutors")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUids([])}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent"
                >
                  {t("communications.clearSelection")}
                </button>
              </div>
            )}
          </div>

          <div className="mb-3 flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative xl:max-w-sm xl:flex-1">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("communications.search")}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {(["all", ...allowedRoles] as Array<ContactRole | "all">).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    roleFilter === role
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-card-foreground"
                  }`}
                >
                  {role === "all" ? t("communications.all") : roleLabels[role]}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              {t("communications.loading")}
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              <Users size={28} className="opacity-40" />
              {t("communications.empty")}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              <Users size={28} className="opacity-40" />
              {t("communications.noMatches")}
            </div>
          ) : (
            <div className="min-h-0 overflow-hidden rounded-xl border border-border">
              <div className="min-w-0">
                <div className="hidden grid-cols-[2.2rem_minmax(8rem,1fr)_7rem_minmax(11rem,1.2fr)] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground md:grid">
                  <span />
                  <span>{t("common.name")}</span>
                  <span>{t("common.type")}</span>
                  <span>{mode === "wechat" ? t("auth.wechatId") : t("auth.email")}</span>
                </div>
                <div className="max-h-[26rem] overflow-y-auto">
                {filteredContacts.map((contact) => {
                  const selected = selectedUids.includes(contact.uid);

                  return (
                    <button
                      key={contact.uid}
                      type="button"
                      onClick={() => toggleContact(contact.uid)}
                      className={`grid w-full grid-cols-[2.2rem_minmax(0,1fr)] items-center gap-3 border-b border-border px-3 py-3 text-left text-sm transition-colors last:border-b-0 md:grid-cols-[2.2rem_minmax(8rem,1fr)_7rem_minmax(11rem,1.2fr)] md:py-2.5 ${
                        selected
                          ? "bg-primary/10"
                          : "bg-background hover:bg-accent"
                      }`}
                    >
                      <span
                        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${
                          selected ? "border-primary bg-primary" : "border-border"
                        }`}
                      >
                        {selected && <span className="h-2 w-2 rounded-full bg-primary-foreground" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-card-foreground">{contact.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground md:hidden">
                          {roleLabels[contact.role]} · {mode === "wechat" ? contact.wechat_id : contact.email}
                        </span>
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">{roleLabels[contact.role]}</span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">
                        {mode === "wechat" ? contact.wechat_id : contact.email}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4">
          <div className="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <h3 className="text-sm text-card-foreground">
                {mode === "wechat" ? t("communications.selectedWechatIds") : t("communications.selectedEmails")}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {selectedUids.length} {t("common.selected")}
              </p>
            </div>
            {mode === "email" && (
              <a
                href={mailtoHref}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors sm:shrink-0 ${
                  selectedContacts.length > 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "pointer-events-none bg-muted text-muted-foreground"
                }`}
              >
                <Mail size={14} />
                {t("communications.openEmail")}
              </a>
            )}
          </div>

          {selectedValues.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              {t("communications.noSelection")}
            </div>
          ) : (
            <div className="flex max-h-[30rem] flex-col gap-2 overflow-y-auto">
              {selectedContacts.map((contact) => (
                <div key={contact.uid} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">{contact.name}</p>
                  <p className="mt-1 break-all text-sm text-card-foreground">
                    {mode === "wechat" ? contact.wechat_id : contact.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
