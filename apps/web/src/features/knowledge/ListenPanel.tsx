import { Pause, Play, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { Idea } from "../../types/knowledge";

type Props = {
  title: string;
  thesis: string;
  summary: string;
  lessons: Idea[];
};

export function ListenPanel({ title, thesis, summary, lessons }: Props) {
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
    const spokenText = `${title}. Central thesis. ${thesis}. Summary. ${summary}. Key lessons. ${lessons.map((lesson, index) => `${index + 1}. ${lesson.title}. ${lesson.explanation}`).join(" ")}`;
    const utterance = new SpeechSynthesisUtterance(spokenText);
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
