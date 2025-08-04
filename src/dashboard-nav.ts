import { Home, Calendar, Users, Briefcase, Settings, Tag, UserCog, LineChart, CreditCard } from "lucide-react";

export const navItems = [
  { to: "/dashboard/overview", icon: Home, label: "Visão Geral" },
  { to: "/dashboard/appointments", icon: Calendar, label: "Agenda" },
  { to: "/dashboard/clients", icon: Users, label: "Clientes" },
  { to: "/dashboard/professionals", icon: Briefcase, label: "Profissionais" },
  { to: "/dashboard/services", icon: Tag, label: "Serviços" },
  { to: "/dashboard/reports", icon: LineChart, label: "Relatórios" },
  { to: "/dashboard/settings", icon: Settings, label: "Configurações" },
];

export const superAdminNavItems = [
    { to: "/dashboard/users", icon: UserCog, label: "Usuários" },
    { to: "/dashboard/subscriptions", icon: CreditCard, label: "Assinaturas" },
];