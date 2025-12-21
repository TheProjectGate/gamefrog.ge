import React, { useState, useEffect, useMemo } from 'react';
import { UserIcon, ChevronRightIcon, TrashIcon } from '../../components/Icons';
import { getAvatar } from '../../utils/avatars';
import { getAllChatMessages, getChatMessagesByUser, deleteChatMessages, ChatMessageWithUserInfo } from '../../api/chatMessages';
import useStore from '../../store/useStore';

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
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessageWithUserInfo[]>>({});
  const [loadingChat, setLoadingChat] = useState<Record<string, boolean>>({});
  const [chatFilter, setChatFilter] = useState<{ period?: 'week' | 'month' | 'year'; startDate?: string; endDate?: string }>({});
  const products = useStore(state => state.products);

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
      
      setChatMessages(prev => ({ ...prev, [email]: messages }));
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setLoadingChat(prev => ({ ...prev, [email]: false }));
    }
  };

  const handleDeleteChatMessages = async (email: string) => {
    if (!confirm(`Delete all chat messages for ${email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const filter = chatFilter.period 
        ? { period: chatFilter.period, userEmail: email }
        : { userEmail: email };
      
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
    const parts: Array<{ text: string; highlight: boolean; type?: string }> = [];
    let lastIndex = 0;

    // Collect all highlights
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
                                    <div className="text-sm">
                                      {highlightImportantText(msg.content, msg.metadata, details.user)}
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
    </div>
  );
};

export default UsersPage;


