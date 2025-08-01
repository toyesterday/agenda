import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from "./ui/skeleton";

type ChartData = {
  name: string;
  total: number;
};

const OverviewChart = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      const twelveMonthsAgo = subMonths(new Date(), 12);

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("start_time, price")
        .eq("status", "completed")
        .gte("start_time", twelveMonthsAgo.toISOString());

      if (error) {
        console.error("Error fetching chart data:", error);
        setLoading(false);
        return;
      }

      const monthlyTotals: { [key: string]: number } = {};

      for (let i = 11; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const monthKey = format(date, 'yyyy-MM');
        monthlyTotals[monthKey] = 0;
      }

      if (appointments) {
        appointments.forEach(appt => {
          if (appt.price) {
            const monthKey = format(new Date(appt.start_time), 'yyyy-MM');
            if (monthlyTotals[monthKey] !== undefined) {
              monthlyTotals[monthKey] += appt.price;
            }
          }
        });
      }

      const chartData = Object.keys(monthlyTotals).map(monthKey => {
        const [year, month] = monthKey.split('-');
        const date = new Date(Number(year), Number(month) - 1);
        return {
          name: format(date, 'MMM', { locale: ptBR }).replace('.', ''),
          total: monthlyTotals[monthKey],
        };
      });

      setData(chartData);
      setLoading(false);
    };

    fetchChartData();
  }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
      <CardHeader>
        <CardTitle className="text-white">Análise de Faturamento</CardTitle>
        <CardDescription className="text-gray-300">Faturamento dos últimos 12 meses.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <div className="flex h-[350px] w-full items-center justify-center">
            <Skeleton className="h-full w-full bg-white/10" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                stroke="#a0a0a0"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#a0a0a0"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${value / 1000}k`}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default OverviewChart;