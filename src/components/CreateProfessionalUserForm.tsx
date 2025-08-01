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
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type CreateProfessionalUserFormProps = {
  professionalId: number;
  professionalName: string;
  onSuccess: () => void;
};

const CreateProfessionalUserForm = ({ professionalId, professionalName, onSuccess }: CreateProfessionalUserFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-professional-user', {
        body: {
          ...values,
          professional_id: professionalId,
        },
      });

      if (error) {
        const parsedError = JSON.parse(error.context?.responseText || '{}');
        throw new Error(parsedError.error || error.message);
      }
      
      showSuccess(`Login para ${professionalName} criado com sucesso!`);
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
        <p className="text-sm text-gray-300">
          Você está criando um acesso para <span className="font-bold text-white">{professionalName}</span>. Eles poderão usar este email e senha para entrar no painel e ver a própria agenda.
        </p>
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel className="text-gray-300">Email de Login</FormLabel>
            <FormControl><Input type="email" placeholder="email.profissional@exemplo.com" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
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
          {loading ? "Criando Login..." : "Criar Login"}
        </Button>
      </form>
    </Form>
  );
};

export default CreateProfessionalUserForm;