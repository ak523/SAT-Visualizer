import { useState, useCallback } from 'react';
import './App.css';
import type { Clause, SolverState } from './engine/types';
import { runDPLL } from './engine/dpll';
import ClauseInput from './components/ClauseInput';
import SolverControls from './components/SolverControls';
import StateViewer from './components/StateViewer';

/**
 * Eagerly runs the DPLL generator to completion and collects every yielded
 * SolverState into an array. This lets us freely step forward and backward
 * without re-running the solver.
 */
function collectStates(clauses: Clause[]): SolverState[] {
  const gen = runDPLL(clauses);
  const states: SolverState[] = [];
  let result = gen.next();
  while (!result.done) {
    states.push(result.value);
    result = gen.next();
  }
  // The final return value (if any) is also a SolverState for SAT/UNSAT
  if (result.value) states.push(result.value);
  return states;
}

export default function App() {
  const [states, setStates] = useState<SolverState[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const handleSolve = useCallback((clauses: Clause[]) => {
    const allStates = collectStates(clauses);
    setStates(allStates);
    setStepIndex(0);
  }, []);

  const handleReset = useCallback(() => {
    setStates(null);
    setStepIndex(0);
  }, []);

  const handleStepForward = useCallback(() => {
    setStepIndex(i => (states ? Math.min(i + 1, states.length - 1) : i));
  }, [states]);

  const handleStepBack = useCallback(() => {
    setStepIndex(i => Math.max(i - 1, 0));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 Constraint Solving Playground</h1>
        <p className="subtitle">
          An interactive DPLL SAT solver — step through every decision, propagation,
          and backtrack.
        </p>
      </header>

      <main className="app-main">
        {states === null ? (
          <ClauseInput onSolve={handleSolve} />
        ) : (
          <div className="solver-view">
            <SolverControls
              stepIndex={stepIndex}
              totalSteps={states.length}
              onStepBack={handleStepBack}
              onStepForward={handleStepForward}
              onReset={handleReset}
            />
            <StateViewer state={states[stepIndex]} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <a
          href="https://github.com/ak523/SAT-Visualizer"
          target="_blank"
          rel="noreferrer"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  );
}

