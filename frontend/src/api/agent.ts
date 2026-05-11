import { apiSlice } from "./apiSlice";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface AgentInvokeResponse {
  final_text: string;
  tool_calls: ToolCall[];
}

export interface AgentInvokeRequest {
  session_id: string;
  message: string;
  mode: "chat" | "form";
  form_data?: Record<string, unknown>;
}

const agentApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    invokeAgent: b.mutation<AgentInvokeResponse, AgentInvokeRequest>({
      query: (body) => ({ url: "agent/invoke", method: "POST", body }),
      invalidatesTags: ["Interaction"],
    }),
  }),
});

export const { useInvokeAgentMutation } = agentApi;
