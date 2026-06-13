// ============================================================
//  Vehicle Insurance Management System — Frontend Script
// ============================================================

const API = '';   // same origin — Express serves static + API

// ── Chart instances (destroy before re-render) ──
const charts = {};

// ── Global data caches ──
let allCustomers = [];
let allPolicies  = [];
let allClaims    = [];
let currentClaimId = null;

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  setTopbarDate();
  navigate('dashboard');
});

function setTopbarDate() {
  const el = document.getElementById('topbarDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', { weekday:'short', year:'numeric', month:'short', day:'numeric' });
}

// ══════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════
const SECTION_TITLES = {
  dashboard: 'Dashboard',
  customers: 'Customer Management',
  vehicles:  'Vehicle Management',
  policies:  'Policy Management',
  claims:    'Claims Management',
  payments:  'Payment Records',
  renewals:  'Renewal Reminders',
  reports:   'Summary Reports'
};

function navigate(section) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
  // Show target
  const target = document.getElementById('sec-' + section);
  if (target) target.classList.remove('hidden');

  // Update sidebar active
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (navItem) navItem.classList.add('active');

  // Update page title
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = SECTION_TITLES[section] || section;

  // Close sidebar on mobile
  document.getElementById('sidebar').classList.remove('open');

  // Load section data
  const loaders = {
    dashboard: loadDashboard,
    customers: loadCustomers,
    vehicles:  loadVehicles,
    policies:  loadPolicies,
    claims:    loadClaims,
    payments:  loadPayments,
    renewals:  loadRenewals,
    reports:   loadReports
  };
  if (loaders[section]) loaders[section]();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ══════════════════════════════════════════════
//  API HELPER
// ══════════════════════════════════════════════
async function api(endpoint, method = 'GET', data = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (data) opts.body = JSON.stringify(data);
  const res = await fetch('/api/' + endpoint, opts);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Request failed');
  return json;
}

// ══════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════
let toastTimer;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = (type === 'success' ? '✓ ' : type === 'error' ? '✗ ' : '⚠ ') + msg;
  el.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
}

// ══════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════
function openModal(id) {
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById(id).classList.add('show');
}
function closeAllModals() {
  document.getElementById('modalBackdrop').classList.remove('show');
  document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
}

// ══════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════
async function loadDashboard() {
  try {
    const data = await api('dashboard');
    const s = data.stats;

    // KPI Cards
    setText('kpi-customers', s.total_customers);
    setText('kpi-vehicles',  s.total_vehicles);
    setText('kpi-active',    s.active_policies);
    setText('kpi-expired',   s.expired_policies);
    setText('kpi-premium',   '$' + Number(s.total_premium).toLocaleString('en-US', { maximumFractionDigits: 0 }));
    setText('kpi-claims',    s.claims_submitted);
    setText('kpi-capproved', s.claims_approved);
    setText('kpi-crejected', s.claims_rejected);

    // Chart — Monthly Revenue (Bar)
    renderChart('chartRevenue', 'bar', {
      labels: data.monthly_revenue.map(r => r.month),
      datasets: [{
        label: 'Revenue ($)',
        data: data.monthly_revenue.map(r => r.total),
        backgroundColor: 'rgba(37,99,235,.7)',
        borderRadius: 6,
        borderSkipped: false
      }]
    }, {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
    });

    // Chart — Policy Types (Doughnut)
    const typeColors = { basic: '#4f46e5', standard: '#2563eb', comprehensive: '#0d9488', premium: '#7c3aed' };
    renderChart('chartPolicyType', 'doughnut', {
      labels: data.policy_types.map(t => capitalize(t.insurance_type)),
      datasets: [{
        data: data.policy_types.map(t => t.count),
        backgroundColor: data.policy_types.map(t => typeColors[t.insurance_type] || '#94a3b8'),
        borderWidth: 2, borderColor: '#fff'
      }]
    }, { plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } } }, cutout: '60%' });

    // Chart — Claims Status (Doughnut)
    renderChart('chartClaims', 'doughnut', {
      labels: ['Pending', 'Approved', 'Rejected'],
      datasets: [{
        data: [s.claims_pending, s.claims_approved, s.claims_rejected],
        backgroundColor: ['#f59e0b', '#10b981', '#ef4444'],
        borderWidth: 2, borderColor: '#fff'
      }]
    }, { plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 } } } }, cutout: '60%' });

    // Recent Policies table
    const rpBody = document.getElementById('recentPolicies');
    if (data.recent_policies.length === 0) {
      rpBody.innerHTML = '<tr class="empty-row"><td colspan="4"><span class="empty-icon">📄</span>No policies yet</td></tr>';
    } else {
      rpBody.innerHTML = data.recent_policies.map(p => `
        <tr>
          <td><strong>${p.policy_no}</strong></td>
          <td>${esc(p.customer_name)}</td>
          <td>${typeBadge(p.insurance_type)}</td>
          <td>${statusBadge(p.status)}</td>
        </tr>
      `).join('');
    }

    // Upcoming Renewals table
    const urBody = document.getElementById('upcomingRenewals');
    if (data.renewals.length === 0) {
      urBody.innerHTML = '<tr class="empty-row"><td colspan="3"><span class="empty-icon">🎉</span>No renewals due</td></tr>';
    } else {
      urBody.innerHTML = data.renewals.map(r => `
        <tr>
          <td>${esc(r.customer_name)}</td>
          <td>${esc(r.vehicle)}</td>
          <td>${fmtDate(r.end_date)}</td>
        </tr>
      `).join('');
    }

  } catch (err) { showToast(err.message, 'error'); }
}

