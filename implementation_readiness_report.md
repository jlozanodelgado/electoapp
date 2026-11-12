# Goldfish Implementation Readiness Report

**Target:** `design_draft.md` (lines 1–101) — ElectoApp Supabase RLS / Permissions Fix  
**Standards applied:** `implementation-readiness-standard`  
**Reviewers:** egm-implementation-readiness, egm-codebase-details  
**Overall verdict:** NOT ACTIONABLE — the document is a goal-level outline, not an implementation-ready specification

---

## Reviewer Status

| Reviewer | Short name | Status |
| --- | --- | --- |
| Pragmatic Tech Lead (implementation-readiness) | egm-implementation-readiness | completed |
| Pedantic Technical Quality Auditor (codebase-details) | egm-codebase-details | completed |

---

## Executive Summary

The design draft correctly diagnoses the problem (over-permissioned blanket `GRANT ALL` + `auth.uid() IS NOT NULL` in `fix_rls_permissions.sql`) and sets sound goals (least-privilege grants, operation-scoped RLS, separation of 401 vs 42501, versioned migration, observability). However, lines 1–101 do **not** contain unambiguous, fully actionable execution instructions. Multiple design decisions are left to the implementer, several schema references do not match the actual codebase, and the plan contradicts its own Goal 7 by deferring observability while listing `supabaseService.ts` as comment-only. An implementer cannot write code from this document without independently inventing SQL policy expressions, the grant matrix, rollback mechanics, and schema corrections.

---

## Prioritized Findings (Blockers → Majors → Nits)

### 🔴 Blockers

#### B1: RLS join key references a non-existent column (`actors.user_id`)
* **Reviewer Lens:** egm-implementation-readiness, egm-codebase-details
* **Affected Scope:** design_draft.md lines 42, 86, 98; `supabase/schema.sql` lines 226–235; `supabase/migracion_jerarquia_roles.sql` (all policy lines referencing `a.user_id`)
* **Discrepancy Description:** The design bases its entire role-hierarchy RLS model on `actors.user_id = auth.uid()`, but the `actors` table created in `supabase/schema.sql` (lines 226–235) has columns `id, nombre, role, candidato_id, scope_level, scope_id, leader_id, created_at` — **no `user_id` column exists**. `migracion_jerarquia_roles.sql` also does not add it (only `supervisor_id`, `candidato_id`, `leader_id`). Every granular policy in that script (and every policy the design proposes) keyed on `user_id` will fail at runtime with "column does not exist."
* **Rationale & Recommendation:** Add `user_id UUID` to the `actors` table (and reconcile `nivel` / `territorio`, which the client service also writes/reads) before writing any RLS policy. Alternatively re-key policies on an existing column, but that decision must be documented — not left to the implementer.

#### B2: Client writes columns that do not exist in the `actors` table
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** `supabase/services/supabaseService.ts` lines 671–672 (reads `a.user_id`, `a.nivel`), lines 685–697 (inserts `user_id`, `territorio`, `scope_level`, `scope_id`); `supabase/schema.sql` lines 226–235
* **Discrepancy Description:** `supabaseService.saveActor` sends `user_id` and `territorio` to `actors`, and `getActors` reads them — but neither column exists in `schema.sql`. All actor writes to Supabase will error, undermining Goal 1 (restore read/write access).
* **Rationale & Recommendation:** Add `user_id UUID` and `territorio TEXT` to the `actors` table, or remove those fields from the service layer and document the mapping explicitly.

