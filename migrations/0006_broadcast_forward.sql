ALTER TABLE broadcasts ADD COLUMN mode TEXT NOT NULL DEFAULT 'copy';
ALTER TABLE broadcasts ADD COLUMN source_chat_id TEXT;
ALTER TABLE broadcasts ADD COLUMN source_message_id INTEGER;
