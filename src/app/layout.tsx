import type { Metadata, Viewport } from "next";
import { cjkFontVariables } from "@/lib/fonts";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "nihongo.lv",
  description: "Japāņu valodas mācību platforma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="lv" className={cjkFontVariables}>
      <body>{children}</body>
    </html>
  );
}
