import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, User, CheckCircle, ArrowRight, ArrowLeft, PartyPopper, Send, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import ServiceSelection, { Service } from "./ServiceSelection";
import { Skeleton } from "./ui/skeleton";
import DateSelection from "./DateSelection";

type Professional = { id: number; full_name: string; };
type BusinessProfile = { id: string; business_name: string; telegram_bot_username: string | null; };

const formSchema = z.object({
  professional_id: z.string().min(1, { message: "Selecione um profissional." }),
  services: z.array(z.object({
    name: z.string(),
    price: z.number(),
    duration: z.number(),
  })).min(1, { message: "Selecione pelo menos um serviço." }),
  date: z.date({ required_error: "A data é obrigatória." }),
  time: z.string().min(1, { message: "A hora é obrigatória." }),
  full_name: z.string().min(2, { message: "Seu nome completo é obrigatório." }),
  phone: z.string().min(10, { message: "Por favor, insira um telefone válido." }),
});

type FormData = z.infer<typeof formSchema>;

const STEPS = [
  { id: 1, title: "Profissional", fields: ["professional_id"] },
  { id: 2, title: "Serviços", fields: ["services"] },
  { id: 3, title: "Data", fields: ["date"] },
  { id: 4, title: "Hora", fields: ["time"] },
  { id: 5, title: "Seus Dados", fields: ["full_name", "phone"] },
];

