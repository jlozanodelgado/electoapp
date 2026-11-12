# Zoom Out Review Report — design_draft.md

**Reviewer persona:** egm-zoom-out (Skeptical Architect — high-altitude simplicity, minimalism, YAGNI, codebase reuse)
**Target file:** `design_draft.md` (lines 1–101, read in full)
**Review date:** Tue Nov 10 2026

---

## Executive Summary

`design_draft.md` is a design document for fixing broken Supabase permissions in **ElectoApp**, a VotoMAP-style electoral management and campaigns web application deployed on a VPS with Supabase Local (PostgreSQL + PostGIS).

**Problem:** Authenticated users (Supabase Auth `authenticated` role) cannot read or write database tables. The frontend surfaces `42501 permission denied` and `401 Unauthorized` errors against tables including `partidos`, `candidatos`, `actors`, `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`, and `puestos_votacion`. An existing remediation script (`supabase/migracion_jerarquia_roles.sql`) attempts a fix with `GRANT ALL ON ALL TABLES ... TO authenticated` plus blanket policies `FOR ALL USING (auth.uid() IS NOT NULL)`, which over-permissions every authenticated user, exposes voter personal data, permits deletion of actas and alerts, and voids the designed role hierarchy.

**Proposed solution:** A minimal, secure, versionable correction delivered through two independent layers — (1) table-level privileges (`GRANT` of specific `SELECT/INSERT/UPDATE/DELETE` per table, never `GRANT ALL`) and (2) row-level security (RLS) policies separated by operation (`USING` for reads, `WITH CHECK` for writes), keyed off `actors.user_id = auth.uid()`. All changes live in a new idempotent migration file `supabase/migrations/001_rls_permissions.sql` with a `DOWN` rollback, applied staging-first then production, plus small frontend adjustments in `electoralStore.ts` and documentation in `supabaseService.ts`.

**Bottom line:** The document is focused, well-scoped, and explicitly says what it will *not* do (no `service_role` in the browser, no backend layer, no rewrite, no new modules, no schema changes beyond permissions). Its main weaknesses are architectural/integration gaps that a reader would need before implementing: the `actors` ↔ `auth.users` mapping is hand-wavy, no concrete policy SQL or schema is shown, the 401 fix is acknowledged but undescribed, observability is explicitly deferred, and several naming/environment ambiguities remain unresolved.

---

## Key Sections Identified and Their Purpose

