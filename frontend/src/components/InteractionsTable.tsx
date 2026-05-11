import { useState } from "react";
import { useListInteractionsQuery } from "../api/interactions";
import { useListHcpsQuery } from "../api/hcps";
import EditInteractionModal from "./EditInteractionModal";

export default function InteractionsTable() {
  const { data: interactions = [], isLoading } = useListInteractionsQuery();
  const { data: hcps = [] } = useListHcpsQuery();
  const [editingId, setEditingId] = useState<string | null>(null);

  const hcpById = Object.fromEntries(hcps.map((h) => [h.id, h.name]));

  return (
    <div className="max-w-[1280px] mx-auto px-8 py-10">
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-clinical-700 font-medium mb-2">
            <span className="w-6 h-px bg-clinical-700" />
            Archive
          </div>
          <h1 className="font-display text-[40px] leading-[1.05] font-medium text-ink-900">
            Interaction history
          </h1>
          <p className="text-ink-500 mt-2 text-[15px]">
            Every entry, AI-summarised. Click <span className="font-medium text-ink-700">Edit</span> on a row to amend it through the assistant.
          </p>
        </div>
        <div className="font-mono text-xs text-ink-500">
          {interactions.length} {interactions.length === 1 ? "entry" : "entries"}
        </div>
      </div>

      {isLoading && <SkeletonRows />}

      {!isLoading && interactions.length === 0 && (
        <div className="card p-16 text-center animate-fade-up">
          <div className="font-display text-3xl text-ink-900 mb-2 italic">No entries yet.</div>
          <p className="text-ink-500">Log your first interaction to see it here.</p>
        </div>
      )}

      {!isLoading && interactions.length > 0 && (
        <div className="card overflow-hidden animate-fade-up">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-paper-50 border-b border-ink-100">
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">When</th>
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">HCP</th>
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">Type</th>
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">Topics</th>
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">Sentiment</th>
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono font-medium">AI Summary</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {interactions.map((i, idx) => (
                <tr
                  key={i.id}
                  className="border-t border-ink-100/60 hover:bg-paper-50 transition-colors animate-fade-up group"
                  style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                >
                  <td className="px-5 py-3.5 whitespace-nowrap font-mono text-xs text-ink-700">
                    {new Date(i.occurred_at).toLocaleString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-5 py-3.5 font-medium text-ink-900 whitespace-nowrap">
                    {hcpById[i.hcp_id] ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 text-ink-700">{i.interaction_type}</td>
                  <td className="px-5 py-3.5 max-w-xs text-ink-700">
                    <div className="truncate">{i.topics_discussed}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <SentimentChip s={i.sentiment} />
                  </td>
                  <td className="px-5 py-3.5 max-w-md text-ink-500 italic">
                    <div className="line-clamp-2">{i.ai_summary ?? "—"}</div>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      onClick={() => setEditingId(i.id)}
                      className="text-clinical-700 hover:text-clinical-800 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Edit →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <EditInteractionModal id={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

function SentimentChip({ s }: { s: string | null | undefined }) {
  if (!s) return <span className="text-ink-300">—</span>;
  const styles: Record<string, string> = {
    positive: "bg-clinical-50 text-clinical-700 border-clinical-100",
    neutral: "bg-ink-50 text-ink-700 border-ink-100",
    negative: "bg-rose-50 text-rose-700 border-rose-100",
  };
  const dot: Record<string, string> = {
    positive: "bg-clinical-500",
    neutral: "bg-ink-300",
    negative: "bg-rose-500",
  };
  return (
    <span className={`pill border capitalize ${styles[s]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[s]}`} />
      {s}
    </span>
  );
}

function SkeletonRows() {
  return (
    <div className="card p-2 animate-fade-up">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-4 border-b border-ink-100/60 last:border-0">
          <div className="h-3 w-24 bg-ink-50 rounded animate-pulse-soft" />
          <div className="h-3 w-40 bg-ink-50 rounded animate-pulse-soft" />
          <div className="h-3 flex-1 bg-ink-50 rounded animate-pulse-soft" />
        </div>
      ))}
    </div>
  );
}
