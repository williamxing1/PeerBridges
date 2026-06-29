"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Select from "@radix-ui/react-select";
import { BookOpen, Check, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase/client";
import { GradesToTutorMultiSelect } from "./components/GradesToTutorMultiSelect";
import { countryOptionsForLang } from "./data/countries";
import { safeExternalUrl } from "./lib/security";
import { LanguageProvider, LanguageSelect, optionLabel, useLanguage, type Lang, type TranslationKey } from "./i18n";

type Mode = "login" | "register";
type Role = "student" | "tutor" | "administrator";
type StoredUser = {
  uid: string;
  role: Role | "admin";
  name: string;
  email: string;
  wechatId?: string;
  country?: string;
  grade?: string;
  englishLevel?: string;
  referrer?: string;
  trialTeacher?: string;
  school?: string;
  gradesToTutor?: string;
  classLink?: string;
  classPassword?: string;
  howFoundOut?: string;
};

const storedUserKey = "tutorflow-user";

const roleOptions: Array<{ id: Role; labelKey: TranslationKey }> = [
  { id: "student", labelKey: "role.student" },
  { id: "tutor", labelKey: "role.tutor" },
  { id: "administrator", labelKey: "role.administrator" }
];

const registerRoleOptions = roleOptions.filter((option) => option.id !== "administrator");

const teachers = ["Ivy Wong", "Dr. Sarah Mitchell", "Ms. Karen Liu"];
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const englishLevels = ["Beginner", "Intermediate", "Advanced"];

function isAlreadyRegisteredError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("already registered") || normalized.includes("already exists");
}

