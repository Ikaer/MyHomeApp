# New module: savings module

## 1. Overview

I currently use a google sheet to track:
- The share transactions I made on my PEA (french saving account system with no fiscality after 5 years).
- using the XIRR method to calculate the return of my investment each year and during the year.
- using GOOGLEFINANCE to get the price of the shares and SPARKLINE to get the evolution of a position I made since purchase.


## 2. Example of google sheet
this is what my google sheet looks like

Date de l'opération	Type d'opération	Nom de l'action/ETF	Code ISIN	Ticker	Nombre de parts	Prix unitaire	Frais de courtage	TTF	Montant total de l operation	Cours actuel	Valeur actuelle de votre position	Plus/Moins-value latente	Since
6-juin-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	100	5,50 €	0,00 €	0,00 €	549,50 €	6,18 €	618,00 €	68,50 €	
7-juil.-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	100	5,53 €	0,00 €	0,00 €	552,90 €	6,18 €	618,00 €	65,10 €	
11-août-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	80	5,71 €	0,00 €	0,00 €	456,64 €	6,18 €	494,40 €	37,76 €	
3-sept.-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	34	5,74 €	0,00 €	0,00 €	195,13 €	6,18 €	210,12 €	14,99 €	
2-oct.-2025	Achat	Amundi EuroStoxx 50 II UCITS ETF S-Acc	FR001400ZGP1 	EPA:MSES	18	5,28 €	0,00 €	0,00 €	95,09 €	5,63 €	101,34 €	6,25 €	
2-oct.-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	33	5,95 €	0,69 €	0,00 €	196,94 €	6,18 €	203,94 €	7,00 €	
3-nov.-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	32	6,13 €	0,00 €	0,00 €	196,29 €	6,18 €	197,76 €	1,47 €	
3-nov.-2025	Achat	Amundi EuroStoxx 50 II UCITS ETF S-Acc	FR001400ZGP1 	EPA:MSES	18	5,31 €	0,33 €	0,00 €	95,87 €	5,63 €	101,34 €	5,47 €	
2-déc.-2025	Achat	Amundi EuroStoxx 50 II UCITS ETF S-Acc	FR001400ZGP1 	EPA:MSES	18	5,32 €	0,34 €	0,00 €	96,08 €	5,63 €	101,34 €	5,26 €	
2-déc.-2025	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	16	6,08 €	0,34 €	0,00 €	97,59 €	6,18 €	98,88 €	1,29 €	
2-déc.-2025	Achat	VOLTALIA	FR0011995588	EPA:VLTSA	9	7,14 €	0,00 €	0,26 €	64,52 €	7,12 €	64,08 €	-0,44 €	
2-déc.-2025	Achat	FIGEAC AERO	FR0011665280	EPA:FGA	2	11,70 €	0,08 €	0,00 €	23,48 €	10,60 €	21,20 €	-2,28 €	
2-déc.-2025	Achat	VALNEVA	FR0004056851	EPA:VLA	3	3,80 €	0,04 €	0,00 €	11,43 €	4,17 €	12,51 €	1,08 €	
5-janv.-2026	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	389	6,16 €	8,39 €	0,00 €	2 404,24 €	6,18 €	2 404,02 €	-0,22 €	
5-janv.-2026	Achat	AMUNDI PEA MSCI EMERGING MARKETS ESG LEADERS UCITS ETF	FR0013412020	EPA:PAEEM	10	29,70 €	0,00 €	0,00 €	297,00 €	30,52 €	305,20 €	8,20 €	
5-janv.-2026	Achat	NEXANS	FR0000044448	EPA:NEX	1	130,70 €	0,46 €	0,53 €	131,69 €	135,60 €	135,60 €	3,91 €	
5-janv.-2026	Achat	DASSAULT SYSTEMES	FR0014003TT8	EPA:DSY	4	23,55 €	0,33 €	0,38 €	94,91 €	22,96 €	91,84 €	-3,07 €	
5-janv.-2026	Achat	SOITEC	FR0013227113	EPA:SOI	4	25,54 €	0,36 €	0,00 €	102,52 €	30,22 €	120,88 €	18,36 €	
2-févr.-2026	Achat	iShares MSCI World Swap PEA UCITS ETF - EUR ACC	IE0002XZSHO1	EPA:WPEA	400	6,21 €	8,70 €	0,00 €	2 494,54 €	6,18 €	2 472,00 €	-22,54 €	
2-févr.-2026	Achat	AMUNDI PEA MSCI EMERGING MARKETS ESG LEADERS UCITS ETF	FR0013412020	EPA:PAEEM	9	30,46 €	0,00 €	0,00 €	274,14 €	30,52 €	274,68 €	0,54 €	
2-févr.-2026	Achat	SOITEC	FR0013227113	EPA:SOI	4	25,95 €	0,36 €	0,00 €	104,16 €	30,22 €	120,88 €	16,72 €	
2-févr.-2026	Achat	NEXANS	FR0000044448	EPA:NEX	1	133,40 €	0,47 €	0,53 €	134,40 €	135,60 €	135,60 €	1,20 €	
						490,85 €	20,89 €	1,70 €	8 669,06 €		8 903,61 €	234,55 €	

