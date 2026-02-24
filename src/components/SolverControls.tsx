/**
 * SolverControls – step forward / step backward / reset buttons.
 */


interface Props {
  stepIndex: number;
  totalSteps: number;
  onStepBack: () => void;
  onStepForward: () => void;
  onReset: () => void;
}

export default function SolverControls({
  stepIndex,
  totalSteps,
  onStepBack,
  onStepForward,
  onReset,
}: Props) {
  return (
    <div className="solver-controls">
      <button onClick={onStepBack} disabled={stepIndex === 0} aria-label="Step back">
        ◀ Back
      </button>
      <span className="step-counter">
        Step {stepIndex + 1} / {totalSteps}
      </span>
      <button
        onClick={onStepForward}
        disabled={stepIndex === totalSteps - 1}
        aria-label="Step forward"
      >
        Forward ▶
      </button>
      <button onClick={onReset} aria-label="Reset solver">
        ↺ Reset
      </button>
    </div>
  );
}
