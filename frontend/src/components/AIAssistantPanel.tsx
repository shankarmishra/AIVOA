import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../store";
import { appendMessage, setStreaming } from "../features/chat/slice";
import { useInvokeAgentMutation } from "../api/agent";
import ToolCallBubble from "./ToolCallBubble";

const QUICK_PROMPTS = [
  "Show me past interactions with Dr. Aisha Sharma",
  "Summarize my history with Dr. Aisha Sharma",
  "What should I do next with Dr. Mehta?",
];

export default function AIAssistantPanel() {
  const dispatch = useDispatch();
  const { sessionId, messages, isStreaming } = useSelector((s: RootState) => s.chat);
  const [input, setInput] = useState("");
  const [invokeAgent] = useInvokeAgentMutation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, isStreaming]);

  const send = async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message) return;
    dispatch(appendMessage({ role: "user", content: message }));
    setInput("");
    dispatch(setStreaming(true));
    try {
      const res = await invokeAgent({
        session_id: sessionId,
        message,
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
        content: "Sorry, the AI is unavailable. Please use the form on the left.",
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
    <aside className="h-full flex flex-col bg-white border-l border-ink-100 relative overflow-hidden">
      {/* Ambient gradient */}
      <div className="absolute inset-x-0 top-0 h-72 pointer-events-none bg-gradient-to-b from-violet-50 via-transparent to-transparent opacity-60" />
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative px-6 py-5 border-b border-ink-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-violet-700 to-clinical-700 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="none">
                <path d="M12 3v2M12 19v2M5 12H3M21 12h-2M6.34 6.34l1.41 1.41M16.24 16.24l1.42 1.42M6.34 17.66l1.41-1.41M16.24 7.76l1.42-1.42"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <h3 className="font-display text-[18px] font-medium text-ink-900 leading-none">
                AI Assistant
              </h3>
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-500 mt-1 font-mono">
                LangGraph · 5 tools
              </p>
            </div>
          </div>
          <span className="pill bg-clinical-50 text-clinical-700">
            <span className="w-1.5 h-1.5 rounded-full bg-clinical-500 animate-pulse-soft" />
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="relative flex-1 overflow-y-auto px-5 py-6 space-y-5"
      >
        {messages.length === 0 && <EmptyState onPick={send} />}

        {messages.map((m, i) => (
          <MessageBlock key={i} message={m} />
        ))}

        {isStreaming && <ThinkingIndicator />}
      </div>

      {/* Composer */}
      <div className="relative border-t border-ink-100 bg-white p-4">
        <div className="rounded-2xl border border-ink-100 bg-paper-50 focus-within:border-clinical-700 focus-within:shadow-focus transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Describe a meeting, search history, ask for advice…"
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm resize-none focus:outline-none min-h-[64px] placeholder:text-ink-300"
            disabled={isStreaming}
          />
          <div className="flex items-center justify-between px-3 pb-2.5">
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-ink-300">
              Enter to send · Shift+Enter for newline
            </span>
            <button
              onClick={() => send()}
              disabled={isStreaming || !input.trim()}
              className="btn-accent !py-1.5 !px-3 !text-xs"
            >
              Send
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function EmptyState({ onPick }: { onPick: (s: string) => void }) {
  return (
    <div className="animate-fade-up space-y-5 max-w-md">
      <div className="space-y-2.5">
        <p className="font-display text-[26px] leading-[1.15] text-ink-900 font-medium">
          Hello. <span className="italic text-violet-700">What happened today?</span>
        </p>
        <p className="text-sm text-ink-500 leading-relaxed">
          Describe a meeting in plain English and I'll log it. Or ask me about a doctor's history, sentiment trends, or what to do next. The form on the left flows through me too — same brain, different gloves.
        </p>
      </div>

      <div className="space-y-2 pt-1">
        <div className="text-[10px] uppercase tracking-[0.16em] text-ink-500 font-mono">
          Try
        </div>
        {QUICK_PROMPTS.map((p, i) => (
          <button
            key={i}
            onClick={() => onPick(p)}
            className="w-full text-left text-sm px-3.5 py-2.5 rounded-lg bg-paper-50 border border-ink-100 hover:border-ink-300 hover:bg-white transition-all group"
          >
            <span className="text-ink-700 group-hover:text-ink-900">{p}</span>
          </button>
        ))}
      </div>

      <div className="pt-2 grid grid-cols-5 gap-1.5">
        {["log_interaction", "edit_interaction", "search_interactions", "summarize_hcp_history", "suggest_follow_ups"].map((t) => (
          <div
            key={t}
            className="text-[9px] font-mono text-ink-500 px-1.5 py-1 rounded bg-paper-50 border border-ink-100 text-center truncate"
            title={t}
          >
            {t.split("_")[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageBlock({
  message,
}: {
  message: { role: "user" | "assistant"; content: string; tool_calls?: any[] };
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-up">
        <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-ink-900 text-paper-50 px-4 py-2.5 text-sm leading-relaxed shadow-card">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-2 animate-fade-up">
      {message.tool_calls && message.tool_calls.length > 0 && (
        <div className="space-y-1.5">
          {message.tool_calls.map((tc, j) => (
            <ToolCallBubble key={j} tc={tc} />
          ))}
        </div>
      )}
      {message.content && (
        <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-paper-50 border border-ink-100 px-4 py-3 text-sm leading-relaxed text-ink-900 prose-chat">
          {message.content}
        </div>
      )}
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="animate-fade-in flex items-center gap-2 text-xs text-ink-500 font-mono">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-soft" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-soft" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse-soft" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="uppercase tracking-[0.14em]">Routing through agent</span>
    </div>
  );
}
