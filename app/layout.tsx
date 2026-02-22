import "../lib/fonts/_active.css";
import "../lib/fonts/_vars.css";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DefaultSettingWebApp - Webアプリ開発テンプレート",
  description: "Next.js 15 + TypeScript + Tailwind CSS v4 で構築されたモダンなWebアプリケーション開発テンプレート",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className="antialiased font-body"
      >
        {children}
      </body>
    </html>
  );
}
