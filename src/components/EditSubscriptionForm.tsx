import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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

const formSchema = z.object({
  subscription_due_date: z.date().optional(),
  subscription_status: z.string().min(1, "O status é obrigatório."),
});

type Profile = {
  id: string;
  business_name: string | null;
  subscription_due_date: string | null;
  subscription_status: string | null;
};

type EditSubscriptionFormProps = {
  profile: Profile;
  onSuccess: () => void;
};

const EditSubscriptionForm = ({ profile, onSuccess }: EditSubscriptionFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        subscription_due_date: profile.subscription_due_date ? new Date(profile.subscription_due_date) : undefined,
        subscription_status: profile.subscription_status || "active",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_due_date: values.subscription_due_date ? format(values.subscription_due_date, 'yyyy-MM-dd') : null,
        subscription_status: values.subscription_status,
      })
      .eq("id", profile.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Assinatura atualizada com sucesso!");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-300">
          Editando assinatura para: <span className="font-bold text-white">{profile.business_name}</span>
        </p>
        <FormField
          control={form.control}
          name="subscription_due_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-gray-300">Data de Vencimento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal bg-white/5 border-white/20 text-white hover:bg-white/10", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-gray-800/80 backdrop-blur-md border-white/20 text-white" align="start">
                  <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="subscription_status"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Status da Assinatura</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className="bg-white/5 border-white/20 text-white">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="due">Vencida</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </Form>
  );
};

export default EditSubscriptionForm;