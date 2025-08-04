import { Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import LoginPage from "@/pages/LoginPage";
import BookingPage from "@/pages/BookingPage";
import CancelAppointmentPage from "@/pages/CancelAppointmentPage";
import ClientPortalLoginPage from "@/pages/ClientPortalLoginPage";
import ClientPortalViewPage from "@/pages/ClientPortalViewPage";
import DashboardLayout from "@/components/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import AppointmentsPage from "@/pages/dashboard/AppointmentsPage";
import ClientsPage from "@/pages/dashboard/ClientsPage";
import ProfessionalsPage from "@/pages/dashboard/ProfessionalsPage";
import SettingsPage from "@/pages/dashboard/SettingsPage";
import ServicesPage from "@/pages/dashboard/ServicesPage";
import UsersPage from "@/pages/dashboard/UsersPage";
import ReportsPage from "@/pages/dashboard/ReportsPage";
import SubscriptionsPage from "@/pages/dashboard/SubscriptionsPage";
import NotFound from "@/pages/NotFound";
import PublicLayout from "@/components/PublicLayout";
import { Toaster } from "@/components/ui/sonner";

function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/agendar/:businessSlug" element={<BookingPage />} />
          <Route path="/cancel/:id/:token" element={<CancelAppointmentPage />} />
          <Route path="/portal" element={<ClientPortalLoginPage />} />
          <Route path="/portal/view" element={<ClientPortalViewPage />} />
        </Route>
        
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard/overview" element={<OverviewPage />} />
            <Route path="/dashboard/appointments" element={<AppointmentsPage />} />
            <Route path="/dashboard/clients" element={<ClientsPage />} />
            <Route path="/dashboard/professionals" element={<ProfessionalsPage />} />
            <Route path="/dashboard/services" element={<ServicesPage />} />
            <Route path="/dashboard/settings" element={<SettingsPage />} />
            <Route path="/dashboard/users" element={<UsersPage />} />
            <Route path="/dashboard/reports" element={<ReportsPage />} />
            <Route path="/dashboard/subscriptions" element={<SubscriptionsPage />} />
          </Route>
        </Route>
        
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;