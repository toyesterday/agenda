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
  full_name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().optional(),
});

type Professional = {
  id: number;
  full_name: string;
  phone: string | null;
};

type EditProfessionalFormProps = {
  professional: Professional;
  onSuccess: () => void;
};

const EditProfessionalForm = ({ professional, onSuccess }: EditProfessionalFormProps) => {
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (professional) {
      form.reset({
        full_name: professional.full_name,
        phone: professional.phone || "",
      });
    }
  }, [professional, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setLoading(true);
    const { error } = await supabase
      .from("professionals")
      .update(values)
      .eq("id", professional.id);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Profissional atualizado com sucesso!");
      onSuccess();
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
          {loading ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </form>
    </Form>
  );
};

export default EditProfessionalForm;