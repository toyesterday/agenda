-- Remove a política antiga e incorreta
DROP POLICY "Users can manage their own WhatsApp templates" ON public.whatsapp_templates;

-- Cria a nova política correta
CREATE POLICY "Users can manage their own WhatsApp templates"
ON public.whatsapp_templates
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());