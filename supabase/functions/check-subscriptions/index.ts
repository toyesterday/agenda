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
    console.error('WhatsApp API Error:', errorData);
    return { success: false };
  }
  await response.json();
  return { success: true };
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

    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('business_whatsapp_number')
      .eq('role', 'super_admin')
      .single();

    if (adminError || !adminProfile) {
      throw new Error("Super admin ou número de WhatsApp não encontrado.");
    }
    const adminPhoneNumber = formatPhoneNumber(adminProfile.business_whatsapp_number);
    if (!adminPhoneNumber) {
      throw new Error("Número do super admin é inválido ou não configurado.");
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = format(tomorrow, "yyyy-MM-dd");

    const { data: dueSubscriptions, error: subsError } = await supabaseAdmin
      .from('profiles')
      .select('business_name, subscription_due_date')
      .eq('subscription_due_date', tomorrowString)
      .eq('subscription_status', 'active');

    if (subsError) throw subsError;
    if (!dueSubscriptions || dueSubscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma assinatura vencendo amanhã." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const WHATSAPP_API_TOKEN = Deno.env.get('WHATSAPP_API_TOKEN');
    if (!WHATSAPP_API_TOKEN) throw new Error("Missing env var: WHATSAPP_API_TOKEN");

    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    if (!WHATSAPP_PHONE_NUMBER_ID) throw new Error("Missing env var: WHATSAPP_PHONE_NUMBER_ID");

    let sentCount = 0;
    for (const sub of dueSubscriptions) {
      if (sub.subscription_due_date) {
        const dueDateFormatted = format(new Date(sub.subscription_due_date), "dd/MM/yyyy");
        const message = `Lembrete de Vencimento:\nA assinatura do salão "${sub.business_name}" vence amanhã, dia ${dueDateFormatted}.`;
        const result = await sendWhatsAppMessage(WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, adminPhoneNumber, message);
        if (result.success) {
          sentCount++;
        }
      }
    }

    return new Response(JSON.stringify({ sent_reminders: sentCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})