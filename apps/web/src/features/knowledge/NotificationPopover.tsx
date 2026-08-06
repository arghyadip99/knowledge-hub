import { BellRing, CheckCheck, Sparkles } from "lucide-react";
import type { NotificationSummary } from "../../types/knowledge";

export function NotificationPopover({
  summary,
  markRead,
}: {
  summary: NotificationSummary;
  markRead: () => void;
}) {
  const notification = summary.notification;
  return (
    <section className="notification-popover" aria-label="Notifications">
      <div className="notification-heading">
        <div>
          <p className="eyebrow">YOUR INBOX</p>
          <h2>Notifications</h2>
        </div>
        <BellRing size={18} />
      </div>
      {notification ? (
        <article className="notification-card">
          <span className="notification-icon">
            <Sparkles size={17} />
          </span>
          <div>
            <b>
              {notification.count} new knowledge {notification.count === 1 ? "card" : "cards"} published
            </b>
            <p>
              {notification.latestEntryTitle
                ? `Latest: ${notification.latestEntryTitle}`
                : "Your library has new ideas to explore."}
            </p>
            <button onClick={markRead}>
              <CheckCheck size={15} /> Mark as read
            </button>
          </div>
        </article>
      ) : (
        <div className="notification-empty">
          <span className="notification-icon">
            <CheckCheck size={17} />
          </span>
          <div>
            <b>You are all caught up.</b>
            <p>Newly published knowledge will appear here.</p>
          </div>
        </div>
      )}
    </section>
  );
}
