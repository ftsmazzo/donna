"use client";

import { useEffect, useMemo, useState } from "react";
import {
  chaveDia,
  corServico,
  ehHoje,
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
  const [espera, setEspera] = useState<Espera[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [erro, setErro] = useState("");
  const [unidadeFiltro, setUnidadeFiltro] = useState("todas");

  useEffect(() => {
    fetch("/api/agenda")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Erro ao carregar agenda");
        setItens(json.agendamentos ?? []);
        setEspera(json.espera ?? []);
        setServicos(json.servicos ?? []);
        setUnidades(json.unidades ?? []);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

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
            O que a Pati fecha no Zap entra aqui. Terça a sábado, duas unidades, catálogo fechado.
          </p>
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
                          <p className="font-display text-4xl leading-none tabular-nums">{formatHora(row.inicio)}</p>
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
                    <strong className="text-sm">{formatHora(row.inicio)}</strong>
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
