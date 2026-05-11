import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { appendMessage, setStreaming } from "../features/chat/slice";
import { useInvokeAgentMutation } from "../api/agent";
import ToolCallBubble from "./ToolCallBubble";

export default function AIAssistantPanel() {
  const dispatch = useDispatch();
  const { sessionId, messages, isStreaming } = useSelector((s: RootState) => s.chat);
  const [input, setInput] = useState("");
  const [invokeAgent] = useInvokeAgentMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    dispatch(appendMessage({ role: "user", content: text }));
    setInput("");
    dispatch(setStreaming(true));
    try {
      const res = await invokeAgent({
        session_id: sessionId,
        message: text,
        mode: "chat",
      }).unwrap();
      dispatch(appendMessage({
        role: "assistant",
        content: res.final_text,
        tool_calls: res.tool_calls,
      }));
    } catch (err) {
      dispatch(appendMessage({
        role: "assistant",
        content: "Sorry, the AI is unavailable. Please use the form.",
      }));
    } finally {
      dispatch(setStreaming(false));
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200">
      <div className="border-b border-slate-200 px-4 py-3 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <h3 className="font-semibold text-slate-900">AI Assistant</h3>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm text-slate-500 bg-slate-50 rounded-md p-3">
            Log interaction details here (e.g., "Met Dr. Aisha Sharma today, discussed Drug X efficacy, positive sentiment, shared brochure") or ask "Show me past interactions with Dr. Sharma."
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            {m.content && (
              <div
                className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-900"
                }`}
              >
                {m.content}
              </div>
            )}
            {m.tool_calls && m.tool_calls.length > 0 && (
              <div className="mt-2 space-y-1 text-left">
                {m.tool_calls.map((tc, j) => (
                  <ToolCallBubble key={j} tc={tc} />
                ))}
              </div>
            )}
          </div>
        ))}
        {isStreaming && <div className="text-xs text-slate-400">AI is thinking...</div>}
      </div>

      <div className="border-t border-slate-200 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder="Ask AI for help..."
          className="input min-h-[60px] resize-none"
          disabled={isStreaming}
        />
        <button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          className="mt-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white px-4 py-1.5 rounded-md text-sm font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
