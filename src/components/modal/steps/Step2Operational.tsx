"use client";

import { FormAnswers } from "@/hooks/useFormPersistence";

interface Step2Props {
  answers: FormAnswers;
  onUpdate: (field: string, value: string | boolean) => void;
}

const FREQUENCY_OPTIONS = [
  "Rarely — I can disappear for a week",
  "Sometimes — a few fires per week",
  "Often — daily interruptions",
  "Constantly — I am the bottleneck",
];

const DREAD_OPTIONS = [
  "1 — I look forward to the week",
  "2 — Mild unease",
  "3 — Noticeable dread",
  "4 — Significant anxiety",
  "5 — Full-on dread",
];

export function Step2Operational({
  answers,
  onUpdate,
}: Step2Props) {
  return (
    <div className="space-y-5">
      {/* Vacation Test */}
      <div>
        <label
          htmlFor="vacation_test"
          className="block text-sm font-semibold mb-1.5"
        >
          If you left for 2 weeks with no phone, what would break?
        </label>
        <textarea
          id="vacation_test"
          rows={3}
          placeholder="Describe what would fall apart without you..."
          value={(answers.vacation_test as string) || ""}
          onChange={(e) => onUpdate("vacation_test", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Interruption Frequency */}
      <div>
        <label
          htmlFor="interruption_frequency"
          className="block text-sm font-semibold mb-1.5"
        >
          How often does your team need you to solve problems?
        </label>
        <select
          id="interruption_frequency"
          value={(answers.interruption_frequency as string) || ""}
          onChange={(e) => onUpdate("interruption_frequency", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select frequency...</option>
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Sunday Dread */}
      <div>
        <label
          htmlFor="sunday_dread"
          className="block text-sm font-semibold mb-1.5"
        >
          Rate your &ldquo;Sunday Dread&rdquo; — how anxious do you feel about
          the coming week?
        </label>
        <select
          id="sunday_dread"
          value={(answers.sunday_dread as string) || ""}
          onChange={(e) => onUpdate("sunday_dread", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select level...</option>
          {DREAD_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Decision Bottleneck */}
      <div>
        <label
          htmlFor="decision_bottleneck"
          className="block text-sm font-semibold mb-1.5"
        >
          What type of decisions can only you make right now?
        </label>
        <textarea
          id="decision_bottleneck"
          rows={3}
          placeholder="Pricing, hiring, client escalations, strategy calls..."
          value={(answers.decision_bottleneck as string) || ""}
          onChange={(e) => onUpdate("decision_bottleneck", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

    </div>
  );
}
