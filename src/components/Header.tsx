import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Scissors } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Header = () => {
  const { user } = useAuth();
  const navLinks = [
    { href: "#features", label: "Funcionalidades" },
    { href: "#contact", label: "Contato" },
  ];

  return (
    <header className="bg-black/30 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <Scissors className="h-6 w-6 text-primary" />
          <span>Agenda Fixa</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-gray-300 hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
           <Link to="/portal" className="text-gray-300 hover:text-white transition-colors">
              Portal do Cliente
            </Link>
        </nav>
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <Button asChild>
              <Link to="/dashboard/overview">Acessar Painel</Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
              <Link to="/login">Login</Link>
            </Button>
          )}
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden bg-transparent border-white/20 text-white hover:bg-white/10">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-gray-900/80 backdrop-blur-xl border-l-white/20 text-white">
            <div className="grid gap-6 p-6">
              <Link to="/" className="flex items-center gap-2 font-bold text-lg">
                <Scissors className="h-6 w-6 text-primary" />
                <span>Agenda Fixa</span>
              </Link>
              <nav className="grid gap-4 text-lg">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} className="text-gray-300 hover:text-white transition-colors">
                    {link.label}
                  </a>
                ))}
                 <Link to="/portal" className="text-gray-300 hover:text-white transition-colors">
                    Portal do Cliente
                  </Link>
              </nav>
              <div className="grid gap-4">
                {user ? (
                  <Button asChild>
                    <Link to="/dashboard/overview">Acessar Painel</Link>
                  </Button>
                ) : (
                  <Button asChild variant="ghost" className="text-white hover:bg-white/10 hover:text-white">
                    <Link to="/login">Login</Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;