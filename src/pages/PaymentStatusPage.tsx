import React from 'react';
import useStore from '../store/useStore';
import { CheckIcon, CloseIcon, InfoIcon } from '../components/Icons';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const PaymentStatusPage: React.FC = () => {
  const { paymentStatus, resetPaymentStatus, navigate } = useStore(state => ({
    paymentStatus: state.paymentStatus,
    resetPaymentStatus: state.resetPaymentStatus,
    navigate: state.navigate,
  }));

  const isSuccess = paymentStatus.status === 'success';
  const summary = paymentStatus.summary || null;

  const handleFinish = () => {
    resetPaymentStatus();
    navigate('browse');
  };

  const handleGoToCart = () => {
    resetPaymentStatus();
    navigate('cart');
  };

  if (!paymentStatus.status) {
    return (
      <div className="bg-white border-4 border-black p-8 text-center shadow-[6px_6px_0_0_#000]">
        <h1 className="text-4xl font-black uppercase mb-4">Payment Center</h1>
        <p className="text-lg text-black/70 mb-6">
          No recent payment events. Start a checkout from your cart to simulate a payment.
        </p>
        <button
          type="button"
          onClick={() => navigate('browse')}
          className="px-6 py-3 border-4 border-black bg-[#FFD700] font-black uppercase tracking-wide hover:bg-black hover:text-[#FFD700] transition-colors"
        >
          Back to Shop
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`border-4 border-black p-6 shadow-[6px_6px_0_0_#000] ${
          isSuccess ? 'bg-green-50' : 'bg-red-50'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-14 h-14 border-4 border-black flex items-center justify-center ${
                isSuccess ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {isSuccess ? <CheckIcon className="w-8 h-8" /> : <CloseIcon className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase">
                {isSuccess ? 'Payment Successful' : 'Payment Cancelled'}
              </h1>
              <p className="text-sm text-black/70">
                {paymentStatus.message || (isSuccess ? 'Thank you for your purchase!' : 'No charges have been made.')}
              </p>
            </div>
          </div>
          {paymentStatus.orderId && (
            <div className="text-sm font-bold uppercase bg-white border-2 border-black px-3 py-2">
              Order ID: {paymentStatus.orderId}
            </div>
          )}
        </div>
        {paymentStatus.isSimulated && (
          <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-bold uppercase text-black">
            <InfoIcon className="w-4 h-4" />
            Global payment test mode was active. This transaction was simulated locally.
          </div>
        )}
      </div>

      {summary ? (
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm sm:text-base font-bold">
                <div className="p-3 border-2 border-black bg-gray-50">
                  <p className="uppercase text-black/70 text-xs">Subtotal</p>
                  <p className="text-2xl">{formatCurrency(summary.subtotal)}</p>
                </div>
                <div className="p-3 border-2 border-black bg-gray-50">
                  <p className="uppercase text-black/70 text-xs">Tips</p>
                  <p className="text-2xl">{formatCurrency(summary.tip)}</p>
                </div>
                <div className="p-3 border-2 border-black bg-gray-50">
                  <p className="uppercase text-black/70 text-xs">Delivery Fee</p>
                  <p className="text-2xl">{formatCurrency(summary.deliveryFee)}</p>
                </div>
                <div className="p-3 border-2 border-black bg-[#FFD700]">
                  <p className="uppercase text-black/70 text-xs">Total Paid</p>
                  <p className="text-2xl text-[#E60012]">{formatCurrency(summary.total)}</p>
                </div>
              </div>
              <div className="border-2 border-dashed border-black/40 p-4 text-sm text-black/80 space-y-1">
                <p>
                  <span className="font-bold uppercase mr-2">Email:</span>
                  {summary.email}
                </p>
                <p>
                  <span className="font-bold uppercase mr-2">Shipping:</span>
                  {summary.shippingMethod === 'delivery'
                    ? `Delivery (${summary.deliveryZone === 'region' ? 'Region' : 'City'})`
                    : summary.shippingMethod === 'pickup'
                      ? 'Pickup'
                      : 'Not selected'}
                </p>
                <p>
                  <span className="font-bold uppercase mr-2">Created:</span>
                  {new Date(summary.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex-1 border-2 border-black">
              <div className="border-b-2 border-black bg-gray-100 px-4 py-2 font-black uppercase">
                Items ({summary.items.reduce((acc, item) => acc + item.quantity, 0)})
              </div>
              <div className="divide-y-2 divide-dashed divide-black/20">
                {summary.items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-16 h-16 object-cover border-2 border-black"
                    />
                    <div className="flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-black/70">
                        {item.quantity} × {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-black text-[#FF0000]">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000] text-sm text-black/70">
          Order details are unavailable for this payment. This can happen if the summary was cleared
          or you are returning after a long delay.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleFinish}
          className="flex-1 px-6 py-4 border-4 border-black bg-[#FFD700] font-black uppercase tracking-wide hover:bg-black hover:text-[#FFD700] transition-colors"
        >
          Continue Shopping
        </button>
        {!isSuccess && (
          <button
            type="button"
            onClick={handleGoToCart}
            className="flex-1 px-6 py-4 border-4 border-black bg-white font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
          >
            Review Cart
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentStatusPage;

