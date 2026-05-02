import { useState } from 'react';
import { Check, Zap, Star } from 'lucide-react';
import PaymentModal from './PaymentModal';

function PricingPage({ session, profile, onSubscriptionUpdate, apiUrl }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState(null);

  const handleSelectTier = (tier) => {
    if (!session) {
      alert('Please login to upgrade subscription');
      return;
    }
    setSelectedTier(tier.name);
    setPaymentType('subscription');
    setShowPaymentModal(true);
  };

  const handleQuotaPurchase = () => {
    if (!session) {
      alert('Please login to buy slots');
      return;
    }
    setPaymentType('quota');
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (result) => {
    console.log('Payment created:', result);
    alert('✅ Pesanan dibuat. Silakan selesaikan pembayaran sesuai instruksi yang ditampilkan.');
    if (onSubscriptionUpdate) {
      onSubscriptionUpdate();
    }
  };

  const tiers = [
    {
      name: 'Free',
      price: 'Rp 0',
      period: '/bulan',
      description: 'Untuk artist pemula',
      commission: '15%',
      features: [
        '1 track per bulan',
        'Analytics dasar',
        'Spotify distribution',
        'Email support',
        '15% komisi dari streams'
      ],
      cta: 'Mulai Gratis',
      color: 'bg-gray-50',
      borderColor: 'border-gray-200',
      ctaColor: 'bg-gray-600 hover:bg-gray-700',
      recommended: false
    },
    {
      name: 'Pro',
      price: 'Rp 50.000',
      period: '/bulan',
      description: 'Untuk artist aktif',
      commission: '10%',
      features: [
        'Unlimited tracks',
        'Advanced analytics',
        'Spotify distribution',
        'Priority support',
        '10% komisi dari streams',
        'Batch upload tools',
        'Revenue reports'
      ],
      cta: 'Upgrade ke Pro',
      color: 'bg-purple-50',
      borderColor: 'border-purple-400',
      ctaColor: 'bg-purple-600 hover:bg-purple-700',
      recommended: true
    },
    {
      name: 'Label',
      price: 'Rp 500.000',
      period: '/bulan',
      description: 'Untuk label/distributor',
      commission: '5%',
      features: [
        'Unlimited tracks',
        'Multi-artist management',
        'Advanced analytics',
        'API access',
        '5% komisi dari streams',
        'White-label options',
        'Dedicated account manager'
      ],
      cta: 'Upgrade ke Label',
      color: 'bg-amber-50',
      borderColor: 'border-amber-400',
      ctaColor: 'bg-amber-600 hover:bg-amber-700',
      recommended: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Pilih Paket Anda</h1>
          <p className="text-xl text-gray-600 mb-8">
            Mulai distribusi musik ke Spotify dan terima pembayaran langsung
          </p>
        </div>

        {/* Current Tier Info */}
        {session && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-blue-900">
              <strong>Status Langganan:</strong> {profile?.subscription_tier || 'free'} 
              {' • '}
              <strong>Upload Tersedia:</strong> {profile?.quota || 0} slot
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {tiers.map((tier, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl border-2 overflow-hidden transition-transform hover:scale-105 ${tier.borderColor} ${tier.color}`}
            >
              {tier.recommended && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 text-center font-bold flex items-center justify-center gap-2">
                  <Star size={16} fill="currentColor" /> PALING POPULER
                </div>
              )}

              <div className={`p-8 ${tier.recommended ? 'pt-24' : ''}`}>
                {/* Price */}
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">{tier.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">{tier.description}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-600 ml-2">{tier.period}</span>
                  </div>
                  <div className="mt-2 text-sm text-purple-600 font-semibold">
                    Komisi: {tier.commission}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectTier(tier.name)}
                  className={`w-full font-bold py-3 rounded-lg transition-all text-white ${tier.ctaColor}`}
                >
                  {tier.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Quota Purchase Section */}
        <div className="bg-white rounded-2xl border-2 border-indigo-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Zap size={24} className="text-indigo-600" />
            <h3 className="text-2xl font-bold">Beli Upload Slot</h3>
          </div>
          <p className="text-gray-600 mb-6">
            Tidak tertarik berlangganan? Beli slot upload sebanyak yang Anda butuhkan (Rp 10.000 per slot)
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <p className="text-gray-700 font-semibold mb-2">Slot yang tersedia untuk dibeli: 1-10</p>
              <p className="text-sm text-gray-600">
                Setiap slot memberikan Anda 1 upload track eksklusif dengan komisi default 15%
              </p>
            </div>
            <button
              onClick={handleQuotaPurchase}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition-all whitespace-nowrap"
            >
              Beli Slot
            </button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Pertanyaan Umum
          </h3>
          <div className="space-y-4">
            {[
              {
                q: 'Berapa lama track saya hidup di Spotify?',
                a: 'Track Anda akan tetap live di Spotify selamanya, selama Anda mempertahankan langganan atau terus membayar fee tahunan (jika ada).'
              },
              {
                q: 'Kapan saya bisa menerima pembayaran?',
                a: 'Pembayaran dapat ditarik setelah mencapai minimum Rp 50.000. Proses penarikan 2-7 hari kerja ke rekening bank Anda.'
              },
              {
                q: 'Apa perbedaan Free vs Pro?',
                a: 'Free tier memberi 1 track/bulan dengan komisi 15%, Pro unlimited tracks dengan komisi 10% + tools advanced.'
              },
              {
                q: 'Bisa ganti tier kapan saja?',
                a: 'Ya! Anda bisa upgrade atau downgrade tier kapan saja. Perubahan berlaku mulai periode berikutnya.'
              }
            ].map((item, i) => (
              <details key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                <summary className="font-semibold text-gray-900 cursor-pointer">
                  {item.q}
                </summary>
                <p className="text-gray-600 mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title={paymentType === 'subscription' ? `Upgrade ke ${selectedTier}` : 'Beli Upload Slots'}
        description={
          paymentType === 'subscription'
            ? `Upgrade akun Anda ke tier ${selectedTier} untuk fitur lebih banyak dan komisi lebih rendah.`
            : 'Beli slot upload tambahan untuk mengunggah lebih banyak track.'
        }
        apiEndpoint={paymentType === 'subscription' ? '/api/payments/subscription' : '/api/payments/quota'}
        paymentMode={paymentType}
        subscriptionTier={selectedTier?.toLowerCase()}
        session={session}
        onPaymentSuccess={handlePaymentSuccess}
        apiUrl={apiUrl}
      />
    </div>
  );
}

export default PricingPage;
