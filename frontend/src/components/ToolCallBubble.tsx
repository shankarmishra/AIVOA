import { useState } from "react";
import { ToolCall } from "../api/agent";

const TOOL_ICONS: Record<string, string> = {
  log_interaction: "✎",
  edit_interaction: "↻",
  search_interactions: "⌕",
  summarize_hcp_history: "≡",
  suggest_follow_ups: "✦",
};

const TOOL_LABELS: Record<string, string> = {
  log_interaction: "Log Interaction",
  edit_interaction: "Edit Interaction",
  search_interactions: "Search Interactions",
  summarize_hcp_history: "Summarize History",
  suggest_follow_ups: "Suggest Follow-ups",
};

export default function ToolCallBubble({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);
  const icon = TOOL_ICONS[tc.name] ?? "•";
  const label = TOOL_LABELS[tc.name] ?? tc.name;

  return (
    <div className="animate-slide-up rounded-xl bg-paper-50 border border-warm-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-warm-50 transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-warm-100 text-warm-700 flex items-center justify-center text-sm font-bold">
          {icon}
        </span>
        <span className="flex-1 text-left">
          <span className="text-[11px] uppercase tracking-[0.14em] text-warm-700 font-mono font-medium">
            Tool · {label}
          </span>
        </span>
        <span className="font-mono text-xs text-ink-300">
          {open ? "−" : "+"}
        </span>
      </button>

      {open && (
        <div className="border-t border-warm-100/60 bg-white/60 backdrop-blur-sm">
          <div className="px-3 py-2.5 space-y-2">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono mb-1">
                Arguments
              </div>
              <pre className="text-[11px] font-mono text-ink-700 bg-paper-50 rounded p-2 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-ink-100/50">
                {JSON.stringify(tc.args, null, 2)}
              </pre>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono mb-1">
                Result
              </div>
              <pre className="text-[11px] font-mono text-ink-700 bg-paper-50 rounded p-2 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-ink-100/50">
                {typeof tc.result === "string"
                  ? tc.result
                  : JSON.stringify(tc.result, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
