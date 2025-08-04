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
    const { data: { user: callingUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!callingUser) throw new Error("Usuário não autenticado.");

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', callingUser.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      throw new Error("Acesso negado. Apenas super administradores podem excluir usuários.");
    }

    // 3. Pegar o ID do usuário a ser excluído do corpo da requisição
    const { userIdToDelete } = await req.json();
    if (!userIdToDelete) {
      throw new Error("O ID do usuário a ser excluído é obrigatório.");
    }
    
    // Impede que o super_admin se auto-delete
    if (userIdToDelete === callingUser.id) {
        throw new Error("Você não pode excluir sua própria conta de super administrador.");
    }

    // 4. Excluir o usuário da autenticação do Supabase
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      throw new Error(`Erro ao excluir usuário: ${deleteError.message}`);
    }

    // A entrada na tabela 'profiles' é excluída automaticamente devido à chave estrangeira ON DELETE CASCADE.

    return new Response(JSON.stringify({ message: "Usuário excluído com sucesso!" }), {
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