| Section (lines) | Purpose |
| --- | --- |
| **Title & Overview** (1–9) | States what ElectoApp is, the symptom (`42501` / `401`), why the existing script is inadequate (over-permissioning, data exposure, broken hierarchy), and the document's objective: a minimal, secure, versionable permissions fix. |
| **Goals** (11–19) | Seven success criteria: restore read/write access to eight named tables; least-privilege per table/operation; preserve the five-tier role hierarchy (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`); per-operation RLS policies with `audit_log` excluded from writes; separate the `401` auth fix from the `42501` permissions fix; idempotent migration with `DOWN`, environment staging, and pre-snapshots for rollback; observability (structured error codes, `dataSource` indicator, `42501` spike alerts). |
| **Non-Goals** (21–28) | Explicitly out of scope: `service_role` in browser bundle, backend/Edge Function layer, Next.js App Router rewrite, new modules (finanzas/WhatsApp/OCR/IA), and schema changes beyond permissions/RLS. Good boundary-setting. |
| **Technical Plan — Arquitectura de solución** (29–42) | Two-layer model: table privileges (`GRANT` specific ops + `USAGE` on schema/sequences) and RLS (per-operation `USING`/`WITH CHECK` policies), keyed through the `actors` hierarchy so users see/write only rows matching their role and territory. |
| **Technical Plan — Diagrama de flujo** (44–73) | ASCII diagram: Frontend (React/Zustand) → SupabaseService → Supabase (PG) / supabaseMock (localStorage) → PostgreSQL + PostGIS with RLS. Illustrates the real/mock dual path. |
| **Archivos nuevos** (75–79) | New migration `supabase/migrations/001_rls_permissions.sql`: idempotent `GRANT USAGE` + specific `GRANT SELECT/INSERT/UPDATE/DELETE`, RLS enabled per table, per-operation policies with `USING`/`WITH CHECK`, `ALTER DEFAULT PRIVILEGES` for future tables, full `DOWN` rollback. |
| **Archivos modificados** (81–87) | `fix_rls_permissions.sql` (replaced by the new migration); `src/store/electoralStore.ts` (pass `leader_id`, `scope_level`, `scope_id` etc. so RLS policies can evaluate); `src/services/supabaseService.ts` (comment only; document that RLS must be applied before connecting). |
| **Archivos sin cambios** (89–94) | `src/components/`, `ElectoralMap.tsx`, `src/types/electoral.ts` — asserted to need no changes (types already include `leaderId`, `scopeLevel`, `scopeId`, `lat`, `lng`). |
| **Verificación de consistencia con conceptos_brief.md** (95–101) | Six bullets confirming the draft corrects earlier proposals (`GRANT ALL` → specific grants; `auth.uid() IS NOT NULL` → per-operation policies; `audit_log` excluded; idempotent + `DOWN`; observability noted as pending). |

---

## Gaps, Missing Sections, and Unclear Areas

### 1. The `actors` ↔ `auth.users` integration is undocumented (significant gap)
The entire RLS model hinges on `actors.user_id = auth.uid()`, but the document never explains:
- How `actors.user_id` is populated and kept in sync with Supabase Auth users (trigger? application-level sync? manual seeding?).
- Whether a foreign key or unique constraint exists between `actors.user_id` and `auth.users.id`.
- What happens for authenticated users who have no matching `actors` row (do they see nothing? is that intended?).

Without this, a reviewer cannot verify that policies `actors.user_id = auth.uid()` will actually work, and an implementer cannot build them.

### 2. No concrete schema or policy SQL is shown
The document names eight tables plus `audit_log` but never shows their columns. It references `candidato_id`, `supervisor_id`, `leader_id`, `user_id`, `leaderId`, `scopeLevel`, `scopeId` without indicating which table owns which column. There are no example `CREATE POLICY` statements, so it is impossible to verify that the proposed `USING`/`WITH CHECK` separation matches the data model (e.g., how a `leader` inserts a `testigo` with the correct `leader_id`, or how a `candidateSupervisor` is scoped to a territory).

### 3. Table scope is inconsistent
- Overview mentions `departamentos`, `municipios`, `puestos de votación`, `candidatos`, `líderes`, `testigos`, `votantes`, `actas E-14`, `alertas de fraude`.
- Goal 1 lists exactly eight tables: `partidos`, `candidatos`, `actors`, `puestos_votacion`, `testigos_electorales`, `votantes_crm`, `actas_e14`, `alertas_fraude`.
- `departamentos` and `municipios` appear in the app description but not in Goal 1's table list. It is unclear whether they need permissions, whether they are read-only reference data, or whether they were simply omitted.

### 4. `audit_log` exclusion is mentioned but `audit_log` is never listed as a managed table
Goal 4 says to exclude `audit_log` from public writes, but `audit_log` does not appear in any table inventory, so its existence, schema, and current grant state are assumptions.

### 5. The `401` fix is acknowledged but not scoped
Goal 5 correctly separates the `401` (session/auth) from the `42501` (table permissions), but the document never says:
- Who owns the `401` fix and where it is tracked.
- Whether this document's migration depends on it (e.g., will the frontend still see `401`s after the permission fix, and is that acceptable?).
- Whether `401` is in or out of scope for this effort.

### 6. Observability is explicitly deferred
Goal 7 and line 101 mark structured Supabase error propagation, the `dataSource: 'supabase' \| 'mock'` indicator, and `42501` spike alerts as a "mejora posterior" (later improvement). That is acceptable, but the document should state explicitly which observability items are **deferred out of this release** versus **required for rollout**, so stakeholders do not assume they ship with the migration.

### 7. Rollback mechanics are underspecified
The document promises an idempotent migration with a `DOWN` and pre-change snapshots of `pg_policies` and `role_table_grants`, but does not say:
- What the `DOWN` actually restores (previous grants? previous policies?).
- Where snapshots are stored and how they are applied during rollback.
- What triggers a rollback (failed migration? post-deployment error spike?).

### 8. Deployment environment is ambiguous
The app runs "en un VPS con Supabase Local," and the migration should be applied "staging luego producción." It is unclear whether this fix targets the local Supabase instance, a cloud Supabase project, or both, and whether `supabase migrations up` / `supabase db push` is the delivery mechanism.

### 9. Critical RLS behavior detail is missing: table owners bypass RLS
In PostgreSQL, table owners bypass RLS unless `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is used. The Supabase client may connect as a role that owns tables, or the migration may create tables owned by `postgres`. The document does not address `FORCE RLS` or ownership, which can make policies silently ineffective.

### 10. No testing or verification plan
There is no description of how to validate the fix: per-role `SELECT/INSERT/UPDATE/DELETE` tests (leader sees only own witnesses/voters; candidate supervisor sees only own scope; voter cannot write actas; `audit_log` rejects public writes), or how to confirm `42501` errors disappear and `401`s are handled separately.

### 11. Naming confusion across the document
Three different script names appear:
- `supabase/migracion_jerarquia_roles.sql` (Overview, the existing script being replaced).
- `supabase/fix_rls_permissions.sql` (Archivos modificados, the file being replaced).
- `supabase/migrations/001_rls_permissions.sql` (Archivos nuevos, the replacement).

A reader cannot tell whether the first two are the same file renamed, or two distinct files, or whether both should be deleted.

### 12. No explicit risks or threat model
The document claims the fix is "seguro" but defines neither the adversary (malicious authenticated frontend user? compromised client? database administrator?) nor the trust boundary around `auth.uid()` (Supabase JWTs are trusted, but this is never stated). There is no risk section covering, for example, a leader crafting a `leader_id` on INSERT to escalate scope, or `WITH CHECK` vs `USING` subtleties on UPDATE.

### 13. Missing supporting sections a reader would need
- **Glossary / terminology:** `RLS`, `USING`, `WITH CHECK`, `GRANT`, `auth.uid()` are used without a short definition; the doc assumes Supabase/Postgres fluency.
- **Relationship to `conceptos_brief.md`:** Section 9 references it for consistency, but it is unclear whether that brief is a source of truth, a predecessor to be superseded, or an external artifact the reader must locate.
- **Success criteria / rollout checklist:** No concrete "done" definition beyond the seven goals.

---

## Overall Coherence and Structure Assessment

**Strengths:**
- **Sharp focus and honest scoping.** The Non-Goals section is unusually disciplined (`service_role`, backend layer, rewrite, new modules, schema changes are all explicitly excluded). This is exactly the kind of minimalism the zoom-out lens rewards.
- **Correct problem decomposition.** Separating table-level grants from row-level policies, and separating `42501` from `401`, are architecturally sound distinctions.
- **Logical flow:** Overview → Goals → Non-Goals → Technical Plan → file-level change inventory → consistency checklist reads cleanly and is easy to navigate.
- **Change inventory is concrete.** New/modified/unchanged file tables (lines 75–94) give implementers a clear surface area.
- **Idempotency and rollback are considered up front** (`DOWN`, snapshots, environment staging).

**Weaknesses:**
- The proposal is **strong on intent, weak on mechanism.** It describes *what* the policies should do but not *how* (no SQL, no schema, no actors/auth sync story).
- Several sections read as **placeholders**: observability (line 101), `401` handling (Goal 5), rollback details, and the `actors.user_id = auth.uid()` mapping all lack the detail needed to execute or review.
- Internal inconsistencies (table inventory, script naming, `audit_log` absence) create ambiguity that could lead to implementation rework.

**Overall:** The document is coherent and well-intentioned but not yet implementation-ready from a zoom-out perspective. It needs concrete SQL/schema evidence, a clarified actors↔auth integration, resolved naming, and an explicit risks/deferred-work section before it can be handed to an implementer with confidence.

---

## Recommendations for Improvement

1. **Document the `actors` ↔ `auth.users` bridge.** Add a short subsection explaining how `actors.user_id` is established and synced with Supabase Auth (e.g., a trigger on `auth.users`, or application-level upsert on sign-in), the constraint guaranteeing uniqueness, and the behavior for authenticated users without an `actors` row.

2. **Add a schema appendix or link.** Include column listings for the eight tables plus `audit_log`, highlighting which columns drive each policy (`candidato_id`, `supervisor_id`, `leader_id`, `user_id`, `scope_level`, `scope_id`). Alternatively, link to the authoritative schema document.

3. **Show concrete policy SQL for at least one representative table per role.** Example: a `leader` INSERT `WITH CHECK` on `testigos_electorales`, and a `candidateSupervisor` SELECT `USING` on `actas_e14`. This lets reviewers verify the `USING`/`WITH CHECK` separation and the hierarchy logic.

4. **Resolve script naming.** Decide on one canonical name for the migration (recommend `supabase/migrations/001_rls_permissions.sql`), delete or deprecate `migracion_jerarquia_roles.sql` and `fix_rls_permissions.sql`, and state this explicitly.

5. **Clarify table scope.** Add `departamentos` and `municipios` to the inventory (or explicitly mark them as read-only reference data managed elsewhere), and add `audit_log` to the table inventory with its current grant/RLS state.

6. **Scope the `401` fix.** State whether it is in or out of scope for this effort, who owns it, and what the expected error landscape looks like after this migration ships (i.e., will users still see `401`s?).

7. **Make deferred work explicit.** Mark the observability items (structured error propagation, `dataSource` indicator, `42501` alerts) as **deferred post-MVP** with a tracking reference, so they are not mistaken for release criteria.

8. **Specify rollback mechanics.** Describe what `DOWN` restores, where `pg_policies`/`role_table_grants` snapshots are stored, and the rollback trigger criteria (e.g., migration failure, post-deployment `42501` spike).

9. **Address table ownership and `FORCE RLS`.** Note whether `ALTER TABLE ... FORCE ROW LEVEL SECURITY` is required given Supabase Local table ownership, so policies are not silently bypassed.

10. **Add a verification/test plan.** Per-role CRUD assertions (leader ↔ own witnesses/voters only; candidate supervisor ↔ own scope; voter cannot write actas/alertas; `audit_log` rejects public writes; `GRANT ALL` removed) with expected error codes.

11. **Add a Risks & Mitigations section.** Cover malicious authenticated frontend users, `auth.uid()` trust (JWT validation by Supabase), INSERT scope escalation via `leader_id`, and `WITH CHECK` vs `USING` edge cases on UPDATE.

12. **Add a minimal glossary.** One-line definitions of `RLS`, `USING`, `WITH CHECK`, `GRANT`, and `auth.uid()` for readers without deep Supabase/Postgres fluency.

---

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-zoom-out` | completed |

---

*Artifact written to: `zoom_out_report.md`*