const PublicBookingForm = ({ businessSlug }: { businessSlug?: string }) => {
  const [step, setStep] = useState(1);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [errorBusiness, setErrorBusiness] = useState<string | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [isFetchingTimes, setIsFetchingTimes] = useState(false);
  const [newlyCreatedClientId, setNewlyCreatedClientId] = useState<number | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { professional_id: "", services: [], date: undefined, time: "", full_name: "", phone: "" },
  });

  const { trigger, watch, control, getValues, setValue } = form;
  const watchedProfessionalId = watch("professional_id");
  const watchedDate = watch("date");
  const watchedServices = watch("services");

  const totalDuration = useMemo(() => watchedServices.reduce((total, service) => total + service.duration, 0), [watchedServices]);
  const totalPrice = useMemo(() => watchedServices.reduce((total, service) => total + service.price, 0), [watchedServices]);

  useEffect(() => {
    if (!businessSlug) {
      setErrorBusiness("Link de agendamento inválido.");
      setLoadingBusiness(false);
      return;
    }
    const fetchBusinessProfile = async () => {
      setLoadingBusiness(true);
      setErrorBusiness(null);
      const { data, error } = await supabase.from('profiles').select('id, business_name, telegram_bot_username').eq('business_slug', businessSlug).single();
      if (error || !data) {
        setErrorBusiness("Salão não encontrado ou o link de agendamento está incorreto.");
        setBusinessProfile(null);
      } else {
        setBusinessProfile(data as BusinessProfile);
      }
      setLoadingBusiness(false);
    };
    fetchBusinessProfile();
  }, [businessSlug]);

  useEffect(() => {
    if (!businessProfile) return;
    const fetchProfessionals = async () => {
      setLoadingProfessionals(true);
      const { data, error } = await supabase.from('professional_schedules').select('is_available, professionals!inner(id, full_name)').eq('is_available', true).eq('professionals.user_id', businessProfile.id);
      if (error) {
        showError("Falha ao carregar profissionais com horários definidos.");
        setProfessionals([]);
      } else {
        const uniqueProfessionals = data.reduce<Professional[]>((acc, current) => {
          const professional = current.professionals as any;
          if (professional && !acc.find(item => item.id === professional.id)) acc.push(professional as Professional);
          return acc;
        }, []);
        setProfessionals(uniqueProfessionals);
      }
      setLoadingProfessionals(false);
    };
    fetchProfessionals();
  }, [businessProfile]);

  useEffect(() => {
    let isActive = true;
    const fetchAvailability = async () => {
      if (!watchedProfessionalId || !watchedDate || totalDuration === 0) {
        setAvailableTimes([]);
        return;
      }
      setIsFetchingTimes(true);
      setAvailableTimes([]);
      setValue('time', '');
      try {
        const { data, error: functionError } = await supabase.functions.invoke('get-availability', { body: { professionalId: Number(watchedProfessionalId), date: watchedDate.toISOString(), totalDuration: totalDuration } });
        if (functionError) {
          const parsedResponse = JSON.parse(functionError.context?.responseText || '{}');
          throw new Error(parsedResponse.error || functionError.message);
        }
        if (isActive) setAvailableTimes((data.availableTimes || []).map((isoString: string) => format(new Date(isoString), 'HH:mm')));
      } catch (e: any) {
        if (isActive) showError(e.message);
      } finally {
        if (isActive) setIsFetchingTimes(false);
      }
    };
    fetchAvailability();
    return () => { isActive = false; };
  }, [watchedProfessionalId, watchedDate, totalDuration, setValue]);

  const nextStep = async () => {
    const fields = STEPS[step - 1].fields;
    const output = await trigger(fields as (keyof FormData)[], { shouldFocus: true });
    if (output) {
      if (step < STEPS.length) setStep(s => s + 1);
      else await onSubmit();
    }
  };

  const prevStep = () => { if (step > 1) setStep(s => s - 1); };

  const onSubmit = async () => {
    setLoadingSubmit(true);
    try {
      const values = getValues();
      const [hour, minute] = values.time.split(':').map(Number);
      const localDate = new Date(values.date);
      localDate.setHours(hour, minute, 0, 0);
      const startTimeAsISO = localDate.toISOString();
      const { data, error } = await supabase.functions.invoke('create-public-appointment', { body: { professional_id: values.professional_id, services: values.services, full_name: values.full_name, phone: values.phone, start_time_iso: startTimeAsISO } });
      if (error) {
        const parsedError = JSON.parse(error.context?.responseText || '{}');
        throw new Error(parsedError.error || error.message);
      }
      showSuccess("Agendamento confirmado!");
      setNewlyCreatedClientId(data.clientId);
      setBotUsername(data.botUsername);
      setStep(STEPS.length + 1);
    } catch (e: any) {
      showError(e.message || "Ocorreu um erro ao agendar.");
    } finally {
      setLoadingSubmit(false);
    }
  };

  if (loadingBusiness) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (errorBusiness) {
    return <div className="text-center text-destructive bg-destructive/10 p-4 rounded-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> {errorBusiness}</div>;
  }

  if (step > STEPS.length) {
    const telegramLink = botUsername && newlyCreatedClientId ? `https://t.me/${botUsername}?start=${newlyCreatedClientId}` : null;
    return (
      <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-xl text-center p-8">
        <PartyPopper className="h-16 w-16 mx-auto text-primary" />
        <h2 className="text-2xl font-bold text-white mt-4">Agendamento Realizado!</h2>
        <p className="text-gray-300 mt-2">Seu horário foi confirmado. Enviamos os detalhes para o seu WhatsApp (se ativado pelo salão).</p>
        {telegramLink && (
          <div className="mt-6 border-t border-white/10 pt-6">
            <h3 className="font-semibold text-white">Bônus: Receba lembretes no Telegram!</h3>
            <p className="text-sm text-gray-400 mt-1 mb-3">Clique abaixo para ativar as notificações gratuitas via Telegram e nunca mais esquecer um horário.</p>
            <Button asChild><a href={telegramLink} target="_blank" rel="noopener noreferrer"><Send className="mr-2 h-4 w-4" /> Ativar no Telegram</a></Button>
          </div>
        )}
        <Button onClick={() => { form.reset(); setStep(1); setNewlyCreatedClientId(null); setBotUsername(null); }} className="mt-6" variant="outline">Agendar Novamente</Button>
      </Card>
    );
  }

  return (
    <Card className="backdrop-blur-md bg-white/5 border border-white/10 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Agendar Horário</CardTitle>
        <CardDescription className="text-gray-300">Passo {step} de {STEPS.length}: {STEPS[step - 1].title}</CardDescription>
        <Progress value={(step / STEPS.length) * 100} className="w-full mt-4" />
      </CardHeader>
      <CardContent>
        <div className="mt-6">
          {step === 1 && <Controller control={control} name="professional_id" render={({ field, fieldState }) => (
            <div className="space-y-2">
              {loadingProfessionals ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full bg-white/10" />)}</div>
                : professionals.length > 0 ? <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{professionals.map((prof) => <div key={prof.id} onClick={() => field.onChange(String(prof.id))} className={cn("relative cursor-pointer rounded-lg border-2 p-4 text-center transition-all duration-200", field.value === String(prof.id) ? "border-primary bg-primary/10" : "border-white/20 bg-white/5 hover:border-primary/50")}>{field.value === String(prof.id) && <CheckCircle className="absolute top-2 right-2 h-5 w-5 text-primary" />}<User className="mx-auto h-8 w-8 mb-2 text-gray-400" /><h4 className="font-semibold text-white">{prof.full_name}</h4></div>)}</div>
                : <div className="text-center text-gray-400 py-8"><p>Nenhum profissional com horários de trabalho definidos foi encontrado.</p><p className="text-sm mt-2">Por favor, configure os horários no painel de administração.</p></div>}
              {fieldState.error && <p className="text-sm font-medium text-destructive mt-2">{fieldState.error.message}</p>}
            </div>
          )} />}
          {step === 2 && <Controller control={control} name="services" render={({ field, fieldState }) => (
            <div className="space-y-2"><ServiceSelection value={field.value as Service[]} onChange={field.onChange} />{fieldState.error && <p className="text-sm font-medium text-destructive mt-2">{fieldState.error.message}</p>}</div>
          )} />}
          {step === 3 && <Controller control={control} name="date" render={({ field, fieldState }) => (
            <div><DateSelection value={field.value} onChange={field.onChange} />{fieldState.error && <p className="text-sm font-medium text-destructive mt-2 text-center">{fieldState.error.message}</p>}</div>
          )} />}
          {step === 4 && <Controller control={control} name="time" render={({ field, fieldState }) => (
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-300 text-center">Escolha um horário para {getValues("date") ? format(getValues("date"), "PPP", { locale: ptBR }) : "a data selecionada"}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-64 overflow-y-auto pr-2">
                {isFetchingTimes ? [...Array(12)].map((_, i) => <Skeleton key={i} className="h-10 w-full bg-white/10" />)
                  : availableTimes.length > 0 ? availableTimes.map((time) => <Button key={time} type="button" variant={field.value === time ? "default" : "outline"} onClick={() => field.onChange(time)} className={cn("bg-white/5 border-white/20 hover:bg-white/20", field.value === time && "bg-primary hover:bg-primary/90")}>{time}</Button>)
                  : <div className="col-span-3 sm:col-span-4 text-center text-sm text-gray-400 py-8">{watchedDate ? "Nenhum horário vago para esta data." : "Escolha uma data primeiro."}</div>}
              </div>
              {fieldState.error && <p className="text-sm font-medium text-destructive mt-2 text-center">{fieldState.error.message}</p>}
            </div>
          )} />}
          {step === 5 && (
            <div className="space-y-6">
              <Card className="bg-white/10 p-4 rounded-lg">
                <CardTitle className="text-lg text-white mb-3">Resumo do Agendamento</CardTitle>
                <div className="space-y-2 text-sm text-gray-300">
                  <p><strong>Profissional:</strong> {professionals.find(p => p.id === Number(getValues("professional_id")))?.full_name}</p>
                  <p><strong>Serviços:</strong> {getValues("services").map(s => s.name).join(', ')}</p>
                  <p><strong>Data:</strong> {getValues("date") ? `${format(getValues("date"), "PPP", { locale: ptBR })} às ${getValues("time")}` : 'N/A'}</p>
                  <p className="font-bold text-white mt-2 pt-2 border-t border-white/10"><strong>Total:</strong> R$ {totalPrice.toFixed(2)}</p>
                </div>
              </Card>
              <div className="space-y-4">
                <Input {...form.register("full_name")} placeholder="Seu nome completo" className="bg-white/5 border-white/20 text-white" />
                {form.formState.errors.full_name && <p className="text-sm font-medium text-destructive">{form.formState.errors.full_name.message}</p>}
                <Input {...form.register("phone")} placeholder="Seu WhatsApp (com DDD)" className="bg-white/5 border-white/20 text-white" />
                {form.formState.errors.phone && <p className="text-sm font-medium text-destructive">{form.formState.errors.phone.message}</p>}
              </div>
            </div>
          )}
          <div className="flex justify-between items-center pt-8 mt-4 border-t border-white/10">
            <Button type="button" variant="outline" onClick={prevStep} disabled={step === 1} className="bg-transparent border-white/20 hover:bg-white/10"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
            <Button type="button" onClick={nextStep} disabled={loadingSubmit || isFetchingTimes}>{loadingSubmit ? <Loader2 className="h-4 w-4 animate-spin" /> : step === STEPS.length ? "Confirmar Agendamento" : <>Próximo<ArrowRight className="h-4 w-4 ml-2" /></>}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicBookingForm;