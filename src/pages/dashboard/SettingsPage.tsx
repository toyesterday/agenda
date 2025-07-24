import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  full_name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).optional().or(z.literal('')),
  business_name: z.string().min(2, { message: "O nome do negócio deve ter pelo menos 2 caracteres." }).optional().or(z.literal('')),
  business_whatsapp_number: z.string().optional().or(z.literal('')),
  notifications_enabled: z.boolean().default(true),
  timezone: z.string().optional().or(z.literal('')),
  theme: z.string().optional().or(z.literal('')),
  new_appointment_client_template: z.string().optional(),
  new_appointment_business_template: z.string().optional(),
  reminder_client_template: z.string().optional(),
});

const timezones = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Rio_Branco", label: "Acre (UTC-5)" },
];

const placeholders = [
  "{{nome_cliente}}",
  "{{nome_servico}}",
  "{{nome_profissional}}",
  "{{data_agendamento}}",
  "{{nome_negocio}}",
  "{{link_cancelamento}}",
];

const DEFAULT_CLIENT_CONFIRMATION = `Olá, {{nome_cliente}}! Seu agendamento para "{{nome_servico}}" com {{nome_profissional}} no dia {{data_agendamento}} foi confirmado.\n\nPara cancelar, acesse: {{link_cancelamento}}`;
const DEFAULT_BUSINESS_CONFIRMATION = `Novo agendamento: {{nome_cliente}} agendou "{{nome_servico}}" com {{nome_profissional}} para {{data_agendamento}}.`;
const DEFAULT_CLIENT_REMINDER = `Olá, {{nome_cliente}}! Lembrete do seu agendamento no(a) {{nome_negocio}}: "{{nome_servico}}" com {{nome_profissional}}, {{data_agendamento}}.`;

const SettingsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      business_name: "",
      business_whatsapp_number: "",
      notifications_enabled: true,
      timezone: "America/Sao_Paulo",
      theme: "default",
      new_appointment_client_template: DEFAULT_CLIENT_CONFIRMATION,
      new_appointment_business_template: DEFAULT_BUSINESS_CONFIRMATION,
      reminder_client_template: DEFAULT_CLIENT_REMINDER,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setLoading(true);
      
      const profilePromise = supabase
        .from("profiles")
        .select("full_name, business_name, business_whatsapp_number, notifications_enabled, timezone, theme")
        .eq("id", user.id)
        .single();

      const templatesPromise = supabase
        .from("whatsapp_templates")
        .select("template_name, template_content")
        .eq("user_id", user.id);

      const [{ data: profileData, error: profileError }, { data: templatesData, error: templatesError }] = await Promise.all([profilePromise, templatesPromise]);

      if (profileError && profileError.code !== 'PGRST116') {
        showError("Falha ao carregar o perfil.");
        console.error(profileError);
      } else if (profileData) {
        form.reset({
          ...form.getValues(),
          full_name: profileData.full_name || "",
          business_name: profileData.business_name || "",
          business_whatsapp_number: profileData.business_whatsapp_number || "",
          notifications_enabled: profileData.notifications_enabled ?? true,
          timezone: profileData.timezone || "America/Sao_Paulo",
          theme: profileData.theme || "default",
        });
      }

      if (templatesError) {
        showError("Falha ao carregar os templates de mensagem.");
      } else if (templatesData) {
        const templateMap = templatesData.reduce((acc, t) => {
          acc[t.template_name] = t.template_content;
          return acc;
        }, {} as Record<string, string>);
        
        form.setValue('new_appointment_client_template', templateMap['new_appointment_client'] || DEFAULT_CLIENT_CONFIRMATION);
        form.setValue('new_appointment_business_template', templateMap['new_appointment_business'] || DEFAULT_BUSINESS_CONFIRMATION);
        form.setValue('reminder_client_template', templateMap['reminder_client'] || DEFAULT_CLIENT_REMINDER);
      }

      setLoading(false);
    };

    fetchSettings();
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    setSaving(true);

    const profileUpdatePromise = supabase
      .from("profiles")
      .update({
        full_name: values.full_name,
        business_name: values.business_name,
        business_whatsapp_number: values.business_whatsapp_number,
        notifications_enabled: values.notifications_enabled,
        timezone: values.timezone,
        theme: values.theme,
      })
      .eq("id", user.id);

    const templatesToUpsert = [
      { template_name: 'new_appointment_client', template_content: values.new_appointment_client_template || '' },
      { template_name: 'new_appointment_business', template_content: values.new_appointment_business_template || '' },
      { template_name: 'reminder_client', template_content: values.reminder_client_template || '' },
    ].map(t => ({
      user_id: user.id,
      ...t,
    }));

    const templatesUpsertPromise = supabase
      .from('whatsapp_templates')
      .upsert(templatesToUpsert, { onConflict: 'user_id, template_name' });

    const [{ error: profileError }, { error: templateError }] = await Promise.all([profileUpdatePromise, templatesUpsertPromise]);

    if (profileError || templateError) {
      showError(profileError?.message || templateError?.message || "Ocorreu um erro ao salvar.");
    } else {
      showSuccess("Configurações atualizadas com sucesso!");
      window.location.reload();
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-white">Configurações</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Aparência</CardTitle>
              <CardDescription className="text-gray-300">
                Personalize a aparência do sistema para combinar com a sua marca.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-10 w-full bg-white/10" />
              ) : (
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-300">Tema de Cores</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-white/5 border-white/20 text-white">
                            <SelectValue placeholder="Selecione um tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">
                          <SelectItem value="default">Padrão (Azul)</SelectItem>
                          <SelectItem value="pink_purple">Feminino (Rosa/Roxo)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Perfil do Negócio</CardTitle>
              <CardDescription className="text-gray-300">
                Atualize as informações do seu negócio e do seu perfil de usuário.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/4 bg-white/10" />
                  <Skeleton className="h-10 w-full bg-white/10" />
                  <Skeleton className="h-8 w-1/4 bg-white/10" />
                  <Skeleton className="h-10 w-full bg-white/10" />
                </div>
              ) : (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Seu Nome Completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="business_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Nome do Salão/Barbearia</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do seu negócio" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="timezone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Fuso Horário</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white/5 border-white/20 text-white">
                              <SelectValue placeholder="Selecione o fuso horário do seu negócio" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-gray-800/80 backdrop-blur-md border-white/20 text-white">
                            {timezones.map(tz => (
                              <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-gray-400">
                          Isso garante que os horários de agendamento sejam sempre precisos.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Configurações de Notificação</CardTitle>
              <CardDescription className="text-gray-300">
                Gerencie as notificações via WhatsApp para você e seus clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-8 w-1/4 bg-white/10" />
                  <Skeleton className="h-10 w-full bg-white/10" />
                  <Skeleton className="h-8 w-1/4 bg-white/10" />
                  <Skeleton className="h-10 w-full bg-white/10" />
                </div>
              ) : (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="business_whatsapp_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Número de WhatsApp do Negócio</FormLabel>
                        <FormControl>
                          <Input placeholder="5511999999999" {...field} className="bg-white/5 border-white/20 text-white placeholder:text-gray-400 focus:ring-primary focus:border-primary" />
                        </FormControl>
                        <FormDescription className="text-gray-400">
                          Este número receberá as notificações de novos agendamentos.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notifications_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/20 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base text-gray-300">
                            Ativar Notificações via WhatsApp
                          </FormLabel>
                          <FormDescription className="text-gray-400">
                            Envie confirmações e lembretes para você e seus clientes.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Mensagens de WhatsApp</CardTitle>
              <CardDescription className="text-gray-300">
                Personalize o texto das mensagens automáticas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {loading ? <Skeleton className="h-48 w-full bg-white/10" /> : (
                <>
                  <div>
                    <p className="text-sm text-gray-300 mb-2">Variáveis disponíveis:</p>
                    <div className="flex flex-wrap gap-2">
                      {placeholders.map(p => <Badge key={p} variant="secondary" className="bg-blue-900/50 text-blue-200 border-blue-500/50">{p}</Badge>)}
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="new_appointment_client_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Confirmação para o Cliente</FormLabel>
                        <FormControl><Textarea {...field} rows={5} className="bg-white/5 border-white/20 text-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="new_appointment_business_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Notificação para o seu Negócio</FormLabel>
                        <FormControl><Textarea {...field} rows={3} className="bg-white/5 border-white/20 text-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reminder_client_template"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Lembrete para o Cliente (24h antes)</FormLabel>
                        <FormControl><Textarea {...field} rows={4} className="bg-white/5 border-white/20 text-white" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>
          
          {!loading && (
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Todas as Alterações"}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
};

export default SettingsPage;