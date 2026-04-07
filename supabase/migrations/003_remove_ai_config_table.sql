-- Migration 003: Remove ai_config table
-- A configuração de IA foi movida para variáveis de ambiente (.env.local).
-- Esta tabela não é mais necessária.

DROP TABLE IF EXISTS ai_config;
