# Application Workflow

## Complete End-to-End Workflow

```
Customer Registration
        │
        ▼
Add Vehicle Details
        │
        ▼
Select Insurance Type ──► Auto-Calculate Premium
        │
        ▼
Generate Insurance Policy
        │
        ├──► View All Policies
        │
        ├──► Submit Claim Request
        │           │
        │           ▼
        │    Track Claim Status
        │    (Pending → Approved / Rejected)
        │
        ├──► Record Payment
        │
        ├──► Renewal Reminder (60 days before expiry)
        │           │
        │           ▼
        │      One-Click Renew
        │
        └──► Admin Dashboard + Reports
```

---

## Step 1: Customer Registration

**Navigate to:** Customers → + Add Customer

| Field        | Example               |
|--------------|-----------------------|
| Full Name    | Jane Smith            |
| Email        | jane@email.com        |
| Phone        | 555-0200              |
| Address      | 100 Main St, NY 10001 |
| Date of Birth| 1990-05-15            |
| License No.  | NY-654321             |

---

## Step 2: Add Vehicle Details

**Navigate to:** Vehicles → + Add Vehicle

| Field        | Example               |
|--------------|-----------------------|
| Owner        | Jane Smith (select)   |
| Make         | Honda                 |
| Model        | Civic                 |
| Year         | 2022                  |
| Vehicle Type | Sedan                 |
| Plate No.    | NYC-5678              |

**Vehicle Types & Premium Impact:**

| Type       | Multiplier |
|------------|-----------|
| Sedan      | ×1.0 (base)|
| Minivan    | ×0.95 (-5%)|
| SUV        | ×1.15 (+15%)|
| Truck      | ×1.20 (+20%)|
| Electric   | ×1.10 (+10%)|
| Sports     | ×1.40 (+40%)|
| Luxury     | ×1.50 (+50%)|
| Motorcycle | ×1.60 (+60%)|

---

## Step 3: Select Insurance Type & Calculate Premium

**Navigate to:** Policies → + New Policy

**Coverage Types:**

| Type           | Base Rate/yr | Covers                                      |
|----------------|-------------|---------------------------------------------|
| Basic          | $400        | Bodily injury + property damage liability   |
| Standard       | $700        | Basic + uninsured motorist + medical payments|
| Comprehensive  | $1,100      | Standard + collision + comprehensive + rental|
| Premium        | $1,600      | Comprehensive + gap + roadside + new car replacement|

**Premium Formula:**
```
Premium = BaseRate × VehicleTypeMultiplier × VehicleAgeFactor × (Months ÷ 12)

Vehicle Age Factors:
  0–3 years old  → ×1.20 (new, expensive parts)
  4–7 years old  → ×1.00 (standard)
  8–15 years old → ×0.90 (lower value)
  15+ years old  → ×0.80 (very old)
```

Click ⚙️ to auto-calculate based on selections.

---

## Step 4: Generate Insurance Policy

Fill all policy fields and click **Generate Policy**. The system:
- Assigns a unique Policy Number (e.g., VIS-2026-482931)
- Sets status to `active`
- Stores start and end dates

---

## Step 5: View All Policies

**Navigate to:** Policies

- Filter by All / Active / Expired
- Search by customer name, policy number, vehicle
- Click **🔄 Renew** on expired policies

---

## Step 6: Submit Claim Request

**Navigate to:** Claims → + Submit Claim

| Field       | Options                                              |
|-------------|------------------------------------------------------|
| Policy      | Select from active policies                          |
| Claim Type  | Accident / Theft / Weather / Fire / Flood / Glass / Other |
| Amount      | Estimated damage cost ($)                            |
| Description | Detailed description of the incident                 |

Claim gets a unique number (e.g., CLM-2026-739201) and starts as **Pending**.

---

## Step 7: Track & Update Claim Status

**Navigate to:** Claims

| Status   | Meaning                               |
|----------|---------------------------------------|
| Pending  | Under review                          |
| Approved | Claim accepted, payout authorized     |
| Rejected | Claim denied                          |

Click **Update** on pending claims to approve or reject.

---

## Step 8: Renewal Reminder

**Navigate to:** Renewals

- Shows policies expiring in the next 60 days
- Color-coded urgency badges
- One-click **🔄 Renew** extends policy by 12 months

---

## Step 9: Record Payment

**Navigate to:** Payments → + Record Payment

| Field          | Options                                           |
|----------------|---------------------------------------------------|
| Policy         | Select policy                                     |
| Amount         | Premium amount ($)                                |
| Payment Date   | Date of payment                                   |
| Method         | Online / Credit Card / Debit / Bank Transfer / Check / Cash |

---

## Step 10: Admin Dashboard

**Navigate to:** Dashboard

Live KPI cards:
- Total Customers
- Total Vehicles
- Active Policies
- Expired Policies
- Total Premium Collected
- Claims Submitted / Approved / Rejected

Charts:
- Monthly Revenue (bar chart — last 6 months)
- Policy Type Distribution (doughnut)
- Claims Status (doughnut)

---

## Step 11: Final Report

**Navigate to:** Reports

Shows:
- Complete business statistics
- Revenue breakdown by insurance type
- Top 5 customers by premium
- Monthly payment history
- Revenue trend chart
- Click **🖨️ Print Report** to export/print
