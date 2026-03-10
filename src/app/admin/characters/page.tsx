import { Suspense } from "react";
import CharacterTable from "./CharacterTable";

export const metadata = { title: "Characters — Admin" };

export default function CharactersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Character browser</h1>
      <Suspense>
        <CharacterTable />
      </Suspense>
    </div>
  );
}
