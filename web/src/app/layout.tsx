import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/shared/lib/utils";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { Toaster } from "@/shared/ui/toast";
import { AuthProvider } from "@/modules/identity/application/AuthContext";
import { CategoriesProvider } from "@/modules/ledger/application/CategoriesContext";
import { ThemeProvider } from "@/shared/lib/theme-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Billefy",
  description: "Personal Finance Manager",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1220",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={cn("dark font-sans", inter.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <CategoriesProvider>
              <TooltipProvider>
                {children}
                <Toaster />
              </TooltipProvider>
            </CategoriesProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
