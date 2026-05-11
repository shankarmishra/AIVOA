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

  const save = async () => {
    await invoke({
      session_id: sessionId,
      message: `Edit interaction ${id}: set topics_discussed to "${topics}", sentiment to ${sentiment}, outcomes to "${outcomes}".`,
      mode: "chat",
    }).unwrap();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Edit Interaction</h3>
        <label className="block mb-3">
          <span className="text-sm font-medium block mb-1">Topics</span>
          <textarea value={topics} onChange={(e) => setTopics(e.target.value)} className="input min-h-[80px]" />
        </label>
        <label className="block mb-3">
          <span className="text-sm font-medium block mb-1">Sentiment</span>
          <select
            value={sentiment}
            onChange={(e) => setSentiment(e.target.value as any)}
            className="input"
          >
            <option value="positive">positive</option>
            <option value="neutral">neutral</option>
            <option value="negative">negative</option>
          </select>
        </label>
        <label className="block mb-4">
          <span className="text-sm font-medium block mb-1">Outcomes</span>
          <textarea value={outcomes} onChange={(e) => setOutcomes(e.target.value)} className="input min-h-[60px]" />
        </label>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isLoading}
            className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-md"
          >
            {isLoading ? "Saving..." : "Save (via AI)"}
          </button>
        </div>
      </div>
    </div>
  );
}
