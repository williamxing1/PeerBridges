"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { optionLabel, useLanguage } from "../i18n";
import {
  parseGradesToTutor,
  toggleGradeToTutor,
  tutorGradeBands,
} from "../lib/gradesToTutor";

export function GradesToTutorMultiSelect({
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
  const { lang } = useLanguage();
  const selected = parseGradesToTutor(value);
  const displayValue = selected.map((grade) => optionLabel(grade, lang)).join(", ");

  return (
    <label className="block">
      <span className="text-sm font-medium text-card-foreground">{label}</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="mt-2 flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3.5 text-left text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
            aria-label={label}
            aria-required="true"
          >
            <span className={`min-w-0 truncate ${displayValue ? "" : "text-muted-foreground"}`}>
              {displayValue || placeholder}
            </span>
            <ChevronDown size={16} className="shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={4}
            className="z-[80] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-border bg-popover p-1 shadow-xl"
          >
            {tutorGradeBands.map((grade) => (
              <DropdownMenu.CheckboxItem
                key={grade}
                checked={selected.includes(grade)}
                onCheckedChange={() => onChange(toggleGradeToTutor(value, grade))}
                onSelect={(event) => event.preventDefault()}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border border-border">
                  <DropdownMenu.ItemIndicator>
                    <Check size={13} className="text-primary" />
                  </DropdownMenu.ItemIndicator>
                </span>
                {optionLabel(grade, lang)}
              </DropdownMenu.CheckboxItem>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </label>
  );
}
