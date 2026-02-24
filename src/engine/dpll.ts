/**
 * DPLL SAT Solver implemented as a JavaScript Generator Function.
 *
 * Architecture:
 *   - This file is pure TypeScript with zero React dependencies.
 *   - The solver yields a SolverState snapshot at every micro-step so that
 *     the React UI can display each individual decision and propagation.
 *
 * Algorithm: Classic DPLL (Davis–Putnam–Logemann–Loveland)
 *   1. Unit Propagation: if a clause has exactly one unassigned literal
 *      (all others false), that literal must be true.
 *   2. Pure Literal Elimination: if a variable appears only positively
 *      (or only negated) across all unresolved clauses, assign it to satisfy.
 *   3. Decision: pick an unassigned variable and try one value.
 *   4. Backtrack: if a conflict arises, undo the last decision and flip it.
 *
 * Usage:
 *   const gen = runDPLL(clauses);
 *   let result = gen.next();        // { value: SolverState, done: false }
 *   while (!result.done) {
 *     render(result.value);         // display this step
 *     result = gen.next();
 *   }
 */

import type { Clause, Literal, Variable, VariableAssignment, SolverState } from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Deep-clone clauses so that yielded snapshots are immutable. */
function cloneClauses(clauses: Clause[]): Clause[] {
  return clauses.map(c => ({
    ...c,
    literals: c.literals.map(l => ({ ...l })),
  }));
}

/** Deep-clone assignments record. */
function cloneAssignments(
  assignments: Record<Variable, VariableAssignment>
): Record<Variable, VariableAssignment> {
  const out: Record<Variable, VariableAssignment> = {};
  for (const [k, v] of Object.entries(assignments)) {
    out[k] = {
      ...v,
      // reason clause is a reference; keep as-is (it's already snapshotted)
    };
  }
  return out;
}

/**
 * Evaluate a literal under the current assignments.
 * Returns true/false if assigned, or null if the variable is unassigned.
 */
function evalLiteral(
  lit: Literal,
  assignments: Record<Variable, VariableAssignment>
): boolean | null {
  const assignment = assignments[lit.var];
  if (assignment === undefined) return null;
  return lit.isNegated ? !assignment.value : assignment.value;
}

/**
 * Recompute the isSatisfied status for every clause under current assignments.
 * Returns a new clause array with updated isSatisfied fields.
 *
 * isSatisfied:
 *   true  – at least one literal is true
 *   false – all literals are false (conflict!)
 *   null  – undetermined (some literals still unassigned, none true yet)
 */
function recomputeClauses(
  clauses: Clause[],
  assignments: Record<Variable, VariableAssignment>
): Clause[] {
  return clauses.map(clause => {
    let hasTrue = false;
    let hasUnassigned = false;
    for (const lit of clause.literals) {
      const val = evalLiteral(lit, assignments);
      if (val === true) { hasTrue = true; break; }
      if (val === null) hasUnassigned = true;
    }
    return {
      ...clause,
      literals: clause.literals.map(l => ({ ...l })),
      isSatisfied: hasTrue ? true : hasUnassigned ? null : false,
    };
  });
}

/**
 * Collect all variable names from a list of clauses.
 */
function collectVariables(clauses: Clause[]): Variable[] {
  const vars = new Set<Variable>();
  for (const clause of clauses) {
    for (const lit of clause.literals) vars.add(lit.var);
  }
  return [...vars].sort();
}

/**
 * Find a unit clause: a clause that is unresolved (not yet satisfied) and
 * has exactly one unassigned literal (all others are false).
 * Returns [clause, unitLiteral] or null if none found.
 */
function findUnitClause(
  clauses: Clause[],
  assignments: Record<Variable, VariableAssignment>
): [Clause, Literal] | null {
  for (const clause of clauses) {
    if (clause.isSatisfied === true) continue; // already done

    let unassigned: Literal | null = null;

    for (const lit of clause.literals) {
      const val = evalLiteral(lit, assignments);
      if (val === true) { unassigned = null; break; } // satisfied
      if (val === null) {
        if (unassigned !== null) { unassigned = null; break; } // >1 free literal
        unassigned = lit;
      }
    }

    if (unassigned !== null) return [clause, unassigned];
  }
  return null;
}

