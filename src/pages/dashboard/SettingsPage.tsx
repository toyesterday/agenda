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

const formSchema = z.object({
  full_name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }).optional().or(z.literal('')),
  business_name: z.string().min(2, { message: "O nome do negócio deve ter pelo menos 2 caracteres." }).optional().or(z.literal('')),
  business_slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "O link deve conter apenas letras minúsculas, números e hifens.").optional().or(z.literal('')),
  business_whatsapp_number: z.string().optional().or(z.literal('')),
  notifications_enabled: z.boolean().default(true),
  timezone: z.string().optional().or(z.literal('')),
  theme: z.string().optional().or(z.literal('')),
  template_name_client_confirmation: z.string().optional(),
  template_name_business_notification: z.string().optional(),
  template_name_client_reminder: z.string().optional(),
  telegram_bot_token: z.string().optional(),
  telegram_chat_id: z.string().optional(),
  telegram_notifications_enabled: z.boolean().default(false),
  telegram_bot_username: z.string().optional(),
});

const timezones = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília / São Paulo (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Rio_Branco", label: "Acre (UTC-5)" },
];

const SettingsPage = () => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      business_name: "",
      business_slug: "",
      business_whatsapp_number: "",
      notifications_enabled: true,
      timezone: "America/Sao_Paulo",
      theme: "default",
      template_name_client_confirmation: "confirmacao_agendamento_cliente",
      template_name_business_notification: "novo_agendamento_negocio",
      template_name_client_reminder: "lembrete_cliente",
      telegram_bot_token: "",
      telegram_chat_id: "",
      telegram_notifications_enabled: false,
      telegram_bot_username: "",
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setLoading(true);
      
      const profilePromise = supabase
        .from("profiles")
        .select("full_name, business_name, business_slug, business_whatsapp_number, notifications_enabled, timezone, theme, telegram_bot_token, telegram_chat_id, telegram_notifications_enabled, telegram_bot_username")
        .eq("id", user.id)
        .single();

      const templatesPromise = supabase
        .from("whatsapp_templates")
        .select("template_name, meta_template_name");

      const [{ data: profileData, error: profileError }, { data: templatesData, error: templatesError }] = await Promise.all([profilePromise, templatesPromise]);

      if (profileError && profileError.code !== 'PGRST116') {
        showError("Falha ao carregar o perfil.");
      } else if (profileData) {
        form.setValue('full_name', profileData.full_name || "");
        form.setValue('business_name', profileData.business_name || "");
        form.setValue('business_slug', profileData.business_slug || "");
        form.setValue('business_whatsapp_number', profileData.business_whatsapp_number || "");
        form.setValue('notifications_enabled', profileData.notifications_enabled ?? true);
        form.setValue('timezone', profileData.timezone || "America/Sao_Paulo");
        form.setValue('theme', profileData.theme || "default");
        form.setValue('telegram_bot_token', profileData.telegram_bot_token || "");
        form.setValue('telegram_chat_id', profileData.telegram_chat_id || "");
        form.setValue('telegram_notifications_enabled', profileData.telegram_notifications_enabled ?? false);
        form.setValue('telegram_bot_username', profileData.telegram_bot_username || "");
      }

      if (templatesError) {
        showError("Falha ao carregar os nomes dos templates salvos.");
      } else if (templatesData) {
        const templateMap = templatesData.reduce((acc, t) => {
          acc[t.template_name] = t.meta_template_name;
          return acc;
        }, {} as Record<string, string>);
        
        form.setValue('template_name_client_confirmation', templateMap['new_appointment_client'] || form.getValues('template_name_client_confirmation'));
        form.setValue('template_name_business_notification', templateMap['new_appointment_business'] || form.getValues('template_name_business_notification'));
        form.setValue('template_name_client_reminder', templateMap['reminder_client'] || form.getValues('template_name_client_reminder'));
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
        business_slug: values.business_slug,
        business_whatsapp_number: values.business_whatsapp_number,
        notifications_enabled: values.notifications_enabled,
        timezone: values.timezone,
        theme: values.theme,
        telegram_bot_token: values.telegram_bot_token,
        telegram_chat_id: values.telegram_chat_id,
        telegram_notifications_enabled: values.telegram_notifications_enabled,
        telegram_bot_username: values.telegram_bot_username,
      })
      .eq("id", user.id);

    const templatesToUpsert = [
      { template_name: 'new_appointment_client', meta_template_name: values.template_name_client_confirmation },
      { template_name: 'new_appointment_business', meta_template_name: values.template_name_business_notification },
      { template_name: 'reminder_client', meta_template_name: values.template_name_client_reminder },
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
                    name="business_slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-300">Seu Link de Agendamento</FormLabel>
                        <div className="flex items-center">
                          <span className="text-gray-400 bg-white/5 border border-r-0 border-white/20 rounded-l-md px-3 py-2">
                            .../agendar/
                          </span>
                          <FormControl>
                            <Input placeholder="meu-salao" {...field} className="bg-white/5 border-white/20 text-white rounded-l-none" />
                          </FormControl>
                        </div>
                        <FormDescription className="text-gray-400">
                          Este é o link exclusivo que você compartilhará com seus clientes. Use apenas letras minúsculas, números e hifens.
                        </FormDescription>
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

          {profile?.role === 'super_admin' && (
            <>
              <Card className="bg-white/5 backdrop-blur-md border border-white/10 text-white shadow-xl">
                <CardHeader>
                  <CardTitle className="text-white">Notificações via Telegram</CardTitle>
                  <CardDescription className="text-gray-300">
                    Receba notificações de novos agendamentos diretamente no seu Telegram.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4"><Skeleton className="h-10 w-full bg-white/10" /><Skeleton className="h-10 w-full bg-white/10" /></div>
                  ) : (
                    <div className="space-y-6">
                      <FormField
                        control={form.control}
                        name="telegram_notifications_enabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border border-white/20 p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base text-gray-300">Ativar Notificações via Telegram</FormLabel>
                              <FormDescription className="text-gray-400">Receba um alerta para cada novo agendamento.</FormDescription>
                            </div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telegram_bot_username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Username do Bot</FormLabel>
                            <FormControl><Input placeholder="Ex: MeuSalao_bot" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
                            <FormDescription className="text-gray-400">O username que você criou no BotFather, sem o "@".</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telegram_bot_token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Token do Bot</FormLabel>
                            <FormControl><Input placeholder="Token recebido do BotFather" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="telegram_chat_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Seu Chat ID (Administrador)</FormLabel>
                            <FormControl><Input placeholder="Seu ID de usuário do Telegram" {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
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
                  <CardTitle className="text-white">Configurações de Notificação (WhatsApp)</CardTitle>
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
                              Este número receberá as notificações de novos agendamentos. Use o formato internacional, ex: 5511987654321.
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
                  <CardTitle className="text-white">Nomes dos Modelos de Mensagem (WhatsApp)</CardTitle>
                  <CardDescription className="text-gray-300">
                    Insira aqui os nomes exatos dos modelos que você criou e que foram APROVADOS no painel da Meta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {loading ? <Skeleton className="h-48 w-full bg-white/10" /> : (
                    <>
                      <FormField
                        control={form.control}
                        name="template_name_client_confirmation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Confirmação para o Cliente</FormLabel>
                            <FormControl><Input {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
                            <FormDescription className="text-gray-400">Nome do modelo para confirmar o agendamento com o cliente.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="template_name_business_notification"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Notificação para o seu Negócio</FormLabel>
                            <FormControl><Input {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
                            <FormDescription className="text-gray-400">Nome do modelo para te avisar de um novo agendamento.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="template_name_client_reminder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-300">Lembrete para o Cliente (24h antes)</FormLabel>
                            <FormControl><Input {...field} className="bg-white/5 border-white/20 text-white" /></FormControl>
                            <FormDescription className="text-gray-400">Nome do modelo para enviar o lembrete ao cliente.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </CardContent>
              </Card>
            </>
          )}
          
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