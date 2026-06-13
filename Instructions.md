# Setup & Run Instructions

## Prerequisites

- Node.js v18 or higher — download from https://nodejs.org
- Internet connection (for Chart.js CDN on first load)

## Step-by-Step Setup

### 1. Open Terminal / PowerShell

```powershell
# Navigate to project folder
cd C:\Users\ericg\Insurance1
```

### 2. Install Dependencies

```powershell
npm install
```

This installs:
- `express` — web server
- `better-sqlite3` — SQLite database driver
- `cors` — cross-origin resource sharing

### 3. Start the Server

```powershell
node server.js
```

You will see:
```
🚗  Vehicle Insurance Management System
✅  Server running at http://localhost:3000
📊  Open your browser to get started
```

### 4. Open the App

Open your browser and visit:
```
http://localhost:3000
```

### 5. Sample Data

The app automatically seeds 8 sample customers, 8 vehicles, 8 policies, 6 claims, and payment history on first run. No manual setup needed.

---

## How to Use Each Section

### Dashboard
- Overview of all KPIs
- Charts refresh each time you visit
- Click "View All" buttons to navigate

### Customers
- Click **+ Add Customer** to register a new customer
- Click the ✏️ icon to edit a customer
- Click 🗑️ to delete (also deletes their vehicles and policies)

### Vehicles
- Click **+ Add Vehicle**
- Select the owner from the customer dropdown
- Choose the vehicle type (affects premium calculation)

### Policies
- Click **+ New Policy**
- Select customer → then their vehicles load automatically
- Choose insurance type and duration
- Click ⚙️ button to auto-calculate the premium
- Click **Generate Policy** to create

### Claims
- Click **+ Submit Claim**
- Select an active policy
- Fill in claim type, amount, and description
- Use **Update** button to approve or reject pending claims

### Payments
- Click **+ Record Payment**
- Select the policy, enter amount and date

### Renewals
- Shows all policies expiring in next 60 days
- Red badge = 10 days or less
- Yellow badge = 11–30 days
- Green badge = 31–60 days
- Click **🔄 Renew** to extend by 1 year

### Reports
- Auto-generated business summary
- Click **🖨️ Print Report** to print or save as PDF

---

## Stopping the Server

Press `Ctrl + C` in the terminal.

## Resetting the Database

Delete `database.db` and restart the server — it will recreate with fresh sample data.

```powershell
Remove-Item database.db
node server.js
```
