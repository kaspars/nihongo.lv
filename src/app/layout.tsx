import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="lv">
      <body>{children}</body>
    </html>
  );
}
