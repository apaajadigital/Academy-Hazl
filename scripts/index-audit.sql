-- Hot-path index verification (TASK-021).
-- Run on the host:
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -U jagouser -d jago_akademi -f - < scripts/index-audit.sql
--
-- Two checks:
--   (A) the indexes EXIST (reliable even on an empty DB), and
--   (B) EXPLAIN uses them (note: on tiny/empty tables Postgres may still pick a
--       Seq Scan because it is cheaper — re-check under real data volume).

\echo '== (A) indexes present on hot tables =='
SELECT tablename, indexname
FROM pg_indexes
WHERE tablename IN ('orders','payment_transactions','course_enrollments','lms_enrollments')
ORDER BY tablename, indexname;

\echo ''
\echo '== (B) EXPLAIN — expect Index Scan under real data =='

\echo '-- orders(userId,status,createdAt)'
EXPLAIN SELECT * FROM orders
WHERE "userId" = '00000000-0000-0000-0000-000000000000' AND status = 'paid'
ORDER BY "createdAt" DESC LIMIT 20;

\echo '-- payment_transactions(orderId,status)'
EXPLAIN SELECT * FROM payment_transactions
WHERE "orderId" = '00000000-0000-0000-0000-000000000000' AND status = 'success';

\echo '-- course_enrollments(userId)'
EXPLAIN SELECT * FROM course_enrollments
WHERE "userId" = '00000000-0000-0000-0000-000000000000';

\echo '-- lms_enrollments(tenantId)'
EXPLAIN SELECT * FROM lms_enrollments
WHERE "tenantId" = '00000000-0000-0000-0000-000000000000';
