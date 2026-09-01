# Frontend Specification

## Design goal
Create a premium fintech control center, not a generic monotonous admin dashboard and not a Razorpay UI clone.

Use a distinct Finance Controller visual identity while maintaining professional fintech clarity.

## Core screens

### 1. Control Center
Hero metrics:
- records processed
- match rate
- exceptions
- unresolved
- throughput

Visual control pulse:
Processed → matched → resolved → unresolved.

### 2. Reconciliation Flow
Show the money trail:
Payment → Settlement Item → Settlement → Bank.

For each selected case show expected vs actual amounts and evidence.

### 3. AI Investigation
Hero interaction:
- issue summary
- evidence
- root-cause explanation
- recommended resolution
- confidence/boundary
- action or escalation

### 4. Resolution Queue
Separate:
- auto-resolved
- pending
- needs review
- unresolved

### 5. Control Report
Show full-batch metrics with denominators and honest unresolved exceptions.

## UX principles
- Financial status should be immediately understandable.
- Avoid decorative charts with no decision value.
- Use progressive disclosure for complex evidence.
- Make exceptions visually prominent.
- Use motion only to explain state changes.
- Never hide unresolved cases.
- Do not imitate Razorpay branding or copy its interface.
