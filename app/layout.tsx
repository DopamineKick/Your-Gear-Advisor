import type { Metadata } from "next";
import { Playfair_Display, Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/SupabaseProvider";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Your Gear Advisor",
  description: "Twój osobisty doradca sprzętu gitarowego oparty na AI",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${playfair.variable} ${inter.variable} ${instrumentSerif.variable}`}>
      <body>
        <SupabaseProvider>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
