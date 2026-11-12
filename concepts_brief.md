# Concept Brief — Supabase Permissions / RLS Fix

**Mode:** BRAINSTORM  
**Feature concept (as submitted):** The `authenticated` role in Supabase lacks `GRANT ALL` on public tables, blocking all read/write from the frontend for authenticated user `80d9113e-3c2a-4995-86a9-ddb540a51dc7`. Observed errors: `42501 permission denied` and `401 Unauthorized` on tables `partidos`, `candidatos`, `actors`, `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`, `puestos_votacion`.  
**Proposed fix:** Run `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` and create RLS policies `FOR ALL USING (auth.uid() IS NOT NULL)` on each table.

**Reviewers:** egm-design, egm-codebase-details, egm-zoom-out, egm-comprehension, egm-implementation-readiness, egm-structural (all `completed`)

---

## Executive Summary

The concept misdiagnoses a two-layer problem as a single missing `GRANT`. In Supabase/PostgreSQL, a query must pass **both** table-level privileges (GRANT) **and** row-level security (RLS). The `42501` errors are a database privileges/RLS issue; the `401 Unauthorized` errors are an authentication/session (JWT) issue and will not be fixed by any SQL grant. Moreover, the codebase already contains contradictory security artifacts: `supabase/schema.sql` enables RLS with broadly permissive `USING (true)` policies; `supabase/migracion_jerarquia_roles.sql` defines a granular role hierarchy keyed on `actors.user_id = auth.uid()`; and `supabase/fix_rls_permissions.sql` wipes all of that out with blanket `GRANT ALL` + `auth.uid() IS NOT NULL` policies. Running the proposed fix as written would over-permission every authenticated user, nullify the existing role hierarchy, expose voter PII and election-minute data, and create unversioned, non-rollbackable technical debt.

---

## Lens 1 — Root Cause (All Reviewers Converge)

**It is not "missing GRANT" alone.** The root cause is a combination of:

