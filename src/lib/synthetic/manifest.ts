import { ScenarioDefinition } from './types'

/**
 * Deterministic scenario manifest defining 60 payment record specifications.
 * All monetary amounts are integers in paise (INR).
 */
export const SCENARIO_MANIFEST: ScenarioDefinition[] = [
  // 1 to 42: Normal Matched Scenarios (42 records)
  ...Array.from({ length: 42 }, (_, i) => ({
    index: i + 1,
    category: 'normal' as const,
    description: `Normal payment record #${i + 1}`,
    grossAmount: (1000 + (i * 150)) * 100, // 1000 INR to 7150 INR in paise
    fee: Math.round(((1000 + (i * 150)) * 100) * 0.02), // 2% MDR
    tax: Math.round(((1000 + (i * 150)) * 100) * 0.02 * 0.18), // 18% GST on MDR
    adjustment: 0,
    daysToBankCredit: 1, // Next-day bank credit (normal SLA)
  })),

  // 43 to 45: Amount Mismatch (3 records)
  {
    index: 43,
    category: 'amount_mismatch',
    description: 'Bank transaction amount differs from settlement amount',
    grossAmount: 500000, // 5,000 INR
    fee: 10000,
    tax: 1800,
    adjustment: 0,
    daysToBankCredit: 1,
    bankAmountOverride: 480000, // Bank received 4,800 INR instead of 4,882 INR net
  },
  {
    index: 44,
    category: 'amount_mismatch',
    description: 'Settlement item net amount mismatch',
    grossAmount: 1200000, // 12,000 INR
    fee: 24000,
    tax: 4320,
    adjustment: 0,
    daysToBankCredit: 1,
    bankAmountOverride: 1100000, // 11,000 INR
  },
  {
    index: 45,
    category: 'amount_mismatch',
    description: 'Gross amount mismatch in payment vs settlement item',
    grossAmount: 850000, // 8,500 INR
    fee: 17000,
    tax: 3060,
    adjustment: 0,
    daysToBankCredit: 1,
    bankAmountOverride: 820000,
  },

  // 46 to 48: Missing Settlement (3 records)
  {
    index: 46,
    category: 'missing_settlement',
    description: 'Payment processed by gateway but missing settlement item record',
    grossAmount: 320000,
    fee: 6400,
    tax: 1152,
    adjustment: 0,
    daysToBankCredit: 1,
    omitSettlement: true,
  },
  {
    index: 47,
    category: 'missing_settlement',
    description: 'Payment exists without settlement item link',
    grossAmount: 640000,
    fee: 12800,
    tax: 2304,
    adjustment: 0,
    daysToBankCredit: 1,
    omitSettlement: true,
  },
  {
    index: 48,
    category: 'missing_settlement',
    description: 'Unsettled payment transaction',
    grossAmount: 150000,
    fee: 3000,
    tax: 540,
    adjustment: 0,
    daysToBankCredit: 1,
    omitSettlement: true,
  },

  // 49 to 51: Missing Bank Credit (3 records)
  {
    index: 49,
    category: 'missing_bank_credit',
    description: 'Settlement completed but no corresponding credit found in bank statement',
    grossAmount: 900000,
    fee: 18000,
    tax: 3240,
    adjustment: 0,
    daysToBankCredit: 10, // Beyond observation window SLA
    omitBankCredit: true,
  },
  {
    index: 50,
    category: 'missing_bank_credit',
    description: 'Settled payment with missing bank transaction record',
    grossAmount: 450000,
    fee: 9000,
    tax: 1620,
    adjustment: 0,
    daysToBankCredit: 12,
    omitBankCredit: true,
  },
  {
    index: 51,
    category: 'missing_bank_credit',
    description: 'Missing bank credit past SLA window',
    grossAmount: 2100000,
    fee: 42000,
    tax: 7560,
    adjustment: 0,
    daysToBankCredit: 15,
    omitBankCredit: true,
  },

  // 52 to 54: Legitimate Timing Difference (3 records)
  {
    index: 52,
    category: 'timing_difference',
    description: 'Settlement processed recently, bank credit expected within SLA (T+2)',
    grossAmount: 750000,
    fee: 15000,
    tax: 2700,
    adjustment: 0,
    daysToBankCredit: 1, // Within T+2 observation window
    omitBankCredit: true, // Bank credit not yet observed in statement batch
  },
  {
    index: 53,
    category: 'timing_difference',
    description: 'Weekend settlement pending bank credit observation within SLA',
    grossAmount: 1800000,
    fee: 36000,
    tax: 6480,
    adjustment: 0,
    daysToBankCredit: 2,
    omitBankCredit: true,
  },
  {
    index: 54,
    category: 'timing_difference',
    description: 'Processing window active, inside SLA threshold',
    grossAmount: 290000,
    fee: 5800,
    tax: 1044,
    adjustment: 0,
    daysToBankCredit: 1,
    omitBankCredit: true,
  },

  // 55 to 56: Duplicate Payment (2 records)
  {
    index: 55,
    category: 'duplicate_payment',
    description: 'Payment ID linked to multiple settlement items',
    grossAmount: 550000,
    fee: 11000,
    tax: 1980,
    adjustment: 0,
    daysToBankCredit: 1,
    duplicateSettlementItem: true,
  },
  {
    index: 56,
    category: 'duplicate_payment',
    description: 'Duplicate payment settlement item entry',
    grossAmount: 980000,
    fee: 19600,
    tax: 3528,
    adjustment: 0,
    daysToBankCredit: 1,
    duplicateSettlementItem: true,
  },

  // 57 to 58: UTR Mismatch (2 records)
  {
    index: 57,
    category: 'utr_mismatch',
    description: 'Bank transaction UTR string differs from settlement UTR string',
    grossAmount: 410000,
    fee: 8200,
    tax: 1476,
    adjustment: 0,
    daysToBankCredit: 1,
    bankUtrOverride: 'UTR999999MISMATCH01',
  },
  {
    index: 58,
    category: 'utr_mismatch',
    description: 'Incorrect UTR reference on bank credit record',
    grossAmount: 1350000,
    fee: 27000,
    tax: 4860,
    adjustment: 0,
    daysToBankCredit: 1,
    bankUtrOverride: 'UTR999999MISMATCH02',
  },

  // 59 to 60: Fee Calculation Error (2 records)
  {
    index: 59,
    category: 'fee_calculation_error',
    description: 'Settlement item net amount calculation does not equal gross - fee - tax',
    grossAmount: 1000000, // 10,000 INR
    fee: 20000,
    tax: 3600,
    adjustment: 0,
    daysToBankCredit: 1,
    corruptSettlementArithmetic: true, // Corrupts net amount math by adding 500 INR error
  },
  {
    index: 60,
    category: 'fee_calculation_error',
    description: 'Arithmetic mismatch between gross/fee/tax components and net settlement item',
    grossAmount: 1600000, // 16,000 INR
    fee: 32000,
    tax: 5760,
    adjustment: 0,
    daysToBankCredit: 1,
    corruptSettlementArithmetic: true,
  },
]
