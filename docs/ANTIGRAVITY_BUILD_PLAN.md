# Antigravity Build Plan: Finance Controller

## 1. FINAL TECH STACK
* **Frontend:** Next.js (React), Tailwind CSS.
* **Backend:** Next.js API Routes (Serverless functions).
* **Database:** PostgreSQL.
* **ORM:** Prisma (for strict typing and simple schema management).
* **Gemini Integration:** Google Gemini API (via `@google/genai` or standard SDK) exposed as a structured tool-calling agent.
* **Testing:** Jest (for deterministic reconciliation logic, data generation, and API endpoint testing).
* **Deployment:** Vercel (for Next.js frontend + API) and Supabase or similar managed PostgreSQL database.

## 2. PROJECT STRUCTURE
```text
/
├── docs/                      # Specification documents
├── prisma/
│   └── schema.prisma          # Database schema (tables, fields, relations)
├── src/
│   ├── app/                   # Next.js App Router (Frontend)
│   │   ├── api/               # Backend API Routes (ingest, reconcile, investigate)
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Control Center dashboard
│   ├── components/            # Reusable UI components (Hero metrics, tables)
│   ├── lib/
│   │   ├── db.ts              # Prisma client initialization
│   │   ├── reconciliation.ts  # Deterministic reconciliation engine rules
│   │   ├── agent.ts           # AI agent logic and tool definitions
│   │   └── metrics.ts         # Evaluation metrics calculation
│   └── scripts/
│       └── seed_synthetic.ts  # Scenario manifest -> DB ingestion script
├── tests/                     # Jest test suites
├── package.json
└── next.config.mjs
```

## 3. DATABASE DESIGN
**Tables:**
* `orders`
* `payments`
* `settlements`
* `settlement_items`
* `bank_transactions`
* `reconciliation_results` (Application results)
* `ground_truth` (Locked isolation table, explicitly disconnected from standard application queries and AI tools)

**Important Fields & Relationships:**
* `payments`: `id` (PK), `order_id`, `amount`, `status`, `created_at`
* `settlements`: `id` (PK), `utr` (unique), `status` (e.g. processed), `amount`, `created_at`
* `settlement_items`: `id` (PK), `settlement_id` (FK), `payment_id` (FK), `type` (payment, refund, adjustment), `gross_amount`, `fee`, `tax`, `net_amount`
* `bank_transactions`: `id` (PK), `utr` (unique), `amount`, `type` (credit, debit), `transaction_date`
* `reconciliation_results`: `id` (PK), `record_type`, `record_id`, `status` (Matched, Pending, Auto-resolved, Needs review, Unresolved), `exception_type`, `ai_explanation`, `ai_resolution_reason`
* `ground_truth`: `id` (PK), `record_type`, `record_id`, `expected_status`, `expected_exception_type`

**Indexes:**
* `payments(order_id)`
* `settlement_items(payment_id)`
* `settlement_items(settlement_id)`
* `settlements(utr)`
* `bank_transactions(utr)`

**Ground-Truth Isolation:**
The `ground_truth` table is strictly for the evaluation script calculating metrics at the end of the batch. It will never be queried by the API routes accessed by the frontend, nor will the AI agent tools have permission/code paths to read from it.

## 4. SYNTHETIC DATA PIPELINE
1. **Scenario Manifest:** A JSON or TypeScript array defines the exact 50+ test cases (e.g., Case 1: Normal, Case 2: Amount Mismatch, Case 3: Missing Bank Credit).
2. **Synthetic Records:** The script generates `orders`, `payments`, `settlements`, `settlement_items`, and `bank_transactions` based on the manifest, explicitly applying declared fees/taxes rather than a universal rate.
3. **Locked Ground Truth:** The script saves the expected outcome of each scenario into the isolated `ground_truth` table.
4. **Application Database:** The raw financial records are persisted to PostgreSQL.
5. **Reconciliation:** The deterministic engine runs against the application data, identifying matches and exceptions, outputting to `reconciliation_results`.
6. **Evaluation:** An external script or isolated API route compares `reconciliation_results` against `ground_truth` to compute precision, recall, and exact accuracy.

