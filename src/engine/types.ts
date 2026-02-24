/**
 * Core TypeScript types for the SAT Solver engine.
 *
 * These interfaces define the "contract" between the solver engine
 * (pure TS logic) and the React UI. The solver yields SolverState
 * objects at every micro-step, which the UI renders.
 */

/** A propositional variable, represented by name (e.g. "x1", "x2"). */
export type Variable = string;

/** A literal is either a variable or its negation. */
export interface Literal {
  var: Variable;
  isNegated: boolean;
}

/** A clause is a disjunction of literals (x1 ∨ ¬x2 ∨ x3). */
export interface Clause {
  /** Unique identifier for this clause. */
  id: string;
  literals: Literal[];
  /**
   * Whether this clause is currently satisfied by the assignment.
   * null means undetermined (no literal assigned true yet, but not yet falsified).
   */
  isSatisfied: boolean | null;
  /** True if this clause was derived via conflict analysis (CDCL learned clause). */
  isLearned: boolean;
}

/** Records the assignment of a variable, including why it was assigned. */
export interface VariableAssignment {
  variable: Variable;
  value: boolean;
  /** Decision level at which this assignment was made. */
  decisionLevel: number;
  /**
   * The clause that forced this assignment via unit propagation.
   * null for decision assignments (freely chosen).
   */
  reason: Clause | null;
}

/** Status labels for each solver micro-step. */
export type SolverStatus =
  | "Ready"
  | "Deciding"
  | "Propagating"
  | "Conflict!"
  | "Analyzing"
  | "Backtracking"
  | "SAT"
  | "UNSAT";

/**
 * The complete solver state yielded at every micro-step.
 * The React UI renders this snapshot to drive the visualization.
 */
export interface SolverState {
  stepNumber: number;
  status: SolverStatus;
  clauses: Clause[];
  assignments: Record<Variable, VariableAssignment>;
  currentDecisionLevel: number;
  /** Human-readable explanation of what happened in this step. */
  explanation: string;
}
