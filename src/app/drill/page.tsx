import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DrillSetup from "./DrillSetup";
import DrillKanjiGrid from "./DrillKanjiGrid";

export default async function DrillPage() {
  const session = await auth();
  if (!session) redirect("/api/auth/signin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-16 pb-16 bg-gray-50 px-4">
      <DrillSetup />
      <DrillKanjiGrid />
    </main>
  );
}
