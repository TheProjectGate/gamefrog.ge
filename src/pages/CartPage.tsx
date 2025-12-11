import React, { useMemo } from 'react';
import { Product } from '../types';
import { TrashIcon, ChevronLeftIcon, CarIcon, MapPinIcon } from '../components/Icons';
import useStore from '../store/useStore';

interface CartItem {
  product: Product;
  quantity: number;
}

const TAX_RATE = 0.10;

const CartPage: React.FC = () => {
    const { cart, removeFromCart, clearCart, navigate, goBack, checkout, tipAmount, setTipAmount, shippingMethod, deliveryZone, deliveryFee, deliveryEtaDays, setShippingMethod, setDeliveryZone, isProcessingPayment } = useStore();

    const groupedCart = useMemo(() => {
        const map = new Map<number, CartItem>();
        cart.forEach(product => {
        if (map.has(product.id)) {
            map.get(product.id)!.quantity++;
        } else {
            map.set(product.id, { product, quantity: 1 });
        }
        });
        return Array.from(map.values());
    }, [cart]);

    const subtotal = useMemo(() => {
        return groupedCart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
    }, [groupedCart]);
    
    const taxes = useMemo(() => subtotal * TAX_RATE, [subtotal]);
    const total = useMemo(() => subtotal + (Number(tipAmount) || 0) + (Number(deliveryFee) || 0), [subtotal, tipAmount, deliveryFee]);
    const currentTip = Number(tipAmount) || 0;

    if (cart.length === 0) {
        return (
        <div className="bg-white border-4 border-black text-center p-12 animate-fade-in">
            <h1 className="text-5xl font-display text-black uppercase mb-4">Your Cart is Empty</h1>
            <p className="text-lg text-black/80 mb-8">Looks like you haven't added anything yet. Let's fix that!</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                    onClick={goBack}
                    className="btn-pop bg-white text-black font-bold text-lg py-4 px-10 border-4 border-black transition-colors hover:bg-gray-200 w-full sm:w-auto"
                >
                    Go Back
                </button>
                <button
                onClick={() => navigate('browse')}
                className="btn-pop bg-[#FFD700] text-black font-bold text-lg py-4 px-10 border-4 border-black transition-colors hover:bg-black hover:text-[#FFD700] w-full sm:w-auto"
                >
                Start Shopping
                </button>
            </div>
        </div>
        );
    }

  return (
    <div className="animate-fade-in">
       <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4">
          <button
            onClick={goBack}
            className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="w-7 h-7 text-black" />
          </button>
          <h1 className="text-5xl font-display text-black uppercase">
            Your Cart
          </h1>
        </div>
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-grow bg-white border-4 border-black">
          <div className="p-4 border-b-4 border-black flex justify-between items-center bg-gray-50">
             <h2 className="text-xl font-bold uppercase text-black">Items ({cart.length})</h2>
             <button onClick={clearCart} className="flex items-center gap-2 text-sm font-bold text-[#E60012] hover:underline">
                <TrashIcon className="w-5 h-5"/>
                Empty Cart
             </button>
          </div>
          <div className="divide-y-2 divide-dashed divide-black/20">
            {groupedCart.map(({ product, quantity }) => (
              <div key={product.id} className="p-4 flex gap-4 items-center">
                <img src={product.imageUrl} alt={product.name} className="w-24 h-24 object-cover border-2 border-black" />
                <div className="flex-grow">
                  <h3 className="text-lg font-bold text-black">{product.name}</h3>
                  <p className="text-sm text-black/70">Unit Price: ${product.price.toFixed(2)}</p>
                  <p className="text-sm text-black/70 mt-1">Quantity: {quantity}</p>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end justify-between self-stretch">
                  <p className="text-xl font-black text-[#FF0000]">${(product.price * quantity).toFixed(2)}</p>
                  <button 
                    onClick={() => removeFromCart(product.id)} 
                    className="text-sm font-semibold text-black/70 hover:text-red-600 underline transition-colors mt-1"
                    aria-label={`Remove one ${product.name} from cart`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="bg-white border-4 border-black p-6 sticky top-24 relative z-10">
            <h2 className="text-3xl font-display uppercase border-b-4 border-black pb-2 mb-4 text-black">
              Order Summary
            </h2>
            <div className="space-y-4 font-semibold text-lg text-black">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {/* Taxes removed per request */}

              <div className="border-t-2 border-dashed border-black/30"></div>

              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  <span className="font-bold">Support the site (Tip) <span className="text-black/60 text-sm">optional</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-nowrap">
                {[0, 1, 2, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setTipAmount(v === 0 ? 0 : (Number(tipAmount || 0) + v))}
                    className={`px-3 py-1.5 border-2 border-black text-sm font-bold cursor-pointer pointer-events-auto ${Number(tipAmount||0) === v ? 'bg-[#FFD700] text-black' : 'bg-white hover:bg-gray-100'}`}
                    aria-label={`Add $${v} tip`}
                  >
                    ${v}
                  </button>
                ))}
                <div className="flex items-center border-2 border-black px-2 py-1.5 h-9 pointer-events-auto">
                  <input
                    id="tip-amount"
                    name="tip-amount"
                    type="number"
                    min={0}
                    step="0.5"
                    value={Number(tipAmount || 0).toString()}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTipAmount(Number.isFinite(val) && val > 0 ? parseFloat(val.toFixed(2)) : 0);
                    }}
                    className="w-20 h-6 text-left px-1 focus:outline-none border-none outline-none bg-transparent"
                    aria-label="Custom tip amount"
                  />
                  <span className="font-bold ml-1">$</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Tip</span>
                <span>${currentTip.toFixed(2)}</span>
              </div>

              <div className="border-t-2 border-dashed border-black/30"></div>

              <div>
                <div className="font-bold mb-2">Delivery or Pickup</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setShippingMethod('delivery')}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-black font-bold ${shippingMethod === 'delivery' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-100'}`}
                  >
                    <CarIcon className="w-5 h-5" /> Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setShippingMethod('pickup')}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 border-2 border-black font-bold ${shippingMethod === 'pickup' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-100'}`}
                  >
                    <MapPinIcon className="w-5 h-5" /> Pickup
                  </button>
                </div>

                {shippingMethod === 'delivery' && (
                  <div className="mt-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDeliveryZone('city')}
                        className={`w-full px-3 py-1.5 border-2 border-black text-sm font-bold ${deliveryZone !== 'region' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-100'}`}
                      >
                        City ($5, ETA 2d)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeliveryZone('region')}
                        className={`w-full px-3 py-1.5 border-2 border-black text-sm font-bold ${deliveryZone === 'region' ? 'bg-[#FFD700]' : 'bg-white hover:bg-gray-100'}`}
                      >
                        Region ($9, ETA 5d)
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Delivery fee</span>
                      <span>${(Number(deliveryFee)||0).toFixed(2)}{deliveryEtaDays ? ` (${deliveryEtaDays} d)` : ''}</span>
                    </div>
                  </div>
                )}

                {shippingMethod === 'pickup' && (
                  <div className="mt-3 text-sm text-black/80">
                    Pickup address: 12 Rustaveli Ave, Tbilisi (10:00–20:00)
                  </div>
                )}
              </div>

              <div className="border-t-2 border-dashed border-black/30"></div>

              <div className="flex items-center justify-between text-2xl font-black">
                <span>Total</span>
                <span className="text-[#FF0000]">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="mt-6 space-y-3">
               <button
                  onClick={checkout}
                  disabled={isProcessingPayment}
                  aria-busy={isProcessingPayment}
                  className={`w-full bg-[#FFD700] text-black font-bold text-lg py-4 px-10 border-4 border-black transition-colors btn-pop pointer-events-auto ${
                    isProcessingPayment ? 'opacity-70 cursor-not-allowed' : 'hover:bg-black hover:text-[#FFD700]'
                  }`}
                >
                  {isProcessingPayment ? 'Redirecting to UniPay...' : 'Proceed to Checkout'}
                </button>
                <button
                  onClick={() => navigate('browse')}
                  className="w-full bg-white text-black font-bold text-lg py-3 px-10 border-4 border-black transition-colors hover:bg-gray-200 btn-pop pointer-events-auto"
                >
                  Continue Shopping
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