#### B3: Design misattributes the existing bad script
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** design_draft.md line 7; `supabase/fix_rls_permissions.sql` lines 8, 31–64; `supabase/migracion_jerarquia_roles.sql` lines 1–418
* **Discrepancy Description:** The design states that `supabase/migracion_jerarquia_roles.sql` "attempts to resolve" the problem with `GRANT ALL` + `auth.uid() IS NOT NULL`. This is incorrect: those statements live exclusively in `supabase/fix_rls_permissions.sql`. `migracion_jerarquia_roles.sql` contains **no GRANT statements** and instead defines the granular role-hierarchy RLS policies (`supervisor_total`, `supervisor_candidato`, `lider`, `testigo`), `audit_log`, and `audit_trigger_func()` — assets the design should reuse rather than discard.
* **Rationale & Recommendation:** Correct the attribution. Adopt/repair the existing `migracion_jerarquia_roles.sql` policies instead of writing a new migration from scratch; the only defect there is the non-existent `user_id` column (see B1).

#### B4: Policy SQL and grant matrix are unwritten
* **Reviewer Lens:** egm-implementation-readiness
* **Affected Scope:** design_draft.md lines 35–40
* **Discrepancy Description:** Lines 37–40 only say `USING (condición de visibilidad por rol)` and `WITH CHECK (condición de autorización)` — placeholder descriptions, not actual SQL. Line 35 mentions table-specific `SELECT/INSERT/UPDATE/DELETE` but no per-table grant matrix exists. The implementer must invent every `USING`/`WITH CHECK` condition, every grant assignment, and every policy name with no acceptance criteria.
* **Rationale & Recommendation:** Write the exact SQL (GRANTs per table per operation, `CREATE POLICY` statements with concrete boolean expressions, policy naming convention, `DROP POLICY IF EXISTS` guards) before implementation begins.

---

### 🟡 Majors

#### M1: Observability required by Goal 7 but deferred and unplanned
* **Reviewer Lens:** egm-implementation-readiness, egm-codebase-details
* **Affected Scope:** design_draft.md line 19 (Goal 7), line 87 (`supabaseService.ts` comment-only), line 101 ("pendiente … mejora posterior"); `supabaseService.ts` lines 32–35, 71–73, 152–155, 698–700
* **Discrepancy Description:** Goal 7 requires structured Supabase error-code propagation, a `dataSource: 'supabase' | 'mock'` indicator, and 42501 spike alerting. Yet the plan lists `supabaseService.ts` as needing "no functional change, only a comment," and line 101 defers observability to a later improvement. The service currently swallows every error with `console.warn` and silently falls back to `supabaseMock` (localStorage). Goal 7 is unimplementable as planned.
* **Rationale & Recommendation:** Add structured error propagation (surface `42501` and other Postgres codes), a `dataSource` flag, and alerting to `supabaseService.ts` as part of this migration, not as a deferred improvement.

#### M2: `scope_level` / `scope_id` never populated by store mutations
* **Reviewer Lens:** egm-codebase-details, egm-implementation-readiness
* **Affected Scope:** design_draft.md lines 86–87; `supabase/store/electoralStore.ts` lines 285–319 (`addActor`), 354–413 (`addTestigo`/`addVotante`/`addActaE14`/`resolverAlerta`); `supabase/services/supabaseService.ts` lines 693–694
* **Discrepancy Description:** The design says store mutations must pass `scope_level` and `scope_id` for RLS policies, but `electoralStore.addActor` never populates them and the other write functions do not set scope fields. `supabaseService.saveActor` sends `scope_level`/`scope_id` to `actors` (columns that exist in `schema.sql` lines 231–232), but nothing feeds them. RLS policies keyed on scope will have nothing to evaluate.
* **Rationale & Recommendation:** Specify exactly which fields each store mutation sets and how `scope_level`/`scope_id` are derived from the authenticated actor before calling Supabase.

#### M3: Pre-existing permissive RLS policies conflict with new least-privilege policies
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** `supabase/schema.sql` lines 203–210 (`USING (true)` / `WITH CHECK (true)` on 8 tables); design_draft.md lines 37–40 (no policy replacement strategy)
* **Discrepancy Description:** `schema.sql` already creates broadly permissive policies on `departamentos`, `municipios`, `puestos_votacion`, `historico_electoral`, `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude`. PostgreSQL ORs policies together, so new restrictive policies will not actually restrict access unless the old `USING (true)` policies are dropped. The design does not address this.
* **Rationale & Recommendation:** Add `DROP POLICY IF EXISTS` for the permissive `schema.sql` policies in the new migration, or otherwise document how old and new policies interact.

