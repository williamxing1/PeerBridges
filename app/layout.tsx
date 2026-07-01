import type { Metadata } from "next";
import "./styles/index.css";
import { LanguageProvider } from "./i18n";

export const metadata: Metadata = {
  title: "PeerBridges",
  description: "Student dashboard for one-on-one tutoring"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body><LanguageProvider>{children}</LanguageProvider></body>
    </html>
  );
}
