import PublicBookingForm from "@/components/PublicBookingForm";
import { Link } from "react-router-dom";
import { Scissors } from "lucide-react";

const BookingPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Scissors className="h-8 w-8 text-primary" />
            <span>Agenda Fixa</span>
          </Link>
          <p className="text-gray-300 mt-2">Faça seu agendamento online. É rápido e fácil!</p>
        </div>
        <PublicBookingForm />
      </div>
    </div>
  );
};

export default BookingPage;