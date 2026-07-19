"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import * as Select from "@radix-ui/react-select";
import { BookOpen, Check, ChevronDown, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase/client";
import { countryOptionsForLang } from "./data/countries";
import { isValidMeetingPassword, normalizeVoovMeetingUrl } from "./lib/tutorMeeting";
import { LanguageSelect, optionLabel, useLanguage, type Lang, type TranslationKey } from "./i18n";

type Mode = "login" | "register";
type Role = "student" | "tutor" | "administrator";
type CommunicationRecipient = "student" | "parent" | "both";
type PreferredCommunication = "wechat" | "email";
type NotificationMethod = "wechat" | "email" | "phone";
type PendingRegistration = {
  role: "student" | "tutor";
  name: string;
  email: string;
  details: Record<string, string>;
};
type StoredUser = {
  uid: string;
  role: Role | "admin";
  name: string;
  email: string;
  country?: string;
  grade?: string;
  referrer?: string;
  trialTeacher?: string;
  school?: string;
  classLink?: string;
  classPassword?: string;
  howFoundOut?: string;
};

const storedUserKey = "tutorflow-user";
const savedLoginCredentialsKey = "peerbridges-saved-login";

const roleOptions: Array<{ id: Role; labelKey: TranslationKey }> = [
  { id: "student", labelKey: "role.student" },
  { id: "tutor", labelKey: "role.tutor" },
  { id: "administrator", labelKey: "role.administrator" }
];

const registerRoleOptions = roleOptions.filter((option) => option.id !== "administrator");

const teachers = ["杨老师"];
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];

function isAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already registered") || normalized.includes("already exists");
}

function isDuplicateEmailError(error: { code?: string; message: string }) {
  return error.code === "23505" || isAlreadyRegisteredError(error.message);
}

function isEmailNotConfirmedError(message: string) {
  return message.toLowerCase().includes("email not confirmed");
}

function isPendingRegistration(value: unknown): value is PendingRegistration {
  if (!value || typeof value !== "object") return false;
  const registration = value as Partial<PendingRegistration>;
  return (
    (registration.role === "student" || registration.role === "tutor") &&
    typeof registration.name === "string" &&
    typeof registration.email === "string" &&
    Boolean(registration.details) &&
    typeof registration.details === "object"
  );
}

function Field({
  label,
  type = "text",
  placeholder,
  minLength,
  maxLength,
  inputMode,
  pattern,
  required = true,
  showRequiredNote = true,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  inputMode?: "email" | "numeric" | "search" | "tel" | "text" | "url";
  pattern?: string;
  required?: boolean;
  showRequiredNote?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = type === "password";

  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">
        {label}{required && showRequiredNote ? ` (${t("common.required")})` : ""}
      </span>
      <span className="relative mt-2 block">
        <input
          required={required}
          type={isPassword && passwordVisible ? "text" : type}
          placeholder={placeholder}
          minLength={minLength}
          maxLength={maxLength}
          inputMode={inputMode}
          pattern={pattern}
          className={`h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card ${isPassword ? "pr-11" : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={t(passwordVisible ? "common.hidePassword" : "common.showPassword")}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-card-foreground"
          >
            {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </span>
    </label>
  );
}

function TextAreaField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-card-foreground">
        {label} ({t("common.required")})
      </span>
      <textarea
        required
        rows={5}
        maxLength={1000}
        placeholder={placeholder}
        className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="mt-1 block text-right text-xs text-muted-foreground">
        {value.length} / 1000
      </span>
    </label>
  );
}

function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  required = true,
  getOptionLabel = (option) => option,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  getOptionLabel?: (option: string) => string;
}) {
  const { t } = useLanguage();

  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">
        {label}{required ? ` (${t("common.required")})` : ""}
      </span>
      <Select.Root required={required} value={value} onValueChange={onChange}>
        <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown size={16} className="text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{getOptionLabel(option)}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} className="text-primary" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function CountrySelect({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">
        {label} ({t("common.required")})
      </span>
      <Select.Root required value={value} onValueChange={onChange}>
        <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
          <Select.Value placeholder={placeholder} />
          <Select.Icon>
            <ChevronDown size={16} className="text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="z-50 max-h-72 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{option.label}</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} className="text-primary" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </label>
  );
}

function RoleTabs({
  options,
  role,
  setRole,
  t,
}: {
  options: Array<{ id: Role; labelKey: TranslationKey }>;
  role: Role;
  setRole: (role: Role) => void;
  t: (key: TranslationKey) => string;
}) {
  return (
    <div className="flex w-full flex-wrap gap-1 rounded-xl bg-muted p-1 sm:w-fit">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setRole(option.id)}
          className={`min-w-0 flex-1 rounded-lg px-4 py-1.5 text-sm transition-all sm:flex-none ${
            role === option.id ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          {t(option.labelKey)}
        </button>
      ))}
    </div>
  );
}

type LoginFieldsProps = {
  lang: Lang;
  t: (key: TranslationKey) => string;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  saveCredentials?: boolean;
  setSaveCredentials?: (value: boolean) => void;
};

type RegisterFieldsProps = LoginFieldsProps & {
  role: Role;
  name: string;
  setName: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  communicationRecipient: CommunicationRecipient | "";
  setCommunicationRecipient: (value: CommunicationRecipient) => void;
  studentWechatId: string;
  setStudentWechatId: (value: string) => void;
  parentWechatId: string;
  setParentWechatId: (value: string) => void;
  studentCommunicationEmail: string;
  setStudentCommunicationEmail: (value: string) => void;
  parentCommunicationEmail: string;
  setParentCommunicationEmail: (value: string) => void;
  preferredCommunication: PreferredCommunication | "";
  setPreferredCommunication: (value: PreferredCommunication) => void;
  notificationMethod: NotificationMethod | "";
  setNotificationMethod: (value: NotificationMethod) => void;
  country: string;
  setCountry: (value: string) => void;
  countryOptions: Array<{ value: string; label: string }>;
  grade: string;
  setGrade: (value: string) => void;
  referrer: string;
  setReferrer: (value: string) => void;
  trialTeacher: string;
  setTrialTeacher: (value: string) => void;
  studentIntroduction: string;
  setStudentIntroduction: (value: string) => void;
  school: string;
  setSchool: (value: string) => void;
  classLink: string;
  setClassLink: (value: string) => void;
  classPassword: string;
  setClassPassword: (value: string) => void;
  howFoundOut: string;
  setHowFoundOut: (value: string) => void;
  tutorIntroduction: string;
  setTutorIntroduction: (value: string) => void;
};

