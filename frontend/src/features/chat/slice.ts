import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ToolCall } from "../../api/agent";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
}

interface ChatState {
  sessionId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
}

const initialState: ChatState = {
  sessionId: crypto.randomUUID(),
  messages: [],
  isStreaming: false,
};

const slice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    appendMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    setStreaming(state, action: PayloadAction<boolean>) {
      state.isStreaming = action.payload;
    },
    resetSession(state) {
      state.messages = [];
      state.sessionId = crypto.randomUUID();
    },
  },
});

export const { appendMessage, setStreaming, resetSession } = slice.actions;
export default slice.reducer;
