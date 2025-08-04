import { useState } from "react";
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
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type AddUserFormProps = {
  onSuccess: () => void;
};

const AddUserForm = ({ onSuccess }: AddUserFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      business_name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-user', {
        body: values,
      });

      if (error) {
        const parsedError = JSON.parse(error.context?.responseText || '{}');
        throw new Error(parsedError.error || error.message);
      }
      
      showSuccess("Novo usuário de salão criado com sucesso!");
      onSuccess();
      form.reset();
    } catch (e: any) {
      showError(e.message);
    } finally {
      setLoading(false);
    }
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
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Email de Login</FormLabel>
            <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="password" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Senha Temporária</FormLabel>
            <FormControl><Input type="password" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Criando Usuário..." : "Criar Usuário"}
        </Button>
      </form>
    </Form>
  );
};

export default AddUserForm;