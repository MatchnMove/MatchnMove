# Production operations

Match 'n Move is intentionally deployed as one web replica and one Postgres instance in the same Railway region. This is the right shape for the current launch traffic and keeps the database, background jobs, and in-memory rate limits predictable.

## Current launch checklist

- Keep the web service and Postgres in the same region.
- Keep one web replica until shared rate limiting is introduced and background-job behaviour is reviewed for multiple processes.
- Monitor `GET /api/health`. It returns `200` only when the application can query Postgres and returns `503` without exposing database details when it cannot.
- Enable Railway notifications for failed deployments and service crashes.
- Add an external uptime check for `https://www.matchnmove.co.nz/api/health` at a one-to-five-minute interval.
- Enable scheduled Postgres backups in Railway and perform a test restore before relying on them.

## Suggested alert thresholds

Start with simple, actionable alerts rather than a large monitoring stack:

- any failed production deployment;
- repeated service restarts;
- sustained CPU or memory above 80%;
- database volume above 70%;
- repeated HTTP `5xx` responses;
- health-check failures or response time above two seconds.

At low traffic, p99 latency is easily distorted by one cold request. Identify the slow route in request logs before adding caching or image infrastructure.

## When to add infrastructure

Add Redis or another shared limiter before adding web replicas, or when abusive traffic makes the current in-process limiter insufficient. Consider database pooling only when connection metrics show pressure or pool timeouts. Add read replicas only when measured read load is the database bottleneck. Multi-region web replicas are not useful while most customers are in New Zealand and the primary database remains in one region.

## Routine checks

Monthly:

1. Confirm the latest production deployment matches the latest intended `main` commit.
2. Review restarts, `5xx` responses, memory, CPU, and database volume.
3. Confirm the most recent database backup completed.
4. Exercise the quote request and mover sign-in flows.

Quarterly, restore a backup into a temporary database and verify that Prisma can read the expected core records.
