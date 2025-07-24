import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { professional_id, services, start_time_iso, full_name, phone } = await req.json()

    // --- Data Validation ---
    if (!professional_id || !services || services.length === 0 || !start_time_iso || !full_name || !phone) {
      throw new Error("Todos os campos obrigatórios devem ser preenchidos.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // --- Process Services ---
    const service_name = services.map((s: { name: string }) => s.name).join(', ');
    const price = services.reduce((total: number, s: { price: number }) => total + s.price, 0);
    const totalDuration = services.reduce((total: number, s: { duration: number }) => total + s.duration, 0);

    // --- Get Business Owner ID from Professional ---
    const { data: professional, error: profError } = await supabaseAdmin
      .from('professionals')
      .select('user_id')
      .eq('id', professional_id)
      .single()

    if (profError || !professional) {
      throw new Error("Profissional não encontrado.")
    }
    const business_owner_id = professional.user_id

    // --- Upsert Client ---
    let clientId;
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('phone', phone)
      .eq('user_id', business_owner_id)
      .maybeSingle()

    if (existingClient) {
      clientId = existingClient.id
    } else {
      const { data: newClient, error: clientInsertError } = await supabaseAdmin
        .from('clients')
        .insert({ full_name, phone, user_id: business_owner_id })
        .select('id')
        .single()
      
      if (clientInsertError) throw new Error("Falha ao criar novo cliente.")
      clientId = newClient.id
    }

    // --- Create Appointment Timestamps ---
    const start_time = new Date(start_time_iso);
    const end_time = new Date(start_time.getTime() + totalDuration * 60000);

    // --- Create Appointment ---
    const { data: newAppointment, error: apptError } = await supabaseAdmin
      .from('appointments')
      .insert({
        user_id: business_owner_id,
        client_id: clientId,
        professional_id: professional_id,
        service_name,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        price: price || null,
        status: 'confirmed'
      })
      .select('id')
      .single()

    if (apptError) {
      console.error('Appointment insertion error:', apptError)
      throw new Error("Falha ao criar o agendamento.")
    }

    // --- Trigger Notification (fire and forget) ---
    supabaseAdmin.functions.invoke('send-whatsapp-notification', {
      body: { appointmentId: newAppointment.id },
    }).catch(console.error)

    return new Response(JSON.stringify({ success: true, appointmentId: newAppointment.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})