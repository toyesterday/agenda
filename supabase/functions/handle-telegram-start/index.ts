import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função para enviar uma mensagem de boas-vindas
async function sendWelcomeMessage(token: string, chatId: number, businessName: string) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const text = `Olá! 👋\n\nVocê ativou as notificações do(a) *${businessName}* no Telegram. A partir de agora, você receberá confirmações e lembretes dos seus agendamentos por aqui.`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    
    // Verifica se é uma mensagem e se contém o comando /start
    if (!payload.message || !payload.message.text || !payload.message.text.startsWith('/start')) {
      return new Response(JSON.stringify({ status: 'ok', message: 'Not a start command.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const chatId = payload.message.chat.id;
    const startPayload = payload.message.text.split(' ')[1]; // Pega o código depois de /start

    if (!startPayload) {
      // Se não houver código, não podemos vincular o usuário.
      return new Response(JSON.stringify({ status: 'ok', message: 'Start command without payload.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // O startPayload será o ID do cliente
    const clientId = Number(startPayload);
    if (isNaN(clientId)) {
        throw new Error("Payload de início inválido.");
    }

    // Atualiza o cliente com o seu Chat ID do Telegram
    const { data: updatedClient, error } = await supabaseAdmin
      .from('clients')
      .update({ telegram_chat_id: String(chatId) })
      .eq('id', clientId)
      .select('user_id, profiles(business_name, telegram_bot_token)')
      .single();

    if (error) {
      console.error("Error updating client with chat_id:", error);
      throw new Error("Não foi possível encontrar o seu cadastro de cliente para vincular.");
    }

    // Envia uma mensagem de boas-vindas
    if (updatedClient && updatedClient.profiles) {
        const profile = updatedClient.profiles as any;
        if (profile.telegram_bot_token && profile.business_name) {
            await sendWelcomeMessage(profile.telegram_bot_token, chatId, profile.business_name);
        }
    }

    return new Response(JSON.stringify({ status: 'success', message: 'Client linked successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});