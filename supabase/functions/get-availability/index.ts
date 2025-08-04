import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { fromZonedTime, toZonedTime, format } from 'https://esm.sh/date-fns-tz@3.1.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { professionalId, date, totalDuration } = await req.json()

    if (!professionalId || !date || !totalDuration) {
      throw new Error("ID do profissional, data e duração do serviço são obrigatórios.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    // Step 1: Get user_id from professional
    const { data: professionalData, error: profError } = await supabaseAdmin
      .from('professionals')
      .select('user_id')
      .eq('id', professionalId)
      .single();

    if (profError) throw new Error(`Erro ao buscar profissional: ${profError.message}`);
    if (!professionalData) throw new Error("Profissional não encontrado.");

    // Step 2: Get timezone from profile using user_id
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('timezone')
      .eq('id', professionalData.user_id)
      .single();

    if (profileError) throw new Error(`Erro ao buscar perfil do profissional: ${profileError.message}`);
    
    const salonTimezone = profileData?.timezone || 'America/Sao_Paulo';
    
    const selectedDateInUTC = new Date(date);
    const selectedDateInSalonTz = toZonedTime(selectedDateInUTC, salonTimezone);
    const dayOfWeek = selectedDateInSalonTz.getDay();
    const dateString = format(selectedDateInSalonTz, 'yyyy-MM-dd');

    const { data: schedule, error: scheduleError } = await supabaseAdmin
      .from('professional_schedules')
      .select('start_time, end_time, is_available')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek)
      .single();

    if (scheduleError) return new Response(JSON.stringify({ availableTimes: [], debug: `Erro no banco de dados ao buscar horário: ${scheduleError.message}` }), { headers });
    if (!schedule) return new Response(JSON.stringify({ availableTimes: [], debug: `Nenhum horário de trabalho encontrado para o profissional ${professionalId} no dia da semana ${dayOfWeek}.` }), { headers });
    if (!schedule.is_available) return new Response(JSON.stringify({ availableTimes: [], debug: `O horário para o dia da semana ${dayOfWeek} não está marcado como disponível.` }), { headers });
    if (!schedule.start_time || !schedule.end_time) return new Response(JSON.stringify({ availableTimes: [], debug: `O horário para o dia da semana ${dayOfWeek} não possui hora de início ou fim.` }), { headers });

    const startOfDayUTC = fromZonedTime(`${dateString}T00:00:00`, salonTimezone);
    const endOfDayUTC = fromZonedTime(`${dateString}T23:59:59`, salonTimezone);

    const appointmentsPromise = supabaseAdmin.from('appointments').select('start_time, end_time').eq('professional_id', professionalId).gte('start_time', startOfDayUTC.toISOString()).lte('start_time', endOfDayUTC.toISOString()).in('status', ['confirmed', 'completed']);
    const blockedSlotsPromise = supabaseAdmin.from('blocked_slots').select('start_time, end_time').lt('start_time', endOfDayUTC.toISOString()).gt('end_time', startOfDayUTC.toISOString()).or(`professional_id.eq.${professionalId},professional_id.is.null`);

    const [{ data: appointments }, { data: blockedSlots }] = await Promise.all([ appointmentsPromise, blockedSlotsPromise ]);

    const availableTimes: string[] = [];
    const slotIntervalMinutes = 15;
    const busyIntervals: { start: Date; end: Date }[] = [
      ...(appointments || []).map((slot: { start_time: string; end_time: string }) => ({ start: new Date(slot.start_time), end: new Date(slot.end_time) })),
      ...(blockedSlots || []).map((slot: { start_time: string; end_time: string }) => ({ start: new Date(slot.start_time), end: new Date(slot.end_time) }))
    ];

    const workdayStartUTC = fromZonedTime(`${dateString}T${schedule.start_time}`, salonTimezone);
    const workdayEndUTC = fromZonedTime(`${dateString}T${schedule.end_time}`, salonTimezone);

    let currentSlotTime = new Date(workdayStartUTC);

    while (currentSlotTime < workdayEndUTC) {
      const slotStart = new Date(currentSlotTime);
      const slotEnd = new Date(slotStart.getTime() + totalDuration * 60000);

      if (slotStart >= new Date()) {
        const isOverlapping = busyIntervals.some((busy: { start: Date; end: Date }) => (slotStart < busy.end) && (slotEnd > busy.start));
        if (!isOverlapping) {
          availableTimes.push(slotStart.toISOString());
        }
      }
      currentSlotTime.setUTCMinutes(currentSlotTime.getUTCMinutes() + slotIntervalMinutes);
    }

    if (availableTimes.length === 0) {
      const debugInfo = {
        message: "Nenhum horário vago encontrado. Verificando os motivos...",
        salonTimezone,
        dateString,
        dayOfWeek,
        schedule,
        workdayUTC: { start: workdayStartUTC.toISOString(), end: workdayEndUTC.toISOString() },
        totalDuration,
        busySlotsFound: busyIntervals.length,
      };
      return new Response(JSON.stringify({ availableTimes: [], debug: debugInfo }), { headers });
    }

    return new Response(JSON.stringify({ availableTimes, debug: "Sucesso" }), { headers, status: 200 });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message, debug: "A função falhou." }), {
      headers,
      status: 400,
    })
  }
})