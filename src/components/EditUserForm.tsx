import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

const formSchema = z.object({
  full_name: z.string().min(2, "Nome do responsável é obrigatório."),
  business_name: z.string().min(2, "Nome do negócio é obrigatório."),
});

type Profile = {
  id: string;
  full_name: string | null;
  business_name: string | null;
};

type EditUserFormProps = {
  profile: Profile;
  onSuccess: () => void;
};

const EditUserForm = ({ profile, onSuccess }: EditUserFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        full_name: profile.full_name || "",
        business_name: profile.business_name || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        business_name: values.business_name,
      })
      .eq("id", profile.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Usuário atualizado com sucesso!");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="full_name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Nome do Responsável</FormLabel>
            <FormControl><Input placeholder="Ex: João da Silva" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="business_name" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Nome do Negócio</FormLabel>
            <FormControl><Input placeholder="Ex: Barbearia do João" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </Form>
  );
};

export default EditUserForm;