| Layer | Finding | Source |
|-------|---------|--------|
| Table-level privileges | No `GRANT` exists anywhere for `authenticated` on the public tables in `schema.sql` or `migracion_jerarquia_roles.sql`. `fix_rls_permissions.sql` has it but is not clearly part of the deployment path. | egm-design, egm-codebase-details, egm-implementation-readiness |
| RLS state | `schema.sql` already `ENABLE ROW LEVEL SECURITY` on most tables but with `USING (true)` / `WITH CHECK (true)` policies — open to everyone, including `anon`. RLS policies have **no effect unless RLS is enabled** per table; `fix_rls_permissions.sql` omits `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. | egm-codebase-details, egm-design, egm-implementation-readiness |
| 401 vs 42501 conflation | `42501` is a PostgreSQL authorization error (missing table privilege or rejected RLS policy). `401 Unauthorized` is an Auth/API-layer error (missing, expired, or invalid JWT; client session not established). They have different causes and fixes. `GRANT ALL` fixes only the 42501 path. | egm-codebase-details, egm-zoom-out, egm-implementation-readiness, egm-comprehension |
| Client config masking real errors | `.env` has `VITE_SUPABASE_ANON_KEY=` empty, so `isSupabaseConfigured()` returns false and `supabaseService.ts` silently falls back to `supabaseMock` (localStorage). In that state Supabase is never called and neither error can originate from the DB. | egm-codebase-details |
| Schema mismatch | `migracion_jerarquia_roles.sql` policies reference `actors.user_id`, but `actors` has no `user_id` column (schema has `role`; migracion adds `supervisor_id`). Granular role-based RLS would fail at runtime even without the blanket fix. | egm-codebase-details |

**Bottom line:** The immediate 42501 is likely because `authenticated` never received table privileges. The 401s are unrelated session/auth errors. The proposed SQL would "fix" the symptom by over-permissioning, while leaving the 401s untouched and destroying an existing (if inconsistent) granular security model.

---

## Lens 2 — Risks of the Proposed Fix (GRANT ALL + Blanket RLS)

**Security blast radius (egm-design, egm-codebase-details, egm-zoom-out):**
- The `authenticated` role is inherited by **every** user with a valid Supabase Auth JWT — registered voters, witnesses, party leaders, candidates, and anyone who can self-register. There is no distinction between roles inside that PostgreSQL role.
- `GRANT ALL ON ALL TABLES` confers SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, and TRIGGER on every table in `public`.
- `FOR ALL USING (auth.uid() IS NOT NULL)` is effectively `true` for any logged-in user: **zero row-level isolation**. No ownership check (`user_id = auth.uid()`), no role scoping, no territorial/candidate isolation, no column masking, no `WITH CHECK` separation between insert and update/delete.
- Consequences per table:
  - `votantes_crm`: read/write of Colombian voter PII (cedula, telefono, direccion, barrio, intencion_voto) — conflicts with stated Ley 1581 de 2012 (Habeas Data) compliance.
  - `actas_e14`: any authenticated user can fabricate, alter, or delete digitized E-14 scrutiny acts and vote tallies — destroys election-integrity evidence.
  - `alertas_fraude`: fraud alerts can be erased or fabricated by any logged-in user.
  - `testigos_electorales`: witness names, IDs, phones, shift statuses can be modified or deleted.
  - `audit_log`: same blanket policy means an authenticated user can delete audit entries covering their own tracks.
  - `partidos` / `candidatos`: catalog data can be truncated or deleted by any authenticated user.
- Supabase Realtime is enabled on `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`; with blanket policies every subscriber receives every change regardless of relevance, increasing WebSocket fan-out and change-tracking overhead at scale (egm-design).

**Model destruction (egm-design, egm-codebase-details, egm-zoom-out, egm-structural):**
- PostgreSQL RLS policies are **OR-ed** together. Pre-existing `schema.sql` policies with `USING (true)` remain active under their own names; `fix_rls_permissions.sql` only drops its own same-named policies, so the intended restriction is not actually enforced where both apply.
- The blanket policy completely nullifies the granular role hierarchy already designed in `migracion_jerarquia_roles.sql` (supervisor_total, supervisor_candidato, lider, testigo, voter; department/municipality scope; leader_id row ownership).

**Correctness gap (egm-implementation-readiness):**
- `GRANT ALL ON ALL TABLES` does not cover sequences (identity/serial `nextval` inserts will fail), functions (`EXECUTE`), or views (security definer/invoker semantics).
- `USING (auth.uid() IS NOT NULL)` covers SELECT/UPDATE/DELETE visibility of existing rows but not INSERT of new rows; without `WITH CHECK`, inserts are still denied under default-deny RLS.
- Tables `partidos`, `candidatos`, and `audit_log` referenced by `fix_rls_permissions.sql` do not exist in `schema.sql` — they are created only by `migracion_jerarquia_roles.sql`. Running the fix script on a fresh `schema.sql`-only database errors with "relation does not exist."

---

## Lens 3 — Granular / Safer Alternatives

**Privilege layer (least privilege):**
- `GRANT USAGE ON SCHEMA public TO authenticated` (required before table grants).
- Table-level: `GRANT SELECT` on reference/lookup tables (`departamentos`, `municipios`, `puestos_votacion`, `historico_electoral`, `partidos`, `candidatos`); `GRANT INSERT` (scoped by owner via RLS) on `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude`; **no** `GRANT ALL` (avoids TRUNCATE/TRIGGER/REFERENCES).
- `GRANT USAGE, SELECT ON ALL SEQUENCES` + `ALTER DEFAULT PRIVILEGES` so future tables/sequences inherit sane defaults.
- Consider `GRANT EXECUTE` on specific functions only if the frontend invokes them.

**RLS layer (row-level):**
- Keep `ENABLE ROW LEVEL SECURITY` (and `FORCE ROW LEVEL SECURITY` if table-owner bypass is a concern).
- Replace `auth.uid() IS NOT NULL` with role-aware policies joining `public.actors` on `actors.user_id = auth.uid()` and enforcing territorial/candidate/role scoping (mirroring the hierarchy already designed in `migracion_jerarquia_roles.sql`).
- Separate policies per operation: `SELECT` vs `INSERT` vs `UPDATE` vs `DELETE`, each with `USING` and, for writes, `WITH CHECK`.
- Exclude `audit_log` from public write access entirely; make it append-only or service-role-writable only.
- For `actas_e14`, consider a secure function / Edge Function gate so vote tallies and `estado_revision` cannot be freely overwritten by the frontend.

**Architectural alternatives:**
- Verify the client uses the anon key (it does — good); do **not** introduce `service_role` into the browser bundle (would bypass RLS entirely). If server-side bypass is needed, add a backend layer (Edge Function/API) — but that is out of scope/YAGNI for now (egm-zoom-out).
- Fix the 401 separately: validate Supabase Auth session, sign-in flow, token refresh, and `VITE_SUPABASE_ANON_KEY` configuration (egm-comprehension, egm-implementation-readiness).

---

## Lens 4 — Long-Term Maintenance Implications

- **One-shot, unversioned change:** Applying `GRANT ALL` via dashboard SQL or a loose `.sql` file means no migration file, no git history, no idempotency guard, no down migration, no environment promotion path. Schema drift between local/staging/production is likely (egm-structural, egm-implementation-readiness).
- **New tables inherit nothing:** Without `ALTER DEFAULT PRIVILEGES`, every table created later in `public` receives no grants on `authenticated`, recreating the 42501 incident repeatedly (egm-implementation-readiness).
- **Policy sprawl:** Eight identical inline policies with no naming convention cannot be audited, diffed, or removed programmatically. Future engineers will inherit permissions they do not understand and will likely replicate the blanket pattern (egm-structural).
- **Tech debt over 2 years:** Over-privileged `authenticated` role whose blast radius includes electoral integrity tables and voter PII. A leaked key, XSS, or compromised session = full read/write on `actas_e14` and `alertas_fraude`. No compensating application-layer authorization exists (egm-structural).
- **Schema/model drift:** The `actors` table lacks `user_id`/`nivel`/`territorio` columns that the granular policies and client code expect, so the intended role-based model cannot work until the schema is aligned (egm-codebase-details).

---

## Lens 5 — Observability / Monitoring Missing

- **Swallowed errors:** `supabaseService.ts` catches errors with `console.warn(...)` and silently falls back to `supabaseMock` (localStorage). An operator cannot distinguish a real 42501/401 from mock-data silence (egm-codebase-details).
- **No structured error propagation:** Postgres error codes (42501, relation-missing, sequence-permission) are not logged, traced, or surfaced to the caller in a machine-readable way (egm-codebase-details).
- **No real-vs-mock data flag:** The UI does not indicate whether data is live Supabase data or localStorage mock data, so permission failures are invisible to users and support (egm-codebase-details).
- **No audit of policy/grant changes:** No record of who applied `fix_rls_permissions.sql`, when, or against which environment (egm-structural).
- **No Realtime/RLS metrics:** No monitoring of WebSocket fan-out volume or per-table RLS rejection rates (egm-design).
- **Recommended:** Propagate Supabase error codes in a structured logger, add a `dataSource: 'supabase' | 'mock'` flag, alert on 42501 spikes, and audit `pg_policies` / `role_table_grants` drift.

---

## Lens 6 — Other Critical Risks / Edge Cases

- **Compliance/legal:** Blanket read of `votantes_crm` PII conflicts with the README's stated Ley 1581 (Habeas Data) compliance and could be a reportable privacy incident on a self-hosted Docker/Coolify deployment where Supabase Auth signup may be open (egm-design).
- **Cross-tenant access:** No isolation between candidates, parties, departments, or municipalities. A witness for candidate A can read candidate B's voters and actas (egm-design).
- **401 remains after DB fix:** Even after perfect GRANT/RLS, 401 Unauthorized errors persist because they originate in Supabase Auth / client session handling, not database permissions (egm-codebase-details, egm-comprehension, egm-implementation-readiness).
- **Terminology gaps for onboarding:** `authenticated`, `anon`, `service_role`, RLS, GRANT, 42501 vs 401, `auth.uid()`, `actas_e14`, `testigos_electorales`, `votantes_crm` are all undefined in the concept; a new engineer cannot reason about the fix safely (egm-comprehension).
- **Mixed-language schema:** `actors` is English in a Spanish table list; `e14` and `testigo` assume local electoral-domain knowledge (egm-comprehension).
- **Affected user id unexplained:** `80d9113e-3c2a-4995-86a9-ddb540a51dc7` is singled out without saying which table it lives in or why one user matters if all authenticated operations are blocked (egm-comprehension).
- **Rollback hazard:** Blanket `REVOKE ALL ... FROM authenticated` on rollback would wipe any pre-existing legitimate grants; a safe rollback must snapshot `information_schema.role_table_grants`, `pg_policies`, `relrowsecurity`, and `relforcerowsecurity` before applying (egm-implementation-readiness).
- **Environment parity:** Local Supabase often uses service-role keys that bypass RLS, so the 42501 may not reproduce locally; the migration must be applied and validated per environment (staging then production) (egm-implementation-readiness).

---

## Consolidated Recommendation

**Do not run `fix_rls_permissions.sql` as written.** The minimum viable correction is:

1. Fix the 401 path separately (Auth session, anon key config, client sign-in flow).
2. Apply least-privilege `GRANT USAGE` + table-specific `SELECT`/`INSERT` grants to `authenticated`, plus sequence grants and `ALTER DEFAULT PRIVILEGES`.
3. Enable RLS per table, create operation-scoped, role-aware policies (join `actors` on `user_id = auth.uid()`), add `WITH CHECK` for writes, exclude `audit_log`.
4. Version everything: idempotent migration file(s) with down migrations, policy naming convention, applied per environment in a transaction with pre-change snapshot for rollback.
5. Add observability: structured error codes, real-vs-mock flag, RLS rejection alerting.

---

## Reviewer Status

| Reviewer | Status |
|---|---|
| egm-design | completed |
| egm-codebase-details | completed |
| egm-zoom-out | completed |
| egm-comprehension | completed |
| egm-implementation-readiness | completed |
| egm-structural | completed |
