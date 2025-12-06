import React from 'react';
import useStore from '../store/useStore';
import { CogIcon, CheckIcon, CloseIcon } from '../components/Icons';
import { CheckoutSummary } from '../types';

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const PaymentSimulationPage: React.FC = () => {
  const { paymentSimulation, clearPaymentSimulation, navigate, getCheckoutSummary } = useStore(
    state => ({
      paymentSimulation: state.paymentSimulation,
      clearPaymentSimulation: state.clearPaymentSimulation,
      navigate: state.navigate,
      getCheckoutSummary: state.getCheckoutSummary,
    })
  );

  const summary: CheckoutSummary | null =
    paymentSimulation?.orderId ? getCheckoutSummary(paymentSimulation.orderId) : null;

  if (!paymentSimulation) {
    return (
      <div className="bg-white border-4 border-black p-8 shadow-[6px_6px_0_0_#000] text-center">
        <h1 className="text-4xl font-display uppercase mb-4">Payment Simulator</h1>
        <p className="text-lg text-black/70 mb-6">
          Global payment test mode is disabled. Start a checkout from your cart to access this mock
          gateway.
        </p>
        <button
          type="button"
          onClick={() => navigate('cart')}
          className="px-6 py-3 border-4 border-black bg-[#FFD700] font-black uppercase tracking-wide hover:bg-black hover:text-[#FFD700]"
        >
          Back to Cart
        </button>
      </div>
    );
  }

  const handleComplete = () => {
    clearPaymentSimulation();
    window.location.href = paymentSimulation.successUrl;
  };

  const handleCancel = () => {
    clearPaymentSimulation();
    window.location.href = paymentSimulation.cancelUrl;
  };

  const handleAbort = () => {
    clearPaymentSimulation();
    navigate('cart');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 border-4 border-black bg-[#FFD700] flex items-center justify-center">
            <CogIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase">Mock UniPay Gateway</h1>
            <p className="text-black/70 text-sm">
              Choose how this transaction should resolve. No external payment provider is contacted.
            </p>
          </div>
        </div>
        <div className="mt-4 text-xs sm:text-sm text-black/70">
          Redirect URLs provided by the checkout: <br />
          <span className="font-bold text-black">Success: </span>
          {paymentSimulation.successUrl}
          <br />
          <span className="font-bold text-black">Cancel: </span>
          {paymentSimulation.cancelUrl}
        </div>
      </div>

      {summary && (
        <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-black/70 uppercase">Order ID</p>
              <p className="text-2xl font-black">{summary.orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-black/70 uppercase">Total Due</p>
              <p className="text-3xl font-black text-[#E60012]">{formatCurrency(summary.total)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {summary.items.map(item => (
              <div key={item.productId} className="border-2 border-dashed border-black/30 p-3 flex gap-3">
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
                <p className="font-black">{formatCurrency(item.unitPrice * item.quantity)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={handleComplete}
          className="flex items-center justify-center gap-2 px-6 py-5 border-4 border-black bg-green-500 text-white font-black uppercase tracking-wide hover:bg-green-600 transition-colors"
        >
          <CheckIcon className="w-6 h-6" />
          Complete Payment
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="flex items-center justify-center gap-2 px-6 py-5 border-4 border-black bg-red-500 text-white font-black uppercase tracking-wide hover:bg-red-600 transition-colors"
        >
          <CloseIcon className="w-6 h-6" />
          Cancel Payment
        </button>
      </div>

      <button
        type="button"
        onClick={handleAbort}
        className="w-full px-6 py-4 border-4 border-black bg-white font-black uppercase tracking-wide hover:bg-gray-100 transition-colors"
      >
        Back to Cart (abort simulation)
      </button>
    </div>
  );
};

export default PaymentSimulationPage;

