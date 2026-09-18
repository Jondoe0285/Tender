export type WizardStep = { id: number; label: string };

/** Compact progress indicator: numbered circles + labels on larger screens, a slim bar + text on mobile. */
export function Stepper({ steps, currentStep, furthestStep = currentStep, onStepClick }: { steps: WizardStep[]; currentStep: number; furthestStep?: number; onStepClick?: (step: number) => void }) {
  const current = steps.find((step) => step.id === currentStep);

  return (
    <nav aria-label="Progress" className="mb-8">
      <div className="sm:hidden">
        <p className="mb-2 text-sm font-semibold text-foundation-navy">
          Step {currentStep} of {steps.length}: {current?.label}
        </p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-safety-amber transition-all"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden sm:flex sm:items-start sm:justify-between sm:gap-2">
        {steps.map((step) => {
          const state = step.id === currentStep ? 'current' : step.id <= furthestStep ? 'complete' : 'upcoming';
          const clickable = Boolean(onStepClick && step.id <= furthestStep && step.id !== currentStep);
          const content = <>
            <span
              aria-current={state === 'current' ? 'step' : undefined}
              className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-xs font-bold ${
                state === 'complete'
                  ? 'bg-approved text-white'
                  : state === 'current'
                    ? 'bg-safety-amber text-foundation-navy'
                    : 'bg-slate-200 text-concrete-grey'
              }`}
            >
              {state === 'complete' ? '\u2713' : step.id}
            </span>
            <span className={`max-w-[6.5rem] text-xs font-medium leading-tight ${state === 'upcoming' ? 'text-concrete-grey' : 'text-foundation-navy'}`}>
              {step.label}
            </span>
          </>;
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-2 text-center">
              {clickable ? <button type="button" onClick={() => onStepClick?.(step.id)} className="flex flex-col items-center gap-2 rounded-md focus:outline-none focus:ring-2 focus:ring-safety-amber">{content}</button> : content}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
