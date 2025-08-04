import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "./ui/skeleton";
import { useAuth } from "@/context/AuthContext";

const scheduleDaySchema = z.object({
  day_of_week: z.number(),
  is_available: z.boolean(),
  start_time: z.string().optional().or(z.literal('')),
  end_time: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.is_available) {
    if (!data.start_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['start_time'],
        message: 'Obrigatório',
      });
    }
    if (!data.end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'Obrigatório',
      });
    }
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_time'],
        message: 'Deve ser maior',
      });
    }
  }
});

const scheduleSchema = z.object({
  schedules: z.array(scheduleDaySchema),
});

type ScheduleFormProps = {
  professionalId: number;
  onSuccess: () => void;
};

const daysOfWeek = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const ScheduleManagementForm = ({ professionalId, onSuccess }: ScheduleFormProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { profile } = useAuth();

  const form = useForm<z.infer<typeof scheduleSchema>>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      schedules: daysOfWeek.map((_, index) => ({
        day_of_week: index,
        is_available: false,
        start_time: "09:00",
        end_time: "18:00",
      })),
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "schedules",
  });

  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("professional_schedules")
        .select("*")
        .eq("professional_id", professionalId);

      if (error) {
        showError("Falha ao carregar os horários.");
      } else if (data) {
        const newSchedules = form.getValues('schedules').map((defaultSchedule, index) => {
          const savedSchedule = data.find(d => d.day_of_week === index);
          return savedSchedule ? {
            day_of_week: savedSchedule.day_of_week,
            is_available: savedSchedule.is_available,
            start_time: savedSchedule.start_time?.substring(0, 5) || "09:00",
            end_time: savedSchedule.end_time?.substring(0, 5) || "18:00",
          } : defaultSchedule;
        });
        form.reset({ schedules: newSchedules });
      }
      setLoading(false);
    };

    fetchSchedule();
  }, [professionalId, form]);

  const onSubmit = async (values: z.infer<typeof scheduleSchema>) => {
    setSaving(true);
    if (!profile?.business_owner_id) {
      showError("Você precisa estar logado e associado a um negócio.");
      setSaving(false);
      return;
    }

    const upsertData = values.schedules.map(schedule => ({
      user_id: profile.business_owner_id,
      professional_id: professionalId,
      day_of_week: schedule.day_of_week,
      is_available: schedule.is_available,
      start_time: schedule.is_available ? schedule.start_time : null,
      end_time: schedule.is_available ? schedule.end_time : null,
    }));

    const { error } = await supabase.from("professional_schedules").upsert(upsertData, {
      onConflict: 'professional_id, day_of_week',
    });

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Horários atualizados com sucesso!");
      onSuccess();
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-20 sm:h-10 w-full bg-white/10" />)}
        <Skeleton className="h-10 w-24 mt-4 bg-white/10" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {fields.map((field, index) => (
          <div key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 border border-white/20 rounded-lg">
            <div className="flex items-center justify-between w-full sm:w-auto">
              <FormLabel className="text-gray-300 w-24">{daysOfWeek[index]}</FormLabel>
              <FormField
                control={form.control}
                name={`schedules.${index}.is_available`}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FormField
                control={form.control}
                name={`schedules.${index}.start_time`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ''} disabled={!form.watch(`schedules.${index}.is_available`)} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <span className="text-gray-400">-</span>
              <FormField
                control={form.control}
                name={`schedules.${index}.end_time`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="time" {...field} value={field.value || ''} disabled={!form.watch(`schedules.${index}.is_available`)} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>
        ))}
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar Horários"}
        </Button>
      </form>
    </Form>
  );
};

export default ScheduleManagementForm;