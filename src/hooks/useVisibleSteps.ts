import { useMemo } from "react";
import { SetupStep, StepBranch } from "@/types/database";

export interface VisibleStep extends SetupStep {
  isLocked: boolean;
  lockReason?: string;
  branchPath?: string;
  depth: number;
  hasLockedBranches?: boolean;
}

interface UseVisibleStepsParams {
  allSteps: SetupStep[];
  branches: Record<string, StepBranch[]>;
  branchChoices: Record<string, string>; // stepId -> branchId chosen
  completedSteps: Set<string>;
}

export function useVisibleSteps({
  allSteps,
  branches,
  branchChoices,
  completedSteps,
}: UseVisibleStepsParams): { visibleSteps: VisibleStep[]; hasLockedSteps: boolean } {
  return useMemo(() => {
    if (allSteps.length === 0) {
      return { visibleSteps: [], hasLockedSteps: false };
    }

    const stepsById = new Map(allSteps.map(s => [s.id, s]));
    const visibleSteps: VisibleStep[] = [];
    const visitedIds = new Set<string>();
    let hasLockedSteps = false;

    // Find the first step (lowest step_order)
    const sortedSteps = [...allSteps].sort((a, b) => a.step_order - b.step_order);
    let currentStep: SetupStep | undefined = sortedSteps[0];

    // Walk through the flow
    while (currentStep && !visitedIds.has(currentStep.id)) {
      visitedIds.add(currentStep.id);
      const stepBranches = branches[currentStep.id] || [];
      const isBranchPoint = currentStep.is_branch_point || stepBranches.length > 0;

      if (isBranchPoint && stepBranches.length > 0) {
        // Check if user has made a choice for this branch point
        const chosenBranchId = branchChoices[currentStep.id];
        const chosenBranch = stepBranches.find(b => b.id === chosenBranchId);

        if (chosenBranch && chosenBranch.next_step_id) {
          // User made a choice - add current step and continue with chosen path
          visibleSteps.push({
            ...currentStep,
            isLocked: false,
            branchPath: chosenBranch.condition_label,
            depth: 0,
            hasLockedBranches: false,
          });

          // Follow the chosen branch
          currentStep = stepsById.get(chosenBranch.next_step_id);
        } else if (completedSteps.has(currentStep.id)) {
          // Step completed but no branch chosen yet - might have default next
          visibleSteps.push({
            ...currentStep,
            isLocked: false,
            depth: 0,
            hasLockedBranches: true,
          });

          // Check for default next step
          if (currentStep.default_next_step_id) {
            currentStep = stepsById.get(currentStep.default_next_step_id);
          } else {
            // No choice made and no default - show locked indicator
            hasLockedSteps = true;
            break;
          }
        } else {
          // Branch point not yet reached - add current step and show locked indicator
          visibleSteps.push({
            ...currentStep,
            isLocked: false,
            depth: 0,
            hasLockedBranches: true,
          });

          hasLockedSteps = true;
          break;
        }
      } else {
        // Regular step (not a branch point)
        visibleSteps.push({
          ...currentStep,
          isLocked: false,
          depth: 0,
        });

        // Move to next step
        if (currentStep.default_next_step_id) {
          currentStep = stepsById.get(currentStep.default_next_step_id);
        } else {
          // Find next step by step_order
          const currentOrder = currentStep.step_order;
          const nextStep = sortedSteps.find(
            s => s.step_order > currentOrder && !visitedIds.has(s.id)
          );
          currentStep = nextStep;
        }
      }
    }

    return { visibleSteps, hasLockedSteps };
  }, [allSteps, branches, branchChoices, completedSteps]);
}
