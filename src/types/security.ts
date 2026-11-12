// Security / Role definitions for ElectoApp
// -------------------------------------------------
// This file defines the hierarchical roles required by the user request.
// It is deliberately kept simple and uses plain TypeScript interfaces
// so that the rest of the app can import the types without pulling in
// any heavy authentication libraries.

/**
 * Granular scope that a role can operate on.
 * - "national": the whole country.
 * - "department": a specific Colombian department (e.g. "valle").
 * - "municipality": a specific municipality (e.g. "tulua").
 */
export type ScopeLevel = "national" | "department" | "municipality";

/**
 * Base interface shared by all security actors.
 * `id` is an opaque UUID used internally.
 * `candidatoId` links the actor to a candidate (if applicable).
 */
export interface BaseActor {
  id: string;
  nombre: string;
  role: "totalSupervisor" | "candidateSupervisor" | "leader" | "witness" | "voter";
  rol?: string;
  nivel?: number;
  // The candidate this actor is linked to (if any). For the "total supervisor"
  // this can be undefined because they oversee the whole system.
  candidatoId?: string;
  candidato_id?: string;
  // Optional generic fields used by some actors – they are not required for every role.
  scopeLevel?: ScopeLevel;   // e.g., "national", "department", "municipality"
  scope_level?: ScopeLevel;
  scopeId?: string;          // identifier for department/municipality when needed
  scope_id?: string;
  leaderId?: string;         // reference to a leader when the actor is a witness or voter
  leader_id?: string;
  // Link to Supabase Auth user (optional, added for real DB integration)
  user_id?: string;
  // Supervisor of a leader (candidate supervisor)
  supervisorId?: string;
  supervisor_id?: string;
}


/**
 * The highest‑level role. Has visibility over every candidate and every
 * territorial level.
 */
export interface TotalSupervisor extends BaseActor {
  role: "totalSupervisor";
}

/**
 * Supervisor limited to a single candidate. Their view is automatically
 * limited according to the candidate's own reach.
 */
export interface CandidateSupervisor extends BaseActor {
  role: "candidateSupervisor";
  /**
   * The territorial scope the candidate belongs to.
   * If the candidate is national → "national" (full country).
   * If the candidate is departmental → the department code.
   * If the candidate is municipal → the municipality code.
   */
  scopeLevel: ScopeLevel;
  /**
   * Identifier used when scopeLevel is "department" or "municipality".
   * For "national" this may be omitted.
   */
  scopeId?: string;
}

/**
 * Leader for a candidate. They can manage witnesses and voters within the
 * candidate's scope.
 */
export interface Leader extends BaseActor {
  role: "leader";
  candidatoId: string; // forced
  scopeLevel: ScopeLevel;
  scopeId?: string;
}

/**
 * Witness – a field operative that records observations. They belong to a
 * leader (implicitly via candidateId) and operate in the same scope.
 */
export interface Witness extends BaseActor {
  role: "witness";
  candidatoId: string;
  leaderId: string; // who supervises this witness
}

/**
 * Voter – a registered voter record used by the app. In the security model
 * they are attached to a candidate and optionally to a leader.
 */
export interface Voter extends BaseActor {
  role: "voter";
  candidatoId: string;
  leaderId?: string;
}

/** Union type for all possible actors */
export type Actor =
  | TotalSupervisor
  | CandidateSupervisor
  | Leader
  | Witness
  | Voter;

/** Helper to compute the geographic filter for a given actor */
export const getActorTerritory = (actor: Actor) => {
  switch (actor.role) {
    case "totalSupervisor":
      return { level: "national" as const };
    case "candidateSupervisor":
    case "leader":
      return {
        level: actor.scopeLevel,
        id: actor.scopeId,
      } as const;
    case "witness":
    case "voter":
      // In practice witnesses/voters inherit the scope of their leader,
      // which is stored elsewhere. Here we just return undefined.
      return undefined;
  }
};

