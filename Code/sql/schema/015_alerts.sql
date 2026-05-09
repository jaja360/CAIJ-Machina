-- +goose up
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  user_id UUID NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_method TEXT NOT NULL CHECK (contact_method IN ('email', 'push', 'sms', 'webhook')),
  send_at TIMESTAMP NOT NULL DEFAULT NOW(),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  law_change_id UUID NULL REFERENCES law_changes(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  CHECK (user_id IS NOT NULL OR client_id IS NOT NULL)
);

-- +goose down
DROP TABLE alerts;
