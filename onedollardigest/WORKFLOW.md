# One Dollar Digest Workflow

## Category-Specific Instructions

This workflow extends the daily-digest-research policy with category-specific dimensions and quality gates.

## Coverage Map

### Core Dimensions

1. **Monetary Policy**
   - Central bank decisions (Fed, ECB, PBOC, BoE)
   - Interest rate changes and forward guidance
   - Quantitative tightening/easing announcements

2. **Banking & Financial Markets**
   - Major bank earnings/M&A
   - Wall Street movements and market indicators
   - Credit spreads and banking sector stress

3. **Currency Markets**
   - USD, EUR, CNY exchange rate movements
   - FX intervention by central banks
   - Cross-currency basis swaps and liquidity flows

4. **Precious Metals**
   - Gold price action and central bank buying
   - Silver industrial demand and solar/electric vehicles
   - Gold/silver ratio analysis

5. **Geopolitical-Economic Impact**
   - Trade war developments
   - Sanctions and energy market impacts
   - Regional economic stability signals

## Targeted Queries Per Dimension

Each dimension must have at least 5 targeted queries covering:

- Specific actors/institutions mentioned in discovery
- Exact events or policy decisions
- Concrete technical indicators or price levels
- One "surprise" query to catch missed stories

## Importance Scoring

- **Score ≥ 0.8**: Major policy changes, significant market moves (>5%), systemic risk events
- **Score 0.5–0.8**: Notable earnings, moderate market moves (2-5%), policy signals
- **Score < 0.5**: Minor news, commentary, or speculative analysis

## Deepening Thresholds

- Confidence level "low" → Always deepen
- Central bank policy stories → Always deepen to primary source
- Market-moving stories → Deepen until high confidence or no new signal

## Output Requirements

- Minimum 3 stories per dimension (or flag as sparse)
- All URLs validated and canonical
- Dates strictly T-1 or T-2 window
- Summary depth per story type table in policy

## Verification Checklist

- All sources are primary or reputable outlets
- No aggregator-only coverage
- Dates match SELECT_FROM_DATE cutoff
- JSON schema validated with jq
