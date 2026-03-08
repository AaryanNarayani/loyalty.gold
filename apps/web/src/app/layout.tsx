import type { Metadata } from "next";
import { Instrument_Sans, Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "loyalty.gold",
  description: "A universal infrastructure layer enabling Ecommerce merchants to reward customer loyalty with tokenized, on-chain gold and not arbitrary points.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <link rel="icon" href="/lg.png" sizes="any" type="image/png" />
      <body className={`${instrumentSans.variable} ${inter.variable} ${playfair.variable} ${jetbrainsMono.variable} font-sans antialiased`} style={{backgroundColor: 'black'}}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
