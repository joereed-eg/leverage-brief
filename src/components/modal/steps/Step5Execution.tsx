"use client";

import { FormAnswers } from "@/hooks/useFormPersistence";

interface Step5Props {
  answers: FormAnswers;
  onUpdate: (field: string, value: string | boolean) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const READINESS_OPTIONS = [
  { value: "now", label: "Already in motion — I need guidance now" },
  { value: "30_days", label: "Within the next 30 days" },
  { value: "next_quarter", label: "Next quarter — still exploring" },
  { value: "just_looking", label: "Just curious — no timeline yet" },
];

export function Step5Execution({
  answers,
  onUpdate,
  onSubmit,
  isSubmitting,
}: Step5Props) {
  return (
    <div className="space-y-5">
      {/* Fulcrum Priorities */}
      <div>
        <label
          htmlFor="fulcrum_priorities"
          className="block text-sm font-semibold mb-1.5"
        >
          What are the top 3 priorities for your business this quarter?
        </label>
        <textarea
          id="fulcrum_priorities"
          rows={4}
          placeholder="1. &#10;2. &#10;3. "
          value={(answers.fulcrum_priorities as string) || ""}
          onChange={(e) => onUpdate("fulcrum_priorities", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Monthly Focus */}
      <div>
        <label
          htmlFor="monthly_focus"
          className="block text-sm font-semibold mb-1.5"
        >
          If you could only accomplish one thing this month, what would it be?
        </label>
        <textarea
          id="monthly_focus"
          rows={3}
          placeholder="The single most important outcome..."
          value={(answers.monthly_focus as string) || ""}
          onChange={(e) => onUpdate("monthly_focus", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Biggest Obstacle */}
      <div>
        <label
          htmlFor="biggest_obstacle"
          className="block text-sm font-semibold mb-1.5"
        >
          What is the #1 thing standing in the way of growth right now?
        </label>
        <textarea
          id="biggest_obstacle"
          rows={3}
          placeholder="Hiring, cash flow, market clarity, team alignment..."
          value={(answers.biggest_obstacle as string) || ""}
          onChange={(e) => onUpdate("biggest_obstacle", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Engagement Readiness */}
      <div>
        <label
          htmlFor="engagement_readiness"
          className="block text-sm font-semibold mb-1.5"
        >
          How soon are you looking to make a strategic change?
        </label>
        <select
          id="engagement_readiness"
          value={(answers.engagement_readiness as string) || ""}
          onChange={(e) => onUpdate("engagement_readiness", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select timeline...</option>
          {READINESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-lg bg-[#27E7FE] text-black font-bold text-lg hover:bg-[#1fd4ea] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting
            ? "Generating Your Leverage Brief..."
            : "Get My Leverage Brief"}
        </button>
        <p className="text-xs text-black/40 text-center mt-3">
          Your personalized Leverage Brief will be delivered to your inbox.
        </p>
      </div>
    </div>
  );
}
