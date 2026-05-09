-- Run once as the postgres superuser:
--   sudo -u postgres psql -f scripts/db_bootstrap.sql

-- Create the application role for the OS user (peer auth — no password needed locally)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pdrago') THEN
    CREATE ROLE pdrago WITH LOGIN CREATEDB;
  END IF;
END
$$;

-- Create the database owned by pdrago
SELECT 'CREATE DATABASE caij_machina OWNER pdrago'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'caij_machina')\gexec

-- Grant all on the database
GRANT ALL PRIVILEGES ON DATABASE caij_machina TO pdrago;
