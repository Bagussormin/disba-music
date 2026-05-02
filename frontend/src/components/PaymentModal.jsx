import { useState, useEffect } from 'react';
import { CreditCard, AlertCircle } from 'lucide-react';

function PaymentModal({ isOpen, onClose, title, description, apiEndpoint, onPaymentSuccess, apiUrl, paymentMode, subscriptionTier, session }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [slots, setSlots] = useState(1);

  const [paymentResult, setPaymentResult] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setPaymentResult(null);
      setError(null);
      setPaymentMethod('bank_transfer');
      setSlots(1);
    }
  }, [isOpen]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);
      setPaymentResult(null);

      const accessToken = session?.access_token || localStorage.getItem('sb-access-token');
      if (!accessToken) {
        throw new Error('Session expired. Please login again.');
      }

      const body = paymentMode === 'subscription'
        ? { subscriptionTier, paymentMethod }
        : { slots, paymentMethod };

      const response = await fetch(`${apiUrl}${apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Payment initiation failed');
      }

      setPaymentResult(data);
      onPaymentSuccess(data);
    } catch (err) {
      setError(err.message);
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formattedAmount = paymentMode === 'quota'
    ? `Rp ${(slots * 10000).toLocaleString('id-ID')}`
    : subscriptionTier === 'label'
      ? 'Rp 500.000'
      : 'Rp 50.000';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="text-purple-600" size={24} />
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        <p className="text-gray-600 mb-4">{description}</p>

        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
          <p className="text-sm text-gray-500">Metode pembayaran yang tersedia:</p>
          <div className="mt-3 grid gap-3">
            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={() => setPaymentMethod('bank_transfer')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <div>
                <div className="font-semibold">Bank Transfer</div>
                <div className="text-xs text-gray-500">Transfer bank langsung ke rekening Disba.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer">
              <input
                type="radio"
                name="paymentMethod"
                value="qris_dana"
                checked={paymentMethod === 'qris_dana'}
                onChange={() => setPaymentMethod('qris_dana')}
                className="form-radio h-4 w-4 text-indigo-600"
              />
              <div>
                <div className="font-semibold">QRIS / DANA</div>
                <div className="text-xs text-gray-500">Bayar cepat menggunakan QRIS atau aplikasi DANA.</div>
              </div>
            </label>
          </div>
        </div>

        {paymentMode === 'quota' && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-gray-700">Jumlah slot</span>
              <span className="text-sm text-gray-500">Rp 10.000 / slot</span>
            </div>
            <input
              type="number"
              min="1"
              max="10"
              value={slots}
              onChange={(e) => setSlots(Math.max(1, Math.min(10, Number(e.target.value))))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-blue-800 font-semibold">Total Pembayaran</p>
          <p className="text-2xl font-bold text-blue-900 mt-2">{formattedAmount}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <span className="text-red-800 text-sm">{error}</span>
          </div>
        )}

        {paymentResult ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-sm text-green-800 font-semibold">Instruksi Pembayaran</p>
              <p className="mt-3 text-gray-700">Metode: <strong>{paymentResult.paymentMethod === 'bank_transfer' ? 'Bank Transfer BCA' : 'QRIS / DANA'}</strong></p>
              <p className="text-gray-700">Jumlah: <strong>Rp {Number(paymentResult.amount).toLocaleString('id-ID')}</strong></p>
              <p className="text-gray-700">Order ID: <strong>{paymentResult.orderId}</strong></p>
              <div className="mt-3 space-y-2 text-gray-700">
                <p>{paymentResult.instruction.title}</p>
                <p>{paymentResult.instruction.details}</p>
                <p className="font-semibold">{paymentResult.instruction.account}</p>
                <p className="text-sm text-gray-500">{paymentResult.instruction.note}</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all"
            >
              Tutup
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Konfirmasi Pembayaran'}
            </button>

            <button
              onClick={onClose}
              disabled={loading}
              className="w-full border-2 border-gray-300 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Batal
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Pembayaran manual lewat DANA / Bank BCA. Simpan bukti pembayaran untuk verifikasi.
        </p>
      </div>
    </div>
  );
}

export default PaymentModal;
