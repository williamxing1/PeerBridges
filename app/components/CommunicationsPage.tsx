"use client";

import { useEffect, useMemo, useState } from "react";
import { Mail, MessageCircle, Search, Users } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";

type ContactRole = "student" | "tutor" | "admin";
type ContactMode = "wechat" | "email";
type ContactWho = "student" | "parent" | "administrator";

type Contact = {
  uid: string;
  role: ContactRole;
  name: string;
  student_wechat_id: string | null;
  parent_wechat_id: string | null;
  student_email: string | null;
  parent_email: string | null;
  preferred_communication: ContactMode | null;
};

type ContactEntry = {
  key: string;
  uid: string;
  role: ContactRole;
  name: string;
  who: ContactWho;
  value: string;
  isPrimary: boolean;
};

function contactEntries(contact: Contact, mode: ContactMode): ContactEntry[] {
  const entries: ContactEntry[] = [];
  const studentValue = mode === "wechat" ? contact.student_wechat_id : contact.student_email;
  const parentValue = mode === "wechat" ? contact.parent_wechat_id : contact.parent_email;

  if (studentValue?.trim()) {
    entries.push({
      key: `${contact.uid}:${mode}:student`,
      uid: contact.uid,
      role: contact.role,
      name: contact.name,
      who: contact.role === "admin" ? "administrator" : "student",
      value: studentValue.trim(),
      isPrimary: contact.role === "admin" || contact.preferred_communication === mode,
    });
  }
  if (contact.role !== "admin" && parentValue?.trim()) {
    entries.push({
      key: `${contact.uid}:${mode}:parent`,
      uid: contact.uid,
      role: contact.role,
      name: contact.name,
      who: "parent",
      value: parentValue.trim(),
      isPrimary: contact.preferred_communication === mode,
    });
  }

  return entries;
}

export function CommunicationsPage({
  viewerRole,
}: {
  viewerRole: ContactRole;
}) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<ContactMode>("wechat");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
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
  function contactTypeLabel(entry: ContactEntry) {
    if (entry.role === "admin") return t("communications.administrator");
    if (entry.role === "tutor") {
      return entry.who === "parent"
        ? t("communications.teacherParentContact")
        : t("common.teacher");
    }
    return entry.who === "parent"
      ? t("communications.studentParentContact")
      : t("communications.studentContact");
  }

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
        setSelectedKeys([]);
        setLoading(false);
      }
    }

    void loadContacts();

    return () => {
      cancelled = true;
    };
  }, [allowedRoles]);

  const entries = contacts.flatMap((contact) => contactEntries(contact, mode));
  const selectedEntries = entries.filter((entry) => selectedKeys.includes(entry.key));
  const selectedValues = selectedEntries.map((entry) => entry.value);
  const mailtoHref = `mailto:${selectedEntries.map((entry) => entry.value).join(",")}`;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredEntries = entries.filter((entry) => {
    const matchesRole = roleFilter === "all" || entry.role === roleFilter;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      entry.name.toLowerCase().includes(normalizedQuery) ||
      entry.value.toLowerCase().includes(normalizedQuery) ||
      contactTypeLabel(entry).toLowerCase().includes(normalizedQuery);

    return matchesRole && matchesQuery;
  });

  function toggleContact(key: string) {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((selectedKey) => selectedKey !== key) : [...current, key]
    );
  }

  function selectRole(role: ContactRole) {
    setSelectedKeys(entries.filter((entry) => entry.role === role).map((entry) => entry.key));
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-foreground">{t("communications.title")}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{t(helpKey)}</p>
          <p className="mt-2 text-sm font-medium text-card-foreground">
            {t("communications.preferredMethodNote")}
          </p>
        </div>

        <div className="inline-flex rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => {
              setMode("wechat");
              setSelectedKeys([]);
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
              mode === "wechat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            <MessageCircle size={15} />
            {t("communications.wechat")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("email");
              setSelectedKeys([]);
            }}
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
                {selectedKeys.length} {t("common.selected")}
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
                  onClick={() => setSelectedKeys([])}
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
          ) : entries.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              <Users size={28} className="opacity-40" />
              {t("communications.empty")}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex min-h-60 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
              <Users size={28} className="opacity-40" />
              {t("communications.noMatches")}
            </div>
          ) : (
            <div className="min-h-0 overflow-hidden rounded-xl border border-border">
              <div className="min-w-0">
                <div className="hidden grid-cols-[2.2rem_minmax(7rem,1fr)_8.5rem_minmax(9rem,1.1fr)_5.5rem] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground md:grid">
                  <span />
                  <span>{t("common.name")}</span>
                  <span>{t("common.type")}</span>
                  <span>{mode === "wechat" ? t("auth.wechatId") : t("auth.email")}</span>
                  <span>{t("communications.isPrimary")}</span>
                </div>
                <div className="max-h-[26rem] overflow-y-auto">
                {filteredEntries.map((entry) => {
                  const selected = selectedKeys.includes(entry.key);

                  return (
                    <button
                      key={entry.key}
                      type="button"
                      onClick={() => toggleContact(entry.key)}
                      className={`grid w-full grid-cols-[2.2rem_minmax(0,1fr)] items-center gap-3 border-b border-border px-3 py-3 text-left text-sm transition-colors last:border-b-0 md:grid-cols-[2.2rem_minmax(7rem,1fr)_8.5rem_minmax(9rem,1.1fr)_5.5rem] md:py-2.5 ${
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
                        <span className="block truncate text-card-foreground">{entry.name}</span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground md:hidden">
                          {contactTypeLabel(entry)} · {entry.value} · {entry.isPrimary ? t("communications.preferred") : t("communications.notPreferred")}
                        </span>
                      </span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">{contactTypeLabel(entry)}</span>
                      <span className="hidden truncate text-xs text-muted-foreground md:block">
                        {entry.value}
                      </span>
                      <span className={`hidden truncate text-xs md:block ${entry.isPrimary ? "font-medium text-emerald-700" : "text-muted-foreground"}`}>
                        {entry.isPrimary ? t("communications.yes") : t("communications.no")}
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
                {selectedKeys.length} {t("common.selected")}
              </p>
            </div>
            {mode === "email" && (
              <a
                href={mailtoHref}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors sm:shrink-0 ${
                  selectedEntries.length > 0
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
              {selectedEntries.map((entry) => (
                <div key={entry.key} className="rounded-xl border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">
                    {entry.name} · {contactTypeLabel(entry)}
                  </p>
                  <p className="mt-1 break-all text-sm text-card-foreground">
                    {mode === "wechat"
                      ? t("communications.wechatIdValue", { value: entry.value })
                      : entry.value}
                  </p>
                  <p className={`mt-1 text-xs ${entry.isPrimary ? "font-medium text-emerald-700" : "text-muted-foreground"}`}>
                    {entry.isPrimary ? t("communications.preferred") : t("communications.notPreferred")}
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
