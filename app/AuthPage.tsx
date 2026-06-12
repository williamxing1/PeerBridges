"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Select from "@radix-ui/react-select";
import { BookOpen, Check, ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase/client";

type Mode = "login" | "register";
type Role = "student" | "tutor" | "administrator";
type StoredUser = {
  uid: string;
  role: Role | "admin";
  name: string;
  email: string;
  wechatId?: string;
  province?: string;
  city?: string;
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

const roleOptions: Array<{ id: Role; label: string }> = [
  { id: "student", label: "Student" },
  { id: "tutor", label: "Tutor" },
  { id: "administrator", label: "Administrator" }
];

const registerRoleOptions = roleOptions.filter((option) => option.id !== "administrator");

const provinces = ["Ontario", "British Columbia", "Alberta", "Quebec", "California", "New York"];
const cities = ["Toronto", "Vancouver", "Calgary", "Montreal", "Los Angeles", "New York City"];
const teachers = ["Ivy Wong", "Dr. Sarah Mitchell", "Ms. Karen Liu"];
const gradeOptions = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const englishLevels = ["Beginner", "Primary", "Intermediate"];
const tutorStudentGrades = ["Elementary school", "Middle school", "High school"];

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
  onChange
}: {
  label: string;
  placeholder: string;
  options: string[];
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
          <Select.Content className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
            <Select.Viewport>
              {options.map((option) => (
                <Select.Item
                  key={option}
                  value={option}
                  className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                >
                  <Select.ItemText>{option}</Select.ItemText>
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
  setRole
}: {
  options: Array<{ id: Role; label: string }>;
  role: Role;
  setRole: (role: Role) => void;
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
          {option.label}
        </button>
      ))}
    </div>
  );
}

type LoginFieldsProps = {
  role: Role;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
};

type RegisterFieldsProps = LoginFieldsProps & {
  name: string;
  setName: (value: string) => void;
  wechatId: string;
  setWechatId: (value: string) => void;
  province: string;
  setProvince: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
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

function LoginFields({ role, email, setEmail, password, setPassword }: LoginFieldsProps) {
  const emailLabel =
    role === "student"
      ? "Student Email"
      : role === "tutor"
        ? "Tutor Email"
        : "Administrator Email";

  return (
    <div className="grid gap-4">
      <Field label={emailLabel} type="email" placeholder="you@example.com" value={email} onChange={setEmail} />
      <Field label="Password" type="password" placeholder="Enter your password" minLength={6} value={password} onChange={setPassword} />
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
  province,
  setProvince,
  city,
  setCity,
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
}: RegisterFieldsProps) {
  if (role === "student") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" placeholder="Student name" value={name} onChange={setName} />
        <Field label="Email" type="email" placeholder="student@example.com" value={email} onChange={setEmail} />
        <Field label="Password" type="password" placeholder="Create a password" minLength={6} value={password} onChange={setPassword} />
        <Field label="WeChat ID" placeholder="WeChat ID" value={wechatId} onChange={setWechatId} />
        <SelectField label="Province" placeholder="Select province" options={provinces} value={province} onChange={setProvince} />
        <SelectField label="City" placeholder="Select city" options={cities} value={city} onChange={setCity} />
        <SelectField label="Grade" placeholder="Select grade" options={gradeOptions} value={grade} onChange={setGrade} />
        <SelectField label="English Level" placeholder="Select level" options={englishLevels} value={englishLevel} onChange={setEnglishLevel} />
        <Field label="Referrer" placeholder="Who referred you?" value={referrer} onChange={setReferrer} />
        <SelectField label="Trial Teacher" placeholder="Select recruiting teacher" options={teachers} value={trialTeacher} onChange={setTrialTeacher} />
      </div>
    );
  }

  if (role === "tutor") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" placeholder="Tutor name" value={name} onChange={setName} />
        <Field label="Email" type="email" placeholder="tutor@example.com" value={email} onChange={setEmail} />
        <Field label="Password" type="password" placeholder="Create a password" minLength={6} value={password} onChange={setPassword} />
        <Field label="WeChat ID" placeholder="WeChat ID" value={wechatId} onChange={setWechatId} />
        <Field label="School" placeholder="School name" value={school} onChange={setSchool} />
        <SelectField label="Grade" placeholder="Select your grade" options={gradeOptions} value={grade} onChange={setGrade} />
        <SelectField label="Student Grade to Tutor" placeholder="Select target grade" options={tutorStudentGrades} value={gradesToTutor} onChange={setGradesToTutor} />
        <Field label="Class Link" placeholder="Video class link" value={classLink} onChange={setClassLink} />
        <Field label="Class Password" placeholder="Classroom password" value={classPassword} onChange={setClassPassword} />
        <Field label="How did you find out about this?" placeholder="Referral, school, social media..." value={howFoundOut} onChange={setHowFoundOut} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" placeholder="Administrator name" value={name} onChange={setName} />
      <Field label="Email" type="email" placeholder="admin@example.com" value={email} onChange={setEmail} />
      <Field label="Password" type="password" placeholder="Create a password" minLength={6} value={password} onChange={setPassword} />
      <Field label="WeChat ID" placeholder="WeChat ID" value={wechatId} onChange={setWechatId} />
    </div>
  );
}

