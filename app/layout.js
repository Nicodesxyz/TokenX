import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import LeftNav from "@/components/LeftNav";
import TopNav from "@/components/TopNav";

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${interSans.variable} ${spaceGrotesk.variable} main-wrapper`}
      >
        <Providers>
          <LeftNav />
          <TopNav />

          <main className="app-main">
            <div className="app-main-inner">{children}</div>
          </main>
        </Providers>
      </body>
    </html>
  );
}
