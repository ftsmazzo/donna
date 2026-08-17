import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import { branding } from "@/lib/schema";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: branding.appName,
  description: `${branding.appName} — atendimento, agenda e a Pati no WhatsApp`,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
