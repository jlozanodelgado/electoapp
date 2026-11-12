# Zoom-Out Review Report — design_draft.md

**Target:** `design_draft.md` (lines 1-101, read in full)
**Reviewer lens:** egm-zoom-out (Skeptical Architect — high-altitude simplicity, minimalism, YAGNI, codebase reuse)
**Scope:** RLS permission fix for Supabase-backed ElectoApp

---

## High-Altitude Summary

`design_draft.md` proposes a minimal, secure, versionable fix for the ElectoApp Supabase permission problem: authenticated users currently get `42501 permission denied` / `401 Unauthorized` because an existing script over-permissiones (`GRANT ALL ... TO authenticated` + `auth.uid() IS NOT NULL` row policy). The draft replaces that with:

1. A **table-privilege layer**: specific `GRANT SELECT/INSERT/UPDATE/DELETE` (no `GRANT ALL`) plus `USAGE` on schema/sequences for role `authenticated`.
2. A **row-level security layer**: RLS enabled per table with separate `USING` (read) / `WITH CHECK` (write) policies keyed off `actors.user_id = auth.uid()`, preserving the existing role hierarchy (`totalSupervisor`, `candidateSupervisor`, `leader`, `witness`, `voter`).

Deliverables: one new idempotent migration (`supabase/migrations/001_rls_permissions.sql` with `DOWN`), replacement of `supabase/fix_rls_permissions.sql`, minor store adjustments in `src/store/electoralStore.ts`, and a comment-only note in `src/services/supabaseService.ts`. The document explicitly lists non-goals (no `service_role` in the browser, no Edge Function/backend layer, no Next.js rewrite, no new modules, no schema changes beyond permissions).

---

## What Is Simple and Well-Focused

- **Single, bounded problem.** The document tackles one thing: restoring read/write access for authenticated users without compromising security. It does not attempt to refactor the app.
- **Explicit non-goals (YAGNI-friendly).** Saying "no `service_role` in the bundle, no Edge Function, no Next.js migration, no new modules (finanzas, WhatsApp, OCR, IA)" keeps scope honest and prevents scope creep.
- **Least-privilege by default.** Rejecting `GRANT ALL` and the catch-all `auth.uid() IS NOT NULL` policy in favor of per-table, per-operation grants and policies is the right security posture.
- **Idempotent migration with `DOWN`.** Versionable, reversible changes applied per environment (staging then production) with snapshots of `pg_policies` and `role_table_grants` for rollback.
- **Reuse of the existing `actors` hierarchy.** Policies keyed on `actors.user_id = auth.uid()` reuse the already-designed role/territory model instead of inventing a new authorization model.
- **No schema changes.** The data model stays untouched; only grants and policies change.

---

## What Is Overly Complex or Unnecessary

1. **ASCII data-flow diagram (lines 46-73).** A box-and-arrow diagram of Frontend → SupabaseService → Supabase / supabaseMock → PostgreSQL adds no decision-relevant information for an RLS permissions fix. The architecture is already obvious from the text; the diagram is decorative and can be removed without loss.
2. **Goal 7 — observability (lines 19).** Structured Supabase error propagation, a `dataSource: 'supabase' | 'mock'` indicator, and alerting on 42501 spikes are real concerns but out of scope for a permissions fix. The document itself flags this as "pendiente de implementar ... como mejora posterior." Including it in a "minimal" design dilutes focus and commits the team to future work that is not defined.
3. **`supabaseService.ts` modified for a comment only (line 87).** "No se requiere cambio funcional ... Se agrega comentario documentando ..." Modifying a tracked file solely to add a comment is low-value churn; the note can live in the migration file or this design doc instead.
4. **"Verificación de consistencia con conceptos_brief.md" (lines 95-101).** Cross-referencing another document ties this draft to `conceptos_brief.md` and duplicates content already covered by Goals/Non-Goals. A standalone design doc should not require a sibling document to be understood.
5. **Goal 5 is descriptive but empty.** Separating the 401 (session/auth) fix from the 42501 (table permission) fix is sound, but the document never says what the 401 fix is or who owns it. It creates an open loop without adding clarity.

---

## What Could Be Removed or Simplified

| Item | Recommendation |
| --- | --- |
| ASCII diagram (lines 46-73) | Remove. Replace with one sentence if needed ("Requests flow from the React/Zustand frontend through SupabaseService to Supabase/PostgreSQL; a local mock falls back to localStorage.") |
| Goal 7 observability (line 19) | Remove from Goals; move to a "Future work / out of scope" note, or drop entirely. |
| `supabaseService.ts` change (line 87) | Drop the file from "Archivos modificados"; put the RLS prerequisite note in the migration header or this doc. |
| Consistency verification section (lines 95-101) | Fold the four confirmed decisions into Goals/Non-Goals and delete the section, or retitle as "Decisions summary" without cross-referencing `conceptos_brief.md`. |
| Goal 5 | Either describe the separate 401 fix briefly or state it is tracked elsewhere and out of scope for this document. |

After these cuts, the document would shrink meaningfully (likely by ~20-25%) with no loss of implementable content.

---

## Whether It Reuses Existing Patterns

**Yes — and this is the draft's strongest point.**

- **Authorization model:** Reuses the existing `actors` table and its role/territory fields (`candidato_id`, `supervisor_id`, `leader_id`) rather than defining a new access model.
- **Store layer:** Reuses existing Zustand store actions (`addActor`, `addTestigo`, `addVotante`, `addActaE14`, `resolverAlerta`); only additional fields (`leader_id`, `scope_level`, `scope_id`) are passed through — no business-logic changes.
- **Types:** Relies on existing types in `src/types/electoral.ts` (`leaderId`, `scopeLevel`, `scopeId`, `lat`, `lng`) — no new type definitions required.
- **Service layer:** Reuses the existing `SupabaseService` + `supabaseMock` localStorage fallback pattern; no new abstraction introduced.
- **Stack:** Keeps the current Vite + React + Zustand + Supabase JS stack (explicit non-goal: no Next.js App Router migration).
- **Migration pattern:** Idempotent SQL with `DOWN` rollback matches standard database migration practice.

---

## Overall Assessment

The draft is already fairly focused and avoids the common anti-patterns of over-engineering (no backend layer, no `service_role` escape hatch, no new modules). Its core technical plan — least-privilege grants plus per-operation RLS policies on the existing `actors` hierarchy — is sound and minimal.

The main zoom-out objections are **scope discipline** (observability goal, cross-document consistency section) and **low-signal artifacts** (decorative ASCII diagram, comment-only file change). Removing those would make the document tighter, more implementable, and more clearly YAGNI-compliant without weakening the security design.

---

*Report written by egm-zoom-out reviewer. Source reviewed: `design_draft.md` lines 1-101 (full file).*