A = Date de l'opération
B = Type d'opération
C = Nom de l'action/ETF
D = Code ISIN
E = Ticker
F = Nombre de parts
G = Prix unitaire
H = Frais de courtage
I = TTF
J = Montant total de l'opération
K = Cours actuel
L = Valeur actuelle de votre position
M = Plus/Moins-value latente
N = Since


Formulas being:
Montant totale de l'opération =IF(B2="Achat"; (F2*G2) + H2 + I2; IF(B2="Vente"; (F2*G2) - H2; ""))
Cours actuel =GOOGLEFINANCE(E2)
Valeur actuelle =F2*K2
Plus/Moins-value latente =L2-J2
Since =IFERROR(SPARKLINE(
  GOOGLEFINANCE(E2; "price"; A2; TODAY()); 
  {
    "charttype"\"line"; 
    "linewidth"\2; 
    "color"\IF(INDEX(GOOGLEFINANCE(E2; "price"; A2); 2; 2) < GOOGLEFINANCE(E2; "price"); "#00b050"; "#ff0000")
  }
); "")


My XIRR sheet:
Mois	Flux	Rendement
1-janv.-2025	-2 813,95 €	
5-janv.-2026	-3 030,36 €	
2-févr.-2026	-3 007,24 €	
		
		
		
		
		
		
		
		
		
4-févr.-2026	8 934,91 €	
		2,494165683%


The XIRR Formula being:
=XIRR(B2:B10; A2:A10)

The final line is always the current value of the portfolio that I fill.


## 3. What I want to have in the app

The idea is to have a module to handle my savings. THe PEA things is one example of what I want to track, but I may add other things in the future.

So create a module savings then a submodule PEA.


## 4. Technical Solution (Proposed)

To replace the Google Sheet, the HomeApp will implement a `savings` module following the existing sub-app architecture:

### Component & Data Structure
- **Data Storage**: JSON-based storage in `data/savings/accounts.json` and `data/savings/transactions/[accountId].json`.
- **Backend Service**: A dedicated library (`lib/savings.ts`) will handle transaction CRUD operations, XIRR calculations, and portfolio aggregation.
- **Frontend Dashboard**: A new page at `/savings` will provide:
    - An overview of all savings accounts (PEA, etc.).
    - A detailed view for PEA with a transaction table, gain/loss tracking, and XIRR performance.
    - Interactive sparklines for asset price evolution.

### Key Features Implementation
- **Price Tracking**: Integration with a financial data API (e.g., Yahoo Finance/Alpha Vantage) to fetch real-time and historical prices for tickers like `EPA:WPEA`.
- **XIRR Utility**: Custom implementation of the Extended Internal Rate of Return algorithm to ensure parity with your current Google Sheet formulas.
- **Transaction Management**: UI for recording buys, sells, and fees, with automatic calculations for "Montant total" and "Valeur actuelle".

---
*Note: Full technical details are available in the [implementation_plan.md](file:///C:/Users/Xav/.gemini/antigravity/brain/53d4933a-54e8-43d2-a4a7-a06e79fabfad/implementation_plan.md).*
