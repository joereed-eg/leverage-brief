"use client";

import { STEP_LABELS, TOTAL_STEPS } from "@/lib/constants";

interface StepProgressProps {
  currentStep: number;
}

export function StepProgress({ currentStep }: StepProgressProps) {
  const progress = ((currentStep + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="w-full h-2 bg-black/10 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-[#27E7FE] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-black/50">
          Step {currentStep + 1} of {TOTAL_STEPS}
        </p>
        <p className="text-sm font-medium text-black/40">
          {STEP_LABELS[currentStep]}
        </p>
      </div>
    </div>
  );
}
