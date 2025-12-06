import React, { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { HeartIcon } from '../../components/Icons';

const WishlistAnalyticsPage: React.FC = () => {
  const { products, applyDiscountToProduct } = useStore();
  const [discountInputs, setDiscountInputs] = useState<Record<number, number>>({});

  const wishlistedProducts = useMemo(() => {
    return [...products]
      .filter(p => (p.wishlistCount || 0) > 0)
      .sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0));
  }, [products]);

  const handleApply = async (productId: number) => {
    const percent = discountInputs[productId];
    if (!percent || percent <= 0 || percent > 90) {
      alert('Enter a valid discount percent (1-90).');
      return;
    }
    try {
      await applyDiscountToProduct(productId, percent);
      // Clear input after successful apply
      setDiscountInputs(prev => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } catch (error) {
      console.error('Failed to apply discount:', error);
      alert('Failed to apply discount. Please try again.');
    }
  };

  if (!wishlistedProducts.length) {
    return (
      <div className="bg-white border-4 border-black p-8 text-center">
        <h2 className="text-3xl font-display uppercase mb-2">Wishlist</h2>
        <p className="text-black/70 font-semibold">No wishlist data yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b-4 border-black pb-2">
        <h2 className="text-3xl sm:text-4xl font-display uppercase flex items-center gap-2">
          <HeartIcon className="w-7 h-7 text-[#FF0000]" /> Wishlist
        </h2>
        <span className="text-sm font-bold text-black/60">{wishlistedProducts.length} products</span>
      </div>

      <div className="bg-white border-4 border-black overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-100 border-b-4 border-black">
            <tr>
              <th className="p-4 text-left font-extrabold uppercase">Product</th>
              <th className="p-4 text-left font-extrabold uppercase">Wishlist Count</th>
              <th className="p-4 text-left font-extrabold uppercase">Current Discount</th>
              <th className="p-4 text-left font-extrabold uppercase">Set Discount</th>
              <th className="p-4 text-left font-extrabold uppercase">Action</th>
            </tr>
          </thead>
          <tbody>
            {wishlistedProducts.map(p => (
              <tr key={p.id} className="border-t-2 border-black/10">
                <td className="p-4 font-bold">
                  <div className="flex items-center gap-3">
                    <img 
                      src={p.imageUrl} 
                      alt={p.name} 
                      className="w-12 h-12 object-cover border-2 border-black"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    <div className="flex flex-col">
                      <span>{p.name}</span>
                      <span className="text-sm text-black/60">${p.price.toFixed(2)}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center gap-2 font-extrabold">
                    <HeartIcon className="w-5 h-5 text-[#FF0000]" /> {p.wishlistCount || 0}
                  </span>
                </td>
                <td className="p-4 font-bold">{p.discountPercent ? `${p.discountPercent}%` : '—'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      className="w-24 border-4 border-black p-2 font-bold"
                      value={discountInputs[p.id] ?? ''}
                      placeholder="e.g. 15"
                      onChange={(e) =>
                        setDiscountInputs(prev => ({ ...prev, [p.id]: Number(e.target.value) }))
                      }
                    />
                    <span className="font-extrabold">%</span>
                  </div>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => handleApply(p.id)}
                    className="btn-pop bg-[#FFD700] text-black font-bold py-2 px-4 border-4 border-black"
                  >
                    Apply
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WishlistAnalyticsPage;


