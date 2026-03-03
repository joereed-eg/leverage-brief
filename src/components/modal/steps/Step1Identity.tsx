"use client";

import { FormAnswers } from "@/hooks/useFormPersistence";
import { CONSENT_VERSION } from "@/lib/constants";

interface Step1Props {
  answers: FormAnswers;
  onUpdate: (field: string, value: string | boolean) => void;
}

export function Step1Identity({ answers, onUpdate }: Step1Props) {
  return (
    <div className="space-y-5">
      {/* Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-semibold mb-1.5">
          Full Name
        </label>
        <input
          id="name"
          type="text"
          placeholder="Jane Smith"
          value={(answers.name as string) || ""}
          onChange={(e) => onUpdate("name", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow"
        />
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          placeholder="jane@acmecorp.com"
          value={(answers.email as string) || ""}
          onChange={(e) => onUpdate("email", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow"
        />
      </div>

      {/* Company Name */}
      <div>
        <label
          htmlFor="company_name"
          className="block text-sm font-semibold mb-1.5"
        >
          Company Name <span className="text-red-500">*</span>
        </label>
        <input
          id="company_name"
          type="text"
          required
          placeholder="Acme Corp"
          value={(answers.company_name as string) || ""}
          onChange={(e) => onUpdate("company_name", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow"
        />
      </div>

      {/* Company URL */}
      <div>
        <label
          htmlFor="company_url"
          className="block text-sm font-semibold mb-1.5"
        >
          Company Website
        </label>
        <input
          id="company_url"
          type="url"
          placeholder="https://acmecorp.com"
          value={(answers.company_url as string) || ""}
          onChange={(e) => onUpdate("company_url", e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-black/15 bg-white text-black placeholder:text-black/30 focus:outline-none focus:ring-2 focus:ring-[#27E7FE] transition-shadow"
        />
      </div>

      {/* GDPR Consent */}
      <div className="flex items-start gap-3 pt-2">
        <input
          id="consent_agreed"
          type="checkbox"
          checked={!!answers.consent_agreed}
          onChange={(e) => {
            onUpdate("consent_agreed", e.target.checked);
            if (e.target.checked) {
              onUpdate("consent_timestamp", new Date().toISOString());
              onUpdate("consent_version", CONSENT_VERSION);
            }
          }}
          className="mt-1 h-4 w-4 rounded border-black/20 accent-[#27E7FE] cursor-pointer"
        />
        <label
          htmlFor="consent_agreed"
          className="text-sm text-black/70 leading-snug cursor-pointer"
        >
          I agree to the{" "}
          <span className="underline font-medium text-black">
            Fulcrum Privacy Policy
          </span>{" "}
          and consent to an AI-assisted strategic analysis of my business data.{" "}
          <span className="text-red-500">*</span>
        </label>
      </div>

      {/* Honeypot — hidden from real users */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="confirm_email_address">Confirm Email</label>
        <input
          id="confirm_email_address"
          name="confirm_email_address"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={(answers.confirm_email_address as string) || ""}
          onChange={(e) => onUpdate("confirm_email_address", e.target.value)}
        />
      </div>
    </div>
  );
}
