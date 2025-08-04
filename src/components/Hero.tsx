import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const Hero = () => {
  const { user } = useAuth();
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4 md:px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4 text-white">
          O sistema de agendamento que vai transformar seu negócio
        </h1>
        <p className="max-w-3xl mx-auto text-lg md:text-xl text-gray-300 mb-8">
          Simplifique a gestão do seu salão ou barbearia. Agendamentos online, lembretes automáticos via WhatsApp e muito mais.
        </p>
        <div className="flex justify-center gap-4">
          {user ? (
            <Button asChild size="lg">
              <Link to="/dashboard/overview">Acessar Painel</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/portal">Portal do Cliente</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;