import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { format } from "https://deno.land/std@0.208.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendTelegramMessage(token: string, chatId: string, text: string) {
  if (!chatId) return; // Não tenta enviar se não houver ID
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`Telegram API Error for chat_id ${chatId}:`, errorData);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId, type } = await req.json();
    if (!appointmentId || !type) throw new Error("ID do agendamento e tipo de notificação são obrigatórios.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: appt, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select(`id, user_id, start_time, service_name, clients (full_name, telegram_chat_id), professionals (full_name)`)
      .eq('id', appointmentId)
      .single();

    if (apptError) throw apptError;
    const appointmentData: any = appt;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('business_name, telegram_bot_token, telegram_chat_id, telegram_notifications_enabled')
      .eq('id', appointmentData.user_id)
      .single();

    if (profileError) throw profileError;

    if (!profile || !profile.telegram_notifications_enabled || !profile.telegram_bot_token) {
      return new Response(JSON.stringify({ message: "Notificações via Telegram desabilitadas ou não configuradas." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const formattedDate = format(new Date(appointmentData.start_time), "dd/MM/yyyy 'às' HH:mm");
    const professionalName = appointmentData.professionals?.full_name ?? "Profissional";
    const clientName = appointmentData.clients?.full_name ?? "Cliente";
    const serviceName = appointmentData.service_name ?? "Serviço";
    const businessName = profile.business_name ?? "Seu negócio";

    // Enviar para o negócio
    if (type === 'new_appointment_business' && profile.telegram_chat_id) {
        const message = `*Novo Agendamento em ${businessName}* 🔔\n\n*Cliente:* ${clientName}\n*Serviço:* ${serviceName}\n*Profissional:* ${professionalName}\n*Quando:* ${formattedDate}`;
        await sendTelegramMessage(profile.telegram_bot_token, profile.telegram_chat_id, message);
    }

    // Enviar para o cliente, se ele tiver ativado
    const clientChatId = appointmentData.clients?.telegram_chat_id;
    if (clientChatId) {
        let clientMessage = "";
        if (type === 'new_appointment_client') {
            clientMessage = `Olá, *${clientName}*! 👋\n\nSeu agendamento para *${serviceName}* com *${professionalName}* no dia *${formattedDate}* foi confirmado com sucesso!`;
        } else if (type === 'reminder_client') {
            clientMessage = `Olá, *${clientName}*! 👋\n\nLembrete do seu agendamento no(a) *${businessName}*: *${serviceName}* com *${professionalName}*, amanhã às *${format(new Date(appointmentData.start_time), "HH:mm")}*.`;
        }
        
        if (clientMessage) {
            await sendTelegramMessage(profile.telegram_bot_token, clientChatId, clientMessage);
        }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});