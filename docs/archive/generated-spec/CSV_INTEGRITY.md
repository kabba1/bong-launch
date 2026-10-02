# Source CSV integrity and Git line endings

The original supplied source is UTF-8 with 1,001 CRLF record endings, 153,935 bytes, and SHA-256 `d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9`. Its 1,000 IDs, 22 category labels and exact idea strings remain unchanged.

## Reproduced failure

The initial Git import used `core.autocrlf=true` without a `.gitattributes` rule. The local source matched the supplied file, but Git stored a normalized LF blob: 152,934 bytes, SHA-256 `193263f1faaa7bc9fa0f0253c914e7be97e809e107684d6a0d22f9df836d9b68`. A checkout that retained LF therefore failed `content:validate` with `Source SHA-256 drift`, despite decoding to the same records. This was a real portability defect, not permission to change the expected source hash.

The original failure is retained in the local handoff evidence directory at `.build-evidence/v1/csv-before.json`. `csv-git-red.log` records the regression failing against the old Git behavior (11 passed, one failed). An earlier test-authoring run, `csv-regression-before.log`, also exposed that a mixed-ending fixture fails CSV parsing before reaching the hash check; its assertion was corrected to accept either strict rejection path.

## Correction

`.gitattributes` marks the exact source CSV `-text`, preserving the supplied bytes in both Git's stored blob and every checkout. Its narrow `whitespace=cr-at-eol` rule lets Git recognize the required CRLF endings without flagging them as added trailing whitespace; other whitespace checks remain active. All other Git-detected text uses `text=auto eol=lf`, so source/configuration bytes produce consistent candidate fingerprints across operating systems. Binary artwork stays untouched. Generated content and public data also have explicit `text eol=lf` attributes because their deterministic build output is compared byte for byte, including the SQL catalog. No original CSV bytes or expected hashes have been rewritten. The CSV timestamp was refreshed only to make Git notice the original CRLF bytes under the new rule; the apparent line changes in a Git diff are the restoration of the original record endings to the repository blob.

Existing mixed/CRLF endings were normalized to LF in four fingerprinted text files: `.github/workflows/verify.yml`, `content/legal/.gitkeep`, `content/timeline/.gitkeep`, and `supabase/migrations/202609270001_bong.sql`. This removes five carriage-return bytes with no implementation changes. The exact inventory is retained in `text-line-ending-normalization.json`. Source candidate evidence must be generated after this normalization and after the final code edits, with the `.gitattributes` file included in its hash input. Do not hash a mixture of Windows and LF source checkouts as if they were the same byte candidate.

`scripts/content.ts` retains strict raw-byte SHA-256 validation and exact decoded source-to-JSON equality. Its failure message now identifies the line-ending contract and Git attribute requirement. It does not normalize input, accept multiple hashes or automatically repair tampering.

The content regression tests:

- Reject LF conversion, a UTF-8 BOM, removal of the final record terminator and mixed record endings. Equivalent decoded records do not waive byte integrity.
- Reject edited idea text even if both CSV and JSON are edited together and the JSON's declared source hash is updated.
- Create an isolated temporary Git repository, add the source with `core.autocrlf=true`, inspect its stored blob, and perform real Git checkouts with `core.autocrlf=true`, `false` and `input`.
- Compare each checkout's source and generated public corpus bytes exactly, compare the LF SQL catalog, and run the full content validation on all three checkouts. Representative CRLF TypeScript and package-configuration inputs are also staged and checked out as identical LF bytes in all three modes.

These tests exercise Windows conversion and Linux-style LF checkout settings using Git on the local Windows host. They are not a claim of a separately executed Linux CI job. Temporary fixture repositories are removed after verification; the application repository is neither staged nor committed by the tests.

## Verification and publication

`npx vitest run tests/unit/content.test.ts`: **12 passed** after the correction (`csv-git-green.log`). `npm run content:validate`: **passed** (`csv-content-validate.log`). The public corpus remains SHA-256 `f97d063e6cc814db55ca6c551ebf372b5ce38ccf8ab56878c7d961bc81526111` with all 1,000 entries active. These checks map to DATA-01–07.

When publishing this change, include `.gitattributes` and the original CRLF CSV in the same commit. The existing remote commit is not repaired merely by changing local attributes. A maintainer can explicitly stage the corrected source with `git add --renormalize content/source/bong_highdeas_1000_revised.csv` after adding the attributes, then verify the indexed source hash before committing. Do not replace the expected source hash with the old LF blob's hash. This scope-change task does not commit or push changes.
