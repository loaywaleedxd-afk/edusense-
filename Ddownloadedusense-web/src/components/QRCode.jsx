import { useEffect, useRef } from 'react';
import QRCodeLib from 'qrcode';

export default function QRCode({ value, size = 200, color = '#3b82f6' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' },
    });
  }, [value, size, color]);

  return <canvas ref={canvasRef} style={{ borderRadius: 12 }} />;
}
