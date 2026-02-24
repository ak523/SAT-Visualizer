/**
 * StateViewer – renders the full SolverState snapshot for one step.
 *
 * Displays:
 *   - Status badge (colour-coded)
 *   - Human-readable explanation
 *   - Assignment table
 *   - Clause list with satisfaction highlighting
 */

import type { SolverState, Literal } from '../engine/types';

interface Props {
  state: SolverState;
}

/** Colour map for the status badge */
const STATUS_COLORS: Record<string, string> = {
  Ready: '#6c757d',
  Deciding: '#0d6efd',
  Propagating: '#0dcaf0',
  'Conflict!': '#dc3545',
  Analyzing: '#fd7e14',
  Backtracking: '#ffc107',
  SAT: '#198754',
  UNSAT: '#dc3545',
};

function literalStr(lit: Literal): string {
  return lit.isNegated ? `¬${lit.var}` : lit.var;
}

export default function StateViewer({ state }: Props) {
  const { status, explanation, assignments, clauses, currentDecisionLevel } = state;
  const badgeColor = STATUS_COLORS[status] ?? '#6c757d';

  const sortedVars = Object.keys(assignments).sort();

  return (
    <div className="state-viewer">
      {/* Status badge + explanation */}
      <div className="status-row">
        <span className="status-badge" style={{ backgroundColor: badgeColor }}>
          {status}
        </span>
        <span className="explanation">{explanation}</span>
      </div>
      <p className="decision-level">Decision level: {currentDecisionLevel}</p>

      {/* Assignment table */}
      <section>
        <h3>Assignments ({sortedVars.length})</h3>
        {sortedVars.length === 0 ? (
          <p className="empty">No assignments yet.</p>
        ) : (
          <table className="assignment-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Value</th>
                <th>Level</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {sortedVars.map(v => {
                const a = assignments[v];
                return (
                  <tr key={v}>
                    <td><code>{v}</code></td>
                    <td className={a.value ? 'val-true' : 'val-false'}>
                      {a.value ? 'true' : 'false'}
                    </td>
                    <td>{a.decisionLevel}</td>
                    <td>
                      {a.reason
                        ? <span className="reason-clause">
                            ({a.reason.literals.map(literalStr).join(' ∨ ')})
                          </span>
                        : <em>decision</em>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Clause list */}
      <section>
        <h3>Clauses ({clauses.length})</h3>
        <ul className="clause-list">
          {clauses.map(clause => {
            const cls =
              clause.isSatisfied === true
                ? 'clause-sat'
                : clause.isSatisfied === false
                ? 'clause-conflict'
                : 'clause-unknown';
            return (
              <li key={clause.id} className={`clause-item ${cls}`}>
                <span className="clause-id">{clause.id}</span>
                {clause.isLearned && (
                  <span className="learned-badge">learned</span>
                )}
                <span className="clause-body">
                  ({clause.literals.map(literalStr).join(' ∨ ')})
                </span>
                <span className="clause-status">
                  {clause.isSatisfied === true
                    ? '✓'
                    : clause.isSatisfied === false
                    ? '✗'
                    : '?'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
