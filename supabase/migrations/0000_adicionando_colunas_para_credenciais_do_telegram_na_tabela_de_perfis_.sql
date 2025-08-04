ALTER TABLE public.profiles
ADD COLUMN telegram_bot_token TEXT,
ADD COLUMN telegram_chat_id TEXT,
ADD COLUMN telegram_notifications_enabled BOOLEAN DEFAULT FALSE;