/**
 * Find a pure literal: a variable that appears in all remaining unresolved
 * clauses with only one polarity (always positive or always negated).
 * Returns a literal for the pure assignment or null if none exists.
 */
function findPureLiteral(
  clauses: Clause[],
  assignments: Record<Variable, VariableAssignment>
): Literal | null {
  // Count polarities across unsatisfied clauses
  const posCount: Record<Variable, number> = {};
  const negCount: Record<Variable, number> = {};

  for (const clause of clauses) {
    if (clause.isSatisfied === true) continue;
    for (const lit of clause.literals) {
      if (assignments[lit.var] !== undefined) continue; // already assigned
      if (lit.isNegated) negCount[lit.var] = (negCount[lit.var] ?? 0) + 1;
      else posCount[lit.var] = (posCount[lit.var] ?? 0) + 1;
    }
  }

  // Look for a variable that appears with only one polarity
  const allVars = new Set([...Object.keys(posCount), ...Object.keys(negCount)]);
  for (const v of allVars) {
    const hasPos = (posCount[v] ?? 0) > 0;
    const hasNeg = (negCount[v] ?? 0) > 0;
    if (hasPos && !hasNeg) return { var: v, isNegated: false };
    if (!hasPos && hasNeg) return { var: v, isNegated: true };
  }
  return null;
}

/**
 * Pick an unassigned variable for the next decision.
 * Uses simple first-unassigned heuristic (FIFO order from collectVariables).
 */
function pickDecisionVariable(
  allVars: Variable[],
  assignments: Record<Variable, VariableAssignment>
): Variable | null {
  for (const v of allVars) {
    if (assignments[v] === undefined) return v;
  }
  return null;
}

// ---------------------------------------------------------------------------
// The DPLL Generator
// ---------------------------------------------------------------------------

/**
 * Run the DPLL SAT solver as a generator, yielding a SolverState snapshot at
 * every logical micro-step.
 *
 * @param inputClauses - The CNF formula to solve (array of Clause objects).
 *
 * The generator terminates (done === true) after yielding the final SAT or
 * UNSAT state.
 */
