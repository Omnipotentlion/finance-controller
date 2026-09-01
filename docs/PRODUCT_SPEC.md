# Product Specification

## Product
Finance Controller — an AI-powered finance-ops control loop.

## User
Primary user: finance operations analyst/controller at a merchant business.

## Problem
Financial records from different sources can disagree. Manual reconciliation requires checking records, explaining differences, and deciding what can safely be closed.

## Core workflow
Synthetic payment/order/settlement/bank records
→ deterministic reconciliation
→ exception classification
→ AI-assisted investigation
→ safe auto-resolution where evidence is sufficient
→ unresolved exception queue
→ metrics + audit trail.

## What makes it an agent
The system does not merely answer questions. It runs the batch, invokes investigation tools for exceptions, reaches a bounded resolution decision, records evidence, and escalates unresolved cases.

## Product states
- Matched
- Pending/timing difference
- Auto-resolved
- Needs review
- Unresolved/critical

## Success
The complete evaluated batch receives a final state: matched/resolved or explicitly unresolved with a reason.

## Demo
Use one full synthetic batch of 50+ records. Show:
1. batch ingestion
2. processing
3. match rate
4. exception breakdown
5. AI investigation of one meaningful exception
6. safe resolution
7. honest unresolved cases
8. throughput/accuracy evidence.

## Important boundary
No claim that the product represents an official Razorpay internal finance system. It is a buildathon prototype inspired by the Track 04 problem and official example direction.


## Razorpay-domain accuracy notes
The product should represent settlement processing and bank-credit observation as distinct states, use UTR for settlement-to-bank matching, and expose payment/adjustment/fee/tax components when explaining a settlement difference.
