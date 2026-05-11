import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "../store";
import { setField, resetDraft, InteractionDraft } from "../features/interactionDraft/slice";
import { useListHcpsQuery } from "../api/hcps";
import { useInvokeAgentMutation } from "../api/agent";
import { appendMessage } from "../features/chat/slice";

const INTERACTION_TYPES = ["Meeting", "Call", "Email", "Conference"];

const SENTIMENTS: { value: InteractionDraft["sentiment"]; label: string; tone: string }[] = [
  { value: "positive", label: "Positive", tone: "text-clinical-700 border-clinical-200 bg-clinical-50" },
  { value: "neutral", label: "Neutral", tone: "text-ink-700 border-ink-100 bg-ink-50" },
  { value: "negative", label: "Negative", tone: "text-rose-700 border-rose-100 bg-rose-50" },
];

export default function InteractionForm() {
  const draft = useSelector((s: RootState) => s.interactionDraft);
  const sessionId = useSelector((s: RootState) => s.chat.sessionId);
  const dispatch = useDispatch();

  const [hcpQuery, setHcpQuery] = useState("");
  const { data: hcpOptions = [] } = useListHcpsQuery({ q: hcpQuery });
  const [invokeAgent, { isLoading }] = useInvokeAgentMutation();
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      console.error(err);
      alert("Failed to log interaction. See console.");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-10 space-y-8">
        {/* Header */}
        <div className="animate-fade-up stagger-0 space-y-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-clinical-700 font-medium">
            <span className="w-6 h-px bg-clinical-700" />
            New Entry
          </div>
          <h1 className="font-display text-[40px] leading-[1.05] font-medium text-ink-900">
            Log an interaction
          </h1>
          <p className="text-ink-500 text-[15px] leading-relaxed">
            Capture the conversation. Our AI assistant on the right can do the same job from natural language — pick whichever flow suits you.
          </p>
        </div>

        {/* HCP + Type + Time */}
        <section className="animate-fade-up stagger-1 space-y-6">
          <div>
            <label className="label">Healthcare Professional</label>
            <input
              list="hcp-options"
              value={draft.hcp_name}
              onChange={(e) => {
                setHcpQuery(e.target.value);
                onChange("hcp_name", e.target.value);
              }}
              className="input-lg font-medium"
              placeholder="Search by name…"
              required
              autoComplete="off"
            />
            <datalist id="hcp-options">
              {hcpOptions.map((h) => (
                <option key={h.id} value={h.name}>
                  {h.specialty} · {h.institution}
                </option>
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="label">Interaction Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {INTERACTION_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange("interaction_type", t)}
                    className={`text-sm py-2 rounded-md border transition-all ${
                      draft.interaction_type === t
                        ? "bg-ink-900 text-paper-50 border-ink-900"
                        : "bg-white text-ink-700 border-ink-100 hover:border-ink-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">When</label>
              <input
                type="datetime-local"
                value={draft.occurred_at}
                onChange={(e) => onChange("occurred_at", e.target.value)}
                className="input-lg"
                required
              />
            </div>
          </div>
        </section>

        <div className="hairline animate-fade-up stagger-2" />

        {/* Body */}
        <section className="animate-fade-up stagger-3 space-y-6">
          <div>
            <label className="label">Attendees</label>
            <input
              value={draft.attendees}
              onChange={(e) => onChange("attendees", e.target.value)}
              className="input"
              placeholder="Dr. Sharma, Rep K. Joshi…"
            />
          </div>

          <div>
            <label className="label">Topics Discussed</label>
            <textarea
              value={draft.topics_discussed}
              onChange={(e) => onChange("topics_discussed", e.target.value)}
              className="input min-h-[96px] leading-relaxed"
              placeholder="What did you talk about? Drug names, efficacy, dosing concerns…"
              required
            />
          </div>

          <div>
            <label className="label">HCP Sentiment</label>
            <div className="flex gap-2">
              {SENTIMENTS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => onChange("sentiment", s.value)}
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    draft.sentiment === s.value
                      ? `${s.tone} shadow-sm scale-[1.02]`
                      : "bg-white text-ink-500 border-ink-100 hover:border-ink-300"
                  }`}
                >
                  <span className="flex items-center justify-center gap-2">
                    <SentimentDot value={s.value} active={draft.sentiment === s.value} />
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="hairline animate-fade-up stagger-4" />

        {/* Outcomes */}
        <section className="animate-fade-up stagger-5 space-y-6">
          <div>
            <label className="label">Outcomes</label>
            <textarea
              value={draft.outcomes}
              onChange={(e) => onChange("outcomes", e.target.value)}
              className="input min-h-[72px]"
              placeholder="Decisions, commitments, agreed actions…"
            />
          </div>

          <div>
            <label className="label">Follow-up Actions</label>
            <textarea
              value={draft.follow_up_actions}
              onChange={(e) => onChange("follow_up_actions", e.target.value)}
              className="input min-h-[72px]"
              placeholder="What's next?"
            />
          </div>
        </section>

        {/* Footer / submit */}
        <div className="animate-fade-up stagger-6 pt-2 flex items-center justify-between">
          <div className="text-xs text-ink-500 font-mono">
            {success ? (
              <span className="text-clinical-700 inline-flex items-center gap-2 animate-fade-in">
                <CheckIcon /> Logged · summary generated by AI
              </span>
            ) : (
              <span>Form data routes through the LangGraph agent.</span>
            )}
          </div>
          <button type="submit" disabled={isLoading} className="btn-accent">
            {isLoading ? (
              <>
                <Spinner /> Logging…
              </>
            ) : (
              <>
                Log Interaction
                <ArrowIcon />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function SentimentDot({ value, active }: { value: string; active: boolean }) {
  const color =
    value === "positive"
      ? "bg-clinical-500"
      : value === "negative"
      ? "bg-rose-500"
      : "bg-ink-300";
  return <span className={`w-2 h-2 rounded-full ${color} ${active ? "" : "opacity-50"}`} />;
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
