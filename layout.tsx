import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sanagus As · Estación Nébula",
  description: "Juego multijugador de deducción social en la Estación Nébula.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
