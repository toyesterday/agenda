-- Adiciona a coluna para o "slug" do negócio, que será usado na URL pública de agendamento.
-- Ela deve ser única para não haver conflitos de links.
ALTER TABLE public.profiles
ADD COLUMN business_slug TEXT UNIQUE;

-- Adiciona uma restrição para garantir que o slug tenha um formato válido para URLs.
-- (letras minúsculas, números e hifens)
ALTER TABLE public.profiles
ADD CONSTRAINT valid_slug CHECK (business_slug IS NULL OR business_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Atualiza a função que cria um novo perfil de usuário para gerar automaticamente um slug
-- a partir do nome do negócio.
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Gera um slug base a partir do nome do negócio (minúsculas, sem caracteres especiais)
  base_slug := lower(regexp_replace(new.raw_user_meta_data ->> 'business_name', '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(trim(base_slug), '\s+', '-', 'g');
  final_slug := base_slug;

  -- Garante que o slug seja único, adicionando um número no final se ele já existir
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE business_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  INSERT INTO public.profiles (id, full_name, business_name, role, business_owner_id, business_slug)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'business_name',
    COALESCE(new.raw_user_meta_data ->> 'role', 'admin')::text,
    COALESCE((new.raw_user_meta_data ->> 'business_owner_id')::uuid, new.id),
    final_slug
  );
  RETURN new;
END;
$function$
;

-- Preenche a nova coluna 'business_slug' para todos os usuários existentes que não a possuem.
-- Esta é a parte corrigida.
UPDATE public.profiles p
SET business_slug = sub.new_slug
FROM (
    SELECT 
        id,
        -- Cria um slug único para registros existentes
        (
            -- 1. Remove caracteres especiais e converte para minúsculas
            -- 2. Substitui espaços por hifens
            -- 3. Adiciona um sufixo único para evitar colisões
            regexp_replace(
                lower(regexp_replace(business_name, '[^a-zA-Z0-9\s-]', '', 'g')),
                '\s+', 
                '-', 
                'g'
            ) || '-' || substr(id::text, 1, 4)
        ) as new_slug
    FROM public.profiles
) AS sub
WHERE p.id = sub.id AND p.business_slug IS NULL;