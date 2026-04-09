-- Tabela de configurações globais do admin
CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO admin_config (key, value)
VALUES ('card_border_style', 'accent')
ON CONFLICT (key) DO NOTHING;
