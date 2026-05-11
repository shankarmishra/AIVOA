import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface InteractionDraft {
  hcp_name: string;
  interaction_type: string;
  occurred_at: string;
  attendees: string;
  topics_discussed: string;
  materials_shared: string[];
  samples_distributed: { name: string; qty: number }[];
  sentiment: "positive" | "neutral" | "negative";
  outcomes: string;
  follow_up_actions: string;
}

const initialState: InteractionDraft = {
  hcp_name: "",
  interaction_type: "Meeting",
  occurred_at: new Date().toISOString().slice(0, 16),
  attendees: "",
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "neutral",
  outcomes: "",
  follow_up_actions: "",
};

const slice = createSlice({
  name: "interactionDraft",
  initialState,
  reducers: {
    setField<K extends keyof InteractionDraft>(
      state: InteractionDraft,
      action: PayloadAction<{ key: K; value: InteractionDraft[K] }>,
    ) {
      (state as any)[action.payload.key] = action.payload.value;
    },
    resetDraft: () => initialState,
  },
});

export const { setField, resetDraft } = slice.actions;
export default slice.reducer;
