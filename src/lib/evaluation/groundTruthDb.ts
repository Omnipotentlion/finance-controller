import { prisma } from '../db'

/**
 * EVALUATION HARNESS ONLY: Access ground truth labels.
 * This module MUST NOT be imported by application services, API routes, or AI agent tools.
 */
export async function getBatchGroundTruth(batchId: string) {
  return prisma.groundTruth.findMany({
    where: { batch_id: batchId },
  })
}

export async function getGroundTruthRecord(batchId: string, recordType: string, recordId: string) {
  return prisma.groundTruth.findFirst({
    where: {
      batch_id: batchId,
      record_type: recordType,
      record_id: recordId,
    },
  })
}
