import { Scissors } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-transparent text-gray-400 py-8 border-t border-white/10">
      <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          <span className="text-white">Agenda Fixa</span>
        </div>
        <p className="text-sm mt-4 md:mt-0">
          © {new Date().getFullYear()} Agenda Fixa. Todos os direitos reservados.
        </p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link to="/termos" className="text-sm hover:text-white">
            Termos de Serviço
          </Link>
          <Link to="/privacidade" className="text-sm hover:text-white">
            Política de Privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;