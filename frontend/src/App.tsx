import { BrowserRouter, Routes, Route } from "react-router-dom";
import TopBar from "./components/TopBar";
import LogInteractionPage from "./pages/LogInteractionPage";
import InteractionsTablePage from "./pages/InteractionsTablePage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<LogInteractionPage />} />
            <Route path="/interactions" element={<InteractionsTablePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
