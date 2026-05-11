import { apiSlice } from "./apiSlice";

export interface Interaction {
  id: string;
  hcp_id: string;
  interaction_type: string;
  occurred_at: string;
  attendees?: string | null;
  topics_discussed?: string | null;
  materials_shared?: string[] | null;
  samples_distributed?: { name: string; qty: number }[] | null;
  sentiment?: "positive" | "neutral" | "negative" | null;
  outcomes?: string | null;
  follow_up_actions?: string | null;
  ai_summary?: string | null;
  ai_suggestions?: { action: string; rationale: string }[] | null;
  created_at: string;
  updated_at: string;
}

const interactionsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listInteractions: b.query<Interaction[], { hcp_id?: string } | void>({
      query: (arg) => `interactions${arg?.hcp_id ? `?hcp_id=${arg.hcp_id}` : ""}`,
      providesTags: ["Interaction"],
    }),
    getInteraction: b.query<Interaction, string>({
      query: (id) => `interactions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "Interaction", id }],
    }),
  }),
});

export const { useListInteractionsQuery, useGetInteractionQuery } = interactionsApi;
