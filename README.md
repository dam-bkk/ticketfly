# TicketFly

Internal IT service platform for QI Group: tickets, assets, joiners & leavers — with the Freshservice history behind it. Azure-native, one container image promoted dev → staging → prod by Azure DevOps.

## Layout (concentric)

```
packages/core   pure domain logic, zero I/O, 100% unit-tested (SLA clocks, semver, ticket state machine, cost rollups)
packages/db     Drizzle schema + Postgres client + deterministic seed
apps/web        Next.js 16 — UI and API routes, thin; every write goes through the activity log
apps/worker     same image, different entry — sync jobs, SLA clocks, mail, offboarding
infra/          Bicep (one file, three parameter sets) + pipeline templates
```

## Run locally

```
createdb ticketfly            # Postgres.app / local Postgres 16+
pnpm install
pnpm db:push && pnpm db:seed  # schema + realistic data (77 people, 345 tickets incl. 210 imported, 147 assets)
pnpm dev                      # http://localhost:3000 → /login, pick a persona
```

`DATABASE_URL` defaults to `postgres://localhost:5432/ticketfly`.

## Quality gates

- `pnpm test` — Vitest; `packages/core` enforces 100 % line coverage.
- `pnpm typecheck` — strict TS with `noUncheckedIndexedAccess`.
- Versions are derived from Conventional Commits (`scripts/version.mjs`): `fix:` patch, `feat:` minor, `feat!:`/`BREAKING CHANGE:` major, destructive migrations major.
- Settings → Activity shows every write (who, what, from where, before/after, release). Settings → Releases shows every build.

## Delivery

`azure-pipelines.yml`: typecheck → lint → unit → integration (throwaway Postgres) → image → scan → dev → smoke → staging → manual approval → prod. Service connection on the Entra issuer (workload identity federation, no secrets). Postgres uses Entra auth — no database password exists.
