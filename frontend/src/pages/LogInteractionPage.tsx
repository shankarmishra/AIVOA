import InteractionForm from "../components/InteractionForm";
import AIAssistantPanel from "../components/AIAssistantPanel";

export default function LogInteractionPage() {
  return (
    <div className="h-full grid grid-cols-[1.4fr_1fr]">
      <div className="bg-white overflow-y-auto">
        <InteractionForm />
      </div>
      <AIAssistantPanel />
    </div>
  );
}
