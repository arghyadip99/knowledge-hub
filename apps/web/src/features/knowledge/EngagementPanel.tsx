import { Copy, Heart, Linkedin, Mail, MessageCircle, Send, Share2, Twitter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { api } from "../../lib/api";
import { ShareArtifactButton } from "./ArtifactCard";
import { buildShareLinks } from "../../lib/shareLinks";
import type { Engagement, Entry } from "../../types/knowledge";

type Props = {
  entry: Entry;
  onChange: (engagement: Engagement) => void;
  // Feed cards are compact and now carry a ship-themed cover image, so the "share as
  // artifact image" action is reserved for the knowledge detail page where it has room.
  allowImageShare?: boolean;
};

// lucide-react has no WhatsApp glyph, so this is a small self-contained brand mark
// sized to match the surrounding lucide icons rather than pulling in an icon library.
const WhatsAppIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.01 0C5.4 0 .04 5.36.04 11.97c0 2.11.55 4.09 1.51 5.81L0 24l6.38-1.53a11.9 11.9 0 0 0 5.63 1.44h.01c6.61 0 11.97-5.36 11.97-11.96C23.99 5.36 18.63 0 12.01 0zm0 21.77a9.77 9.77 0 0 1-4.98-1.37l-.36-.21-3.71.89.98-3.62-.23-.37a9.76 9.76 0 0 1-1.5-5.12c0-5.4 4.39-9.79 9.8-9.79 2.62 0 5.08 1.02 6.93 2.88a9.73 9.73 0 0 1 2.87 6.91c0 5.4-4.39 9.8-9.8 9.8z" />
    <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.19-.57-.35z" />
  </svg>
);

export function EngagementPanel({ entry, onChange, allowImageShare = true }: Props) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const engagement = entry.engagement;
  const count = (value: number) => (value ? value : "");
  const shareUrl = `${window.location.origin}/knowledge/${entry._id}`;
  const shareLinks = buildShareLinks({
    title: entry.title,
    text: entry.centralThesis,
    url: shareUrl,
  });

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
  const recordShare = async () => {
    try {
      onChange(
        await api<Engagement>(`/api/knowledge/${entry._id}/share`, {
          method: "POST",
        }),
      );
    } catch {
      /* the share itself already happened; a failed count bump shouldn't surface as an error */
    }
  };
  const choosePlatform = () => {
    setShareOpen(false);
    void recordShare();
  };
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } finally {
      choosePlatform();
    }
  };

  return (
    <section className="engagement" aria-label={`Engagement for ${entry.title}`}>
      <div className="engagement-actions">
        <motion.button
          className={engagement?.viewerResonated ? "active" : ""}
          disabled={busy}
          onClick={() => void resonate()}
          aria-pressed={engagement?.viewerResonated || false}
          whileTap={{ scale: 0.9 }}
        >
          <motion.span
            animate={engagement?.viewerResonated ? { scale: [1, 1.35, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart size={15} fill={engagement?.viewerResonated ? "currentColor" : "none"} />
          </motion.span>
          {engagement?.viewerResonated ? "Resonated" : "Resonate"}
          <span>{count(engagement?.resonatedCount || 0)}</span>
        </motion.button>
        <button onClick={() => setCommentsOpen((open) => !open)}>
          <MessageCircle size={15} /> Comment <span>{count(engagement?.commentCount || 0)}</span>
        </button>
        <div className="share-menu-wrap">
          <button
            onClick={() => setShareOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={shareOpen}
          >
            <Share2 size={15} /> Share <span>{count(engagement?.shareCount || 0)}</span>
          </button>
          <AnimatePresence>
            {shareOpen && (
              <motion.div
                className="menu-popover share-menu"
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              >
                <a role="menuitem" href={shareLinks.x} target="_blank" rel="noopener noreferrer" onClick={choosePlatform}>
                  <Twitter size={15} /> X (Twitter)
                </a>
                <a role="menuitem" href={shareLinks.linkedin} target="_blank" rel="noopener noreferrer" onClick={choosePlatform}>
                  <Linkedin size={15} /> LinkedIn
                </a>
                <a role="menuitem" href={shareLinks.whatsapp} target="_blank" rel="noopener noreferrer" onClick={choosePlatform}>
                  <WhatsAppIcon /> WhatsApp
                </a>
                <a role="menuitem" href={shareLinks.email} onClick={choosePlatform}>
                  <Mail size={15} /> Email
                </a>
                <button role="menuitem" onClick={() => void copyLink()}>
                  <Copy size={15} /> Copy link
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {allowImageShare && <ShareArtifactButton entry={entry} onError={setImageError} />}
      </div>
      {imageError && <p className="form-error">{imageError}</p>}
      <AnimatePresence initial={false}>
        {commentsOpen && (
          <motion.div
            className="comments-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
