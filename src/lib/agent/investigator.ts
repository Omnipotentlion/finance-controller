import { prisma } from '../db'
import { getRelatedRecords, runReconciliationCheck } from './tools'
import { evaluateResolutionPolicy } from '../resolution/engine'
import { ExceptionCategory } from '../synthetic/types'
import { gemini, INVESTIGATION_SCHEMA } from './gemini'

export interface InvestigationResult {
  paymentId: string
  exceptionType: ExceptionCategory | null
  initialStatus: 'matched' | 'exception'
  finalStatus: 'matched' | 'auto_resolved' | 'needs_review' | 'unresolved'
  rootCauseExplanation: string
  proposedResolution: string
  policyRuleApplied: string
  evidence: Record<string, any>
  aiConfidence?: number
  aiEvidenceUsed?: string[]
}

export async function investigateRecord(
  paymentId: string
): Promise<InvestigationResult> {
  const check = await runReconciliationCheck(paymentId)

  if ('error' in check) {
    throw new Error(String(check.error))
  }

  const related = await getRelatedRecords(paymentId)

  if (check.status === 'matched') {
    return {
      paymentId,
      exceptionType: null,
      initialStatus: 'matched',
      finalStatus: 'matched',
      rootCauseExplanation: 'All financial checks passed cleanly.',
      proposedResolution: 'No action required.',
      policyRuleApplied: 'RULE_MATCHED_CLEAN',
      evidence: check.evidence,
    }
  }

  const exceptionType = check.exceptionType

  const investigationInput = {
    paymentId,
    exceptionType,
    deterministicCheck: {
      reason: check.reason,
      expectedValues: check.expectedValues,
      actualValues: check.actualValues,
      evidence: check.evidence,
    },
    relatedRecords: related,
  }

  const prompt = `
You are LedgerAnalyser Investigator.

Your job is to investigate ONE deterministic financial reconciliation exception.

IMPORTANT RULES:
- Use ONLY the supplied evidence.
- Do not invent missing records, amounts, dates, UTRs or explanations.
- Do not access or infer hidden ground truth.
- Do not perform authoritative financial arithmetic.
- Do not change source records.
- You may PROPOSE an action, but a deterministic policy engine makes the final decision.
- If evidence is insufficient, choose needs_review.
- A timing_difference may only be proposed for auto-resolution when the supplied evidence explicitly shows it is inside the configured SLA.
- Financial discrepancies such as amount mismatches, missing settlements, duplicate payments, UTR mismatches and fee errors should normally be escalated.

Return only the requested structured result.

CASE:
${JSON.stringify(investigationInput, null, 2)}
`

  const interaction = await gemini.interactions.create({
    model: 'gemini-3.6-flash',
    input: prompt,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: INVESTIGATION_SCHEMA,
    },
  })

  const outputText = interaction.output_text

  if (!outputText) {
    throw new Error('Gemini returned no text output')
  }

  const aiResult = JSON.parse(outputText)

  if (
    typeof aiResult.rootCause !== 'string' ||
    !Array.isArray(aiResult.evidenceUsed) ||
    typeof aiResult.confidence !== 'number' ||
    ![
      'auto_resolve',
      'escalate_unresolved',
      'needs_review',
    ].includes(aiResult.proposedAction)
  ) {
    throw new Error('Gemini returned an invalid investigation result')
  }

  const boundedConfidence = Math.max(
    0,
    Math.min(1, aiResult.confidence)
  )

  const decision = evaluateResolutionPolicy(
    exceptionType,
    check.evidence,
    aiResult.proposedAction
  )

  await prisma.reconciliationResult.updateMany({
    where: { record_id: paymentId },
    data: {
      status: decision.finalStatus,
      ai_explanation: aiResult.rootCause,
      ai_resolution_reason: decision.reason,
    },
  })

  return {
    paymentId,
    exceptionType,
    initialStatus: check.status,
    finalStatus: decision.finalStatus,
    rootCauseExplanation: aiResult.rootCause,
    proposedResolution: aiResult.controllerNote,
    policyRuleApplied: decision.policyRule,
    evidence: check.evidence,
    aiConfidence: boundedConfidence,
    aiEvidenceUsed: aiResult.evidenceUsed,
  }
}
export async function investigateBatchExceptions(
  batchId: string
): Promise<InvestigationResult[]> {
  const results = await prisma.reconciliationResult.findMany({
    where: { batch_id: batchId },
  })

  const exceptions = results.filter(
    (r) =>
      r.status === 'exception' ||
      r.status === 'unresolved' ||
      r.status === 'needs_review'
  )

  const investigations: InvestigationResult[] = []

  for (const exception of exceptions) {
    const investigation = await investigateRecord(exception.record_id)
    investigations.push(investigation)
  }

  return investigations
}