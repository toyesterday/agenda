import { useState, useEffect } from "react";
import PublicBookingForm from "@/components/PublicBookingForm";
import { Link, useParams } from "react-router-dom";
import { Scissors, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BookingPage = () => {
  const { businessSlug } = useParams<{ businessSlug: string }>();
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessSlug) {
      setLoading(false);
      return;
    }

    const fetchBusinessName = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("business_name")
        .eq("business_slug", businessSlug)
        .single();

      if (error || !data) {
        console.error("Error fetching business name:", error);
        setBusinessName("Negócio não encontrado");
      } else {
        setBusinessName(data.business_name);
      }
      setLoading(false);
    };

    fetchBusinessName();
  }, [businessSlug]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Scissors className="h-8 w-8 text-primary" />
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <span>{businessName || "Agenda Fixa"}</span>
            )}
          </Link>
          <p className="text-gray-300 mt-2">Faça seu agendamento online. É rápido e fácil!</p>
        </div>
        <PublicBookingForm businessSlug={businessSlug} />
      </div>
    </div>
  );
};

export default BookingPage;