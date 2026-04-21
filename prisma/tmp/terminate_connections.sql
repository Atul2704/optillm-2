-- Terminate other connections to current DB to release advisory locks.
-- Safe for local dev; do not use on shared production DB.
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid();