## 5. RECONCILIATION ENGINE
| Rule | Input | Check | Expected Result | Exception Produced |
|---|---|---|---|---|
| **Payment Linkage** | Payment ID | Check `settlement_items` for a matching `payment_id`. | Item exists. | `missing_settlement` |
| **Settlement Arithmetic** | Settlement ID, linked `settlement_items` | `SUM(gross_amount + adjustment - fee - tax)` across items. | Sum == `settlement.amount`. | `fee_calculation_error` or `amount_mismatch` |
| **Batch Total** | Settlement ID | Verify `settlement_items` net amounts sum to settlement header amount. | Sum == `settlement.amount`. | `amount_mismatch` |
| **UTR Match** | Settlement UTR | Lookup `bank_transactions` by UTR. | Exact matching UTR exists. | `utr_mismatch` or `missing_bank_credit` |
| **Bank Amount** | Settlement Amount, Bank Transaction Amount | Compare `settlement.amount` to `bank_transaction.amount`. | Amounts are identical. | `amount_mismatch` |
| **Timing Window** | Settlement Status, Bank Transaction | If settlement `processed` but bank missing, check if SLA window implies it is pending vs overdue (based on synthetic config, not hardcoded). | Within SLA. | `timing_difference` (if inside SLA) or `missing_bank_credit` (if SLA breached). |
| **Duplicate Check** | Payment ID, UTR | Count `settlement_items` per payment; count bank txs per UTR. | Count == 1. | `duplicate_payment` |

## 6. AI AGENT
* **Tools:**
  1. `get_transaction_context(id)`: Fetch basic payment/settlement info.
  2. `get_related_records(id)`: Fetch full linkage (Payment -> Items -> Settlement -> Bank).
  3. `run_reconciliation_check(id)`: Execute deterministic rule and return granular failure.
  4. `compare_expected_vs_actual(id)`: Returns difference in expected vs actual values.
  5. `create_resolution_proposal(id, reason, safe_rule_id)`: Drafts a proposal.
  6. `mark_auto_resolved(id, reason)`: Marks as resolved (guarded in backend).
  7. `mark_unresolved(id, reason)`: Marks as unresolved, pushing to human queue.
* **Inputs:** Mismatched record ID, exception type from deterministic engine.
* **Outputs:** Explanation string, resolution action (resolve/unresolve), and reasoning.
* **Investigation flow:** Receive exception -> `get_related_records` -> `run_reconciliation_check` -> Explain root cause -> Decide if it falls under a known safe auto-resolve policy -> Resolve or Unresolve.
* **Safety Boundaries:** Agent cannot run direct raw SQL, cannot access `ground_truth`, cannot invent missing records, and cannot update transaction data.
* **Auto-resolution Policy:** Can only use `mark_auto_resolved` if the deterministic evidence perfectly matches a strict pre-coded scenario (e.g., a legitimate `timing_difference` inside SLA).
* **Unresolved-case Handling:** If evidence is missing, conflicting, or requires arithmetic interpretation without a safe rule, the agent MUST call `mark_unresolved` and provide an honest summary of missing evidence.

## 7. API DESIGN
1. `POST /api/pipeline/ingest` - Seeds the DB from the scenario manifest (wipes existing).
2. `POST /api/pipeline/reconcile` - Triggers deterministic engine on full batch.
3. `POST /api/pipeline/investigate` - Triggers AI agent on all exceptions.
4. `GET /api/dashboard/metrics` - Returns match rate, throughput (from DB logs), unresolved count.
5. `GET /api/dashboard/exceptions` - Lists all records by state (Matched, Pending, Auto-resolved, Needs review, Unresolved).
6. `GET /api/dashboard/records/:id` - Detailed view of a single transaction's lifecycle (Payment -> Bank).

## 8. FRONTEND PLAN
Based exactly on `FRONTEND_SPEC.md`:

**Screens:**
1. **Control Center:** Overview dashboard.
2. **Reconciliation Flow:** Visual money trail for selected records.
3. **AI Investigation:** Detail view of the AI's findings.
4. **Resolution Queue:** Tabbed lists of exceptions.
5. **Control Report:** Full batch summary with metrics.

