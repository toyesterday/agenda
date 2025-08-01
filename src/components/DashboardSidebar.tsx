import { Link, useLocation } from "react-router-dom";
import { Scissors } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./ui/tooltip";
import { navItems, superAdminNavItems } from "@/dashboard-nav";
import { useAuth } from "@/context/AuthContext";

const DashboardSidebar = () => {
  const location = useLocation();
  const { profile } = useAuth();

  const getNavItems = () => {
    if (profile?.role === 'professional') {
      return navItems.filter(item => item.to === '/dashboard/appointments');
    }
    if (profile?.role === 'super_admin') {
      return [...navItems, ...superAdminNavItems];
    }
    return navItems;
  };

  const displayedNavItems = getNavItems();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col sm:flex bg-black/30 backdrop-blur-md border-r border-r-white/10">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link
            to="/"
            className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
          >
            <Scissors className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Agenda Fixa</span>
          </Link>
          {displayedNavItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  to={item.to}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-white md:h-8 md:w-8",
                    location.pathname.startsWith(item.to) && "bg-white/10 text-white"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-800/80 backdrop-blur-md border border-white/20 text-white">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>
      </TooltipProvider>
    </aside>
  );
};

export default DashboardSidebar;