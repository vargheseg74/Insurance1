// ============================================================
//  Vehicle Insurance Management System — Express.js Server
// ============================================================
const express = require('express');
const { DatabaseSync } = require('node:sqlite');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Database ── (use /tmp on Vercel; local path otherwise)
const DB_PATH = process.env.VERCEL ? '/tmp/database.db' : path.join(__dirname, 'database.db');
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ============================================================
//  DATABASE INITIALISATION
// ============================================================
function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      phone       TEXT,
      address     TEXT,
      dob         TEXT,
      license_no  TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id  INTEGER NOT NULL,
      make         TEXT    NOT NULL,
      model        TEXT    NOT NULL,
      year         INTEGER NOT NULL,
      color        TEXT,
      vin          TEXT,
      plate_no     TEXT,
      vehicle_type TEXT    DEFAULT 'sedan',
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS policies (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_no      TEXT    UNIQUE,
      customer_id    INTEGER NOT NULL,
      vehicle_id     INTEGER NOT NULL,
      insurance_type TEXT    NOT NULL,
      coverage_amt   REAL    DEFAULT 0,
      premium        REAL    NOT NULL,
      start_date     TEXT    NOT NULL,
      end_date       TEXT    NOT NULL,
      status         TEXT    DEFAULT 'active',
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
      FOREIGN KEY (vehicle_id)  REFERENCES vehicles(id)  ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS claims (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_no    TEXT    UNIQUE,
      policy_id   INTEGER NOT NULL,
      customer_id INTEGER NOT NULL,
      claim_type  TEXT    NOT NULL,
      description TEXT,
      amount      REAL    DEFAULT 0,
      status      TEXT    DEFAULT 'pending',
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at  DATETIME,
      FOREIGN KEY (policy_id)   REFERENCES policies(id)  ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payments (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id      INTEGER NOT NULL,
      customer_id    INTEGER NOT NULL,
      amount         REAL    NOT NULL,
      payment_date   TEXT    NOT NULL,
      payment_method TEXT    DEFAULT 'online',
      status         TEXT    DEFAULT 'completed',
      notes          TEXT,
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (policy_id)   REFERENCES policies(id)  ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `);

  // Seed sample data only on first run
  const count = db.prepare('SELECT COUNT(*) as c FROM customers').get();
  if (count.c === 0) seedSampleData();
}

// ── Helpers ──
function policyNo() { return 'VIS-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000); }
function claimNo()  { return 'CLM-' + new Date().getFullYear() + '-' + Math.floor(100000 + Math.random() * 900000); }

function calcPremium(insuranceType, vehicleType, vehicleYear, months) {
  const baseRates = { basic: 400, standard: 700, comprehensive: 1100, premium: 1600 };
  const typeMulti = { sedan: 1.0, suv: 1.15, truck: 1.20, sports: 1.40, luxury: 1.50, minivan: 0.95, electric: 1.10, motorcycle: 1.60 };
  const base  = baseRates[insuranceType] || 700;
  const vMult = typeMulti[vehicleType]   || 1.0;
  const age   = new Date().getFullYear() - vehicleYear;
  const ageFactor = age <= 3 ? 1.20 : age <= 7 ? 1.00 : age <= 15 ? 0.90 : 0.80;
  return Math.round(base * vMult * ageFactor * (months / 12));
}

// ── Sample Data ──
function seedSampleData() {
  const addCustomer = db.prepare('INSERT INTO customers (name,email,phone,address,dob,license_no) VALUES (?,?,?,?,?,?)');
  const addVehicle  = db.prepare('INSERT INTO vehicles (customer_id,make,model,year,color,vin,plate_no,vehicle_type) VALUES (?,?,?,?,?,?,?,?)');
  const addPolicy   = db.prepare('INSERT INTO policies (policy_no,customer_id,vehicle_id,insurance_type,coverage_amt,premium,start_date,end_date,status) VALUES (?,?,?,?,?,?,?,?,?)');
  const addClaim    = db.prepare('INSERT INTO claims (claim_no,policy_id,customer_id,claim_type,description,amount,status) VALUES (?,?,?,?,?,?,?)');
  const addPayment  = db.prepare('INSERT INTO payments (policy_id,customer_id,amount,payment_date,payment_method,status) VALUES (?,?,?,?,?,?)');

  const customers = [
    ['John Smith',    'john.smith@email.com',   '555-0101', '123 Main St, New York, NY 10001',    '1985-03-15', 'NY-123456'],
    ['Sarah Johnson', 'sarah.j@email.com',       '555-0102', '456 Oak Ave, Los Angeles, CA 90001', '1990-07-22', 'CA-789012'],
    ['Mike Davis',    'mike.d@email.com',        '555-0103', '789 Pine Rd, Chicago, IL 60601',     '1978-11-30', 'IL-345678'],
    ['Emily Brown',   'emily.b@email.com',       '555-0104', '321 Elm St, Houston, TX 77001',      '1995-05-10', 'TX-901234'],
    ['Robert Wilson', 'robert.w@email.com',      '555-0105', '654 Maple Dr, Phoenix, AZ 85001',    '1982-09-18', 'AZ-567890'],
    ['Linda Martinez','linda.m@email.com',       '555-0106', '987 Cedar Ln, Philadelphia, PA 19101','1988-12-25','PA-234567'],
    ['James Taylor',  'james.t@email.com',       '555-0107', '111 Birch Blvd, San Antonio, TX 78201','1975-04-08','TX-678901'],
    ['Patricia Lee',  'patricia.l@email.com',    '555-0108', '222 Spruce Way, San Diego, CA 92101','1992-06-14', 'CA-345678'],
  ];

  const cIds = customers.map(c => addCustomer.run(...c).lastInsertRowid);

  const vehicles = [
    [cIds[0], 'Toyota',   'Camry',    2021, 'Silver',  '1HGBH41J21N109186', 'ABC-1234', 'sedan'],
    [cIds[1], 'Honda',    'CR-V',     2020, 'Blue',    '2HGBH41J20N109187', 'XYZ-5678', 'suv'],
    [cIds[2], 'Ford',     'F-150',    2019, 'Red',     '3HGBH41J19N109188', 'DEF-9012', 'truck'],
    [cIds[3], 'BMW',      '3 Series', 2022, 'Black',   '4HGBH41J22N109189', 'GHI-3456', 'luxury'],
    [cIds[4], 'Chevrolet','Malibu',   2018, 'White',   '5HGBH41J18N109190', 'JKL-7890', 'sedan'],
    [cIds[5], 'Tesla',    'Model 3',  2023, 'White',   '6HGBH41J23N109191', 'MNO-1234', 'electric'],
    [cIds[6], 'Jeep',     'Wrangler', 2020, 'Green',   '7HGBH41J20N109192', 'PQR-5678', 'suv'],
    [cIds[7], 'Porsche',  '911',      2022, 'Yellow',  '8HGBH41J22N109193', 'STU-9012', 'sports'],
  ];

  const vIds = vehicles.map(v => addVehicle.run(...v).lastInsertRowid);

  const today   = new Date();
  const past    = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.toISOString().slice(0,10); };
  const future  = d => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0,10); };

  const policyData = [
    [cIds[0], vIds[0], 'comprehensive', 50000,  1100, past(300), future(65),  'active'],
    [cIds[1], vIds[1], 'standard',      30000,   807, past(200), future(165), 'active'],
    [cIds[2], vIds[2], 'basic',         15000,   480, past(100), future(265), 'active'],
    [cIds[3], vIds[3], 'premium',       80000,  1920, past(60),  future(305), 'active'],
    [cIds[4], vIds[4], 'standard',      25000,   630, past(400), past(35),    'expired'],
    [cIds[5], vIds[5], 'comprehensive', 60000,  1210, past(30),  future(335), 'active'],
    [cIds[6], vIds[6], 'standard',      35000,   805, past(350), past(20),    'expired'],
    [cIds[7], vIds[7], 'premium',       90000,  2240, past(10),  future(355), 'active'],
  ];

  const pIds = policyData.map(([cId, vId, type, cov, prem, start, end, status]) => {
    return addPolicy.run(policyNo(), cId, vId, type, cov, prem, start, end, status).lastInsertRowid;
  });

  // Claims
  addClaim.run(claimNo(), pIds[0], cIds[0], 'accident',  'Rear-end collision on highway', 4500, 'approved');
  addClaim.run(claimNo(), pIds[1], cIds[1], 'theft',     'Side mirror stolen in parking', 800,  'pending');
  addClaim.run(claimNo(), pIds[2], cIds[2], 'weather',   'Hail damage to roof and hood',  2200, 'approved');
  addClaim.run(claimNo(), pIds[3], cIds[3], 'accident',  'Front bumper damage',           6800, 'rejected');
  addClaim.run(claimNo(), pIds[5], cIds[5], 'vandalism', 'Scratches on driver-side door', 1200, 'pending');
  addClaim.run(claimNo(), pIds[7], cIds[7], 'accident',  'Multi-vehicle accident',        9500, 'approved');

  // Payments (last 6 months)
  const months = [150, 120, 90, 60, 30, 5];
  pIds.forEach((pid, i) => {
    const prem = policyData[i][4];
    months.forEach(d => {
      const payDate = new Date(); payDate.setDate(payDate.getDate() - d);
      if (payDate >= new Date(policyData[i][5])) {
        addPayment.run(pid, policyData[i][0], Math.round(prem / 6), payDate.toISOString().slice(0,10),
          ['online','bank_transfer','credit_card','check'][i % 4], 'completed');
      }
    });
  });

  console.log('✓ Sample data seeded successfully');
}

// ============================================================
//  API ROUTES
// ============================================================

// ── Dashboard Stats ──
app.get('/api/dashboard', (req, res) => {
  try {
    const total_customers  = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
    const total_vehicles   = db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c;
    const active_policies  = db.prepare("SELECT COUNT(*) as c FROM policies WHERE status='active'").get().c;
    const expired_policies = db.prepare("SELECT COUNT(*) as c FROM policies WHERE status='expired'").get().c;
    const total_premium    = db.prepare("SELECT COALESCE(SUM(amount),0) as s FROM payments WHERE status='completed'").get().s;
    const claims_submitted = db.prepare('SELECT COUNT(*) as c FROM claims').get().c;
    const claims_approved  = db.prepare("SELECT COUNT(*) as c FROM claims WHERE status='approved'").get().c;
    const claims_rejected  = db.prepare("SELECT COUNT(*) as c FROM claims WHERE status='rejected'").get().c;
    const claims_pending   = db.prepare("SELECT COUNT(*) as c FROM claims WHERE status='pending'").get().c;

    // Policy type distribution
    const policy_types = db.prepare(`
      SELECT insurance_type, COUNT(*) as count FROM policies GROUP BY insurance_type
    `).all();

    // Monthly revenue (last 6 months)
    const monthly_revenue = db.prepare(`
      SELECT strftime('%Y-%m', payment_date) as month,
             SUM(amount) as total
      FROM payments
      WHERE status='completed'
        AND payment_date >= date('now', '-6 months')
      GROUP BY month ORDER BY month
    `).all();

    // Recent policies
    const recent_policies = db.prepare(`
      SELECT p.*, c.name as customer_name, v.make || ' ' || v.model as vehicle
      FROM policies p
      JOIN customers c ON p.customer_id = c.id
      JOIN vehicles  v ON p.vehicle_id  = v.id
      ORDER BY p.created_at DESC LIMIT 5
    `).all();

    // Upcoming renewals (next 30 days)
    const renewals = db.prepare(`
      SELECT p.*, c.name as customer_name, c.email, c.phone,
             v.make || ' ' || v.model as vehicle
      FROM policies p
      JOIN customers c ON p.customer_id = c.id
      JOIN vehicles  v ON p.vehicle_id  = v.id
      WHERE p.status = 'active'
        AND p.end_date BETWEEN date('now') AND date('now','+30 days')
      ORDER BY p.end_date
    `).all();

    res.json({
      stats: { total_customers, total_vehicles, active_policies, expired_policies,
               total_premium, claims_submitted, claims_approved, claims_rejected, claims_pending },
      policy_types, monthly_revenue, recent_policies, renewals
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Customers ──
app.get('/api/customers', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*,
        (SELECT COUNT(*) FROM vehicles  WHERE customer_id = c.id) as vehicle_count,
        (SELECT COUNT(*) FROM policies  WHERE customer_id = c.id) as policy_count
      FROM customers c ORDER BY c.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, email, phone, address, dob, license_no } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const result = db.prepare(
      'INSERT INTO customers (name,email,phone,address,dob,license_no) VALUES (?,?,?,?,?,?)'
    ).run(name, email, phone||'', address||'', dob||'', license_no||'');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Customer created' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const { name, email, phone, address, dob, license_no } = req.body;
    const result = db.prepare(
      'UPDATE customers SET name=?,email=?,phone=?,address=?,dob=?,license_no=? WHERE id=?'
    ).run(name, email, phone||'', address||'', dob||'', license_no||'', req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Customer updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Customer deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Vehicles ──
app.get('/api/vehicles', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT v.*, c.name as customer_name
      FROM vehicles v JOIN customers c ON v.customer_id=c.id
      ORDER BY v.created_at DESC
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/vehicles/customer/:cid', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM vehicles WHERE customer_id=?').all(req.params.cid);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/vehicles/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM vehicles WHERE id=?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/vehicles', (req, res) => {
  try {
    const { customer_id, make, model, year, color, vin, plate_no, vehicle_type } = req.body;
    if (!customer_id || !make || !model || !year) return res.status(400).json({ error: 'customer_id, make, model, year required' });
    const result = db.prepare(
      'INSERT INTO vehicles (customer_id,make,model,year,color,vin,plate_no,vehicle_type) VALUES (?,?,?,?,?,?,?,?)'
    ).run(customer_id, make, model, year, color||'', vin||'', plate_no||'', vehicle_type||'sedan');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Vehicle added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/vehicles/:id', (req, res) => {
  try {
    const { customer_id, make, model, year, color, vin, plate_no, vehicle_type } = req.body;
    const result = db.prepare(
      'UPDATE vehicles SET customer_id=?,make=?,model=?,year=?,color=?,vin=?,plate_no=?,vehicle_type=? WHERE id=?'
    ).run(customer_id, make, model, year, color||'', vin||'', plate_no||'', vehicle_type||'sedan', req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Vehicle updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/vehicles/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM vehicles WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Vehicle deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Premium Calculator ──
app.post('/api/calculate-premium', (req, res) => {
  try {
    const { insurance_type, vehicle_id, months } = req.body;
    const v = db.prepare('SELECT * FROM vehicles WHERE id=?').get(vehicle_id);
    if (!v) return res.status(404).json({ error: 'Vehicle not found' });
    const premium = calcPremium(insurance_type, v.vehicle_type, v.year, months || 12);
    res.json({ premium });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Policies ──
app.get('/api/policies', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, c.name as customer_name, c.email as customer_email,
             v.make || ' ' || v.model || ' (' || v.year || ')' as vehicle_info
      FROM policies p
      JOIN customers c ON p.customer_id=c.id
      JOIN vehicles  v ON p.vehicle_id=v.id
      ORDER BY p.created_at DESC
    `).all();
    // Auto-expire past end dates
    const today = new Date().toISOString().slice(0,10);
    db.prepare("UPDATE policies SET status='expired' WHERE end_date < ? AND status='active'").run(today);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/policies/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT p.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone,
             v.make, v.model, v.year, v.vehicle_type, v.plate_no
      FROM policies p
      JOIN customers c ON p.customer_id=c.id
      JOIN vehicles  v ON p.vehicle_id=v.id
      WHERE p.id=?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/policies', (req, res) => {
  try {
    const { customer_id, vehicle_id, insurance_type, coverage_amt, premium, start_date, end_date } = req.body;
    if (!customer_id || !vehicle_id || !insurance_type || !premium || !start_date || !end_date)
      return res.status(400).json({ error: 'Missing required fields' });
    const status = new Date(end_date) < new Date() ? 'expired' : 'active';
    const result = db.prepare(`
      INSERT INTO policies (policy_no,customer_id,vehicle_id,insurance_type,coverage_amt,premium,start_date,end_date,status)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(policyNo(), customer_id, vehicle_id, insurance_type, coverage_amt||0, premium, start_date, end_date, status);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Policy created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/policies/:id', (req, res) => {
  try {
    const { insurance_type, coverage_amt, premium, start_date, end_date, status } = req.body;
    const result = db.prepare(`
      UPDATE policies SET insurance_type=?,coverage_amt=?,premium=?,start_date=?,end_date=?,status=? WHERE id=?
    `).run(insurance_type, coverage_amt||0, premium, start_date, end_date, status||'active', req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Policy updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/policies/:id/renew', (req, res) => {
  try {
    const policy = db.prepare('SELECT * FROM policies WHERE id=?').get(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const newEnd = new Date(policy.end_date);
    newEnd.setFullYear(newEnd.getFullYear() + 1);
    db.prepare("UPDATE policies SET end_date=?, status='active' WHERE id=?")
      .run(newEnd.toISOString().slice(0,10), req.params.id);
    res.json({ message: 'Policy renewed', new_end_date: newEnd.toISOString().slice(0,10) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/policies/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM policies WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Policy deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Claims ──
app.get('/api/claims', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT cl.*, c.name as customer_name,
             v.make || ' ' || v.model as vehicle_info,
             p.policy_no
      FROM claims cl
      JOIN customers c ON cl.customer_id=c.id
      JOIN policies  p ON cl.policy_id=p.id
      JOIN vehicles  v ON p.vehicle_id=v.id
      ORDER BY cl.submitted_at DESC
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/claims/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT cl.*, c.name as customer_name, c.email as customer_email,
             p.policy_no, v.make, v.model, v.year
      FROM claims cl
      JOIN customers c ON cl.customer_id=c.id
      JOIN policies  p ON cl.policy_id=p.id
      JOIN vehicles  v ON p.vehicle_id=v.id
      WHERE cl.id=?
    `).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/claims', (req, res) => {
  try {
    const { policy_id, claim_type, description, amount } = req.body;
    if (!policy_id || !claim_type) return res.status(400).json({ error: 'policy_id and claim_type required' });
    const policy = db.prepare('SELECT * FROM policies WHERE id=?').get(policy_id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    if (policy.status !== 'active') return res.status(400).json({ error: 'Policy is not active' });
    const result = db.prepare(`
      INSERT INTO claims (claim_no,policy_id,customer_id,claim_type,description,amount)
      VALUES (?,?,?,?,?,?)
    `).run(claimNo(), policy_id, policy.customer_id, claim_type, description||'', amount||0);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Claim submitted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/claims/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending','approved','rejected'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });
    const resolved_at = status !== 'pending' ? new Date().toISOString().slice(0,10) : null;
    const result = db.prepare('UPDATE claims SET status=?, resolved_at=? WHERE id=?')
      .run(status, resolved_at, req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Claim status updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/claims/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM claims WHERE id=?').run(req.params.id);
    if (!result.changes) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Claim deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Payments ──
app.get('/api/payments', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT py.*, c.name as customer_name, p.policy_no
      FROM payments py
      JOIN customers c ON py.customer_id=c.id
      JOIN policies  p ON py.policy_id=p.id
      ORDER BY py.payment_date DESC
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/payments', (req, res) => {
  try {
    const { policy_id, amount, payment_date, payment_method, notes } = req.body;
    if (!policy_id || !amount || !payment_date) return res.status(400).json({ error: 'policy_id, amount, payment_date required' });
    const policy = db.prepare('SELECT * FROM policies WHERE id=?').get(policy_id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    const result = db.prepare(`
      INSERT INTO payments (policy_id,customer_id,amount,payment_date,payment_method,notes)
      VALUES (?,?,?,?,?,?)
    `).run(policy_id, policy.customer_id, amount, payment_date, payment_method||'online', notes||'');
    res.status(201).json({ id: result.lastInsertRowid, message: 'Payment recorded' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Renewals ──
app.get('/api/renewals', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.*, c.name as customer_name, c.email, c.phone,
             v.make || ' ' || v.model || ' (' || v.year || ')' as vehicle_info,
             julianday(p.end_date) - julianday('now') as days_remaining
      FROM policies p
      JOIN customers c ON p.customer_id=c.id
      JOIN vehicles  v ON p.vehicle_id=v.id
      WHERE p.status='active'
        AND p.end_date BETWEEN date('now') AND date('now','+60 days')
      ORDER BY p.end_date
    `).all();
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Report ──
app.get('/api/report', (req, res) => {
  try {
    const stats       = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM customers)  as total_customers,
        (SELECT COUNT(*) FROM vehicles)   as total_vehicles,
        (SELECT COUNT(*) FROM policies)   as total_policies,
        (SELECT COUNT(*) FROM policies WHERE status='active')  as active_policies,
        (SELECT COUNT(*) FROM policies WHERE status='expired') as expired_policies,
        (SELECT COALESCE(SUM(premium),0) FROM policies) as total_premium_billed,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='completed') as total_collected,
        (SELECT COUNT(*) FROM claims) as total_claims,
        (SELECT COUNT(*) FROM claims WHERE status='approved') as approved_claims,
        (SELECT COUNT(*) FROM claims WHERE status='rejected') as rejected_claims,
        (SELECT COUNT(*) FROM claims WHERE status='pending')  as pending_claims,
        (SELECT COALESCE(SUM(amount),0) FROM claims WHERE status='approved') as total_claim_amount
    `).get();
    const by_type     = db.prepare('SELECT insurance_type, COUNT(*) as count, SUM(premium) as revenue FROM policies GROUP BY insurance_type').all();
    const top_customers = db.prepare(`
      SELECT c.name, COUNT(p.id) as policies, SUM(p.premium) as total_premium
      FROM customers c LEFT JOIN policies p ON c.id=p.customer_id
      GROUP BY c.id ORDER BY total_premium DESC LIMIT 5
    `).all();
    const monthly     = db.prepare(`
      SELECT strftime('%Y-%m', payment_date) as month, SUM(amount) as total, COUNT(*) as count
      FROM payments GROUP BY month ORDER BY month DESC LIMIT 6
    `).all();
    res.json({ stats, by_type, top_customers, monthly, generated_at: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ──
initDB();

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🚗  Vehicle Insurance Management System`);
    console.log(`✅  Server running at http://localhost:${PORT}`);
    console.log(`📊  Open your browser to get started\n`);
  });
}

module.exports = app;
