import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { User } from "lucide-react";

type ProfessionalData = {
  name: string;
  count: number;
};

type ProfessionalAppointment = {
  professionals: {
    full_name: string;
  } | null;
};

const TopProfessionalsCard = () => {
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProfessionals = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("professionals(full_name)")
        .returns<ProfessionalAppointment[]>();

      if (error) {
        console.error("Error fetching top professionals:", error);
        setLoading(false);
        return;
      }

      const professionalCounts: { [key: string]: number } = {};
      if (data) {
        data.forEach(item => {
          if (item.professionals?.full_name) {
            const name = item.professionals.full_name;
            professionalCounts[name] = (professionalCounts[name] || 0) + 1;
          }
        });
      }

      const sortedProfessionals = Object.entries(professionalCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      setProfessionals(sortedProfessionals);
      setLoading(false);
    };

    fetchTopProfessionals();
  }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
      <CardHeader>
        <CardTitle className="text-white">Top Profissionais</CardTitle>
        <CardDescription className="text-gray-300">Profissionais com mais agendamentos.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-white/10" />)}
          </div>
        ) : professionals.length > 0 ? (
          <ul className="space-y-3">
            {professionals.map((prof) => (
              <li key={prof.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span className="text-gray-200">{prof.name}</span>
                </div>
                <span className="font-bold text-white">{prof.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum profissional com agendamentos.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default TopProfessionalsCard;