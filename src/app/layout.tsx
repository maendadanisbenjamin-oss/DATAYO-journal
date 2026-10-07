import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Archivo, Chivo_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", weight: ["400", "500", "600", "700", "800"] });
const chivo = Chivo_Mono({ subsets: ["latin"], variable: "--font-num" });

export const metadata: Metadata = {
  title: "DATAYO-journal — Analyse · Backtest · Trade",
  applicationName: "DATAYO-journal",
  description: "Journal de trading DATAYO : analysez vos trades, suivez vos performances et progressez.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('tj-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${archivo.variable} ${chivo.variable} antialiased`}>{children}</body>
    </html>
  );
}
