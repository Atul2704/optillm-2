-- Identify advisory locks (including Prisma migrate lock) and sessions holding them.
SELECT
  a.pid,
  a.usename,
  a.application_name,
  a.client_addr,
  a.state,
  now() - a.query_start AS query_age,
  left(a.query, 200) AS query
FROM pg_stat_activity a
WHERE a.pid IN (
  SELECT pid FROM pg_locks WHERE locktype = 'advisory'
)
ORDER BY query_age DESC;

-- Show advisory locks details
SELECT
  pid,
  granted,
  classid,
  objid,
  objsubid
FROM pg_locks
WHERE locktype = 'advisory'
ORDER BY granted DESC, pid;

