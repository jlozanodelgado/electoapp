# EGM Critic Review Report — design_draft.md

**Target:** `C:\Users\carme\Proyectos Antigravity\electoapp\design_draft.md` (lines 1–101)
**Reviewer Lenses:** egm-design, egm-structural, egm-style
**Standards applied:** feature-spec-standard

---

## Reviewer Status

| Reviewer | Lens | Status |
| --- | --- | --- |
| egm-design | Hostile Design Critic (architecture, scalability, infrastructure economics, unmitigated risks) | completed |
| egm-structural | Structural Layout Validator (symmetry, heading hierarchy, formatting, template compliance) | completed |
| egm-style | Technical Copy Editor (clarity, precision, brevity, objective framing, stripping fluff) | completed |

---

## What Works Well

- **Goal separation (Goal 5)** correctly isolates the 401 (Auth/session) error from the 42501 (table permission) error. This matches concepts_brief.md Lens 1 and Lens 6 and prevents conflating two distinct failure layers.
- **Least-privilege intent** (Goal 2, Goal 6): replacing `GRANT ALL` with per-operation `SELECT/INSERT/UPDATE/DELETE` grants, excluding `audit_log` from public writes, and idempotent migration with `DOWN` rollback all align with concepts_brief.md Lens 3 and Lens 4.
- **Observability intent** (Goal 7): structured error codes, `dataSource` flag, and 42501 spike alerting address the gaps flagged in concepts_brief.md Lens 5.
- **Non-Goals** are explicit: no `service_role` in browser, no Edge Function backend, no new modules, no App Router rewrite, no schema changes beyond permissions. This keeps scope bounded.
- **Architecture diagram** (lines 46–73) clearly shows frontend → SupabaseService → Supabase vs mock → PostgreSQL + PostGIS + RLS, matching the stated stack.
- **File change table** (lines 75–94) explicitly lists new/modified/unchanged files and the rationale for each.

---

## What Is Wrong, Missing, or Risky

### egm-design — Architecture & Risk

**R1. "Least privilege" is aspirational but unspecified per table.** Goals 1–2 say every table/operation must have the minimum permission, but the document never maps roles → tables → operations. `actors` is named as the reference for `user_id`, yet concepts_brief.md Lens 1 (Schema mismatch) and Lens 6 note `actors` has **no `user_id` column** in `schema.sql`; `migracion_jerarquia_roles.sql` adds `supervisor_id` but policies reference `actors.user_id`. The design draft assumes a column/table alignment that does not exist, so role-scoped policies would fail at runtime. **Risk: the migration applies cleanly but every RLS SELECT returns zero rows or errors.**

**R2. Down migration (`DOWN`) is not defined.** Goal 6 requires `DOWN` for reversal, but no rollback SQL, no snapshot of `pg_policies` / `role_table_grants` / `relrowsecurity` / `relforcerowsecurity` before apply, and no statement that rollback restores pre-existing grants safely. concepts_brief.md Lens 4 warns that blind `REVOKE ALL` on rollback would wipe legitimate pre-existing grants. **Risk: rollback is destructive and untested.**

**R3. Realtime fan-out is unaddressed.** concepts_brief.md Lens 2 notes Realtime is enabled on `actas_e14`, `alertas_fraude`, `testigos_electorales`, `votantes_crm`; blanket policies caused fan-out problems. The draft enables per-table RLS but says nothing about Realtime publication/subscription filtering or change-tracking overhead. **Risk: at scale (Día D), every subscriber receives every change regardless of territorial/candidate scope.**

**R4. No server-side escape hatch for privileged operations.** Non-Goals rejects Edge Functions/APIs for now, but `actas_e14` vote tallies and `estado_revision` need a gate that frontend cannot freely overwrite. concepts_brief.md Lens 3 recommends a secure function/Edge Function gate. The draft leaves these tables writable by `authenticated` via RLS `WITH CHECK` only, which is client-enforceable only as far as RLS holds. **Risk: integrity of election-minute records rests entirely on RLS, with no compensating application-layer authorization.**

**R5. 401 fix is deferred but not specified.** Goal 5 says correct 401 separately; Non-Goals defers it. The draft gives no owner, no timeline, no criteria for "fixed," and no link between the DB migration and the Auth session/anon-key fix. **Risk: after the migration, 401s persist and the feature still appears broken to users.**

**R6. `supabaseService.ts` change is cosmetic.** Line 87 says "No se requiere cambio funcional" and only adds a comment. Yet concepts_brief.md Lens 5 documents swallowed errors (`console.warn` → silent mock fallback), no structured error propagation, and no real-vs-mock UI flag. The draft's Goal 7 asks for these but assigns no file change to implement them. **Risk: observability is requested in Goals but unimplemented in the file-change plan.**

