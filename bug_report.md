# Bug Report: `replace_file_content` Catastrophic Deletion in Large Files

**Severity**: High (Data Loss)
**Component**: `replace_file_content` tool / File System Agent

**Description**:
When attempting to replace a specific markdown section (`### Phase 6: Auth & Billing` and its list items) in a large file (`copilot-instructions.md`, ~540 lines), the tool consistently deletes not only the target section but also subsequent sections (headers, list items) that were NOT part of the `TargetContent`.

**Steps Taken to Investigate**:
1.  **Reproduction Attempt 1 (Isolated File)**: Created `test_bug.md` with just the target section and the subsequent section.
    *   *Result*: **No Bug**. The tool worked correctly.
2.  **Reproduction Attempt 2 (Exact Replica)**: Created `test_bug_exact.md` copying the *exact* text block from the problematic file.
    *   *Result*: **No Bug**. The tool worked correctly.
3.  **Observation of Original Failure**: In the full `copilot-instructions.md` file, the tool deleted lines well beyond the target scope.

**Hypothesis**:
The bug is likely caused by **offset miscalculations** due to special characters present earlier in the large file. `copilot-instructions.md` contains:
*   **Box Drawing Characters** (┌, ─, ┐, etc.) in a large Data Flow diagram (lines ~300-400).
*   **Emojis** (📝, 🔧, 🚀).
*   **Cyrillic Characters**.

It is highly probable that the tool's internal logic for calculating line numbers or byte offsets gets desynchronized when processing these multi-byte or special characters in a large file context, leading it to identify the "end" of the match much later than it should, thus swallowing subsequent content.

**Conclusion**:
The tool is unsafe for use on large files containing complex/special characters when the target is near the end of the file.

**Workaround**:
*   Use `multi_replace_file_content` with smaller, unique anchors.
*   Avoid replacing large blocks in complex files.
*   Manually verify edits in such files.
