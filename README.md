# vue-unused

A CLI tool for detecting dead code and dead exports in Vue3 projects. It analyzes staged git changes and reports unused files, exports, and configs with confidence scores.

## Installation

npm install -g vue-unused

## Usage

In your Vue3 project root:

vue-unused

It will output JSON with segregated results: files, exports, configs.

Each item has confidence percentage and reason.

## Testing the Local CLI with Demo

For non-developers or to test locally without global installation:

1. Ensure Node.js and npm are installed.

2. In the repository root, install dependencies (if not already done): `npm install`

3. Build the tool: `npm run build`

4. Modify some unused files in the demo, e.g., edit `demo/src/unused1.ts` and `demo/src/unused2.vue` to simulate changes.

5. Stage the changes: `git add demo/src/unused1.ts demo/src/unused2.vue`

6. Run the local CLI on the demo: `./bin/cli.js --path demo`

7. The tool will output JSON results showing unused files and exports with confidence scores.

### Example

After staging `demo/src/unused1.ts` and `demo/src/unused2.vue`:

Command: `./bin/cli.js --path demo`

Sample Output:
```json
{
  "files": [
    {
      "category": "files",
      "item": "src/unused1.ts",
      "confidence": 100,
      "reason": "File not reachable from entry points"
    },
    {
      "category": "files",
      "item": "src/unused2.vue",
      "confidence": 100,
      "reason": "File not reachable from entry points"
    }
  ],
  "exports": [
    {
      "category": "exports",
      "item": "src/unused1.ts:unusedFunc",
      "confidence": 100,
      "reason": "Export not imported"
    },
    {
      "category": "exports",
      "item": "src/unused2.vue:unusedVar",
      "confidence": 100,
      "reason": "Export not imported"
    }
  ],
  "configs": []
}
```

## Demo

See demo/ for a sample Vue3 project with used and unused code.