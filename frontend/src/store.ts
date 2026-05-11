import { configureStore } from "@reduxjs/toolkit";
import { apiSlice } from "./api/apiSlice";
import interactionDraftReducer from "./features/interactionDraft/slice";
import chatReducer from "./features/chat/slice";

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    interactionDraft: interactionDraftReducer,
    chat: chatReducer,
  },
  middleware: (getDefault) => getDefault().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
