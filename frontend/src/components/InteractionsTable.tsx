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
    <div className="p-6">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Interaction History</h2>
      {isLoading && <div>Loading...</div>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-3 py-2">HCP</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Topics</th>
              <th className="px-3 py-2">Sentiment</th>
              <th className="px-3 py-2">AI Summary</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {interactions.map((i) => (
              <tr key={i.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(i.occurred_at).toLocaleString()}
                </td>
                <td className="px-3 py-2">{hcpById[i.hcp_id] ?? "—"}</td>
                <td className="px-3 py-2">{i.interaction_type}</td>
                <td className="px-3 py-2 max-w-xs truncate">{i.topics_discussed}</td>
                <td className="px-3 py-2">
                  <SentimentChip s={i.sentiment} />
                </td>
                <td className="px-3 py-2 max-w-md truncate text-slate-600">
                  {i.ai_summary ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setEditingId(i.id)}
                    className="text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editingId && (
        <EditInteractionModal id={editingId} onClose={() => setEditingId(null)} />
      )}
    </div>
  );
}

function SentimentChip({ s }: { s: string | null | undefined }) {
  if (!s) return <span className="text-slate-400">—</span>;
  const colors = {
    positive: "bg-green-100 text-green-800",
    neutral: "bg-slate-100 text-slate-700",
    negative: "bg-red-100 text-red-800",
  } as const;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[s as keyof typeof colors]}`}>
      {s}
    </span>
  );
}
