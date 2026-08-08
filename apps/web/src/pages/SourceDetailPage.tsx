import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArchiveRestore,
  ArrowUpRight,
  Check,
  CircleX,
  FileText,
  LoaderCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import { getSession } from "../features/auth/session";
import { getEmbedUrl } from "../lib/embed";
import { pageMotion } from "../features/ui/Modal";
import type { SourceDetail } from "../types/knowledge";

const statusLabel: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  ready_for_review: "Ready for review",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Failed",
  archived: "Archived",
};

type EditForm = { title: string; creatorName: string; url: string; rawText: string };

const toForm = (detail: SourceDetail): EditForm => ({
  title: detail.source.title,
  creatorName: detail.source.creatorName || "",
  url: detail.source.url || "",
  rawText: detail.source.rawText || "",
});

export function SourceDetailPage({ id }: { id: string }) {
  const isAdmin = getSession()?.user.role === "admin";
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [savingEdits, setSavingEdits] = useState(false);
  const formTouched = useRef(false);

  const reload = () =>
    api<SourceDetail>(`/api/sources/${id}`).then((value) => {
      setDetail(value);
      if (!formTouched.current) setForm(toForm(value));
    });

  useEffect(() => {
    void reload().catch((requestError) =>
      setLoadError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load source",
      ),
    );
  }, [id]);

  useEffect(() => {
    const status = detail?.source.status;
    if (status !== "queued" && status !== "processing") return;
    const interval = window.setInterval(() => void reload().catch(() => undefined), 3000);
    return () => window.clearInterval(interval);
  }, [detail?.source.status]);

  if (loadError)
    return (
      <main className="route-page">
        <a className="back" href="/sources">
          ← Back to sources
        </a>
        <p>{loadError}</p>
      </main>
    );
  if (!detail || !form)
    return (
      <main className="route-page">
        <p>Loading source…</p>
      </main>
    );

  const { source, entry, ideas, quotes, runs } = detail;
  const embedUrl = getEmbedUrl(source);
  const progress = source.ingestionMetadata?.progress;
  const latestRun = runs[0];
  const ready = source.status === "ready_for_review";
  const processing = source.status === "processing" || source.status === "queued";
  const approved = source.status === "approved";
  const archived = source.status === "archived";
  const editable = !approved && !archived;
  const canProcess = editable && !processing && Boolean(source.rawText.trim());
  const dirty =
    form.title !== source.title ||
    form.creatorName !== (source.creatorName || "") ||
    form.url !== (source.url || "") ||
    form.rawText !== (source.rawText || "");

  const process = async () => {
    setBusy(true);
    try {
      await api(`/api/sources/${id}/process`, { method: "POST" });
      await reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to start the AI draft",
      );
    } finally {
      setBusy(false);
    }
  };
  const approve = async () => {
    setBusy(true);
    try {
      const result = await api<{ entry: { _id: string } }>(
        `/api/sources/${id}/approve`,
        { method: "POST" },
      );
      window.location.assign(`/knowledge/${result.entry._id}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to approve this draft",
      );
      setBusy(false);
    }
  };
  const reject = async () => {
    if (!window.confirm("Reject this draft? You can edit the source and reprocess later."))
      return;
    setBusy(true);
    try {
      await api(`/api/sources/${id}/reject`, { method: "POST" });
      await reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reject this draft",
      );
    } finally {
      setBusy(false);
    }
  };
  const saveEdits = async () => {
    setSavingEdits(true);
    try {
      await api(`/api/sources/${id}`, {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      formTouched.current = false;
      await reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save changes",
      );
    } finally {
      setSavingEdits(false);
    }
  };
  const archive = async () => {
    if (
      !window.confirm(
        `Archive "${source.title}"? It's hidden from the active queue but stays recoverable.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/sources/${id}/archive`, { method: "POST" });
      await reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to archive this source",
      );
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    setBusy(true);
    try {
      await api(`/api/sources/${id}/restore`, { method: "POST" });
      await reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to restore this source",
      );
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !window.confirm(
        `Permanently delete "${source.title}"? This removes its transcript, drafts and any linked knowledge card. This cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    try {
      await api(`/api/sources/${id}`, { method: "DELETE" });
      window.location.assign("/sources");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete this source",
      );
      setBusy(false);
    }
  };

  return (
    <motion.main className="route-page" {...pageMotion}>
      <a className="back" href="/sources">
        ← Back to sources
      </a>
      {embedUrl && (
        <div className="route-thumb is-embed">
          <iframe
            src={embedUrl}
            title={source.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}
      <div className="review-source">
        <span className="source-icon">
          <FileText size={20} />
        </span>
        <div>
          <p className="eyebrow">
            {source.type} · {source.focusArea || "General"}
          </p>
          <h2>{source.title}</h2>
          <p>
            {source.creatorName || "Personal source"} ·{" "}
            {detail.chunks.length ? `${detail.chunks.length} transcript chunks` : "no transcript chunks yet"}
          </p>
        </div>
      </div>
      <div className={"processing-state " + source.status}>
        {source.status === "processing" ? (
          <LoaderCircle className="spin" />
        ) : ready ? (
          <Check />
        ) : (
          <Sparkles />
        )}
        <div>
          <b>{progress?.message || source.failureReason || statusLabel[source.status] || source.status}</b>
          <p>
            {source.status === "processing" && progress?.total
              ? `${progress.completed || 0} of ${progress.total} chunks processed · ${progress.candidates || 0} candidate insights`
              : latestRun?.rawOutput?.usedFallback
                ? "A fallback draft was used for one or more stages. Review carefully."
                : entry
                  ? "Every insight is linked back to transcript evidence."
                  : "No AI draft yet."}
          </p>
        </div>
      </div>
      {source.status === "processing" && (
        <div className="progress">
          <i
            style={{
              width: `${Math.round(((progress?.completed || 0) / (progress?.total || 1)) * 100)}%`,
            }}
          />
        </div>
      )}
      {approved && entry && (
        <a className="source-link" href={`/knowledge/${entry._id}`}>
          Open the knowledge card <ArrowUpRight size={15} />
        </a>
      )}
      {isAdmin && editable && (
        <div className="transcript-paste">
          <div className="field-row">
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => {
                  formTouched.current = true;
                  setForm({ ...form, title: event.target.value });
                }}
              />
            </label>
            <label>
              Creator / publication
              <input
                value={form.creatorName}
                onChange={(event) => {
                  formTouched.current = true;
                  setForm({ ...form, creatorName: event.target.value });
                }}
              />
            </label>
          </div>
          <label>
            Source URL
            <input
              value={form.url}
              onChange={(event) => {
                formTouched.current = true;
                setForm({ ...form, url: event.target.value });
              }}
            />
          </label>
          <label>
            Transcript or source text
            <textarea
              value={form.rawText}
              onChange={(event) => {
                formTouched.current = true;
                setForm({ ...form, rawText: event.target.value });
              }}
              rows={6}
            />
          </label>
          <button
            className="ghost"
            disabled={savingEdits || !dirty || !form.title.trim()}
            onClick={() => void saveEdits()}
          >
            {savingEdits ? "Saving…" : "Save changes"}
          </button>
        </div>
      )}
      <div className="review-grid">
        <div>
          <span>TRANSCRIPT</span>
          <b>{source.rawText ? "Available" : "Needed"}</b>
        </div>
        <div>
          <span>CANDIDATES</span>
          <b>{progress?.candidates || latestRun?.rawOutput?.candidates || 0}</b>
        </div>
        <div>
          <span>FINAL NUGGETS</span>
          <b>{ideas.length || progress?.ideas || 0}</b>
        </div>
      </div>
      {entry && (
        <div className="draft-summary">
          <p className="eyebrow">CENTRAL THESIS</p>
          <h3>{entry.centralThesis}</h3>
          <p>{entry.summary}</p>
        </div>
      )}
      {ideas.length > 0 && (
        <div className="idea-review">
          <div className="review-heading">
            <p className="eyebrow">GENERATED KNOWLEDGE · {ideas.length} INSIGHTS</p>
          </div>
          {ideas.map((idea, index) => (
            <div className="idea-row" key={idea._id}>
              <div>
                <b>
                  {index + 1}. {idea.title}
                </b>
                <p>{idea.explanation}</p>
                <small>
                  {idea.confidence ? `${Math.round(idea.confidence * 100)}% confidence` : ""}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      {quotes.length > 0 && (
        <div className="idea-review">
          <p className="eyebrow">QUOTES</p>
          {quotes.map((quote) => (
            <blockquote key={quote._id}>“{quote.text}”</blockquote>
          ))}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      {isAdmin && !approved && (
        <div className="review-actions">
          {canProcess && (
            <button className="add" disabled={busy} onClick={() => void process()}>
              <Sparkles size={16} />
              {busy
                ? "Starting…"
                : entry
                  ? "Reprocess full transcript"
                  : "Create AI draft"}
            </button>
          )}
          {ready && (
            <button className="add" disabled={busy} onClick={() => void approve()}>
              <Check size={16} />
              {busy ? "Approving…" : "Approve knowledge"}
            </button>
          )}
          {ready && (
            <button className="ghost" disabled={busy} onClick={() => void reject()}>
              <CircleX size={16} />
              Reject
            </button>
          )}
          {processing && (
            <button className="ghost" onClick={() => void reload()}>
              Refresh progress
            </button>
          )}
          {archived ? (
            <button className="ghost" disabled={busy} onClick={() => void restore()}>
              <ArchiveRestore size={16} />
              Restore
            </button>
          ) : (
            <button className="ghost" disabled={busy} onClick={() => void archive()}>
              <ArchiveRestore size={16} />
              Archive
            </button>
          )}
          <button className="ghost danger" disabled={busy} onClick={() => void remove()}>
            <Trash2 size={16} />
            Delete permanently
          </button>
        </div>
      )}
    </motion.main>
  );
}