**Major Components:**
* `HeroMetrics`: displays processed records, match rate, throughput.
* `VisualControlPulse`: visual progress bar/stepper (Processed -> matched -> resolved -> unresolved).
* `MoneyTrailVisualizer`: Component rendering Payment -> Settlement Item -> Settlement -> Bank.
* `ExceptionList`: Data table filtering by status tabs.
* `AIInvestigationPanel`: Shows issue summary, evidence, root-cause, confidence, and action taken.

**Interactions:**
* Clicking an exception in the `ExceptionList` opens the `AIInvestigationPanel` and `MoneyTrailVisualizer` for that specific record.

**Data Required:**
* Control Center: `GET /api/dashboard/metrics`.
* Resolution Queue: `GET /api/dashboard/exceptions`.
* AI Investigation/Money Trail: `GET /api/dashboard/records/:id`.

## 9. TESTING
* **Normal matches:** Ensure scenario 1 matches perfectly with no exceptions generated.
* **Every exception type:** Specific scenario seeds tested directly against the reconciliation engine to ensure correct classification.
* **Timing differences:** Test `processed` status against dynamic SLAs (e.g., 2 days vs 4 days) to ensure proper categorization.
* **Settlement arithmetic:** Ensure tests assert correct dynamic component logic (no hardcoded MDR rates).
* **UTR matching:** Test cases where UTR strings are mismatched or null.
* **Duplicate detection:** Seed duplicate settlement items and verify `duplicate_payment` exception.
* **Metrics:** E2E test verifying metric calculation logic against `ground_truth` table.
* **Ground-truth isolation:** Verify API routes and AI tools return `403` or error if attempting to access the `ground_truth` schema.
* **AI safety:** Mock the LLM to return hallucinated financial data and verify the backend tooling rejects it (e.g., trying to call `mark_auto_resolved` without a valid safe rule).

## 10. BUILD ORDER
1. **Project Scaffold:** Init Next.js, Prisma, and PostgreSQL. Define strict database schemas.
2. **Synthetic Pipeline:** Write the scenario manifest and ingestion script (`seed_synthetic.ts`), including locked ground truth isolation.
3. **Deterministic Engine:** Implement all rules in `lib/reconciliation.ts`.
4. **Backend API:** Create the Next.js API routes for ingest, reconcile, and data fetching.
5. **AI Agent Tooling:** Implement Gemini integration and the strict, bounded toolset in `lib/agent.ts`.
6. **Frontend Dashboards:** Build the Control Center, Resolution Queue, and Control Report.
7. **Frontend Investigation UI:** Build the visual Money Trail and AI Investigation panel.
8. **E2E & Metrics:** Wire the full batch pipeline (Ingest -> Reconcile -> AI -> Report) and ensure metrics are 100% accurate against ground truth.

## 11. RISKS
* **LLM Hallucinations on Edge Cases:** The model might try to force a resolution by inventing a fee. Mitigated by strict tool constraints that require pre-coded safe rules to resolve.
* **Sequential AI Bottleneck:** Investigating exceptions one by one might hurt the throughput metric. Mitigated by ensuring the deterministic engine is fast, and using `Promise.all` for parallel agent investigation where possible.
* **Prompt Drift:** Changes to prompts might break structured JSON outputs. Mitigated by using Google's structured output features or strict JSON schema enforcement in the tool definitions.

## 12. SIMPLICITY REVIEW
* **No Microservices:** The entire backend is served via Next.js API routes, keeping it simple.
* **No Vector DB:** Removed. All agent context is structured JSON pulled from SQL.
* **No Auth/Login:** Removed. The prototype focuses entirely on the finance loop.
* **No Queueing Infrastructure (Kafka/RabbitMQ):** Removed. The 50+ batch size is small enough to be processed synchronously or via simple Node.js promises.
* **No Live Razorpay API Setup:** Completely relies on synthetic data per Track 04 alternative directions, bypassing API key management.
