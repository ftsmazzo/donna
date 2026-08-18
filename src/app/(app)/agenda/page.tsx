"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GRADE_HORAS,
  chaveDia,
  corServico,
  ehHoje,
  formatDiaLinha,
  formatHora,
  reais,
  tituloDia,
} from "@/lib/salon";

type Item = {
  id: string;
  telefone: string;
  nome: string | null;
  unidade: string;
  unidade_id?: string;
  servico: string;
  servico_codigo?: string;
  inicio: string;
  status: string;
  duracao_min?: number;
  preco_centavos: number;
};

type Espera = {
  id: string;
  telefone: string;
  nome: string | null;
  unidade: string;
  servico: string;
  servico_codigo?: string;
  inicio: string;
  status: string;
};

type Servico = {
  codigo: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
  unidades: string[] | string;
};

type Unidade = { id: string; nome: string; endereco: string };

export default function AgendaPage() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [historico, setHistorico] = useState<Item[]>([]);
  const [espera, setEspera] = useState<Espera[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [erro, setErro] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [admin, setAdmin] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");
  const [form, setForm] = useState({
    telefone: "",
    nome: "",
    unidadeId: "centro",
    servicoCodigo: "CORTE",
    data: "",
    hora: "16:00",
    status: "marcado" as "marcado" | "feito",
  });

  async function carregar() {
    const r = await fetch("/api/agenda", { cache: "no-store" });
    const json = await r.json();
    if (!r.ok) throw new Error(json.error ?? "Erro ao carregar agenda");
    setItens(json.agendamentos ?? []);
    setHistorico(json.historico ?? []);
    setEspera(json.espera ?? []);
    setServicos(json.servicos ?? []);
    setUnidades(json.unidades ?? []);
    setAdmin(Boolean(json.admin));
    setForm((prev) => ({
      ...prev,
      data: prev.data || amanhaSP(),
      unidadeId: prev.unidadeId || json.unidades?.[0]?.id || "centro",
      servicoCodigo: prev.servicoCodigo || json.servicos?.[0]?.codigo || "CORTE",
    }));
  }

  useEffect(() => {
    carregar().catch((e: Error) => setErro(e.message));
  }, []);

  async function salvarHorario() {
    setErro("");
    setOkMsg("");
    setSalvando(true);
    try {
      const r = await fetch("/api/agenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Não marcou");
      setOkMsg(form.status === "feito" ? "Histórico lançado. A Pati passa a ver no próximo Zap." : "Horário marcado.");
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao marcar");
    } finally {
      setSalvando(false);
    }
  }

  async function lancarUnha() {
    setForm((prev) => ({
      ...prev,
      servicoCodigo: "MANIC",
      data: haDiasSP(21),
      hora: "10:30",
      status: "feito",
    }));
    setOkMsg("Conferi unha há 3 semanas. Toca em Lançar pra gravar.");
  }

  async function cancelar(id: string, nome: string) {
    if (!window.confirm(`Cancelar o horário de ${nome}? Se tiver espera, a Pati avisa no Zap.`)) return;
    setErro("");
    setOkMsg("");
    const r = await fetch("/api/agenda", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, acao: "cancelar" }),
    });
    const json = await r.json();
    if (!r.ok) {
      setErro(json.error ?? "Não cancelou");
      return;
    }
    if (json.aviso) setErro(json.aviso);
    else if (json.encaixe) setOkMsg("Cancelou e avisou quem estava na espera.");
    else setOkMsg("Cancelou. Ninguém na espera desse horário.");
    await carregar().catch((e: Error) => setErro(e.message));
  }

  const filtrados = useMemo(() => {
    const rows = itens ?? [];
    if (unidadeFiltro === "todas") return rows;
    return rows.filter((row) => row.unidade_id === unidadeFiltro || row.unidade === unidadeFiltro);
  }, [itens, unidadeFiltro]);

  const dias = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const row of filtrados) {
      const key = chaveDia(row.inicio);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtrados]);

  const totalReais = filtrados.reduce((acc, row) => acc + row.preco_centavos, 0);

  if (erro) return <p className="text-accent">{erro}. Rode sql/003_agendamentos_donna.sql no banco Donna.</p>;
  if (!itens) return <p className="text-muted">Carregando agenda...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="salon-kicker">Horários reais</p>
          <h1 className="font-display mt-1 text-4xl leading-none">Agenda da casa</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            O que a Pati fecha no Zap entra aqui. No admin você marca, cancela e lança histórico pra montar o teste.
          </p>
          {okMsg ? <p className="mt-2 text-sm text-ok">{okMsg}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            ["todas", "As duas casas"],
            ...unidades.map((u) => [u.id, u.nome] as const),
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setUnidadeFiltro(id)}
              className={`rounded-full px-3 py-1.5 text-sm ${
                unidadeFiltro === id ? "bg-accent text-white" : "salon-card text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {admin ? (
        <article className="salon-card rounded-3xl p-5">
          <p className="salon-kicker">Admin</p>
          <h2 className="font-display mt-1 text-3xl">Marcar, cancelar, histórico</h2>
          <p className="mt-1 text-sm text-muted">
            Marca pra outra pessoa, cancela um horário ocupado (dispara encaixe se tiver espera) ou lança um serviço antigo — unha há 3 semanas entra como feito, não como horário futuro.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Telefone
              <input
                className="salon-input mt-1 rounded-xl"
                value={form.telefone}
                onChange={(e) => setForm((p) => ({ ...p, telefone: e.target.value }))}
                placeholder="16996480805"
              />
            </label>
            <label className="text-sm">
              Nome
              <input
                className="salon-input mt-1 rounded-xl"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                placeholder="Carla"
              />
            </label>
            <label className="text-sm">
              Casa
              <select
                className="salon-input mt-1 rounded-xl"
                value={form.unidadeId}
                onChange={(e) => setForm((p) => ({ ...p, unidadeId: e.target.value }))}
              >
                {unidades.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Serviço
              <select
                className="salon-input mt-1 rounded-xl"
                value={form.servicoCodigo}
                onChange={(e) => setForm((p) => ({ ...p, servicoCodigo: e.target.value }))}
              >
                {servicos.map((s) => (
                  <option key={s.codigo} value={s.codigo}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Data
              <input
                type="date"
                className="salon-input mt-1 rounded-xl"
                value={form.data}
                onChange={(e) => setForm((p) => ({ ...p, data: e.target.value }))}
              />
            </label>
            <label className="text-sm">
              Hora
              <select
                className="salon-input mt-1 rounded-xl"
                value={form.hora}
                onChange={(e) => setForm((p) => ({ ...p, hora: e.target.value }))}
              >
                {GRADE_HORAS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${form.status === "marcado" ? "bg-accent text-white" : "bg-bg-deep text-muted"}`}
              onClick={() => setForm((p) => ({ ...p, status: "marcado" }))}
            >
              Horário futuro
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1.5 text-sm ${form.status === "feito" ? "bg-accent text-white" : "bg-bg-deep text-muted"}`}
              onClick={() => setForm((p) => ({ ...p, status: "feito" }))}
            >
              Já feito (histórico)
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={salvando}
              onClick={() => void salvarHorario()}
              className="salon-btn salon-btn-primary rounded-full disabled:opacity-40"
            >
              {salvando ? "Gravando…" : form.status === "feito" ? "Lançar histórico" : "Marcar horário"}
            </button>
            <button type="button" className="salon-btn salon-btn-gold rounded-full" onClick={() => void lancarUnha()}>
              Preparar unha há 3 semanas
            </button>
          </div>
        </article>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Marcados" value={String(filtrados.length)} hint="a partir de ontem" />
        <Stat label="Em espera" value={String(espera.length)} hint="fila viva" />
        <Stat label="Na grade" value={reais(totalReais)} hint="soma dos horários na tela" />
      </section>

      {unidades.length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {unidades.map((u) => (
            <article key={u.id} className="salon-card rounded-3xl p-4">
              <p className="salon-kicker">{u.id === "centro" ? "Calçadão" : "Estacionamento"}</p>
              <h2 className="font-display mt-1 text-2xl">{u.nome}</h2>
              <p className="mt-1 text-sm text-muted">{u.endereco}</p>
              <p className="mt-3 text-xs uppercase tracking-wide text-gold">Ter–sáb · 9h às 19h</p>
            </article>
          ))}
        </section>
      ) : null}

      {dias.length === 0 ? (
        <article className="salon-card rounded-3xl p-8 text-center">
          <p className="font-display text-2xl">Grade aberta</p>
          <p className="mt-2 text-sm text-muted">Nenhum horário marcado ainda. Quando a Pati fechar, aparece aqui na hora.</p>
        </article>
      ) : (
        dias.map(([dia, rows]) => (
          <section key={dia} className="space-y-3">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-3xl">{tituloDia(rows[0]?.inicio ?? dia)}</h2>
              {ehHoje(rows[0]?.inicio ?? "") ? (
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Hoje
                </span>
              ) : null}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {rows.map((row) => {
                const cor = corServico(row);
                return (
                  <article key={row.id} className="salon-card overflow-hidden rounded-3xl">
                    <div className="flex">
                      <div className="w-1.5 shrink-0" style={{ background: cor.bg }} />
                      <div className="flex flex-1 items-start justify-between gap-3 p-4">
                        <div>
                          <p className="text-[2.15rem] font-light leading-none tracking-tight tabular-nums">
                            {formatHora(row.inicio)}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
                            {formatDiaLinha(row.inicio)}
                          </p>
                          <p className="mt-2 text-sm font-medium">{row.servico}</p>
                          <a className="mt-1 block text-sm text-accent hover:underline" href={`/atendimento?tel=${row.telefone}`}>
                            {row.nome || row.telefone}
                          </a>
                          <p className="mt-1 text-xs text-muted">
                            {row.unidade}
                            {row.duracao_min ? ` · ${row.duracao_min} min` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                            style={{ background: cor.soft, color: cor.bg }}
                          >
                            {row.servico_codigo ?? "serviço"}
                          </span>
                          <p className="mt-3 text-sm font-semibold">{reais(row.preco_centavos)}</p>
                          {admin ? (
                            <button
                              type="button"
                              className="salon-btn salon-btn-ghost mt-3 rounded-full px-3 py-1 text-xs"
                              onClick={() => void cancelar(row.id, row.nome || row.telefone)}
                            >
                              Cancelar
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))
      )}

      <article className="salon-card rounded-3xl p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="salon-kicker">Fila</p>
            <h2 className="font-display text-3xl">Lista de espera</h2>
          </div>
          <span className="text-sm text-muted">{espera.length} na fila</span>
        </div>
        {espera.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Ninguém aguardando vaga. Se o horário lotar, a Pati oferece a fila.</p>
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {espera.map((row) => {
              const cor = corServico(row);
              return (
                <li key={row.id} className="rounded-2xl border border-dashed border-gold bg-gold-soft/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm font-medium tabular-nums">
                      {formatDiaLinha(row.inicio)} · {formatHora(row.inicio)}
                    </strong>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-warn">
                      {row.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: cor.bg }}>
                    {row.servico}
                  </p>
                  <a className="text-sm text-accent hover:underline" href={`/atendimento?tel=${row.telefone}`}>
                    {row.nome || row.telefone}
                  </a>
                  <p className="text-xs text-muted">{row.unidade}</p>
                </li>
              );
            })}
          </ul>
        )}
      </article>

      {historico.length ? (
        <article className="salon-card rounded-3xl p-5">
          <p className="salon-kicker">Já feitos</p>
          <h2 className="font-display text-3xl">Histórico recente</h2>
          <p className="mt-1 text-sm text-muted">
            Não ocupa grade. É o que a Pati usa pra lembrar unha, coloração, etc.
          </p>
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {historico.map((row) => (
              <li key={row.id} className="rounded-2xl border border-line p-3 text-sm">
                <strong>{row.servico}</strong>
                <p className="text-muted">
                  {formatDiaLinha(row.inicio)} · {formatHora(row.inicio)} · {row.nome || row.telefone}
                </p>
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {servicos.length ? (
        <article>
          <p className="salon-kicker">Cardápio</p>
          <h2 className="font-display mt-1 text-3xl">Serviços da casa</h2>
          <p className="mt-1 text-sm text-muted">A Pati não inventa fora desta lista.</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {servicos.map((s) => {
              const cor = corServico({ servico_codigo: s.codigo, servico: s.nome });
              return (
                <li key={s.codigo} className="salon-card overflow-hidden rounded-3xl">
                  <div className="h-1.5" style={{ background: cor.bg }} />
                  <div className="p-4">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ background: cor.soft, color: cor.bg }}
                    >
                      {s.codigo}
                    </span>
                    <h3 className="mt-2 font-medium">{s.nome}</h3>
                    <p className="mt-1 text-sm text-muted">{s.duracao_min} min</p>
                    <p className="mt-3 font-display text-2xl">{reais(s.preco_centavos)}</p>
                    <p className="mt-1 text-[11px] text-muted">
                      {unidadesDoServico(s.unidades)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </article>
      ) : null}
    </div>
  );
}

function amanhaSP() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function haDiasSP(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function unidadesDoServico(raw: string[] | string | null | undefined) {
  const list = Array.isArray(raw)
    ? raw
    : String(raw ?? "")
        .replace(/[{}]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
  const centro = list.includes("centro");
  const hig = list.includes("higienopolis");
  if (centro && hig) return "Nas duas unidades";
  if (centro) return "Só Centro";
  if (hig) return "Só Higienópolis";
  return "Catanduva";
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="salon-card rounded-3xl p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-1 text-4xl leading-none">{value}</p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </article>
  );
}
