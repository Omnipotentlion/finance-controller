# Synthetic Data Specification

## Objective
Create a reproducible, intentionally imperfect dataset that objectively tests the Finance Controller.

## Evaluation batch
Target: 60 primary payment records, satisfying the official 50+ requirement.

## Application data
- orders
- payments
- settlements
- settlement_items
- bank_transactions
- optional refunds
- optional chargebacks

## Evaluation-only data
- ground_truth.json or equivalent isolated table

The agent must never receive ground-truth labels.

## Required properties
- Stable IDs and relationships.
- INR amounts represented consistently.
- Explicit fee, tax and adjustment values.
- Explicit settlement processing and bank-credit timing.
- Fixed random seed/version.
- Known expected outcome for every evaluated record.
- Deliberately planted exceptions.

## Scenario mix
Majority normal cases plus:
- amount mismatch
- missing settlement
- missing bank credit
- duplicate payment
- legitimate timing difference
- UTR mismatch
- fee calculation error
- refund inconsistency where refund data is used
- chargeback inconsistency where chargeback data is used

## Generation order
1. Define scenario/ground-truth manifest.
2. Generate source records from that manifest.
3. Lock ground truth.
4. Load application data.
5. Run the agent.
6. Compare agent output against ground truth.

Never modify ground truth after seeing agent results.

## Important
The official requirement is 50+ records, not 60 specifically. 60 is our implementation target.
