import { apiSlice } from "./apiSlice";

export interface HCP {
  id: string;
  name: string;
  specialty?: string | null;
  institution?: string | null;
}

const hcpsApi = apiSlice.injectEndpoints({
  endpoints: (b) => ({
    listHcps: b.query<HCP[], { q?: string } | void>({
      query: (arg) => `hcps${arg?.q ? `?q=${encodeURIComponent(arg.q)}` : ""}`,
      providesTags: ["HCP"],
    }),
  }),
});

export const { useListHcpsQuery } = hcpsApi;
