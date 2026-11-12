# Comprehension Report — `design_draft.md`

**Reviewer persona:** `egm-comprehension` (naive reader, zero assumed institutional knowledge)
**Source file:** `C:\Users\carme\Proyectos Antigravity\electoapp\design_draft.md` (lines 1–101, read in full)
**Purpose:** Paraphrase what the document says, flag what is clear vs. confusing, and surface missing, ambiguous, or contradictory information.

---

## 1. Paraphrase — what the document says, section by section

### Title & Overview (lines 1–9)
ElectoApp is an electoral-management and campaign web app (in the style of VotoMAP) deployed on a VPS with Supabase Local (PostgreSQL + PostGIS). It manages departments, municipalities, polling stations, candidates, leaders, witnesses, voters, E-14 minutes, and fraud alerts, with geo-visualization and real-time operation on election day.

**Problem:** Authenticated users (Supabase Auth's `authenticated` role) cannot read or write database tables. The frontend throws `42501 permission denied` and `401 Unauthorized` when querying tables such as `partidos`, `candidatos`, `actors`, `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`, and `puestos_votacion`.

An existing fix script (`supabase/migracion_jerarquia_roles.sql`) tries to solve this with `GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated` plus row-level policies of `FOR ALL USING (auth.uid() IS NOT NULL)`. The document criticizes this because it over-permissions every authenticated user, exposes voter personal data, allows deletion of minutes and alerts, and voids the already-designed hierarchical role model.

**Objective:** Define a minimal, secure, versionable fix that restores read/write access for authenticated users without compromising security or electoral integrity.

### Goals (lines 11–19)
Seven goals are listed:

1. Restore read and write access for authenticated users on `partidos`, `candidatos`, `actors`, `puestos_votacion`, `testigos_electorales`, `votantes_crm`, `actas_e14`, and `alertas_fraude` from the Supabase frontend.
2. Apply least privilege: each table and each operation (SELECT, INSERT, UPDATE, DELETE) gets the minimum permission needed. Avoid `GRANT ALL` and avoid `auth.uid() IS NOT NULL` as a single catch-all row policy.
3. Keep the role hierarchy (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`) with its `candidato_id`, `supervisor_id`, and `leader_id`, so a leader sees only their own witnesses and voters, and a candidate supervisor sees only their own territorial/candidate scope.
4. Enable RLS per table, with separate policies per operation (`USING` for reads, `WITH CHECK` for writes), and exclude `audit_log` from public writes.
5. Fix the `401` (session/auth) error separately from the table-permission (`42501`) error, since they come from different layers.
6. Version all changes in an idempotent migration file with a `DOWN` block for rollback, applied environment by environment (staging then production), with a prior snapshot of `pg_policies` and `role_table_grants` for rollback.
7. Add observability: propagate Supabase error codes in a structured way, add a frontend `dataSource: 'supabase' | 'mock'` indicator so permission failures aren't confused with local mock data, and alert on spikes of `42501` errors.

### Non-Goals (lines 21–28)
- Do not put `service_role` in the browser bundle (it would bypass RLS entirely).
- Do not build a backend layer (Edge Function / API) to compensate for permissions; out of scope for now.
- Do not rewrite the app or migrate to Next.js App Router; keep the current stack (Vite + React + Zustand + Supabase JS).
- Do not implement new modules (finance, WhatsApp, OCR, strategist AI) as part of this fix.
- Do not modify the existing data schema beyond what is needed for permissions and RLS policies.

### Technical Plan (lines 29–101)

**Solution architecture:** Two independent layers:
1. **Table privilege layer (`GRANT`):** grant `authenticated` specific `SELECT`, `INSERT`, `UPDATE`, `DELETE` permissions on needed tables, plus `USAGE` on the `public` schema and sequences. No `GRANT ALL`.
2. **Row-level security layer (RLS):** each table enables RLS with policies split by operation:
   - `SELECT`: `USING (role-based visibility condition)`
   - `INSERT`: `WITH CHECK (insert authorization condition)`
   - `UPDATE`/`DELETE`: `USING (ownership condition)` + `WITH CHECK (authorization condition)`

The `actors` model is the reference point for the Supabase Auth `user_id`, so each user sees and writes only the rows corresponding to their role and territory.

**Data-flow diagram (text diagram):** Frontend (React/Zustand) → SupabaseService (service layer) → branches to Supabase (PostgreSQL) or supabaseMock (localStorage) → PostgreSQL + PostGIS with RLS enabled and `USING`/`WITH CHECK` policies.

**New files:** `supabase/migrations/001_rls_permissions.sql` — an idempotent migration granting `GRANT USAGE` + specific `SELECT/INSERT/UPDATE/DELETE` to `authenticated`, enabling RLS per table, creating per-operation policies with `USING` and `WITH CHECK`, including `ALTER DEFAULT PRIVILEGES` for future tables, and including a `DOWN` block for full reversal.

**Modified files:**
- `supabase/fix_rls_permissions.sql` — replaced by the new idempotent migration (the old one had ambiguous policies and `GRANT ALL`).
- `src/store/electoralStore.ts` — `addActor`, `addTestigo`, `addVotante`, `addActaE14`, and `resolverAlerta` are adjusted to pass `leader_id`, `scope_level`, `scope_id`, and other fields needed by RLS policies based on `actors.user_id = auth.uid()`. No business-logic change; only ensuring required fields are sent to Supabase.
- `src/services/supabaseService.ts` — no functional change (already the source of truth with mock fallback). A comment is added documenting that RLS policies must be applied in the database before connecting.

**Unchanged files:** `src/components/`, `src/components/map/ElectoralMap.tsx` (reads from `electoralStore`, no direct Supabase access), and `src/types/electoral.ts` (types already include `leaderId`, `scopeLevel`, `scopeId`, `lat`, `lng` on actors and relevant entities).

**Consistency checklist with `conceptos_brief.md`:** Confirms `GRANT ALL` → specific grants; `auth.uid() IS NOT NULL` → per-operation `USING`/`WITH CHECK` policies joined on `actors.user_id = auth.uid()`; `audit_log` excluded from public writes; script idempotent with `DOWN`; observability via Supabase error-code propagation (noted as pending implementation in `supabaseService.ts` as a later improvement).

---

## 2. What I found clear vs. confusing

### Clear
- **The problem and why the current fix is bad:** over-broad `GRANT ALL` + `auth.uid() IS NOT NULL` policies are clearly identified as the root cause of over-permissioning.
- **The overall shape of the proposed fix:** split table privileges (`GRANT`) from row-level security (RLS), with separate policies per operation.
- **Which files change and which don't:** the new/modiﬁed/unchanged tables give a concrete surface area.
- **What is explicitly out of scope:** no `service_role` in the browser, no backend layer, no Next.js rewrite, no new modules, no schema changes beyond permissions.

### Confusing / ambiguous
- **No actual policy SQL is shown.** The document describes policy conditions abstractly (`USING (condición de visibilidad por rol)`, `WITH CHECK (condición de autorización)`) but never writes a single concrete policy. I cannot tell how a leader's "own witnesses and voters" or a supervisor's "territorial/candidate scope" is translated into SQL, which columns are joined, or how `actors.user_id = auth.uid()` connects to `testigos_electorales`, `votantes_crm`, `actas_e14`, etc.
- **The role hierarchy is under-specified.** The five roles (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`) and the columns `candidato_id`, `supervisor_id`, `leader_id` are named, but the document never states what each role can do on each table (e.g., can a witness insert a votante? can a leader update an acta?).
- **The `401` fix has no plan.** Goal 5 says to fix `401` separately, but no file, root cause, or steps are listed for it anywhere in the document. It is acknowledged as a problem but not addressed.
- **Idempotency claim is unsubstantiated.** The migration is described as idempotent with a `DOWN` block, but no SQL is shown. Plain PostgreSQL `CREATE POLICY` / `GRANT` statements are not idempotent by default (they error if the object already exists), so it is unclear how idempotency is achieved (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, etc.).
- **`ALTER DEFAULT PRIVILEGES` is underspecified.** It is unclear which role it runs as, which schema/objects it covers, and whether it applies to future tables only or also sequences/functions.
- **`DOWN` block scope is unclear.** Does it drop policies, revoke grants, disable RLS, restore `GRANT ALL`, or restore the old script? Not stated.
- **Snapshot/rollback mechanism is missing.** Goal 6 mentions snapshotting `pg_policies` and `role_table_grants` before applying, but no file, script, or command is defined for taking or using that snapshot.
- **Deployment path is vague.** "Applied by environment (staging then production)" is stated, but not how (Supabase CLI, `psql`, Supabase Dashboard, migration runner?).
- **`audit_log` appears out of nowhere.** Goal 4 says to exclude `audit_log` from public writes, but `audit_log` is not in the list of tables to fix in Goal 1, and its location/schema/owner is never mentioned.
- **Observability goal vs. modified-files table conflict (see section 4).**

---

## 3. What seems missing or incomplete

| Area | What is missing |
|------|-----------------|
| **Concrete RLS policies** | Actual SQL for `USING` / `WITH CHECK` conditions per table and operation; join path from `actors` to each data table; ownership rules for `UPDATE`/`DELETE`. |
| **Role → permission matrix** | What each of the five roles may SELECT/INSERT/UPDATE/DELETE on which tables (e.g., leader scope = `leader_id`, supervisor scope = `supervisor_id` + `candidato_id`). |
| **`401` remediation plan** | No owner, file, or steps; only declared as out-of-band from `42501`. |
| **Idempotency & DOWN details** | How `GRANT`/`CREATE POLICY` idempotency is achieved; exact contents of the `DOWN` rollback. |
| **Snapshot & rollback procedure** | Who/what snapshots `pg_policies` and `role_table_grants`, where it is stored, and how rollback uses it. |
| **Deployment mechanics** | Tooling and order for applying to staging then production. |
| **`audit_log` handling** | Where it lives, who owns it, what "exclude from public writes" means concretely. |
| **`dataSource` indicator** | Goal 7 asks for a `dataSource: 'supabase' | 'mock'` frontend indicator, but no file or implementation is listed; `supabaseService.ts` is said to need no functional change. |
| **42501 alerting** | Goal 7 mentions alerting on `42501` spikes, but no destination, threshold, or implementation file. |
| **Validation / testing** | No mention of how to verify that a leader cannot see another leader's voters, or that `audit_log` is truly unwritable by `authenticated`. |

---

## 4. Contradictions and inconsistencies I noticed

1. **Observability is a goal but deferred.** Goal 7 lists adding a `dataSource: 'supabase' \| 'mock'` indicator and structured Supabase error propagation as objectives. The modified-files table for `src/services/supabaseService.ts` says "No se requiere cambio funcional" (no functional change required), and line 101 says observability is "pendiente de implementar ... como mejora posterior" (pending implementation as a later improvement). These conflict: if it is a goal of *this* document, someone must own the implementation; if it is deferred, it should be moved to Non-Goals or clearly marked out of scope for this fix.

2. **`GRANT USAGE` on schema and sequences vs. "minimal privilege."** Goal 2 says every table and operation gets the minimum permission needed, yet the architecture grants `USAGE` on the whole `public` schema and sequences to `authenticated`. That is not necessarily wrong, but it is broader than table-level least privilege and is not justified or scoped.

3. **Diagram vs. architecture text.** The data-flow diagram shows `supabaseMock (localStorage)` on the same level as Supabase (PG), but the arrow then flows into the "PostgreSQL + PostGIS" box as if the mock also writes to PostgreSQL. It is unclear whether the mock branch is meant to terminate in localStorage or continue to the database box.

4. **`actors` as the single source of truth for `user_id` vs. store fields.** The architecture says policies are based on `actors.user_id = auth.uid()`, yet the store changes pass `leader_id`, `scope_level`, and `scope_id` into writes. The relationship between these fields and the `actors` table (which column holds `user_id`, how `scope_level/scope_id` map to `candidato_id/supervisor_id/leader_id`) is not explained.

5. **Tables to fix vs. tables mentioned elsewhere.** Goal 1 lists eight tables. `audit_log` is mentioned in Goal 4 but not in Goal 1. It is unclear whether `audit_log` receives grants at all, or only an RLS policy, or nothing.

6. **`actors` table permissions vs. reads by other roles.** If `actors` is the reference for `auth.uid()`, and leaders should see only their own witnesses/voters, it is unclear whether `authenticated` users can SELECT from `actors` at all (to resolve a leader's scope), and under what policy.

---

## 5. Bottom line — what I do and don't understand

**I understand:** the problem (over-permissive existing fix causing `42501`/`401`), the proposed two-layer fix (specific `GRANT`s + per-operation RLS policies), the files being touched, the roles involved, and that `actors.user_id = auth.uid()` is the intended join key.

**I do not understand:** how the RLS policies are actually written (no SQL shown), how each role's scope maps to table rows, how the `401` error will be fixed, how idempotency and `DOWN` work without seeing SQL, how rollback snapshots are taken and applied, how observability is implemented if `supabaseService.ts` has no functional change, and how `audit_log` fits into the grant/RLS model.

The document is a reasonable high-level plan, but a developer implementing it from this text alone would have to invent the actual SQL policies, the role-permission matrix, and the rollback mechanics.