#### M4: Tables referenced by the design do not exist in the base schema
* **Reviewer Lens:** egm-implementation-readiness, egm-codebase-details
* **Affected Scope:** design_draft.md Goal 1 line 13 (`partidos`, `candidatos`, `audit_log`); `supabase/schema.sql` (does not create them); `supabase/migracion_jerarquia_roles.sql` (creates them); `supabase/fix_rls_permissions.sql` lines 54–64 (grants/policies on them)
* **Discrepancy Description:** `partidos`, `candidatos`, and `audit_log` are not created by `supabase/schema.sql` — they exist only if `migracion_jerarquia_roles.sql` has been run. `GRANT`/`POLICY` statements on these tables will error with "relation does not exist" on a `schema.sql`-only database. Migration ordering (run `migracion_jerarquia_roles.sql` before `001_rls_permissions.sql`) is undocumented.
* **Rationale & Recommendation:** Document migration ordering and either create these tables in the new migration with `CREATE TABLE IF NOT EXISTS` guards or require `migracion_jerarquia_roles.sql` as a prerequisite.

#### M5: Client/Supabase configuration unaddressed (401 and 42501 may not reproduce)
* **Reviewer Lens:** egm-implementation-readiness, egm-codebase-details
* **Affected Scope:** design_draft.md Goal 5 line 17; `.env` (empty `VITE_SUPABASE_ANON_KEY`); `supabaseClient.ts` (`isSupabaseConfigured()` returns false when key is empty); `supabaseService.ts` silent mock fallback
* **Discrepancy Description:** `.env` has an empty anon key, so `isSupabaseConfigured()` returns false and the app never calls Supabase — neither 42501 nor 401 can originate from the DB in the current local state. Goal 5 says fix the 401 separately but assigns no file, owner, or steps. `supabaseClient.ts`, `.env`, `.env.example`, `main.tsx`, `App.tsx` are not listed or analyzed.
* **Rationale & Recommendation:** Assign ownership/files for the 401 remediation (anon key config, sign-in flow, token refresh) and document how the migration is validated when the client currently reads only from `supabaseMock`.

#### M6: Incomplete file inventory — write modals and auth components not analyzed
* **Reviewer Lens:** egm-implementation-readiness
* **Affected Scope:** design_draft.md lines 89–93 (`src/components/` marked unchanged); `supabase/src/components/modals/` (NewPartidoModal, NewCandidatoModal, NewWitnessModal, NewVoterModal, FraudAlertModal, DigitalizeE14Modal); `supabase/src/components/auth/` (LoginForm, RegisterForm, CreateUserModal)
* **Discrepancy Description:** The design lists `src/components/` as unchanged with no analysis. If RLS policies require `scope_level`/`scope_id`/`leader_id` on writes, these modals must capture and supply them (e.g., `NewWitnessModal` already has `leaderId` state; `NewPartidoModal`/`NewCandidatoModal` have no actor/RLS fields). Auth components are untouched despite Goal 5's 401 separation.
* **Rationale & Recommendation:** Audit all six write modals and three auth components for required field changes; list them as modified or provide a documented rationale for why each needs no change.

#### M7: Store modification is redundant or undefined
* **Reviewer Lens:** egm-implementation-readiness, egm-codebase-details
* **Affected Scope:** design_draft.md lines 86–87; `supabase/store/electoralStore.ts` lines 285–413; `supabase/services/supabaseService.ts` lines 685–697
* **Discrepancy Description:** The design says `electoralStore.ts` must be adjusted to pass `leader_id`, `scope_level`, `scope_id`, but `addTestigo` (l.357), `addVotante` (l.375), `addActaE14` (l.395), `resolverAlerta` (l.410) already derive/pass `leaderId`, and `addActor` already passes `supervisorId`/`candidatoId`/`leaderId`/`nivel`. What actually changes is undefined.
* **Rationale & Recommendation:** Specify the exact diff for each store function, or remove the requirement if no change is needed.

