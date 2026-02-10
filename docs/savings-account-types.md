# Savings Module — Account Types & Valuation Strategy

This document defines each account type to be supported in the savings module, along with valuation formulas, required user inputs, and data storage strategy.

---

## Design Principles

1. **Simplicity over accuracy** — except for the PEA which already has a precise transaction-based system.
2. **Unified overview** — all accounts feed into a single "total net worth" dashboard.
3. **Minimal user effort** — prefer formulas that derive values from a few inputs over requiring frequent manual updates.
4. **Graceful diversity** — each account type has different mechanics; the system must accommodate them without over-generalizing.

---

## Account Type Classification

| Account Type | French Name | Valuation Method | Update Frequency |
|---|---|---|---|
| PEA | Plan d'Épargne en Actions | Live (transactions + market prices) | Real-time |
| Compte Courant | Compte Courant | Manual snapshot | When user wants |
| Intéressement | Prime d'Intéressement | Manual per-deposit value | ~Yearly or when checking UI |
| PEL | Plan d'Épargne Logement | Formula (compound interest) | Rate changes (rare) |
| Livret A | Livret A | Formula (simple interest) | Rate changes (~twice/year) |
| Assurance-Vie | Assurance-Vie | Hybrid (contributions + annual yield) | ~Yearly |

---

## 1. PEA (Plan d'Épargne en Actions)

### Definition
The PEA is a French tax-advantaged brokerage account for investing in European equities and eligible ETFs. After a 5-year holding period, capital gains and dividends are exempt from income tax (only social contributions of 17.2% apply). The account has a deposit ceiling of €150,000 (but the value can exceed this through gains). It supports buy/sell transactions of individual stocks and ETFs.

### Valuation
**Already implemented.** The current system tracks individual transactions and fetches live market prices to compute:

```
Current Value = Σ (quantity_i × current_price_i)  for each position i
Gain/Loss = Current Value − Total Invested
XIRR = annualized return based on cashflow dates
```

### Required Inputs
- Individual buy/sell transactions (date, asset, quantity, price, fees, TTF)
- Current market prices (fetched automatically)
- Annual end-of-year portfolio value (for year-over-year XIRR)

### Storage
Already in place:
- `accounts.json` — account metadata
- `transactions/{accountId}.json` — transaction records
- `annual-values/{accountId}.json` — year-end snapshots

### Changes Needed
- Extend `SavingsAccount.type` to include new types (currently only `'PEA' | 'Life Insurance' | 'Other'`)
- The PEA account remains unchanged in behavior

---

## 2. Compte Courant (Current / Checking Account)

### Definition
The Compte Courant is a standard French current account (checking account) used for daily expenses — salary deposits, bill payments, card transactions. It produces no interest and no savings. Its balance fluctuates daily. There is no investment component; it is purely a cash holding.

### Valuation

```
Current Value = last_recorded_balance
```

This is the simplest account type. The user manually enters their balance whenever they want an up-to-date snapshot. No formula or projection is applied — the value is exactly what the user enters.

### Required Inputs
- **Balance snapshots**: `{ date, balance }` — entered manually by the user

### Storage
```json
// balances/{accountId}.json
[
  { "date": "2026-02-10", "balance": 2340.50 },
  { "date": "2026-01-15", "balance": 1890.00 }
]
```

### UI Behavior
- Show the most recent balance as the current value
- Show the date of last update (so the user knows how stale it is)
- Quick "Update balance" button for fast entry

---

## 3. Prime d'Intéressement (Profit-Sharing Plan)

### Definition
The Prime d'Intéressement is a profit-sharing bonus paid by the employer, typically once a year. The employee can choose to receive it as cash (taxed as income) or invest it in a company savings plan (Plan d'Épargne Entreprise — PEE), where the money is locked for **5 years** (early withdrawal is possible in specific legal cases: marriage, home purchase, etc.). When invested, the employee selects one or more investment strategies (funds) with varying risk profiles. The invested amount can gain or lose value depending on fund performance. The employee can check the current value of each deposit via the company savings plan provider's UI.

### Valuation

```
Current Value = Σ current_value_i  for each deposit i
Total Gain/Loss = Σ (current_value_i − deposit_amount_i)
```

Each deposit is an independent unit with its own timeline and value. There is no formula to predict current value — it depends on fund performance. The user reads the current value from their provider's interface and enters it.

