import { Heart, MessageCircle, Send, Share2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import type { Engagement, Entry } from "../../types/knowledge";

type Props = {
  entry: Entry;
  onChange: (engagement: Engagement) => void;
};

export function EngagementPanel({ entry, onChange }: Props) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const engagement = entry.engagement;
  const count = (value: number) => (value ? value : "");

  const resonate = async () => {
    setBusy(true);
    try {
      onChange(
        await api<Engagement>(`/api/knowledge/${entry._id}/resonate`, {
          method: "POST",
        }),
      );
    } finally {
      setBusy(false);
    }
  };
  const submitComment = async () => {
    if (!comment.trim()) return;
    setBusy(true);
    try {
      onChange(
        await api<Engagement>(`/api/knowledge/${entry._id}/comments`, {
          method: "POST",
          body: JSON.stringify({ text: comment }),
        }),
      );
      setComment("");
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    const url = `${window.location.origin}/knowledge/${entry._id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: entry.title, text: entry.centralThesis, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      onChange(
        await api<Engagement>(`/api/knowledge/${entry._id}/share`, {
          method: "POST",
        }),
      );
    } catch (error) {
      // Closing a native share sheet is an expected cancellation, not an app error.
      if (!(error instanceof DOMException && error.name === "AbortError")) throw error;
    }
  };

  return (
    <section className="engagement" aria-label={`Engagement for ${entry.title}`}>
      <div className="engagement-actions">
        <button
          className={engagement?.viewerResonated ? "active" : ""}
          disabled={busy}
          onClick={() => void resonate()}
          aria-pressed={engagement?.viewerResonated || false}
        >
          <Heart size={15} fill={engagement?.viewerResonated ? "currentColor" : "none"} />
          {engagement?.viewerResonated ? "Resonated" : "Resonate"}
          <span>{count(engagement?.resonatedCount || 0)}</span>
        </button>
        <button onClick={() => setCommentsOpen((open) => !open)}>
          <MessageCircle size={15} /> Comment <span>{count(engagement?.commentCount || 0)}</span>
        </button>
        <button onClick={() => void share()}>
          <Share2 size={15} /> Share <span>{count(engagement?.shareCount || 0)}</span>
        </button>
      </div>
      {commentsOpen && (
        <div className="comments-panel">
          {engagement?.comments.length ? (
            <div className="comment-list">
              {engagement.comments.map((item) => (
                <article key={item.id} className="comment-item">
                  <b>{item.authorName}</b>
                  <time>{new Date(item.createdAt).toLocaleDateString()}</time>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="comments-empty">Start the conversation around this idea.</p>
          )}
          <div className="comment-compose">
            <input
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void submitComment();
              }}
              placeholder="Add a thoughtful comment"
              aria-label="Write a comment"
            />
            <button disabled={busy || !comment.trim()} onClick={() => void submitComment()} aria-label="Post comment">
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
