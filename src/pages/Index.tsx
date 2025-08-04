import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const Index = () => {
  const { profile } = useAuth();
  return (
    <div className={cn(
      "flex flex-col min-h-screen text-white",
      profile?.theme === 'pink_purple'
        ? "bg-gradient-to-br from-purple-900 via-fuchsia-900 to-pink-900"
        : "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900"
    )}>
      <Header />
      <main className="flex-grow">
        <Hero />
        <Features />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;