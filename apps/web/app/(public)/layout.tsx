import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RefCapture } from "@/components/shared/RefCapture";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <RefCapture />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-white focus:text-[#0077A8] focus:rounded-lg focus:shadow-e2 focus:font-semibold focus:text-sm focus:outline-none focus:ring-2 focus:ring-[#0077A8]"
      >
        Lewati ke konten utama
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
