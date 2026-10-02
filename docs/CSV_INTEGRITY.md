# Source CSV integrity

Keep all 1,000 supplied IDs, 22 category labels and exact idea strings unchanged. The original UTF-8 source has 1,001 CRLF record endings, is 153,935 bytes, and has SHA-256 `d47f279eb2cce77a5730e9dbb7ab156bd5675787e18e926cd5434b20ebe8baf9`.

`.gitattributes` marks `content/source/bong_highdeas_1000_revised.csv` as `-text` so Git preserves those exact bytes on Windows and Linux. Its `whitespace=cr-at-eol` rule recognizes the required CRLF endings. Other text and deterministic generated output use LF. Do not normalize the source, accept another hash or rewrite the expected hash to accommodate drift.

`npm run content:validate` checks the raw source hash and exact decoded CSV-to-JSON equality. The public corpus contains 1,000 active entries and retains SHA-256 `f97d063e6cc814db55ca6c551ebf372b5ce38ccf8ab56878c7d961bc81526111`.

The content unit tests reject changed ideas, LF conversion, a BOM, missing final record endings and mixed endings. They also use temporary Git repositories to verify stored and checked-out bytes under `core.autocrlf=true`, `false` and `input`, including generated content and the SQL catalog. These tests leave the application repository unstaged and uncommitted.

These checks run in the normal [v1 engineering verification](V1_LAUNCH.md). The original line-ending investigation and its historical evidence are preserved in the [archive](archive/generated-spec/CSV_INTEGRITY.md); candidate-evidence records are not required for public v1.
