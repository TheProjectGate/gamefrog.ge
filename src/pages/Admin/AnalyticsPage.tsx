import React, { useMemo, useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { OrderStatus } from '../../types';
import { HeartIcon, UserIcon, ChevronRightIcon, TrashIcon } from '../../components/Icons';
import { getAvatar } from '../../utils/avatars';
import { getChatMessagesByUser, deleteChatMessages, ChatMessageWithUserInfo } from '../../api/chatMessages';

type AnalyticsTab = 'products' | 'categories' | 'orders' | 'users' | 'wishlist';

interface UserStats {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar: number;
  role: string;
  gold_coins: number;
  created_at: string;
  total_orders: number;
  total_spent: string;
  wishlist_count: number;
}

interface UserDetails {
  user: {
    id: number;
    email: string;
    first_name: string | null;
    last_name: string | null;
    avatar: number;
    phone: string | null;
    address: string | null;
    role: string;
    gold_coins: number;
    created_at: string;
  };
  orders: any[];
  wishlist: any[];
  messages: any[];
  settings: any;
  statistics: {
    totalOrders: number;
    totalSpent: number;
    wishlistCount: number;
    messagesCount: number;
    goldCoins: number;
    memberSince: string;
  };
}

const AnalyticsPage: React.FC = () => {
  const { products, orders, productViews, categoryTimes, applyDiscountToProduct } = useStore();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('products');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [discountInputs, setDiscountInputs] = useState<Record<number, number>>({});
  
  // Users state
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessageWithUserInfo[]>>({});
  const [loadingChat, setLoadingChat] = useState<Record<string, boolean>>({});
  const [chatFilter, setChatFilter] = useState<{ period?: 'week' | 'month' | 'year'; startDate?: string; endDate?: string }>({});

  // Most viewed products
  const mostViewedProducts = useMemo(() => {
    const viewCounts = productViews.reduce((acc, view) => {
      acc[view.productId] = (acc[view.productId] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(viewCounts)
      .map(([productId, count]) => {
        const product = products.find(p => p.id === Number(productId));
        return product ? { product, count } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.count || 0) - (a?.count || 0))
      .slice(0, 10) as Array<{ product: typeof products[0]; count: number }>;
  }, [productViews, products]);

  // Categories with the most time spent
  const topCategoriesByTime = useMemo(() => {
    const categoryTimeMap = categoryTimes.reduce((acc, ct) => {
      const key = `${ct.categoryId}:${ct.categoryName}`;
      if (!acc[key]) {
        acc[key] = { categoryId: ct.categoryId, categoryName: ct.categoryName, totalTime: 0 };
      }
      acc[key].totalTime += ct.timeSpent;
      return acc;
    }, {} as Record<string, { categoryId: string; categoryName: string; totalTime: number }>);

    return Object.values(categoryTimeMap)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);
  }, [categoryTimes]);

  // Orders grouped by status
  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders;
    return orders.filter(order => order.status === orderStatusFilter);
  }, [orders, orderStatusFilter]);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  // Fetch users
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserDetails = async (email: string) => {
    if (expandedUser === email) {
      setExpandedUser(null);
      return;
    }

    setExpandedUser(email);
    
    if (!userDetails[email]) {
      setLoadingDetails(email);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/users/${encodeURIComponent(email)}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserDetails(prev => ({ ...prev, [email]: data }));
        }
      } catch (error) {
        console.error('Failed to fetch user details:', error);
      } finally {
        setLoadingDetails(null);
      }
    }

    // Load chat history when expanding
    if (!chatMessages[email]) {
      loadChatHistory(email);
    }
  };

  const loadChatHistory = async (email: string, filter?: { period?: 'week' | 'month' | 'year'; startDate?: string; endDate?: string }) => {
    setLoadingChat(prev => ({ ...prev, [email]: true }));
    try {
      let messages: ChatMessageWithUserInfo[];
      
      if (filter?.period) {
        const now = new Date();
        let startDate: Date;
        switch (filter.period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'year':
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        }
        messages = await getChatMessagesByUser(email, startDate.toISOString().split('T')[0]);
      } else if (filter?.startDate || filter?.endDate) {
        messages = await getChatMessagesByUser(email, filter.startDate, filter.endDate);
      } else {
        messages = await getChatMessagesByUser(email);
      }
      
      console.log(`[AnalyticsPage] Loaded ${messages.length} chat messages for ${email}`);
      setChatMessages(prev => ({ ...prev, [email]: messages }));
    } catch (error: any) {
      console.error('Failed to load chat history:', error);
      // Set empty array on error so UI shows "No chat history" instead of loading forever
      setChatMessages(prev => ({ ...prev, [email]: [] }));
    } finally {
      setLoadingChat(prev => ({ ...prev, [email]: false }));
    }
  };

  const handleDeleteChatMessages = async (email: string) => {
    if (!confirm(`Delete all chat messages for ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      // Если период не выбран, используем очень старую дату начала для удаления всех сообщений
      const filter = chatFilter.period 
        ? { period: chatFilter.period, userEmail: email }
        : chatFilter.startDate && chatFilter.endDate
        ? { startDate: chatFilter.startDate, endDate: chatFilter.endDate, userEmail: email }
        : { 
            startDate: '1970-01-01', // Очень старая дата для удаления всех сообщений
            endDate: new Date().toISOString().split('T')[0], // Сегодняшняя дата
            userEmail: email 
          };
      
      await deleteChatMessages(filter);
      
      // Reload chat history
      setChatMessages(prev => ({ ...prev, [email]: [] }));
      loadChatHistory(email);
      
      alert('Chat messages deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete chat messages:', error);
      alert(`Failed to delete: ${error.message}`);
    }
  };

  // Function to highlight important text
  const highlightImportantText = (text: string, metadata?: any, userInfo?: any) => {
    if (!text) return text;

    let highlightedText = text;
    const highlights: Array<{ start: number; end: number; type: string; className: string }> = [];

    // Highlight product mentions
    if (metadata?.productMentions && products) {
      metadata.productMentions.forEach((productName: string) => {
        const product = products.find(p => p.name.toLowerCase() === productName.toLowerCase());
        if (product) {
          const regex = new RegExp(`\\b${productName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
          let match;
          while ((match = regex.exec(highlightedText)) !== null) {
            highlights.push({
              start: match.index,
              end: match.index + match[0].length,
              type: 'product',
              className: 'bg-yellow-300 font-bold px-1',
            });
          }
        }
      });
    }

    // Highlight user info mentions
    if (metadata?.userInfoMentions && userInfo) {
      if (metadata.userInfoMentions.includes('phone') && userInfo.phone) {
        const regex = new RegExp(userInfo.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'phone',
            className: 'bg-red-300 font-bold px-1',
          });
        }
      }
      if (metadata.userInfoMentions.includes('address') && userInfo.address) {
        const regex = new RegExp(userInfo.address.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'address',
            className: 'bg-red-300 font-bold px-1',
          });
        }
      }
      if (metadata.userInfoMentions.includes('email') && userInfo.email) {
        const regex = new RegExp(userInfo.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        while ((match = regex.exec(highlightedText)) !== null) {
          highlights.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'email',
            className: 'bg-red-300 font-bold px-1',
          });
        }
      }
    }

    // Highlight actions
    if (metadata?.actions) {
      metadata.actions.forEach((action: string) => {
        if (action.includes('ADD_TO_CART')) {
          const regex = /(add to cart|добавить в корзину)/gi;
          let match;
          while ((match = regex.exec(highlightedText)) !== null) {
            highlights.push({
              start: match.index,
              end: match.index + match[0].length,
              type: 'action',
              className: 'bg-green-300 font-bold px-1',
            });
          }
        }
        if (action.includes('ADD_TO_WISHLIST')) {
          const regex = /(add to wishlist|добавить в вишлист)/gi;
          let match;
          while ((match = regex.exec(highlightedText)) !== null) {
            highlights.push({
              start: match.index,
              end: match.index + match[0].length,
              type: 'action',
              className: 'bg-pink-300 font-bold px-1',
            });
          }
        }
      });
    }

    // Sort highlights by start position
    highlights.sort((a, b) => a.start - b.start);

    // Remove overlapping highlights (keep the first one)
    const nonOverlapping: typeof highlights = [];
    for (let i = 0; i < highlights.length; i++) {
      if (i === 0 || highlights[i].start >= nonOverlapping[nonOverlapping.length - 1].end) {
        nonOverlapping.push(highlights[i]);
      }
    }

    // Build JSX with highlights
    const elements: React.ReactNode[] = [];
    let currentIndex = 0;

    nonOverlapping.forEach((highlight, idx) => {
      // Add text before highlight
      if (highlight.start > currentIndex) {
        elements.push(
          <span key={`text-${idx}`}>{highlightedText.substring(currentIndex, highlight.start)}</span>
        );
      }

      // Add highlighted text
      elements.push(
        <span key={`highlight-${idx}`} className={highlight.className} title={highlight.type}>
          {highlightedText.substring(highlight.start, highlight.end)}
        </span>
      );

      currentIndex = highlight.end;
    });

    // Add remaining text
    if (currentIndex < highlightedText.length) {
      elements.push(
        <span key="text-end">{highlightedText.substring(currentIndex)}</span>
      );
    }

    return elements.length > 0 ? <>{elements}</> : text;
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
    (user.last_name && user.last_name.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatUserDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Wishlisted products
  const wishlistedProducts = useMemo(() => {
    return [...products]
      .filter(p => (p.wishlistCount || 0) > 0)
      .sort((a, b) => (b.wishlistCount || 0) - (a.wishlistCount || 0));
  }, [products]);

  const handleApplyDiscount = async (productId: number) => {
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

  // Time formatting helper
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  // Date formatting helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <h2 className="text-3xl sm:text-4xl font-display uppercase border-b-4 border-black pb-2 mb-4 sm:mb-6">
        Analytics
      </h2>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
            activeTab === 'products'
              ? 'bg-[#FFD700] text-black'
              : 'bg-white text-black hover:bg-[#FF6B6B] hover:text-white'
          }`}
        >
          Products
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
            activeTab === 'categories'
              ? 'bg-[#FFD700] text-black'
              : 'bg-white text-black hover:bg-[#00C2FF] hover:text-black'
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
            activeTab === 'orders'
              ? 'bg-[#FFD700] text-black'
              : 'bg-white text-black hover:bg-[#7CFF00] hover:text-black'
          }`}
        >
          Orders
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
            activeTab === 'users'
              ? 'bg-[#FFD700] text-black'
              : 'bg-white text-black hover:bg-[#FF00A8] hover:text-white'
          }`}
        >
          Users
        </button>
        <button
          onClick={() => setActiveTab('wishlist')}
          className={`px-6 py-3 font-black text-lg uppercase border-4 border-black shadow-[4px_4px_0_0_#000] transition-colors ${
            activeTab === 'wishlist'
              ? 'bg-[#FFD700] text-black'
              : 'bg-white text-black hover:bg-[#FFEE00] hover:text-black'
          }`}
        >
          Wishlist
        </button>
      </div>

      {/* Most viewed products */}
      {activeTab === 'products' && (
        <section className="mb-8">
        <h3 className="text-2xl font-display uppercase mb-4 border-b-2 border-black pb-2">
          Most viewed products
        </h3>
        <div className="bg-white border-4 border-black p-4 sm:p-6">
          {mostViewedProducts.length > 0 ? (
            <div className="space-y-3">
              {mostViewedProducts.map((item, index) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-4 p-3 border-2 border-gray-200 hover:border-black transition-colors"
                >
                  <span className="text-2xl font-black text-[#FFD700] w-8 text-center">
                    {index + 1}
                  </span>
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover border-2 border-black"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-lg">{item.product.name}</p>
                    <p className="text-sm text-gray-600">
                      {item.count} {item.count === 1 ? 'view' : 'views'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">${item.product.price.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No view data yet</p>
          )}
        </div>
      </section>
      )}

      {/* Categories with most time */}
      {activeTab === 'categories' && (
        <section className="mb-8">
        <h3 className="text-2xl font-display uppercase mb-4 border-b-2 border-black pb-2">
          Categories with the most time spent
        </h3>
        <div className="bg-white border-4 border-black p-4 sm:p-6">
          {topCategoriesByTime.length > 0 ? (
            <div className="space-y-3">
              {topCategoriesByTime.map((category, index) => (
                <div
                  key={`${category.categoryId}-${category.categoryName}`}
                  className="flex items-center justify-between p-3 border-2 border-gray-200 hover:border-black transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black text-[#FFD700] w-8 text-center">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-bold text-lg">{category.categoryName}</p>
                      <p className="text-sm text-gray-600">ID: {category.categoryId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-[#FF0000]">
                      {formatTime(category.totalTime)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No category time data yet</p>
          )}
        </div>
      </section>
      )}

      {/* Orders list */}
      {activeTab === 'orders' && (
        <section className="mb-8">
        <h3 className="text-2xl font-display uppercase mb-4 border-b-2 border-black pb-2">Orders</h3>
        
        {/* Order stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <h4 className="text-base sm:text-lg font-bold text-black/70 uppercase mb-2">
              Pending orders
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-[#FFD700]">{pendingOrders.length}</p>
          </div>
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <h4 className="text-base sm:text-lg font-bold text-black/70 uppercase mb-2">
              Delivered
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-green-600">
              {deliveredOrders.length}
            </p>
          </div>
          <div className="bg-white border-4 border-black p-4 sm:p-6">
            <h4 className="text-base sm:text-lg font-bold text-black/70 uppercase mb-2">
              Cancelled
            </h4>
            <p className="text-3xl sm:text-4xl font-black text-red-600">{cancelledOrders.length}</p>
          </div>
        </div>

        {/* Status filter */}
        <div className="mb-4">
          <label htmlFor="analytics-order-status-filter" className="sr-only">Filter orders by status</label>
          <select
            id="analytics-order-status-filter"
            name="analytics-order-status-filter"
            value={orderStatusFilter}
            onChange={(e) => setOrderStatusFilter(e.target.value as OrderStatus | 'all')}
            className="bg-white border-4 border-black px-4 py-2 font-bold uppercase focus:outline-none focus:ring-4 focus:ring-[#FFD700]"
          >
            <option value="all">All orders</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders list */}
        <div className="bg-white border-4 border-black p-4 sm:p-6">
          {filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="border-2 border-gray-200 p-4 hover:border-black transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-bold text-lg">Order #{order.id}</p>
                        <span
                          className={`px-3 py-1 text-xs font-bold uppercase border-2 border-black ${
                            order.status === 'pending'
                              ? 'bg-[#FFD700] text-black'
                              : order.status === 'delivered'
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {order.status === 'pending'
                            ? 'Pending'
                            : order.status === 'delivered'
                            ? 'Delivered'
                            : 'Cancelled'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Customer: {order.customerEmail}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Created: {formatDate(order.createdAt)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Items: {order.products.length} | Total: ${order.total.toFixed(2)}
                      </p>
                      {order.shippingMethod && (
                        <p className="text-sm text-gray-600">
                          Shipping: {order.shippingMethod === 'delivery' ? 'Delivery' : 'Pickup'}
                          {order.deliveryZone && ` (${order.deliveryZone})`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const newStatus: OrderStatus =
                            order.status === 'pending' ? 'delivered' : 'pending';
                          useStore.getState().updateOrderStatus(order.id, newStatus);
                        }}
                        className="px-4 py-2 bg-[#FFD700] text-black font-bold uppercase border-4 border-black hover:bg-black hover:text-[#FFD700] transition-colors"
                        disabled={order.status === 'cancelled'}
                      >
                        {order.status === 'pending' ? 'Mark as delivered' : 'Return to pending'}
                      </button>
                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => {
                            useStore.getState().updateOrderStatus(order.id, 'cancelled');
                          }}
                          className="px-4 py-2 bg-red-600 text-white font-bold uppercase border-4 border-black hover:bg-red-700 transition-colors"
                        >
                          Cancel order
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t-2 border-gray-200">
                    <p className="text-sm font-bold mb-2">Items:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.products.map((product) => (
                        <span
                          key={product.id}
                          className="px-2 py-1 bg-gray-100 border-2 border-gray-300 text-sm"
                        >
                          {product.name} (${product.price.toFixed(2)})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No orders yet</p>
          )}
        </div>
      </section>
      )}

      {/* Users list */}
      {activeTab === 'users' && (
        <section className="mb-8">
          <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_#000]">
            <h3 className="text-2xl font-black uppercase mb-6 flex items-center gap-3">
              <UserIcon className="w-8 h-8" />
              Users Management
            </h3>

            {/* Search */}
            <div className="mb-6">
              <label htmlFor="analytics-user-search" className="sr-only">Search users</label>
              <input
                id="analytics-user-search"
                name="analytics-user-search"
                type="text"
                placeholder="Search users by email or name..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full border-2 border-black p-3 bg-white"
              />
            </div>

            {/* Users List */}
            {loading ? (
              <p>Loading users...</p>
            ) : (
              <div className="space-y-2">
                <p className="font-bold mb-4">Total Users: {filteredUsers.length}</p>
                {filteredUsers.map((user) => {
                  const isExpanded = expandedUser === user.email;
                  const details = userDetails[user.email];
                  const isLoading = loadingDetails === user.email;
                  
                  return (
                    <div key={user.id} className="border-2 border-black">
                      {/* User Header */}
                      <button
                        onClick={() => toggleUserDetails(user.email)}
                        className="w-full text-left p-3 hover:bg-gray-50 transition-colors flex justify-between items-center gap-3"
                      >
                        {/* Avatar */}
                        <div className="w-12 h-12 flex-shrink-0 border-2 border-black overflow-hidden">
                          <img 
                            src={getAvatar(user.avatar || 0).image} 
                            alt={getAvatar(user.avatar || 0).name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate">
                            {user.first_name || user.last_name
                              ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
                              : 'User'} 
                            <span className="text-gray-500 text-sm ml-2">{user.email}</span>
                          </p>
                          <div className="flex gap-3 mt-1 text-xs">
                            <span>📦 {user.total_orders}</span>
                            <span>💰 {formatCurrency(user.total_spent)}</span>
                            <span>❤️ {user.wishlist_count}</span>
                            <span className="text-[#FFD700]">💎 {user.gold_coins}</span>
                          </div>
                        </div>
                        <ChevronRightIcon className={`w-5 h-5 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t-2 border-black bg-gray-50 p-4 space-y-4">
                          {isLoading ? (
                            <p className="text-center text-gray-500">Loading...</p>
                          ) : details ? (
                            <>
                              {/* User Contact Info */}
                              {(details.user.phone || details.user.address) && (
                                <div className="border border-black p-3 bg-white">
                                  <p className="font-bold text-sm mb-2">Contact Info:</p>
                                  <div className="space-y-1 text-xs">
                                    {details.user.phone && (
                                      <p>📞 {details.user.phone}</p>
                                    )}
                                    {details.user.address && (
                                      <p>📍 {details.user.address}</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Stats Grid */}
                              <div className="grid grid-cols-4 gap-2">
                                <div className="border border-black p-2 bg-white text-center">
                                  <p className="text-xs text-gray-600">ORDERS</p>
                                  <p className="text-xl font-black">{details.statistics.totalOrders}</p>
                                </div>
                                <div className="border border-black p-2 bg-white text-center">
                                  <p className="text-xs text-gray-600">SPENT</p>
                                  <p className="text-sm font-black">{formatCurrency(details.statistics.totalSpent)}</p>
                                </div>
                                <div className="border border-black p-2 bg-white text-center">
                                  <p className="text-xs text-gray-600">WISHLIST</p>
                                  <p className="text-xl font-black">{details.statistics.wishlistCount}</p>
                                </div>
                                <div className="border border-black p-2 bg-white text-center">
                                  <p className="text-xs text-gray-600">COINS</p>
                                  <p className="text-xl font-black text-[#FFD700]">💎 {details.user.gold_coins}</p>
                                </div>
                              </div>

                              {/* Orders */}
                              {details.orders.length > 0 && (
                                <div>
                                  <p className="font-bold text-sm mb-2">Recent Orders:</p>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {details.orders.slice(0, 5).map((order: any) => (
                                      <div key={order.id} className="border border-black p-2 bg-white text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-bold">#{order.id}</span>
                                          <span className="font-bold">{formatCurrency(order.total)}</span>
                                        </div>
                                        <div className="text-gray-600">
                                          {formatUserDate(order.created_at)} • 
                                          <span className={`ml-1 ${
                                            order.status === 'delivered' ? 'text-green-600' :
                                            order.status === 'cancelled' ? 'text-red-600' :
                                            'text-yellow-600'
                                          }`}>
                                            {order.status}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Wishlist */}
                              {details.wishlist && Array.isArray(details.wishlist) && details.wishlist.length > 0 ? (
                                <div>
                                  <p className="font-bold text-sm mb-2">Wishlist Items:</p>
                                  <div className="space-y-1 max-h-48 overflow-y-auto">
                                    {details.wishlist.slice(0, 8).map((item: any, idx: number) => (
                                      <div key={`${item.product_id}-${idx}`} className="border border-black p-2 bg-white flex gap-2 items-center">
                                        {item.image_url ? (
                                          <img 
                                            src={item.image_url} 
                                            alt={item.name || 'Product'} 
                                            className="w-12 h-12 object-cover border border-black flex-shrink-0"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 bg-gray-200 border border-black flex-shrink-0 flex items-center justify-center text-xs">
                                            No img
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-xs font-bold truncate">{item.name || `Product #${item.product_id}`}</p>
                                          <p className="text-xs text-[#FFD700]">{item.price ? formatCurrency(item.price) : 'N/A'}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : null}

                              {/* Messages */}
                              {details.messages.length > 0 && (
                                <div>
                                  <p className="font-bold text-sm mb-2">Recent Messages:</p>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {details.messages.slice(0, 3).map((message: any) => (
                                      <div key={message.id} className="border border-black p-2 bg-white text-xs">
                                        <div className="flex justify-between">
                                          <span className="font-bold truncate flex-1">{message.subject}</span>
                                          <span className={`ml-2 px-1 text-[10px] ${message.is_read ? 'bg-gray-200' : 'bg-[#FFD700]'}`}>
                                            {message.is_read ? 'READ' : 'NEW'}
                                          </span>
                                        </div>
                                        <p className="text-gray-600 truncate">{message.body}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Chat History */}
                              <div className="border-2 border-black bg-white">
                                <div className="flex justify-between items-center p-3 border-b-2 border-black bg-[#FFD700]">
                                  <p className="font-bold text-sm">Chat History</p>
                                  <div className="flex gap-2">
                                    <select
                                      value={chatFilter.period || ''}
                                      onChange={(e) => {
                                        const period = e.target.value as 'week' | 'month' | 'year' | '';
                                        setChatFilter({ period: period || undefined });
                                        if (period) {
                                          loadChatHistory(user.email, { period });
                                        }
                                      }}
                                      className="text-xs border border-black px-2 py-1 bg-white"
                                    >
                                      <option value="">All Time</option>
                                      <option value="week">Last Week</option>
                                      <option value="month">Last Month</option>
                                      <option value="year">Last Year</option>
                                    </select>
                                    <button
                                      onClick={() => handleDeleteChatMessages(user.email)}
                                      className="text-xs border border-black px-2 py-1 bg-red-500 text-white hover:bg-red-600"
                                      title="Delete chat messages"
                                    >
                                      <TrashIcon className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {loadingChat[user.email] ? (
                                  <p className="p-3 text-center text-xs text-gray-500">Loading chat...</p>
                                ) : chatMessages[user.email] && chatMessages[user.email].length > 0 ? (
                                  <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                                    {chatMessages[user.email].map((msg) => (
                                      <div
                                        key={msg.id}
                                        className={`border-2 border-black p-2 text-xs ${
                                          msg.role === 'user' ? 'bg-blue-50' : 'bg-gray-50'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-1">
                                          <span className="font-bold text-[10px] uppercase">
                                            {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                                          </span>
                                          <span className="text-[10px] text-gray-500">
                                            {new Date(msg.created_at).toLocaleString()}
                                          </span>
                                        </div>
                                        <div className="text-sm whitespace-pre-wrap break-words">
                                          {highlightImportantText(msg.content, msg.metadata, details?.user)}
                                        </div>
                                        {msg.pending_actions && msg.pending_actions.length > 0 && (
                                          <div className="mt-2 pt-2 border-t border-black">
                                            <p className="text-[10px] font-bold mb-1">Actions:</p>
                                            {msg.pending_actions.map((action, idx) => (
                                              <span
                                                key={idx}
                                                className="inline-block mr-1 mb-1 px-2 py-0.5 bg-[#FFD700] border border-black text-[10px] font-bold"
                                              >
                                                {action.type === 'ADD_TO_CART' ? '🛒 Add to Cart' : '❤️ Add to Wishlist'}: {action.productName}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="p-3 text-center text-xs text-gray-500">No chat history</p>
                                )}
                              </div>
                            </>
                          ) : (
                            <p className="text-center text-gray-500">Failed to load details</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Wishlist */}
      {activeTab === 'wishlist' && (
        <section className="mb-8">
          {wishlistedProducts.length > 0 ? (
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
                            id={`analytics-discount-${p.id}`}
                            name={`analytics-discount-${p.id}`}
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
                          onClick={() => handleApplyDiscount(p.id)}
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
          ) : (
            <div className="bg-white border-4 border-black p-8 text-center">
              <p className="text-black/70 font-semibold">No wishlist data yet.</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default AnalyticsPage;

