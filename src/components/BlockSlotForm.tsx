import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { User } from "@supabase/supabase-js";

const formSchema = z.object({
  professional_id: z.string().min(1, "Selecione um profissional ou 'Todos'."),
  date: z.date({ required_error: "A data é obrigatória." }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido."),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido."),
  reason: z.string().optional(),
}).refine(data => data.start_time < data.end_time, {
  message: "A hora final deve ser maior que a inicial.",
  path: ["end_time"],
});

type Professional = { id: number; full_name: string; auth_id: string | null; };
export type BlockedSlot = {
  id: number;
  professional_id: number | null;
  start_time: string;
  end_time: string;
  reason: string | null;
};
type Profile = {
  role: 'admin' | 'super_admin' | 'professional' | null;
  business_owner_id: string | null;
};

interface BlockSlotFormProps {
  blockedSlot?: BlockedSlot | null;
  onSuccess: () => void;
  user: User | null;
  profile: Profile | null;
  professionals: Professional[];
}

const BlockSlotForm = ({ blockedSlot, onSuccess, user, profile, professionals }: BlockSlotFormProps) => {
  const [loading, setLoading] = useState(false);
  const isEditMode = !!blockedSlot;
  const isProfessionalRole = profile?.role === 'professional';

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      professional_id: "",
      date: new Date(),
      start_time: "12:00",
      end_time: "13:00",
      reason: "Almoço",
    },
  });

  useEffect(() => {
    if (isEditMode && blockedSlot) {
      const startDate = new Date(blockedSlot.start_time);
      const endDate = new Date(blockedSlot.end_time);
      form.reset({
        professional_id: blockedSlot.professional_id ? String(blockedSlot.professional_id) : "all",
        date: startDate,
        start_time: format(startDate, "HH:mm"),
        end_time: format(endDate, "HH:mm"),
        reason: blockedSlot.reason || "",
      });
    } else {
      form.reset({
        professional_id: "", date: new Date(), start_time: "12:00", end_time: "13:00", reason: "Almoço",
      });
      if (isProfessionalRole && user) {
        const self = professionals.find(p => p.auth_id === user.id);
        if (self) form.setValue('professional_id', String(self.id));
      }
    }
  }, [blockedSlot, isEditMode, form, isProfessionalRole, user, professionals]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    if (!profile?.business_owner_id) {
      showError("Não foi possível identificar o seu negócio. Tente fazer login novamente.");
      setLoading(false);
      return;
    }

    const [startHours, startMinutes] = values.start_time.split(':').map(Number);
    const startDateTime = new Date(values.date);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const [endHours, endMinutes] = values.end_time.split(':').map(Number);
    const endDateTime = new Date(values.date);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    const slotData = {
      user_id: profile.business_owner_id,
      professional_id: values.professional_id === "all" ? null : Number(values.professional_id),
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      reason: values.reason,
    };

    const { error } = isEditMode
      ? await supabase.from("blocked_slots").update(slotData).eq("id", blockedSlot!.id)
      : await supabase.from("blocked_slots").insert(slotData);

    if (error) {
      showError(error.message);
    } else {
      showSuccess(isEditMode ? "Horário bloqueado atualizado!" : "Horário bloqueado com sucesso!");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="professional_id" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Profissional</FormLabel>
            <Select onValueChange={field.onChange} value={field.value} disabled={isProfessionalRole}>
              <FormControl><SelectTrigger className="bg-white/5 border-white/20 text-white"><SelectValue placeholder="Selecione um profissional" /></SelectTrigger></FormControl>
              <SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">
                {!isProfessionalRole && <SelectItem value="all">Todos os Profissionais</SelectItem>}
                {professionals.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="date" render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel className="text-gray-300">Data</FormLabel>
            <Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0 bg-gray-800/80 backdrop-blur-md border-white/20 text-white" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="start_time" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Hora de Início</FormLabel>
              <FormControl><Input type="time" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="end_time" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Hora Final</FormLabel>
              <FormControl><Input type="time" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="reason" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Motivo (Opcional)</FormLabel>
            <FormControl><Textarea placeholder="Ex: Almoço, Reunião, etc." {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : (isEditMode ? "Salvar Alterações" : "Bloquear Horário")}
        </Button>
      </form>
    </Form>
  );
};

export default BlockSlotForm;