"use client";

import { useEffect, useMemo, useState } from "react";
import { corServico, ehHoje, formatHora, reais, saudacaoAgora, tituloDia } from "@/lib/salon";

type Dash = {
  kpis: Record<string, string>;
  acoesPorStatus: { status: string; total: string }[];
  volume: { dia: string; total: string }[];
  recentes: {
    telefone: string;
    nome_cliente: string | null;
    modo: string;
    operador: string | null;
    ultima: string;
    preview: string;
  }[];
  telefone_visivel?: boolean;
};

type Agendamento = {
  id: string;
  telefone: string;
  nome: string | null;
  unidade: string;
  servico: string;
  servico_codigo?: string;
  inicio: string;
  preco_centavos: number;
};

export default function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null);
  const [agenda, setAgenda] = useState<Agendamento[]>([]);
  const [espera, setEspera] = useState<number>(0);
  const [erro, setErro] = useState("");
  const [varrendo, setVarrendo] = useState(false);
  const [varredura, setVarredura] = useState("");

  useEffect(() => {
    Promise.all([fetch("/api/dashboard"), fetch("/api/agenda")])
      .then(async ([dashRes, agendaRes]) => {
        const dash = await dashRes.json();
        if (!dashRes.ok) throw new Error(dash.error ?? "Erro ao carregar");
        setData(dash);
        if (agendaRes.ok) {
          const json = await agendaRes.json();
          setAgenda(json.agendamentos ?? []);
          setEspera((json.espera ?? []).length);
        }
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  const hoje = useMemo(() => agenda.filter((row) => ehHoje(row.inicio)), [agenda]);

  if (erro) return <p className="text-accent">{erro}. Confira se o SQL do painel já rodou no Postgres.</p>;
  if (!data) return <p className="text-muted">Abrindo a casa...</p>;

  const showPhone = data.telefone_visivel !== false;
  const cards = [
    ["Conversas", data.kpis.contatos, `+${data.kpis.contatos_7d} na semana`],
    ["No Zap / 7 dias", data.kpis.mensagens_7d, `${data.kpis.conversas_ativas_7d} ativas`],
    ["Com humano", data.kpis.humanos, "Pati pausada nessas"],
    ["Na espera", String(espera), "fila de horário"],
  ];

  const maxVol = Math.max(1, ...data.volume.map((v) => Number(v.total)));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="salon-kicker">Donna · Catanduva</p>
          <h1 className="font-display mt-1 text-4xl leading-none">
            {saudacaoAgora()}, linda
          </h1>
          <p className="mt-2 text-sm text-muted">Pulso do salão: agenda, WhatsApp e quem a Pati já atendeu.</p>
        </div>
        <div className="text-right">
          <button
            disabled={varrendo}
            className="salon-btn salon-btn-gold rounded-full"
            onClick={async () => {
              setVarrendo(true);
              setVarredura("");
              const r = await fetch("/api/crm/varrer", { method: "POST" });
              const json = await r.json();
              setVarrendo(false);
              if (!r.ok) {
                setVarredura(json.error ?? "Falha na varredura");
                return;
              }
              setVarredura(`${json.atualizados} conversas alinhadas`);
            }}
          >
            {varrendo ? "Sincronizando..." : "Sincronizar histórico"}
          </button>
          {varredura ? <p className="mt-1 text-xs text-muted">{varredura}</p> : null}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([title, value, hint]) => (
          <article key={title} className="salon-card rounded-3xl p-4">
            <p className="text-xs uppercase tracking-wide text-muted">{title}</p>
            <p className="font-display mt-2 text-4xl leading-none">{value}</p>
            <p className="mt-2 text-sm text-muted">{hint}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        <article className="salon-card rounded-3xl p-5 xl:col-span-3">
          <div className="flex items-end justify-between gap-2">
            <div>
              <p className="salon-kicker">Hoje na grade</p>
              <h2 className="font-display text-3xl">Cadeiras do dia</h2>
            </div>
            <a href="/agenda" className="text-sm text-accent hover:underline">
              Ver agenda
            </a>
          </div>
          {hoje.length === 0 ? (
            <p className="mt-6 text-sm text-muted">
              {agenda.length
                ? `Próximo horário: ${tituloDia(agenda[0].inicio)} às ${formatHora(agenda[0].inicio)} · ${agenda[0].servico}.`
                : "Nada marcado para hoje. Os próximos horários entram na Agenda."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {hoje.map((row) => {
                const cor = corServico(row);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-bg/70 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="w-16 text-2xl font-light leading-none tracking-tight tabular-nums">{formatHora(row.inicio)}</span>
                      <span>
                        <span className="block text-sm font-medium">{row.servico}</span>
                        <a className="text-xs text-accent hover:underline" href={`/atendimento?tel=${row.telefone}`}>
                          {row.nome || row.telefone}
                        </a>
                      </span>
                    </div>
                    <span className="text-right">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{ background: cor.soft, color: cor.bg }}
                      >
                        {row.unidade.replace("Donna ", "")}
                      </span>
                      <span className="mt-1 block text-xs text-muted">{reais(row.preco_centavos)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="salon-card rounded-3xl p-5 xl:col-span-2">
          <h2 className="font-display text-2xl">Volume no Zap</h2>
          <p className="text-xs text-muted">14 dias · mensagens que passaram no painel</p>
          <div className="mt-4 flex h-44 items-end gap-1.5">
            {data.volume.length === 0 ? (
              <p className="text-sm text-muted">Ainda sem mensagens. O histórico começa quando o Zap roda pelo n8n.</p>
            ) : (
              data.volume.map((item) => (
                <div key={item.dia} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-lg"
                    style={{
                      height: `${(Number(item.total) / maxVol) * 100}%`,
                      minHeight: 6,
                      background: "linear-gradient(to top, var(--accent), var(--accent-2))",
                    }}
                    title={`${item.dia}: ${item.total}`}
                  />
                  <span className="text-[10px] text-muted">{item.dia.slice(0, 5)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      {data.acoesPorStatus.length ? (
        <article className="salon-card rounded-3xl p-5">
          <h2 className="font-display text-2xl">Movimento por status</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {data.acoesPorStatus.map((row) => (
              <li key={row.status} className="rounded-2xl bg-bg px-3 py-2 text-sm">
                <span className="text-muted">{row.status}</span>
                <strong className="ml-2">{row.total}</strong>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      <article className="salon-card rounded-3xl p-5">
        <h2 className="font-display text-3xl">Últimas conversas</h2>
        <ul className="mt-4 divide-y divide-line">
          {data.recentes.map((row) => (
            <li key={row.telefone} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <a className="font-medium text-accent hover:underline" href={`/atendimento?tel=${row.telefone}`}>
                  {row.nome_cliente || (showPhone ? row.telefone : "Cliente")}
                </a>
                <p className="truncate text-sm text-muted">{row.preview}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  row.modo === "humano" ? "bg-gold-soft text-ink" : "bg-accent-soft text-accent"
                }`}
              >
                {row.modo === "humano" ? `Humano${row.operador ? ` · ${row.operador}` : ""}` : "Pati"}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}
