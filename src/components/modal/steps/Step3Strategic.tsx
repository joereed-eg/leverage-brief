"use client";

import { FormAnswers } from "@/hooks/useFormPersistence";

interface Step3Props {
  answers: FormAnswers;
  onUpdate: (field: string, value: string | boolean) => void;
}

const CONFIDENCE_OPTIONS = [
  "1 — We're guessing",
  "2 — Some alignment",
  "3 — Mostly aligned",
  "4 — Strong alignment",
  "5 — Fully locked in",
];

const GAP_OPTIONS = [
  "On track — no gap",
  "Slight gap — within 10%",
  "Moderate gap — 10-30% behind",
  "Significant gap — 30-50% behind",
  "Critical gap — more than 50% behind",
];

export function Step3Strategic({ answers, onUpdate }: Step3Props) {
  return (
    <div className="space-y-5">
      {/* Three Year Target */}
      <div>
        <label
          htmlFor="three_year_target"
          className="block text-sm font-semibold mb-1.5"
        >
          Where does your company need to be in 3 years?
        </label>
        <textarea
          id="three_year_target"
          rows={3}
          placeholder="Revenue target, market position, team size, capabilities..."
          value={(answers.three_year_target as string) || ""}
          onChange={(e) => onUpdate("three_year_target", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Biggest Strategic Bet */}
      <div>
        <label
          htmlFor="biggest_strategic_bet"
          className="block text-sm font-semibold mb-1.5"
        >
          What is the single biggest bet you&apos;re making right now?
        </label>
        <textarea
          id="biggest_strategic_bet"
          rows={3}
          placeholder="New market, product launch, acquisition, key hire..."
          value={(answers.biggest_strategic_bet as string) || ""}
          onChange={(e) => onUpdate("biggest_strategic_bet", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Team Confidence */}
      <div>
        <label
          htmlFor="team_confidence"
          className="block text-sm font-semibold mb-1.5"
        >
          How confident is your leadership team in the current strategy?
        </label>
        <select
          id="team_confidence"
          value={(answers.team_confidence as string) || ""}
          onChange={(e) => onUpdate("team_confidence", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select confidence level...</option>
          {CONFIDENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Revenue Goal Gap */}
      <div>
        <label
          htmlFor="revenue_goal_gap"
          className="block text-sm font-semibold mb-1.5"
        >
          How close are you to hitting this year&apos;s revenue goal?
        </label>
        <select
          id="revenue_goal_gap"
          value={(answers.revenue_goal_gap as string) || ""}
          onChange={(e) => onUpdate("revenue_goal_gap", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select gap level...</option>
          {GAP_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
