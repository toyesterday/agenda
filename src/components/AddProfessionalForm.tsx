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
  full_name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().optional(),
});

type AddProfessionalFormProps = {
  onSuccess: () => void;
};

const AddProfessionalForm = ({ onSuccess }: AddProfessionalFormProps) => {
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
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
      .from("professionals")
      .insert([{ ...values, user_id: profile.business_owner_id }]);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Profissional adicionado com sucesso!");
      onSuccess();
      form.reset();
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do profissional" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-gray-300">Telefone</FormLabel>
              <FormControl>
                <Input placeholder="(11) 99999-9999" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Profissional"}
        </Button>
      </form>
    </Form>
  );
};

export default AddProfessionalForm;