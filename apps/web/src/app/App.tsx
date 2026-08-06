import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArchiveRestore,
  ArrowUpRight,
  Bell,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  CirclePlus,
  Compass,
  FileText,
  FolderHeart,
  Lightbulb,
  MoreHorizontal,
  Pencil,
  Pause,
  Play,
  Plus,
  Search,
  ShipWheel,
  Sparkles,
  Tag,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { AuthPage } from "../features/auth/AuthPage";
import { NotificationPopover } from "../features/knowledge/NotificationPopover";
import { EngagementPanel } from "../features/knowledge/EngagementPanel";
import {
  clearSession,
  getSession,
  type AuthSession,
} from "../features/auth/session";
import { KnowledgePage as KnowledgeRoutePage } from "../pages/KnowledgePage";
import { ShipsPage as ShipsRoutePage } from "../pages/ShipsPage";
import {
  emptyDashboard as blank,
  type Action,
  type Dashboard,
  type Detail,
  type Engagement,
  type Entry,
  type Idea,
  type NotificationSummary,
  type Ship,
  type Source,
} from "../types/knowledge";
import "../styles.css";

function App() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    getSession(),
  );
  useEffect(() => {
    const sync = () => setSession(getSession());
    window.addEventListener("knowledge-hub:auth", sync);
    return () => window.removeEventListener("knowledge-hub:auth", sync);
  }, []);
  if (!session) return <AuthPage onAuthenticated={setSession} />;
  return <AuthenticatedApp session={session} />;
}

