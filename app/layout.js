import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import LeftNav from "@/components/LeftNav";
import TopNav from "@/components/TopNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TokenX",
  description:
    "The one app to build, manage, scale & bring your token the features it requires. No code, no fee, easy to use",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} main-wrapper`}
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