export function* runDPLL(inputClauses: Clause[]): Generator<SolverState> {
  let stepNumber = 0;

  // Collect all variables from the formula
  const allVars = collectVariables(inputClauses);

  // Working copies of clauses and assignments
  let clauses = recomputeClauses(cloneClauses(inputClauses), {});
  let assignments: Record<Variable, VariableAssignment> = {};

  // Decision stack: each entry records the state just before the decision
  // so we can backtrack.  Format: { variable, triedTrue, snapshot }.
  type DecisionFrame = {
    variable: Variable;
    triedTrue: boolean;  // which value we tried first
    bothTried: boolean;  // have we tried both values?
    // Snapshot of the state before this decision (for backtracking)
    assignmentsSnapshot: Record<Variable, VariableAssignment>;
  };
  const decisionStack: DecisionFrame[] = [];

  // Yield the initial "Ready" state
  yield {
    stepNumber: stepNumber++,
    status: "Ready",
    clauses: recomputeClauses(cloneClauses(inputClauses), {}),
    assignments: {},
    currentDecisionLevel: 0,
    explanation: `Starting DPLL on a formula with ${allVars.length} variable(s) and ${inputClauses.length} clause(s).`,
  };

  // Main DPLL loop
  while (true) {
    // -----------------------------------------------------------------------
    // 1. Unit Propagation loop: keep propagating until no unit clause remains
    // -----------------------------------------------------------------------
    let unitResult = findUnitClause(clauses, assignments);
    while (unitResult !== null) {
      const [unitClause, unitLit] = unitResult;
      const value = !unitLit.isNegated; // assign the literal to true

      assignments = {
        ...assignments,
        [unitLit.var]: {
          variable: unitLit.var,
          value,
          decisionLevel: decisionStack.length,
          reason: { ...unitClause, literals: unitClause.literals.map(l => ({ ...l })) },
        },
      };
      clauses = recomputeClauses(clauses, assignments);

      const litStr = unitLit.isNegated ? `¬${unitLit.var}` : unitLit.var;
      yield {
        stepNumber: stepNumber++,
        status: "Propagating",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: `Unit propagation: clause "${clauseToString(unitClause)}" forces ${litStr} to be true (${unitLit.var} = ${value}).`,
      };

      // Check for conflict after propagation
      const conflictClause = clauses.find(c => c.isSatisfied === false);
      if (conflictClause) {
        yield {
          stepNumber: stepNumber++,
          status: "Conflict!",
          clauses: cloneClauses(clauses),
          assignments: cloneAssignments(assignments),
          currentDecisionLevel: decisionStack.length,
          explanation: `Conflict! Clause "${clauseToString(conflictClause)}" is falsified.`,
        };

        // Backtrack
        const backtracked = backtrack(decisionStack, assignments, clauses, inputClauses);
        if (backtracked === null) {
          // No more choices to try — UNSAT
          yield {
            stepNumber: stepNumber++,
            status: "UNSAT",
            clauses: cloneClauses(clauses),
            assignments: cloneAssignments(assignments),
            currentDecisionLevel: 0,
            explanation: "All branches exhausted. The formula is UNSATISFIABLE.",
          };
          return;
        }

        ({ assignments, clauses } = backtracked);
        const topFrame = decisionStack[decisionStack.length - 1];
        yield {
          stepNumber: stepNumber++,
          status: "Backtracking",
          clauses: cloneClauses(clauses),
          assignments: cloneAssignments(assignments),
          currentDecisionLevel: decisionStack.length,
          explanation: `Backtracking to level ${decisionStack.length}: trying ${topFrame.variable} = ${assignments[topFrame.variable].value}.`,
        };

        break; // restart unit propagation from the top
      }

      unitResult = findUnitClause(clauses, assignments);
    }

    // Check for conflict again (may have surfaced without unit propagation)
    const conflictClause = clauses.find(c => c.isSatisfied === false);
    if (conflictClause) {
      yield {
        stepNumber: stepNumber++,
        status: "Conflict!",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: `Conflict! Clause "${clauseToString(conflictClause)}" is falsified.`,
      };

      const backtracked = backtrack(decisionStack, assignments, clauses, inputClauses);
      if (backtracked === null) {
        yield {
          stepNumber: stepNumber++,
          status: "UNSAT",
          clauses: cloneClauses(clauses),
          assignments: cloneAssignments(assignments),
          currentDecisionLevel: 0,
          explanation: "All branches exhausted. The formula is UNSATISFIABLE.",
        };
        return;
      }

      ({ assignments, clauses } = backtracked);
      const topFrame = decisionStack[decisionStack.length - 1];
      yield {
        stepNumber: stepNumber++,
        status: "Backtracking",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: `Backtracking to level ${decisionStack.length}: trying ${topFrame.variable} = ${assignments[topFrame.variable].value}.`,
      };
      continue;
    }

    // -----------------------------------------------------------------------
    // 2. Check SAT: all clauses satisfied?
    // -----------------------------------------------------------------------
    if (clauses.every(c => c.isSatisfied === true)) {
      yield {
        stepNumber: stepNumber++,
        status: "SAT",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: "All clauses satisfied! The formula is SATISFIABLE.",
      };
      return;
    }

    // -----------------------------------------------------------------------
    // 3. Pure Literal Elimination
    // -----------------------------------------------------------------------
    const pureLit = findPureLiteral(clauses, assignments);
    if (pureLit !== null) {
      const value = !pureLit.isNegated;
      assignments = {
        ...assignments,
        [pureLit.var]: {
          variable: pureLit.var,
          value,
          decisionLevel: decisionStack.length,
          reason: null,
        },
      };
      clauses = recomputeClauses(clauses, assignments);
      const litStr = pureLit.isNegated ? `¬${pureLit.var}` : pureLit.var;
      yield {
        stepNumber: stepNumber++,
        status: "Propagating",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: `Pure literal: ${litStr} appears with only one polarity. Assigning ${pureLit.var} = ${value}.`,
      };
      continue;
    }

    // -----------------------------------------------------------------------
    // 4. Decision: pick an unassigned variable and try a value
    // -----------------------------------------------------------------------
    const decVar = pickDecisionVariable(allVars, assignments);
    if (decVar === null) {
      // All variables assigned and no conflict — should be SAT (caught above)
      // This branch is a safety net.
      yield {
        stepNumber: stepNumber++,
        status: "SAT",
        clauses: cloneClauses(clauses),
        assignments: cloneAssignments(assignments),
        currentDecisionLevel: decisionStack.length,
        explanation: "All variables assigned. The formula is SATISFIABLE.",
      };
      return;
    }

    // Save snapshot before making this decision (for backtracking)
    decisionStack.push({
      variable: decVar,
      triedTrue: true,        // we always try true first
      bothTried: false,
      assignmentsSnapshot: cloneAssignments(assignments),
    });

    assignments = {
      ...assignments,
      [decVar]: {
        variable: decVar,
        value: true,          // DPLL tries true first
        decisionLevel: decisionStack.length,
        reason: null,
      },
    };
    clauses = recomputeClauses(clauses, assignments);

    yield {
      stepNumber: stepNumber++,
      status: "Deciding",
      clauses: cloneClauses(clauses),
      assignments: cloneAssignments(assignments),
      currentDecisionLevel: decisionStack.length,
      explanation: `Decision at level ${decisionStack.length}: trying ${decVar} = true.`,
    };
  }
}

