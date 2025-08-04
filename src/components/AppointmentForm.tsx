import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { updateLoyalty, deductLoyalty } from "@/utils/loyalty";
import { User } from "@supabase/supabase-js";

const formSchema = z.object({
  client_id: z.string().min(1, "Selecione um cliente."),
  professional_id: z.string().min(1, "Selecione um profissional."),
  service_name: z.string().min(2, "O nome do serviço é obrigatório."),
  date: z.date({ required_error: "A data é obrigatória." }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido."),
  duration: z.coerce.number().int().positive("A duração deve ser um número positivo."),
  price: z.coerce.number().nonnegative("O preço não pode ser negativo."),
  status: z.string().optional(),
});

type Client = { id: number; full_name: string; };
type Professional = { id: number; full_name: string; auth_id: string | null; };
type Service = { id: number; name: string; price: number; duration: number; };
export type Appointment = {
  id: number;
  client_id: number;
  professional_id: number;
  service_name: string;
  start_time: string;
  end_time: string;
  price: number;
  status: string;
};
type Profile = {
  role: 'admin' | 'super_admin' | 'professional' | null;
  business_owner_id: string | null;
};

interface AppointmentFormProps {
  appointment?: Appointment | null;
  onSuccess: () => void;
  user: User | null;
  profile: Profile | null;
  professionals: Professional[];
}

const AppointmentForm = ({ appointment, onSuccess, user, profile, professionals }: AppointmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const isEditMode = !!appointment;
  const isProfessionalRole = profile?.role === 'professional';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_id: "",
      professional_id: "",
      service_name: "",
      date: new Date(),
      start_time: "09:00",
      duration: 30,
      price: 0,
      status: "confirmed",
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      const clientsPromise = supabase.from("clients").select("id, full_name");
      const servicesPromise = supabase.from("services").select("id, name, price, duration");
      const [clientsRes, servicesRes] = await Promise.all([clientsPromise, servicesPromise]);
      if (clientsRes.error) showError("Falha ao carregar clientes."); else setClients(clientsRes.data || []);
      if (servicesRes.error) showError("Falha ao carregar serviços."); else setServices(servicesRes.data || []);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isEditMode && appointment) {
      const startDate = new Date(appointment.start_time);
      const endDate = new Date(appointment.end_time);
      const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      form.reset({
        client_id: String(appointment.client_id),
        professional_id: String(appointment.professional_id),
        service_name: appointment.service_name,
        date: startDate,
        start_time: format(startDate, "HH:mm"),
        duration: durationInMinutes,
        price: appointment.price,
        status: appointment.status,
      });
    } else {
      form.reset({
        client_id: "", professional_id: "", service_name: "",
        date: new Date(), start_time: "09:00", duration: 30, price: 0, status: "confirmed",
      });
      if (isProfessionalRole && user) {
        const self = professionals.find(p => p.auth_id === user.id);
        if (self) form.setValue('professional_id', String(self.id));
      }
    }
  }, [appointment, isEditMode, form, isProfessionalRole, user, professionals]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    if (!profile?.business_owner_id) {
      showError("Não foi possível identificar o seu negócio. Tente fazer login novamente.");
      setLoading(false);
      return;
    }

    const [hours, minutes] = values.start_time.split(':').map(Number);
    const startDateTime = new Date(values.date);
    startDateTime.setHours(hours, minutes, 0, 0);

    const endDateTime = new Date(startDateTime.getTime() + values.duration * 60000);

    const appointmentData = {
      user_id: profile.business_owner_id,
      client_id: Number(values.client_id),
      professional_id: Number(values.professional_id),
      service_name: values.service_name,
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      price: values.price,
      status: values.status || 'confirmed',
    };

    let error;
    if (isEditMode && appointment) {
      const { error: updateError } = await supabase.from("appointments").update(appointmentData).eq("id", appointment.id);
      error = updateError;
      if (!error) {
        const oldStatus = appointment.status;
        const newStatus = values.status || 'confirmed';
        const clientName = clients.find(c => c.id === Number(values.client_id))?.full_name || "O cliente";
        if (newStatus === 'completed' && oldStatus !== 'completed') {
          const { newCount, rewardGranted } = await updateLoyalty(Number(values.client_id), values.service_name);
          if (rewardGranted) showSuccess(`${clientName} ganhou um(a) ${values.service_name} gratuito(a)! Pontos zerados.`);
          else showSuccess(`Agendamento concluído! ${clientName} agora tem ${newCount} ponto(s) em ${values.service_name}.`);
        } else if (oldStatus === 'completed' && newStatus !== 'completed') {
          await deductLoyalty(Number(values.client_id), values.service_name);
          showSuccess(`Ponto de fidelidade revogado para ${clientName} devido à alteração do status.`);
        } else {
          showSuccess("Agendamento atualizado com sucesso!");
        }
      }
    } else {
      const { error: insertError } = await supabase.from("appointments").insert(appointmentData);
      error = insertError;
      if (!error) showSuccess("Agendamento criado com sucesso!");
    }

    if (error) showError(error.message);
    else onSuccess();
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="client_id" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Cliente</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Selecione um cliente" /></SelectTrigger></FormControl><SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">{clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.full_name}</SelectItem>)}</SelectContent></Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="professional_id" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Profissional</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isProfessionalRole}><FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Selecione um profissional" /></SelectTrigger></FormControl><SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">{professionals.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.full_name}</SelectItem>)}</SelectContent></Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="service_name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Serviço</FormLabel>
            <Select onValueChange={(value) => {
              const service = services.find(s => s.name === value);
              if (service) {
                field.onChange(service.name);
                form.setValue('price', service.price);
                form.setValue('duration', service.duration);
              }
            }} value={field.value}>
              <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Selecione um serviço" /></SelectTrigger></FormControl>
              <SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">{services.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="date" render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-gray-300">Data</FormLabel>
              <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0 bg-gray-800/80 backdrop-blur-md border-white/20 text-white" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="start_time" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Hora de Início</FormLabel>
              <FormControl><Input type="time" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Duração (minutos)</FormLabel>
              <FormControl><Input type="number" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Preço (R$)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        {isEditMode && (
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Selecione um status" /></SelectTrigger></FormControl><SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white"><SelectItem value="confirmed">Confirmado</SelectItem><SelectItem value="cancelled">Cancelado</SelectItem><SelectItem value="completed">Concluído</SelectItem></SelectContent></Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : (isEditMode ? "Salvar Alterações" : "Criar Agendamento")}
        </Button>
      </form>
    </Form>
  );
};

export default AppointmentForm;