function Field({
  label,
  type = "text",
  placeholder,
  minLength,
  value,
  onChange,
}: {
  label: string;
  type?: string;
  placeholder?: string;
  minLength?: number;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <input
        required
        type={type}
        placeholder={placeholder}
        minLength={minLength}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  getOptionLabel = (option) => option,
}: {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  getOptionLabel?: (option: string) => string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
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
  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <Select.Root value={value} onValueChange={onChange}>
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
};

type RegisterFieldsProps = LoginFieldsProps & {
  role: Role;
  name: string;
  setName: (value: string) => void;
  wechatId: string;
  setWechatId: (value: string) => void;
  country: string;
  setCountry: (value: string) => void;
  countryOptions: Array<{ value: string; label: string }>;
  grade: string;
  setGrade: (value: string) => void;
  englishLevel: string;
  setEnglishLevel: (value: string) => void;
  referrer: string;
  setReferrer: (value: string) => void;
  trialTeacher: string;
  setTrialTeacher: (value: string) => void;
  school: string;
  setSchool: (value: string) => void;
  gradesToTutor: string;
  setGradesToTutor: (value: string) => void;
  classLink: string;
  setClassLink: (value: string) => void;
  classPassword: string;
  setClassPassword: (value: string) => void;
  howFoundOut: string;
  setHowFoundOut: (value: string) => void;
};

function LoginFields({ t, email, setEmail, password, setPassword }: LoginFieldsProps) {
  return (
    <div className="grid gap-4">
      <Field label={t("auth.email")} type="email" placeholder={t("auth.emailPlaceholder")} value={email} onChange={setEmail} />
      <Field label={t("auth.password")} type="password" placeholder={t("auth.enterPassword")} minLength={6} value={password} onChange={setPassword} />
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
  wechatId,
  setWechatId,
  country,
  setCountry,
  countryOptions,
  grade,
  setGrade,
  englishLevel,
  setEnglishLevel,
  referrer,
  setReferrer,
  trialTeacher,
  setTrialTeacher,
  school,
  setSchool,
  gradesToTutor,
  setGradesToTutor,
  classLink,
  setClassLink,
  classPassword,
  setClassPassword,
  howFoundOut,
  setHowFoundOut,
  lang,
  t,
}: RegisterFieldsProps) {
  const labelOption = (option: string) => optionLabel(option, lang);

  if (role === "student") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("auth.name")} placeholder={t("auth.studentName")} value={name} onChange={setName} />
        <Field label={t("auth.email")} type="email" placeholder={t("auth.studentEmailPlaceholder")} value={email} onChange={setEmail} />
        <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
        <Field label={t("auth.wechatId")} placeholder={t("auth.wechatId")} value={wechatId} onChange={setWechatId} />
        <CountrySelect label={t("auth.country")} placeholder={t("auth.countryPlaceholder")} options={countryOptions} value={country} onChange={setCountry} />
        <SelectField label={t("auth.grade")} placeholder={t("auth.selectGrade")} options={gradeOptions} value={grade} onChange={setGrade} getOptionLabel={labelOption} />
        <SelectField label={t("auth.englishLevel")} placeholder={t("auth.selectLevel")} options={englishLevels} value={englishLevel} onChange={setEnglishLevel} getOptionLabel={labelOption} />
        <Field label={t("auth.referrer")} placeholder={t("auth.referrerPlaceholder")} value={referrer} onChange={setReferrer} />
        <SelectField label={t("auth.trialTeacher")} placeholder={t("auth.selectRecruitingTeacher")} options={teachers} value={trialTeacher} onChange={setTrialTeacher} />
      </div>
    );
  }

  if (role === "tutor") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("auth.name")} placeholder={t("auth.tutorName")} value={name} onChange={setName} />
        <Field label={t("auth.email")} type="email" placeholder={t("auth.tutorEmailPlaceholder")} value={email} onChange={setEmail} />
        <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
        <Field label={t("auth.wechatId")} placeholder={t("auth.wechatId")} value={wechatId} onChange={setWechatId} />
        <Field label={t("auth.school")} placeholder={t("auth.schoolName")} value={school} onChange={setSchool} />
        <SelectField label={t("auth.grade")} placeholder={t("auth.selectYourGrade")} options={gradeOptions} value={grade} onChange={setGrade} getOptionLabel={labelOption} />
        <GradesToTutorMultiSelect
          label={t("auth.studentGradeToTutor")}
          placeholder={t("auth.selectTargetGrade")}
          value={gradesToTutor}
          onChange={setGradesToTutor}
        />
        <Field label={t("auth.classLink")} type="url" placeholder={t("auth.videoClassLink")} value={classLink} onChange={setClassLink} />
        <Field label={t("auth.classPassword")} placeholder={t("auth.classroomPassword")} value={classPassword} onChange={setClassPassword} />
        <Field label={t("auth.howFoundOut")} placeholder={t("auth.howFoundOutPlaceholder")} value={howFoundOut} onChange={setHowFoundOut} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label={t("auth.name")} placeholder={t("auth.administratorName")} value={name} onChange={setName} />
      <Field label={t("auth.email")} type="email" placeholder={t("auth.adminEmailPlaceholder")} value={email} onChange={setEmail} />
      <Field label={t("auth.password")} type="password" placeholder={t("auth.createPassword")} minLength={6} value={password} onChange={setPassword} />
      <Field label={t("auth.wechatId")} placeholder={t("auth.wechatId")} value={wechatId} onChange={setWechatId} />
    </div>
  );
}

