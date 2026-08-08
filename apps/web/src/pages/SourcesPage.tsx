import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, FileText, Play } from "lucide-react";
import { api } from "../lib/api";
import { getSession } from "../features/auth/session";
import { pageMotion } from "../features/ui/Modal";
import type { Source } from "../types/knowledge";

type Tab =
  | "all"
  | "needs_review"
  | "in_progress"
  | "approved"
  | "attention"
  | "archived";

const tabs: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs_review", label: "Ready for review" },
  { id: "in_progress", label: "In progress" },
  { id: "approved", label: "Approved" },
  { id: "attention", label: "Needs attention" },
  { id: "archived", label: "Archived" },
];

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

const matchesTab = (status: string, tab: Tab) => {
  if (tab === "all") return status !== "archived";
  if (tab === "needs_review") return status === "ready_for_review";
  if (tab === "in_progress") return status === "queued" || status === "processing";
  if (tab === "approved") return status === "approved";
  if (tab === "archived") return status === "archived";
  return status === "failed" || status === "rejected";
};

export function SourcesPage() {
  const isAdmin = getSession()?.user.role === "admin";
  const [sources, setSources] = useState<Source[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      api<Source[]>("/api/sources"),
      isAdmin ? api<Source[]>("/api/sources?status=archived") : Promise.resolve([]),
    ])
      .then(([active, archived]) => setSources([...active, ...archived]))
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load sources",
        ),
      );
  }, [isAdmin]);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        tabs.map((item) => [
          item.id,
          sources.filter((source) => matchesTab(source.status, item.id)).length,
        ]),
      ) as Record<Tab, number>,
    [sources],
  );
  const shown = useMemo(
    () => sources.filter((source) => matchesTab(source.status, tab)),
    [sources, tab],
  );

  return (
    <motion.main className="route-page sources-page" {...pageMotion}>
      <a className="back" href="/">
        ← Back to library
      </a>
      <header className="route-header">
        <p className="eyebrow">CAPTURED SOURCES</p>
        <h1>Everything you've captured.</h1>
        <p>
          {isAdmin
            ? "Every source lands here first. Open one to paste a transcript, run the AI draft, and approve what deserves a place in your library."
            : "Sources that have already become approved knowledge."}
        </p>
      </header>
      {error && <p className="form-error">{error}</p>}
      <div className="action-tabs">
        {tabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "selected" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            <b>{counts[item.id]}</b>
          </button>
        ))}
      </div>
      <div className="source-list">
        {shown.map((source) => (
          <a className="source-row" href={`/sources/${source._id}`} key={source._id}>
            {source.thumbnailUrl ? (
              <span className="source-thumb">
                <img src={source.thumbnailUrl} alt="" loading="lazy" />
              </span>
            ) : (
              <span className="source-icon">
                {source.type === "youtube" || source.type === "podcast" ? (
                  <Play size={16} />
                ) : (
                  <FileText size={16} />
                )}
              </span>
            )}
            <span>
              <b>{source.title}</b>
              <small>
                {source.creatorName || "Personal source"} ·{" "}
                {source.ingestionMetadata?.progress?.message ||
                  statusLabel[source.status] ||
                  source.status}
              </small>
            </span>
            <span className={"source-status " + source.status}>
              {statusLabel[source.status] || source.status}
            </span>
            <ChevronRight size={18} />
          </a>
        ))}
        {!shown.length && (
          <div className="empty">
            {tab === "all"
              ? "No sources yet. Capture one from the library."
              : "Nothing here right now."}
          </div>
        )}
      </div>
    </motion.main>
  );
}
