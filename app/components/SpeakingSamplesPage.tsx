"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mic2, Trash2, Upload } from "lucide-react";
import { supabase } from "../../lib/supabase/client";
import { useLanguage } from "../i18n";

const speakingSamplesBucket = "speaking-samples";
const maxFileSize = 50 * 1024 * 1024;
const maxDurationSeconds = 3 * 60;
const allowedFileTypes: Record<string, { mediaType: "audio" | "video"; extension: string }> = {
  "audio/mpeg": { mediaType: "audio", extension: "mp3" },
  "audio/mp4": { mediaType: "audio", extension: "m4a" },
  "audio/x-m4a": { mediaType: "audio", extension: "m4a" },
  "audio/wav": { mediaType: "audio", extension: "wav" },
  "audio/x-wav": { mediaType: "audio", extension: "wav" },
  "audio/ogg": { mediaType: "audio", extension: "ogg" },
  "audio/webm": { mediaType: "audio", extension: "webm" },
  "video/mp4": { mediaType: "video", extension: "mp4" },
  "video/quicktime": { mediaType: "video", extension: "mov" },
  "video/webm": { mediaType: "video", extension: "webm" },
};

type SpeakingSampleRow = {
  speaking_sample_id: string;
  student_uid: string;
  storage_path: string;
  file_name: string;
  media_type: "audio" | "video";
  created_at: string;
};

type SpeakingSample = SpeakingSampleRow;

function inferPlaybackContentType(sample: SpeakingSample) {
  const lowerName = `${sample.file_name}.${sample.storage_path}`.toLowerCase();
  if (lowerName.includes(".mp3")) return "audio/mpeg";
  if (lowerName.includes(".m4a")) return "audio/mp4";
  if (lowerName.includes(".wav")) return "audio/wav";
  if (lowerName.includes(".ogg")) return "audio/ogg";
  if (lowerName.includes(".webm")) return sample.media_type === "video" ? "video/webm" : "audio/webm";
  if (lowerName.includes(".mov")) return "video/quicktime";
  if (lowerName.includes(".mp4")) return sample.media_type === "audio" ? "audio/mp4" : "video/mp4";
  return sample.media_type === "audio" ? "audio/mpeg" : "video/mp4";
}

function getMediaDuration(file: File, mediaType: "audio" | "video") {
  return new Promise<number>((resolve, reject) => {
    const media = document.createElement(mediaType);
    const objectUrl = URL.createObjectURL(file);

    media.preload = "metadata";
    media.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(media.duration);
    };
    media.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not read media duration."));
    };
    media.src = objectUrl;
  });
}

async function loadSpeakingSamples(studentUid: string) {
  const { data, error } = await supabase
    .from("speaking_samples")
    .select("speaking_sample_id, student_uid, storage_path, file_name, media_type, created_at")
    .eq("student_uid", studentUid)
    .order("created_at", { ascending: false });

  if (error) return { samples: [], error };

  return { samples: (data ?? []) as SpeakingSample[], error: null };
}

