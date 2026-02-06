# Implementation Plan - Savings Module

This plan outlines the addition of a `savings` module to MyHomeApp. This module will allow users to track financial investments, starting with French PEA (Plan d'Épargne en Actions) accounts, replacing the need for Google Sheets.

## User Review Required

> [!NOTE]
> **External Libraries**: As agreed, I will use external libraries where appropriate (e.g., for XIRR calculation or charting) to ensure robustness, provided they are free for personal use.
> **Agnostic Price Provider**: I will implement a provider pattern for price tracking. Initially, I'll use `yahoo-finance2` (or similar), wrapped in a generic interface to allow easy switching in the future.

## Proposed Changes

### [Savings Module]

I will follow the subapp-centric organization established in `ORGANIZATION.md`.

#### [NEW] [models/savings/index.ts](file:///e:/Workspace/MyHomeApp/src/models/savings/index.ts)
Define the core data structures:
- `Transaction`: Represents a buy/sell operation (Date, Type, Action/ETF, ISIN, Ticker, Units, Price, Fees, TTF).
- `Position`: Represents the aggregated state of a specific asset (Ticker, Total Units, Average Price, Current Price, Gain/Loss).
- `SavingsAccount`: Represents a collection of transactions (e.g., "PEA").
- `SavingsData`: Top-level structure for the module.

#### [NEW] [lib/savings.ts](file:///e:/Workspace/MyHomeApp/src/lib/savings.ts)
Backend logic for data management:
- `getAllSavingsAccounts()`: Read from `data/savings/accounts.json`.
- `getTransactions(accountId)`: Get transactions for a specific account.
- `addTransaction(accountId, transaction)`: Persistently store new transactions.
- `calculateXIRR(transactions, currentValue)`: Implementation of the XIRR algorithm.

#### [NEW] [pages/api/savings/accounts/index.ts](file:///e:/Workspace/MyHomeApp/src/pages/api/savings/accounts/index.ts)
- `GET`: List available savings accounts.
- `POST`: Create a new savings account.

#### [NEW] [pages/api/savings/transactions/[accountId].ts](file:///e:/Workspace/MyHomeApp/src/pages/api/savings/transactions/[accountId].ts)
- `GET`: Fetch transactions for an account.
- `POST`: Add a new transaction.

#### [NEW] [pages/api/savings/prices.ts](file:///e:/Workspace/MyHomeApp/src/pages/api/savings/prices.ts)
- `GET`: Fetch current prices for tickers using an external provider.

#### [NEW] [components/savings/SavingsDashboard.tsx](file:///e:/Workspace/MyHomeApp/src/components/savings/SavingsDashboard.tsx)
The main view for the savings module, showing a summary of all accounts.

#### [NEW] [components/savings/PEAOverview.tsx](file:///e:/Workspace/MyHomeApp/src/components/savings/PEAOverview.tsx)
Specific view for PEA accounts, including:
- Transaction table (similar to the Google Sheet).
- XIRR display.
- Sparkline/Evolution chart (using CSS-based sparklines or a lightweight library if available).

#### [NEW] [pages/savings.tsx](file:///e:/Workspace/MyHomeApp/src/pages/savings.tsx)
The main entry point for the savings sub-app.

#### [MODIFY] [lib/data.ts](file:///e:/Workspace/MyHomeApp/src/lib/data.ts)
- Update `initializeDataDirectories()` to include `data/savings`.
- Update `getSubApps()` to include the Savings module.

## Verification Plan

### Automated Tests
- I will create a utility test script `scripts/test-xirr.ts` to verify the XIRR calculation against the examples provided in `docs/savings_modules.md`.

### Manual Verification
1. Navigate to `/savings` in the browser.
2. Verify that the "Savings" card appears on the dashboard.
3. Add a sample PEA transaction.
4. Verify that the "Total Amount", "Current Value", and "Gain/Loss" are calculated correctly based on a mocked current price.
5. Verify the XIRR calculation with the sample data from the docs.
