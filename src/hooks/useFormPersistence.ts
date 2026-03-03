"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { STORAGE_KEYS } from "@/lib/constants";

export type FormAnswers = Record<string, string | boolean>;

interface UseFormPersistenceReturn {
  answers: FormAnswers;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  updateField: (field: string, value: string | boolean) => void;
  clearAll: () => void;
  isHydrated: boolean;
}

export function useFormPersistence(): UseFormPersistenceReturn {
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [currentStep, setCurrentStepState] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(STORAGE_KEYS.FORM_STATE);
      const savedStep = localStorage.getItem(STORAGE_KEYS.FORM_STEP);

      if (savedState) {
        const parsed = JSON.parse(savedState);
        setAnswers(parsed);
      }
      if (savedStep) {
        setCurrentStepState(parseInt(savedStep, 10));
      }
    } catch {
      // Corrupted localStorage — start fresh
    }
    setIsHydrated(true);
  }, []);

  // Persist answers to localStorage on every change
  const persistAnswers = useCallback((updated: FormAnswers) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FORM_STATE, JSON.stringify(updated));
    } catch {
      // localStorage full or unavailable
    }
  }, []);

  const updateField = useCallback(
    (field: string, value: string | boolean) => {
      setAnswers((prev) => {
        const updated = { ...prev, [field]: value };
        persistAnswers(updated);
        return updated;
      });
    },
    [persistAnswers]
  );

  const setCurrentStep = useCallback((step: number) => {
    setCurrentStepState(step);
    try {
      localStorage.setItem(STORAGE_KEYS.FORM_STEP, String(step));
    } catch {
      // localStorage unavailable
    }
  }, []);

  const clearAll = useCallback(() => {
    setAnswers({});
    setCurrentStepState(0);
    try {
      localStorage.removeItem(STORAGE_KEYS.FORM_STATE);
      localStorage.removeItem(STORAGE_KEYS.FORM_STEP);
    } catch {
      // localStorage unavailable
    }
  }, []);

  return {
    answers,
    currentStep,
    setCurrentStep,
    updateField,
    clearAll,
    isHydrated,
  };
}
