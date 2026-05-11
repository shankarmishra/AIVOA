import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setField, resetDraft } from "../features/interactionDraft/slice";
import { useListHcpsQuery } from "../api/hcps";
import { useInvokeAgentMutation } from "../api/agent";
import { appendMessage } from "../features/chat/slice";

const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference"];
const SENTIMENTS = ["positive", "neutral", "negative"] as const;

export default function InteractionForm() {
  const draft = useSelector((s: RootState) => s.interactionDraft);
  const sessionId = useSelector((s: RootState) => s.chat.sessionId);
  const dispatch = useDispatch();

  const [hcpQuery, setHcpQuery] = useState("");
  const { data: hcpOptions = [] } = useListHcpsQuery({ q: hcpQuery });
  const [invokeAgent, { isLoading }] = useInvokeAgentMutation();

  const onChange = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) =>
    dispatch(setField({ key, value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await invokeAgent({
        session_id: sessionId,
        message: "",
        mode: "form",
        form_data: { ...draft, occurred_at: new Date(draft.occurred_at).toISOString() },
      }).unwrap();
      dispatch(appendMessage({
        role: "assistant",
        content: res.final_text,
        tool_calls: res.tool_calls,
      }));
      dispatch(resetDraft());
    } catch (err) {
      console.error(err);
      alert("Failed to log interaction. See console.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-4 overflow-y-auto">
      <h2 className="text-lg font-semibold text-slate-900">Log HCP Interaction</h2>

      <Field label="HCP Name">
        <input
          list="hcp-options"
          value={draft.hcp_name}
          onChange={(e) => {
            setHcpQuery(e.target.value);
            onChange("hcp_name", e.target.value);
          }}
          className="input"
          placeholder="Start typing..."
          required
        />
        <datalist id="hcp-options">
          {hcpOptions.map((h) => (
            <option key={h.id} value={h.name} />
          ))}
        </datalist>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Interaction Type">
          <select
            value={draft.interaction_type}
            onChange={(e) => onChange("interaction_type", e.target.value)}
            className="input"
          >
            {INTERACTION_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Date & Time">
          <input
            type="datetime-local"
            value={draft.occurred_at}
            onChange={(e) => onChange("occurred_at", e.target.value)}
            className="input"
            required
          />
        </Field>
      </div>

      <Field label="Attendees">
        <input
          value={draft.attendees}
          onChange={(e) => onChange("attendees", e.target.value)}
          className="input"
          placeholder="Comma-separated"
        />
      </Field>

      <Field label="Topics Discussed">
        <textarea
          value={draft.topics_discussed}
          onChange={(e) => onChange("topics_discussed", e.target.value)}
          className="input min-h-[80px]"
          required
        />
      </Field>

      <Field label="HCP Sentiment">
        <div className="flex gap-4">
          {SENTIMENTS.map((s) => (
            <label key={s} className="flex items-center gap-1 text-sm capitalize">
              <input
                type="radio"
                name="sentiment"
                checked={draft.sentiment === s}
                onChange={() => onChange("sentiment", s)}
              />
              {s}
            </label>
          ))}
        </div>
      </Field>

      <Field label="Outcomes">
        <textarea
          value={draft.outcomes}
          onChange={(e) => onChange("outcomes", e.target.value)}
          className="input min-h-[60px]"
        />
      </Field>

      <Field label="Follow-up Actions">
        <textarea
          value={draft.follow_up_actions}
          onChange={(e) => onChange("follow_up_actions", e.target.value)}
          className="input min-h-[60px]"
        />
      </Field>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
      >
        {isLoading ? "Logging..." : "Log Interaction"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700 block mb-1">{label}</span>
      {children}
    </label>
  );
}
