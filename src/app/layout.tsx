import type { Metadata, Viewport } from "next";
import { Geist, Playfair_Display } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { currentShellUser } from "@/components/shellUserServer";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Geist carries the whole UI; Playfair Display exists only for the `.serif-italic`
// brand fragment in titles (one italic weight, nothing else).
const geist = Geist({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["600"],
  style: ["italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Aura Roadmap", template: "%s · Aura Roadmap" },
  description:
    "Interný nástroj Aura na plánovanie IT práce, evidenciu projektov a rozhodovaciu frontu.",
  applicationName: "Aura Roadmap",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1413" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentShellUser();

  return (
    // suppressHydrationWarning: the pre-paint script stamps data-theme /
    // data-density before React hydrates, so the server markup deliberately
    // differs from the client DOM on <html>.
    <html lang="sk" suppressHydrationWarning>
      <head>
        {/* MUST stay before globals.css so the theme is set before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${geist.variable} ${playfair.variable}`}>
        <AppShell user={user}>{children}</AppShell>
      </body>
    </html>
  );
}
