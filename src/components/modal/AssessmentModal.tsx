"use client";

import { useState, useEffect, useCallback } from "react";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { postSigned } from "@/lib/hmac";
import { TOTAL_STEPS, ENDPOINTS } from "@/lib/constants";
import { StepProgress } from "./StepProgress";
import { Step1Identity } from "./steps/Step1Identity";
import { Step2Operational } from "./steps/Step2Operational";
import { Step3Strategic } from "./steps/Step3Strategic";
import { Step4Market } from "./steps/Step4Market";
import { Step5Execution } from "./steps/Step5Execution";

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeId?: string | null;
}

export function AssessmentModal({
  isOpen,
  onClose,
  resumeId,
}: AssessmentModalProps) {
  const {
    answers,
    currentStep,
    setCurrentStep,
    updateField,
    clearAll,
    isHydrated,
  } = useFormPersistence();

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  // Resume from partial — hydrate from backend
  useEffect(() => {
    if (!resumeId || !isOpen) return;

    let cancelled = false;
    setIsResuming(true);
    setResumeError(null);

    async function hydrateFromResume() {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch(
          `${ENDPOINTS.GET_PARTIAL}?resume_id=${resumeId}`,
          { signal: controller.signal }
        );
        clearTimeout(timeoutId);

        if (cancelled) return;

        if (!res.ok) {
          if (res.status === 404 || res.status === 410) {
            setResumeError(
              "This resume link has expired or is no longer valid. You can start a new assessment below."
            );
          } else {
            setResumeError(
              "We couldn\u2019t load your saved progress. You can start a new assessment below."
            );
          }
          setIsResuming(false);
          return;
        }

        const data = await res.json();

        if (cancelled) return;

        if (data.error) {
          setResumeError(
            "This resume link has expired. You can start a new assessment below."
          );
          setIsResuming(false);
          return;
        }

        if (data.form_state && typeof data.form_state === "object") {
          Object.entries(data.form_state).forEach(([key, value]) => {
            updateField(key, value as string | boolean);
          });
        }
        if (typeof data.partial_progress_step === "number") {
          setCurrentStep(data.partial_progress_step);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === "AbortError") {
          setResumeError(
            "Loading timed out. Please check your connection and try again."
          );
        } else {
          setResumeError(
            "We couldn\u2019t load your saved progress. You can start a new assessment below."
          );
        }
      } finally {
        if (!cancelled) setIsResuming(false);
      }
    }

    hydrateFromResume();
    return () => {
      cancelled = true;
    };
  }, [resumeId, isOpen, updateField, setCurrentStep, clearAll]);

  // Dynamic sub-header
  const companyName = (answers.company_name as string) || "";
  const subHeader = companyName
    ? `A proprietary strategic diagnostic for ${companyName}.`
    : "A proprietary strategic diagnostic for your company.";

  // Step 1 validation
  const isStep1Valid = () => {
    const email = (answers.email as string) || "";
    const company = (answers.company_name as string) || "";
    const consent = !!answers.consent_agreed;
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    return emailValid && company.trim().length > 0 && consent;
  };

  // Navigate steps
  const goNext = () => {
    if (currentStep === 0 && !isStep1Valid()) return;
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Save for Later (Step 2+)
  const handleSaveForLater = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await postSigned(ENDPOINTS.ASSESS_PARTIAL, {
        email: answers.email,
        name: answers.name || "",
        company_name: answers.company_name || "",
        company_url: answers.company_url || "",
        partial_progress_step: currentStep,
        referrer_url: window.location.href,
        browser_metadata: {
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
        form_state: answers,
      });
      setSaveSuccess(true);
    } catch {
      // Partial save failed — data is still in localStorage
    } finally {
      setIsSaving(false);
    }
  }, [answers, currentStep, isSaving]);

  // Final Submit (Step 5)
  const handleFinalSubmit = useCallback(async () => {
    // Check honeypot
    if (answers.confirm_email_address) return;

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await postSigned(ENDPOINTS.ASSESS_FULL, {
        ...answers,
        referrer_url: window.location.href,
        submitted_at: new Date().toISOString(),
      });

      if (res.ok) {
        clearAll();
        setSubmitSuccess(true);

        // Non-blocking completion update — notify n8n that this lead completed
        if (resumeId) {
          fetch(ENDPOINTS.ASSESS_PARTIAL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              resume_id: resumeId,
              email: answers.email,
              partial_status: "completed",
              completed_at: new Date().toISOString(),
            }),
          }).catch(() => {
            // Best-effort — completion branching in main pipeline handles this too
          });
        }
      }
    } catch {
      // Submit failed — data persists in localStorage
    } finally {
      setIsSubmitting(false);
    }
  }, [answers, isSubmitting, clearAll, resumeId]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !isHydrated) return null;

  // Loading state — resume token hydration
  if (isResuming) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-[#F7F5F2] w-full max-w-2xl mx-4 rounded-2xl p-10 text-center shadow-2xl">
          <div className="mb-4">
            <div className="w-10 h-10 border-3 border-[#27E7FE] border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
          <h2 className="text-xl font-bold mb-2">Loading Your Assessment</h2>
          <p className="text-black/50 text-sm">
            Restoring your saved progress...
          </p>
        </div>
      </div>
    );
  }

  // Error state — expired/invalid resume link
  if (resumeError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-[#F7F5F2] w-full max-w-2xl mx-4 rounded-2xl p-10 text-center shadow-2xl">
          <div className="text-4xl mb-4">&#9888;</div>
          <h2 className="text-xl font-bold mb-3">
            Couldn&apos;t Resume Your Assessment
          </h2>
          <p className="text-black/50 text-sm mb-8 max-w-md mx-auto">
            {resumeError}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setResumeError(null);
              }}
              className="bg-[#27E7FE] text-black font-semibold px-8 py-3 rounded-lg hover:bg-[#1fd4ea] transition-colors cursor-pointer"
            >
              Start New Assessment
            </button>
            <button
              onClick={onClose}
              className="border-2 border-black text-black font-semibold px-8 py-3 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Save success state
  if (saveSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-[#F7F5F2] w-full max-w-2xl mx-4 rounded-2xl p-10 text-center shadow-2xl">
          <div className="text-5xl mb-4">&#9993;</div>
          <h2 className="text-2xl font-bold mb-3">Progress Saved</h2>
          <p className="text-black/50 mb-2 max-w-md mx-auto">
            We&apos;ve saved your assessment progress and sent a resume link to{" "}
            <span className="font-semibold text-black">
              {(answers.email as string) || "your email"}
            </span>
            .
          </p>
          <p className="text-black/40 text-sm mb-8 max-w-md mx-auto">
            Your data is also saved locally — you can return to this page
            anytime to continue.
          </p>
          <button
            onClick={() => {
              setSaveSuccess(false);
              onClose();
            }}
            className="bg-[#27E7FE] text-black font-semibold px-8 py-3 rounded-lg hover:bg-[#1fd4ea] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // Submit success state
  if (submitSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-[#F7F5F2] w-full max-w-2xl mx-4 rounded-2xl p-10 text-center shadow-2xl">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold mb-3">
            Your Leverage Brief Is Being Built
          </h2>
          <p className="text-black/60 mb-8 max-w-md mx-auto">
            Check your inbox shortly. We&apos;re generating a personalized
            Leverage Brief for{" "}
            <span className="font-semibold text-black">
              {companyName || "your company"}
            </span>
            .
          </p>
          <button
            onClick={() => {
              setSubmitSuccess(false);
              onClose();
            }}
            className="bg-[#27E7FE] text-black font-semibold px-8 py-3 rounded-lg hover:bg-[#1fd4ea] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#F7F5F2] w-full max-w-2xl mx-4 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-black/40 hover:text-black transition-colors text-2xl leading-none cursor-pointer z-10"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Header */}
        <div className="px-8 pt-8 pb-2">
          <h2 className="text-2xl font-bold">Your Leverage Brief</h2>
          <p className="text-black/50 text-sm mt-1">{subHeader}</p>
        </div>

        {/* Progress */}
        <div className="px-8">
          <StepProgress currentStep={currentStep} />
        </div>

        {/* Step content — scrollable */}
        <div className="px-8 pb-6 overflow-y-auto flex-1">
          {currentStep === 0 && (
            <Step1Identity answers={answers} onUpdate={updateField} />
          )}
          {currentStep === 1 && (
            <Step2Operational answers={answers} onUpdate={updateField} />
          )}
          {currentStep === 2 && (
            <Step3Strategic answers={answers} onUpdate={updateField} />
          )}
          {currentStep === 3 && (
            <Step4Market answers={answers} onUpdate={updateField} />
          )}
          {currentStep === 4 && (
            <Step5Execution
              answers={answers}
              onUpdate={updateField}
              onSubmit={handleFinalSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Footer — navigation + Save for Later */}
        {currentStep < TOTAL_STEPS - 1 && (
          <div className="px-8 pb-8 pt-2 border-t border-black/5">
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={goBack}
                  className="flex-1 py-3 rounded-lg border-2 border-black text-black font-semibold hover:bg-black/5 transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
              <button
                onClick={goNext}
                disabled={currentStep === 0 && !isStep1Valid()}
                className="flex-1 py-3 rounded-lg bg-[#27E7FE] text-black font-semibold hover:bg-[#1fd4ea] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Next
              </button>
            </div>

            {/* Save for Later — visible on steps 2-4 (index 1-3) */}
            {currentStep >= 1 && (
              <button
                type="button"
                onClick={handleSaveForLater}
                disabled={isSaving}
                className="w-full mt-3 py-2.5 rounded-lg border border-black/15 text-sm font-medium text-black/50 hover:text-black/70 hover:bg-black/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSaving ? "Saving..." : "Save for Later"}
              </button>
            )}
          </div>
        )}

        {/* Back button on Step 5 */}
        {currentStep === TOTAL_STEPS - 1 && (
          <div className="px-8 pb-8 pt-2 border-t border-black/5">
            <button
              onClick={goBack}
              className="w-full py-3 rounded-lg border-2 border-black text-black font-semibold hover:bg-black/5 transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
