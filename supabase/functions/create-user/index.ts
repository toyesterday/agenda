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
    // 1. Criar cliente Supabase com a chave de serviço para ter privilégios de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 2. Verificar se o usuário que está chamando a função é um super_admin
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!user) throw new Error("Usuário não autenticado.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      throw new Error("Acesso negado. Apenas super administradores podem criar usuários.");
    }

    // 3. Pegar os dados do novo usuário do corpo da requisição
    const { email, password, full_name, business_name } = await req.json();
    if (!email || !password || !full_name || !business_name) {
      throw new Error("Todos os campos são obrigatórios: email, senha, nome completo e nome do negócio.");
    }

    // 4. Criar o novo usuário na autenticação do Supabase
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Marcar como confirmado para o usuário poder logar direto
      user_metadata: {
        full_name: full_name,
        business_name: business_name,
      }
    });

    if (createError) {
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    return new Response(JSON.stringify({ message: "Usuário criado com sucesso!", user: newUserData.user }), {
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