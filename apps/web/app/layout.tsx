import type { Metadata } from "next";
import localFont from "next/font/local";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: { default: "InvoiceGPT: chat to cash in under 30 seconds", template: "%s · InvoiceGPT" },
  description: "Paste a client chat. AI drafts the invoice, you check it, PayPal sends it.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // Font variables go on <html> so Tailwind's --font-sans (defined at :root) can resolve them.
    // data-theme is set before hydration by THEME_SCRIPT, hence suppressHydrationWarning.
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
