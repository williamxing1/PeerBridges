"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Select from "@radix-ui/react-select";
import { BookOpen, Check, ChevronDown } from "lucide-react";

type Mode = "login" | "register";
type Role = "student" | "tutor" | "administrator";

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
const tutorStudentGrades = ["Elementary school", "Middle school", "High school", "Adult learner"];

function Field({
  label,
  type = "text",
  placeholder
}: {
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <input
        required
        type={type}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:bg-card"
      />
    </label>
  );
}

function SelectField({
  label,
  placeholder,
  options
}: {
  label: string;
  placeholder: string;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <Select.Root>
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
    <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setRole(option.id)}
          className={`rounded-lg px-4 py-1.5 text-sm transition-all ${
            role === option.id ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-card-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function LoginFields({ role }: { role: Role }) {
  const label = roleOptions.find((option) => option.id === role)?.label;

  return (
    <div className="grid gap-4">
      <Field label={`${label} Email`} type="email" placeholder="you@example.com" />
      <Field label="Password" type="password" placeholder="Enter your password" />
    </div>
  );
}

function RegisterFields({ role }: { role: Role }) {
  if (role === "student") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" placeholder="Student name" />
        <Field label="Email" type="email" placeholder="student@example.com" />
        <Field label="Password" type="password" placeholder="Create a password" />
        <Field label="WeChat ID" placeholder="WeChat ID" />
        <SelectField label="Province" placeholder="Select province" options={provinces} />
        <SelectField label="City" placeholder="Select city" options={cities} />
        <SelectField label="Grade" placeholder="Select grade" options={gradeOptions} />
        <SelectField label="English Level" placeholder="Select level" options={englishLevels} />
        <Field label="Referrer" placeholder="Who referred you?" />
        <SelectField label="Trial Teacher" placeholder="Select recruiting teacher" options={teachers} />
      </div>
    );
  }

  if (role === "tutor") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" placeholder="Tutor name" />
        <Field label="Email" type="email" placeholder="tutor@example.com" />
        <Field label="Password" type="password" placeholder="Create a password" />
        <Field label="WeChat ID" placeholder="WeChat ID" />
        <Field label="School" placeholder="School name" />
        <SelectField label="Grade" placeholder="Select your grade" options={gradeOptions} />
        <SelectField label="Student Grade to Tutor" placeholder="Select target grade" options={tutorStudentGrades} />
        <Field label="Class Link" placeholder="Video class link" />
        <Field label="Class Password" placeholder="Classroom password" />
        <Field label="How did you find out about this?" placeholder="Referral, school, social media..." />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Name" placeholder="Administrator name" />
      <Field label="Email" type="email" placeholder="admin@example.com" />
      <Field label="Password" type="password" placeholder="Create a password" />
      <Field label="WeChat ID" placeholder="WeChat ID" />
    </div>
  );
}

export default function AuthPage() {
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

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-card px-6">
        <div className="flex items-center gap-2 mr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen size={16} />
          </div>
          <span className="hidden text-card-foreground sm:block">TutorFlow</span>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-6">
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

          <div className="flex w-fit gap-1 rounded-xl bg-muted p-1">
            {(["login", "register"] as Mode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleModeChange(option)}
                className={`rounded-lg px-4 py-1.5 text-sm capitalize transition-all ${
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
          onSubmit={(event) => {
            event.preventDefault();
            if (role === "tutor") {
              router.push("/tutor-dashboard");
            } else if (role === "administrator") {
              router.push("/admin-dashboard");
            } else {
              router.push("/dashboard");
            }
          }}
        >
          <RoleTabs options={visibleRoles} role={role} setRole={setRole} />
          <div className="rounded-2xl border border-border bg-card p-5">
            {mode === "login" ? <LoginFields role={role} /> : <RegisterFields role={role} />}
          </div>
          <button
            type="submit"
            className="w-fit rounded-xl bg-primary px-6 py-3 text-sm text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            {mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>
        </div>
      </section>
    </main>
  );
}
