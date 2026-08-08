import { ArrowUpRight, ShipWheel } from "lucide-react";
import { motion } from "framer-motion";
import { FormEvent, useEffect, useState } from "react";
import { api } from "../lib/api";
import { pageMotion } from "../features/ui/Modal";
import type { Entry, Ship } from "../types/knowledge";

export function ShipsPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#9bbf91");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const [fleet, knowledge] = await Promise.all([
        api<Ship[]>("/api/ships"),
        api<Entry[]>("/api/knowledge"),
      ]);
      setShips(fleet);
      setEntries(knowledge);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load fleet",
      );
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
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create Ship",
      );
    }
  };

  return (
    <motion.main className="route-page ships-page" {...pageMotion}>
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
          const captainCount = new Set(
            manifest.map(
              (entry) =>
                entry.captainName ||
                entry.source?.creatorName ||
                "Unknown captain",
            ),
          ).size;
          return (
            <article className="ship-card" key={ship._id}>
              {ship.imageUrl ? (
                <div className="ship-thumb">
                  <img src={ship.imageUrl} alt="" loading="lazy" />
                </div>
              ) : (
                <div className="ship-thumb is-placeholder">
                  <ShipWheel size={20} />
                </div>
              )}
              <i style={{ background: ship.color }} />
              <div className="ship-card-heading">
                <p className="eyebrow">
                  {manifest.length} cards · {captainCount} captains
                </p>
                <h2>{ship.name}</h2>
                <small>{manifest.length} knowledge cards aboard</small>
              </div>
              <div className="ship-manifest">
                {manifest.length ? (
                  manifest.slice(0, 4).map((entry) => (
                    <a href={`/knowledge/${entry._id}`} key={entry._id}>
                      {entry.source?.thumbnailUrl && (
                        <img
                          className="manifest-thumb"
                          src={entry.source.thumbnailUrl}
                          alt=""
                          loading="lazy"
                        />
                      )}
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
    </motion.main>
  );
}
