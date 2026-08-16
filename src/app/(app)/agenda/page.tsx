"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  telefone: string;
  nome: string | null;
  unidade: string;
  servico: string;
  inicio: string;
  status: string;
  preco_centavos: number;
};

function formatQuando(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function reais(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AgendaPage() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/agenda")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "Erro ao carregar agenda");
        setItens(json.agendamentos ?? []);
      })
      .catch((e: Error) => setErro(e.message));
  }, []);

  if (erro) return <p className="text-accent">{erro}. Rode sql/003_agendamentos_donna.sql no banco Donna.</p>;
  if (!itens) return <p className="text-muted">Carregando agenda...</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted">Horários que a Pati confirmar no WhatsApp aparecem aqui. Sem Google Agenda neste demo.</p>
      </div>
      <article className="rounded-2xl border border-line bg-card p-4">
        {itens.length === 0 ? (
          <p className="text-sm text-muted">Nenhum horário marcado ainda.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 font-medium">Quando</th>
                <th className="font-medium">Cliente</th>
                <th className="font-medium">Serviço</th>
                <th className="font-medium">Unidade</th>
                <th className="font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((row) => (
                <tr key={row.id} className="border-t border-line/80">
                  <td className="py-2">{formatQuando(row.inicio)}</td>
                  <td>
                    <a className="text-accent hover:underline" href={`/atendimento?tel=${row.telefone}`}>
                      {row.nome || row.telefone}
                    </a>
                  </td>
                  <td>{row.servico}</td>
                  <td>{row.unidade}</td>
                  <td>{reais(row.preco_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}
