import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";

const formSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  price: z.coerce.number().min(0, { message: "O preço não pode ser negativo." }),
  duration: z.coerce.number().int().min(1, { message: "A duração deve ser de pelo menos 1 minuto." }),
});

type AddServiceFormProps = {
  onSuccess: () => void;
};

const AddServiceForm = ({ onSuccess }: AddServiceFormProps) => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: 0,
      duration: 30,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    if (!profile?.business_owner_id) {
      showError("Não foi possível identificar o seu negócio. Tente fazer login novamente.");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("services")
      .insert([{ ...values, user_id: profile.business_owner_id }]);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Serviço adicionado com sucesso!");
      onSuccess();
      form.reset();
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Nome do Serviço</FormLabel>
            <FormControl><Input placeholder="Ex: Corte de Cabelo" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="price" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Preço (R$)</FormLabel>
              <FormControl><Input type="number" step="0.01" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="duration" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Duração (min)</FormLabel>
              <FormControl><Input type="number" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Serviço"}
        </Button>
      </form>
    </Form>
  );
};

export default AddServiceForm;