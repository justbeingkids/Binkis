import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import { VisitLogger } from "@/components/global/VisitLogger";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
  weight: ["300", "400", "500", "600", "700"],
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
    <html lang="es" className={lexend.variable} translate="no">
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