#### M8: Rollback mechanics missing
* **Reviewer Lens:** egm-implementation-readiness
* **Affected Scope:** design_draft.md Goal 6 line 18 (snapshot `pg_policies`/`role_table_grants`), line 100 (`DOWN` for reversión)
* **Discrepancy Description:** Goal 6 mentions snapshotting for rollback but no procedure is specified (what, when, how restored). The `DOWN` migration contents are unwritten. Idempotency guards for `GRANT`s (PostgreSQL `GRANT` is not idempotent by default) are also absent.
* **Rationale & Recommendation:** Write the `DOWN` migration (revoke grants, drop policies, restore snapshots) and add `DO` blocks / revoke-first guards for idempotency.

#### M9: Existing audit triggers unaddressed
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** `supabase/migracion_jerarquia_roles.sql` lines 176–226 (`audit_trigger_func()` + triggers on 4 tables); design_draft.md line 99 (`audit_log` excluded from public write)
* **Discrepancy Description:** `migracion_jerarquia_roles.sql` already defines `audit_trigger_func()` and triggers on `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude`. The design mentions `audit_log` exclusion but not these triggers — new policies/writes must not break or duplicate audit behavior.
* **Rationale & Recommendation:** Document how the new RLS policies interact with existing audit triggers, or consolidate into one migration.

---

### 🟢 Nits

#### N1: DB enum vs. TypeScript type mismatch (`lider` vs `leader`)
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** `supabase/migracion_jerarquia_roles.sql` line 261 (`'lider'::actor_role`); `supabase/src/types/electoral.ts` line 107 (`'leader'`)
* **Discrepancy Description:** The database `actor_role` enum uses `'lider'` (Spanish) while the TypeScript `Actor.role` type uses `'leader'` (English). Worth documenting the mapping so policy expressions and client code stay consistent.
* **Rationale & Recommendation:** Add a terminology/normalization note mapping DB enum values to TS types.

#### N2: Missing `supabase/migrations/` directory
* **Reviewer Lens:** egm-implementation-readiness
* **Affected Scope:** design_draft.md line 77 (`supabase/migrations/001_rls_permissions.sql`)
* **Discrepancy Description:** No `supabase/migrations/` directory exists in the repo. Creating the new file requires directory creation first.
* **Rationale & Recommendation:** Note directory creation as a prerequisite step.

#### N3: Unverified claim about `ElectoralMap.tsx`
* **Reviewer Lens:** egm-codebase-details
* **Affected Scope:** design_draft.md line 92
* **Discrepancy Description:** The design claims `ElectoralMap.tsx` reads from `electoralStore` and doesn't touch Supabase directly. Plausible but not verified during this review (file was not read).
* **Rationale & Recommendation:** Confirm before marking the file as unchanged.

---

## What Is Specified vs. Missing

| Category | Specified in design_draft.md | Missing / Undefined |
| --- | --- | --- |
| New migration file | Path `supabase/migrations/001_rls_permissions.sql`; idempotent; `DOWN`; `ALTER DEFAULT PRIVILEGES` | Exact SQL: GRANT matrix, policy expressions, policy names, idempotency guards, `DOWN` contents, directory creation |
| Modified `fix_rls_permissions.sql` | Marked as replaced | Whether deleted or overwritten in place; no migration ordering documented |
| `electoralStore.ts` | Functions to touch: `addActor`, `addTestigo`, `addVotante`, `addActaE14`, `resolverAlerta` | Exact delta per function; `scope_level`/`scope_id` population; what actually changes vs. already-implemented |
| `supabaseService.ts` | "No functional change, comment only" | Contradicts Goal 7 observability; no `dataSource` flag, no structured error codes, no 42501 alerting spec |
| Unchanged files | `src/components/`, `ElectoralMap.tsx`, `src/types/electoral.ts` | No analysis of write modals or auth components; `ElectoralMap.tsx` claim unverified |
| Goals & Non-Goals | 7 goals, 7 non-goals (lines 11–28) | Goal 5 (401 fix) has no file/owner; Goal 7 observability deferred; Non-Goal 7 (no schema changes) conflicts with adding `user_id` to `actors` |
| Rollback | `DOWN` mentioned; snapshot `pg_policies`/`role_table_grants` mentioned | No procedure, no `DOWN` SQL, no idempotency guards |
| Observability | Required by Goal 7 | Deferred to "mejora posterior"; no spec, no acceptance criteria |

