/**
 * Paymob Payment Utility — Payment Link flow
 * ────────────────────────────────────────────
 * Uses the PAYMENT LINK integration (4087695) which is what
 * this account has available. Flow:
 *   1. Auth token
 *   2. Create payment link → get redirect URL
 *   3. Redirect student to Paymob hosted page
 */

const API_KEY        = import.meta.env.VITE_PAYMOB_API_KEY;
const INTEGRATION_ID = '4087695'; // PAYMENT LINK — VPC — online
const BASE           = 'https://accept.paymob.com/api';

const RETURN_URL = import.meta.env.DEV
  ? 'http://localhost:5173'
  : (import.meta.env.VITE_APP_URL || 'https://edusense.cloud');

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

/* ── Step 2: Create payment link ── */
async function createPaymentLink(authToken, amountCents, student) {
  const nameParts = (student.name || 'Student User').split(' ');

  const res = await fetch(`${BASE}/ecommerce/payment-links`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_token:            authToken,
      integration_id:        Number(INTEGRATION_ID),
      amount_cents:          amountCents,
      currency:              'EGP',
      client_name:           student.name || 'Student',
      client_email:          student.email || 'student@edusense.cloud',
      client_phone:          student.phone || '+201000000000',
      first_name:            nameParts[0] || 'Student',
      last_name:             nameParts.slice(1).join(' ') || 'User',
      show_client_info:      false,
      notify_client_by_email: false,
      notify_client_by_sms:  false,
      redirect_url:          RETURN_URL,
      description:           'EduSense University Fee Payment',
      is_live:               true,
      payment_methods:       [Number(INTEGRATION_ID)],
    }),
  });

  const body = await res.json().catch(() => ({}));
  console.log('Paymob payment-link response:', body);

  if (!res.ok) throw new Error(`Payment link failed: ${JSON.stringify(body)}`);

  // Response may contain url, payment_url, or checkout_url
  const url = body.url || body.payment_url || body.checkout_url || body.redirect_url;
  if (!url) throw new Error(`No URL in response: ${JSON.stringify(body)}`);
  return url;
}

/**
 * Main — call when student clicks "Pay Now"
 */
export async function initiatePaymobPayment(student, amount, feeId) {
  if (!API_KEY) {
    alert('Payment gateway is not configured.');
    return;
  }

  sessionStorage.setItem('es_pending_fee', JSON.stringify({
    feeId, studentId: student.id, amount, timestamp: Date.now(),
  }));

  const amountCents  = Math.round(amount * 100);
  const authToken    = await getAuthToken();
  const paymentUrl   = await createPaymentLink(authToken, amountCents, student);

  window.location.href = paymentUrl;
}

/**
 * Call on return from Paymob — sends ALL URL params to the backend for
 * HMAC verification before marking the fee as paid. Falls back to
 * localStorage only if the backend is unreachable.
 */
export async function handlePaymobReturn() {
  const params  = new URLSearchParams(window.location.search);
  const success = params.get('success') === 'true';
  const pending = sessionStorage.getItem('es_pending_fee');

  if (!pending) return { success: false, reason: 'no_pending' };

  const { feeId, studentId, amount } = JSON.parse(pending);
  sessionStorage.removeItem('es_pending_fee');

  if (!success) return { success: false, feeId, studentId };

  // Build payload: all Paymob URL params + our own student info
  const payload = { student_id: studentId, amount };
  params.forEach((v, k) => { payload[k] = v; });

  // Send to backend for HMAC verification and DB write
  try {
    const res  = await fetch(`${BASE}/api/payment/confirm`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const body = await res.json();
    if (res.ok && body.confirmed) {
      return { success: true, feeId, studentId, amount };
    }
    // Backend rejected the payment (bad HMAC or not successful)
    return { success: false, reason: body.detail || 'verification_failed', feeId, studentId };
  } catch (_) {
    // Backend unreachable — localStorage fallback only
    const today    = new Date();
    const months   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const paidDate = `${months[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const key      = `es_fees_${studentId}`;
    const overrides = JSON.parse(localStorage.getItem(key) || '{}');
    overrides[feeId] = { status: 'paid', paidDate, method: 'Paymob Online', amount };
    localStorage.setItem(key, JSON.stringify(overrides));
    return { success: true, feeId, studentId, amount, offline: true };
  }
}
