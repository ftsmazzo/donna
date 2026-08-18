export const TZ = "America/Sao_Paulo";

export const GRADE_HORAS = ["09:00", "10:30", "14:00", "16:00", "17:30"] as const;

export const SERVICO_COR: Record<string, { bg: string; fg: string; soft: string }> = {
  CORTE: { bg: "#7a1f32", fg: "#fff8f4", soft: "#f4dbe0" },
  HIDRA: { bg: "#c45c6a", fg: "#fff8f4", soft: "#f8dde1" },
  COLOR: { bg: "#5c2a4a", fg: "#fff8f4", soft: "#ead8e2" },
  LUZES: { bg: "#b8893a", fg: "#2a1714", soft: "#f3e6d2" },
  DESIGN: { bg: "#3d6b54", fg: "#fff8f4", soft: "#dce8e1" },
  MANIC: { bg: "#d4899a", fg: "#2a1714", soft: "#f7e4ea" },
  PEDIC: { bg: "#a35c2a", fg: "#fff8f4", soft: "#f0e0d2" },
  SPAU: { bg: "#8a6b4a", fg: "#fff8f4", soft: "#ece3d6" },
};

const FALLBACK = { bg: "#7a1f32", fg: "#fff8f4", soft: "#f4dbe0" };

export function codigoServico(row: { servico_codigo?: string | null; servico?: string | null }) {
  if (row.servico_codigo) return row.servico_codigo.toUpperCase();
  const n = (row.servico ?? "").toLowerCase();
  if (n.includes("corte")) return "CORTE";
  if (n.includes("hidra") || n.includes("escova")) return "HIDRA";
  if (n.includes("color")) return "COLOR";
  if (n.includes("luz") || n.includes("mecha")) return "LUZES";
  if (n.includes("sobrancel")) return "DESIGN";
  if (n.includes("mani") || n.includes("unha")) return "MANIC";
  if (n.includes("pedi")) return "PEDIC";
  if (n.includes("spa")) return "SPAU";
  return "CORTE";
}

export function corServico(row: { servico_codigo?: string | null; servico?: string | null }) {
  return SERVICO_COR[codigoServico(row)] ?? FALLBACK;
}

export function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseQuando(iso: string) {
  let s = iso.trim().replace(" ", "T");
  s = s.replace(/([+-]\d{2})$/, "$1:00");
  s = s.replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const horaOpts: Intl.DateTimeFormatOptions = {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

export function formatHora(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  return d.toLocaleTimeString("pt-BR", horaOpts);
}

export function formatDiaCurto(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  return d.toLocaleDateString("pt-BR", { timeZone: TZ, weekday: "short", day: "2-digit", month: "short" });
}

export function formatQuando(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  return `${formatDiaLinha(iso)} · ${formatHora(iso)}`;
}

export function formatDiaLinha(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  const txt = d.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return txt.replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

export function chaveDia(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  return d.toLocaleDateString("sv-SE", { timeZone: TZ });
}

export function tituloDia(iso: string) {
  const d = parseQuando(iso);
  if (!d) return iso;
  const txt = d.toLocaleDateString("pt-BR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

export function ehHoje(iso: string) {
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: TZ });
  return chaveDia(iso) === hoje;
}

export function saudacaoAgora() {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function iniciais(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "D";
  const first = parts[0]?.[0] ?? "D";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}
