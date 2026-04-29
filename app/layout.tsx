import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import NavWrapper from "@/components/NavWrapper";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata = {
  title: "TokenX",
  description: "Deploy & Manage your token all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} ${spaceGrotesk.variable} main-wrapper`}
      >
        <Providers>
          <NavWrapper />

          <main className="app-main">
            <div className="app-main-inner">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
