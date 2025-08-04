import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { format } from "https://deno.land/std@0.208.0/datetime/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Define interfaces for our data structures
interface Client {
  full_name: string | null;
  phone: string | null;
}

interface Professional {
  full_name: string | null;
}

interface Appointment {
  id: number;
  user_id: string;
  start_time: string;
  service_name: string;
  cancellation_token: string;
  clients: Client | null;
  professionals: Professional | null;
}

interface Profile {
    business_name: string | null;
    business_whatsapp_number: string | null;
    notifications_enabled: boolean | null;
}

interface Template {
    template_name: string;
    meta_template_name: string;
}


function formatPhoneNumber(phone: unknown): string | null {
  if (typeof phone !== 'string' || !phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return null;
  if (digits.startsWith('55')) return `+${digits}`;
  return `+55${digits}`;
}

async function sendWhatsAppTemplateMessage(token: string, fromId: string, to: string | null, templateName: string, params: string[]) {
  if (!to) {
    console.log(`Skipping WhatsApp message for template ${templateName}: recipient phone number is invalid or missing.`);
    return;
  }
  const apiUrl = `https://graph.facebook.com/v19.0/${fromId}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'pt_BR' },
      components: [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p }))
      }]
    }
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(`WhatsApp API Error for template ${templateName} to ${to}:`, errorData);
  }
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

    const { data: appointmentData, error: apptError } = await supabaseAdmin
      .from('appointments')
      .select(`id, user_id, start_time, service_name, cancellation_token, clients (full_name, phone), professionals (full_name)`)
      .eq('id', appointmentId)
      .single();

    if (apptError) throw apptError;
    if (!appointmentData) throw new Error("Appointment not found.");

    const typedAppointmentData = appointmentData as Appointment;

    const profilePromise = supabaseAdmin
        .from('profiles')
        .select('business_name, business_whatsapp_number, notifications_enabled')
        .eq('id', typedAppointmentData.user_id)
        .single();
        
    const templatesPromise = supabaseAdmin
        .from('whatsapp_templates')
        .select('template_name, meta_template_name')
        .eq('user_id', typedAppointmentData.user_id);
    
    const [{ data: profileData, error: profileError }, { data: templatesData, error: templatesError }] = await Promise.all([profilePromise, templatesPromise]);

    if (profileError) throw profileError;
    if (!profileData) throw new Error("Profile for business not found.");
    if (templatesError) throw templatesError;

    const typedProfileData = profileData as Profile;
    const typedTemplates = templatesData as Template[];

    if (!typedProfileData.notifications_enabled) {
      return new Response(JSON.stringify({ message: "Notifications disabled." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    const APP_URL = Deno.env.get('APP_URL');

    if (!WHATSAPP_API_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !APP_URL) {
      throw new Error("Missing one or more required environment variables.");
    }

    const templateNameMap = new Map(typedTemplates?.map(t => [t.template_name, t.meta_template_name]) || []);
    
    const businessPhone = formatPhoneNumber(typedProfileData.business_whatsapp_number);
    const clientPhone = formatPhoneNumber(typedAppointmentData.clients?.phone);

    const formattedDate = format(new Date(typedAppointmentData.start_time), "dd/MM/yyyy 'às' HH:mm");
    const cancellationLink = `${APP_URL}/cancel/${typedAppointmentData.id}/${typedAppointmentData.cancellation_token}`;

    // Send to business
    const businessTemplateName = templateNameMap.get('new_appointment_business');
    if (businessTemplateName && businessPhone) {
      const params = [
        typedAppointmentData.clients?.full_name ?? "Cliente",
        typedAppointmentData.service_name ?? "Serviço",
        typedAppointmentData.professionals?.full_name ?? "Profissional",
        formattedDate,
      ];
      await sendWhatsAppTemplateMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, businessPhone, businessTemplateName, params);
    }

    // Send to client
    const clientTemplateName = templateNameMap.get('new_appointment_client');
    if (clientTemplateName && clientPhone) {
      const params = [
        typedAppointmentData.clients?.full_name ?? "Cliente",
        typedAppointmentData.service_name ?? "Serviço",
        typedAppointmentData.professionals?.full_name ?? "Profissional",
        formattedDate,
        cancellationLink,
      ];
      await sendWhatsAppTemplateMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, clientPhone, clientTemplateName, params);
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