function renderChart(canvasId, type, data, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (charts[canvasId]) { charts[canvasId].destroy(); delete charts[canvasId]; }
  charts[canvasId] = new Chart(ctx, {
    type,
    data,
    options: { responsive: true, maintainAspectRatio: true, ...options }
  });
}

// ══════════════════════════════════════════════
//  CUSTOMERS
// ══════════════════════════════════════════════
async function loadCustomers() {
  try {
    allCustomers = await api('customers');
    renderCustomerTable(allCustomers);
    setText('customerCount', allCustomers.length + ' customer(s)');
  } catch (err) { showToast(err.message, 'error'); }
}

function renderCustomerTable(data) {
  const tbody = document.getElementById('customerBody');
  if (data.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="8"><span class="empty-icon">👥</span>No customers found</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(c.name)}</strong></td>
      <td>${esc(c.email)}</td>
      <td>${esc(c.phone || '—')}</td>
      <td>${esc(c.license_no || '—')}</td>
      <td><span class="badge badge-standard">${c.vehicle_count}</span></td>
      <td><span class="badge badge-active">${c.policy_count}</span></td>
      <td>
        <div class="action-btns">
          <button class="btn-icon" title="Edit" onclick="editCustomer(${c.id})">✏️</button>
          <button class="btn-icon" title="Delete" onclick="deleteCustomer(${c.id}, '${esc(c.name)}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

async function saveCustomer(e) {
  e.preventDefault();
  const id = document.getElementById('customerId').value;
  const payload = {
    name:       document.getElementById('cName').value.trim(),
    email:      document.getElementById('cEmail').value.trim(),
    phone:      document.getElementById('cPhone').value.trim(),
    address:    document.getElementById('cAddress').value.trim(),
    dob:        document.getElementById('cDob').value,
    license_no: document.getElementById('cLicense').value.trim()
  };
  try {
    if (id) {
      await api('customers/' + id, 'PUT', payload);
      showToast('Customer updated successfully');
    } else {
      await api('customers', 'POST', payload);
      showToast('Customer added successfully');
    }
    closeAllModals();
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editCustomer(id) {
  try {
    const c = await api('customers/' + id);
    document.getElementById('customerId').value = c.id;
    document.getElementById('cName').value    = c.name || '';
    document.getElementById('cEmail').value   = c.email || '';
    document.getElementById('cPhone').value   = c.phone || '';
    document.getElementById('cAddress').value = c.address || '';
    document.getElementById('cDob').value     = c.dob || '';
    document.getElementById('cLicense').value = c.license_no || '';
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    openModal('customerModal');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteCustomer(id, name) {
  if (!confirm(`Delete customer "${name}"? This will also delete their vehicles, policies, and claims.`)) return;
  try {
    await api('customers/' + id, 'DELETE');
    showToast('Customer deleted');
    loadCustomers();
  } catch (err) { showToast(err.message, 'error'); }
}

// Hook: reset modal title when opening fresh
document.getElementById('customerModal').addEventListener('click', function(){});
function openCustomerModal() {
  document.getElementById('customerModalTitle').textContent = 'Add Customer';
  document.getElementById('customerId').value = '';
  document.getElementById('customerForm').reset();
  openModal('customerModal');
}

// Monkey-patch button in HTML
window.openModal = function(id) {
  if (id === 'customerModal') {
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    document.getElementById('customerId').value = '';
    document.getElementById('customerForm').reset();
  }
  if (id === 'vehicleModal') {
    document.getElementById('vehicleModalTitle').textContent = 'Add Vehicle';
    document.getElementById('vehicleId').value = '';
    document.getElementById('vehicleForm').reset();
    populateCustomerSelect('vCustomerId');
  }
  if (id === 'policyModal') {
    document.getElementById('policyModalTitle').textContent = 'Create Insurance Policy';
    document.getElementById('policyId').value = '';
    document.getElementById('policyForm').reset();
    populateCustomerSelect('pCustomerId');
    const today = new Date().toISOString().slice(0,10);
    document.getElementById('pStartDate').value = today;
    updateEndDate();
    document.getElementById('pPremium').value = '';
    document.getElementById('premiumHint').textContent = '';
  }
  if (id === 'claimModal') {
    document.getElementById('claimForm').reset();
    populatePolicySelect('clPolicyId');
  }
  if (id === 'paymentModal') {
    document.getElementById('paymentForm').reset();
    document.getElementById('pyDate').value = new Date().toISOString().slice(0,10);
    populatePolicySelect('pyPolicyId');
  }
  document.getElementById('modalBackdrop').classList.add('show');
  document.getElementById(id).classList.add('show');
};

// ══════════════════════════════════════════════
//  VEHICLES
// ══════════════════════════════════════════════
async function loadVehicles() {
  try {
    const vehicles = await api('vehicles');
    const tbody = document.getElementById('vehicleBody');
    if (vehicles.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><span class="empty-icon">🚗</span>No vehicles found</td></tr>';
      return;
    }
    tbody.innerHTML = vehicles.map((v, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(v.customer_name)}</td>
        <td><strong>${esc(v.make)}</strong></td>
        <td>${esc(v.model)}</td>
        <td>${v.year}</td>
        <td><span class="badge badge-standard">${capitalize(v.vehicle_type)}</span></td>
        <td>${esc(v.plate_no || '—')}</td>
        <td>${esc(v.color || '—')}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon" title="Edit" onclick="editVehicle(${v.id})">✏️</button>
            <button class="btn-icon" title="Delete" onclick="deleteVehicle(${v.id}, '${esc(v.make)} ${esc(v.model)}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

async function saveVehicle(e) {
  e.preventDefault();
  const id = document.getElementById('vehicleId').value;
  const payload = {
    customer_id:  document.getElementById('vCustomerId').value,
    make:         document.getElementById('vMake').value.trim(),
    model:        document.getElementById('vModel').value.trim(),
    year:         parseInt(document.getElementById('vYear').value),
    vehicle_type: document.getElementById('vType').value,
    color:        document.getElementById('vColor').value.trim(),
    plate_no:     document.getElementById('vPlate').value.trim(),
    vin:          document.getElementById('vVin').value.trim()
  };
  try {
    if (id) {
      await api('vehicles/' + id, 'PUT', payload);
      showToast('Vehicle updated');
    } else {
      await api('vehicles', 'POST', payload);
      showToast('Vehicle added');
    }
    closeAllModals();
    loadVehicles();
  } catch (err) { showToast(err.message, 'error'); }
}

async function editVehicle(id) {
  try {
    const v = await api('vehicles/' + id);
    await populateCustomerSelect('vCustomerId');
    document.getElementById('vehicleId').value    = v.id;
    document.getElementById('vCustomerId').value  = v.customer_id;
    document.getElementById('vMake').value         = v.make || '';
    document.getElementById('vModel').value        = v.model || '';
    document.getElementById('vYear').value         = v.year || '';
    document.getElementById('vType').value         = v.vehicle_type || 'sedan';
    document.getElementById('vColor').value        = v.color || '';
    document.getElementById('vPlate').value        = v.plate_no || '';
    document.getElementById('vVin').value          = v.vin || '';
    document.getElementById('vehicleModalTitle').textContent = 'Edit Vehicle';
    document.getElementById('modalBackdrop').classList.add('show');
    document.getElementById('vehicleModal').classList.add('show');
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteVehicle(id, name) {
  if (!confirm(`Delete vehicle "${name}"?`)) return;
  try {
    await api('vehicles/' + id, 'DELETE');
    showToast('Vehicle deleted');
    loadVehicles();
  } catch (err) { showToast(err.message, 'error'); }
}

// ══════════════════════════════════════════════
//  POLICIES
// ══════════════════════════════════════════════
let policyFilter = 'all';

async function loadPolicies() {
  try {
    allPolicies = await api('policies');
    renderPolicies(allPolicies);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderPolicies(data) {
  const filtered = policyFilter === 'all' ? data : data.filter(p => p.status === policyFilter);
  const tbody = document.getElementById('policyBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><span class="empty-icon">📋</span>No policies found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${p.policy_no}</strong></td>
      <td>${esc(p.customer_name)}</td>
      <td style="white-space:nowrap">${esc(p.vehicle_info)}</td>
      <td>${typeBadge(p.insurance_type)}</td>
      <td><strong>$${Number(p.premium).toLocaleString()}</strong></td>
      <td>${fmtDate(p.start_date)}</td>
      <td>${fmtDate(p.end_date)}</td>
      <td>${statusBadge(p.status)}</td>
      <td>
        <div class="action-btns">
          ${p.status === 'expired' ? `<button class="btn btn-sm btn-success" onclick="renewPolicy(${p.id})">🔄 Renew</button>` : ''}
          <button class="btn-icon" title="Delete" onclick="deletePolicy(${p.id}, '${p.policy_no}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterPolicies(status, btn) {
  policyFilter = status;
  document.querySelectorAll('#sec-policies .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderPolicies(allPolicies);
}

async function savePolicy(e) {
  e.preventDefault();
  const payload = {
    customer_id:    document.getElementById('pCustomerId').value,
    vehicle_id:     document.getElementById('pVehicleId').value,
    insurance_type: document.getElementById('pType').value,
    coverage_amt:   parseFloat(document.getElementById('pCoverage').value) || 0,
    premium:        parseFloat(document.getElementById('pPremium').value),
    start_date:     document.getElementById('pStartDate').value,
    end_date:       document.getElementById('pEndDate').value
  };
  try {
    await api('policies', 'POST', payload);
    showToast('Policy created successfully! 🎉');
    closeAllModals();
    loadPolicies();
  } catch (err) { showToast(err.message, 'error'); }
}

async function renewPolicy(id) {
  if (!confirm('Renew this policy for 1 more year?')) return;
  try {
    const result = await api('policies/' + id + '/renew', 'PATCH');
    showToast('Policy renewed! New expiry: ' + fmtDate(result.new_end_date));
    loadPolicies();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deletePolicy(id, no) {
  if (!confirm(`Delete policy "${no}"?`)) return;
  try {
    await api('policies/' + id, 'DELETE');
    showToast('Policy deleted');
    loadPolicies();
  } catch (err) { showToast(err.message, 'error'); }
}

// Load vehicles when customer changes in policy modal
async function loadVehiclesForCustomer() {
  const cid = document.getElementById('pCustomerId').value;
  if (!cid) return;
  const vSel = document.getElementById('pVehicleId');
  vSel.innerHTML = '<option value="">Loading…</option>';
  try {
    const vehicles = await api('vehicles/customer/' + cid);
    vSel.innerHTML = vehicles.length
      ? vehicles.map(v => `<option value="${v.id}">${v.make} ${v.model} (${v.year}) — ${v.vehicle_type}</option>`).join('')
      : '<option value="">No vehicles for this customer</option>';
    autoCalcPremium();
  } catch (err) { vSel.innerHTML = '<option value="">Error loading vehicles</option>'; }
}

// Auto-calculate premium
async function autoCalcPremium() {
  const vehicleId = document.getElementById('pVehicleId').value;
  const insType   = document.getElementById('pType').value;
  const months    = parseInt(document.getElementById('pDuration').value) || 12;
  if (!vehicleId || !insType) return;
  try {
    const result = await api('calculate-premium', 'POST', { vehicle_id: vehicleId, insurance_type: insType, months });
    document.getElementById('pPremium').value = result.premium;
    document.getElementById('premiumHint').textContent = `Auto-calculated: $${result.premium} for ${months} months`;
    updateCoverageInfo(insType);
  } catch (err) {}
}

function updateCoverageInfo(type) {
  const info = {
    basic:         '✓ Bodily Injury Liability  ✓ Property Damage Liability',
    standard:      '✓ Everything in Basic  ✓ Uninsured Motorist  ✓ Medical Payments',
    comprehensive: '✓ Everything in Standard  ✓ Collision  ✓ Comprehensive  ✓ Rental Reimbursement',
    premium:       '✓ Everything in Comprehensive  ✓ Gap Insurance  ✓ Roadside Assistance  ✓ New Car Replacement'
  };
  document.getElementById('coverageDetails').textContent = info[type] || '';
}

function updateEndDate() {
  const start   = document.getElementById('pStartDate').value;
  const months  = parseInt(document.getElementById('pDuration').value) || 12;
  if (!start) return;
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);
  document.getElementById('pEndDate').value = end.toISOString().slice(0,10);
}

// ══════════════════════════════════════════════
//  CLAIMS
// ══════════════════════════════════════════════
let claimFilter = 'all';

async function loadClaims() {
  try {
    allClaims = await api('claims');
    renderClaims(allClaims);
  } catch (err) { showToast(err.message, 'error'); }
}

function renderClaims(data) {
  const filtered = claimFilter === 'all' ? data : data.filter(c => c.status === claimFilter);
  const tbody = document.getElementById('claimBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="9"><span class="empty-icon">📋</span>No claims found</td></tr>';
    return;
  }
  tbody.innerHTML = filtered.map((c, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${c.claim_no}</strong></td>
      <td>${esc(c.customer_name)}</td>
      <td>${c.policy_no}</td>
      <td>${capitalize(c.claim_type)}</td>
      <td><strong>$${Number(c.amount).toLocaleString()}</strong></td>
      <td>${claimStatusBadge(c.status)}</td>
      <td>${fmtDate(c.submitted_at ? c.submitted_at.slice(0,10) : '')}</td>
      <td>
        <div class="action-btns">
          ${c.status === 'pending' ? `<button class="btn btn-sm btn-warning" onclick="openClaimStatusModal(${c.id}, '${c.claim_no}')">Update</button>` : ''}
          <button class="btn-icon" title="Delete" onclick="deleteClaim(${c.id}, '${c.claim_no}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterClaims(status, btn) {
  claimFilter = status;
  document.querySelectorAll('#sec-claims .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  renderClaims(allClaims);
}

async function saveClaim(e) {
  e.preventDefault();
  const payload = {
    policy_id:   document.getElementById('clPolicyId').value,
    claim_type:  document.getElementById('clType').value,
    amount:      parseFloat(document.getElementById('clAmount').value) || 0,
    description: document.getElementById('clDescription').value.trim()
  };
  try {
    await api('claims', 'POST', payload);
    showToast('Claim submitted successfully');
    closeAllModals();
    loadClaims();
  } catch (err) { showToast(err.message, 'error'); }
}

function openClaimStatusModal(id, no) {
  currentClaimId = id;
  document.getElementById('claimStatusInfo').textContent = `Claim: ${no}`;
  openModal('claimStatusModal');
}

async function updateClaimStatus(status) {
  try {
    await api('claims/' + currentClaimId + '/status', 'PATCH', { status });
    showToast('Claim ' + status);
    closeAllModals();
    loadClaims();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteClaim(id, no) {
  if (!confirm(`Delete claim "${no}"?`)) return;
  try {
    await api('claims/' + id, 'DELETE');
    showToast('Claim deleted');
    loadClaims();
  } catch (err) { showToast(err.message, 'error'); }
}

// ══════════════════════════════════════════════
//  PAYMENTS
// ══════════════════════════════════════════════
async function loadPayments() {
  try {
    const payments = await api('payments');
    const tbody = document.getElementById('paymentBody');
    if (payments.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7"><span class="empty-icon">💳</span>No payments recorded</td></tr>';
      return;
    }
    tbody.innerHTML = payments.map((p, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${esc(p.customer_name)}</td>
        <td>${p.policy_no}</td>
        <td><strong>$${Number(p.amount).toLocaleString()}</strong></td>
        <td>${fmtDate(p.payment_date)}</td>
        <td>${capitalize(p.payment_method.replace(/_/g,' '))}</td>
        <td>${statusBadge(p.status)}</td>
      </tr>
    `).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

async function savePayment(e) {
  e.preventDefault();
  const payload = {
    policy_id:      document.getElementById('pyPolicyId').value,
    amount:         parseFloat(document.getElementById('pyAmount').value),
    payment_date:   document.getElementById('pyDate').value,
    payment_method: document.getElementById('pyMethod').value,
    notes:          document.getElementById('pyNotes').value.trim()
  };
  try {
    await api('payments', 'POST', payload);
    showToast('Payment recorded');
    closeAllModals();
    loadPayments();
  } catch (err) { showToast(err.message, 'error'); }
}

// ══════════════════════════════════════════════
//  RENEWALS
// ══════════════════════════════════════════════
async function loadRenewals() {
  try {
    const renewals = await api('renewals');
    const tbody = document.getElementById('renewalBody');
    if (renewals.length === 0) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="10"><span class="empty-icon">🎉</span>No upcoming renewals in the next 60 days!</td></tr>';
      return;
    }
    tbody.innerHTML = renewals.map((r, i) => {
      const days  = Math.ceil(r.days_remaining);
      const dCls  = days <= 10 ? 'days-critical' : days <= 30 ? 'days-warning' : 'days-ok';
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${esc(r.customer_name)}</strong></td>
          <td><small>${esc(r.email)}<br>${esc(r.phone || '')}</small></td>
          <td>${esc(r.vehicle_info)}</td>
          <td>${r.policy_no}</td>
          <td>${typeBadge(r.insurance_type)}</td>
          <td>$${Number(r.premium).toLocaleString()}</td>
          <td>${fmtDate(r.end_date)}</td>
          <td><span class="badge ${dCls}">${days} days</span></td>
          <td><button class="btn btn-sm btn-success" onclick="renewPolicy(${r.id})">🔄 Renew</button></td>
        </tr>
      `;
    }).join('');
  } catch (err) { showToast(err.message, 'error'); }
}

// ══════════════════════════════════════════════
//  REPORTS
// ══════════════════════════════════════════════
async function loadReports() {
  try {
    const data = await api('report');
    const s = data.stats;

    // Business Overview
    document.getElementById('reportStats').innerHTML = [
      ['Total Customers',      s.total_customers],
      ['Total Vehicles',       s.total_vehicles],
      ['Total Policies',       s.total_policies],
      ['Active Policies',      s.active_policies],
      ['Expired Policies',     s.expired_policies],
      ['Total Premium Billed', '$' + Number(s.total_premium_billed).toLocaleString()],
      ['Total Collected',      '$' + Number(s.total_collected).toLocaleString()],
      ['Total Claims',         s.total_claims],
      ['Claims Approved',      s.approved_claims],
      ['Claims Rejected',      s.rejected_claims],
      ['Claims Pending',       s.pending_claims],
      ['Total Claim Payout',   '$' + Number(s.total_claim_amount).toLocaleString()],
    ].map(([k, v]) => `<div class="report-row"><span class="rk">${k}</span><span class="rv">${v}</span></div>`).join('');

    // By Type
    document.getElementById('reportByType').innerHTML = data.by_type.map(t => `
      <div class="report-row">
        <span class="rk">${typeBadge(t.insurance_type)}</span>
        <span class="rv">${t.count} policies — $${Number(t.revenue).toLocaleString()}</span>
      </div>
    `).join('');

    // Top Customers
    document.getElementById('reportTopCustomers').innerHTML = data.top_customers.map((c, i) => `
      <div class="report-row">
        <span class="rk">${i + 1}. ${esc(c.name)}</span>
        <span class="rv">${c.policies} policies — $${Number(c.total_premium || 0).toLocaleString()}</span>
      </div>
    `).join('');

    // Monthly
    document.getElementById('reportMonthly').innerHTML = data.monthly.map(m => `
      <div class="report-row">
        <span class="rk">${m.month}</span>
        <span class="rv">${m.count} payments — $${Number(m.total).toLocaleString()}</span>
      </div>
    `).join('');

    // Report Revenue Chart
    renderChart('chartReportRevenue', 'bar', {
      labels: data.monthly.map(m => m.month).reverse(),
      datasets: [{
        label: 'Monthly Revenue ($)',
        data:  data.monthly.map(m => m.total).reverse(),
        backgroundColor: 'rgba(37,99,235,.7)',
        borderRadius: 6, borderSkipped: false
      }]
    }, {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { callback: v => '$' + v.toLocaleString() } } }
    });

    // Footer
    document.getElementById('reportFooter').innerHTML = `
      Report generated on ${new Date(data.generated_at).toLocaleString()} •
      Vehicle Insurance Management System v1.0
    `;
  } catch (err) { showToast(err.message, 'error'); }
}

function printReport() {
  window.print();
}

// ══════════════════════════════════════════════
//  SELECT HELPERS
// ══════════════════════════════════════════════
async function populateCustomerSelect(selId) {
  const sel = document.getElementById(selId);
  try {
    if (allCustomers.length === 0) allCustomers = await api('customers');
    sel.innerHTML = allCustomers.length
      ? ['<option value="">Select customer…</option>', ...allCustomers.map(c => `<option value="${c.id}">${esc(c.name)} (${esc(c.email)})</option>`)].join('')
      : '<option value="">No customers available</option>';
  } catch (err) { sel.innerHTML = '<option value="">Error loading</option>'; }
}

async function populatePolicySelect(selId) {
  const sel = document.getElementById(selId);
  try {
    if (allPolicies.length === 0) allPolicies = await api('policies');
    const active = allPolicies.filter(p => p.status === 'active');
    sel.innerHTML = active.length
      ? ['<option value="">Select active policy…</option>',
         ...active.map(p => `<option value="${p.id}">${p.policy_no} — ${esc(p.customer_name)} — ${esc(p.vehicle_info)}</option>`)
        ].join('')
      : '<option value="">No active policies</option>';
  } catch (err) { sel.innerHTML = '<option value="">Error loading</option>'; }
}

// ══════════════════════════════════════════════
//  TABLE SEARCH FILTER
// ══════════════════════════════════════════════
function filterTable(tableId, query) {
  const q = query.toLowerCase();
  const rows = document.querySelectorAll(`#${tableId} tbody tr:not(.empty-row)`);
  let visible = 0;
  rows.forEach(row => {
    const match = row.textContent.toLowerCase().includes(q);
    row.style.display = match ? '' : 'none';
    if (match) visible++;
  });
}

// ══════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusBadge(status) {
  const cls = {
    active: 'badge-active', expired: 'badge-expired',
    completed: 'badge-completed', pending: 'badge-pending'
  }[status] || 'badge-standard';
  return `<span class="badge ${cls}">${capitalize(status)}</span>`;
}

function claimStatusBadge(status) {
  const cls = { approved: 'badge-approved', rejected: 'badge-rejected', pending: 'badge-pending' }[status] || '';
  return `<span class="badge ${cls}">${capitalize(status)}</span>`;
}

function typeBadge(type) {
  return `<span class="badge badge-${type}">${capitalize(type)}</span>`;
}