function AuthPageContent() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [name, setName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [wechatId, setWechatId] = useState("");

  const [country, setCountry] = useState("");
  const [grade, setGrade] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [referrer, setReferrer] = useState("");
  const [trialTeacher, setTrialTeacher] = useState("");

  const [school, setSchool] = useState("");
  const [gradesToTutor, setGradesToTutor] = useState("");
  const [classLink, setClassLink] = useState("");
  const [classPassword, setClassPassword] = useState("");
  const [howFoundOut, setHowFoundOut] = useState("");

  const [error, setError] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("student");
  const { lang, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "";
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
      return path === "/student-dashboard" || path === "/student-schedule" || path === "/student-materials" || path === "/student-communications";
    }
    if (normalizedRole === "tutor") {
      return (
        path === "/tutor-dashboard" ||
        path === "/tutor-schedule" ||
        path === "/volunteer-record" ||
        path === "/training-materials" ||
        path === "/volunteer-awards" ||
        path === "/tutor-communications" ||
        path.startsWith("/evaluations/")
      );
    }
    return path === "/admin-dashboard" || path === "/admin-media" || path === "/admin-communications";
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
    let cancelled = false;

    async function redirectExistingSession() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (!cancelled) setCheckingSession(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("uid, role, name, email, wechat_id")
        .eq("uid", data.user.id)
        .maybeSingle();

      if (!profile || cancelled) {
        if (!cancelled) setCheckingSession(false);
        return;
      }

      storeUser({
        uid: profile.uid,
        role: profile.role,
        name: profile.name,
        email: profile.email,
        wechatId: profile.wechat_id,
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

  function pushRegisteredUser(userId: string) {
    storeUser({
      uid: userId,
      role,
      name,
      email: registerEmail.trim(),
      wechatId,
      country,
      grade,
      englishLevel,
      referrer,
      trialTeacher,
      school,
      gradesToTutor,
      classLink,
      classPassword,
      howFoundOut,
    });

    router.push(getPostAuthPath(role));
  }

  return (
    <main className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-4 sm:px-6">
        <div className="flex items-center gap-2 mr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen size={16} />
          </div>
          <span className="hidden text-card-foreground sm:block">TutorFlow</span>
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
                  setError(error.message);
                  return;
                }

                const user = data.user;

                const { data: profile, error: profileError } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("uid", user.id)
                  .single();

                if (profileError || !profile) {
                  setError(profileError?.message || t("auth.authUserError"));
                  return;
                }

                storeUser({
                  uid: user.id,
                  role: profile.role,
                  name: profile.name,
                  email: profile.email,
                  wechatId: profile.wechat_id,
                });

                router.push(getPostAuthPath(profile.role));
              } else if (mode === "register") {
                const normalizedEmail = registerEmail.trim();
                const { data, error } = await supabase.auth.signUp({
                  email: normalizedEmail,
                  password: registerPassword,
                });

                let userId = data.user?.id;

                if (error && isAlreadyRegisteredError(error.message)) {
                  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password: registerPassword,
                  });

                  if (signInError) {
                    setError(signInError.message);
                    return;
                  }

                  userId = signInData.user.id;
                } else if (error) {
                  setError(error.message);
                  return;
                }

                if (!userId) {
                  setError(t("auth.authUserError"));
                  return;
                }

                const registrationRole = role === "tutor" ? "tutor" : "student";
                const normalizedClassLink = registrationRole === "tutor"
                  ? safeExternalUrl(classLink)
                  : null;
                if (registrationRole === "tutor" && !normalizedClassLink) {
                  setError(t("media.urlInvalid"));
                  return;
                }
                const details = registrationRole === "student"
                  ? {
                      country,
                      grade,
                      english_level: englishLevel,
                      referrer,
                      trial_teacher: trialTeacher,
                    }
                  : {
                      school,
                      grade,
                      grades_to_tutor: gradesToTutor,
                      class_link: normalizedClassLink,
                      meeting_password: classPassword,
                      how_found_out: howFoundOut,
                    };
                const { error: profileError } = await supabase.rpc("register_current_user_profile", {
                  p_role: registrationRole,
                  p_name: name,
                  p_email: normalizedEmail,
                  p_wechat_id: wechatId,
                  p_details: details,
                });

                if (profileError) {
                  setError(profileError.message);
                  return;
                }

                pushRegisteredUser(userId);
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
                  wechatId={wechatId}
                  setWechatId={setWechatId}
                  country={country}
                  setCountry={setCountry}
                  countryOptions={countryOptions}
                  grade={grade}
                  setGrade={setGrade}
                  englishLevel={englishLevel}
                  setEnglishLevel={setEnglishLevel}
                  referrer={referrer}
                  setReferrer={setReferrer}
                  trialTeacher={trialTeacher}
                  setTrialTeacher={setTrialTeacher}
                  school={school}
                  setSchool={setSchool}
                  gradesToTutor={gradesToTutor}
                  setGradesToTutor={setGradesToTutor}
                  classLink={classLink}
                  setClassLink={setClassLink}
                  classPassword={classPassword}
                  setClassPassword={setClassPassword}
                  howFoundOut={howFoundOut}
                  setHowFoundOut={setHowFoundOut}
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
              className="w-full rounded-xl bg-primary px-6 py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 sm:w-fit"
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
    <LanguageProvider>
      <Suspense fallback={<LoadingFallback />}>
        <AuthPageContent />
      </Suspense>
    </LanguageProvider>
  );
}
