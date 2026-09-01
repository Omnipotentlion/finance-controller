# Evaluation Specification

## Official outputs
- Match rate.
- Exceptions the agent could not resolve.

## Official quality bar
- Throughput.
- Measured accuracy.
- Honest exception list.

## Evaluation design
Run the entire fixed-seed batch.

Ground truth is hidden from the agent and available only to the evaluation harness.

### Match rate
Matched / total evaluated records × 100.

### Exception recall
True exceptions correctly detected / all true exceptions × 100.

### Exception precision
True exceptions correctly detected / all detected exceptions × 100.

### Resolution rate
Detected exceptions safely auto-resolved / detected exceptions × 100.

### Unresolved exception count
Number of detected exceptions that remain unresolved.

### Throughput
Total records processed / elapsed processing time.

## Demo metrics
Show:
1. total batch size
2. match rate
3. measured exception detection accuracy (precision/recall as appropriate)
4. throughput
5. auto-resolution rate
6. exact unresolved exception count/list

Always show denominators.

## Integrity
- No cherry-picked subset.
- No post-hoc ground-truth edits.
- No removal of failed cases.
- Do not report a metric without its denominator.
- Separate deterministic batch throughput from optional LLM investigation latency so the measurement is understandable.
