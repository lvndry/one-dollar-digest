# One Dollar Digest

A daily economic and financial news digest workflow that processes news in a strict 24-48 hour window.

## Overview

Implements the `daily-digest-research` policy with strict date filtering and quality controls.

## Directory Structure

```
onedollardigest/
├── WORKFLOW.md          # Category-specific workflow rules
├── config/
│   └── workflow.json    # Structured configuration
├── scripts/
│   ├── run-digest.sh    # Bash driver for execution
│   └── onedollardigest.py # Python implementation
├── config/workflow.json
└── output/              # Generated digest files
```

## Key Features

- **Strict Date Filtering**: Only processes articles from the last 24-48 hours
- **Multi-Dimension Coverage**: Monetary policy, banking markets, currencies, precious metals, geopolitical-economic impacts
- **Quality Gates**:
  - Minimum 3 stories per dimension
  - Confidence threshold ≥ 0.7
  - JSON schema validation
- **Full Validation**: Source URL verification, date gating, deduplication

## Usage

```bash
# Run the digest workflow
cd onedollardigest/scripts
./run-digest.sh
```

## Configuration

Edit `config/workflow.json` to customize:

- Coverage dimensions
- Query templates
- Importance scoring thresholds
- Targeted query count per dimension

## Validation

All output files are validated with `jq` to ensure:

- Valid JSON syntax
- Proper schema compliance
- Source URL canonicalization
