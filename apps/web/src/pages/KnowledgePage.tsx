import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ListenPanel } from "../features/knowledge/ListenPanel";
import { api } from "../lib/api";
import type { Detail } from "../types/knowledge";

export function KnowledgePage({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [actionText, setActionText] = useState("");
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = () => api<Detail>(`/api/knowledge/${id}`).then(setDetail);
  useEffect(() => {
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

  return (
    <main className="route-page">
      <a className="back" href="/">
        ← Back to library
      </a>
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
          <section className="route-section">
            <p className="eyebrow">LESSONS</p>
            {ideas.map((idea, index) => (
              <article className="route-lesson" key={idea._id}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <div>
                  <h3>{idea.title}</h3>
                  <p>{idea.explanation}</p>
                </div>
              </article>
            ))}
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
    </main>
  );
}
