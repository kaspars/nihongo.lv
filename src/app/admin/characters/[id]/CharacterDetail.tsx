"use client";

import { useState } from "react";
import type { CharacterDetailData } from "@/app/api/characters/[id]/route";

// ─── Field helpers ─────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 items-start py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-500 uppercase pt-1.5">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function TextInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder ?? "—"}
      className="w-full px-2 py-1 text-sm text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 placeholder:text-gray-400"
    />
  );
}

function NumberInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-24 px-2 py-1 text-sm text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
    />
  );
}

function ReadOnly({ value }: { value: string | null | undefined }) {
  return <span className="text-sm text-gray-700">{value ?? <span className="text-gray-400">—</span>}</span>;
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, badge, children, onSave, saving, error }: {
  title: string;
  badge?: string;
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  error: string | null;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {badge && <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">{badge}</span>}
      </div>
      <div className="px-4 py-2">{children}</div>
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded hover:bg-gray-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </div>
  );
}

// ─── Relationship type labels ───────────────────────────────────────────────

const REL_LABELS: Record<string, { from: string; to: string }> = {
  shinjitai_kyujitai:   { from: "Kyūjitai →", to: "← Shinjitai" },
  simplified_traditional: { from: "Traditional →", to: "← Simplified" },
};

// ─── Main component ─────────────────────────────────────────────────────────

export default function CharacterDetail({ data }: { data: CharacterDetailData }) {
  // ── Base fields ──
  const [strokeCount, setStrokeCount] = useState(String(data.strokeCount ?? ""));
  const [radical, setRadical] = useState(String(data.radical ?? ""));
  const [baseState, setBaseState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });

  // ── Japanese fields ──
  const [jaCategory, setJaCategory] = useState(data.japanese?.category ?? "");
  const [jaGrade, setJaGrade] = useState(data.japanese?.grade ?? "");
  const [jaJlpt, setJaJlpt] = useState(String(data.japanese?.jlpt ?? ""));
  const [jaHeisig, setJaHeisig] = useState(String(data.japanese?.heisig ?? ""));
  const [jaKeyEn, setJaKeyEn] = useState(data.japanese?.keywordEn ?? "");
  const [jaKeyLv, setJaKeyLv] = useState(data.japanese?.keywordLv ?? "");
  const [jaState, setJaState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });

  // ── Simplified Chinese fields ──
  const [zhsHsk, setZhsHsk] = useState(String(data.simplifiedChinese?.hsk2Level ?? ""));
  const [zhsHeisig, setZhsHeisig] = useState(String(data.simplifiedChinese?.heisig ?? ""));
  const [zhsKeyEn, setZhsKeyEn] = useState(data.simplifiedChinese?.keywordEn ?? "");
  const [zhsKeyLv, setZhsKeyLv] = useState(data.simplifiedChinese?.keywordLv ?? "");
  const [zhsState, setZhsState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });

  // ── Traditional Chinese fields ──
  const [zhtHeisig, setZhtHeisig] = useState(String(data.traditionalChinese?.heisig ?? ""));
  const [zhtKeyEn, setZhtKeyEn] = useState(data.traditionalChinese?.keywordEn ?? "");
  const [zhtKeyLv, setZhtKeyLv] = useState(data.traditionalChinese?.keywordLv ?? "");
  const [zhtState, setZhtState] = useState<{ saving: boolean; error: string | null }>({ saving: false, error: null });

  async function patch(body: object, setState: (s: { saving: boolean; error: string | null }) => void) {
    setState({ saving: true, error: null });
    const res = await fetch(`/api/characters/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setState({ saving: false, error: res.ok ? null : (json.error ?? "Save failed") });
  }

  return (
    <div className="space-y-4">

      {/* Base properties */}
      <Section title="Character" onSave={() => patch({ strokeCount: parseInt(strokeCount) || null, radical: parseInt(radical) || null }, setBaseState)} saving={baseState.saving} error={baseState.error}>
        <Field label="Codepoint">
          <ReadOnly value={`U+${data.id.toString(16).toUpperCase().padStart(4, "0")}`} />
        </Field>
        <Field label="Stroke count">
          <NumberInput value={strokeCount} onChange={setStrokeCount} />
        </Field>
        <Field label="Radical (Kangxi)">
          <NumberInput value={radical} onChange={setRadical} />
        </Field>
      </Section>

      {/* Japanese */}
      {data.japanese && (
        <Section
          title="Japanese"
          badge={data.japanese.category ?? undefined}
          onSave={() => patch({
            japanese: {
              category: jaCategory || null,
              grade: jaGrade || null,
              jlpt: parseInt(jaJlpt) || null,
              heisig: parseInt(jaHeisig) || null,
              keywordEn: jaKeyEn || null,
              keywordLv: jaKeyLv || null,
            },
          }, setJaState)}
          saving={jaState.saving}
          error={jaState.error}
        >
          <Field label="Category">
            <select
              value={jaCategory}
              onChange={e => setJaCategory(e.target.value)}
              className="px-2 py-1 text-sm text-gray-900 border border-gray-200 rounded focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
            >
              <option value="">—</option>
              <option value="jouyou">jouyou</option>
              <option value="jinmei">jinmei</option>
              <option value="hyougai">hyougai</option>
            </select>
          </Field>
          <Field label="Grade">
            <TextInput value={jaGrade} onChange={setJaGrade} placeholder="1–6, S" />
          </Field>
          <Field label="JLPT">
            <NumberInput value={jaJlpt} onChange={setJaJlpt} />
          </Field>
          <Field label="Heisig (RTK)">
            <NumberInput value={jaHeisig} onChange={setJaHeisig} />
          </Field>
          <Field label="Keyword EN">
            <TextInput value={jaKeyEn} onChange={setJaKeyEn} />
          </Field>
          <Field label="Keyword LV">
            <TextInput value={jaKeyLv} onChange={setJaKeyLv} />
          </Field>
          {data.japanese.onyomi.length > 0 && (
            <Field label="On'yomi">
              <ReadOnly value={data.japanese.onyomi.join("、")} />
            </Field>
          )}
          {data.japanese.kunyomi.length > 0 && (
            <Field label="Kun'yomi">
              <ReadOnly value={data.japanese.kunyomi.join("、")} />
            </Field>
          )}
        </Section>
      )}

      {/* Simplified Chinese */}
      {data.simplifiedChinese && (
        <Section
          title="Simplified Chinese"
          onSave={() => patch({
            simplifiedChinese: {
              hsk2Level: parseInt(zhsHsk) || null,
              heisig: parseInt(zhsHeisig) || null,
              keywordEn: zhsKeyEn || null,
              keywordLv: zhsKeyLv || null,
            },
          }, setZhsState)}
          saving={zhsState.saving}
          error={zhsState.error}
        >
          <Field label="HSK2 level">
            <NumberInput value={zhsHsk} onChange={setZhsHsk} />
          </Field>
          <Field label="Heisig (RSH)">
            <NumberInput value={zhsHeisig} onChange={setZhsHeisig} />
          </Field>
          <Field label="Keyword EN">
            <TextInput value={zhsKeyEn} onChange={setZhsKeyEn} />
          </Field>
          <Field label="Keyword LV">
            <TextInput value={zhsKeyLv} onChange={setZhsKeyLv} />
          </Field>
          {data.simplifiedChinese.pinyin.length > 0 && (
            <Field label="Pinyin">
              <ReadOnly value={data.simplifiedChinese.pinyin.join(", ")} />
            </Field>
          )}
        </Section>
      )}

      {/* Traditional Chinese */}
      {data.traditionalChinese && (
        <Section
          title="Traditional Chinese"
          onSave={() => patch({
            traditionalChinese: {
              heisig: parseInt(zhtHeisig) || null,
              keywordEn: zhtKeyEn || null,
              keywordLv: zhtKeyLv || null,
            },
          }, setZhtState)}
          saving={zhtState.saving}
          error={zhtState.error}
        >
          <Field label="Heisig (RTH)">
            <NumberInput value={zhtHeisig} onChange={setZhtHeisig} />
          </Field>
          <Field label="Keyword EN">
            <TextInput value={zhtKeyEn} onChange={setZhtKeyEn} />
          </Field>
          <Field label="Keyword LV">
            <TextInput value={zhtKeyLv} onChange={setZhtKeyLv} />
          </Field>
          {data.traditionalChinese.pinyin.length > 0 && (
            <Field label="Pinyin">
              <ReadOnly value={data.traditionalChinese.pinyin.join(", ")} />
            </Field>
          )}
        </Section>
      )}

      {/* Relationships */}
      {data.relationships.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-900">Relationships</h2>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-4">
            {data.relationships.map((rel, i) => {
              const label = REL_LABELS[rel.type]?.[rel.direction] ?? `${rel.type} ${rel.direction}`;
              return (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-xs text-gray-500">{label}</span>
                  <a
                    href={`/admin/characters/${rel.otherId}`}
                    className="text-2xl font-cjk-ja-sans hover:text-blue-600"
                    lang="ja"
                  >
                    {rel.otherLiteral}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
