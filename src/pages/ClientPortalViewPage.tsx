import { useState, useEffect, useMemo } from "react";
import { useLocation, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, User, Star, Scissors, AlertTriangle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Appointment = {
  id: number;
  start_time: string;
  service_name: string;
  status: string;
  cancellation_token: string;
  professionals: { full_name: string } | null;
  profiles: { business_name: string } | null;
  loyalty_points: Record<string, number> | null;
};

type GroupedAppointments = {
  [businessName: string]: {
    loyalty_points: Record<string, number> | null;
    appointments: Appointment[];
  };
};

const LoyaltyCard = ({ points }: { points: Record<string, number> | null }) => {
  if (!points || Object.keys(points).length === 0) {
    return (
      <div className="text-center text-gray-400 text-sm p-4">
        <p>Você ainda não tem pontos de fidelidade neste estabelecimento.</p>
        <p>Continue agendando para começar a ganhar!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {Object.entries(points).map(([service, count]) => (
        <div key={service} className="bg-blue-900/30 p-3 rounded-lg text-center">
          <p className="text-xs text-blue-200 capitalize">{service.replace(/_/g, ' ')}</p>
          <p className="text-2xl font-bold text-white">{count}<span className="text-base font-normal text-gray-300">/10</span></p>
        </div>
      ))}
    </div>
  );
};

const ClientPortalViewPage = () => {
  const location = useLocation();
  const phone = location.state?.phone;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }

    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-client-appointments', {
          body: { phone },
        });

        if (functionError) {
          const parsedError = JSON.parse(functionError.context?.responseText || '{}');
          throw new Error(parsedError.error || functionError.message);
        }
        
        setAppointments(data.appointments || []);
      } catch (e: any) {
        setError(e.message || "Ocorreu um erro ao buscar seus agendamentos.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [phone]);

  const groupedAppointments = useMemo<GroupedAppointments>(() => {
    return appointments.reduce((acc, appt) => {
      const businessName = appt.profiles?.business_name || "Outros Agendamentos";
      if (!acc[businessName]) {
        acc[businessName] = {
          loyalty_points: appt.loyalty_points,
          appointments: [],
        };
      }
      acc[businessName].appointments.push(appt);
      return acc;
    }, {} as GroupedAppointments);
  }, [appointments]);

  if (!phone) {
    return <Navigate to="/portal" replace />;
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'confirmed': return 'default';
      case 'completed': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 text-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <Link to="/" className="flex items-center justify-center gap-2 text-2xl font-bold">
            <Scissors className="h-8 w-8 text-primary" />
            <span>Seu Portal</span>
          </Link>
          <p className="text-gray-300 mt-2">Agendamentos e fidelidade para o telefone: {phone}</p>
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive text-destructive">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <AlertTriangle />
              <CardTitle>Ocorreu um erro</CardTitle>
            </CardHeader>
            <CardContent><p>{error}</p></CardContent>
          </Card>
        )}

        {!loading && !error && Object.keys(groupedAppointments).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedAppointments).map(([businessName, data]) => {
              const upcoming = data.appointments.filter(a => new Date(a.start_time) >= new Date() && a.status === 'confirmed');
              const past = data.appointments.filter(a => new Date(a.start_time) < new Date() || a.status !== 'confirmed');

              return (
                <Card key={businessName} className="bg-white/5 border border-white/10 shadow-xl overflow-hidden">
                  <CardHeader className="bg-white/5">
                    <CardTitle className="text-white text-xl">{businessName}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 space-y-6">
                    <Card className="bg-white/5 border border-white/10">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-primary" />
                          <CardTitle className="text-white text-lg">Seu Cartão Fidelidade</CardTitle>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <LoyaltyCard points={data.loyalty_points} />
                      </CardContent>
                    </Card>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Próximos Agendamentos</h3>
                      {upcoming.length > 0 ? (
                        <div className="space-y-4">
                          {upcoming.map(appt => (
                            <Card key={appt.id} className="bg-white/5 border border-white/10 flex flex-col sm:flex-row">
                              <div className="p-4 border-b sm:border-b-0 sm:border-r border-white/10 flex flex-col justify-center items-center text-center">
                                <p className="text-sm text-gray-300 uppercase">{format(new Date(appt.start_time), "MMM", { locale: ptBR })}</p>
                                <p className="text-2xl font-bold text-white">{format(new Date(appt.start_time), "d")}</p>
                                <p className="text-sm text-gray-300">{format(new Date(appt.start_time), "HH:mm")}</p>
                              </div>
                              <div className="p-4 flex-grow">
                                <div className="flex justify-between items-start">
                                  <h4 className="font-semibold text-white">{appt.service_name}</h4>
                                  <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                                </div>
                                <p className="text-sm text-gray-300 flex items-center gap-2 mt-1"><User className="h-4 w-4" /> {appt.professionals?.full_name || 'N/A'}</p>
                                <Button asChild size="sm" variant="destructive" className="w-full sm:w-auto mt-3">
                                  <Link to={`/cancel/${appt.id}/${appt.cancellation_token}`}>Cancelar <ExternalLink className="ml-2 h-4 w-4" /></Link>
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      ) : <p className="text-gray-400 text-center py-4 text-sm">Nenhum agendamento futuro.</p>}
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-white mb-3">Histórico</h3>
                      {past.length > 0 ? (
                        <div className="space-y-2">
                          {past.map(appt => (
                            <div key={appt.id} className="flex justify-between items-center p-3 rounded-md bg-white/5 text-sm">
                              <div>
                                <p className="text-white">{appt.service_name}</p>
                                <p className="text-gray-400 text-xs">{format(new Date(appt.start_time), "dd/MM/yyyy 'às' HH:mm")}</p>
                              </div>
                              <Badge variant={getStatusVariant(appt.status)}>{appt.status}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-gray-400 text-center py-4 text-sm">Nenhum histórico de agendamentos.</p>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          !loading && !error && <p className="text-gray-400 text-center py-10">Nenhum agendamento encontrado para este número.</p>
        )}
        <div className="text-center mt-8">
          <Button asChild variant="outline" className="bg-transparent border-white/20 hover:bg-white/10">
            <Link to="/portal">Consultar outro número</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientPortalViewPage;