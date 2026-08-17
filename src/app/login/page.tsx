"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("pati@donna.local");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState("Donna");
  const [appName, setAppName] = useState("Donna");
  const [agentName, setAgentName] = useState("Pati");

  useEffect(() => {
    fetch("/api/branding")
      .then((r) => r.json())
      .then((data) => {
        if (data.brand) setBrand(data.brand);
        if (data.appName) setAppName(data.appName);
        if (data.agentName) setAgentName(data.agentName);
      })
      .catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErro("");
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setErro(data.error ?? "Falha no login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-accent">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(196,165,116,0.35),transparent_34%),radial-gradient(circle_at_88%_80%,rgba(196,92,106,0.4),transparent_42%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2">
        <div className="hidden text-white lg:block">
          <p className="salon-kicker text-gold">{brand} · Catanduva</p>
          <h1 className="font-display mt-3 text-6xl leading-[0.9]">A casa da Pati</h1>
          <p className="mt-5 max-w-md text-lg text-white/75">
            Agenda, WhatsApp e a equipe no mesmo lugar. Entra, vê o dia e assume o chat quando a cliente pedir gente de verdade.
          </p>
          <p className="mt-8 text-sm text-gold/90">{agentName} atende o Zap · o painel mostra o que ela fechou</p>
        </div>
        <form onSubmit={onSubmit} className="salon-card w-full max-w-md justify-self-end rounded-[2rem] p-8 lg:p-10">
          <p className="salon-kicker">{brand}</p>
          <h1 className="font-display mt-2 text-4xl leading-none">{appName}</h1>
          <p className="mt-3 text-sm text-muted">Entre para ver a agenda e as conversas da {agentName}.</p>
          <label className="mt-8 block text-sm">
            E-mail
            <input
              className="salon-input mt-1 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="mt-4 block text-sm">
            Senha
            <input
              className="salon-input mt-1 rounded-xl"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              type="password"
              required
            />
          </label>
          {erro ? <p className="mt-3 text-sm text-accent">{erro}</p> : null}
          <button className="salon-btn salon-btn-primary mt-6 w-full rounded-full py-3" disabled={loading}>
            {loading ? "Entrando..." : "Entrar na casa"}
          </button>
        </form>
      </div>
    </main>
  );
}
