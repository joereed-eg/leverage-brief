"use client";

import { useState, useEffect } from "react";
import { AssessmentModal } from "@/components/modal/AssessmentModal";
import { STORAGE_KEYS } from "@/lib/constants";

export default function Home() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resumeId, setResumeId] = useState<string | null>(null);
  const [hasLocalProgress, setHasLocalProgress] = useState(false);

  // Check for resume_id in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("resume_id");
    if (rid) {
      setResumeId(rid);
      setIsModalOpen(true);
      return;
    }

    // Check for existing localStorage progress (non-token resume)
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.FORM_STATE);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Only show banner if there's meaningful data (email filled in)
        if (parsed.email) {
          setHasLocalProgress(true);
        }
      }
    } catch {
      // localStorage unavailable or corrupted
    }
  }, []);

  const handleContinue = () => {
    setIsModalOpen(true);
  };

  const handleDismissBanner = () => {
    setHasLocalProgress(false);
    try {
      localStorage.removeItem(STORAGE_KEYS.FORM_STATE);
      localStorage.removeItem(STORAGE_KEYS.FORM_STEP);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center max-w-xl mx-auto px-6">
        {/* Resume banner — shows when localStorage has saved progress */}
        {hasLocalProgress && !isModalOpen && (
          <div className="mb-8 bg-white border border-[#27E7FE]/40 rounded-xl px-6 py-4 shadow-sm">
            <p className="text-sm text-black/70 mb-3">
              You have an assessment in progress.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleContinue}
                className="bg-[#27E7FE] text-black font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-[#1fd4ea] transition-colors cursor-pointer"
              >
                Continue &rarr;
              </button>
              <button
                onClick={handleDismissBanner}
                className="border border-black/15 text-black/50 font-medium px-6 py-2.5 rounded-lg text-sm hover:bg-black/5 transition-colors cursor-pointer"
              >
                Start Over
              </button>
            </div>
          </div>
        )}

        {/* Fulcrum Logo */}
        <div className="mb-8">
          <img
            src="/fulcrum-logo.png"
            alt="Fulcrum Collective"
            className="h-10 sm:h-12 mx-auto"
          />
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
          Fulcrum Leverage Brief
        </h1>
        <p className="text-lg mb-8 text-black/60">
          A proprietary strategic diagnostic for your company.
        </p>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#27E7FE] text-black font-semibold px-8 py-4 rounded-lg text-lg hover:bg-[#1fd4ea] transition-colors cursor-pointer"
        >
          Get My Leverage Brief
        </button>
      </div>

      <AssessmentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resumeId={resumeId}
      />
    </main>
  );
}
