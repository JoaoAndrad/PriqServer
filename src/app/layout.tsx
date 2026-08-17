import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import AppShell from "@/components/ui/AppShell";

export const metadata: Metadata = {
  title: "Priquito",
  description: "Organize as noites de jogo com a galera",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {user ? (
          <AppShell user={user}>{children}</AppShell>
        ) : (
          <main className="page">{children}</main>
        )}
      </body>
    </html>
  );
}
