"use client";

import { useEffect, useState } from "react";

type Props = { compact?: boolean };

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || Boolean(nav.standalone);
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function PwaControls({ compact }: Props) {
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setInstalled(isStandalone());
    setIosHint(isIos() && !isStandalone());

    const onInstalled = () => {
      setCanInstall(false);
      setInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      (window as Window & { __donnaInstall?: Event }).__donnaInstall = event;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => setPushOn(Boolean(sub)))
        .catch(() => undefined);
    }

    return () => {
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  async function instalar() {
    const stored = (window as Window & { __donnaInstall?: { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } }).__donnaInstall;
    if (stored) {
      await stored.prompt();
      const choice = await stored.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setCanInstall(false);
      return;
    }
    if (isIos()) {
      setMsg("No iPhone: Compartilhar → Adicionar à Tela de Início");
      return;
    }
    setMsg("Abra pelo Chrome ou Safari para instalar");
  }

  async function ativarPush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setMsg("Este celular não aceita aviso da Donna");
      return;
    }
    if (isIos() && !isStandalone()) {
      setMsg("Instale o app na tela inicial e abra por lá pra ligar o aviso");
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg("Precisa autorizar o aviso neste celular");
        return;
      }
      const vapid = await fetch("/api/push/vapid", { cache: "no-store" });
      const data = await vapid.json();
      if (!vapid.ok || !data.publicKey) {
        setMsg(data.error ?? "Aviso ainda não está no ar");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      });
      const save = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      const saved = await save.json().catch(() => ({}));
      if (!save.ok) {
        setMsg(saved.error ?? "Não consegui gravar o aviso");
        return;
      }
      setPushOn(true);
      if (saved.teste?.ok === false) {
        setMsg(`Ligou no painel, mas a Apple recusou o aviso: ${saved.teste.message || "erro"}`);
        return;
      }
      setMsg("Aviso ligado. Tem que ter chegado um teste agora.");
    } catch {
      setMsg("Não deu pra ligar o aviso neste aparelho");
    } finally {
      setBusy(false);
    }
  }

  async function testarPush() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/push/test", { method: "POST" });
      const data = await r.json();
      if (!r.ok) {
        setMsg(data.error ?? "Não testou");
        return;
      }
      if (data.sent > 0) setMsg("Mandei um teste. Olha as notificações.");
      else setMsg(data.errors?.[0]?.message || "Nenhum celular inscrito");
    } catch {
      setMsg("Falha ao testar aviso");
    } finally {
      setBusy(false);
    }
  }

  const showInstall = canInstall || iosHint;

  return (
    <div className={compact ? "flex flex-wrap items-center justify-end gap-1" : "space-y-2"}>
      {showInstall && !installed ? (
        <button type="button" onClick={() => void instalar()} className="salon-btn salon-btn-gold rounded-full px-3 py-1 text-xs">
          Instalar app
        </button>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => (pushOn ? void testarPush() : void ativarPush())}
        className={`salon-btn rounded-full px-3 py-1 text-xs ${pushOn ? "salon-btn-ghost" : "salon-btn-primary"}`}
      >
        {busy ? "Ligando…" : pushOn ? "Testar aviso" : "Ativar aviso"}
      </button>
      {msg ? <p className={compact ? "basis-full text-right text-[11px] text-muted" : "text-xs text-muted"}>{msg}</p> : null}
    </div>
  );
}