---

## Files Listed vs. Files That Actually Exist

| File | Listed in design | Exists in codebase | Notes |
| --- | --- | --- | --- |
| `supabase/migrations/001_rls_permissions.sql` | Yes (NEW) | No | Directory `supabase/migrations/` does not exist |
| `supabase/fix_rls_permissions.sql` | Yes (MODIFIED) | Yes | 66 lines; contains `GRANT ALL` + blanket `auth.uid() IS NOT NULL` policies |
| `supabase/schema.sql` | No | Yes | 391 lines; creates 8 tables + actors; no `partidos`, `candidatos`, `audit_log` |
| `supabase/migracion_jerarquia_roles.sql` | Misattributed (line 7) | Yes | 418 lines; creates `partidos`, `candidatos`, `audit_log`; granular RLS policies; no `GRANT ALL` |
| `supabaseClient.ts` | No | Yes | `isSupabaseConfigured()` returns false when anon key empty |
| `.env` / `.env.example` | No | Yes | `VITE_SUPABASE_ANON_KEY=` empty |
| `src/store/electoralStore.ts` | Yes (MODIFIED) | Yes | 446 lines; already passes `leaderId` in several mutations |
| `src/services/supabaseService.ts` | Yes (comment only) | Yes | 804 lines; silent error swallowing + mock fallback |
| `src/types/electoral.ts` | Yes (UNCHANGED) | Yes | Already includes `leaderId`, `scopeLevel`, `scopeId`, `userId` |
| Write modals (`NewPartidoModal`, `NewCandidatoModal`, `NewWitnessModal`, `NewVoterModal`, `FraudAlertModal`, `DigitalizeE14Modal`) | No (components marked unchanged) | Yes | Not analyzed for RLS field requirements |
| Auth components (`LoginForm`, `RegisterForm`, `CreateUserModal`) | No | Yes | Not analyzed; Goal 5 401 fix unassigned |

---

## Unambiguous vs. Design Decisions Left to the Implementer

### Unambiguous
- Intent: replace blanket `GRANT ALL` + `auth.uid() IS NOT NULL` with least-privilege grants + operation-scoped RLS.
- New migration path: `supabase/migrations/001_rls_permissions.sql`.
- `fix_rls_permissions.sql` is replaced (not added alongside).
- Requirements: idempotent, has `DOWN`, applied per environment (staging then production), `audit_log` excluded from public write.
- Store functions identified for review: `addActor`, `addTestigo`, `addVotante`, `addActaE14`, `resolverAlerta`.
- Non-goals: no `service_role` in browser, no backend layer, no Next.js migration, no new modules, no schema changes beyond permissions (Non-Goal 7).

### Design Decisions Left to the Implementer (must be resolved before implementation)

1. **Exact `USING` / `WITH CHECK` SQL** for every policy — role, territory, candidate scoping expressions not written.
2. **Per-table GRANT matrix** — which tables get `SELECT`/`INSERT`/`UPDATE`/`DELETE`, and which roles get what.
3. **`actors.user_id` resolution** — add the column (schema change, conflicting with Non-Goal 7) or re-key policies on an existing column. No guidance given.
4. **Missing-table handling** — whether `001_rls_permissions.sql` creates `partidos`/`candidatos`/`audit_log` or requires `migracion_jerarquia_roles.sql` first.
5. **Policy naming convention** — needed for idempotent `DROP POLICY IF EXISTS` + recreate.
6. **Snapshot/rollback procedure** — what to snapshot, when, how `DOWN` restores; `DOWN` SQL unwritten.
7. **Idempotency mechanism** — `DO` blocks / revoke-first guards for `GRANT`s (not idempotent by default in PostgreSQL).
8. **Observability implementation** — shape of `dataSource` flag, structured error codes, 42501 alerting threshold/destination; explicitly deferred (line 101).
9. **401 remediation** — no file, steps, or owner assigned.
10. **Component-level changes** — whether write modals and auth components must supply new fields; no analysis performed.
11. **Deployment ordering** — schema migration first, then permissions migration; not documented.

---

## Contradictions with `concepts_brief.md`

| # | Contradiction | design_draft.md | concepts_brief.md |
|---|---|---|---|
| C1 | `actors.user_id` referenced as RLS join key but does not exist | Line 98: policies "based on `actors.user_id = auth.uid()`" | Lens 1 (line 27) and Lens 4 (line 86): `actors` lacks `user_id`/`nivel`/`territorio`; granular RLS cannot work until schema is aligned |
| C2 | `partidos`, `candidatos`, `audit_log` referenced but absent from `schema.sql` | Goal 1 (line 13) lists them as tables to restore access to | Lens 2 (line 55): running fix on `schema.sql`-only database errors with "relation does not exist" |
| C3 | Observability promised and deferred simultaneously | Goal 7 (line 19) requires structured error codes + `dataSource` flag + 42501 alerting; line 101 defers it to "mejora posterior"; line 87 says `supabaseService.ts` comment-only | Lens 5 (lines 90–97): swallowed errors, no structured propagation, no `dataSource` flag are defects that must be fixed |
| C4 | Store "modification" redundant/undefined | Lines 86–87 say store must pass `leader_id`/`scope_level`/`scope_id` | Code already does (store lines 357, 375, 395, 410; service lines 693–695); unclear what changes |
| C5 | Non-Goal 7 vs. schema reality | Non-Goal 7 (line 27): no schema changes beyond permissions | Making `actors.user_id`-based policies work requires adding a column to `actors` (schema change) |
| C6 | GRANT scope alignment | Line 35 correctly narrows to `USAGE` + table-specific grants (aligned with brief) | Lens 2 (line 53): `GRANT ALL` does not cover sequences/functions/views — design correctly avoids this, but doesn't acknowledge `fix_rls_permissions.sql` already grants sequences which may not exist (UUID defaults) |
| C7 | Misattribution of existing bad script | Line 7 blames `migracion_jerarquia_roles.sql` for `GRANT ALL` | Those statements are exclusively in `fix_rls_permissions.sql` (lines 8, 31–64); `migracion_jerarquia_roles.sql` has no GRANTs |

---

## Overall Verdict

**Status: NOT ACTIONABLE.**

From lines 1–101 alone, an implementer cannot write code without making independent design decisions on: exact SQL policy expressions, the per-table GRANT matrix, policy naming, idempotency guards, rollback mechanics, `actors.user_id` schema correction, component-level changes, and observability implementation. The plan must return to the author for a design pass that:

1. Writes the exact SQL (GRANTs, policies, `DOWN`, idempotency guards).
2. Resolves the `actors.user_id` / `partidos` / `candidatos` / `audit_log` schema contradictions.
3. Assigns files and owners for `supabaseClient.ts`, `.env`, the 401 fix, and observability.
4. Audits the six write modals and three auth components for required field changes.
5. Corrects the misattribution of `GRANT ALL` to `migracion_jerarquia_roles.sql` and reuses that script's granular policies where possible.
6. Drops or supersedes the permissive `USING (true)` policies in `schema.sql` so new restrictive policies are actually enforced.
