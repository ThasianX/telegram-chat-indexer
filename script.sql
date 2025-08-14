CREATE TABLE IF NOT EXISTS
  chats (
    id BIGINT PRIMARY KEY,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

CREATE TABLE IF NOT EXISTS
  messages (
    id SERIAL PRIMARY KEY,
    message_id BIGINT NOT NULL,
    chat_id BIGINT NOT NULL,
    chat_name VARCHAR(255),
    user_id BIGINT,
    user_display_name VARCHAR(255),
    user_username VARCHAR(255),
    text TEXT,
    date TIMESTAMP NOT NULL,
    edit_date TIMESTAMP,
    reply_to_message_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (chat_id, message_id)
  );

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);