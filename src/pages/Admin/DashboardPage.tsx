import React, { useMemo } from 'react';
import useStore from '../../store/useStore';
import { CoinIcon } from '../../components/Icons';

const DashboardPage: React.FC = () => {
  const { products, purchaseHistory, wishlist, cart } = useStore();

  const stats = useMemo(() => {
    const totalRevenue = purchaseHistory.reduce((acc, product) => acc + product.price, 0);
    const totalProducts = products.length;
    const itemsSold = purchaseHistory.length;
    const totalWishlists = wishlist.length;
    const activeCarts = cart.length;
    const bundlesCount = products.filter(p => p.bundleItems && p.bundleItems.length >= 2).length;
    const onSaleCount = products.filter(p => p.tags?.includes('sale')).length;
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const totalGoldCoins = products.reduce((acc, p) => acc + (p.goldCoins || 0), 0);
    const avgPrice = products.length > 0 
      ? products.reduce((acc, p) => acc + p.price, 0) / products.length 
      : 0;
    const topProducts = [...products]
      .sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0))
      .slice(0, 5);

    return {
      totalRevenue,
      totalProducts,
      itemsSold,
      totalWishlists,
      activeCarts,
      bundlesCount,
      onSaleCount,
      lowStockCount,
      totalGoldCoins,
      avgPrice,
      topProducts,
    };
  }, [products, purchaseHistory, wishlist, cart]);

  return (
    <div className="space-y-6">
        <h2 className="text-3xl sm:text-4xl font-display uppercase border-b-4 border-black pb-2 mb-4 sm:mb-6">Dashboard</h2>
        
        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Total Revenue</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FF0000] mt-2">${stats.totalRevenue.toFixed(2)}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Total Products</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-black mt-2">{stats.totalProducts}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Items Sold</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-black mt-2">{stats.itemsSold}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Wishlists</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FF0000] mt-2">{stats.totalWishlists}</p>
            </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Active Carts</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-black mt-2">{stats.activeCarts}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Bundles</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-black mt-2">{stats.bundlesCount}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">On Sale</h3>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#FFD700] mt-2">{stats.onSaleCount}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase">Low Stock</h3>
                <p className={`text-3xl sm:text-4xl lg:text-5xl font-black mt-2 ${stats.lowStockCount > 0 ? 'text-red-500' : 'text-black'}`}>
                    {stats.lowStockCount}
                </p>
            </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase mb-4">Average Price</h3>
                <p className="text-3xl sm:text-4xl font-black text-black">${stats.avgPrice.toFixed(2)}</p>
            </div>
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-bold text-black/70 uppercase mb-4 flex items-center gap-2">
                    <CoinIcon className="w-6 h-6 text-[#9333EA]" />
                    Total Gold Coins
                </h3>
                <p className="text-3xl sm:text-4xl font-black text-[#9333EA]">{stats.totalGoldCoins.toLocaleString()}</p>
            </div>
        </div>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
            <div className="bg-white border-4 border-black p-4 sm:p-6">
                <h3 className="text-xl sm:text-2xl font-display uppercase border-b-4 border-black pb-2 mb-4">Top Products by Wishlist</h3>
                <div className="space-y-2">
                    {stats.topProducts.map((product, index) => (
                        <div key={product.id} className="flex items-center gap-4 p-3 border-2 border-dashed border-black/20">
                            <span className="text-2xl font-black text-black/40 w-8">#{index + 1}</span>
                            <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover border-2 border-black" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-black truncate">{product.name}</p>
                                <p className="text-sm text-black/60">${product.price.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-[#FF0000]">{product.wishlistCount || 0}</p>
                                <p className="text-xs text-black/60">wishlists</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default DashboardPage;
