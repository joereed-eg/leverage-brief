"use client";

import { FormAnswers } from "@/hooks/useFormPersistence";

interface Step4Props {
  answers: FormAnswers;
  onUpdate: (field: string, value: string | boolean) => void;
}

const CLIENT_BASE_OPTIONS = [
  "Under 10 clients",
  "10–50 clients",
  "50–200 clients",
  "200+ clients",
];

export function Step4Market({ answers, onUpdate }: Step4Props) {
  return (
    <div className="space-y-5">
      {/* Current Client Base */}
      <div>
        <label
          htmlFor="current_client_base"
          className="block text-sm font-semibold mb-1.5"
        >
          How many active clients/customers do you serve?
        </label>
        <select
          id="current_client_base"
          value={(answers.current_client_base as string) || ""}
          onChange={(e) => onUpdate("current_client_base", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow appearance-none cursor-pointer"
        >
          <option value="">Select range...</option>
          {CLIENT_BASE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* ICP Description */}
      <div>
        <label
          htmlFor="icp_description"
          className="block text-sm font-semibold mb-1.5"
        >
          Describe your ideal customer — who are you best at serving?
        </label>
        <textarea
          id="icp_description"
          rows={3}
          placeholder="Industry, company size, pain points, buying behavior..."
          value={(answers.icp_description as string) || ""}
          onChange={(e) => onUpdate("icp_description", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Top Competitor */}
      <div>
        <label
          htmlFor="top_competitor"
          className="block text-sm font-semibold mb-1.5"
        >
          Who is your #1 competitor and why do clients choose them over you?
        </label>
        <textarea
          id="top_competitor"
          rows={3}
          placeholder="Competitor name and what they do differently..."
          value={(answers.top_competitor as string) || ""}
          onChange={(e) => onUpdate("top_competitor", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow resize-none"
        />
      </div>

      {/* Win Rate */}
      <div>
        <label
          htmlFor="win_rate"
          className="block text-sm font-semibold mb-1.5"
        >
          What percentage of proposals do you win?
        </label>
        <input
          id="win_rate"
          type="text"
          placeholder="e.g., 40%, not sure, we don't track"
          value={(answers.win_rate as string) || ""}
          onChange={(e) => onUpdate("win_rate", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow"
        />
      </div>
    </div>
  );
}
