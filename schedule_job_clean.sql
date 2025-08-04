SELECT cron.schedule(
  'LembreteDiarioVencimentos',
  '0 10 * * *',
  $$
    SELECT
      net.http_post (
        url := 'https://dancuulgqpzrnyccxbiy.supabase.co/functions/v1/check-subscriptions',
        headers := jsonb_build_object(
          'Content-Type',
          'application/json',
          'Authorization',
          'Bearer SEU_CRON_SECRET_TOKEN_AQUI'
        ),
        body := '{}'::jsonb
      );
  $$
);