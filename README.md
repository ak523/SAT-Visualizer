# SAT-Visualizer — Constraint Solving Playground

An interactive, visual web application that helps students understand SAT solvers by stepping through every decision, propagation, conflict, and backtrack of the DPLL algorithm.

**Live demo:** https://ak523.github.io/SAT-Visualizer/

## Features

- **Step-by-step DPLL visualization** — navigate forward and backward through every micro-step: Ready → Deciding → Propagating → Conflict! → Backtracking → SAT/UNSAT.
- **Human-readable explanations** — each step includes a plain-English description of what the solver is doing and why.
- **CNF formula input** — enter any propositional formula in Conjunctive Normal Form directly in the browser; one clause per line, literals separated by spaces, prefix with `-` for negation.
- **Assignment table** — shows each variable's value, decision level, and the reason clause (or marks it as a free decision).
- **Clause list** — colour-coded to show satisfied (✓), conflicted (✗), and undetermined (?) clauses.

## Input Format

One clause per line. Each clause is a disjunction of space-separated literals.  
Prefix a literal with `-` to negate it. Lines starting with `#` are comments.

```
# (x1 ∨ x2) ∧ (¬x1 ∨ x3) ∧ (¬x2 ∨ ¬x3)
x1 x2
-x1 x3
-x2 -x3
```

## Project Structure

```
src/
  engine/               # Pure TypeScript solver logic (no React)
    types.ts            # Shared interfaces: Clause, SolverState, etc.
    dpll.ts             # DPLL solver as a JavaScript Generator function
  components/           # React UI components
    ClauseInput.tsx     # CNF formula textarea + parser
    SolverControls.tsx  # Step Forward / Back / Reset buttons
    StateViewer.tsx     # Renders the full SolverState snapshot
  App.tsx               # Top-level app: collects all steps, manages stepIndex
  main.tsx              # React DOM entry point
```

## Architecture

The UI and solver are **strictly separated**:

- `src/engine/dpll.ts` is pure TypeScript — zero React imports. It exports `function* runDPLL(clauses)`, a generator that yields one `SolverState` per micro-step.
- `App.tsx` eagerly runs the generator to completion, collecting all states into an array. The React UI then simply renders `states[stepIndex]` and adjusts `stepIndex` on button clicks.

This makes the algorithm extremely easy to understand and test independently of the UI.

## Tech Stack

- [Vite](https://vite.dev/) 7 + [React](https://react.dev/) 19 + TypeScript 5
- Static site, deployable to GitHub Pages with `npm run deploy`

## Development

```bash
npm install
npm run dev       # start dev server at http://localhost:5173/SAT-Visualizer/
npm run build     # type-check + production build → dist/
npm run deploy    # build + push to gh-pages branch
```
