/**
 * Paymob Payment Utility — Hosted Checkout Redirect
 * ───────────────────────────────────────────────────
 * Flow:
 *   1. Auth token
 *   2. Create order
 *   3. Get payment key
 *   4. Auto-create iframe via API (no dashboard needed)
 *   5. Redirect to Paymob hosted checkout
 */

const API_KEY        = import.meta.env.VITE_PAYMOB_API_KEY;
const INTEGRATION_ID = import.meta.env.VITE_PAYMOB_INTEGRATION_ID || '4087695';
const BASE           = 'https://accept.paymob.com/api';

/* ── Step 1: Auth ── */
async function getAuthToken() {
  const res = await fetch(`${BASE}/auth/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: API_KEY }),
  });
  if (!res.ok) throw new Error('Paymob auth failed');
  return (await res.json()).token;
}

/* ── Step 2: Create order ── */
async function createOrder(authToken, amountCents) {
  const res = await fetch(`${BASE}/ecommerce/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:      authToken,
      delivery_needed: false,
      amount_cents:    amountCents,
      currency:        'EGP',
      items:           [],
    }),
  });
  if (!res.ok) throw new Error('Paymob order creation failed');
  return (await res.json()).id;
}

/* ── Step 3: Get payment key ── */
async function getPaymentKey(authToken, orderId, amountCents, student) {
  const nameParts = (student.name || 'Student User').split(' ');
  const res = await fetch(`${BASE}/acceptance/payment_keys`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:     authToken,
      amount_cents:   amountCents,
      expiration:     3600,
      order_id:       orderId,
      currency:       'EGP',
      integration_id: Number(INTEGRATION_ID),
      billing_data: {
        first_name:      nameParts[0] || 'Student',
        last_name:       nameParts.slice(1).join(' ') || 'User',
        email:           student.email || 'student@edusense.cloud',
        phone_number:    student.phone || '+201000000000',
        apartment:       'NA', floor:    'NA',
        street:          'NA', building: 'NA',
        postal_code:     'NA', city:     'Cairo',
        country:         'EG', state:    'Cairo',
        shipping_method: 'NA',
      },
    }),
  });
  if (!res.ok) throw new Error('Paymob payment key failed');
  return (await res.json()).token;
}

/* ── Step 4: Get or auto-create iframe ID ── */
async function getIframeId(authToken) {
  // Use cached iframe ID if available
  const cached = localStorage.getItem('es_paymob_iframe_id');
  if (cached) return cached;

  // Try to create one via Paymob API (no dashboard needed)
  const res = await fetch(`${BASE}/acceptance/iframes/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:    authToken,
      name:          'EduSense Payment',
      integration_id: Number(INTEGRATION_ID),
    }),
  });

  if (res.ok) {
    const data     = await res.json();
    const iframeId = String(data.id);
    localStorage.setItem('es_paymob_iframe_id', iframeId);
    return iframeId;
  }

  // Try fetching existing iframes
  const listRes = await fetch(`${BASE}/acceptance/iframes/?page_size=5`, {
    headers: { 'Authorization': `Bearer ${authToken}` },
  });
  if (listRes.ok) {
    const list = await listRes.json();
    const first = list?.results?.[0]?.id || list?.[0]?.id;
    if (first) {
      localStorage.setItem('es_paymob_iframe_id', String(first));
      return String(first);
    }
  }

  throw new Error('Could not obtain iframe ID from Paymob. Please contact Paymob support (MID: 874404).');
}

/**
 * Main — call when student clicks "Pay Now"
 */
export async function initiatePaymobPayment(student, amount, feeId) {
  if (!API_KEY) {
    alert('Payment gateway is not configured.');
    return;
  }

  // Save pending fee for return handler
  sessionStorage.setItem('es_pending_fee', JSON.stringify({
    feeId, studentId: student.id, amount, timestamp: Date.now(),
  }));

  const amountCents  = Math.round(amount * 100);
  const authToken    = await getAuthToken();
  const orderId      = await createOrder(authToken, amountCents);
  const paymentKey   = await getPaymentKey(authToken, orderId, amountCents, student);
  const iframeId     = await getIframeId(authToken);

  // Redirect to Paymob hosted checkout
  window.location.href =
    `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
}

/**
 * Call on return from Paymob — marks fee as paid if success=true
 */
export function handlePaymobReturn() {
  const params  = new URLSearchParams(window.location.search);
  const success = params.get('success') === 'true';
  const pending = sessionStorage.getItem('es_pending_fee');

  if (!pending) return { success: false, reason: 'no_pending' };

  const { feeId, studentId, amount } = JSON.parse(pending);
  sessionStorage.removeItem('es_pending_fee');

  if (success) {
    const today  = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const paidDate = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const key       = `es_fees_${studentId}`;
    const overrides = JSON.parse(localStorage.getItem(key) || '{}');
    overrides[feeId] = { status: 'paid', paidDate, method: 'Paymob Online', amount };
    localStorage.setItem(key, JSON.stringify(overrides));
    return { success: true, feeId, studentId, amount };
  }

  return { success: false, feeId, studentId };
}
