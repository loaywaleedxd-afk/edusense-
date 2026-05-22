/**
 * Paymob Payment Utility — Unified Checkout (Intention API)
 * ──────────────────────────────────────────────────────────
 * No iframe ID needed. Flow:
 *   1. POST /v1/intention/ with secret key → get client_secret
 *   2. Redirect to Paymob Unified Checkout with public key + client_secret
 *   3. Paymob redirects back with ?success=true/false
 */

const SECRET_KEY     = import.meta.env.VITE_PAYMOB_SECRET_KEY;
const PUBLIC_KEY     = import.meta.env.VITE_PAYMOB_PUBLIC_KEY;
const INTEGRATION_ID = import.meta.env.VITE_PAYMOB_INTEGRATION_ID || '4087695';

// Where Paymob sends the student after payment
const RETURN_URL = import.meta.env.DEV
  ? 'http://localhost:5173'
  : (import.meta.env.VITE_APP_URL || 'https://edusense.cloud');

/**
 * Main function — call this when student clicks "Pay Now"
 *
 * @param {object} student  — { id, name, email, phone }
 * @param {number} amount   — amount in EGP (e.g. 800.50)
 * @param {string} feeId    — fee record ID, stored in sessionStorage for return handler
 */
export async function initiatePaymobPayment(student, amount, feeId) {
  if (!SECRET_KEY || !PUBLIC_KEY) {
    alert('Payment gateway is not configured. Please contact the administrator.');
    return;
  }

  // Store pending fee so we can mark it paid on return
  sessionStorage.setItem('es_pending_fee', JSON.stringify({
    feeId,
    studentId: student.id,
    amount,
    timestamp: Date.now(),
  }));

  const amountCents = Math.round(amount * 100);
  const nameParts   = (student.name || 'Student User').split(' ');
  const firstName   = nameParts[0] || 'Student';
  const lastName    = nameParts.slice(1).join(' ') || 'User';

  // Step 1: Create payment intention
  const res = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount:          amountCents,
      currency:        'EGP',
      payment_methods: [Number(INTEGRATION_ID)],
      items: [{
        name:     'University Fee',
        amount:   amountCents,
        description: 'EduSense University Fee Payment',
        quantity: 1,
      }],
      billing_data: {
        first_name:   firstName,
        last_name:    lastName,
        email:        student.email || 'student@edusense.cloud',
        phone_number: student.phone || '+201000000000',
        apartment:    'NA',
        floor:        'NA',
        street:       'NA',
        building:     'NA',
        postal_code:  'NA',
        city:         'Cairo',
        country:      'EG',
        state:        'Cairo',
      },
      customer: {
        first_name: firstName,
        last_name:  lastName,
        email:      student.email || 'student@edusense.cloud',
      },
      redirection_url:  RETURN_URL,
      notification_url: `${RETURN_URL}/payment-notify`,
      extras: { student_id: student.id, fee_id: feeId },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('Paymob intention error:', err);
    throw new Error(err?.message || 'Failed to create payment intention');
  }

  const data         = await res.json();
  const clientSecret = data.client_secret;

  if (!clientSecret) throw new Error('No client_secret returned from Paymob');

  // Step 2: Redirect to Paymob Unified Checkout
  window.location.href =
    `https://accept.paymob.com/unifiedcheckout/?publicKey=${PUBLIC_KEY}&clientSecret=${clientSecret}`;
}

/**
 * Call this on the payment return page.
 * Reads Paymob's redirect params + sessionStorage → marks fee as paid if success.
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
