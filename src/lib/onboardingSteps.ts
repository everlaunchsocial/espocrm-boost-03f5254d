/**
 * Shared onboarding wizard step configuration.
 * This is the SINGLE SOURCE OF TRUTH for onboarding step names/titles.
 * Used by: CustomerOnboardingLayout, SetupChecklist, AffiliateCustomerDetail, AffiliateCustomerDetailDialog
 */

export interface OnboardingStep {
  number: number;
  title: string;
  stageKey: string; // matches onboarding_stage values like 'wizard_step_1'
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { number: 1, title: 'Business Profile', stageKey: 'wizard_step_1' },
  { number: 2, title: 'Voice & Personality', stageKey: 'wizard_step_2' },
  { number: 3, title: 'Knowledge & Content', stageKey: 'wizard_step_3' },
  { number: 4, title: 'Lead Capture', stageKey: 'wizard_step_4' },
  { number: 5, title: 'Calendar', stageKey: 'wizard_step_5' },
  { number: 6, title: 'Deploy', stageKey: 'wizard_step_6' },
];

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

/**
 * Parse onboarding_stage to determine completed step count.
 * Returns { completed, total, incompleteSteps[] }
 */
export function getOnboardingProgress(onboardingStage: string | null): {
  completed: number;
  total: number;
  incompleteSteps: string[];
} {
  const stage = onboardingStage?.toLowerCase() || '';
  const total = TOTAL_ONBOARDING_STEPS;

  // If complete/done, all steps are done
  if (stage.includes('complete') || stage.includes('done') || stage === 'wizard_complete') {
    return { completed: total, total, incompleteSteps: [] };
  }

  // Determine current step from stage
  let currentStepNumber = 0;

  if (stage.includes('wizard_step_')) {
    const match = stage.match(/wizard_step_(\d+)/);
    if (match) {
      currentStepNumber = parseInt(match[1], 10);
    }
  } else if (stage.includes('portal_entered') || stage.includes('wizard_started')) {
    currentStepNumber = 1;
  } else if (stage.includes('pending')) {
    currentStepNumber = 0;
  }

  // Completed = current step number (if on step 3, steps 1-2 are done, step 3 in progress)
  // Actually: if on step 3, it means step 1 and 2 are complete, step 3 is current
  const completed = Math.max(0, currentStepNumber - 1);

  // Incomplete steps are from currentStepNumber onwards
  const incompleteSteps = ONBOARDING_STEPS
    .filter(s => s.number >= currentStepNumber || (currentStepNumber === 0 && s.number >= 1))
    .map(s => s.title);

  return { completed, total, incompleteSteps };
}
