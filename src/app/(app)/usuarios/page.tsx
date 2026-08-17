"use client";

import { FormEvent, useEffect, useState } from "react";
import { iniciais } from "@/lib/salon";

type UserRow = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UserRow[]>([]);
  const [erro, setErro] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<"corretor" | "admin">("corretor");

  async function load() {
    const r = await fetch("/api/usuarios");
    const data = await r.json();
    if (!r.ok) {
      setErro(data.error ?? "Sem permissão");
      return;
    }
    setUsuarios(data.usuarios);
  }

  useEffect(() => {
    load().catch(() => setErro("Falha ao carregar usuários"));
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const r = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, papel }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErro(data.error ?? "Erro ao criar");
      return;
    }
    setNome("");
    setEmail("");
    setSenha("");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="salon-kicker">Acesso</p>
        <h1 className="font-display mt-1 text-4xl leading-none">Equipe da casa</h1>
        <p className="mt-2 text-sm text-muted">Quem entra no painel para assumir o Zap no lugar da Pati.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="salon-card rounded-3xl p-5">
          {erro ? <p className="mb-3 text-sm text-accent">{erro}</p> : null}
          <ul className="space-y-3">
            {usuarios.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 rounded-2xl bg-bg/70 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-accent text-sm font-semibold text-white">
                    {iniciais(u.nome)}
                  </span>
                  <span>
                    <span className="block font-medium">{u.nome}</span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </span>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase ${u.papel === "admin" ? "bg-accent text-white" : "bg-gold-soft text-ink"}`}>
                  {u.papel === "admin" ? "admin" : "equipe"}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <form onSubmit={onSubmit} className="salon-card rounded-3xl p-5">
          <p className="salon-kicker">Novo</p>
          <h2 className="font-display text-2xl">Chamar pra casa</h2>
          <label className="mt-4 block text-sm">
            Nome
            <input className="salon-input mt-1 rounded-xl" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </label>
          <label className="mt-3 block text-sm">
            E-mail
            <input className="salon-input mt-1 rounded-xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="mt-3 block text-sm">
            Senha
            <input className="salon-input mt-1 rounded-xl" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </label>
          <label className="mt-3 block text-sm">
            Papel
            <select className="salon-input mt-1 rounded-xl" value={papel} onChange={(e) => setPapel(e.target.value as "admin" | "corretor")}>
              <option value="corretor">Equipe</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button className="salon-btn salon-btn-primary mt-5 w-full rounded-full">Criar conta</button>
        </form>
      </div>
    </div>
  );
}
