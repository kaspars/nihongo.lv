import DrillSetup from "./DrillSetup";
import DrillKanjiGrid from "./DrillKanjiGrid";

export default function DrillPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-16 pb-16 bg-gray-50 px-4">
      <DrillSetup />
      <DrillKanjiGrid />
    </main>
  );
}
