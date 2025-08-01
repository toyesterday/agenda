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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Get the admin user who is making the request
    const { data: { user: adminUser } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!adminUser) throw new Error("Usuário administrador não autenticado.");

    // 2. Check if the calling user is an admin and get their business ID
    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from('profiles')
      .select('role, business_owner_id')
      .eq('id', adminUser.id)
      .single();

    if (adminProfileError || !['admin', 'super_admin'].includes(adminProfile?.role || '')) {
      throw new Error("Acesso negado. Apenas administradores podem criar logins.");
    }

    // 3. Get the details for the new professional user from the request body
    const { email, password, professional_id } = await req.json();
    if (!email || !password || !professional_id) {
      throw new Error("Email, senha e ID do profissional são obrigatórios.");
    }

    // 4. Verify the professional belongs to the admin's business
    const { data: professional, error: professionalError } = await supabaseAdmin
      .from('professionals')
      .select('full_name, user_id, auth_id')
      .eq('id', professional_id)
      .single();

    if (professionalError) throw new Error("Profissional não encontrado.");
    if (professional.user_id !== adminProfile.business_owner_id) {
        throw new Error("Este profissional não pertence ao seu negócio.");
    }
    if (professional.auth_id) {
        throw new Error("Este profissional já possui um login.");
    }

    // 5. Create the new user in Supabase Auth
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: professional.full_name,
        role: 'professional',
        business_owner_id: adminProfile.business_owner_id,
      }
    });

    if (createError) {
      throw new Error(`Erro ao criar usuário: ${createError.message}`);
    }

    // 6. Link the new auth user to the professional record
    const { error: updateError } = await supabaseAdmin
      .from('professionals')
      .update({ auth_id: newAuthUser.user.id })
      .eq('id', professional_id);

    if (updateError) {
      console.error(`CRITICAL: Failed to link auth_id for new user ${newAuthUser.user.id}. Manual correction needed.`);
      throw new Error("Usuário criado, mas falha ao vincular ao perfil do profissional.");
    }

    return new Response(JSON.stringify({ message: "Login para o profissional criado com sucesso!" }), {
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