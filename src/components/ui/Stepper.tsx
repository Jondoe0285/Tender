export type WizardStep = { id: number; label: string };

/** Compact connected progress indicator. */
export function Stepper({ steps, currentStep, furthestStep = currentStep, onStepClick }: { steps: WizardStep[]; currentStep: number; furthestStep?: number; onStepClick?: (step: number) => void }) {
  const current = steps.find((step) => step.id === currentStep);

  return (
    <nav aria-label="Progress" className="mb-6">
      <div className="sm:hidden">
        <p className="mb-2 text-sm font-semibold text-foundation-navy">
          Step {currentStep} of {steps.length}: {current?.label}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-trade-blue transition-all"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden sm:flex sm:items-center">
        {steps.map((step, index) => {
          const state = step.id === currentStep ? 'current' : step.id <= furthestStep ? 'complete' : 'upcoming';
          const clickable = Boolean(onStepClick && step.id <= furthestStep && step.id !== currentStep);
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              {index > 0 && (
                <span className={`mx-2 h-px flex-1 ${step.id <= furthestStep ? 'bg-trade-blue' : 'bg-slate-200'}`} aria-hidden="true" />
              )}
              {clickable ? (
                <button type="button" onClick={() => onStepClick?.(step.id)} className="flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-trade-blue">
                  <StepMark id={step.id} label={step.label} state={state} />
                </button>
              ) : (
                <StepMark id={step.id} label={step.label} state={state} />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepMark({ id, label, state }: { id: number; label: string; state: 'current' | 'complete' | 'upcoming' }) {
  return (
    <span className="flex items-center gap-2">
      <span
        aria-current={state === 'current' ? 'step' : undefined}
        className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
          state === 'complete'
            ? 'bg-approved text-white'
            : state === 'current'
              ? 'bg-trade-blue text-site-white'
              : 'bg-slate-200 text-concrete-grey'
        }`}
      >
        {state === 'complete' ? '\u2713' : id}
      </span>
      <span className={`text-xs font-medium ${state === 'upcoming' ? 'text-concrete-grey' : 'text-foundation-navy'}`}>
        {label}
      </span>
    </span>
  );
}