function LoginFields({ t, email, setEmail, password, setPassword, saveCredentials = false, setSaveCredentials }: LoginFieldsProps) {
  return (
    <div className="grid gap-4">
      <Field label={t("auth.email")} type="email" placeholder={t("auth.emailPlaceholder")} showRequiredNote={false} value={email} onChange={setEmail} />
      <div>
        <Field label={t("auth.password")} type="password" placeholder={t("auth.enterPassword")} minLength={6} showRequiredNote={false} value={password} onChange={setPassword} />
        <Link
          href="/forgot-password"
          className="mt-2 block w-fit text-sm text-primary transition-colors hover:text-primary/80"
        >
          {t("auth.forgotPassword")}
        </Link>
      </div>
      {setSaveCredentials && (
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-card-foreground">
          <input
            type="checkbox"
            checked={saveCredentials}
            onChange={(event) => setSaveCredentials(event.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <span>{t("auth.saveLoginCredentials")}</span>
        </label>
      )}
    </div>
  );
}

function RegisterFields({
  role,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  communicationRecipient,
  setCommunicationRecipient,
  studentWechatId,
  setStudentWechatId,
  parentWechatId,
  setParentWechatId,
  studentCommunicationEmail,
  setStudentCommunicationEmail,
  parentCommunicationEmail,
  setParentCommunicationEmail,
  preferredCommunication,
  setPreferredCommunication,
  notificationMethod,
  setNotificationMethod,
  country,
  setCountry,
  countryOptions,
  grade,
  setGrade,
  referrer,
  setReferrer,
  trialTeacher,
  setTrialTeacher,
  studentIntroduction,
  setStudentIntroduction,
  school,
  setSchool,
  classLink,
  setClassLink,
  classPassword,
  setClassPassword,
  howFoundOut,
  setHowFoundOut,
  tutorIntroduction,
  setTutorIntroduction,
  lang,
  t,
}: RegisterFieldsProps) {
  const labelOption = (option: string) => optionLabel(option, lang);
  const showStudentContact = communicationRecipient === "student" || communicationRecipient === "both";
  const showParentContact = communicationRecipient === "parent" || communicationRecipient === "both";
  const communicationFields = (
    <section className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 md:col-span-2 md:grid-cols-2">
      <div className="md:col-span-2">
        <h3 className="text-sm font-medium text-card-foreground">{t("auth.communicationSection")}</h3>
      </div>
      <div className="md:col-span-2">
        <SelectField
          label={t("auth.communicationRecipient")}
          placeholder={t("auth.selectCommunicationRecipient")}
          options={["student", "parent", "both"]}
          value={communicationRecipient}
          onChange={(value) => setCommunicationRecipient(value as CommunicationRecipient)}
          getOptionLabel={(option) =>
            option === "student" && role === "tutor"
              ? t("auth.communicationRecipient.tutor")
              : t(`auth.communicationRecipient.${option}` as TranslationKey)
          }
        />
      </div>
      {showStudentContact && (
        <>
          <Field label={t(role === "tutor" ? "auth.tutorWechatId" : "auth.studentWechatId")} value={studentWechatId} onChange={setStudentWechatId} />
          <Field label={t(role === "tutor" ? "auth.tutorCommunicationEmail" : "auth.studentCommunicationEmail")} type="email" value={studentCommunicationEmail} onChange={setStudentCommunicationEmail} />
        </>
      )}
      {showParentContact && (
        <>
          <Field label={t("auth.parentWechatId")} value={parentWechatId} onChange={setParentWechatId} />
          <Field label={t("auth.parentCommunicationEmail")} type="email" value={parentCommunicationEmail} onChange={setParentCommunicationEmail} />
        </>
      )}
      <SelectField
        label={t("auth.preferredCommunication")}
        placeholder={t("auth.selectPreferredCommunication")}
        options={["wechat", "email"]}
        value={preferredCommunication}
        onChange={(value) => setPreferredCommunication(value as PreferredCommunication)}
        getOptionLabel={(option) => t(`auth.preferredCommunication.${option}` as TranslationKey)}
      />
      <SelectField
        label={t("auth.notificationMethod")}
        placeholder={t("auth.selectNotificationMethod")}
        options={["wechat", "email", "phone"]}
        value={notificationMethod}
        onChange={(value) => setNotificationMethod(value as NotificationMethod)}
        getOptionLabel={(option) => t(`auth.notificationMethod.${option}` as TranslationKey)}
      />
      {notificationMethod === "phone" && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-3 text-sm text-amber-900 md:col-span-2">
          {t("auth.phoneNotificationWarning")}
        </p>
      )}
    </section>
  );

  if (role === "student") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("auth.name")} placeholder={t("auth.studentName")} value={name} onChange={setName} />
        <Field label={t("auth.email")} type="email" placeholder={t("auth.studentEmailPlaceholder")} value={email} onChange={setEmail} />
        <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
        <Field label={t("auth.confirmPassword")} type="password" placeholder={t("auth.confirmPasswordPlaceholder")} minLength={6} value={confirmPassword} onChange={setConfirmPassword} />
        <CountrySelect label={t("auth.country")} placeholder={t("auth.countryPlaceholder")} options={countryOptions} value={country} onChange={setCountry} />
        <SelectField label={t("auth.grade")} placeholder={t("auth.selectGrade")} options={gradeOptions} value={grade} onChange={setGrade} getOptionLabel={labelOption} />
        <Field label={`${t("auth.referrer")} (${t("common.optional")})`} placeholder={t("auth.referrerPlaceholder")} required={false} value={referrer} onChange={setReferrer} />
        <SelectField label={`${t("auth.trialTeacher")} (${t("common.optional")})`} placeholder={t("auth.selectRecruitingTeacher")} options={teachers} required={false} value={trialTeacher} onChange={setTrialTeacher} />
        <TextAreaField
          label={t("auth.studentIntroduction")}
          placeholder={t("auth.studentIntroductionPlaceholder")}
          value={studentIntroduction}
          onChange={setStudentIntroduction}
        />
        {communicationFields}
      </div>
    );
  }

  if (role === "tutor") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("auth.name")} placeholder={t("auth.tutorName")} value={name} onChange={setName} />
        <Field label={t("auth.email")} type="email" placeholder={t("auth.tutorEmailPlaceholder")} value={email} onChange={setEmail} />
        <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
        <Field label={t("auth.confirmPassword")} type="password" placeholder={t("auth.confirmPasswordPlaceholder")} minLength={6} value={confirmPassword} onChange={setConfirmPassword} />
        <Field label={t("auth.school")} placeholder={t("auth.schoolName")} value={school} onChange={setSchool} />
        <SelectField label={t("auth.grade")} placeholder={t("auth.selectYourGrade")} options={gradeOptions} value={grade} onChange={setGrade} getOptionLabel={labelOption} />
        <Field label={t("auth.classLink")} type="url" placeholder={t("auth.videoClassLink")} value={classLink} onChange={setClassLink} />
        <Field label={t("auth.classPassword")} type="password" placeholder={t("auth.classroomPassword")} minLength={4} maxLength={6} inputMode="numeric" pattern="[0-9]{4,6}" value={classPassword} onChange={(value) => setClassPassword(value.replace(/\D/g, "").slice(0, 6))} />
        <Field label={`${t("auth.howFoundOut")} (${t("common.optional")})`} placeholder={t("auth.howFoundOutPlaceholder")} required={false} value={howFoundOut} onChange={setHowFoundOut} />
        <TextAreaField
          label={t("auth.tutorIntroduction")}
          placeholder={t("auth.tutorIntroductionPlaceholder")}
          value={tutorIntroduction}
          onChange={setTutorIntroduction}
        />
        {communicationFields}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t("auth.name")} placeholder={t("auth.administratorName")} value={name} onChange={setName} />
      <Field label={t("auth.email")} type="email" placeholder={t("auth.adminEmailPlaceholder")} value={email} onChange={setEmail} />
      <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
    </div>
  );
}

