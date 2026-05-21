import React from 'react';
import { User, FileText, Sparkles, Check } from 'lucide-react';

const steps = [
  { name: 'Business Profile', icon: User },
  { name: 'Campaign Details', icon: FileText },
  { name: 'Review & Generate', icon: Sparkles },
];

interface ModernProgressBarProps {
  currentStep: number; // 1, 2, or 3
}

export const ProgressBar: React.FC<ModernProgressBarProps> = ({ currentStep }) => {
  return (
    <div className="mb-10 bg-slate-50/70 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40 p-6 rounded-2xl">
      <nav aria-label="Progress">
        <ol role="list" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-y-4 sm:gap-x-4">
          {steps.map((step, stepIdx) => {
            const stepNumber = stepIdx + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <li key={step.name} className="flex-1 relative flex items-center">
                <div className="flex items-center gap-x-4">
                  {/* Circle Step Bubble */}
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-500/20' 
                      : isCompleted 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200/50 dark:border-slate-700/50'
                  }`}>
                    {isCompleted ? (
                      <Check className="h-5 w-5 text-white" aria-hidden="true" strokeWidth={3} />
                    ) : (
                      <step.icon className="h-5 w-5 transition-colors duration-300" aria-hidden="true" />
                    )}
                  </span>

                  {/* Caption */}
                  <span className="flex flex-col">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none">Step {stepNumber}</span>
                    <span className={`text-sm font-extrabold tracking-tight mt-1 transition-colors duration-300 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>{step.name}</span>
                  </span>
                </div>

                {/* Horizontal Separator Arrow or Line for Desktop */}
                {stepIdx !== steps.length - 1 ? (
                  <div className="hidden sm:block flex-1 mx-6 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden min-w-[2rem]">
                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'w-full bg-blue-600' : 'w-0'}`} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
