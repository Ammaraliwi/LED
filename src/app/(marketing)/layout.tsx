import { Navbar } from "@/components/nav/navbar";
import { Footer } from "@/components/nav/footer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="flex-1 pt-18">{children}</main>
      <Footer />
    </>
  );
}
