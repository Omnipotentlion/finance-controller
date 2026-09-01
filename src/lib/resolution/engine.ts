import { ExceptionCategory } from '../synthetic/types'

export type ResolutionAction =
  | 'auto_resolve'
  | 'escalate_unresolved'
  | 'needs_review'

export interface ResolutionPolicyDecision {
  action: ResolutionAction
  finalStatus: 'matched' | 'auto_resolved' | 'needs_review' | 'unresolved'
  allowed: boolean
  policyRule: string
  reason: string
}

export function evaluateResolutionPolicy(
  exceptionType: ExceptionCategory | null,
  evidence: Record<string, any>,
  proposedAction: ResolutionAction
): ResolutionPolicyDecision {

  // Timing differences may only be auto-resolved when
  // the supplied evidence proves they are inside the configured SLA.
  if (exceptionType === 'timing_difference') {
    const configuredSlaHours = Number(evidence.configuredSlaHours)
    const hoursElapsed = Number(evidence.hoursElapsed)
    const bankCreditObserved = evidence.bankCreditObserved

    const safelyVerified =
      bankCreditObserved === false &&
      Number.isFinite(configuredSlaHours) &&
      Number.isFinite(hoursElapsed) &&
      hoursElapsed >= 0 &&
      hoursElapsed <= configuredSlaHours

    if (proposedAction === 'auto_resolve' && safelyVerified) {
      return {
        action: 'auto_resolve',
        finalStatus: 'auto_resolved',
        allowed: true,
        policyRule: 'SAFE_POLICY_TIMING_SLA',
        reason:
          `Timing difference verified: ${hoursElapsed}h elapsed ` +
          `within configured ${configuredSlaHours}h SLA.`,
      }
    }

    return {
      action: 'escalate_unresolved',
      finalStatus: 'unresolved',
      allowed: false,
      policyRule: 'TIMING_EVIDENCE_INSUFFICIENT',
      reason:
        'Timing difference could not be safely verified against the configured SLA.',
    }
  }

  // Financial discrepancies require human review.
  if (
    exceptionType === 'amount_mismatch' ||
    exceptionType === 'missing_settlement' ||
    exceptionType === 'missing_bank_credit' ||
    exceptionType === 'duplicate_payment' ||
    exceptionType === 'utr_mismatch' ||
    exceptionType === 'fee_calculation_error'
  ) {
    if (proposedAction === 'auto_resolve') {
      return {
        action: 'escalate_unresolved',
        finalStatus: 'unresolved',
        allowed: false,
        policyRule: 'GUARDRAIL_REJECTED_UNSAFE_AUTORESOLVE',
        reason:
          `Auto-resolution rejected by policy for ${exceptionType}. ` +
          'Financial discrepancies require human controller investigation.',
      }
    }

    return {
      action: 'escalate_unresolved',
      finalStatus: 'unresolved',
      allowed: true,
      policyRule: 'POLICY_ESCALATE_UNRESOLVED',
      reason:
        `Exception type '${exceptionType}' requires human controller review.`,
    }
  }

  // Unknown state: safest option is human review.
  return {
    action: 'needs_review',
    finalStatus: 'needs_review',
    allowed: true,
    policyRule: 'POLICY_DEFAULT_NEEDS_REVIEW',
    reason:
      'Unrecognized exception state. Assigned to human review queue.',
  }
}