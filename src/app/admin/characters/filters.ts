export type SortField =
  | "id"
  | "stroke_count"
  | "radical"
  | "heisig_ja"
  | "heisig_zhs"
  | "heisig_zht"
  | "jlpt"
  | "grade"
  | "hsk2";

export type SortDir = "asc" | "desc";

export type CharacterContext = "all" | "ja" | "zhs" | "zht";

export interface CharacterFilters {
  ctx?: CharacterContext;
  // Character set membership (each is optional — omit = no filter on that set)
  ja_joyo?: boolean;
  ja_heisig?: boolean;
  zhs_heisig?: boolean;
  zht_heisig?: boolean;
  // Level filters (empty array = all levels)
  jlpt?: number[];       // 1–5
  grade?: string[];      // "1"–"6", "S"
  hsk2?: number[];       // 1–6
  // Heisig index range (applies to whichever set is active)
  heisig_ja_min?: number;
  heisig_ja_max?: number;
  heisig_zhs_min?: number;
  heisig_zhs_max?: number;
  heisig_zht_min?: number;
  heisig_zht_max?: number;
  // Sort
  sort?: SortField;
  dir?: SortDir;
  // Pagination
  page?: number;
  per_page?: number;
}

export interface CharacterRow {
  id: number;
  literal: string;
  strokeCount: number | null;
  radical: number | null;
  // Japanese
  heisigJa: number | null;
  jlpt: number | null;
  grade: string | null;
  category: string | null;
  // Simplified
  hsk2Level: number | null;
  heisigZhs: number | null;
  // Traditional
  heisigZht: number | null;
  // Keywords
  keywordJa: string | null;
  keywordZhs: string | null;
  keywordZht: string | null;
  // Readings (first value only for display)
  onyomi: string | null;
  kunyomi: string | null;
  pinyin: string | null;
  // Character variant links (populated based on context)
  traditionalVariants: string | null;
  simplifiedVariants: string | null;
  kyujitaiVariants: string | null;
  shinjitaiVariant: string | null;
}

export interface CharacterResponse {
  rows: CharacterRow[];
  total: number;
  page: number;
  perPage: number;
}