function SampleGallery({
  samples,
  loading,
  onDelete,
}: {
  samples: SpeakingSample[];
  loading: boolean;
  onDelete?: (sample: SpeakingSample) => void;
}) {
  const { lang, t } = useLanguage();
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [playbackErrors, setPlaybackErrors] = useState<Record<string, boolean>>({});
  const objectUrls = useRef(new Map<string, string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const activeSampleIds = new Set(samples.map((sample) => sample.speaking_sample_id));

    for (const [sampleId, objectUrl] of objectUrls.current.entries()) {
      if (!activeSampleIds.has(sampleId)) {
        URL.revokeObjectURL(objectUrl);
        objectUrls.current.delete(sampleId);
      }
    }

    setMediaUrls((current) =>
      Object.fromEntries(Object.entries(current).filter(([sampleId]) => activeSampleIds.has(sampleId)))
    );
    setPlaybackErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([sampleId]) => activeSampleIds.has(sampleId)))
    );

    async function loadMedia(sample: SpeakingSample) {
      const sampleId = sample.speaking_sample_id;
      if (objectUrls.current.has(sampleId)) return;

      const { data, error } = await supabase.storage
        .from(speakingSamplesBucket)
        .download(sample.storage_path);

      if (cancelled) return;
      if (error || !data) {
        console.error("Speaking sample playback download failed", error);
        setPlaybackErrors((current) => ({ ...current, [sampleId]: true }));
        return;
      }

      const inferredContentType = inferPlaybackContentType(sample);
      const blob =
        data.type && data.type !== "application/octet-stream"
          ? data
          : new Blob([data], { type: inferredContentType });
      const objectUrl = URL.createObjectURL(blob);
      objectUrls.current.set(sampleId, objectUrl);
      setMediaUrls((current) => ({ ...current, [sampleId]: objectUrl }));
    }

    samples.forEach((sample) => {
      void loadMedia(sample);
    });

    return () => {
      cancelled = true;
    };
  }, [samples]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">{t("speakingSamples.loading")}</div>;
  }
  if (samples.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        <Mic2 size={32} className="opacity-40" />
        <p className="text-sm">{t("speakingSamples.empty")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {samples.map((sample) => (
        <article key={sample.speaking_sample_id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-card-foreground">{sample.file_name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {new Date(sample.created_at).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}
              </p>
            </div>
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(sample)}
                aria-label={t("speakingSamples.delete")}
                className="rounded-lg p-2 text-destructive transition-colors hover:bg-destructive/10"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
          {sample.media_type === "audio" ? (
            <audio
              controls
              preload="metadata"
              key={mediaUrls[sample.speaking_sample_id] ?? sample.speaking_sample_id}
              onError={() => setPlaybackErrors((current) => ({ ...current, [sample.speaking_sample_id]: true }))}
              className="w-full"
            >
              {mediaUrls[sample.speaking_sample_id] && (
                <source src={mediaUrls[sample.speaking_sample_id]} type={inferPlaybackContentType(sample)} />
              )}
            </audio>
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              key={mediaUrls[sample.speaking_sample_id] ?? sample.speaking_sample_id}
              onError={() => setPlaybackErrors((current) => ({ ...current, [sample.speaking_sample_id]: true }))}
              className="max-h-80 w-full rounded-xl bg-black"
            >
              {mediaUrls[sample.speaking_sample_id] && (
                <source src={mediaUrls[sample.speaking_sample_id]} type={inferPlaybackContentType(sample)} />
              )}
            </video>
          )}
          {playbackErrors[sample.speaking_sample_id] && (
            <p className="mt-2 text-sm text-destructive">
              {t("speakingSamples.playbackError")}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

export function StudentSpeakingSamplesPage() {
  const { t } = useLanguage();
  const [studentUid, setStudentUid] = useState("");
  const [samples, setSamples] = useState<SpeakingSample[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshSamples(uid: string) {
    const result = await loadSpeakingSamples(uid);
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setSamples(result.samples);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      setStudentUid(uid);
      const result = await loadSpeakingSamples(uid);
      if (cancelled) return;
      if (result.error) setError(result.error.message);
      else setSamples(result.samples);
      setLoading(false);
    }

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, []);

  async function uploadSample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedFile || !studentUid) return;

    setSaving(true);
    setError("");
    setMessage("");

    const fileConfig = allowedFileTypes[selectedFile.type];
    if (!fileConfig) {
      setError(t("speakingSamples.typeError"));
      setSaving(false);
      return;
    }
    if (selectedFile.size <= 0 || selectedFile.size > maxFileSize) {
      setError(t("speakingSamples.sizeError"));
      setSaving(false);
      return;
    }

    try {
      const duration = await getMediaDuration(selectedFile, fileConfig.mediaType);
      if (!Number.isFinite(duration) || duration <= 0 || duration > maxDurationSeconds) {
        setError(t("speakingSamples.durationError"));
        setSaving(false);
        return;
      }
    } catch (durationError) {
      console.error("Speaking sample duration check failed", durationError);
      setError(t("speakingSamples.typeError"));
      setSaving(false);
      return;
    }

    const storagePath = `${studentUid}/${crypto.randomUUID()}.${fileConfig.extension}`;
    const { error: uploadError } = await supabase.storage
      .from(speakingSamplesBucket)
      .upload(storagePath, selectedFile, {
        contentType: selectedFile.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Speaking sample storage upload failed", uploadError);
      setError(uploadError.message);
      setSaving(false);
      return;
    }

    const { data: insertedSample, error: insertError } = await supabase
      .from("speaking_samples")
      .insert({
        student_uid: studentUid,
        storage_path: storagePath,
        file_name: selectedFile.name.slice(0, 255),
        media_type: fileConfig.mediaType,
      })
      .select("speaking_sample_id, student_uid, storage_path, file_name, media_type, created_at")
      .single();

    if (insertError) {
      console.error("Speaking sample database insert failed", insertError);
      await supabase.storage.from(speakingSamplesBucket).remove([storagePath]);
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setSelectedFile(null);
    setMessage(t("speakingSamples.uploaded"));
    if (insertedSample) {
      setSamples((current) => [insertedSample as SpeakingSample, ...current]);
    } else {
      setLoading(true);
      await refreshSamples(studentUid);
    }
    setSaving(false);
  }

  async function deleteSample(sample: SpeakingSample) {
    setError("");
    setMessage("");
    const { error: storageError } = await supabase.storage
      .from(speakingSamplesBucket)
      .remove([sample.storage_path]);
    if (storageError) {
      setError(storageError.message);
      return;
    }

    const { error: deleteError } = await supabase
      .from("speaking_samples")
      .delete()
      .eq("speaking_sample_id", sample.speaking_sample_id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setSamples((current) => current.filter((item) => item.speaking_sample_id !== sample.speaking_sample_id));
    setMessage(t("speakingSamples.deleted"));
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-foreground">{t("speakingSamples.title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("speakingSamples.help")}</p>
      </div>

      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
        {t("speakingSamples.visibilityNotice")}
      </div>

      <form onSubmit={uploadSample} className="rounded-2xl border border-border bg-card p-5">
        <label className="block">
          <span className="text-sm font-medium text-card-foreground">{t("speakingSamples.chooseFile")}</span>
          <input
            required
            type="file"
            accept="audio/*,video/*"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
            className="mt-2 block w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:text-primary-foreground"
          />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">{t("speakingSamples.fileHelp")}</p>
        <button
          type="submit"
          disabled={saving || !selectedFile}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Upload size={16} />
          {saving ? t("speakingSamples.uploading") : t("speakingSamples.upload")}
        </button>
      </form>

      {error && <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {message && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

      <SampleGallery samples={samples} loading={loading} onDelete={(sample) => void deleteSample(sample)} />
    </div>
  );
}

export function SpeakingSamplesViewerPage({ studentUid }: { studentUid: string }) {
  const { t } = useLanguage();
  const [samples, setSamples] = useState<SpeakingSample[]>([]);
  const [studentName, setStudentName] = useState("");
  const [backHref, setBackHref] = useState("/");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        if (!cancelled) {
          setError(t("speakingSamples.signInRequired"));
          setLoading(false);
        }
        return;
      }

      const [viewerProfileResult, accessResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("role")
          .eq("uid", authData.user.id)
          .maybeSingle(),
        supabase.rpc(
          "can_view_student_speaking_samples",
          { p_student_uid: studentUid }
        ),
      ]);
      const { data: viewerProfile } = viewerProfileResult;
      const viewerRole = viewerProfile?.role;
      setBackHref(
        viewerRole === "admin"
          ? "/admin-dashboard"
          : viewerRole === "tutor"
            ? "/tutor-dashboard"
            : "/student-dashboard"
      );

      const { data: allowed, error: accessError } = accessResult;
      if (accessError || !allowed) {
        if (!cancelled) {
          setError(t("speakingSamples.notAuthorized"));
          setLoading(false);
        }
        return;
      }

      const [{ data: profile }, result] = await Promise.all([
        supabase.from("profiles").select("name").eq("uid", studentUid).maybeSingle(),
        loadSpeakingSamples(studentUid),
      ]);
      if (cancelled) return;
      if (result.error) setError(result.error.message);
      else {
        setStudentName(profile?.name ?? t("common.student"));
        setSamples(result.samples);
      }
      setLoading(false);
    }

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [studentUid, t]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <Link href={backHref} className="inline-flex w-fit items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} />
          {t("speakingSamples.back")}
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{t("speakingSamples.studentTitle", { name: studentName || t("common.student") })}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("speakingSamples.viewerHelp")}</p>
        </div>
        {error ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        ) : (
          <SampleGallery samples={samples} loading={loading} />
        )}
      </div>
    </main>
  );
}
