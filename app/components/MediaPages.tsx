"use client";

import { FormEvent, useEffect, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, Download, FileText, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";
import { coverImageValidationError, safeExternalUrl } from "../lib/security";

type MediaCategory = "student_material" | "tutor_training" | "volunteer_award";

type MediaRow = {
  training_material_id: string;
  category: MediaCategory;
  media_name: string;
  cover_image_path: string;
  file_url: string;
};

type MediaItem = MediaRow & {
  coverImageUrl: string;
};

const mediaCategories: MediaCategory[] = ["tutor_training", "volunteer_award", "student_material"];

function categoryLabel(category: MediaCategory, t: ReturnType<typeof useLanguage>["t"]) {
  if (category === "tutor_training") return t("media.categoryTutorTraining");
  if (category === "volunteer_award") return t("media.categoryVolunteerAward");
  return t("media.categoryStudentMaterial");
}

function parseStoragePath(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  const [firstSegment, ...rest] = normalizedPath.split("/");

  return {
    bucket: rest.length > 0 ? firstSegment : "media",
    objectPath: rest.length > 0 ? rest.join("/") : normalizedPath,
  };
}

async function storageImageUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;

  const { bucket, objectPath } = parseStoragePath(path);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 60 * 60);

  if (!error && data?.signedUrl) {
    return data.signedUrl;
  }

  return supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl;
}

export function MediaListPage({
  category,
  titleKey,
  helpKey,
}: {
  category: MediaCategory;
  titleKey: "media.tutorTrainingTitle" | "media.volunteerAwardTitle" | "media.studentMaterialTitle";
  helpKey: "media.tutorTrainingHelp" | "media.volunteerAwardHelp" | "media.studentMaterialHelp";
}) {
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadMaterials() {
      setLoading(true);
      setError("");

      const { data, error: mediaError } = await supabase
        .from("media")
        .select("training_material_id, category, media_name, cover_image_path, file_url")
        .eq("category", category)
        .order("media_name", { ascending: true });

      if (mediaError) {
        if (!cancelled) {
          setError(mediaError.message);
          setLoading(false);
        }
        return;
      }

      if (!cancelled) {
        const materialsWithImages = await Promise.all(
          ((data ?? []) as MediaRow[]).map(async (material) => ({
            ...material,
            coverImageUrl: await storageImageUrl(material.cover_image_path),
          }))
        );

        if (cancelled) return;

        setMaterials(materialsWithImages);
        setLoading(false);
      }
    }

    void loadMaterials();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-foreground">{t(titleKey)}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{t(helpKey)}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {t("media.loading")}
        </div>
      ) : materials.length === 0 ? (
        <div className="flex min-h-[18rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-12 text-center text-muted-foreground">
          <FileText size={32} className="opacity-40" />
          <p className="text-sm">{t("media.empty")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <article
              key={material.training_material_id}
              className="flex h-[24rem] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center justify-center border-b border-border px-4 py-3 text-center">
                <h3 className="line-clamp-2 text-base font-medium leading-snug text-card-foreground">
                  {material.media_name}
                </h3>
              </div>
              <div className="mx-4 mt-4 flex h-44 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted p-2">
                <img
                  src={material.coverImageUrl}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-auto p-4">
                <a
                  href={safeExternalUrl(material.file_url) ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download size={15} />
                  {t("media.download")}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export function ManageMediaPage() {
  const { t } = useLanguage();
  const [category, setCategory] = useState<MediaCategory>("tutor_training");
  const [name, setName] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    if (!coverImage) {
      setError(t("media.coverRequired"));
      setSaving(false);
      return;
    }

    const imageError = coverImageValidationError(coverImage);
    if (imageError) {
      setError(t(imageError === "type" ? "media.coverTypeInvalid" : "media.coverTooLarge"));
      setSaving(false);
      return;
    }

    const normalizedFileUrl = safeExternalUrl(fileUrl);
    if (!normalizedFileUrl) {
      setError(t("media.urlInvalid"));
      setSaving(false);
      return;
    }

    const extensionByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };
    const extension = extensionByType[coverImage.type];
    const objectPath = `covers/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(objectPath, coverImage, {
        cacheControl: "3600",
        contentType: coverImage.type,
        upsert: false,
      });

    if (uploadError) {
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("media").insert({
      category,
      media_name: name.trim(),
      cover_image_path: `media/${objectPath}`,
      file_url: normalizedFileUrl,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setCategory("tutor_training");
    setName("");
    setCoverImage(null);
    setFileUrl("");
    setMessage(t("media.created"));
    setSaving(false);
  }

  return (
    <div className="flex min-h-full items-center justify-center py-8">
      <form onSubmit={handleCreate} className="flex w-full max-w-xl flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div>
          <h2 className="text-card-foreground">{t("media.manageTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("media.manageHelp")}</p>
        </div>

        <label className="block">
          <span className="text-sm text-card-foreground">{t("media.category")}</span>
          <Select.Root value={category} onValueChange={(value) => setCategory(value as MediaCategory)}>
            <Select.Trigger className="mt-2 flex h-11 w-full items-center justify-between rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition data-[placeholder]:text-muted-foreground focus:border-primary/40 focus:bg-card">
              <Select.Value />
              <Select.Icon>
                <ChevronDown size={16} className="text-muted-foreground" />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content className="z-50 overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-xl">
                <Select.Viewport>
                  {mediaCategories.map((option) => (
                    <Select.Item
                      key={option}
                      value={option}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-popover-foreground outline-none data-[highlighted]:bg-accent"
                    >
                      <Select.ItemText>{categoryLabel(option, t)}</Select.ItemText>
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

        <label className="block">
          <span className="text-sm text-card-foreground">{t("media.name")}</span>
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
          />
        </label>

        <label className="block">
          <span className="text-sm text-card-foreground">{t("media.coverImage")}</span>
          <input
            required
            type="file"
            accept="image/*"
            onChange={(event) => setCoverImage(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
          />
        </label>

        <label className="block">
          <span className="text-sm text-card-foreground">{t("media.url")}</span>
          <input
            required
            type="url"
            value={fileUrl}
            onChange={(event) => setFileUrl(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition focus:border-primary/40 focus:bg-card"
          />
        </label>

        {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={15} />
          {saving ? t("common.saving") : t("media.create")}
        </button>
      </form>
    </div>
  );
}
