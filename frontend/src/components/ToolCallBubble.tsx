import { useState } from "react";
import { ToolCall } from "../api/agent";

export default function ToolCallBubble({ tc }: { tc: ToolCall }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs font-mono">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-amber-900 hover:underline"
      >
        <span>🔧</span>
        <span className="font-semibold">{tc.name}</span>
        <span className="text-amber-700">{open ? "▼" : "▶"}</span>
      </button>
      {open && (
        <div className="mt-2 space-y-1">
          <div>
            <span className="text-amber-800">args:</span>
            <pre className="bg-white rounded p-1 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(tc.args, null, 2)}
            </pre>
          </div>
          <div>
            <span className="text-amber-800">result:</span>
            <pre className="bg-white rounded p-1 overflow-x-auto whitespace-pre-wrap">
              {typeof tc.result === "string"
                ? tc.result
                : JSON.stringify(tc.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
