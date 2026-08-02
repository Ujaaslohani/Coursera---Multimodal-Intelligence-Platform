import "../styles/globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "Coursera Multimodal Intelligence Platform",
  description: "Cross-modal learning analytics and evidence-backed recommendations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <Navbar />
        <main className="p-6 max-w-5xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
