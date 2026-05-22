import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { handlePaymobReturn } from '../utils/paymob';

export default function PaymentReturnPage() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const r = handlePaymobReturn();
    setResult(r);
  }, []);

  if (!result) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0f172a,#1e1b4b)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        style={{
          background: '#1e293b',
          borderRadius: 24,
          padding: '48px 56px',
          textAlign: 'center',
          maxWidth: 440,
          width: '90%',
          border: `2px solid ${result.success ? '#10b98133' : '#ef444433'}`,
          boxShadow: `0 0 60px ${result.success ? '#10b98120' : '#ef444420'}`,
        }}
      >
        <div style={{ fontSize: 64, marginBottom: 20 }}>
          {result.success ? '✅' : '❌'}
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 10 }}>
          {result.success ? 'Payment Successful!' : 'Payment Failed'}
        </div>

        <div style={{ fontSize: 14, color: '#94a3b8', marginBottom: 32, lineHeight: 1.6 }}>
          {result.success
            ? `Your payment of EGP ${result.amount?.toFixed(2)} has been received. Your fee record has been updated.`
            : 'Your payment was not completed. No charges were made. Please try again.'}
        </div>

        {result.success && (
          <div style={{
            background: '#10b98115',
            border: '1px solid #10b98133',
            borderRadius: 12,
            padding: '14px 20px',
            marginBottom: 28,
            fontSize: 12,
            color: '#10b981',
            fontWeight: 600,
          }}>
            🎓 Your grades are now accessible. Fee status updated.
          </div>
        )}

        <button
          onClick={() => window.location.href = '/'}
          style={{
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            border: 'none',
            borderRadius: 12,
            padding: '14px 32px',
            fontSize: 14,
            fontWeight: 700,
            color: '#fff',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          Return to EduSense Portal
        </button>
      </motion.div>
    </div>
  );
}