### Required Inputs (per deposit)
| Field | Description |
|---|---|
| `deposit_date` | Date the deposit was made |
| `deposit_amount` | Gross amount deposited |
| `strategy` | Name/description of the chosen fund/strategy |
| `lock_end_date` | Date when funds become available (deposit_date + 5 years) |
| `current_value` | Current value as read from the provider UI |
| `value_date` | Date when `current_value` was last updated |

### Derived Fields
```
gain_loss = current_value − deposit_amount
gain_loss_pct = (current_value − deposit_amount) / deposit_amount × 100
is_unlocked = today >= lock_end_date
```

### Storage
```json
// deposits/{accountId}.json
[
  {
    "id": "int-2024",
    "deposit_date": "2024-05-15",
    "deposit_amount": 3200.00,
    "strategy": "Dynamique (Actions)",
    "lock_end_date": "2029-05-15",
    "current_value": 3450.00,
    "value_date": "2026-02-01"
  },
  {
    "id": "int-2025",
    "deposit_date": "2025-05-20",
    "deposit_amount": 2800.00,
    "strategy": "Équilibré",
    "lock_end_date": "2030-05-20",
    "current_value": 2850.00,
    "value_date": "2026-02-01"
  }
]
```

### UI Behavior
- Show each deposit as a row: amount, strategy, gain/loss, unlock date
- Visual indicator for locked vs. unlocked deposits
- "Update values" flow where user enters current values in batch

---

## 4. PEL (Plan d'Épargne Logement)