function AuthenticatedApp({ session }: { session: AuthSession }) {
  const path = window.location.pathname;
  if (path === "/ships") return <ShipsRoutePage />;
  const knowledgeMatch = path.match(/^\/knowledge\/([a-f\d]{24})$/i);
  if (knowledgeMatch) return <KnowledgeRoutePage id={knowledgeMatch[1]} />;
  const [dashboard, setDashboard] = useState(blank),
    [entries, setEntries] = useState<Entry[]>([]),
    [sources, setSources] = useState<Source[]>([]),
    [ships, setShips] = useState<Ship[]>([]),
    [active, setActive] = useState("all"),
    [query, setQuery] = useState(""),
    [capture, setCapture] = useState(false),
    [manageShips, setManageShips] = useState(false),
    [detail, setDetail] = useState<Detail | null>(null),
    [editing, setEditing] = useState<Entry | null>(null),
    [flagging, setFlagging] = useState<Entry | null>(null),
    [quizOpen, setQuizOpen] = useState(false),
    [importOpen, setImportOpen] = useState(false),
    [archiveOpen, setArchiveOpen] = useState(false),
    [graphOpen, setGraphOpen] = useState(false),
    [mobileMenuOpen, setMobileMenuOpen] = useState(false),
    [notificationOpen, setNotificationOpen] = useState(false),
    [notifications, setNotifications] = useState<NotificationSummary>({
      unreadCount: 0,
      notification: null,
    }),
    [notice, setNotice] = useState("");
  const refreshNotifications = () =>
    api<NotificationSummary>("/api/notifications").then(setNotifications);
  const load = async () => {
    try {
      const [d, e, s, h] = await Promise.all([
        api<Dashboard>("/api/dashboard"),
        api<Entry[]>("/api/knowledge"),
        api<Source[]>("/api/sources"),
        api<Ship[]>("/api/ships"),
      ]);
      setDashboard(d);
      setEntries(e);
      setSources(s);
      setShips(h);
      if (!e.length && session.user.role === "admin") {
        void api<{
          database: string;
          host: string;
          counts: { knowledgeEntries: number; visibleEntries: number };
        }>("/api/debug/database")
          .then((diagnostic) =>
            setNotice(
              `Database check: ${diagnostic.database} on ${diagnostic.host} has ${diagnostic.counts.visibleEntries} visible cards (${diagnostic.counts.knowledgeEntries} total).`,
            ),
          )
          .catch(() => undefined);
      }
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "The API is unavailable. Start Docker to load your library.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    void refreshNotifications().catch(() => undefined);
    const interval = window.setInterval(
      () => void refreshNotifications().catch(() => undefined),
      45000,
    );
    return () => window.clearInterval(interval);
  }, []);
  const markNotificationsRead = async () => {
    await api("/api/notifications/read", { method: "POST" });
    setNotifications({ unreadCount: 0, notification: null });
  };
  const updateEntryEngagement = (entryId: string, engagement: Engagement) =>
    setEntries((current) =>
      current.map((entry) =>
        entry._id === entryId ? { ...entry, engagement } : entry,
      ),
    );
  const shown = useMemo(
    () =>
      entries.filter((entry) => {
        const matchesShip =
          active === "all" ||
          (active === "distilled" && entry.status === "distilled") ||
          (active === "applied" && entry.status === "applied") ||
          entry.shipIds.includes(active);
        const haystack =
          `${entry.title} ${entry.summary} ${entry.tags.join(" ")} ${entry.ships.map((ship) => ship.name).join(" ")}`.toLowerCase();
        return matchesShip && haystack.includes(query.toLowerCase());
      }),
    [entries, active, query],
  );
  const open = async (entry: Entry) => {
    window.location.assign(`/knowledge/${entry._id}`);
  };
  const archive = async (entry: Entry) => {
    if (!window.confirm(`Archive “${entry.title}”? It remains recoverable.`))
      return;
    try {
      await api(`/api/knowledge/${entry._id}`, { method: "DELETE" });
      setNotice("Archived. It is hidden, not deleted.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to archive card");
    }
  };
  const destroy = async (entry: Entry) => {
    if (
      !window.confirm(
        `Permanently delete “${entry.title}”? This removes its source, lessons, comments and activity. This cannot be undone.`,
      )
    )
      return;
    try {
      await api(`/api/knowledge/${entry._id}/permanent`, { method: "DELETE" });
      setNotice("Knowledge card permanently deleted.");
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Unable to delete card");
    }
  };
  const saveShips = async (entry: Entry, shipIds: string[]) => {
    await api(`/api/knowledge/${entry._id}`, {
      method: "PATCH",
      body: JSON.stringify({ shipIds }),
    });
    setFlagging(null);
    setNotice("Ships updated.");
    await load();
  };
  return (
    <main>
      <aside>
        <div className="brand">
          <span className="brand-mark">
            <Sparkles size={18} />
          </span>
          <span>
            Second Brain<small>Knowledge Hub</small>
          </span>
        </div>
        <nav>
          <Nav
            icon={<Compass />}
            label="All knowledge"
            count={dashboard.total}
            active={active === "all"}
            onClick={() => setActive("all")}
          />
          <Nav
            icon={<Lightbulb />}
            label="Distilled"
            count={dashboard.distilled}
            active={active === "distilled"}
            onClick={() => setActive("distilled")}
          />
          <Nav
            icon={<FolderHeart />}
            label="In practice"
            count={dashboard.applied}
            active={active === "applied"}
            onClick={() => setActive("applied")}
          />
          <Nav
            icon={<ShipWheel />}
            label="Manage Ships"
            count={ships.length}
            active={false}
            onClick={() => window.location.assign("/ships")}
          />
        </nav>
        <div className="nav-label">KNOWLEDGE SHIPS</div>
        <nav className="areas">
          {ships.map((ship) => (
            <button
              key={ship._id}
              className={active === ship._id ? "selected" : ""}
              onClick={() => setActive(ship._id)}
            >
              <i style={{ background: ship.color }} />
              {ship.name}
              <b>{ship.cardCount}</b>
            </button>
          ))}
          <button
            className="ship-add"
            onClick={() => window.location.assign("/ships")}
          >
            <Plus size={14} />
            Manage ships
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="streak">
            ✦{" "}
            <span>
              {dashboard.due} actions due
              <small>Turn insight into evidence</small>
            </span>
          </div>
          <button className="profile" onClick={clearSession} title="Log out">
            <span>{session.user.displayName.slice(0, 2).toUpperCase()}</span>
            {session.user.displayName} · {session.user.role}
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <section className="content">
        <div className="mobile-topbar">
          <a className="mobile-brand" href="/" aria-label="Knowledge Hub home">
            <span className="brand-mark">
              <Sparkles size={17} />
            </span>
            <span>Knowledge Hub</span>
          </a>
          <div className="mobile-topbar-actions">
            <button
              className="mobile-notification-trigger"
              aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`}
              onClick={() => setNotificationOpen((value) => !value)}
            >
              <Bell size={20} />
              {notifications.unreadCount > 0 && (
                <span className="notification-badge">
                  {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
                </span>
              )}
            </button>
            <button
              className="mobile-menu-trigger"
              aria-label="Open actions"
              onClick={() => setMobileMenuOpen(true)}
            >
              <MoreHorizontal size={22} />
            </button>
          </div>
        </div>
        <header>
          <div className="search">
            <Search size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your mind..."
            />
          </div>
          <div className="notification-wrap">
            <button
              className="icon notification-trigger"
              aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`}
              aria-expanded={notificationOpen}
              onClick={() => setNotificationOpen((value) => !value)}
            >
              <Bell size={19} />
              {notifications.unreadCount > 0 && (
                <span className="notification-badge">
                  {notifications.unreadCount > 9 ? "9+" : notifications.unreadCount}
                </span>
              )}
            </button>
            {notificationOpen && (
              <NotificationPopover
                summary={notifications}
                markRead={() => void markNotificationsRead()}
              />
            )}
          </div>
          {session.user.role === "admin" && (
            <button
              className="ghost header-action"
              onClick={() => setQuizOpen(true)}
            >
              Recall
            </button>
          )}
          {session.user.role === "admin" && (
            <button
              className="ghost header-action"
              onClick={() => setImportOpen(true)}
            >
              Import JSON
            </button>
          )}
          {session.user.role === "admin" && (
            <button
              className="ghost header-action"
              onClick={() => setArchiveOpen(true)}
            >
              Archive
            </button>
          )}
          <button
            className="ghost header-action"
            onClick={() => setGraphOpen(true)}
          >
            Graph
          </button>
          {session.user.role === "admin" && (
            <button className="add" onClick={() => setCapture(true)}>
              <CirclePlus size={18} /> Capture knowledge
            </button>
          )}
        </header>
        {notificationOpen && (
          <div className="mobile-notification-panel">
            <NotificationPopover
              summary={notifications}
              markRead={() => void markNotificationsRead()}
            />
          </div>
        )}
        {notice && (
          <div className="notice">
            {notice}
            <button onClick={() => setNotice("")}>
              <X size={14} />
            </button>
          </div>
        )}
        <div className="hero">
          <div>
            <p className="eyebrow">YOUR PERSONAL KNOWLEDGE REFINERY</p>
            <h1>
              Turn curiosity into
              <br />
              <em>compound interest.</em>
            </h1>
            <p className="subtitle">
              Every card can travel between ships as your thinking evolves.
            </p>
            {session.user.role === "admin" && (
              <button className="hero-capture" onClick={() => setCapture(true)}>
                <CirclePlus size={17} /> Add a source
              </button>
            )}
          </div>
          <div className="orb">
            <ShipWheel size={65} />
            <span>
              knowledge
              <br />
              in motion
            </span>
          </div>
        </div>
        <div className="metrics">
          <Metric
            label="ACTIVE LIBRARY"
            value={dashboard.total}
            note="cards you chose to keep"
          />
          <Metric
            label="DISTILLED"
            value={dashboard.distilled}
            note="sources made useful"
          />
          <Metric
            label="IN PRACTICE"
            value={dashboard.applied}
            note="ideas becoming you"
          />
          <div className="signal">
            <span>KNOWLEDGE SHIPS</span>
            <p>
              {ships.length
                ? `${ships.length} ships organize your learning.`
                : "Create your first ship."}
            </p>
            <button onClick={() => window.location.assign("/ships")}>
              Manage <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
        <Library
          entries={shown}
          sources={sources}
          open={open}
          capture={() => setCapture(true)}
          edit={setEditing}
          archive={archive}
          destroy={destroy}
          flag={setFlagging}
          canManage={session.user.role === "admin"}
          onEngagementChange={updateEntryEngagement}
        />
      </section>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          className={active === "all" ? "active" : ""}
          onClick={() => {
            setActive("all");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Compass size={19} />
          <span>Library</span>
        </button>
        <button onClick={() => window.location.assign("/ships")}>
          <ShipWheel size={19} />
          <span>Ships</span>
        </button>
        {session.user.role === "admin" && (
          <button className="mobile-capture" onClick={() => setCapture(true)}>
            <CirclePlus size={21} />
            <span>Capture</span>
          </button>
        )}
        <button onClick={() => clearSession()}>
          <span className="mobile-avatar">
            {session.user.displayName.slice(0, 2).toUpperCase()}
          </span>
          <span>Log out</span>
        </button>
      </nav>
      {mobileMenuOpen && (
        <div className="overlay mobile-actions-overlay">
          <section className="modal mobile-actions-sheet" aria-label="Quick actions">
            <button
              className="close"
              aria-label="Close actions"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X />
            </button>
            <p className="eyebrow">QUICK ACTIONS</p>
            <h2>Keep moving your thinking forward.</h2>
            <div className="mobile-action-list">
              <button
                onClick={() => {
                  setGraphOpen(true);
                  setMobileMenuOpen(false);
                }}
              >
                <Brain size={18} /> Knowledge graph
              </button>
              <button onClick={() => window.location.assign("/ships")}>
                <ShipWheel size={18} /> Manage ships
              </button>
              {session.user.role === "admin" && (
                <>
                  <button
                    onClick={() => {
                      setQuizOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Lightbulb size={18} /> Recall quiz
                  </button>
                  <button
                    onClick={() => {
                      setImportOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <FileText size={18} /> Import JSON
                  </button>
                  <button
                    onClick={() => {
                      setArchiveOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <ArchiveRestore size={18} /> Archive
                  </button>
                </>
              )}
              <button className="mobile-logout" onClick={clearSession}>
                <ChevronRight size={18} /> Log out
              </button>
            </div>
          </section>
        </div>
      )}
      {capture && (
        <Capture
          close={() => setCapture(false)}
          done={async () => {
            setCapture(false);
            await load();
          }}
        />
      )}
      {manageShips && (
        <ShipManager
          ships={ships}
          close={() => setManageShips(false)}
          changed={load}
        />
      )}{" "}
      {editing && (
        <EditKnowledge
          entry={editing}
          close={() => setEditing(null)}
          saved={async (updates) => {
            await api(`/api/knowledge/${editing._id}`, {
              method: "PATCH",
              body: JSON.stringify(updates),
            });
            setEditing(null);
            setNotice("Knowledge card updated.");
            await load();
          }}
        />
      )}
      {flagging && (
        <ShipFlagger
          entry={flagging}
          ships={ships}
          close={() => setFlagging(null)}
          save={saveShips}
        />
      )}{" "}
      {detail && (
        <KnowledgeDetail detail={detail} close={() => setDetail(null)} />
      )}
      {quizOpen && (
        <Quiz
          close={() => setQuizOpen(false)}
          shipId={active.length === 24 ? active : undefined}
        />
      )}
      {importOpen && (
        <ImportPreview
          close={() => setImportOpen(false)}
          done={async () => {
            setImportOpen(false);
            await load();
          }}
        />
      )}
      {archiveOpen && (
        <ArchiveLibrary close={() => setArchiveOpen(false)} restored={load} />
      )}
      {graphOpen && <KnowledgeGraph close={() => setGraphOpen(false)} />}
    </main>
  );
}
function KnowledgePage({ id }: { id: string }) {
  const [detail, setDetail] = useState<Detail | null>(null),
    [error, setError] = useState(""),
    [actionText, setActionText] = useState(""),
    [reflection, setReflection] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    void api<Detail>(`/api/knowledge/${id}`)
      .then(setDetail)
      .catch((error) => setError(error.message));
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
      setDetail(await api<Detail>(`/api/knowledge/${id}`));
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
function ListenPanel({
  title,
  thesis,
  summary,
  lessons,
}: {
  title: string;
  thesis: string;
  summary: string;
  lessons: Idea[];
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preference, setPreference] = useState<"female" | "male">("female");
  const [speed, setSpeed] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const refresh = () => setVoices(window.speechSynthesis.getVoices());
    refresh();
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.speechSynthesis.cancel();
    };
  }, []);

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
  };

  const speak = () => {
    if (!("speechSynthesis" in window)) return;
    stop();
    const utterance = new SpeechSynthesisUtterance(
      `${title}. Central thesis. ${thesis}. Summary. ${summary}. Key lessons. ${lessons
        .map(
          (lesson, index) =>
            `${index + 1}. ${lesson.title}. ${lesson.explanation}`,
        )
        .join(" ")}`,
    );
    const voicePattern =
      preference === "female"
        ? /female|woman|zira|samantha|victoria|karen|moira/i
        : /male|man|david|daniel|alex|fred/i;
    utterance.voice =
      voices.find((voice) => voicePattern.test(voice.name)) ||
      voices[0] ||
      null;
    utterance.rate = speed;
    utterance.onend = utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const togglePause = () => {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  return (
    <section className="listen-panel">
      <div>
        <p className="eyebrow">LISTEN TO THIS KNOWLEDGE</p>
        <b>Make this card part of your commute.</b>
        <small>
          Uses the voices installed in your browser or operating system.
        </small>
      </div>
      <div className="listen-controls">
        <button
          className={preference === "female" ? "selected" : ""}
          onClick={() => setPreference("female")}
        >
          Female voice
        </button>
        <button
          className={preference === "male" ? "selected" : ""}
          onClick={() => setPreference("male")}
        >
          Male voice
        </button>
        <select
          aria-label="Reading speed"
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
        >
          {[0.75, 1, 1.25, 1.5, 2].map((value) => (
            <option key={value} value={value}>
              {value}×
            </option>
          ))}
        </select>
        {speaking ? (
          <>
            <button className="ghost" onClick={togglePause}>
              {paused ? <Play size={15} /> : <Pause size={15} />}
              {paused ? "Resume" : "Pause"}
            </button>
            <button className="stop-listening" onClick={stop}>
              Stop
            </button>
          </>
        ) : (
          <button className="add" onClick={speak}>
            <Volume2 size={16} />
            Listen
          </button>
        )}
      </div>
    </section>
  );
}
function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]),
    [entries, setEntries] = useState<Entry[]>([]),
    [name, setName] = useState(""),
    [color, setColor] = useState("#9bbf91"),
    [error, setError] = useState("");
  const load = async () => {
    try {
      const [fleet, knowledge] = await Promise.all([
        api<Ship[]>("/api/ships"),
        api<Entry[]>("/api/knowledge"),
      ]);
      setShips(fleet);
      setEntries(knowledge);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to load fleet");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const create = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await api("/api/ships", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      setName("");
      await load();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create Ship",
      );
    }
  };
  return (
    <main className="route-page ships-page">
      <a className="back" href="/">
        ← Back to library
      </a>
      <header className="route-header">
        <p className="eyebrow">SHIP COMMAND CENTER</p>
        <h1>Build your fleet.</h1>
        <p>
          Ships are app-level collections. Every knowledge card has its own
          Captain—the person or channel delivering that specific knowledge—and
          appears in the live manifest below.
        </p>
      </header>
      <form className="ship-command" onSubmit={create}>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ship name"
          required
        />
        <input
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
        />
        <button className="add">Launch Ship</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      <div className="ship-fleet">
        {ships.map((ship) => {
          const manifest = entries.filter((entry) =>
            entry.shipIds.includes(ship._id),
          );
          return (
            <article className="ship-card" key={ship._id}>
              <i style={{ background: ship.color }} />
              <div className="ship-card-heading">
                <p className="eyebrow">
                  {manifest.length} cards ·{" "}
                  {
                    new Set(
                      manifest.map(
                        (entry) =>
                          entry.captainName ||
                          entry.source?.creatorName ||
                          "Unknown captain",
                      ),
                    ).size
                  }{" "}
                  captains
                </p>
                <h2>{ship.name}</h2>
                <small>{manifest.length} knowledge cards aboard</small>
              </div>
              <div className="ship-manifest">
                {manifest.length ? (
                  manifest.slice(0, 4).map((entry) => (
                    <a href={`/knowledge/${entry._id}`} key={entry._id}>
                      <span>{entry.title}</span>
                      <ArrowUpRight size={14} />
                    </a>
                  ))
                ) : (
                  <p>Flag cards here from their three-dot menu.</p>
                )}
              </div>
              <button
                className="ghost"
                onClick={async () => {
                  if (window.confirm(`Archive ${ship.name}?`)) {
                    await api(`/api/ships/${ship._id}`, { method: "DELETE" });
                    await load();
                  }
                }}
              >
                Archive Ship
              </button>
            </article>
          );
        })}
        {!ships.length && (
          <div className="empty">
            Your fleet is empty. Launch the first Ship above.
          </div>
        )}
      </div>
    </main>
  );
}
const Nav = ({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) => (
  <button className={active ? "active" : ""} onClick={onClick}>
    {icon}
    {label}
    <b>{count}</b>
  </button>
);
const Metric = ({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) => (
  <div>
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{note}</small>
  </div>
);
function Library({
  entries,
  sources,
  open,
  capture,
  edit,
  archive,
  destroy,
  flag,
  canManage,
  onEngagementChange,
}: {
  entries: Entry[];
  sources: Source[];
  open: (entry: Entry) => Promise<void>;
  capture: () => void;
  edit: (entry: Entry) => void;
  archive: (entry: Entry) => Promise<void>;
  destroy: (entry: Entry) => Promise<void>;
  flag: (entry: Entry) => void;
  canManage: boolean;
  onEngagementChange: (entryId: string, engagement: Engagement) => void;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const pageCount = Math.max(1, Math.ceil(entries.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = entries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">APPROVED KNOWLEDGE</p>
          <h2>Recent discoveries</h2>
        </div>
        {canManage && (
          <button onClick={capture}>
            Capture another <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      <div className="feed">
        {pageEntries.map((entry) => (
          <article key={entry._id}>
            <div className="entry-top">
              <span className="ship-pills">
                {entry.ships.length ? (
                  entry.ships.slice(0, 2).map((ship) => (
                    <span key={ship._id} style={{ borderColor: ship.color }}>
                      {ship.name}
                    </span>
                  ))
                ) : (
                  <span>Unassigned</span>
                )}
              </span>
              {canManage && (
                <CardMenu
                  entry={entry}
                  edit={edit}
                  archive={archive}
                  destroy={destroy}
                  flag={flag}
                />
              )}
            </div>
            <h3>{entry.title}</h3>
            <p className="creator">
              {entry.source?.creatorName || "Personal knowledge"}
            </p>
            <p className="summary">{entry.centralThesis || entry.summary}</p>
            <div className="tags">
              {entry.tags.slice(0, 3).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
            <EngagementPanel
              entry={entry}
              onChange={(engagement) => onEngagementChange(entry._id, engagement)}
            />
            <footer>
              <span className={"state " + entry.status}>
                {entry.status === "applied" ? "In practice" : "Distilled"}
              </span>
              <button onClick={() => void open(entry)}>
                Open <ArrowUpRight size={14} />
              </button>
              {entry.source?.url && (
                <a
                  className="card-source-link"
                  href={entry.source.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open original source for ${entry.title}`}
                >
                  <Play size={14} />
                  Source
                </a>
              )}
            </footer>
          </article>
        ))}
      </div>
      {!entries.length && (
        <div className="empty">
          No knowledge cards here yet. Capture a source or select another ship.
        </div>
      )}
      {entries.length > pageSize && (
        <nav className="pagination" aria-label="Knowledge pages">
          <button
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {pageCount}
          </span>
          <button
            disabled={currentPage === pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            Next
          </button>
        </nav>
      )}
    </>
  );
}
function CardMenu({
  entry,
  edit,
  archive,
  destroy,
  flag,
}: {
  entry: Entry;
  edit: (entry: Entry) => void;
  archive: (entry: Entry) => Promise<void>;
  destroy: (entry: Entry) => Promise<void>;
  flag: (entry: Entry) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card-menu">
      <button
        className="menu-trigger"
        aria-label={`Actions for ${entry.title}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div className="menu-popover">
          <button
            onClick={() => {
              setOpen(false);
              flag(entry);
            }}
          >
            <Tag size={14} />
            Flag to ships
          </button>
          <button
            onClick={() => {
              setOpen(false);
              edit(entry);
            }}
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            className="danger"
            onClick={() => {
              setOpen(false);
              void archive(entry);
            }}
          >
            <Trash2 size={14} />
            Archive
          </button>
          <button
            className="danger permanent-delete"
            onClick={() => {
              setOpen(false);
              void destroy(entry);
            }}
          >
            <Trash2 size={14} />
            Delete permanently
          </button>
        </div>
      )}
    </div>
  );
}
function ShipFlagger({
  entry,
  ships,
  close,
  save,
}: {
  entry: Entry;
  ships: Ship[];
  close: () => void;
  save: (entry: Entry, shipIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState(entry.shipIds);
  const [saving, setSaving] = useState(false);
  const toggle = (shipId: string) =>
    setSelected((value) =>
      value.includes(shipId)
        ? value.filter((id) => id !== shipId)
        : [...value, shipId],
    );
  return (
    <div className="overlay">
      <section className="modal ship-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">FLAG KNOWLEDGE</p>
        <h2>Choose its ships</h2>
        <p className="modal-copy">A card can belong to several ships.</p>
        <div className="ship-options">
          {ships.map((ship) => (
            <button
              key={ship._id}
              className={selected.includes(ship._id) ? "selected" : ""}
              onClick={() => toggle(ship._id)}
            >
              <i style={{ background: ship.color }} />
              {ship.name}
              {selected.includes(ship._id) && <Check size={15} />}
            </button>
          ))}
          {!ships.length && <p>Create a ship first from the sidebar.</p>}
        </div>
        <button
          className="add full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            await save(entry, selected);
            setSaving(false);
          }}
        >
          {saving ? "Saving…" : "Save ships"}
        </button>
      </section>
    </div>
  );
}
function ShipManager({
  ships,
  close,
  changed,
}: {
  ships: Ship[];
  close: () => void;
  changed: () => Promise<void>;
}) {
  const [name, setName] = useState(""),
    [color, setColor] = useState("#9bbf91"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const create = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/ships", {
        method: "POST",
        body: JSON.stringify({ name, color }),
      });
      setName("");
      await changed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create ship");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="overlay">
      <section className="modal ship-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">KNOWLEDGE SHIPS</p>
        <h2>Organize your thinking</h2>
        <form onSubmit={create} className="ship-create">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Builders and Systems"
            required
          />
          <input
            aria-label="Ship colour"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <button className="add" disabled={busy}>
            Create
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
        <div className="ship-list">
          {ships.map((ship) => (
            <div key={ship._id}>
              <i style={{ background: ship.color }} />
              <span>
                {ship.name}
                <small>{ship.cardCount} cards</small>
              </span>
              <button
                className="icon"
                aria-label={`Archive ${ship.name}`}
                onClick={async () => {
                  if (
                    window.confirm(
                      `Archive ship “${ship.name}”? Cards will become unassigned.`,
                    )
                  ) {
                    await api(`/api/ships/${ship._id}`, { method: "DELETE" });
                    await changed();
                  }
                }}
              >
                <ArchiveRestore size={15} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function EditKnowledge({
  entry,
  close,
  saved,
}: {
  entry: Entry;
  close: () => void;
  saved: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(entry.title),
    [captainName, setCaptainName] = useState(
      entry.captainName || entry.source?.creatorName || "",
    ),
    [thesis, setThesis] = useState(entry.centralThesis),
    [summary, setSummary] = useState(entry.summary),
    [tags, setTags] = useState(entry.tags.join(", ")),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saved({
        title,
        captainName,
        centralThesis: thesis,
        summary,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update knowledge",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="overlay">
      <form className="modal edit-modal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">EDIT KNOWLEDGE</p>
        <h2>Refine the card</h2>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>
        <label>
          Captain <span>person or channel delivering this knowledge</span>
          <input
            value={captainName}
            onChange={(e) => setCaptainName(e.target.value)}
            required
          />
        </label>
        <label>
          Central thesis
          <textarea
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Summary
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={5}
          />
        </label>
        <label>
          Tags <span>comma separated</span>
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="add full" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
function Capture({
  close,
  done,
}: {
  close: () => void;
  done: () => Promise<void>;
}) {
  const [type, setType] = useState("youtube"),
    [title, setTitle] = useState(""),
    [url, setUrl] = useState(""),
    [creator, setCreator] = useState(""),
    [text, setText] = useState(""),
    [duplicates, setDuplicates] = useState<
      { _id: string; title: string; creatorName?: string }[]
    >([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (title.trim().length > 3 || url.trim())
        void api<typeof duplicates>(
          `/api/sources/duplicates?${new URLSearchParams({ ...(title.trim() ? { title } : {}), ...(url.trim() ? { url } : {}) })}`,
        )
          .then(setDuplicates)
          .catch(() => setDuplicates([]));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [title, url]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/sources", {
        method: "POST",
        body: JSON.stringify({
          type,
          title,
          url,
          creatorName: creator,
          rawText: text,
        }),
      });
      await done();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture source");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="overlay">
      <form className="modal capture-modal" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">OWNER-ONLY CAPTURE</p>
        <h2>What deserves a place in your mind?</h2>
        <div className="type-picker">
          {[
            "youtube",
            "podcast",
            "article",
            "newsletter",
            "book",
            "document",
            "note",
          ].map((value) => (
            <button
              type="button"
              key={value}
              className={type === value ? "chosen" : ""}
              onClick={() => setType(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <label>
          Source URL
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            type="url"
            placeholder="https://youtube.com/..."
          />
        </label>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A clear title"
          />
        </label>
        <label>
          Creator / publication
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </label>
        {duplicates.length > 0 && (
          <div className="duplicate-warning">
            <b>Possible duplicate</b>
            {duplicates.map((item) => (
              <span key={item._id}>
                {item.title} {item.creatorName ? `· ${item.creatorName}` : ""}
              </span>
            ))}
          </div>
        )}
        <label>
          Transcript or source text
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="add full" disabled={busy}>
          {busy ? "Capturing…" : "Capture source"}
        </button>
      </form>
    </div>
  );
}
function KnowledgeDetail({
  detail,
  close,
}: {
  detail: Detail;
  close: () => void;
}) {
  const { entry, source, ideas, quotes, actions, ships } = detail;
  return (
    <div className="overlay">
      <section className="modal review-modal wide">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">
          {source.type} ·{" "}
          {ships.map((ship) => ship.name).join(" · ") || "Unassigned"}
        </p>
        <h2>{entry?.title || source.title}</h2>
        <p className="creator">{source.creatorName || "Personal source"}</p>
        {entry && (
          <>
            <div className="draft-summary">
              <p className="eyebrow">CENTRAL THESIS</p>
              <h3>{entry.centralThesis}</h3>
              <p>{entry.summary}</p>
            </div>
            <div className="idea-review">
              <div className="review-heading">
                <p className="eyebrow">LESSONS · {ideas.length}</p>
              </div>
              {ideas.map((idea, index) => (
                <div className="idea-row" key={idea._id}>
                  <span>{index + 1}</span>
                  <div>
                    <b>{idea.title}</b>
                    <p>{idea.explanation}</p>
                  </div>
                </div>
              ))}
            </div>
            {quotes.length > 0 && (
              <div className="idea-review">
                <p className="eyebrow">QUOTES</p>
                {quotes.map((quote) => (
                  <blockquote key={quote._id}>“{quote.text}”</blockquote>
                ))}
              </div>
            )}
            {actions.length > 0 && (
              <div className="idea-review">
                <p className="eyebrow">ACTIONS</p>
                {actions.map((action) => (
                  <p key={action._id}>
                    • {action.text} <small>({action.reminderFrequency})</small>
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
function ArchiveLibrary({
  close,
  restored,
}: {
  close: () => void;
  restored: () => Promise<void>;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  useEffect(() => {
    void api<Entry[]>("/api/knowledge?status=archived").then(setEntries);
  }, []);
  const restore = async (entry: Entry) => {
    await api(`/api/knowledge/${entry._id}/restore`, { method: "POST" });
    setEntries((value) => value.filter((item) => item._id !== entry._id));
    await restored();
  };
  return (
    <div className="overlay">
      <section className="modal archive-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">ARCHIVED KNOWLEDGE</p>
        <h2>Nothing is permanently lost</h2>
        <div className="archive-list">
          {entries.length ? (
            entries.map((entry) => (
              <div key={entry._id}>
                <span>
                  <b>{entry.title}</b>
                  <small>{entry.centralThesis}</small>
                </span>
                <button className="ghost" onClick={() => void restore(entry)}>
                  <ArchiveRestore size={14} />
                  Restore
                </button>
              </div>
            ))
          ) : (
            <p className="modal-copy">Your archive is empty.</p>
          )}
        </div>
      </section>
    </div>
  );
}
function KnowledgeGraph({ close }: { close: () => void }) {
  const [graph, setGraph] = useState<{
    nodes: { id: string; label: string; type: string }[];
    edges: { from: string; to: string; relationship: string }[];
  }>({ nodes: [], edges: [] });
  useEffect(() => {
    void api<typeof graph>("/api/graph").then(setGraph);
  }, []);
  const entries = graph.nodes.filter((node) => node.type === "entry"),
    ideas = graph.nodes.filter((node) => node.type === "idea");
  return (
    <div className="overlay">
      <section className="modal graph-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">KNOWLEDGE GRAPH</p>
        <h2>See the terrain of your thinking</h2>
        <div className="graph-stats">
          <span>
            <b>{entries.length}</b> sources
          </span>
          <span>
            <b>{ideas.length}</b> lessons
          </span>
          <span>
            <b>{graph.edges.length}</b> connections
          </span>
        </div>
        <p className="modal-copy">
          Connections appear when you link cards or lessons through the API;
          this view keeps the graph useful even while it is still sparse.
        </p>
        <div className="graph-nodes">
          {entries.map((node) => (
            <div key={node.id}>
              <i />
              {node.label}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
function Quiz({ close, shipId }: { close: () => void; shipId?: string }) {
  const [cards, setCards] = useState<
      { ideaId: string; prompt: string; answer: string; sourceTitle?: string }[]
    >([]),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false);
  useEffect(() => {
    void api<typeof cards>(
      `/api/quiz?limit=5${shipId ? `&ship=${shipId}` : ""}`,
    ).then(setCards);
  }, [shipId]);
  const card = cards[index];
  const record = async (recalled: boolean) => {
    if (!card) return;
    await api(`/api/quiz/${card.ideaId}/attempts`, {
      method: "POST",
      body: JSON.stringify({ recalled, confidence: recalled ? 4 : 2 }),
    });
    setRevealed(false);
    setIndex((value) => value + 1);
  };
  return (
    <div className="overlay">
      <section className="modal quiz-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">ACTIVE RECALL</p>
        <h2>What do you remember?</h2>
        {card ? (
          <>
            <small>{card.sourceTitle}</small>
            <p className="quiz-prompt">{card.prompt}</p>
            {revealed && (
              <div className="draft-summary">
                <p>{card.answer}</p>
              </div>
            )}
            {revealed ? (
              <div className="quiz-actions">
                <button className="ghost" onClick={() => void record(false)}>
                  Missed it
                </button>
                <button className="add" onClick={() => void record(true)}>
                  I remembered
                </button>
              </div>
            ) : (
              <button className="add full" onClick={() => setRevealed(true)}>
                Reveal answer
              </button>
            )}
          </>
        ) : (
          <p className="modal-copy">
            No approved lessons are ready for recall yet.
          </p>
        )}
      </section>
    </div>
  );
}
function ImportPreview({
  close,
  done,
}: {
  close: () => void;
  done: () => Promise<void>;
}) {
  const [raw, setRaw] = useState(""),
    [preview, setPreview] = useState<{
      imports?: { source?: { title?: string }; lessons?: unknown[] }[];
    } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const parse = () => {
    try {
      const value = JSON.parse(raw);
      if (!Array.isArray(value.imports))
        throw new Error("Expected an imports array.");
      setPreview(value);
      setError("");
    } catch (err) {
      setPreview(null);
      setError(err instanceof Error ? err.message : "Invalid JSON");
    }
  };
  const submit = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      await api("/api/v1/imports/knowledge", {
        method: "POST",
        body: JSON.stringify(preview),
      });
      await done();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="overlay">
      <section className="modal import-modal">
        <button className="close" onClick={close}>
          <X />
        </button>
        <p className="eyebrow">CURATED IMPORT</p>
        <h2>Preview before it enters your library</h2>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={10}
          placeholder="Paste the ChatGPT JSON payload…"
        />
        {error && <p className="form-error">{error}</p>}
        {preview && (
          <div className="import-preview">
            {preview.imports?.map((item, i) => (
              <p key={i}>
                <b>{item.source?.title || "Untitled source"}</b>
                <small>{item.lessons?.length || 0} lessons</small>
              </p>
            ))}
          </div>
        )}
        <div className="quiz-actions">
          <button className="ghost" onClick={parse}>
            Validate preview
          </button>
          <button
            className="add"
            disabled={!preview || busy}
            onClick={() => void submit()}
          >
            {busy ? "Importing…" : "Import approved"}
          </button>
        </div>
      </section>
    </div>
  );
}
export { App };
