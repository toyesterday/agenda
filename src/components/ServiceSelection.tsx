import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";

export type Service = {
  name: string;
  price: number;
  duration: number; // in minutes
};

type ServiceSelectionProps = {
  value: Service[];
  onChange: (services: Service[]) => void;
};

const ServiceSelection = ({ value, onChange }: ServiceSelectionProps) => {
  const [availableServices, setAvailableServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('name, price, duration')
        .order('name', { ascending: true });

      if (error) {
        showError("Não foi possível carregar os serviços.");
      } else {
        setAvailableServices(data as Service[] || []);
      }
      setLoading(false);
    };
    fetchServices();
  }, []);

  const handleSelect = (service: Service) => {
    const isSelected = value.some(s => s.name === service.name);
    if (isSelected) {
      onChange(value.filter(s => s.name !== service.name));
    } else {
      onChange([...value, service]);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 w-full bg-white/10" />)}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {availableServices.map((service) => {
        const isSelected = value.some(s => s.name === service.name);
        return (
          <div
            key={service.name}
            onClick={() => handleSelect(service)}
            className={cn(
              "relative cursor-pointer rounded-lg border-2 p-4 text-center transition-all duration-200",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-white/20 bg-white/5 hover:border-primary/50"
            )}
          >
            {isSelected && (
              <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary" />
            )}
            <h4 className="font-semibold text-white">{service.name}</h4>
            <p className="text-sm text-gray-300">R$ {service.price.toFixed(2)}</p>
          </div>
        );
      })}
    </div>
  );
};

export default ServiceSelection;