import "../styles/globals.css";
import { Inter } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata = {
  title: "Coursera Multimodal Intelligence Platform",
  description: "Cross-modal learning analytics and evidence-backed recommendations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-ink-50 font-sans text-ink-900">
        <Sidebar />
        <MobileNav />
        <main className="px-4 py-6 sm:px-6 lg:ml-60 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </body>
    </html>
  );
}
