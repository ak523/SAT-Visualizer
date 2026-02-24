/**
 * ClauseInput – lets the user type a CNF formula in a simple text format.
 *
 * Input format (one clause per line):
 *   x1 -x2 x3
 *   -x1 x2
 *
 * Each token is a literal:
 *   - No prefix  → positive literal (e.g. "x1")
 *   - "-" prefix → negated literal  (e.g. "-x2")
 */

import { useState } from 'react';
import type { Clause, Literal } from '../engine/types';

interface Props {
  onSolve: (clauses: Clause[]) => void;
}

/** Parse the textarea text into a Clause array. */
function parseFormula(text: string): Clause[] | string {
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) return 'Please enter at least one clause.';

  const clauses: Clause[] = [];
  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) continue;

    const literals: Literal[] = [];
    for (const token of tokens) {
      if (token.startsWith('-')) {
        const varName = token.slice(1);
        if (!varName) return `Line ${i + 1}: invalid literal "${token}".`;
        literals.push({ var: varName, isNegated: true });
      } else {
        literals.push({ var: token, isNegated: false });
      }
    }

    clauses.push({
      id: `c${i + 1}`,
      literals,
      isSatisfied: null,
      isLearned: false,
    });
  }

  return clauses;
}

const DEFAULT_FORMULA = `# Each line is a clause. Literals separated by spaces.
# Prefix with "-" for negation (e.g. -x1).
# Lines starting with "#" are comments.

x1 x2
-x1 x3
-x2 -x3`;

export default function ClauseInput({ onSolve }: Props) {
  const [text, setText] = useState(DEFAULT_FORMULA);
  const [error, setError] = useState<string | null>(null);

  function handleSolve() {
    const result = parseFormula(text);
    if (typeof result === 'string') {
      setError(result);
    } else {
      setError(null);
      onSolve(result);
    }
  }

  return (
    <div className="clause-input">
      <h2>Enter CNF Formula</h2>
      <p className="hint">
        One clause per line. Separate literals with spaces. Prefix with{' '}
        <code>-</code> for negation.
      </p>
      <textarea
        rows={10}
        value={text}
        onChange={e => setText(e.target.value)}
        spellCheck={false}
        aria-label="CNF formula input"
      />
      {error && <p className="error">{error}</p>}
      <button onClick={handleSolve}>▶ Run DPLL</button>
    </div>
  );
}
