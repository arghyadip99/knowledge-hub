import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Check, RotateCcw, X } from "lucide-react";
import { api } from "../lib/api";
import { pageMotion } from "../features/ui/Modal";
import type { Action } from "../types/knowledge";

type Tab = "open" | "completed" | "dismissed";

const tabs: { id: Tab; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "completed", label: "Completed" },
  { id: "dismissed", label: "Dismissed" },
];

export function ActionsPage() {
  const [actions, setActions] = useState<Action[]>([]);
  const [tab, setTab] = useState<Tab>("open");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () =>
    api<Action[]>("/api/actions")
      .then(setActions)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load actions",
        ),
      );

  useEffect(() => {
    void load();
  }, []);

  const setStatus = async (action: Action, status: Action["status"]) => {
    setBusyId(action._id);
    try {
      const updated = await api<Action>(`/api/actions/${action._id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setActions((current) =>
        current.map((item) =>
          item._id === action._id ? { ...item, ...updated } : item,
        ),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update action",
      );
    } finally {
      setBusyId(null);
    }
  };

  const shown = useMemo(
    () => actions.filter((action) => action.status === tab),
    [actions, tab],
  );
  const counts = useMemo(
    () => ({
      open: actions.filter((action) => action.status === "open").length,
      completed: actions.filter((action) => action.status === "completed")
        .length,
      dismissed: actions.filter((action) => action.status === "dismissed")
        .length,
    }),
    [actions],
  );
  const now = Date.now();

  return (
    <motion.main className="route-page actions-page" {...pageMotion}>
      <a className="back" href="/">
        ← Back to library
      </a>
      <header className="route-header">
        <p className="eyebrow">TURN INSIGHT INTO EVIDENCE</p>
        <h1>Put your knowledge into practice.</h1>
        <p>
          Every action you add from a knowledge card lands here. Work through
          what's open, then look back at what you've actually done.
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
      <div className="actions-list">
        {shown.map((action) => {
          const overdue =
            tab === "open" &&
            Boolean(action.dueAt) &&
            new Date(action.dueAt as string).getTime() < now;
          return (
            <article
              className={"action-row" + (overdue ? " overdue" : "")}
              key={action._id}
            >
              <div>
                <p className="action-text">{action.text}</p>
                <div className="action-meta">
                  {action.entryTitle && action.knowledgeEntryId && (
                    <a href={`/knowledge/${action.knowledgeEntryId}`}>
                      {action.entryTitle} <ArrowUpRight size={12} />
                    </a>
                  )}
                  <span>{action.reminderFrequency}</span>
                  {action.dueAt && (
                    <span className={overdue ? "overdue-tag" : ""}>
                      {overdue ? "Overdue · " : "Due "}
                      {new Date(action.dueAt).toLocaleDateString()}
                    </span>
                  )}
                  {action.completedAt && (
                    <span>
                      Completed{" "}
                      {new Date(action.completedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="action-row-controls">
                {tab === "open" && (
                  <>
                    <button
                      className="ghost"
                      disabled={busyId === action._id}
                      onClick={() => void setStatus(action, "dismissed")}
                    >
                      <X size={14} /> Dismiss
                    </button>
                    <button
                      className="add"
                      disabled={busyId === action._id}
                      onClick={() => void setStatus(action, "completed")}
                    >
                      <Check size={14} /> Done
                    </button>
                  </>
                )}
                {tab !== "open" && (
                  <button
                    className="ghost"
                    disabled={busyId === action._id}
                    onClick={() => void setStatus(action, "open")}
                  >
                    <RotateCcw size={14} /> Reopen
                  </button>
                )}
              </div>
            </article>
          );
        })}
        {!shown.length && (
          <div className="empty">
            {tab === "open"
              ? "Nothing open. Add an action from any knowledge card."
              : `No ${tab} actions yet.`}
          </div>
        )}
      </div>
    </motion.main>
  );
}
