# JSON Format Fix - Claude CLI Output Post-Processing

## Problem

When using `claude --print` to generate JSON output, Claude often wraps the JSON in markdown format with explanatory text:

```
주어진 인시던트들을 빠르게 분류하겠습니다.

```json
[
  { "incident_id": "414038", ... }
]
```

분류 요약:
- False Positive: 6개
...
```

This causes `jq` parsing to fail when merging batch files.

## Solution

Use `sed` to extract only the pure JSON lines before saving to file:

### For JSON Arrays (Pass 1 & Pass 2)

```bash
# Extract lines from [ to ]
cat <<EOF | claude --print --model haiku | sed -n '/^\[/,/^\]/p' > output.json
```

### For JSON Objects (Stage 3)

```bash
# Extract lines from { to }
cat <<EOF | claude --print --model sonnet | sed -n '/^{/,/^}/p' > output.json
```

## Implementation

### 1. pass1-classify-all.sh (Line 70)

**Before:**
```bash
cat <<EOF | claude --print --model haiku > ${OUTPUT_DIR}/batch_${batch}.json
```

**After:**
```bash
cat <<EOF | claude --print --model haiku | sed -n '/^\[/,/^\]/p' > ${OUTPUT_DIR}/batch_${batch}.json
```

### 2. pass2-detailed-analysis.sh (Line 82)

**Before:**
```bash
cat <<EOF | claude --print --model sonnet > ${OUTPUT_DIR}/detailed_batch_${batch}.json
```

**After:**
```bash
cat <<EOF | claude --print --model sonnet | sed -n '/^\[/,/^\]/p' > ${OUTPUT_DIR}/detailed_batch_${batch}.json
```

### 3. generate-final-report.sh (Line 72-74)

**Before:**
```bash
cat <<EOF | claude --print --model sonnet > $OUTPUT_FILE
```

**After:**
```bash
# JSON 블록만 추출: { 로 시작해서 } 로 끝나는 부분
cat <<EOF | claude --print --model sonnet | sed -n '/^{/,/^}/p' > $OUTPUT_FILE
```

## How sed Works

- `sed -n` - Suppress automatic printing
- `/^\[/,/^\]/p` - Print lines from `[` at start of line to `]` at start of line
- `/^{/,/^}/p` - Print lines from `{` at start of line to `}` at start of line

This extracts only the JSON structure, removing:
- Introductory text
- Markdown code blocks (```json)
- Explanatory summaries

## Test Results

**2025-09-06 Test (7 incidents):**
- ✅ Pass 1: Clean JSON array with 7 classifications
- ✅ Pass 2: No detailed analysis needed (0 incidents)
- ✅ Stage 3: Valid JSON object (12KB)
- ✅ Total time: 2 minutes 32 seconds

**Verification:**
```bash
# Pass 1 output
jq 'length' /tmp/pass1_2025-09-06/all_classifications.json
# Output: 7

# Final report structure
jq 'keys' /tmp/final_report_2025-09-06.json
# Output: 16 top-level keys (valid JSON)
```

## Why This Works

1. **Consistent Claude Behavior**: Claude consistently starts JSON with `[` or `{` at the beginning of a line
2. **No False Positives**: Markdown code blocks and explanatory text don't have these patterns
3. **Simple & Reliable**: Uses standard `sed` (no external dependencies)
4. **Preserves All JSON**: Multi-line JSON is preserved (inclusive range)

## Alternative Approaches Considered

1. **Stronger Prompt Instructions** ❌
   - Added "절대 금지" (strictly forbidden) instructions
   - Claude still added markdown and text
   - Not reliable

2. **Python Post-Processing** ❌
   - Requires additional dependencies
   - Overkill for simple text extraction
   - sed is faster and more lightweight

3. **jq Slicing** ❌
   - Cannot parse invalid JSON
   - Would need to work on raw text first

## Maintenance Notes

- If Claude changes output format, update sed patterns
- For nested JSON, current patterns work (inclusive ranges)
- If JSON contains inline `[` or `{` in strings, this still works (looks for start-of-line)

## Related Issues

- Original bug: `/tmp/pipeline_2025-09-06.log` line 175 "Invalid numeric literal"
- Fixed: 2025-11-23
- Files modified:
  - `script/pass1-classify-all.sh`
  - `script/pass2-detailed-analysis.sh`
  - `script/generate-final-report.sh`
