import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { format } from "https://deno.land/std@0.208.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatPhoneNumber(phone: unknown): string | null {
  if (typeof phone !== 'string' || !phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

async function sendWhatsAppMessage(token: string, fromId: string, to: string | null, text: string) {
  if (!to) {
    console.log("Skipping WhatsApp message: recipient phone number is invalid or missing.");
    return;
  }
  const apiUrl = `https://graph.facebook.com/v19.0/${fromId}/messages`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error('WhatsApp API Error:', errorData);
  }
}

function replacePlaceholders(template: string, data: Record<string, string>): string {
  let content = template;
  for (const key in data) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), data[key]);
  }
  return content;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) throw new Error("Appointment ID is required.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { data: appt, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select(`id, user_id, start_time, service_name, cancellation_token, clients (full_name, phone), professionals (full_name)`)
      .eq('id', appointmentId)
      .single();

    if (apptError) throw apptError;
    const appointmentData: any = appt;

    const profilePromise = supabaseAdmin.from('profiles').select('business_name, business_whatsapp_number, notifications_enabled').eq('id', appointmentData.user_id).single();
    const templatesPromise = supabaseAdmin.from('whatsapp_templates').select('template_name, template_content').eq('user_id', appointmentData.user_id);
    
    const [{ data: profileData, error: profileError }, { data: templates }] = await Promise.all([profilePromise, templatesPromise]);

    if (profileError) throw profileError;
    const profile: any = profileData;

    if (!profile || !profile.notifications_enabled) {
      return new Response(JSON.stringify({ message: "Notifications disabled." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const APP_URL = Deno.env.get('APP_URL');

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !APP_URL) {
      throw new Error("Missing one or more required environment variables.");
    }

    const templateMap = new Map(templates?.map((t: { template_name: string; template_content: string }) => [t.template_name, t.template_content]) || []);
    
    const businessPhone = formatPhoneNumber(profile.business_whatsapp_number);
    const clientData = appointmentData.clients;
    const clientPhone = formatPhoneNumber(clientData?.phone);

    const formattedDate = format(new Date(appointmentData.start_time), "dd/MM/yyyy 'às' HH:mm");
    const cancellationLink = `${APP_URL}/cancel/${appointmentData.id}/${appointmentData.cancellation_token}`;
    const professionalData = appointmentData.professionals;

    const placeholderData = {
      nome_cliente: clientData?.full_name ?? "Cliente",
      nome_servico: appointmentData.service_name ?? "Serviço",
      nome_profissional: professionalData?.full_name ?? "Profissional",
      data_agendamento: formattedDate,
      nome_negocio: profile.business_name ?? '',
      link_cancelamento: cancellationLink,
    };

    const businessDefaultTemplate = `Novo agendamento: {{nome_cliente}} agendou "{{nome_servico}}" com {{nome_profissional}} para {{data_agendamento}}.`;
    const businessTemplate = templateMap.get('new_appointment_business') || businessDefaultTemplate;
    const businessMessage = replacePlaceholders(businessTemplate, placeholderData);
    await sendWhatsAppMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, businessPhone, businessMessage);

    const clientDefaultTemplate = `Olá, {{nome_cliente}}! Seu agendamento para "{{nome_servico}}" com {{nome_profissional}} no dia {{data_agendamento}} foi confirmado.\n\nPara cancelar, acesse: {{link_cancelamento}}`;
    const clientTemplate = templateMap.get('new_appointment_client') || clientDefaultTemplate;
    const clientMessage = replacePlaceholders(clientTemplate, placeholderData);
    await sendWhatsAppMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, clientPhone, clientMessage);

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