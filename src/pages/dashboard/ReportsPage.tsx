import { useState, useEffect } from "react";
import { DateRange } from "react-day-picker";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, DollarSign, Users, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";

type ReportData = {
  totalRevenue: number;
  totalAppointments: number;
  averageTicket: number;
  professionalReport: { name: string; appointments: number; revenue: number }[];
  serviceReport: { name: string; appointments: number; revenue: number }[];
};

type AppointmentReportInfo = {
  price: number | null;
  status: string;
  service_name: string;
  professionals: { full_name: string }[] | null;
};

const ReportsPage = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!date?.from || !date?.to) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("appointments")
        .select("price, status, service_name, professionals(full_name)")
        .eq("status", "completed")
        .gte("start_time", date.from.toISOString())
        .lte("start_time", date.to.toISOString());

      if (error) {
        showError("Erro ao buscar dados para o relatório.");
        console.error(error);
        setLoading(false);
        return;
      }

      const completedAppointments = (data as AppointmentReportInfo[] | null)?.filter(appt => appt.price != null) || [];

      const totalRevenue = completedAppointments.reduce((sum, appt) => sum + (appt.price || 0), 0);
      const totalAppointments = completedAppointments.length;
      const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

      const revenueByProfessional = completedAppointments.reduce((acc, appt) => {
        const name = appt.professionals?.[0]?.full_name || "Não atribuído";
        if (!acc[name]) acc[name] = { appointments: 0, revenue: 0 };
        acc[name].appointments += 1;
        acc[name].revenue += appt.price || 0;
        return acc;
      }, {} as Record<string, { appointments: number; revenue: number }>);

      const performanceByService = completedAppointments.reduce((acc, appt) => {
        const services = appt.service_name.split(",").map(s => s.trim());
        services.forEach(serviceName => {
          if (!acc[serviceName]) acc[serviceName] = { appointments: 0, revenue: 0 };
          acc[serviceName].appointments += 1;
          acc[serviceName].revenue += appt.price || 0;
        });
        return acc;
      }, {} as Record<string, { appointments: number; revenue: number }>);

      setReportData({
        totalRevenue,
        totalAppointments,
        averageTicket,
        professionalReport: Object.entries(revenueByProfessional).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue),
        serviceReport: Object.entries(performanceByService).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue),
      });

      setLoading(false);
    };

    fetchReportData();
  }, [date]);

  const StatCard = ({ title, value, icon: Icon }: { title: string, value: string, icon: React.ElementType }) => (
    <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-3/4 bg-white/10" /> : <div className="text-2xl font-bold">{value}</div>}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Relatórios Financeiros</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-full sm:w-[300px] justify-start text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y", { locale: ptBR })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: ptBR })}
                  </>
                ) : (
                  format(date.from, "LLL dd, y", { locale: ptBR })
                )
              ) : (
                <span>Escolha uma data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-gray-800/80 backdrop-blur-md border-white/20 text-white" align="end">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Faturamento Total" value={`R$ ${reportData?.totalRevenue.toFixed(2) || '0.00'}`} icon={DollarSign} />
        <StatCard title="Agendamentos Concluídos" value={`${reportData?.totalAppointments || 0}`} icon={Users} />
        <StatCard title="Ticket Médio" value={`R$ ${reportData?.averageTicket.toFixed(2) || '0.00'}`} icon={BarChart} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
          <CardHeader><CardTitle>Faturamento por Profissional</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-white">Profissional</TableHead><TableHead className="text-white">Agendamentos</TableHead><TableHead className="text-right text-white">Receita</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full bg-white/10" /></TableCell></TableRow>)
                  : reportData?.professionalReport.map(item => (
                    <TableRow key={item.name} className="border-b-white/10 hover:bg-white/5"><TableCell>{item.name}</TableCell><TableCell>{item.appointments}</TableCell><TableCell className="text-right">R$ {item.revenue.toFixed(2)}</TableCell></TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
          <CardHeader><CardTitle>Desempenho por Serviço</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow className="hover:bg-transparent"><TableHead className="text-white">Serviço</TableHead><TableHead className="text-white">Agendamentos</TableHead><TableHead className="text-right text-white">Receita Gerada*</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? [...Array(3)].map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-8 w-full bg-white/10" /></TableCell></TableRow>)
                  : reportData?.serviceReport.map(item => (
                    <TableRow key={item.name} className="border-b-white/10 hover:bg-white/5"><TableCell>{item.name}</TableCell><TableCell>{item.appointments}</TableCell><TableCell className="text-right">R$ {item.revenue.toFixed(2)}</TableCell></TableRow>
                  ))}
              </TableBody>
            </Table>
            <p className="text-xs text-gray-400 mt-2">*A receita gerada reflete o valor total de todos os agendamentos que incluíram este serviço.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsPage;