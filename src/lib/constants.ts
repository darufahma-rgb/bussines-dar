/**
 * Brand color map for the four core business units.
 * Used for colored accents, left borders, and badges.
 */
export const BIZ_COLORS: Record<string, string> = {
  Temantiket:   "#2563EB",
  "SYMP Studio": "#DC2626",
  SYMP:          "#DC2626",
  AIGYPT:        "#7C3AED",
  Darcia:        "#EC4899",
};

/**
 * Returns the brand color for a business name, falling back to the
 * stored color in the DB, then a neutral gray.
 */
export function getBizColor(name: string, storedColor?: string | null): string {
  return BIZ_COLORS[name] ?? storedColor ?? "#6B7280";
}

/**
 * Human-readable status labels in Indonesian.
 */
export const STATUS_LABELS: Record<string, string> = {
  new:         "Lead Baru",
  warm:        "Hangat",
  hot:         "Panas",
  negotiation: "Negosiasi",
  closed:      "Berhasil",
  lost:        "Gagal",
};

/**
 * Tailwind color classes for each customer status.
 * Returns { bg, text, ring } classname strings.
 */
export const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  new:         { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500" },
  warm:        { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500" },
  hot:         { bg: "bg-orange-50",  text: "text-orange-700",  ring: "ring-orange-200",  dot: "bg-orange-500" },
  negotiation: { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  dot: "bg-violet-500" },
  closed:      { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  lost:        { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400" },
};

/**
 * Preset lost reasons for the LostReasonModal.
 */
export const LOST_PRESETS = [
  "Harga terlalu tinggi",
  "Tidak ada respons",
  "Tidak berminat",
  "Pilih kompetitor",
  "Waktu tidak tepat",
  "Anggaran dipotong",
];
