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
    <div className="mb-12">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center">
          {steps.map((step, stepIdx) => {
            const stepNumber = stepIdx + 1;
            const isCompleted = currentStep > stepNumber;
            const isCurrent = currentStep === stepNumber;

            return (
              <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                <>
                  {/* Connecting Line */}
                  {stepIdx !== steps.length - 1 ? (
                    <div className={`absolute left-4 top-4 -ml-px mt-0.5 h-0.5 w-full transition-colors duration-500 ${isCompleted || isCurrent ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} aria-hidden="true" />
                  ) : null}
                  
                  <div className="relative flex items-center gap-x-3">
                    {/* Circle */}
                    <span className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors duration-500 ${
                      isCurrent ? 'bg-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/50' : isCompleted ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-white" aria-hidden="true" />
                      ) : (
                        <step.icon className={`h-5 w-5 ${isCurrent ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} aria-hidden="true" />
                      )}
                    </span>
                    {/* Text */}
                    <span className="flex flex-col">
                      <span className={`text-sm font-semibold tracking-wide transition-colors duration-500 ${isCurrent ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>{step.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Step {stepNumber}</span>
                    </span>
                  </div>
                </>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
