import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { VisitLogger } from "@/components/global/VisitLogger";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "BinKis - Sistema de Validacion",
  description: "Plataforma de validacion de hologramas ganadores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`} translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
          <VisitLogger />
        </ToastProvider>
      </body>
    </html>
  );
}
