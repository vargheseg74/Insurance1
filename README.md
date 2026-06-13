# Vehicle Insurance Management System

A full-stack web application for managing vehicle insurance — customers, policies, claims, payments, and renewals.

## Technology Stack

| Layer    | Technology                     |
|----------|-------------------------------|
| Frontend | HTML5, CSS3, JavaScript (ES6+) |
| Backend  | Node.js + Express.js           |
| Database | SQLite (via better-sqlite3)    |
| Charts   | Chart.js 4.x                   |

## Features

- **Dashboard** — KPI cards, revenue chart, policy distribution, claims chart, recent policies, renewal alerts
- **Customer Management** — Add, edit, delete customers with license and contact info
- **Vehicle Management** — Track vehicles per customer with type, VIN, plate number
- **Policy Management** — Generate policies with auto-calculated premiums, track active/expired
- **Claims Management** — Submit claims, approve/reject, track status
- **Payment Records** — Record payments, multiple methods, payment history
- **Renewal Reminders** — Policies expiring within 60 days with one-click renewal
- **Reports** — Full business summary with charts and top customers

## Project Structure

```
Insurance1/
├── server.js          ← Express.js backend + REST API
├── database.db        ← SQLite database (auto-created)
├── package.json       ← Node.js dependencies
├── public/
│   ├── index.html     ← Single-page frontend app
│   ├── style.css      ← All styling
│   └── script.js      ← Frontend logic and API calls
├── README.md
├── Instructions.md
├── Workflow.md
└── Prompt_For_Claude_Code.txt
```

## Quick Start

```bash
cd Insurance1
npm install
node server.js
```

Open: http://localhost:3000

## API Endpoints

| Method | Endpoint                     | Description             |
|--------|------------------------------|-------------------------|
| GET    | /api/dashboard               | Dashboard statistics    |
| GET    | /api/customers               | List all customers      |
| POST   | /api/customers               | Create customer         |
| PUT    | /api/customers/:id           | Update customer         |
| DELETE | /api/customers/:id           | Delete customer         |
| GET    | /api/vehicles                | List all vehicles       |
| POST   | /api/vehicles                | Add vehicle             |
| GET    | /api/vehicles/customer/:id   | Vehicles by customer    |
| POST   | /api/policies                | Create policy           |
| PATCH  | /api/policies/:id/renew      | Renew policy            |
| POST   | /api/claims                  | Submit claim            |
| PATCH  | /api/claims/:id/status       | Approve/reject claim    |
| POST   | /api/payments                | Record payment          |
| GET    | /api/renewals                | Upcoming renewals       |
| POST   | /api/calculate-premium       | Calculate premium       |
| GET    | /api/report                  | Full summary report     |