// ---------------------------------------------------------------------------
// Backtrack helper
// ---------------------------------------------------------------------------

/**
 * Pop the decision stack and flip the last decision (or further backtrack if
 * both values have been tried). Returns updated { assignments, clauses } or
 * null when no more choices remain.
 */
function backtrack(
  decisionStack: Array<{
    variable: Variable;
    triedTrue: boolean;
    bothTried: boolean;
    assignmentsSnapshot: Record<Variable, VariableAssignment>;
  }>,
  _currentAssignments: Record<Variable, VariableAssignment>,
  _currentClauses: Clause[],
  inputClauses: Clause[]
): { assignments: Record<Variable, VariableAssignment>; clauses: Clause[] } | null {
  // Walk up the stack until we find a frame that hasn't tried both values
  while (decisionStack.length > 0) {
    const frame = decisionStack[decisionStack.length - 1];

    if (!frame.bothTried) {
      // Flip the decision: restore the pre-decision snapshot and assign opposite
      frame.bothTried = true;
      const newAssignments = {
        ...frame.assignmentsSnapshot,
        [frame.variable]: {
          variable: frame.variable,
          value: !frame.triedTrue,  // opposite of what we tried first
          decisionLevel: decisionStack.length,
          reason: null,
        },
      };
      const newClauses = recomputeClauses(cloneClauses(inputClauses), newAssignments);
      return { assignments: newAssignments, clauses: newClauses };
    }

    // Both values tried at this level — pop the frame and go higher
    decisionStack.pop();
  }

  return null; // exhausted all choices
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Convert a Literal to a human-readable string like "x1" or "¬x2". */
function literalToString(lit: Literal): string {
  return lit.isNegated ? `¬${lit.var}` : lit.var;
}

/** Convert a Clause to a human-readable string like "(x1 ∨ ¬x2 ∨ x3)". */
function clauseToString(clause: Clause): string {
  return `(${clause.literals.map(literalToString).join(' ∨ ')})`;
}
