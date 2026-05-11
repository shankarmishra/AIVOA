import InteractionForm from "../components/InteractionForm";
import AIAssistantPanel from "../components/AIAssistantPanel";

export default function LogInteractionPage() {
  return (
    <div className="h-full grid grid-cols-[1fr_minmax(380px,_440px)] xl:grid-cols-[1fr_minmax(420px,_500px)]">
      <div className="bg-paper-50/40 overflow-hidden">
        <InteractionForm />
      </div>
      <AIAssistantPanel />
    </div>
  );
}
