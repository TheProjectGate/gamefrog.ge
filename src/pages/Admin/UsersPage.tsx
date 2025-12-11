import React, { useState, useEffect } from 'react';
import { UserIcon, ChevronRightIcon } from '../../components/Icons';
import { getAvatar } from '../../utils/avatars';

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

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails>>({});
  const [loadingDetails, setLoadingDetails] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

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
    // If already expanded, collapse
    if (expandedUser === email) {
      setExpandedUser(null);
      return;
    }

    // Expand and fetch details if not cached
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
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };


  return (
    <div className="space-y-6">
      <div className="bg-white border-4 border-black p-6 shadow-[4px_4px_0_0_#000]">
        <h2 className="text-3xl font-black uppercase mb-6 flex items-center gap-3">
          <UserIcon className="w-8 h-8" />
          Users Management
        </h2>

        {/* Search */}
        <div className="mb-6">
          <input
            id="users-search"
            name="users-search"
            type="text"
            placeholder="Search users by email or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                                      {formatDate(order.created_at)} • 
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
    </div>
  );
};

export default UsersPage;