### egm-structural — Structure & Template Compliance

**S1. Missing required structural elements.** The document has no table of contents, no document metadata block (author, version, status, date, reviewers), and no "Review Status / Sign-off" table. concepts_brief.md itself includes a Reviewer Status table; design_draft.md does not mirror that artifact discipline.

**S2. Inconsistent heading depth.** `#` title, `##` Overview/Goals/Non-Goals/Technical Plan, `###` Arquitectura/Diagrama/Archivos/Verificación. The "Verificación de consistencia con el conceptos_brief.md" section (lines 95–101) reads like an appendix but is not nested under a clearly numbered section; it breaks the symmetry of the Technical Plan subsection tree.

**S3. The architecture diagram is ASCII art, not machine-checkable.** It conveys intent but is not a template-compliant diagram reference (no link to a `.drawio`, `.mmd`, or image file). For a formal spec this is acceptable only if the project standard permits inline ASCII; no standard is cited.

**S4. No traceability matrix.** There is no mapping from each Goal → file change → policy → acceptance criterion. The "Archivos nuevos/modificados/sin cambios" tables exist but do not reference which Goal each change satisfies.

**S5. Line 99–101 contains implementation-status language ("pendiente de implementar en supabaseService.ts como mejora posterior") inside a consistency-check section.** This mixes "what the design says" with "what remains to be built," blurring the spec from the backlog.

### egm-style — Clarity, Precision, Brevity

**W1. Fluff and hedging.** Examples:
- Line 5: "estilo VotoMAP" — undefined reference; adds no spec value.
- Line 7: "anula el modelo de roles jerárquico ya diseñado" — editorial; the spec should state the behavior, not critique the prior script.
- Line 87: "ya usa SupabaseService como fuente de verdad" — vague marketing phrasing ("fuente de verdad").

**W2. Unqualified acronyms and domain terms.** `RLS`, `GRANT`, `USING`, `WITH CHECK`, `DOWN`, `E-14`, `testigo`, `actor`, `cedula` (implied in concepts_brief), `Día D` are used without a glossary. A new onboarding engineer cannot safely reason about the fix (concepts_brief.md Lens 6 terminology gap).

**W3. Passive / future-tense constructions.** Line 7: "El objetivo de este documento es definir..." Line 101: "(pendiente de implementar ... como mejora posterior)." Specs should state requirements declaratively ("The migration shall...") rather than describing the document's intent.

**W4. Redundancy between sections.** Overview (lines 5–9) restates the problem, tables, errors, and goals that are repeated almost verbatim in Goals (lines 13–18). This duplication increases drift risk.

