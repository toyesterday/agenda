import { Link, useLocation } from "react-router-dom";
import { navItems, superAdminNavItems } from "@/dashboard-nav";
import {
  Menu,
  CircleUser,
  Scissors,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";

const DashboardHeader = () => {
  const { signOut, profile } = useAuth();
  const location = useLocation();

  const getNavItems = () => {
    if (profile?.role === 'professional') {
      // Renomeia "Agenda" para "Minha Agenda" para profissionais
      return navItems
        .filter(item => item.to === '/dashboard/appointments')
        .map(item => ({ ...item, label: 'Minha Agenda' }));
    }
    if (profile?.role === 'super_admin') {
      return [...navItems, ...superAdminNavItems];
    }
    return navItems;
  };

  const displayedNavItems = getNavItems();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-b-white/10 bg-black/30 backdrop-blur-md px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="sm:hidden bg-transparent border-white/20 text-white hover:bg-white/10">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="sm:max-w-xs bg-gray-900/80 backdrop-blur-xl border-r-white/20 text-white">
          <nav className="grid gap-6 text-lg font-medium">
            <Link
              to="/"
              className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
            >
              <Scissors className="h-5 w-5 transition-all group-hover:scale-110" />
              <span className="sr-only">Agenda Fixa</span>
            </Link>
            {displayedNavItems.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={`flex items-center gap-4 px-2.5 ${
                  location.pathname.startsWith(item.to)
                    ? "text-white"
                    : "text-gray-300 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
      
      <div className="relative ml-auto flex-1 md:grow-0" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full bg-white/10 hover:bg-white/20">
            <CircleUser className="h-5 w-5 text-white" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
          <DropdownMenuLabel>Minha Conta {profile?.role && `(${profile.role})`}</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/20" />
          <DropdownMenuItem asChild className="focus:bg-white/10 focus:text-white">
            <Link to="/dashboard/settings">Configurações</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/20" />
          <DropdownMenuItem onClick={signOut} className="focus:bg-white/10 focus:text-white">Sair</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};

export default DashboardHeader;