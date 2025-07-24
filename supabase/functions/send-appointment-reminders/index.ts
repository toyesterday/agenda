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

async function sendWhatsAppMessage(token: string, fromId: string, to: string, text: string): Promise<{ success: boolean }> {
  const apiUrl = `https://graph.facebook.com/v19.0/${fromId}/messages`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    console.error(`WhatsApp API Error for ${to}:`, errorData);
    return { success: false };
  }
  await response.json();
  return { success: true };
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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const cronSecret = Deno.env.get('CRON_SECRET_TOKEN');
    if (!cronSecret || authToken !== cronSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const now = new Date();
    const reminderWindowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const { data: appointments, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select(`id, user_id, start_time, service_name, clients ( full_name, phone ), professionals ( full_name ), profiles ( business_name, notifications_enabled )`)
      .eq('status', 'confirmed')
      .is('reminder_sent_at', null)
      .gte('start_time', reminderWindowStart.toISOString())
      .lt('start_time', reminderWindowEnd.toISOString());

    if (apptError) throw apptError;

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ message: "No appointments to remind." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    if (!WHATSAPP_API_TOKEN) throw new Error("Missing env var: WHATSAPP_API_TOKEN");

    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!WHATSAPP_PHONE_NUMBER_ID) throw new Error("Missing env var: WHATSAPP_PHONE_NUMBER_ID");

    const userIds = [...new Set(appointments.map((a: any) => a.user_id))];
    const { data: templates } = await supabaseAdmin
      .from('whatsapp_templates')
      .select('user_id, template_name, template_content')
      .in('user_id', userIds);

    const templatesByUser = (templates || []).reduce((acc: Record<string, Map<string, string>>, t: { user_id: string; template_name: string; template_content: string }) => {
      if (!acc[t.user_id]) acc[t.user_id] = new Map();
      acc[t.user_id].set(t.template_name, t.template_content);
      return acc;
    }, {} as Record<string, Map<string, string>>);

    const sentRemindersIds = [];
    let errorsCount = 0;

    for (const appt of appointments) {
      const typedAppt = appt as any;

      if (!typedAppt.profiles || !typedAppt.clients || !typedAppt.professionals || !typedAppt.profiles.notifications_enabled) {
        continue;
      }

      const clientPhone = formatPhoneNumber(typedAppt.clients.phone);
      if (!clientPhone) {
        continue;
      }

      const formattedDate = format(new Date(typedAppt.start_time), "'amanhã às' HH:mm");
      
      const placeholderData = {
        nome_cliente: String(typedAppt.clients.full_name ?? "Cliente"),
        nome_servico: String(typedAppt.service_name ?? "Serviço"),
        nome_profissional: String(typedAppt.professionals.full_name ?? "Profissional"),
        data_agendamento: String(formattedDate),
        nome_negocio: String(typedAppt.profiles.business_name ?? ''),
        link_cancelamento: '',
      };

      const userTemplates = templatesByUser[typedAppt.user_id] || new Map();
      const defaultTemplate = `Olá, {{nome_cliente}}! Lembrete do seu agendamento no(a) {{nome_negocio}}: "{{nome_servico}}" com {{nome_profissional}}, {{data_agendamento}}.`;
      const template = userTemplates.get('reminder_client') || defaultTemplate;
      const message = replacePlaceholders(template, placeholderData);

      const result = await sendWhatsAppMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, clientPhone, message);
      
      if (result.success) {
        sentRemindersIds.push(typedAppt.id);
      } else {
        errorsCount++;
      }
    }

    if (sentRemindersIds.length > 0) {
      await supabaseAdmin.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).in('id', sentRemindersIds);
    }

    return new Response(JSON.stringify({ sent: sentRemindersIds.length, errors: errorsCount }), {
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