**W5. Language mixing.** Table/column names are Spanish (`partidos`, `actas_e14`, `votantes_crm`, `testigos_electorales`) while role names are English (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`) and SQL keywords are English. The draft does not acknowledge or standardize this convention.

---

## Contradictions with concepts_brief.md

| # | design_draft.md claim | concepts_brief.md position | Discrepancy |
|---|---|---|---|
| C1 | Line 87: `supabaseService.ts` needs only a comment; no functional change. | Lens 5: errors are silently swallowed, mock fallback hides 42501/401; no structured propagation or dataSource flag. | Draft under-specifies the observability work that Goal 7 demands. |
| C2 | Line 42: "el modelo de jerarquía de actores (`actors`) se usa como punto de referencia para el `user_id` de Supabase Auth." | Lens 1 / Lens 6: `actors` has no `user_id` column in `schema.sql`; granular role-based RLS referencing `actors.user_id` fails at runtime. | Draft assumes a schema alignment that concepts_brief.md says is absent. |
| C3 | Lines 79–80: migration is idempotent with `DOWN` and reverses completely. | Lens 4: rollback must snapshot `pg_policies`, `role_table_grants`, `relrowsecurity`, `relforcerowsecurity` before applying; blind revoke is destructive. | Draft asserts reversibility without defining the snapshot/restore mechanism. |
| C4 | Line 17: 401 corrected "por separado, separado de la corrección de permisos." | Lens 6: 401 persists after DB fix because it originates in Supabase Auth/client session. | Consistent in principle, but draft gives no owner/timeline/criteria for the separate 401 fix. |
| C5 | Line 79: `ALTER DEFAULT PRIVILEGES` for future tables. | Lens 4: without `ALTER DEFAULT PRIVILEGES`, new tables recreate the 42501 incident. | Consistent; but draft does not state which roles/schemas the default privileges apply to. |
| C6 | Line 85: old `fix_rls_permissions.sql` "contenía políticas ambiguas y `GRANT ALL`." | Lens 2: `fix_rls_permissions.sql` also omits `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, so RLS policies have no effect unless enabled per table. | Draft omits the missing `ENABLE ROW LEVEL SECURITY` step from its own file-change plan. |

---

## Missing or Unclear Sections

1. **Role → Table → Operation matrix.** No specification of which role (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`) may SELECT/INSERT/UPDATE/DELETE which table, and under what territorial/candidate scope.
2. **Exact RLS policy SQL.** No `USING`/`WITH CHECK` conditions are written out; only placeholders ("condición de visibilidad por rol").
3. **`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY` per table.** Missing from the file-change plan despite being a prerequisite for policies to take effect.
4. **Sequence grants.** concepts_brief.md Lens 2 notes identity/serial `nextval` inserts fail without sequence grants; the draft mentions sequences in passing (line 35) but does not grant them.
5. **Migration idempotency guards.** No `DO $$ ... IF NOT EXISTS` or `CREATE POLICY ... IF NOT EXISTS` pattern shown; "idempotente" is claimed but not demonstrated.
6. **Pre-change snapshot procedure.** No step to snapshot `pg_policies`, `role_table_grants`, `relrowsecurity`, `relforcerowsecurity` before applying, as required for safe rollback.
7. **Environment promotion path.** Goal 6 says "aplicado por entorno (staging luego producción)" but no gate, validation step, or rollback trigger is defined between environments.
8. **Glossary / terminology.** No definitions for `authenticated`, `anon`, `service_role`, `RLS`, `GRANT`, `42501`, `401`, `auth.uid()`, `actas_e14`, `testigos_electorales`, `votantes_crm`, `Día D`, `VotoMAP`.
9. **Realtime publication/subscription configuration.** Missing entirely despite Realtime being enabled on sensitive tables.

---

## Recommendations for Fixes

### For egm-design (architecture & risk)
1. Publish a concrete **role × table × operation matrix** before writing SQL; derive each `USING`/`WITH CHECK` condition from it.
2. Verify `actors` schema: add `user_id` (or align policies to the existing column) in `schema.sql` / `migracion_jerarquia_roles.sql` before the RLS migration runs.
3. Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (and consider `FORCE ROW LEVEL SECURITY`) per table in the migration; do not assume RLS is already on.
4. Grant `USAGE, SELECT ON ALL SEQUENCES` to `authenticated` so identity/serial inserts succeed.
5. Define the `DOWN` migration explicitly: re-create pre-existing policies/grants from a pre-change snapshot rather than blanket `REVOKE ALL`.
6. Scope Realtime publications/subscriptions per table so changes are filtered by territorial/candidate/role; or gate `actas_e14`/`estado_revision` writes behind a secure function.
7. Assign an owner and acceptance criteria to the separate 401/Auth fix; do not leave it as an open-ended "por separado."
8. Implement the observability items in `supabaseService.ts` (structured error codes, `dataSource` flag, mock-vs-live indicator, 42501 alerting) — this is a file change, not just a comment.

### For egm-structural (structure & template)
1. Add a document metadata header (version, author, status, date, reviewers) and a Reviewer Status table mirroring concepts_brief.md.
2. Number all sections consistently; nest the "Verificación de consistencia" block under a clearly numbered appendix rather than leaving it as a loose subsection.
3. Replace the inline ASCII diagram with a reference to a version-controlled diagram file (`.mmd`/`.drawio`), or state the project standard permits ASCII.
4. Add a traceability matrix: Goal → file change → policy → acceptance criterion.
5. Move implementation-status language ("pendiente de implementar") out of the consistency section into a backlog/open-items list.

### For egm-style (clarity & brevity)
1. Remove fluff: "estilo VotoMAP", "fuente de verdad", editorial critique of the prior script; state requirements declaratively.
2. Add a glossary defining `authenticated`, `anon`, `service_role`, `RLS`, `GRANT`, `42501`, `401`, `auth.uid()`, `actas_e14`, `testigos_electorales`, `votantes_crm`, `Día D`, `VotoMAP`.
3. Standardize language: decide whether role names and table names are Spanish or English and apply it consistently.
4. Deduplicate Overview vs. Goals; keep the problem statement in Overview and only the measurable objectives in Goals.
5. Replace passive/future-tense phrasing ("El objetivo ... es definir", "pendiente de implementar") with imperative requirements ("The migration shall ...", "Open item: ...").
