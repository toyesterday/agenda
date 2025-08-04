import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { DollarSign, Users, Calendar, Activity } from "lucide-react";
import OverviewChart from "@/components/OverviewChart";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfToday, endOfToday } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import PopularServicesCard from "@/components/dashboard/PopularServicesCard";
import TopProfessionalsCard from "@/components/dashboard/TopProfessionalsCard";

type OverviewData = {
  monthlyRevenue: number;
  todaysAppointments: number;
  newClients: number;
  occupancyRate: number;
};

const calculateOccupancyRate = async (userId: string) => {
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("user_id", userId)
    .gte("start_time", monthStart.toISOString())
    .lte("start_time", monthEnd.toISOString());

  if (appointmentsError || !appointments) return 0;

  const { data: schedules, error: schedulesError } = await supabase
    .from("professional_schedules")
    .select("day_of_week, start_time, end_time, is_available")
    .eq("user_id", userId)
    .eq("is_available", true);

  if (schedulesError || !schedules) return 0;

  let totalCapacity = 0;
  for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const daySchedule = schedules.find(s => s.day_of_week === dayOfWeek);
    if (daySchedule && daySchedule.start_time && daySchedule.end_time) {
      const [startHour, startMin] = daySchedule.start_time.split(':').map(Number);
      const [endHour, endMin] = daySchedule.end_time.split(':').map(Number);
      totalCapacity += (endHour + endMin / 60) - (startHour + startMin / 60);
    }
  }

  const totalBooked = appointments.reduce((acc, appt) => {
    const duration = (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / (1000 * 60 * 60);
    return acc + duration;
  }, 0);

  return totalCapacity > 0 ? Math.min(100, Math.round((totalBooked / totalCapacity) * 100)) : 0;
};

const OverviewPage = () => {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      const today = new Date();
      const monthStart = startOfMonth(today).toISOString();
      const monthEnd = endOfMonth(today).toISOString();
      const todayStart = startOfToday().toISOString();
      const todayEnd = endOfToday().toISOString();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const revenuePromise = supabase
          .from("appointments")
          .select("price")
          .eq("user_id", user.id)
          .eq("status", "completed")
          .gte("start_time", monthStart)
          .lte("start_time", monthEnd);

        const appointmentsPromise = supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("start_time", todayStart)
          .lte("start_time", todayEnd);

        const clientsPromise = supabase
          .from("clients")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd);

        const occupancyPromise = calculateOccupancyRate(user.id);

        const [revenueRes, appointmentsRes, clientsRes, occupancyRate] = await Promise.all([
          revenuePromise,
          appointmentsPromise,
          clientsPromise,
          occupancyPromise
        ]);

        const totalRevenue = revenueRes.data?.reduce((sum, record) => sum + (record.price || 0), 0) || 0;
        const totalAppointments = appointmentsRes.count || 0;
        const totalNewClients = clientsRes.count || 0;

        setData({
          monthlyRevenue: totalRevenue,
          todaysAppointments: totalAppointments,
          newClients: totalNewClients,
          occupancyRate
        });

      } catch (error) {
        console.error("Error fetching overview data:", error);
        setData({ 
          monthlyRevenue: 0, 
          todaysAppointments: 0, 
          newClients: 0, 
          occupancyRate: 0 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, description, isLoading }: { title: string, value: string | number, icon: React.ElementType, description: string, isLoading: boolean }) => (
    <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 bg-white/10" />
            <Skeleton className="h-4 w-full mt-2 bg-white/10" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-gray-400">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Visão Geral</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Faturamento Mensal"
          value={`R$ ${data?.monthlyRevenue.toFixed(2) || '0.00'}`}
          icon={DollarSign}
          description="Receita total este mês"
          isLoading={loading}
        />
        <StatCard 
          title="Clientes Novos"
          value={data?.newClients || 0}
          icon={Users}
          description="Novos clientes este mês"
          isLoading={loading}
        />
        <StatCard 
          title="Agendamentos Hoje"
          value={data?.todaysAppointments || 0}
          icon={Calendar}
          description="Agendamentos para hoje"
          isLoading={loading}
        />
        <StatCard 
          title="Taxa de Ocupação"
          value={`${data?.occupancyRate || 0}%`}
          icon={Activity}
          description="Média de horários preenchidos"
          isLoading={loading}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <OverviewChart />
        </div>
        <div className="space-y-4">
          <PopularServicesCard />
          <TopProfessionalsCard />
        </div>
      </div>
    </div>
  );
};

export default OverviewPage;