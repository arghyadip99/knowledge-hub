import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ListenPanel } from "../features/knowledge/ListenPanel";
import { EngagementPanel } from "../features/knowledge/EngagementPanel";
import { api } from "../lib/api";
import { getEmbedUrl } from "../lib/embed";
import { pageMotion } from "../features/ui/Modal";
import type { Detail, Engagement } from "../types/knowledge";

export function KnowledgePage({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [actionText, setActionText] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [lessonPage, setLessonPage] = useState(1);

  const reload = () => api<Detail>(`/api/knowledge/${id}`).then(setDetail);
  useEffect(() => {
    setLessonPage(1);
    void reload().catch((requestError) => setError(requestError.message));
  }, [id]);

  if (error)
    return (
      <main className="route-page">
        <a href="/">← Back to library</a>
        <p>{error}</p>
      </main>
    );
  if (!detail)
    return (
      <main className="route-page">
        <p>Loading knowledge…</p>
      </main>
    );

  const { entry, source, ideas, quotes, actions, ships } = detail;
  const embedUrl = getEmbedUrl(source);
  const lessonsPerPage = 5;
  const lessonPageCount = Math.max(1, Math.ceil(ideas.length / lessonsPerPage));
  const currentLessonPage = Math.min(lessonPage, lessonPageCount);
  const visibleLessons = ideas.slice(
    (currentLessonPage - 1) * lessonsPerPage,
    currentLessonPage * lessonsPerPage,
  );
  const addAction = async () => {
    if (!entry || !actionText.trim()) return;
    setSaving(true);
    try {
      await api(`/api/knowledge/${entry._id}/actions`, {
        method: "POST",
        body: JSON.stringify({ text: actionText, reminderFrequency: "weekly" }),
      });
      setActionText("");
      await reload();
    } finally {
      setSaving(false);
    }
  };
  const saveReflection = async () => {
    if (!entry || !reflection.trim()) return;
    setSaving(true);
    try {
      await api(`/api/knowledge/${entry._id}/reviews`, {
        method: "POST",
        body: JSON.stringify({ reflection, didIApplyIt: true }),
      });
      setReflection("");
    } finally {
      setSaving(false);
    }
  };
  const updateEngagement = (engagement: Engagement) =>
    setDetail((current) =>
      current?.entry
        ? { ...current, entry: { ...current.entry, engagement } }
        : current,
    );

  return (
    <motion.main className="route-page" {...pageMotion}>
      <a className="back" href="/">
        ← Back to library
      </a>
      {embedUrl ? (
        <div className="route-thumb is-embed">
          <iframe
            src={embedUrl}
            title={entry?.title || source.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        source.thumbnailUrl && (
          <div className="route-thumb">
            <img src={source.thumbnailUrl} alt="" loading="lazy" />
          </div>
        )
      )}
      <header className="route-header">
        <p className="eyebrow">
          {source.type} ·{" "}
          {ships.map((ship) => ship.name).join(" · ") || "Unassigned"}
        </p>
        <h1>{entry?.title || source.title}</h1>
        <p>{entry?.captainName || source.creatorName || "Personal source"}</p>
        {source.url && (
          <a
            className="source-link"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            Open original source <ArrowUpRight size={15} />
          </a>
        )}
      </header>
      {entry && (
        <>
          <ListenPanel
            title={entry.title}
            thesis={entry.centralThesis}
            summary={entry.summary}
            lessons={ideas}
          />
          <section className="route-thesis">
            <p className="eyebrow">CENTRAL THESIS</p>
            <h2>{entry.centralThesis}</h2>
            <p>{entry.summary}</p>
          </section>
          <EngagementPanel entry={entry} onChange={updateEngagement} />
          <section className="route-section">
            <div className="lesson-heading">
              <p className="eyebrow">LESSONS</p>
              {ideas.length > lessonsPerPage && (
                <span>
                  {Math.min(
                    (currentLessonPage - 1) * lessonsPerPage + 1,
                    ideas.length,
                  )}
                  –{Math.min(currentLessonPage * lessonsPerPage, ideas.length)} of{" "}
                  {ideas.length}
                </span>
              )}
            </div>
            {visibleLessons.map((idea, index) => (
              <article className="route-lesson" key={idea._id}>
                <b>
                  {String(
                    (currentLessonPage - 1) * lessonsPerPage + index + 1,
                  ).padStart(2, "0")}
                </b>
                <div>
                  <h3>{idea.title}</h3>
                  <p>{idea.explanation}</p>
                </div>
              </article>
            ))}
            {ideas.length > lessonsPerPage && (
              <nav className="pagination lesson-pagination" aria-label="Lesson pages">
                <button
                  disabled={currentLessonPage === 1}
                  onClick={() =>
                    setLessonPage((page) => Math.max(1, page - 1))
                  }
                >
                  Previous lessons
                </button>
                <span>
                  Page {currentLessonPage} of {lessonPageCount}
                </span>
                <button
                  disabled={currentLessonPage === lessonPageCount}
                  onClick={() =>
                    setLessonPage((page) => Math.min(lessonPageCount, page + 1))
                  }
                >
                  Next lessons
                </button>
              </nav>
            )}
          </section>
          {quotes.length > 0 && (
            <section className="route-section">
              <p className="eyebrow">QUOTES</p>
              {quotes.map((quote) => (
                <blockquote key={quote._id}>“{quote.text}”</blockquote>
              ))}
            </section>
          )}
          <section className="route-section application-panel">
            <p className="eyebrow">PUT IT INTO PRACTICE</p>
            <input
              value={actionText}
              onChange={(event) => setActionText(event.target.value)}
              placeholder="One concrete action to try"
            />
            <button
              className="add"
              disabled={saving || !actionText.trim()}
              onClick={() => void addAction()}
            >
              Add action
            </button>
            <div className="action-list">
              {actions.map((action) => (
                <p key={action._id}>
                  • {action.text} <small>({action.reminderFrequency})</small>
                </p>
              ))}
            </div>
            <textarea
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="What happened when you applied this?"
              rows={3}
            />
            <button
              className="ghost"
              disabled={saving || !reflection.trim()}
              onClick={() => void saveReflection()}
            >
              Save reflection
            </button>
          </section>
        </>
      )}
    </motion.main>
  );
}
