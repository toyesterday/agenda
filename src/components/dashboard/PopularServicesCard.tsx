import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Tag } from "lucide-react";

type ServiceData = {
  name: string;
  count: number;
};

const PopularServicesCard = () => {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularServices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("service_name");

      if (error) {
        console.error("Error fetching popular services:", error);
        setLoading(false);
        return;
      }

      const serviceCounts: { [key: string]: number } = {};
      data.forEach((item: { service_name: string }) => {
        const serviceNames = item.service_name.split(',').map((s: string) => s.trim());
        serviceNames.forEach((name: string) => {
            serviceCounts[name] = (serviceCounts[name] || 0) + 1;
        });
      });

      const sortedServices = Object.entries(serviceCounts)
        .map(([name, count]: [string, number]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      setServices(sortedServices);
      setLoading(false);
    };

    fetchPopularServices();
  }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
      <CardHeader>
        <CardTitle className="text-white">Serviços Populares</CardTitle>
        <CardDescription className="text-gray-300">Os serviços mais agendados.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full bg-white/10" />)}
          </div>
        ) : services.length > 0 ? (
          <ul className="space-y-3">
            {services.map((service) => (
              <li key={service.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-gray-200">{service.name}</span>
                </div>
                <span className="font-bold text-white">{service.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 text-center py-4">Nenhum dado de serviço ainda.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default PopularServicesCard;