export default function AuthPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wechatId, setWechatId] = useState("");

  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
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

  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("student");
  const router = useRouter();
  const titleRole = roleOptions.find((option) => option.id === role)?.label;
  const visibleRoles = mode === "login" ? roleOptions : registerRoleOptions;

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

  function storeUser(user: StoredUser) {
    sessionStorage.setItem(storedUserKey, JSON.stringify(user));
  }

  function pushRegisteredUser(userId: string) {
    storeUser({
      uid: userId,
      role,
      name,
      email: email.trim(),
      wechatId,
      province,
      city,
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

    router.push(getDashboardPath(role));
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
      </header>

      <section className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-foreground">
                {mode === "login" ? "Log in" : `${titleRole} Registration`}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {mode === "login" ? "Select your role and enter your account details." : "All fields are required."}
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
                  {option}
                </button>
              ))}
            </div>
          </div>

          <form
            className="flex flex-col gap-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              const normalizedEmail = email.trim();
              
              if (mode === "login") {
                const { data, error } = await supabase.auth.signInWithPassword({
                  email: normalizedEmail,
                  password,
                });

                if (error) {
                  setError(error.message);
                  return;
                }

                const user = data.user;

                const { data: profile } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("uid", user.id)
                  .single();

                storeUser({
                  uid: user.id,
                  role: profile.role,
                  name: profile.name,
                  email: profile.email,
                  wechatId: profile.wechat_id,
                });

                router.push(getDashboardPath(profile.role === "admin" ? "administrator" : profile.role));
              } else if (mode === "register") {
                const { data, error } = await supabase.auth.signUp({
                  email: normalizedEmail,
                  password,
                });

                let userId = data.user?.id;

                if (error && isAlreadyRegisteredError(error.message)) {
                  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password,
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
                  setError("Could not create or load the auth user.");
                  return;
                }

                const createdAt = new Date().toISOString();

                const { error: profileError } = await supabase.from("profiles").upsert({
                  uid: userId,
                  role,
                  name,
                  email: normalizedEmail,
                  wechat_id: wechatId,
                  created_at: createdAt,
                }, {
                  onConflict: "uid",
                });

                if (profileError) {
                  setError(profileError.message);
                  return;
                }

                if (role === "student") {
                  const { error: studentProfileError } = await supabase.from("student_profiles").upsert({
                    uid: userId,
                    province,
                    city,
                    grade,
                    english_level: englishLevel,
                    referrer,
                    trial_teacher: trialTeacher,
                  }, {
                    onConflict: "uid",
                  });
                  if (studentProfileError) {
                    setError(studentProfileError.message);
                    return;
                  }
                  pushRegisteredUser(userId);
                } else if (role === "tutor") {
                  const { error: tutorProfileError } = await supabase.from("tutor_profiles").upsert({
                    uid: userId,
                    school,
                    grade,
                    grades_to_tutor: gradesToTutor,
                    class_link: classLink,
                    meeting_password: classPassword,
                    how_found_out: howFoundOut,
                  }, {
                    onConflict: "uid",
                  });
                  if (tutorProfileError) {
                    setError(tutorProfileError.message);
                    return;
                  }
                  pushRegisteredUser(userId);
                } else {
                  pushRegisteredUser(userId);
                }
              }
            }}
          >
            <RoleTabs options={visibleRoles} role={role} setRole={setRole} />
            <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
              {mode === "login" ? (
                <LoginFields
                  role={role}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                />
              ) : (
                <RegisterFields
                  role={role}
                  name={name}
                  setName={setName}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  wechatId={wechatId}
                  setWechatId={setWechatId}
                  province={province}
                  setProvince={setProvince}
                  city={city}
                  setCity={setCity}
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
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
