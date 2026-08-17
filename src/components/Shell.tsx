"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { iniciais } from "@/lib/salon";

const links = [
  { href: "/dashboard", label: "Casa", hint: "Pulso do dia" },
  { href: "/atendimento", label: "WhatsApp", hint: "Conversas da Pati" },
  { href: "/agenda", label: "Agenda", hint: "Horários e espera" },
  { href: "/usuarios", label: "Equipe", hint: "Quem entra no painel" },
];

function DonnaMark() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-gold-soft text-[1.45rem] leading-none text-accent ring-1 ring-gold/50">
        <span className="font-display mt-[1px]">D</span>
      </span>
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Catanduva</span>
        <span className="font-display block text-[1.35rem] leading-none text-white">Donna</span>
      </span>
    </div>
  );
}

export function Shell({
  children,
  user,
  brand,
  appName,
}: {
  children: React.ReactNode;
  user: { nome: string; papel: string };
  brand: string;
  appName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const nav = links.filter((link) => user.papel === "admin" || link.href !== "/usuarios");
  const papel = user.papel === "admin" ? "dono da casa" : "equipe";

  return (
    <div className="min-h-screen lg:pl-[15.5rem]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[15.5rem] flex-col bg-accent px-4 py-5 text-white lg:flex">
        <DonnaMark />
        <p className="mt-5 text-[11px] leading-relaxed text-white/65">
          {brand} · {appName}
        </p>
        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-2xl px-3 py-2.5 transition ${
                  active ? "bg-white/12 ring-1 ring-gold/40" : "hover:bg-white/8"
                }`}
              >
                <span className="block text-sm font-medium">{link.label}</span>
                <span className="block text-[11px] text-white/55">{link.hint}</span>
              </Link>
            );
          })}
        </nav>
        <div className="rounded-2xl bg-black/15 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gold-soft text-xs font-semibold text-accent">
              {iniciais(user.nome)}
            </span>
            <span>
              <span className="block text-sm font-medium">{user.nome}</span>
              <span className="block text-[11px] text-white/55">{papel}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="mt-3 w-full rounded-full border border-white/15 py-1.5 text-xs text-white/80 hover:bg-white/10"
          >
            Sair
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-10 border-b border-line/80 bg-card/85 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent text-lg text-white">
              <span className="font-display">D</span>
            </span>
            <strong className="font-display text-xl leading-none">{appName}</strong>
          </div>
          <button type="button" onClick={() => void logout()} className="salon-btn salon-btn-ghost rounded-full px-3 py-1 text-xs">
            Sair
          </button>
        </div>
        <nav className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {nav.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  active ? "bg-accent text-white" : "bg-bg-deep text-muted"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="px-4 py-5 lg:px-8 lg:py-7">{children}</main>
    </div>
  );
}