### Definition
The PEL (Plan d'Épargne Logement) is a French regulated savings account designed to help build a down payment for a home purchase. It offers a fixed interest rate determined at the time of opening (the rate depends on the generation/vintage of the PEL). The account has a maximum balance ceiling of €61,200. Once closed to new deposits, the existing balance continues to accrue interest annually.

**Key rules:**
- The interest rate is fixed for the lifetime of the PEL (set at opening).
- PELs opened **before January 1, 2018**: interest is exempt from income tax for the first 12 years (only social contributions of 17.2% apply). After 12 years, the flat tax of 30% applies (12.8% IR + 17.2% PS).
- PELs opened **after January 1, 2018**: subject to the flat tax of 30% from day one.
- Interest is credited annually (on the anniversary date).

### Valuation
Since the account is **closed** (no new deposits) and the rate is fixed, the balance is fully predictable:

```
Balance(t) = last_known_balance × (1 + net_annual_rate) ^ years_elapsed

where:
  net_annual_rate = gross_rate × (1 − tax_rate)
  tax_rate = 0.172       if opened before 2018 AND age < 12 years
  tax_rate = 0.30        if opened before 2018 AND age ≥ 12 years
  tax_rate = 0.30        if opened after 2018
```

**Simplified approach (recommended):** Since interest is credited once a year and the amounts are modest, recording the balance once per year from the annual statement is perfectly sufficient. The formula above can estimate the value between annual statements.

```
Estimated Balance Today = last_annual_balance × (1 + net_annual_rate × fraction_of_year)

where:
  fraction_of_year = days_since_last_anniversary / 365
```

### Required Inputs
| Field | Description |
|---|---|
| `opening_date` | When the PEL was opened (determines rate and tax regime) |
| `gross_rate` | The fixed interest rate (e.g., 0.025 for 2.5%) |
| `balance` | Current known balance (from last statement) |
| `balance_date` | Date of the last known balance |

### Storage
```json
// In accounts.json — account-level config
{
  "id": "pel-main",
  "name": "PEL",
  "type": "PEL",
  "currency": "EUR",
  "config": {
    "opening_date": "2016-03-15",
    "gross_rate": 0.025
  }
}

// balances/{accountId}.json — periodic balance records
[
  { "date": "2026-01-01", "balance": 42500.00 },
  { "date": "2025-01-01", "balance": 41450.00 }
]
```

### UI Behavior
- Show current estimated balance (formula-derived)
- Show gross rate and applicable tax regime
- Show net annual interest earned
- "Record annual balance" for yearly statement entry

---

## 5. Livret A

### Definition
The Livret A is France's most popular regulated savings account. It is tax-free (no income tax, no social contributions on interest). The interest rate is set by the government and changes periodically (typically revised on February 1 and August 1). The account has a deposit ceiling of **€22,950** (interest earned can push the balance above this cap). Interest is computed on a "quinzaine" basis (bimonthly 15-day periods) and credited on December 31 each year.

### Valuation
Since the account is described as "filled" (at or near the cap), the balance is very stable and predictable:

```
Estimated Balance Today = last_known_balance + accrued_interest

where:
  accrued_interest = last_known_balance × current_rate × (full_quinzaines_elapsed / 24)
  
  (There are 24 quinzaines in a year: 2 per month × 12 months)
```

**Simplified approach (recommended):** Given the tax-free nature and the small amounts involved, a simple annual projection is sufficient:

```
Estimated Balance Today ≈ last_known_balance × (1 + current_rate × fraction_of_year)

where:
  fraction_of_year = days_since_last_jan_1 / 365
```

When the rate changes (e.g., Feb 1), the user updates the rate in the app. The formula auto-adjusts.

### Required Inputs
| Field | Description |
|---|---|
| `current_rate` | The current annual interest rate (e.g., 0.024 for 2.4%) |
| `balance` | Current known balance (from last statement or Dec 31 credit) |
| `balance_date` | Date of the last known balance |

### Storage
```json
// In accounts.json — account-level config
{
  "id": "livret-a",
  "name": "Livret A",
  "type": "LivretA",
  "currency": "EUR",
  "config": {
    "current_rate": 0.024
  }
}

// balances/{accountId}.json
[
  { "date": "2026-01-01", "balance": 23050.00 },
  { "date": "2025-01-01", "balance": 22510.00 }
]
```

### UI Behavior
- Show current estimated balance with accrued interest
- Show current rate (editable — user updates when rate changes)
- Show projected year-end balance
- Show projected annual interest earned

---

## 6. Assurance-Vie (Life Insurance Savings)

### Definition
The Assurance-Vie is a French life insurance savings contract, widely used as a medium/long-term savings vehicle. It is **not** life insurance in the Anglo-Saxon sense — it's primarily an investment wrapper with tax advantages. The policyholder makes regular contributions (e.g., monthly) and the capital grows based on the fund's performance. There are two main fund types:
- **Fonds en euros**: capital-guaranteed, low yield (typically 1-3%/year). The insurer announces the annual yield in January for the previous year.
- **Unités de compte (UC)**: market-linked, no capital guarantee, higher potential returns.

**Tax rules** (simplified):
- Gains are only taxed upon withdrawal.
- Before 8 years: flat tax of 30% on gains.
- After 8 years: annual allowance of €4,600 (single) / €9,200 (couple) on gains, then 24.7% (7.5% IR + 17.2% PS) on excess. Very favorable.

The user describes a fonds en euros contract with monthly contributions and an annual yield announcement.

### Valuation
The balance evolves through two mechanisms: monthly deposits and annual interest.

```
Estimated Balance Today = last_year_end_balance 
                        + (monthly_contribution × months_elapsed_this_year)
                        + estimated_accrued_interest

where:
  estimated_accrued_interest = last_year_end_balance × estimated_yield × fraction_of_year
  
  (estimated_yield can be last year's announced yield as a rough estimate)
```

**Simplified approach (recommended):** Record the balance from the annual statement (received in January) and add monthly contributions since then:

```
Estimated Balance Today = last_annual_balance + (monthly_contribution × months_since_statement)
```

This ignores intra-year interest (which is small and only credited at year-end anyway), keeping things simple and reasonably accurate.

### Required Inputs
| Field | Description |
|---|---|
| `opening_date` | Contract opening date (determines tax regime) |
| `monthly_contribution` | Current monthly deposit amount |
| `last_annual_yield` | Last announced annual yield (e.g., 0.028 for 2.8%) |
| `balance` | Balance from last annual statement |
| `balance_date` | Date of last annual statement |

### Storage
```json
// In accounts.json — account-level config
{
  "id": "av-main",
  "name": "Assurance-Vie",
  "type": "AssuranceVie",
  "currency": "EUR",
  "config": {
    "opening_date": "2020-06-01",
    "monthly_contribution": 200,
    "last_annual_yield": 0.028
  }
}

// balances/{accountId}.json
[
  { "date": "2026-01-15", "balance": 15200.00 },
  { "date": "2025-01-20", "balance": 12800.00 }
]
```

### UI Behavior
- Show current estimated balance (last annual + monthly contributions since)
- Show monthly contribution amount (editable)
- Show last annual yield
- Show contract age and applicable tax regime
- "Record annual balance" for yearly statement entry

---

## Data Model & Storage Strategy

### Extended Account Types

The `SavingsAccount.type` union must be extended:

```typescript
type AccountType = 'PEA' | 'CompteCourant' | 'Interessement' | 'PEL' | 'LivretA' | 'AssuranceVie';
```

### Unified SavingsAccount Model

```typescript
interface SavingsAccount {
  id: string;
  name: string;
  type: AccountType;
  description?: string;
  currency: string;
  isDefault?: boolean;
  config?: AccountConfig;  // NEW — type-specific configuration
}

// Discriminated union for type-specific config
type AccountConfig =
  | PEAConfig
  | CompteCourantConfig
  | InteressementConfig
  | PELConfig
  | LivretAConfig
  | AssuranceVieConfig;

interface PEAConfig {
  type: 'PEA';
  // No extra config — behavior driven by transactions
}

interface CompteCourantConfig {
  type: 'CompteCourant';
  // No extra config — just balance snapshots
}

interface InteressementConfig {
  type: 'Interessement';
  lock_years: number;  // Typically 5
}

interface PELConfig {
  type: 'PEL';
  opening_date: string;   // ISO date
  gross_rate: number;      // e.g., 0.025
}

interface LivretAConfig {
  type: 'LivretA';
  current_rate: number;    // e.g., 0.024
}

interface AssuranceVieConfig {
  type: 'AssuranceVie';
  opening_date: string;         // ISO date
  monthly_contribution: number; // e.g., 200
  last_annual_yield: number;    // e.g., 0.028
}
```

### Storage File Layout

```
data/savings/
├── accounts.json                      # All account metadata + config
├── transactions/
│   └── pea-main.json                  # PEA transactions (existing)
├── balances/
│   ├── compte-courant.json            # Balance snapshots
│   ├── pel-main.json                  # Annual balance records  
│   ├── livret-a.json                  # Annual balance records
│   └── av-main.json                   # Annual balance records
├── deposits/
│   └── interessement.json             # Individual deposit records
└── annual-values/
    └── pea-main.json                  # Year-end PEA values (existing)
```

### Valuation Dispatch

Each account type has its own valuation function, but all return a common result:

```typescript
interface AccountValuation {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  currentValue: number;          // Estimated value right now
  totalContributed: number;      // Total money put in
  totalGainLoss: number;         // currentValue − totalContributed
  gainLossPercentage: number;    // (gainLoss / contributed) × 100
  lastUpdated: string;           // Date of last data point
  isEstimated: boolean;          // true if value is formula-derived (not a real snapshot)
}
```

The dashboard calls a unified function:

```typescript
function getAccountValuation(account: SavingsAccount): AccountValuation {
  switch (account.type) {
    case 'PEA':           return valuatePEA(account);
    case 'CompteCourant': return valuateCompteCourant(account);
    case 'Interessement': return valuateInteressement(account);
    case 'PEL':           return valuatePEL(account);
    case 'LivretA':       return valuateLivretA(account);
    case 'AssuranceVie':  return valuateAssuranceVie(account);
  }
}

function getTotalNetWorth(): { total: number; accounts: AccountValuation[] } {
  const accounts = getAllSavingsAccounts();
  const valuations = accounts.map(getAccountValuation);
  const total = valuations.reduce((sum, v) => sum + v.currentValue, 0);
  return { total, accounts: valuations };
}
```

---

## Summary Table

| Account | Valuation Source | User Effort | Update Trigger |
|---|---|---|---|
| **PEA** | Live market prices + transactions | Per-transaction entry | Automatic (price fetch) |
| **Compte Courant** | Manual balance entry | ~30 seconds | Whenever user wants |
| **Intéressement** | Manual per-deposit current value | ~2 min (read from provider UI) | Yearly or on-demand |
| **PEL** | Formula from rate + last balance | ~30 seconds/year | Annual statement |
| **Livret A** | Formula from rate + last balance | ~30 seconds/year | Annual statement + rate changes |
| **Assurance-Vie** | Last balance + monthly contributions | ~1 min/year | Annual statement |

---

## Implementation Priority

1. **Extend data model** — new `AccountType` union, `AccountConfig`, `BalanceRecord`, `DepositRecord` types
2. **Balance snapshot system** — generic read/write for `balances/{accountId}.json` (serves Compte Courant, PEL, Livret A, Assurance-Vie)
3. **Deposit system** — read/write for `deposits/{accountId}.json` (serves Intéressement)
4. **Valuation functions** — one per account type, all returning `AccountValuation`
5. **Net Worth dashboard** — overview page showing all accounts and total
6. **Account creation UI** — form that adapts based on selected type (shows relevant config fields)
7. **Per-account detail pages** — type-specific views (balance history, deposit list, etc.)
