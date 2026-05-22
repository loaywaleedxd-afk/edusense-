/**
 * Paymob Payment Utility
 * ─────────────────────
 * 3-step flow:
 *   1. Authenticate  → get auth_token
 *   2. Create order  → get order_id
 *   3. Get payment key → redirect to hosted payment page
 */

const PAYMOB_API_KEY      = import.meta.env.VITE_PAYMOB_API_KEY;
const PAYMOB_INTEGRATION  = import.meta.env.VITE_PAYMOB_INTEGRATION_ID || '4087695';
const PAYMOB_IFRAME_ID    = import.meta.env.VITE_PAYMOB_IFRAME_ID || '';

const BASE = 'https://accept.paymob.com/api';

/* ── Step 1: Auth ── */
async function getAuthToken() {
  const res = await fetch(`${BASE}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
  });
  if (!res.ok) throw new Error('Paymob auth failed');
  const data = await res.json();
  return data.token;
}

/* ── Step 2: Create order ── */
async function createOrder(authToken, amountCents, currency = 'EGP') {
  const res = await fetch(`${BASE}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:          authToken,
      delivery_needed:     false,
      amount_cents:        amountCents,
      currency,
      items: [],
    }),
  });
  if (!res.ok) throw new Error('Paymob order creation failed');
  const data = await res.json();
  return data.id;
}

/* ── Step 3: Get payment key ── */
async function getPaymentKey(authToken, orderId, amountCents, student, currency = 'EGP') {
  const res = await fetch(`${BASE}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:     authToken,
      amount_cents:   amountCents,
      expiration:     3600,
      order_id:       orderId,
      currency,
      integration_id: Number(PAYMOB_INTEGRATION),
      billing_data: {
        first_name:   student.name?.split(' ')[0] || 'Student',
        last_name:    student.name?.split(' ').slice(1).join(' ') || 'User',
        email:        student.email || 'student@edusense.cloud',
        phone_number: student.phone || '+201000000000',
        apartment:    'NA',
        floor:        'NA',
        street:       'NA',
        building:     'NA',
        shipping_method: 'NA',
        postal_code:  'NA',
        city:         'Cairo',
        country:      'EG',
        state:        'Cairo',
      },
    }),
  });
  if (!res.ok) throw new Error('Paymob payment key failed');
  const data = await res.json();
  return data.token;
}

/**
 * Main function — call this when student clicks "Pay Now"
 *
 * @param {object} student   — { name, email, phone, id }
 * @param {number} amount    — amount in EGP (e.g. 800)
 * @param {string} feeId     — fee record ID (stored in localStorage on return)
 * @param {string} currency  — 'EGP' default
 */
export async function initiatePaymobPayment(student, amount, feeId, currency = 'EGP') {
  if (!PAYMOB_API_KEY) {
    alert('Paymob is not configured. Please contact the administrator.');
    return;
  }
  if (!PAYMOB_IFRAME_ID) {
    alert('Payment gateway is not fully configured yet. Please contact the administrator.');
    return;
  }

  // Store fee ID so we can mark it paid after redirect
  sessionStorage.setItem('es_pending_fee', JSON.stringify({
    feeId,
    studentId: student.id,
    amount,
    timestamp: Date.now(),
  }));

  const amountCents = Math.round(amount * 100);

  const authToken  = await getAuthToken();
  const orderId    = await createOrder(authToken, amountCents, currency);
  const paymentKey = await getPaymentKey(authToken, orderId, amountCents, student, currency);

  // Redirect to Paymob hosted payment page
  window.location.href = `https://accept.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`;
}

/**
 * Call this on the payment return page (success/pending/error)
 * Reads sessionStorage and marks the fee as paid if success=true
 */
export function handlePaymobReturn() {
  const params  = new URLSearchParams(window.location.search);
  const success = params.get('success') === 'true';
  const pending = sessionStorage.getItem('es_pending_fee');

  if (!pending) return { success: false, reason: 'no_pending' };

  const { feeId, studentId, amount } = JSON.parse(pending);
  sessionStorage.removeItem('es_pending_fee');

  if (success) {
    // Mark fee as paid in localStorage (same format FeeHistoryPage uses)
    const today = new Date();
    const ms    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const paidDate = `${ms[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    const key      = `es_fees_${studentId}`;
    const overrides = JSON.parse(localStorage.getItem(key) || '{}');
    overrides[feeId] = { status: 'paid', paidDate, method: 'Paymob Online', amount };
    localStorage.setItem(key, JSON.stringify(overrides));

    return { success: true, feeId, studentId, amount };
  }

  return { success: false, feeId, studentId };
}
