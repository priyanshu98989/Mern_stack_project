import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import ScrollAnimation from "@/components/ScrollAnimation";

const Features = dynamic(() => import("@/components/Features"), { ssr: true });
const Specs = dynamic(() => import("@/components/Specs"));
const Testimonials = dynamic(() => import("@/components/Testimonials"));
const Pricing = dynamic(() => import("@/components/Pricing"));
const FAQ = dynamic(() => import("@/components/FAQ"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <ScrollAnimation />
      <Features />
      <Specs />
      <Testimonials />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