function AuthPageContent() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [saveLoginCredentials, setSaveLoginCredentials] = useState(false);
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmRegisterPassword, setConfirmRegisterPassword] = useState("");
  const [communicationRecipient, setCommunicationRecipient] = useState<CommunicationRecipient | "">("");
  const [studentWechatId, setStudentWechatId] = useState("");
  const [parentWechatId, setParentWechatId] = useState("");
  const [studentCommunicationEmail, setStudentCommunicationEmail] = useState("");
  const [parentCommunicationEmail, setParentCommunicationEmail] = useState("");
  const [preferredCommunication, setPreferredCommunication] = useState<PreferredCommunication | "">("");
  const [notificationMethod, setNotificationMethod] = useState<NotificationMethod | "">("");

  const [country, setCountry] = useState("");
  const [grade, setGrade] = useState("");
  const [referrer, setReferrer] = useState("");
  const [trialTeacher, setTrialTeacher] = useState("");
  const [studentIntroduction, setStudentIntroduction] = useState("");

  const [school, setSchool] = useState("");
  const [classLink, setClassLink] = useState("");
  const [classPassword, setClassPassword] = useState("");
  const [howFoundOut, setHowFoundOut] = useState("");
  const [tutorIntroduction, setTutorIntroduction] = useState("");

  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("student");
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";
  const accountStatus = searchParams.get("accountStatus");
  const titleRoleKey = roleOptions.find((option) => option.id === role)?.labelKey;
  const titleRole = titleRoleKey ? t(titleRoleKey) : "";
  const countryOptions = useMemo(() => countryOptionsForLang(lang), [lang]);

  function handleModeChange(nextMode: Mode) {
    setMode(nextMode);
    if (nextMode === "register" && role === "administrator") {
      setRole("student");
    }
  }

  function getDashboardPath(nextRole: Role) {
    if (nextRole === "student") return "/student-dashboard";
    if (nextRole === "tutor") return "/tutor-dashboard";
    return "/admin-dashboard";
  }

  function normalizeRole(nextRole: Role | "admin") {
    return nextRole === "administrator" ? "admin" : nextRole;
  }

  function roleCanVisitPath(nextRole: Role | "admin", path: string) {
    const normalizedRole = normalizeRole(nextRole);
    if (normalizedRole === "student") {
      return path === "/student-dashboard"
        || path === "/student-schedule"
        || path === "/student-materials"
        || path === "/student-communications"
        || path === "/speaking-samples"
        || path.startsWith("/speaking-samples/");
    }
    if (normalizedRole === "tutor") {
      return (
        path === "/tutor-dashboard" ||
        path === "/view-students" ||
        path.startsWith("/view-students/") ||
        path === "/tutor-schedule" ||
        path === "/volunteer-record" ||
        path === "/training-materials" ||
        path === "/volunteer-awards" ||
        path === "/tutor-communications" ||
        path.startsWith("/speaking-samples/") ||
        path.startsWith("/evaluations/")
      );
    }
    return path === "/admin-dashboard"
      || path === "/admin-individual-query"
      || path === "/approve-new-users"
      || path === "/admin-media"
      || path === "/admin-communications"
      || path.startsWith("/speaking-samples/");
  }

  function getPostAuthPath(nextRole: Role | "admin") {
    if (redirectTo) {
      try {
        const parsed = new URL(redirectTo, window.location.origin);
        const target = `${parsed.pathname}${parsed.search}${parsed.hash}`;
        if (parsed.origin === window.location.origin && roleCanVisitPath(nextRole, parsed.pathname)) {
          return target;
        }
      } catch {
        // Fall back to the role dashboard below.
      }
    }

    const normalizedRole = normalizeRole(nextRole);
    if (normalizedRole === "student") return "/student-dashboard";
    if (normalizedRole === "tutor") return "/tutor-dashboard";
    return "/admin-dashboard";
  }

  function storeUser(user: StoredUser) {
    const serialized = JSON.stringify(user);
    sessionStorage.setItem(storedUserKey, serialized);
    localStorage.setItem(storedUserKey, serialized);
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(savedLoginCredentialsKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { email?: unknown; password?: unknown };
      if (typeof parsed.email === "string") setLoginEmail(parsed.email);
      if (typeof parsed.password === "string") setLoginPassword(parsed.password);
      setSaveLoginCredentials(true);
    } catch {
      localStorage.removeItem(savedLoginCredentialsKey);
    }
  }, []);

  useEffect(() => {
    if (accountStatus === "pending") setError(t("auth.accountPendingApproval"));
    if (accountStatus === "rejected") setError(t("auth.accountRejected"));
  }, [accountStatus, t]);

  useEffect(() => {
    let cancelled = false;

    async function redirectExistingSession() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!cancelled) setCheckingSession(false);
        return;
      }

      const { data: existingProfile, error: existingProfileError } = await supabase
        .from("profiles")
        .select("uid, role, name, email, approved")
        .eq("uid", data.user.id)
        .maybeSingle();

      if (existingProfileError) {
        console.error("Failed to load profile after authentication", existingProfileError);
      }

      let profile = existingProfile;
      if (!profile) {
        const pendingRegistration = data.user.user_metadata?.pending_registration;
        if (isPendingRegistration(pendingRegistration)) {
          const { error: registrationError } = await supabase.rpc("register_current_user_profile", {
            p_role: pendingRegistration.role,
            p_name: pendingRegistration.name,
            p_email: pendingRegistration.email,
            p_details: pendingRegistration.details,
          });

          if (registrationError) {
            console.error("register_current_user_profile failed after email confirmation", registrationError);
            if (!cancelled) {
              setError(
                isDuplicateEmailError(registrationError)
                  ? t("auth.emailAlreadyRegistered")
                  : registrationError.message
              );
              setCheckingSession(false);
            }
            return;
          }

          profile = {
            uid: data.user.id,
            role: pendingRegistration.role,
            name: pendingRegistration.name,
            email: pendingRegistration.email,
            approved: null,
          };

          const { error: metadataError } = await supabase.auth.updateUser({
            data: {
              name: pendingRegistration.name,
              pending_registration: null,
            },
          });
          if (metadataError) {
            console.error("Failed to clear completed registration metadata", metadataError);
          }
        }
      }

      if (!profile || cancelled) {
        if (!cancelled) setCheckingSession(false);
        return;
      }

      if (profile.role !== "admin" && profile.approved !== true) {
        await supabase.auth.signOut();
        if (!cancelled) {
          setError(t(profile.approved === false ? "auth.accountRejected" : "auth.accountPendingApproval"));
          setCheckingSession(false);
        }
        return;
      }

      storeUser({
        uid: profile.uid,
        role: profile.role,
        name: profile.name,
        email: profile.email,
      });
      router.replace(getPostAuthPath(profile.role));
    }

    void redirectExistingSession();

    return () => {
      cancelled = true;
    };
  }, [redirectTo, router]);

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  function hasAllRequiredRegistrationFields() {
    const sharedFields = [
      name,
      registerEmail,
      registerPassword,
      confirmRegisterPassword,
      communicationRecipient,
      preferredCommunication,
      notificationMethod,
    ];
    const communicationFields = [
      ...(communicationRecipient === "student" || communicationRecipient === "both"
        ? [studentWechatId, studentCommunicationEmail]
        : []),
      ...(communicationRecipient === "parent" || communicationRecipient === "both"
        ? [parentWechatId, parentCommunicationEmail]
        : []),
    ];
    const roleFields = role === "student"
      ? [country, grade, studentIntroduction]
      : role === "tutor"
        ? [school, grade, classLink, classPassword, tutorIntroduction]
        : [];

    return [...sharedFields, ...communicationFields, ...roleFields].every((value) => value.trim().length > 0);
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

      <section className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-foreground">
                {mode === "login" ? t("auth.loginTitle") : `${titleRole} ${t("auth.registration")}`}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "login" ? t("auth.loginHelp") : t("auth.registerHelp")}
              </p>
            </div>

            <div className="flex w-full gap-1 rounded-xl bg-muted p-1 sm:w-fit">
              {(["login", "register"] as Mode[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleModeChange(option)}
                  className={`flex-1 rounded-lg px-4 py-1.5 text-sm capitalize transition-all sm:flex-none ${
                    mode === option ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-card-foreground"
                  }`}
                >
                  {option === "login" ? t("auth.login") : t("auth.register")}
                </button>
              ))}
            </div>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              
              if (mode === "login") {
                const normalizedEmail = loginEmail.trim();
                const { data, error } = await supabase.auth.signInWithPassword({
                  email: normalizedEmail,
                  password: loginPassword,
                });

                if (error) {
                  setError(isEmailNotConfirmedError(error.message) ? t("auth.emailNotConfirmed") : error.message);
                  return;
                }

                const user = data.user;

                const { data: existingProfile, error: profileError } = await supabase
                  .from("profiles")
                  .select("uid, role, name, email, approved")
                  .eq("uid", user.id)
                  .maybeSingle();

                if (profileError) {
                  await supabase.auth.signOut();
                  setError(profileError.message);
                  return;
                }

                let profile = existingProfile;
                const pendingRegistration = user.user_metadata?.pending_registration;
                if (!profile && isPendingRegistration(pendingRegistration)) {
                  const { error: registrationError } = await supabase.rpc("register_current_user_profile", {
                    p_role: pendingRegistration.role,
                    p_name: pendingRegistration.name,
                    p_email: pendingRegistration.email,
                    p_details: pendingRegistration.details,
                  });
                  if (registrationError) {
                    await supabase.auth.signOut();
                    setError(isDuplicateEmailError(registrationError) ? t("auth.emailAlreadyRegistered") : registrationError.message);
                    return;
                  }
                  profile = {
                    uid: user.id,
                    role: pendingRegistration.role,
                    name: pendingRegistration.name,
                    email: pendingRegistration.email,
                    approved: null,
                  };
                  void supabase.auth.updateUser({ data: { name: pendingRegistration.name, pending_registration: null } });
                }

                if (!profile) {
                  await supabase.auth.signOut();
                  setError(t("auth.authUserError"));
                  return;
                }

                if (profile.role !== "admin" && profile.approved !== true) {
                  await supabase.auth.signOut();
                  setError(t(profile.approved === false ? "auth.accountRejected" : "auth.accountPendingApproval"));
                  return;
                }

                if (saveLoginCredentials) {
                  localStorage.setItem(
                    savedLoginCredentialsKey,
                    JSON.stringify({ email: normalizedEmail, password: loginPassword })
                  );
                } else {
                  localStorage.removeItem(savedLoginCredentialsKey);
                }

                storeUser({
                  uid: user.id,
                  role: profile.role,
                  name: profile.name,
                  email: profile.email,
                });

                router.push(getPostAuthPath(profile.role));
              } else if (mode === "register") {
                if (notificationMethod === "wechat") {
                  setError(t("auth.wechatNotificationsUnavailable"));
                  return;
                }
                if (notificationMethod === "phone") {
                  setError(t("auth.phoneNotificationWarning"));
                  return;
                }
                if (!hasAllRequiredRegistrationFields()) {
                  setError(t("auth.requiredFields"));
                  return;
                }
                if (registerPassword !== confirmRegisterPassword) {
                  setError(t("auth.passwordMismatch"));
                  return;
                }

                const normalizedEmail = registerEmail.trim();
                const registrationRole = role === "tutor" ? "tutor" : "student";
                const normalizedClassLink = registrationRole === "tutor"
                  ? normalizeVoovMeetingUrl(classLink)
                  : null;
                if (registrationRole === "tutor" && !normalizedClassLink) {
                  setError(t("auth.voovLinkRequired"));
                  return;
                }
                if (registrationRole === "tutor" && !isValidMeetingPassword(classPassword)) {
                  setError(t("auth.meetingPasswordInvalid"));
                  return;
                }
                const details: Record<string, string> = registrationRole === "student"
                  ? {
                      country,
                      grade,
                      referrer,
                      trial_teacher: trialTeacher,
                      introduction: studentIntroduction.trim(),
                      communication_recipient: communicationRecipient,
                      student_wechat_id: communicationRecipient === "student" || communicationRecipient === "both" ? studentWechatId.trim() : "",
                      parent_wechat_id: communicationRecipient === "parent" || communicationRecipient === "both" ? parentWechatId.trim() : "",
                      student_email: communicationRecipient === "student" || communicationRecipient === "both" ? studentCommunicationEmail.trim() : "",
                      parent_email: communicationRecipient === "parent" || communicationRecipient === "both" ? parentCommunicationEmail.trim() : "",
                      preferred_communication: preferredCommunication,
                      notification_method: notificationMethod,
                    }
                  : {
                      school,
                      grade,
                      class_link: normalizedClassLink!,
                      meeting_password: classPassword,
                      how_found_out: howFoundOut,
                      introduction: tutorIntroduction.trim(),
                      communication_recipient: communicationRecipient,
                      student_wechat_id: communicationRecipient === "student" || communicationRecipient === "both" ? studentWechatId.trim() : "",
                      parent_wechat_id: communicationRecipient === "parent" || communicationRecipient === "both" ? parentWechatId.trim() : "",
                      student_email: communicationRecipient === "student" || communicationRecipient === "both" ? studentCommunicationEmail.trim() : "",
                      parent_email: communicationRecipient === "parent" || communicationRecipient === "both" ? parentCommunicationEmail.trim() : "",
                      preferred_communication: preferredCommunication,
                      notification_method: notificationMethod,
                    };
                const pendingRegistration: PendingRegistration = {
                  role: registrationRole,
                  name: name.trim(),
                  email: normalizedEmail,
                  details,
                };
                const { data, error } = await supabase.auth.signUp({
                  email: normalizedEmail,
                  password: registerPassword,
                  options: {
                    emailRedirectTo: window.location.origin,
                    data: {
                      name: pendingRegistration.name,
                      pending_registration: pendingRegistration,
                    },
                  },
                });

                if (error) {
                  if (isDuplicateEmailError(error)) {
                    setError(t("auth.emailAlreadyRegistered"));
                    return;
                  }
                  setError(error.message);
                  return;
                }

                if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
                  setError(t("auth.emailAlreadyRegistered"));
                  return;
                }

                const userId = data.user?.id;
                const hasSession = Boolean(data.session);

                if (!userId) {
                  setError(t("auth.authUserError"));
                  return;
                }

                if (!hasSession) {
                  router.push(`/check-email?email=${encodeURIComponent(normalizedEmail)}`);
                  return;
                }

                const { error: profileError } = await supabase.rpc("register_current_user_profile", {
                  p_role: registrationRole,
                  p_name: name,
                  p_email: normalizedEmail,
                  p_details: details,
                });

                if (profileError) {
                  console.error("register_current_user_profile failed", profileError);
                  setError(
                    isDuplicateEmailError(profileError)
                      ? t("auth.emailAlreadyRegistered")
                      : profileError.message
                  );
                  return;
                }

                await supabase.auth.signOut();
                router.push(`/check-email?email=${encodeURIComponent(normalizedEmail)}`);
              }
            }}
          >
            {mode === "register" && <RoleTabs options={registerRoleOptions} role={role} setRole={setRole} t={t} />}
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              {mode === "login" ? (
                <LoginFields
                  lang={lang}
                  t={t}
                  email={loginEmail}
                  setEmail={setLoginEmail}
                  password={loginPassword}
                  setPassword={setLoginPassword}
                  saveCredentials={saveLoginCredentials}
                  setSaveCredentials={setSaveLoginCredentials}
                />
              ) : (
                <RegisterFields
                  role={role}
                  lang={lang}
                  t={t}
                  name={name}
                  setName={setName}
                  email={registerEmail}
                  setEmail={setRegisterEmail}
                  password={registerPassword}
                  setPassword={setRegisterPassword}
                  confirmPassword={confirmRegisterPassword}
                  setConfirmPassword={setConfirmRegisterPassword}
                  communicationRecipient={communicationRecipient}
                  setCommunicationRecipient={setCommunicationRecipient}
                  studentWechatId={studentWechatId}
                  setStudentWechatId={setStudentWechatId}
                  parentWechatId={parentWechatId}
                  setParentWechatId={setParentWechatId}
                  studentCommunicationEmail={studentCommunicationEmail}
                  setStudentCommunicationEmail={setStudentCommunicationEmail}
                  parentCommunicationEmail={parentCommunicationEmail}
                  setParentCommunicationEmail={setParentCommunicationEmail}
                  preferredCommunication={preferredCommunication}
                  setPreferredCommunication={setPreferredCommunication}
                  notificationMethod={notificationMethod}
                  setNotificationMethod={setNotificationMethod}
                  country={country}
                  setCountry={setCountry}
                  countryOptions={countryOptions}
                  grade={grade}
                  setGrade={setGrade}
                  referrer={referrer}
                  setReferrer={setReferrer}
                  trialTeacher={trialTeacher}
                  setTrialTeacher={setTrialTeacher}
                  studentIntroduction={studentIntroduction}
                  setStudentIntroduction={setStudentIntroduction}
                  school={school}
                  setSchool={setSchool}
                  classLink={classLink}
                  setClassLink={setClassLink}
                  classPassword={classPassword}
                  setClassPassword={setClassPassword}
                  howFoundOut={howFoundOut}
                  setHowFoundOut={setHowFoundOut}
                  tutorIntroduction={tutorIntroduction}
                  setTutorIntroduction={setTutorIntroduction}
                />
              )}
            </div>
            {error && (
              <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={mode === "register" && notificationMethod === "phone"}
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-fit"
            >
              {mode === "login" ? t("auth.login") : t("auth.createAccount")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

function LoadingFallback() {
  const { t } = useLanguage();
  return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("common.loading")}</div>;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AuthPageContent />
    </Suspense>
  );
}
