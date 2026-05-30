import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";

import { Providers } from "@/app/providers";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-roboto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mestre IA — Leitura de plantas para o canteiro de obras",
  description:
    "Envie o PDF da planta arquitetônica e receba as medidas, esquadrias e o checklist de execução em poucos minutos. Tire dúvidas sobre o projeto na hora.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Mestre IA — Leitura de plantas arquitetônicas",
    description:
      "Interprete plantas em PDF e extraia medidas, esquadrias e o passo a passo da obra automaticamente.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#f7f8fd",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} ${robotoMono.variable}`}>
      <body className="min-h-screen bg-surface font-sans text-on-surface antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
