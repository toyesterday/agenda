import { Outlet } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import DashboardHeader from "./DashboardHeader";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const DashboardLayout = () => {
  const { profile } = useAuth();

  return (
    <div className={cn(
      "flex min-h-screen w-full flex-col text-white",
      profile?.theme === 'pink_purple'
        ? "bg-gradient-to-br from-purple-900 via-fuchsia-900 to-pink-900"
        : "bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900"
    )}>
      <DashboardSidebar />
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <DashboardHeader />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;