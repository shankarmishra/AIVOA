import { useState, useEffect } from "react";
import { useGetInteractionQuery } from "../api/interactions";
import { useInvokeAgentMutation } from "../api/agent";
import { useSelector } from "react-redux";
import { RootState } from "../store";

export default function EditInteractionModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { data: original } = useGetInteractionQuery(id);
  const [topics, setTopics] = useState("");
  const [sentiment, setSentiment] = useState<"positive" | "neutral" | "negative">("neutral");
  const [outcomes, setOutcomes] = useState("");
  const sessionId = useSelector((s: RootState) => s.chat.sessionId);
  const [invoke, { isLoading }] = useInvokeAgentMutation();

  useEffect(() => {
    if (original) {
      setTopics(original.topics_discussed ?? "");
      setSentiment(original.sentiment ?? "neutral");
      setOutcomes(original.outcomes ?? "");
    }
  }, [original]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const save = async () => {
    await invoke({
      session_id: sessionId,
      message: `Edit interaction ${id}: set topics_discussed to "${topics.replace(/"/g, "'")}", sentiment to ${sentiment}, outcomes to "${outcomes.replace(/"/g, "'")}".`,
      mode: "chat",
    }).unwrap();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="relative bg-white rounded-2xl shadow-modal w-full max-w-xl animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-7 pt-7 pb-5 border-b border-ink-100">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-ink-500 font-mono mb-2">
                  Editing entry · routed via AI
                </div>
                <h3 className="font-display text-[26px] leading-none text-ink-900 font-medium">
                  Amend interaction
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-ink-300 hover:text-ink-700 text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-7 py-6 space-y-5">
            <label className="block">
              <span className="label">Topics</span>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                className="input min-h-[88px]"
                autoFocus
              />
            </label>

            <div>
              <span className="label">Sentiment</span>
              <div className="flex gap-2">
                {(["positive", "neutral", "negative"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSentiment(s)}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium capitalize transition-all ${
                      sentiment === s
                        ? s === "positive"
                          ? "bg-clinical-50 border-clinical-200 text-clinical-700"
                          : s === "negative"
                          ? "bg-rose-50 border-rose-100 text-rose-700"
                          : "bg-ink-50 border-ink-100 text-ink-700"
                        : "bg-white border-ink-100 text-ink-500 hover:border-ink-300"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="label">Outcomes</span>
              <textarea
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                className="input min-h-[64px]"
              />
            </label>
          </div>

          {/* Footer */}
          <div className="px-7 py-4 bg-paper-50/50 border-t border-ink-100 flex items-center justify-between">
            <p className="text-[11px] text-ink-500 font-mono">
              Save fires <span className="text-warm-700">edit_interaction</span> tool
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button onClick={save} disabled={isLoading} className="btn-accent">
                {isLoading ? "Saving…" : "Save via AI"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
