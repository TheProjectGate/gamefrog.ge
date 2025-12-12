import { create } from 'zustand';
import { Product, FilterConfig, View, UserRole, FilterConfigItem, FilterGroup, ProductFilterValues, UserMessage, Order, Customer, ProductView, CategoryTime, OrderStatus, CheckoutSummary, CheckoutSummaryItem, MessageType, BadgeColorConfig, BadgeColor } from '../types';
import { INITIAL_FILTER_GROUPS } from './constants';
import { fetchProductsAPI, updateProductAPI, createProductAPI, deleteProductAPI } from '../api/products';
import { SupportedLanguage, DEFAULT_LANGUAGE } from '../i18n/config';
import i18n from '../i18n/config';
import { createUnipayOrder } from '../api/payments';
import { logger } from '../utils/logger';
import {
  deletePaymentCard,
  fetchPaymentCards,
  savePaymentCard,
  setDefaultPaymentCard,
} from '../api/paymentCards';
import { updateUserProfile as updateUserProfileAPI, getUserProfile, addGoldCoins, login as loginAPI } from '../api/users';
import { createOrder as createOrderAPI, getOrders as getOrdersAPI } from '../api/orders';
import { createMessage } from '../api/messages';
import { normalizeCardNumber, sanitizeExpiry, CardBrand } from '../utils/cardUtils';
import { getApiBaseUrl } from '../api/baseUrl';
import { getUserSettings, updateUserSettings } from '../api/userSettings';
import {
  deleteMessage,
  deleteMessages as deleteMessagesAPI,
  archiveMessages as archiveMessagesAPI,
  unarchiveMessages as unarchiveMessagesAPI,
  restoreMessages as restoreMessagesAPI,
} from '../api/messages';
import {
  fetchFilterGroups,
  saveFilterGroup,
  updateFilterGroup,
  deleteFilterGroupAPI,
  fetchFilterAssignments,
  updateFilterAssignments,
  updateFilterGroupOrder,
  updateFilterItemsOrder,
  saveFilterConfig,
  loadFilterConfig,
} from '../api/filterGroups';

export const FILTER_CHILD_DELIMITER = '::';
const AUTH_KEY = 'gf_auth';
const PAYMENT_SUMMARY_KEY = 'gf_checkout_summaries';

type CheckoutSummaryMap = Record<string, CheckoutSummary>;

export interface UserPaymentInfo {
  id: number;
  cardholderName: string;
  maskedNumber: string;
  last4: string;
  expiry: string;
  cardType: CardBrand;
  fingerprint: string;
  isDefault: boolean;
}

interface PaymentStatusState {
  status: 'success' | 'cancel' | null;
  orderId?: string;
  isSimulated?: boolean;
  message?: string;
  summary?: CheckoutSummary | null;
}

interface PaymentSimulationState {
  orderId: string;
  successUrl: string;
  cancelUrl: string;
}

const getSummaryMap = (): CheckoutSummaryMap => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(PAYMENT_SUMMARY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as CheckoutSummaryMap;
  } catch (error) {
    console.warn('[useStore] Failed to load checkout summaries:', error);
    return {};
  }
};

const persistSummaryMap = (map: CheckoutSummaryMap) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PAYMENT_SUMMARY_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('[useStore] Failed to persist checkout summaries:', error);
  }
};

const buildChildKey = (parentId: string, childId: string) => `${parentId}${FILTER_CHILD_DELIMITER}${childId}`;
const splitChildKey = (value: string): [string, string] => {
  const [parent, child] = value.split(FILTER_CHILD_DELIMITER);
  return [parent, child];
};

const getChildKeysForParent = (group: FilterGroup | undefined, parentId: string): string[] => {
  if (!group) return [];
  const parent = group.items[parentId];
  if (!parent || !parent.children) return [];
  return Object.keys(parent.children).map(child => buildChildKey(parentId, child));
};

const dedupeSelections = (values: string[]) => Array.from(new Set(values));

export interface Filters {
  groupSelections: Record<string, string[]>;
  price: number;
  sortBy: string;
  condition: 'all' | 'new' | 'used';
  onlyCoins: boolean;
  onSale: boolean;
  bundlesOnly: boolean;
}

interface StoreState {
  // Core State
  products: Product[];
  isLoading: boolean;
  currentView: View;
  previousView: View;
  toastMessage: string;
  
  // Product & Cart State
  selectedProduct: Product | null;
  searchQuery: string;
  cart: Product[];
  wishlist: number[];
  purchaseHistory: Product[];
  userMessages: UserMessage[];
  isProcessingPayment: boolean;
  
  // Config State
  filterGroups: Record<string, FilterGroup>;
  filterGroupOrder: string[];
  filterAssignments: { genre: string; platform: string };
  genreConfig: FilterConfig;
  platformConfig: FilterConfig;

  // Auth State
  isLoggedIn: boolean;
  userRole: UserRole;
  userEmail: string;
  userFirstName?: string;
  userLastName?: string;
  userAvatar?: number;
  userPhone?: string;
  userAddress?: string;
  userGoldCoins: number; // Золотые монеты пользователя
  userPaymentCards: UserPaymentInfo[];
  selectedPaymentCardFingerprint: string | null;
  isRegisterModalOpen: boolean;
  registerPrompt: string;
  isUserCabinetOpen: boolean;
  isSaleModalOpen: boolean;
  paymentStatus: PaymentStatusState;
  paymentSimulation: PaymentSimulationState | null;
  
  // Tip/Donation State
  tipAmount: number;
  totalDonations: number;

  // Shipping State
  shippingMethod: 'delivery' | 'pickup' | null;
  deliveryZone: 'city' | 'region' | null;
  deliveryFee: number;
  deliveryEtaDays: number;
  
  // Filter State
  filters: Filters;

  // Language State
  language: SupportedLanguage;

  // Badge Colors Config
  badgeColors: BadgeColorConfig;

  // Derived State (Selectors)
  allGenres: string[];
  allPlatforms: string[];
  unreadMessageCount: number;

  // Analytics State
  orders: Order[];
  customers: Customer[];
  productViews: ProductView[];
  categoryTimes: CategoryTime[];
  currentCategoryStartTime: number | null;
  currentCategoryId: string | null;
}

interface StoreActions {
  fetchProducts: (forceRefresh?: boolean) => Promise<void>;
  loadOrders: (email?: string) => Promise<void>;
  loadMessages: (email: string) => Promise<void>;
  loadWishlist: (email: string) => Promise<void>;
  navigate: (view: View) => void;
  goBack: () => void;
  setToast: (message: string) => void;
  clearToast: () => void;
  
  openProductModal: (product: Product) => void;
  closeProductModal: () => void;
  setSearchQuery: (query: string) => void;
  clearSearchQuery: () => void;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: number) => Promise<void>;
  checkout: () => Promise<void>;
  setTipAmount: (amount: number) => void;

  // Shipping
  setShippingMethod: (method: 'delivery' | 'pickup') => void;
  setDeliveryZone: (zone: 'city' | 'region') => void;
  
  openRegisterModal: (prompt?: string) => void;
  closeRegisterModal: () => void;
  openUserCabinet: () => void;
  closeUserCabinet: () => void;
  openSaleModal: () => void;
  closeSaleModal: () => void;
  register: (email: string, password: string, firstName?: string, lastName?: string, avatar?: number, phone?: string, address?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (firstName?: string, lastName?: string, avatar?: number, phone?: string, address?: string) => Promise<void>;
  addPaymentCard: (
    info: { cardholderName?: string; cardNumber?: string; expiry?: string },
    options?: { makeDefault?: boolean }
  ) => Promise<boolean>;
  removePaymentCard: (fingerprint: string) => Promise<boolean>;
  setDefaultUserPaymentCard: (fingerprint: string) => Promise<boolean>;
  selectPaymentCard: (fingerprint: string | null) => void;
  refreshPaymentCards: (email: string) => Promise<void>;
  setPaymentStatus: (status: PaymentStatusState) => void;
  resetPaymentStatus: () => void;
  recordCheckoutSummary: (summary: CheckoutSummary) => void;
  updateCheckoutSummary: (orderId: string, updates: Partial<CheckoutSummary>) => void;
  consumeCheckoutSummary: (orderId: string) => CheckoutSummary | null;
  getCheckoutSummary: (orderId: string) => CheckoutSummary | null;
  finalizeSuccessfulCheckout: (summary: CheckoutSummary) => Promise<void>;
  startPaymentSimulation: (payload: PaymentSimulationState) => void;
  clearPaymentSimulation: () => void;
  
  setFilters: (newFilters: Partial<Filters>) => void;
  toggleParentFilterValue: (groupId: string, parentId: string) => void;
  toggleChildFilterValue: (groupId: string, parentId: string, childId: string) => void;
  setGroupFilterValues: (groupId: string, values: string[]) => void;
  removeFilter: (type: 'group' | 'condition' | 'onlyCoins' | 'onSale' | 'bundlesOnly', value: string, groupId?: string) => void;
  clearFilters: () => void;
  navigateToBrowseWithFilter: (platform: string) => void;

  addProduct: (newProduct: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (updatedProduct: Product) => Promise<void>;
  deleteProduct: (productId: number) => Promise<void>;
  addUserMessage: (subject: string, body: string, type?: MessageType) => void;
  deleteUserMessage: (messageId: number) => Promise<void>;
  markMessageRead: (messageId: number) => Promise<void>;
  deleteUserMessages: (messageIds: number[]) => Promise<void>;
  archiveUserMessages: (messageIds: number[]) => Promise<void>;
  unarchiveUserMessages: (messageIds: number[]) => Promise<void>;
  restoreUserMessages: (messageIds: number[]) => Promise<void>;
  loadFilterGroups: () => Promise<void>;
  addFilterGroup: (label: string) => Promise<void>;
  renameFilterGroup: (groupId: string, label: string) => Promise<void>;
  deleteFilterGroup: (groupId: string) => Promise<void>;
  assignFilterGroup: (assignment: 'genre' | 'platform', groupId: string) => Promise<void>;
  saveFilterItem: (groupId: string, oldName: string, newName: string, item: FilterConfigItem, parentId?: string) => Promise<void>;
  deleteFilterItem: (groupId: string, name: string, parentId?: string) => Promise<void>;
  reorderFilterItems: (groupId: string, itemOrder: string[], parentId?: string) => Promise<void>;
  reorderFilterGroups: (newOrder: string[]) => Promise<void>;
  
  // Language
  setLanguage: (language: SupportedLanguage) => void;

  // Badge Colors
  setBadgeColor: (messageType: MessageType, color: BadgeColor) => Promise<void>;
  loadUserSettings: () => Promise<void>;

  // Analytics
  trackProductView: (productId: number) => void;
  startCategoryTime: (categoryId: string, categoryName: string) => void;
  endCategoryTime: () => void;
  createOrder: (products: Product[], total: number, shippingMethod?: 'delivery' | 'pickup', deliveryZone?: 'city' | 'region', tipAmount?: number) => Promise<void>;
  updateOrderStatus: (orderId: number, status: OrderStatus) => void;
  registerCustomer: (email: string, name?: string) => void;
}

const cloneFilterConfig = (config: FilterConfig): FilterConfig =>
  Object.fromEntries(
    Object.entries(config).map(([name, item]) => [
      name,
      {
        ...item,
        children: item.children ? cloneFilterConfig(item.children) : undefined,
      },
    ])
  );

const createInitialGroupSelections = (groups: Record<string, FilterGroup>) =>
  Object.keys(groups).reduce<Record<string, string[]>>((acc, id) => {
    acc[id] = [];
    return acc;
  }, {});

const cloneGroupSelections = (selections: Record<string, string[]>) =>
  Object.fromEntries(Object.entries(selections).map(([groupId, values]) => [groupId, [...values]]));

const createInitialFilterGroups = (): Record<string, FilterGroup> => {
  const groups: Record<string, FilterGroup> = {};
  INITIAL_FILTER_GROUPS.forEach(group => {
    groups[group.id] = {
      id: group.id,
      label: group.label,
      items: cloneFilterConfig(group.items),
    };
  });
  return groups;
};

const buildPurchasedProductsFromSummary = (
  summaryItems: CheckoutSummaryItem[],
  products: Product[]
) => {
  if (!Array.isArray(summaryItems) || !Array.isArray(products)) {
    return [];
  }
  return summaryItems.flatMap(item => {
    const baseProduct = products.find(p => p.id === item.productId);
    const fallbackProduct: Product = {
      id: item.productId,
      name: item.name,
      price: item.unitPrice,
      description: 'Purchased item',
      imageUrl: item.imageUrl,
      genre: 'Misc',
      condition: 'new',
      stock: 0,
      goldCoins: item.goldCoins, // Include gold coins from summary
    };
    const resolved = baseProduct ? { ...baseProduct } : fallbackProduct;
    return Array.from({ length: item.quantity }, () => ({
      ...resolved,
      price: item.unitPrice,
      goldCoins: item.goldCoins ?? resolved.goldCoins, // Preserve gold coins
    }));
  });
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
  }).format(value);

const slugify = (label: string) =>
  label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const generateGroupId = (label: string, existingIds: Set<string>) => {
  const base = slugify(label);
  const seed = base || `group-${Math.random().toString(36).slice(2, 8)}`;
  let candidate = seed;
  let attempt = 1;
  while (existingIds.has(candidate)) {
    candidate = `${seed}-${attempt++}`;
  }
  return candidate;
};

const getProductValuesForGroup = (
  product: Product,
  groupId: string,
  assignments: { genre: string; platform: string }
): string[] => {
  const extraValues = product.filterValues?.[groupId] || [];
  if (groupId === assignments.genre) {
    const base = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
    return dedupeSelections([...base, ...extraValues]);
  }
  if (groupId === assignments.platform) {
    return dedupeSelections([...(product.platforms || []), ...extraValues]);
  }
  return extraValues;
};

const normalizeFilterValues = (
  filterValues: ProductFilterValues | undefined,
  groups: Record<string, FilterGroup>
): ProductFilterValues => {
  const normalized: ProductFilterValues = {};
  if (!filterValues) return normalized;
  Object.entries(filterValues).forEach(([groupId, values]) => {
    const group = groups[groupId];
    if (!group || !Array.isArray(values)) return;
    const parentIds = Object.keys(group.items);
    const allowedParents = new Set(parentIds);
    const allowedChildren = parentIds.reduce<Record<string, Set<string>>>((acc, parentId) => {
      const children = group.items[parentId]?.children;
      if (children) {
        acc[parentId] = new Set(Object.keys(children));
      }
      return acc;
    }, {});

    const uniqueValues = new Set<string>();
    values.forEach(value => {
      if (allowedParents.has(value)) {
        uniqueValues.add(value);
        return;
      }
      if (value.includes(FILTER_CHILD_DELIMITER)) {
        const [parentId, childId] = splitChildKey(value);
        if (allowedParents.has(parentId) && allowedChildren[parentId]?.has(childId)) {
          uniqueValues.add(buildChildKey(parentId, childId));
        }
      }
    });

    if (uniqueValues.size) {
      normalized[groupId] = Array.from(uniqueValues);
    }
  });
  return normalized;
};

const normalizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const DEFAULT_ICON_MAP: Record<string, string> = {
  // Platforms
  playstation: 'Gamepad2',
  ps: 'Gamepad2',
  ps4: 'Gamepad2',
  ps5: 'Gamepad2',
  xbox: 'Gamepad2',
  xboxone: 'Gamepad2',
  xboxseriesx: 'Gamepad2',
  nintendo: 'Gamepad2',
  switch: 'Gamepad2',
  pc: 'Monitor',
  windows: 'Monitor',
  mac: 'Monitor',
  linux: 'Monitor',
  mobile: 'Smartphone',
  ios: 'Smartphone',
  android: 'Smartphone',
  // Genres (examples)
  action: 'Flame',
  shooter: 'Crosshair',
  fps: 'Crosshair',
  rpg: 'Sword',
  adventure: 'Map',
  racing: 'Car',
  sports: 'Trophy',
  strategy: 'Brain',
  puzzle: 'Puzzle',
  horror: 'Skull',
  music: 'Music',
  movie: 'Film',
};

const assignDefaultIconsToFilterGroups = (groups: Record<string, FilterGroup>) => {
  const next: Record<string, FilterGroup> = {};
  Object.values(groups).forEach(group => {
    const newItems: FilterConfig = {} as any;
    Object.entries(group.items).forEach(([name, item]) => {
      const n = normalizeKey(name);
      const iconName = item.iconName && item.iconName.trim() ? item.iconName : (DEFAULT_ICON_MAP[n] || '');
      let newChildren: FilterConfig | undefined;
      if (item.children) {
        const childEntries = Object.entries(item.children).map(([childName, childItem]) => {
          const cn = normalizeKey(childName);
          const childIcon = childItem.iconName && childItem.iconName.trim() ? childItem.iconName : (DEFAULT_ICON_MAP[cn] || '');
          return [childName, { ...childItem, iconName: childIcon }] as [string, any];
        });
        newChildren = Object.fromEntries(childEntries);
      }
      newItems[name] = { ...item, iconName, children: newChildren };
    });
    next[group.id] = { ...group, items: newItems };
  });
  return next;
};

const initialFilterState = (() => {
  const groups = createInitialFilterGroups();
  const groupsWithIcons = assignDefaultIconsToFilterGroups(groups);
  const order = Object.keys(groupsWithIcons);
  const assignments = {
    genre: groupsWithIcons['genre'] ? 'genre' : order[0] || '',
    platform: groupsWithIcons['platform'] ? 'platform' : order[0] || '',
  };
  const selections = createInitialGroupSelections(groupsWithIcons);
  return { groups: groupsWithIcons, order, assignments, selections };
})();

const pickSelectedPaymentCard = (
  cards: UserPaymentInfo[],
  currentFingerprint: string | null
) => {
  if (cards.length === 0) return null;
  if (currentFingerprint && cards.some(card => card.fingerprint === currentFingerprint)) {
    return currentFingerprint;
  }
  const defaultCard = cards.find(card => card.isDefault);
  return (defaultCard || cards[0]).fingerprint;
};

const useStore = create<StoreState & StoreActions>((set, get) => ({
  // --- INITIAL STATE ---
  products: [],
  isLoading: true,
  currentView: 'home',
  previousView: 'home',
  toastMessage: '',
  selectedProduct: null,
  searchQuery: '',
  cart: [],
  wishlist: [],
  purchaseHistory: [],
  userMessages: [],
  orders: [],
  customers: [],
  productViews: [],
  categoryTimes: [],
  currentCategoryStartTime: null,
  currentCategoryId: null,
  filterGroups: initialFilterState.groups,
  filterGroupOrder: (() => {
    const saved = loadFilterConfig();
    return saved?.order || initialFilterState.order;
  })(),
  filterAssignments: (() => {
    const saved = loadFilterConfig();
    return saved?.assignments || initialFilterState.assignments;
  })(),
  isLoggedIn: false,
  userRole: null,
  userEmail: '',
  userFirstName: undefined,
  userLastName: undefined,
  userAvatar: undefined,
  userPhone: undefined,
  userAddress: undefined,
  userGoldCoins: 0,
  userPaymentCards: [],
  selectedPaymentCardFingerprint: null,
  isRegisterModalOpen: false,
  registerPrompt: '',
  isUserCabinetOpen: false,
  isSaleModalOpen: false,
  paymentStatus: { status: null, summary: null },
  paymentSimulation: null,
  tipAmount: 0,
  totalDonations: 0,
  isProcessingPayment: false,
  shippingMethod: null,
  deliveryZone: null,
  deliveryFee: 0,
  deliveryEtaDays: 0,
  filters: {
    groupSelections: cloneGroupSelections(initialFilterState.selections),
    price: 500,
    sortBy: 'name-asc',
    condition: 'all',
    onlyCoins: false,
    onSale: false,
    bundlesOnly: false,
  },
  badgeColors: {
    order: 'green',
    wishlist: 'pink',
    general: 'red',
  },
  language: (() => {
    // Загружаем язык из localStorage или используем язык браузера
    const saved = localStorage.getItem('i18nextLng');
    if (saved && (saved === 'en' || saved === 'ka')) {
      return saved as SupportedLanguage;
    }
    return DEFAULT_LANGUAGE;
  })(),

  // --- DERIVED STATE (SELECTORS) ---
  // Note: These are computed on access, not reactive. Use selectors in components instead.
  get genreConfig() {
    const state = get();
    const genreId = state.filterAssignments.genre;
    if (!genreId) return {};
    const group = state.filterGroups[genreId];
    return group ? group.items : {};
  },
  get platformConfig() {
    const state = get();
    const platformId = state.filterAssignments.platform;
    if (!platformId) return {};
    const group = state.filterGroups[platformId];
    return group ? group.items : {};
  },
  get allGenres() { return Object.keys(get().genreConfig) },
  get allPlatforms() { return Object.keys(get().platformConfig) },
  get unreadMessageCount() {
    return get().userMessages.filter(message => !message.isRead && !message.isArchived && !message.isDeleted).length;
  },

  // --- ACTIONS ---
  loadFilterGroups: async () => {
    try {
      const [groups, assignments] = await Promise.all([
        fetchFilterGroups().catch(() => []),
        fetchFilterAssignments().catch(() => ({} as Record<string, string>)),
      ]);
      
      if (groups.length > 0) {
        const groupsMap: Record<string, FilterGroup> = {};
        groups.forEach(group => {
          groupsMap[group.id] = {
            ...group,
            items: assignDefaultIconsToFilterGroups({ [group.id]: group })[group.id]?.items || group.items,
          };
        });
        
        // Sort by displayOrder
        const sortedGroups = [...groups].sort((a, b) => ((a as any).displayOrder || 0) - ((b as any).displayOrder || 0));
        const order = sortedGroups.map(g => g.id);
        
        // Use assignments from DB, fallback to localStorage, then defaults
        const dbAssignments = Object.keys(assignments).length > 0 ? assignments : null;
        const savedConfig = loadFilterConfig();
        const defaultAssignments = {
          genre: groupsMap['genre'] ? 'genre' : order[0] || '',
          platform: groupsMap['platform'] ? 'platform' : order[0] || '',
        };
        
        const finalAssignments = dbAssignments || savedConfig?.assignments || defaultAssignments;
        
        set({
          filterGroups: groupsMap,
          filterGroupOrder: order,
          filterAssignments: finalAssignments,
        });
        
        // Migrate from localStorage to DB if needed
        if (savedConfig && !dbAssignments) {
          try {
            await updateFilterAssignments(finalAssignments);
            await updateFilterGroupOrder(order);
          } catch (error) {
            console.warn('Failed to migrate filter config to DB:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load filter groups from API, using defaults:', error);
    }
  },
  fetchProducts: async (forceRefresh: boolean = false) => {
    // #region agent log
    // Логирование отключено - сервис недоступен
    // #endregion
    set({ isLoading: true });
    // Load filter groups first
    await get().loadFilterGroups();
    // #region agent log
    let products;
    try {
      products = await fetchProductsAPI(forceRefresh);
      // #region agent log
      // Логирование отключено
      // #endregion
    } catch (error) {
      // #region agent log
      // Логирование отключено
      // #endregion
      throw error;
    }
    // #endregion
    // Ensure products is an array
    const safeProducts = Array.isArray(products) ? products : [];
    const maxPrice = safeProducts.length > 0 ? safeProducts.reduce((max, product) => Math.max(max, product.price || 0), 0) : 0;
    set((state) => ({
      products: safeProducts.map(p => ({
        ...p,
        wishlistCount: typeof p.wishlistCount === 'number' ? p.wishlistCount : 0,
        discountPercent: typeof p.discountPercent === 'number' ? p.discountPercent : undefined,
      })),
      isLoading: false,
      filters: {
        ...state.filters,
        price: Math.max(state.filters.price, Math.ceil(maxPrice / 10) * 10),
      },
      // Ensure default icons are prefilled for all filter items
      filterGroups: assignDefaultIconsToFilterGroups(state.filterGroups),
    }));
    // Restore auth from storage after initial load
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        // #region agent log
        let saved;
        try {
          saved = JSON.parse(raw) as { 
          email?: string; 
          password?: string; 
          isLoggedIn?: boolean; 
          userRole?: UserRole;
          firstName?: string;
          lastName?: string;
          avatar?: number;
          phone?: string;
          address?: string;
        };
        } catch (parseError) {
          // #region agent log
          // Agent log disabled - service unavailable
          // #endregion
          console.error('[useStore] Failed to parse localStorage auth data:', parseError);
          return; // Exit early if parsing fails
        }
        // #endregion
        if (saved?.isLoggedIn && saved?.email) {
          // Set initial state from localStorage
          set({
            isLoggedIn: true,
            userEmail: saved.email || '',
            userRole: saved.userRole ?? null,
            userFirstName: saved.firstName,
            userLastName: saved.lastName,
            userAvatar: saved.avatar,
            userPhone: saved.phone,
            userAddress: saved.address,
          });
          
          // Load fresh data from database
          try {
            const profile = await getUserProfile(saved.email);
            set({
              userFirstName: profile.firstName,
              userLastName: profile.lastName,
              userAvatar: profile.avatar,
              userPhone: profile.phone,
              userAddress: profile.address,
              userGoldCoins: profile.goldCoins,
            });
            
            // Update localStorage with fresh data
            localStorage.setItem(AUTH_KEY, JSON.stringify({
              ...saved,
              firstName: profile.firstName,
              lastName: profile.lastName,
              avatar: profile.avatar,
              phone: profile.phone,
              address: profile.address,
            }));
            
            // Update or create customer record
            const state = get();
            const customerExists = state.customers.find(c => c.email === saved.email);
            if (customerExists) {
              set(prevState => ({
                customers: prevState.customers.map(c =>
                  c.email === saved.email
                    ? {
                        ...c,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        avatar: profile.avatar,
                        name: profile.firstName && profile.lastName 
                          ? `${profile.firstName} ${profile.lastName}` 
                          : profile.firstName || profile.lastName || c.name,
                      }
                    : c
                ),
              }));
            }
            
            // Check if token exists - if not, user needs to log in again
            const token = localStorage.getItem('token');
            if (!token) {
              console.warn('[useStore] No authentication token found. User may need to log in again.');
              // Clear the logged-in state since we don't have a valid token
              set({ isLoggedIn: false });
              localStorage.setItem(AUTH_KEY, JSON.stringify({ ...saved, isLoggedIn: false }));
            } else {
              // Load orders/purchase history, messages and wishlist
              if (saved.email) {
                // Admin loads all orders, regular users load only their orders
                if (saved.userRole === 'admin') {
                  await get().loadOrders();
                } else {
                  await get().loadOrders(saved.email);
                }
                await get().loadMessages(saved.email);
                await get().loadWishlist(saved.email);
                await get().loadUserSettings();
              }
            }
          } catch (error) {
            console.warn('[useStore] Failed to load profile from server, using cached data:', error);
            // Check if we have a token - if not, don't try to load protected resources
            const token = localStorage.getItem('token');
            if (token) {
              // Still try to load user settings even if profile loading failed
              if (saved.email) {
                get().loadUserSettings().catch(err => {
                  console.warn('[useStore] Failed to load user settings:', err);
                });
              }
            } else {
              console.warn('[useStore] No authentication token found. User may need to log in again.');
              // Clear the logged-in state since we don't have a valid token
              set({ isLoggedIn: false });
              localStorage.setItem(AUTH_KEY, JSON.stringify({ ...saved, isLoggedIn: false }));
            }
          }
        }
      }
    } catch (error) {
      console.error('[useStore] Failed to restore session from localStorage:', error);
      // #region agent log
      // Agent log disabled - service unavailable
      // #endregion
    }
  },
  loadOrders: async (email) => {
    try {
      const state = get();
      // Load all orders for admin, or user-specific orders
      const response = await getOrdersAPI(email, 1, 1000);
      
      if (!response?.data) return;
      
      const orders: Order[] = response.data.map((dbOrder: any) => ({
        id: dbOrder.id,
        customerEmail: dbOrder.customerEmail,
        products: dbOrder.products || [],
        total: dbOrder.total,
        status: dbOrder.status,
        createdAt: dbOrder.createdAt,
        updatedAt: dbOrder.updatedAt,
        shippingMethod: dbOrder.shippingMethod,
        deliveryZone: dbOrder.deliveryZone,
        tipAmount: dbOrder.tipAmount,
      }));
      
      // Extract all products from orders for purchase history
      const purchaseHistory: Product[] = orders.flatMap(order => 
        order.products || []
      );
      
      set({
        orders,
        purchaseHistory,
      });
    } catch (error) {
      console.error('[useStore] Failed to load orders:', error);
    }
  },
  loadMessages: async (email) => {
    if (!email) return;
    
    try {
      const state = get();
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('[useStore] No authentication token found, skipping message load');
        return;
      }
      
      // For admin viewing other users, use getMessages. For own messages, use getMyMessages
      const { getMyMessages, getMessages } = await import('../api/messages');
      
      let messages;
      if (state.userRole === 'admin' && email !== state.userEmail) {
        // Admin viewing another user's messages
        messages = await getMessages(email, false);
      } else {
        // Get own messages
        messages = await getMyMessages();
      }
      
      const userMessages: UserMessage[] = messages.map((msg: any) => ({
        id: msg.id,
        subject: msg.subject,
        body: msg.body,
        createdAt: msg.created_at || msg.createdAt, // Handle both formats
        // MySQL BOOLEAN returns 0/1, convert to boolean
        isRead: Boolean(msg.is_read !== undefined ? msg.is_read : msg.isRead),
        isArchived: Boolean(msg.is_archived !== undefined ? msg.is_archived : msg.isArchived),
        isDeleted: Boolean(msg.is_deleted !== undefined ? msg.is_deleted : msg.isDeleted),
        type: (msg.type || 'general') as MessageType,
      }));
      
      set({ userMessages });
    } catch (error) {
      // Only log error if it's not a missing token (which we already handled)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('No authentication token') && !errorMessage.includes('401') && !errorMessage.includes('Authorization header')) {
        console.error('[useStore] Failed to load messages:', error);
      } else {
        console.warn('[useStore] Failed to load messages (authentication required):', errorMessage);
      }
    }
  },
  loadWishlist: async (email) => {
    if (!email) return;
    
    try {
      const { getWishlist } = await import('../api/wishlist');
      const wishlistProducts = await getWishlist(email);
      
      const wishlistIds = wishlistProducts.map(p => p.id);
      
      // Update products with fresh wishlist_count from database
      set(prevState => ({
        wishlist: wishlistIds,
        products: prevState.products.map(product => {
          const wishlistProduct = wishlistProducts.find(wp => wp.id === product.id);
          if (wishlistProduct && wishlistProduct.wishlistCount !== undefined) {
            return {
              ...product,
              wishlistCount: wishlistProduct.wishlistCount
            };
          }
          return product;
        })
      }));
    } catch (error) {
      console.error('[useStore] Failed to load wishlist:', error);
    }
  },
  navigate: (view) => set(state => {
    if (view === 'wishlist' && !state.isLoggedIn) {
      state.openRegisterModal('Please log in to view your wishlist!');
      return {};
    }
    if (view === 'admin' && state.userRole !== 'admin') {
      state.setToast('Access Denied: Admins only.');
      return {};
    }
    // Clear search query when navigating to browse to show all products
    // Also ensure price filter includes all products
    if (view === 'browse') {
      const maxPrice = state.products.length > 0 
        ? Math.ceil(state.products.reduce((max, product) => Math.max(max, product.price), 0) / 10) * 10
        : state.filters.price;
      return { 
        previousView: state.currentView, 
        currentView: view, 
        searchQuery: '',
        filters: {
          ...state.filters,
          price: Math.max(state.filters.price, maxPrice),
        }
      };
    }
    return { previousView: state.currentView, currentView: view };
  }),
  goBack: () => set(state => ({ currentView: state.previousView })),
  setToast: (message) => set({ toastMessage: message }),
  clearToast: () => set({ toastMessage: '' }),

  openProductModal: (product) => {
    const state = get();
    // Отслеживаем просмотр продукта
    state.trackProductView(product.id);
    set({ selectedProduct: product });
  },
  closeProductModal: () => set({ selectedProduct: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  clearSearchQuery: () => set({ searchQuery: '' }),

  addToCart: (product) => {
    set(state => ({ cart: [...state.cart, product] }));
    get().setToast('Added to Cart!');
    if (get().selectedProduct?.id === product.id) {
        get().closeProductModal();
    }
  },
  removeFromCart: (productId) => set(state => ({
    cart: state.cart.filter((p, index) => {
        const foundIndex = state.cart.findIndex(item => item.id === productId);
        return index !== foundIndex;
    })
  })),
  clearCart: () => set({ cart: [] }),
  toggleWishlist: async (productId) => {
    const state = get();
    if (!state.isLoggedIn || !state.userEmail) {
        get().openRegisterModal('Only authorized users can add products to their wishlist.');
        return;
    }
    
    const isWishlisted = state.wishlist.includes(productId);
    
    // Optimistic update
    set(prevState => {
        const nextWishlist = isWishlisted
          ? prevState.wishlist.filter(id => id !== productId)
          : [...prevState.wishlist, productId];
        const nextProducts = prevState.products.map(p => {
          if (p.id !== productId) return p;
          const current = typeof p.wishlistCount === 'number' ? p.wishlistCount : 0;
          return {
            ...p,
            wishlistCount: Math.max(0, current + (isWishlisted ? -1 : 1)),
          };
        });
        return { wishlist: nextWishlist, products: nextProducts };
    });
    
    // Sync with database
    try {
      const { addToWishlist, removeFromWishlist } = await import('../api/wishlist');
      if (isWishlisted) {
        await removeFromWishlist(state.userEmail, productId);
        get().setToast('Removed from Wishlist');
      } else {
        await addToWishlist(state.userEmail, productId);
        get().setToast('Added to Wishlist!');
      }
    } catch (error: any) {
      console.error('[useStore] Failed to sync wishlist with database:', error);
      
      // If error is "already in wishlist", just reload wishlist from server instead of reverting
      if (error.message?.includes('already in wishlist')) {
        await get().loadWishlist(state.userEmail);
        return;
      }
      
      // Revert optimistic update on other errors
      set(prevState => {
        const revertedWishlist = isWishlisted
          ? [...prevState.wishlist, productId]
          : prevState.wishlist.filter(id => id !== productId);
        const revertedProducts = prevState.products.map(p => {
          if (p.id !== productId) return p;
          const current = typeof p.wishlistCount === 'number' ? p.wishlistCount : 0;
          return {
            ...p,
            wishlistCount: Math.max(0, current + (isWishlisted ? 1 : -1)),
          };
        });
        return { wishlist: revertedWishlist, products: revertedProducts };
      });
      get().setToast('Failed to update wishlist. Please try again.');
    }
  },
  applyDiscountToProduct: async (productId, discountPercent) => {
    const state = get();
    const target = state.products.find(p => p.id === productId);
    if (!target) return;
    
    const hasSaleTag = target.tags?.includes('sale');
    const updatedTags = hasSaleTag ? target.tags : [...(target.tags || []), 'sale'];
    
    // Optimistic update
    const nextProducts = state.products.map(p =>
      p.id === productId ? { ...p, tags: updatedTags, discountPercent } : p
    );
    set({ products: nextProducts });
    
    // Save to database
    try {
      const { updateProductAPI } = await import('../api/products');
      await updateProductAPI(productId, {
        tags: updatedTags,
        discountPercent,
      });
      
      // Show toast immediately
      get().setToast('Discount applied and saved!');
      
      // Send message to ALL users who have this product in wishlist (in background, non-blocking)
      const apiBaseUrl = getApiBaseUrl();
      const fetchUrl = `${apiBaseUrl}/api/wishlist/users/${productId}`;
      
      // Don't await - run in background so user can continue working
      fetch(fetchUrl).then(response => {
        if (response.ok) {
          return response.json();
        }
        return null;
      }).then(data => {
        if (!data) return;
        const emails = data.emails || [];
        
        if (emails.length > 0) {
          const subject = 'Discount on your wishlisted product';
          const body = `Good news! The product "${target.name}" from your wishlist now has a ${discountPercent}% discount.`;
          
          // Send message to each user (non-blocking)
          emails.forEach((email: string) => {
            createMessage({
              userEmail: email,
              subject,
              body,
              type: 'wishlist',
            }).catch((err: Error) => {
              console.error('[useStore] Failed to send message to', email, ':', err);
            });
          });
          
          // Reload messages if current user is in the list (non-blocking)
          if (state.userEmail && emails.includes(state.userEmail)) {
            get().loadMessages(state.userEmail).catch(() => {});
          }
        }
      }).catch(error => {
        console.error('[useStore] Failed to send wishlist discount messages:', error);
      });
    } catch (error) {
      console.error('[useStore] Failed to save discount to database:', error);
      // Rollback on error
      set({ products: state.products });
      get().setToast('Failed to save discount. Please try again.');
    }
  },
  checkout: async () => {
    const state = get();
    if (!state.cart.length) {
      get().setToast('Your cart is empty.');
      return;
    }

    if (state.isProcessingPayment) {
      return;
    }

    set({ isProcessingPayment: true });

    try {
      const donation = Math.max(0, Number(state.tipAmount) || 0);
      const deliveryFee = Math.max(0, Number(state.deliveryFee) || 0);
      const itemMap = new Map<number, CheckoutSummaryItem>();
      state.cart.forEach(product => {
        if (itemMap.has(product.id)) {
          const existing = itemMap.get(product.id)!;
          existing.quantity += 1;
        } else {
          itemMap.set(product.id, {
            productId: product.id,
            name: product.name,
            quantity: 1,
            unitPrice: product.price,
            imageUrl: product.imageUrl,
            goldCoins: product.goldCoins,
          });
        }
      });
      const summaryItems = Array.from(itemMap.values());
      const subtotal = summaryItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      const total = Number((subtotal + donation + deliveryFee).toFixed(2));
      const baseOrigin =
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5433';
      const checkoutOrderId = `GF-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const successUrl = `${baseOrigin}/?payment=success&order=${encodeURIComponent(
        checkoutOrderId
      )}`;
      const cancelUrl = `${baseOrigin}/?payment=cancel&order=${encodeURIComponent(
        checkoutOrderId
      )}`;

      const summary: CheckoutSummary = {
        orderId: checkoutOrderId,
        currency: 'GEL',
        subtotal: Number(subtotal.toFixed(2)),
        tip: donation,
        deliveryFee,
        total,
        email: state.userEmail || 'guest@gamefrog.ge',
        shippingMethod: state.shippingMethod ?? null,
        deliveryZone: state.deliveryZone ?? null,
        items: summaryItems,
        isSimulated: false,
        createdAt: new Date().toISOString(),
        paymentMethod: 'unipay',
      };
      get().recordCheckoutSummary(summary);

      const response = await createUnipayOrder({
        customerEmail: state.userEmail || 'guest@gamefrog.ge',
        merchantUser: state.userEmail || 'guest@gamefrog.ge',
        total,
        currency: 'GEL',
        orderName: 'GameFrog Order',
        orderDescription: state.cart.map((product) => product.name).join(', ').slice(0, 250),
        successRedirectUrl: successUrl,
        cancelRedirectUrl: cancelUrl,
        merchantOrderId: checkoutOrderId,
        language: state.language === 'ka' ? 'GE' : 'EN',
        items: state.cart.slice(0, 10).map((product) => ({
          title: product.name,
          price: product.price,
          quantity: 1,
          description: product.description?.slice(0, 60) || '',
          currency: 'GEL',
        })),
      });

      if (response?.testMode) {
        get().updateCheckoutSummary(checkoutOrderId, { isSimulated: true });
        get().startPaymentSimulation({
          orderId: checkoutOrderId,
          successUrl,
          cancelUrl,
        });
        get().setToast('Global payment test mode is active. Complete the mock checkout.');
        set({ isProcessingPayment: false });
        get().navigate('payment-sim');
        return;
      }

      if (typeof window !== 'undefined') {
        window.location.href = response.checkoutUrl;
      } else {
        get().setToast('UniPay checkout created.');
      }
    } catch (error: any) {
      console.error('[UniPay] Failed to start checkout:', error);
      get().setToast(error?.message || 'Failed to start UniPay checkout. Please try again.');
    } finally {
      set({ isProcessingPayment: false });
    }
  },
  setTipAmount: (amount) => set({ tipAmount: Math.max(0, Number.isFinite(amount as number) ? Number(amount) : 0) }),

  setShippingMethod: (method) => set(state => {
    if (method === 'pickup') {
      return { shippingMethod: 'pickup', deliveryZone: null, deliveryFee: 0, deliveryEtaDays: 0 };
    }
    // default delivery to city if not yet chosen
    const zone = state.deliveryZone ?? 'city';
    const fee = zone === 'region' ? 9 : 5;
    const eta = zone === 'region' ? 5 : 2;
    return { shippingMethod: 'delivery', deliveryZone: zone as 'city' | 'region', deliveryFee: fee, deliveryEtaDays: eta };
  }),
  setDeliveryZone: (zone) => set(() => {
    const fee = zone === 'region' ? 9 : 5;
    const eta = zone === 'region' ? 5 : 2;
    return { shippingMethod: 'delivery', deliveryZone: zone, deliveryFee: fee, deliveryEtaDays: eta };
  }),

  openRegisterModal: (prompt) => set({ isRegisterModalOpen: true, registerPrompt: prompt || '' }),
  closeRegisterModal: () => set({ isRegisterModalOpen: false, registerPrompt: '' }),
  openUserCabinet: () => {
    set({ isUserCabinetOpen: true });
    const state = get();
    if (state.userEmail) {
      get().loadMessages(state.userEmail).catch(error => {
        console.error('[useStore] Failed to refresh messages on cabinet open:', error);
      });
    }
  },
  closeUserCabinet: () => set({ isUserCabinetOpen: false }),
  openSaleModal: () => set({ isSaleModalOpen: true }),
  closeSaleModal: () => set({ isSaleModalOpen: false }),
  register: async (email, password, firstName, lastName, avatar, phone, address) => {
    // #region agent log
    // Agent log disabled - service unavailable
    // #endregion
    try {
      // Save user to database via API
      const response = await fetch(`${getApiBaseUrl()}/api/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, firstName, lastName, avatar, phone, address }),
      });

      if (!response.ok) {
        const error = await response.json();
        // #region agent log
        // Agent log disabled - service unavailable
        // #endregion
        throw new Error(error.message || 'Registration failed');
      }

      const data = await response.json();
      
      // Save token if provided
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Registration successful
      set({
        isLoggedIn: true,
        userEmail: email,
        userFirstName: firstName,
        userLastName: lastName,
        userAvatar: avatar,
        userPhone: phone,
        userAddress: address,
        userGoldCoins: 0,
      });
      
      get().registerCustomer(email, firstName, lastName, avatar);
      get().closeRegisterModal();
      get().setToast('Registration successful!');
      
      // Save to localStorage
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({
          email,
          password,
          isLoggedIn: true,
          userRole: null,
          firstName,
          lastName,
          avatar,
        }));
      } catch (error) {
        console.error('[useStore] Failed to save registration data to localStorage:', error);
        // #region agent log
        // Agent log disabled - service unavailable
        // #endregion
      }
      
      // Load user settings
      await get().loadUserSettings();
    } catch (error: any) {
      console.error('[useStore] Registration failed:', error);
      // #region agent log
      // Agent log disabled - service unavailable
      // #endregion
      get().setToast(error.message || 'Registration failed');
      throw error;
    }
  },
  updateUserProfile: async (firstName, lastName, avatar, phone, address) => {
    const state = get();
    
    // Optimistic update
    set({
      userFirstName: firstName,
      userLastName: lastName,
      userAvatar: avatar,
      userPhone: phone,
      userAddress: address,
    });
    
    // Update customer data
    const customer = state.customers.find(c => c.email === state.userEmail);
    if (customer) {
      set(state => ({
        customers: state.customers.map(c =>
          c.email === state.userEmail
            ? {
                ...c,
                firstName,
                lastName,
                avatar,
                name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName || c.name,
              }
            : c
        ),
      }));
    }
    
    // Persist to database
    if (state.userEmail) {
      try {
        await updateUserProfileAPI({
          email: state.userEmail,
          firstName,
          lastName,
          avatar,
          phone,
          address,
        });
        
        // Update localStorage
        try {
          const raw = localStorage.getItem(AUTH_KEY);
          if (raw) {
            const saved = JSON.parse(raw);
            localStorage.setItem(AUTH_KEY, JSON.stringify({
              ...saved,
              firstName,
              lastName,
              avatar,
              phone,
              address,
            }));
          }
        } catch (error) {
          console.error('[useStore] Failed to update localStorage:', error);
        }
      } catch (error) {
        console.error('[useStore] Failed to update profile on server:', error);
        state.setToast('Profile updated locally, but failed to save to server.');
        return;
      }
    }
    
    get().setToast('Profile updated successfully!');
  },
  addPaymentCard: async (info, options = {}) => {
    const state = get();
    if (!state.isLoggedIn || !state.userEmail) {
      state.setToast('Please log in to manage payment information.');
      return false;
    }

    const normalizedNumber = normalizeCardNumber(info.cardNumber || '');
    const expiryDigits = sanitizeExpiry(info.expiry || '');
    const trimmedHolder = (info.cardholderName || '').trim();

    if (normalizedNumber.length < 12) {
      state.setToast('Enter a valid credit card number.');
      return false;
    }
    if (expiryDigits.length !== 4) {
      state.setToast('Enter expiry in MMYY format.');
      return false;
    }
    if (!trimmedHolder) {
      state.setToast('Cardholder name is required.');
      return false;
    }

    try {
      await savePaymentCard({
        email: state.userEmail,
        cardholderName: trimmedHolder,
        cardNumber: normalizedNumber,
        expiry: expiryDigits,
        makeDefault: options.makeDefault,
      });
      await get().refreshPaymentCards(state.userEmail);
      return true;
    } catch (error: any) {
      console.error('[useStore] Failed to save payment info:', error);
      state.setToast(error?.message || 'Failed to save payment information.');
      return false;
    }
  },
  removePaymentCard: async (fingerprint) => {
    const state = get();
    if (!state.userEmail) return false;
    try {
      await deletePaymentCard(state.userEmail, fingerprint);
      await get().refreshPaymentCards(state.userEmail);
      return true;
    } catch (error) {
      console.error('[useStore] Failed to delete payment info:', error);
      state.setToast('Failed to remove payment information.');
      return false;
    }
  },
  setDefaultUserPaymentCard: async (fingerprint) => {
    const state = get();
    if (!state.userEmail) return false;
    try {
      await setDefaultPaymentCard(state.userEmail, fingerprint);
      await get().refreshPaymentCards(state.userEmail);
      return true;
    } catch (error) {
      console.error('[useStore] Failed to set default payment card:', error);
      state.setToast('Failed to update default card.');
      return false;
    }
  },
  selectPaymentCard: (fingerprint) => {
    set({ selectedPaymentCardFingerprint: fingerprint });
  },
  refreshPaymentCards: async (email) => {
    if (!email) return;
    try {
      const saved = await fetchPaymentCards(email);
      set(state => ({
        userPaymentCards: saved,
        selectedPaymentCardFingerprint: pickSelectedPaymentCard(
          saved,
          state.selectedPaymentCardFingerprint
        ),
      }));
    } catch (error) {
      console.warn('[useStore] Failed to load payment info:', error);
    }
  },
  finalizeSuccessfulCheckout: async (summary) => {
    const state = get();
    const purchasedProducts = buildPurchasedProductsFromSummary(summary.items, state.products);

    // Calculate total gold coins to award
    let totalGoldCoins = 0;
    purchasedProducts.forEach(product => {
      if (product.goldCoins && product.goldCoins > 0) {
        totalGoldCoins += product.goldCoins;
      }
    });

    set(prevState => {
      const updates: Partial<StoreState> = {};

      if (purchasedProducts.length) {
        updates.purchaseHistory = [...purchasedProducts, ...prevState.purchaseHistory];
      }

      if (state.isLoggedIn) {
        const paymentLabel =
          summary.paymentMethod === 'googlepay'
            ? 'Google Pay'
            : summary.paymentMethod === 'unipay'
            ? 'UniPay'
            : summary.paymentMethod;
        const lineItems = summary.items
          .map(
            item =>
              `• ${item.name} ×${item.quantity} — ${formatCurrency(
                item.unitPrice * item.quantity,
                summary.currency
              )}`
          )
          .join('\n');
        
        const goldCoinsLine = totalGoldCoins > 0 
          ? `\n🪙 Начислено золотых монет: ${totalGoldCoins}`
          : '';
        
        const receiptBody = [
          `Спасибо за покупку!`,
          ``,
          `Номер заказа: ${summary.orderId}`,
          `Сумма: ${formatCurrency(summary.total, summary.currency)}`,
          `Способ оплаты: ${paymentLabel}`,
          summary.shippingMethod
            ? `Доставка: ${summary.shippingMethod === 'delivery' ? 'Delivery' : 'Pickup'}`
            : null,
          summary.deliveryZone ? `Зона доставки: ${summary.deliveryZone}` : null,
          summary.tip ? `Чаевые: ${formatCurrency(summary.tip, summary.currency)}` : null,
          ``,
          `Состав заказа:`,
          lineItems,
          goldCoinsLine,
          ``,
          `Дата: ${new Date(summary.createdAt).toLocaleString()}`,
          `GameFrog`
        ]
          .filter(Boolean)
          .join('\n');

        const nextMessageId =
          prevState.userMessages.length > 0
            ? Math.max(...prevState.userMessages.map(msg => msg.id)) + 1
            : 1;

        updates.userMessages = [
          {
            id: nextMessageId,
            subject: `Чек заказа ${summary.orderId}`,
            body: receiptBody,
            createdAt: new Date().toISOString(),
            isRead: false,
            isArchived: false,
            isDeleted: false,
            type: 'order' as MessageType,
          },
          ...prevState.userMessages,
        ];
        
        // Update gold coins balance locally
        if (totalGoldCoins > 0) {
          updates.userGoldCoins = prevState.userGoldCoins + totalGoldCoins;
        }
      }

      return updates;
    });

    // Save receipt and award gold coins to database
    // Use email from summary if state email is not available
    const userEmail = state.userEmail || summary.email;
    const isValidUser = userEmail && userEmail !== 'guest@gamefrog.ge' && userEmail !== 'guest@example.com';
    
    if (isValidUser) {
      try {
        const paymentLabel =
          summary.paymentMethod === 'googlepay'
            ? 'Google Pay'
            : summary.paymentMethod === 'unipay'
            ? 'UniPay'
            : summary.paymentMethod;
        const lineItems = summary.items
          .map(
            item =>
              `• ${item.name} ×${item.quantity} — ${formatCurrency(
                item.unitPrice * item.quantity,
                summary.currency
              )}`
          )
          .join('\n');
        
        const goldCoinsLine = totalGoldCoins > 0 
          ? `\n🪙 Начислено золотых монет: ${totalGoldCoins}`
          : '';
        
        const receiptBody = [
          `Спасибо за покупку!`,
          ``,
          `Номер заказа: ${summary.orderId}`,
          `Сумма: ${formatCurrency(summary.total, summary.currency)}`,
          `Способ оплаты: ${paymentLabel}`,
          summary.shippingMethod
            ? `Доставка: ${summary.shippingMethod === 'delivery' ? 'Delivery' : 'Pickup'}`
            : null,
          summary.deliveryZone ? `Зона доставки: ${summary.deliveryZone}` : null,
          summary.tip ? `Чаевые: ${formatCurrency(summary.tip, summary.currency)}` : null,
          ``,
          `Состав заказа:`,
          lineItems,
          goldCoinsLine,
          ``,
          `Дата: ${new Date(summary.createdAt).toLocaleString()}`,
          `GameFrog`
        ]
          .filter(Boolean)
          .join('\n');

        // Save receipt message to database
        await createMessage({
          userEmail: userEmail,
          subject: `Чек заказа ${summary.orderId}`,
          body: receiptBody,
        });

        // Award gold coins
        if (totalGoldCoins > 0) {
          const newBalance = await addGoldCoins(userEmail, totalGoldCoins);
          set({ userGoldCoins: newBalance });
        }
      } catch (error) {
        console.error('[useStore] Failed to save receipt or award gold coins:', error);
        // Don't show error to user as local state is already updated
      }
    }

    if (purchasedProducts.length) {
      await get().createOrder(
        purchasedProducts,
        summary.total,
        summary.shippingMethod || undefined,
        summary.deliveryZone || undefined,
        summary.tip
      );
    }
  },
  setPaymentStatus: (status) => set({ paymentStatus: status }),
  resetPaymentStatus: () => set({ paymentStatus: { status: null, summary: null } }),
  recordCheckoutSummary: (summary) => {
    const map = getSummaryMap();
    map[summary.orderId] = summary;
    persistSummaryMap(map);
  },
  updateCheckoutSummary: (orderId, updates) => {
    const map = getSummaryMap();
    if (!map[orderId]) return;
    map[orderId] = { ...map[orderId], ...updates };
    persistSummaryMap(map);
  },
  consumeCheckoutSummary: (orderId) => {
    const map = getSummaryMap();
    const summary = map[orderId] || null;
    if (summary) {
      delete map[orderId];
      persistSummaryMap(map);
    }
    return summary;
  },
  getCheckoutSummary: (orderId) => {
    const map = getSummaryMap();
    return map[orderId] || null;
  },
  startPaymentSimulation: (payload) => set({ paymentSimulation: payload }),
  clearPaymentSimulation: () => set({ paymentSimulation: null }),
  login: async (email, password) => {
    // All users (including admin) should use the API login endpoint to get a token
    // This ensures proper authentication and token management
    try {
      const loginResponse = await loginAPI(email, password);
      
      // Store the token in localStorage (used by API functions)
      localStorage.setItem('token', loginResponse.token);
      
      // Set user state
      set({
        isLoggedIn: true,
        userEmail: email,
        userRole: loginResponse.role === 'admin' ? 'admin' : null,
        userFirstName: loginResponse.firstName,
        userLastName: loginResponse.lastName,
        userAvatar: loginResponse.avatar,
        userGoldCoins: loginResponse.goldCoins,
      });
      
      get().closeRegisterModal();
      if (loginResponse.role === 'admin') {
        get().setToast('Welcome back, Admin!');
      } else {
        get().setToast('Welcome back!');
      }
      
      // Persist auth data (without password for security, but keep email)
      try {
        localStorage.setItem(AUTH_KEY, JSON.stringify({ 
          email, 
          isLoggedIn: true, 
          userRole: loginResponse.role === 'admin' ? 'admin' : null,
          firstName: loginResponse.firstName,
          lastName: loginResponse.lastName,
          avatar: loginResponse.avatar,
        }));
      } catch (error) {
        console.error('[useStore] Failed to save user credentials to localStorage:', error);
      }
      
      // Update customer record with fresh data
      const state = get();
      const customerExists = state.customers.find(c => c.email === email);
      if (customerExists) {
        set(prevState => ({
          customers: prevState.customers.map(c =>
            c.email === email
              ? {
                  ...c,
                  firstName: loginResponse.firstName,
                  lastName: loginResponse.lastName,
                  avatar: loginResponse.avatar,
                  name: loginResponse.firstName && loginResponse.lastName 
                    ? `${loginResponse.firstName} ${loginResponse.lastName}` 
                    : loginResponse.firstName || loginResponse.lastName || c.name,
                }
              : c
          ),
        }));
      }
      
      // Load orders/purchase history, messages and wishlist
      // Admin loads all orders, regular users load only their orders
      if (loginResponse.role === 'admin') {
        await get().loadOrders(); // Load all orders for admin
      } else {
        await get().loadOrders(email);
      }
      await get().loadMessages(email);
      await get().loadWishlist(email);
      
      // Load user settings (badge colors)
      await get().loadUserSettings();
      
      return true;
    } catch (error) {
      console.error('[useStore] Login failed:', error);
      // Check if it's a user that exists locally but not in the database
      const state = get();
      const customer = state.customers.find(c => c.email === email);
      if (customer) {
        // Fallback: user exists locally but login failed
        // This might be a legacy user or the password is wrong
        throw new Error(error instanceof Error ? error.message : 'Login failed. Please check your credentials.');
      }
      throw error;
    }
  },
  logout: () => {
    set({ isLoggedIn: false, userEmail: '', userRole: null, wishlist: [], userGoldCoins: 0 });
    // Remove token from localStorage
    localStorage.removeItem('token');
    // keep saved creds for prefill, but mark session as logged out
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        localStorage.setItem(AUTH_KEY, JSON.stringify({ ...saved, isLoggedIn: false }));
      }
    } catch (error) {
      console.error('[useStore] Failed to update logout status in localStorage:', error);
    }
    try {
      localStorage.removeItem('token');
    } catch (error) {
      console.error('[useStore] Failed to clear auth token from localStorage:', error);
    }
    get().closeUserCabinet();
    get().setToast('You have been logged out.');
    if (get().currentView === 'admin') {
      get().navigate('home');
    }
  },

  setFilters: (newFilters) => set(state => ({
    filters: {
      ...state.filters,
      ...newFilters,
      groupSelections: newFilters.groupSelections
        ? { ...state.filters.groupSelections, ...newFilters.groupSelections }
        : state.filters.groupSelections,
    },
  })),
  toggleParentFilterValue: (groupId, parentId) => set(state => {
    const current = state.filters.groupSelections[groupId] || [];
    const hasParent = current.includes(parentId);
    const group = state.filterGroups[groupId];
    const childKeys = getChildKeysForParent(group, parentId);
    const withoutParent = current.filter(value => value !== parentId && !value.startsWith(`${parentId}${FILTER_CHILD_DELIMITER}`));
    const next = hasParent
      ? withoutParent
      : dedupeSelections([...withoutParent, parentId, ...childKeys]);
    return {
      filters: {
        ...state.filters,
        groupSelections: {
          ...state.filters.groupSelections,
          [groupId]: next,
        },
      },
    };
  }),
  toggleChildFilterValue: (groupId, parentId, childId) => set(state => {
    const current = state.filters.groupSelections[groupId] || [];
    const childKey = buildChildKey(parentId, childId);
    const hasChild = current.includes(childKey);
    const group = state.filterGroups[groupId];
    const childKeys = getChildKeysForParent(group, parentId);
    let next = hasChild
      ? current.filter(value => value !== childKey)
      : [...current, childKey];
    // When customizing children, remove parent flag to avoid stale state
    next = next.filter(value => value !== parentId);
    const selectedChildren = childKeys.filter(key => next.includes(key));
    if (selectedChildren.length === childKeys.length && childKeys.length > 0) {
      next = dedupeSelections([...next, parentId]);
    }
    next = dedupeSelections(next);
    return {
      filters: {
        ...state.filters,
        groupSelections: {
          ...state.filters.groupSelections,
          [groupId]: next,
        },
      },
    };
  }),
  setGroupFilterValues: (groupId, values) => set(state => ({
    filters: {
      ...state.filters,
      groupSelections: {
        ...state.filters.groupSelections,
        [groupId]: [...values],
      },
    },
  })),
  removeFilter: (type, value, groupId) => set(state => {
    if (type === 'condition') {
      return { filters: { ...state.filters, condition: 'all' } };
    }
    if (type === 'onlyCoins' || type === 'onSale' || type === 'bundlesOnly') {
      return { filters: { ...state.filters, [type]: false } };
    }
    if (type === 'group' && groupId) {
      if (value.includes(FILTER_CHILD_DELIMITER)) {
        const [parentId, childId] = splitChildKey(value);
        get().toggleChildFilterValue(groupId, parentId, childId);
        return {};
      }
      get().toggleParentFilterValue(groupId, value);
      return {};
    }
    return {};
  }),
  clearFilters: () => set(state => ({
    filters: {
      ...state.filters,
      groupSelections: createInitialGroupSelections(state.filterGroups),
      condition: 'all',
      onlyCoins: false,
      onSale: false,
      bundlesOnly: false,
    },
  })),
  navigateToBrowseWithFilter: (platform) => {
      const state = get();
      const selections = cloneGroupSelections(state.filters.groupSelections);
      const platformGroup = state.filterAssignments.platform;
      const genreGroup = state.filterAssignments.genre;
      if (platformGroup) {
        const group = state.filterGroups[platformGroup];
        const childKeys = getChildKeysForParent(group, platform);
        selections[platformGroup] = dedupeSelections([platform, ...childKeys]);
      }
      if (genreGroup && selections[genreGroup]) {
        selections[genreGroup] = [];
      }
      state.clearSearchQuery();
      state.setFilters({ groupSelections: selections, condition: 'all' });
      state.navigate('browse');
      window.scrollTo(0, 0);
  },
  
  addProduct: async (newProduct) => {
    let tempId: number | null = null;
    try {
      // Optimistic update
      const maxId = get().products.length > 0 ? Math.max(...get().products.map(p => p.id)) : 0;
      tempId = maxId + 1;
      const productToAdd: Product = { 
        ...newProduct, 
        id: tempId,
        filterValues: normalizeFilterValues(newProduct.filterValues, get().filterGroups),
      };
      set(state => ({ products: [...state.products, productToAdd] }));
      
      // Save to database
      const createdProduct = await createProductAPI(newProduct);
      
      // Reload all products from database to ensure consistency (especially for bundles)
      await get().fetchProducts(true);
      
      get().setToast('Product added successfully!');
    } catch (error: any) {
      logger.error('[useStore] Failed to add product:', error);
      // Rollback on error
      if (tempId !== null) {
        set(state => ({
          products: state.products.filter(p => p.id !== tempId),
        }));
      }
      get().setToast(error.message || 'Failed to add product');
      throw error;
    }
  },
  updateProduct: async (updatedProduct) => {
    try {
      // Optimistic update
      set(state => ({
        products: state.products.map(p =>
          p.id === updatedProduct.id
            ? {
                ...updatedProduct,
                filterValues: normalizeFilterValues(updatedProduct.filterValues, state.filterGroups),
              }
            : p
        ),
      }));
      
      // Save to database
      await updateProductAPI(updatedProduct.id, updatedProduct);
      
      // Reload products to ensure consistency
      await get().fetchProducts(true);
      
      get().setToast('Product updated successfully!');
    } catch (error: any) {
      logger.error('[useStore] Failed to update product:', error);
      // Reload products to rollback
      await get().fetchProducts(true);
      get().setToast(error.message || 'Failed to update product');
      throw error;
    }
  },
  deleteProduct: async (productId) => {
    try {
      // Optimistic update - remove from local state immediately
      set(state => {
        const filtered = state.products.filter(p => p.id !== productId);
        const cleaned = filtered.map(product => {
          if (!product.bundleItems) return product;
          const updatedItems = product.bundleItems.filter(id => id !== productId);
          if (updatedItems.length === product.bundleItems.length) {
            return product;
          }
          return { ...product, bundleItems: updatedItems };
        });
        return { products: cleaned };
      });
      
      // Delete from database
      await deleteProductAPI(productId);
      
      // Reload all products from database to ensure consistency
      await get().fetchProducts(true);
      
      get().setToast('Product deleted successfully!');
    } catch (error: any) {
      logger.error('[useStore] Failed to delete product:', error);
      // Reload products to rollback optimistic update
      await get().fetchProducts(true);
      get().setToast(error.message || 'Failed to delete product');
      throw error;
    }
  },
  addUserMessage: (subject, body, type = 'general') => {
    set(state => {
      const nextId = state.userMessages.length ? Math.max(...state.userMessages.map(msg => msg.id)) + 1 : 1;
      const newMessage: UserMessage = {
        id: nextId,
        subject,
        body,
        createdAt: new Date().toISOString(),
        isRead: false,
        isArchived: false,
        isDeleted: false,
        type,
      };
      return { userMessages: [newMessage, ...state.userMessages] };
    });
    get().setToast('Message created successfully!');
  },
  deleteUserMessage: async (messageId) => {
    const state = get();
    
    // Optimistic update
    set(state => ({
      userMessages: state.userMessages.map(message =>
        message.id === messageId ? { ...message, isDeleted: true } : message
      ),
    }));
    get().setToast('Message moved to Trash.');
    
    // Sync with server
    try {
      await deleteMessage(messageId);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to delete message on server:', error);
      // Rollback on error
      set(state => ({
        userMessages: state.userMessages.map(message =>
          message.id === messageId ? { ...message, isDeleted: false } : message
        ),
      }));
      get().setToast('Failed to delete message.');
    }
  },
  markMessageRead: async (messageId) => {
    const state = get();
    
    // Update local state immediately (optimistic update)
    set(state => ({
      userMessages: state.userMessages.map(message =>
        message.id === messageId ? { ...message, isRead: true } : message
      ),
    }));
    
    // Update in database
    try {
      const { markMessageAsRead } = await import('../api/messages');
      await markMessageAsRead(messageId);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to mark message as read in database:', error);
    }
  },
  deleteUserMessages: async (messageIds) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    
    const state = get();
    
    // Optimistic update
    set(state => ({
      userMessages: state.userMessages.map(message =>
        messageIds.includes(message.id) ? { ...message, isDeleted: true } : message
      ),
    }));
    get().setToast('Selected messages moved to Trash.');
    
    // Sync with server
    try {
      await deleteMessagesAPI(messageIds);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to delete messages on server:', error);
      // Rollback on error
      set(state => ({
        userMessages: state.userMessages.map(message =>
          messageIds.includes(message.id) ? { ...message, isDeleted: false } : message
        ),
      }));
      get().setToast('Failed to delete messages.');
    }
  },
  archiveUserMessages: async (messageIds) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    
    const state = get();
    
    // Optimistic update
    set(state => ({
      userMessages: state.userMessages.map(message => 
        messageIds.includes(message.id) ? { ...message, isArchived: true } : message
      ),
    }));
    get().setToast('Selected messages archived.');
    
    // Sync with server
    try {
      await archiveMessagesAPI(messageIds);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to archive messages on server:', error);
      // Rollback on error
      set(state => ({
        userMessages: state.userMessages.map(message =>
          messageIds.includes(message.id) ? { ...message, isArchived: false } : message
        ),
      }));
      get().setToast('Failed to archive messages.');
    }
  },
  unarchiveUserMessages: async (messageIds) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    
    const state = get();
    
    // Optimistic update
    set(state => ({
      userMessages: state.userMessages.map(message => 
        messageIds.includes(message.id) ? { ...message, isArchived: false } : message
      ),
    }));
    get().setToast('Selected messages moved to Inbox.');
    
    // Sync with server
    try {
      await unarchiveMessagesAPI(messageIds);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to unarchive messages on server:', error);
      // Rollback on error
      set(state => ({
        userMessages: state.userMessages.map(message =>
          messageIds.includes(message.id) ? { ...message, isArchived: true } : message
        ),
      }));
      get().setToast('Failed to unarchive messages.');
    }
  },
  restoreUserMessages: async (messageIds) => {
    if (!Array.isArray(messageIds) || messageIds.length === 0) return;
    
    const state = get();
    
    // Optimistic update
    set(state => ({
      userMessages: state.userMessages.map(message => 
        messageIds.includes(message.id) ? { ...message, isDeleted: false, isArchived: false } : message
      ),
    }));
    get().setToast('Selected messages restored to Inbox.');
    
    // Sync with server
    try {
      await restoreMessagesAPI(messageIds);
      // Reload messages from server to ensure consistency
      if (state.userEmail) {
        await get().loadMessages(state.userEmail);
      }
    } catch (error) {
      console.error('[useStore] Failed to restore messages on server:', error);
      // Rollback on error
      set(state => ({
        userMessages: state.userMessages.map(message =>
          messageIds.includes(message.id) ? { ...message, isDeleted: true } : message
        ),
      }));
      get().setToast('Failed to restore messages.');
    }
  },
  addFilterGroup: async (label) => {
    const state = get();
    const existingIds = new Set(Object.keys(state.filterGroups));
    const id = generateGroupId(label, existingIds);
    const newGroup = { id, label, items: {} };
    
    // Optimistic update
    set({
      filterGroups: {
        ...state.filterGroups,
        [id]: newGroup,
      },
      filterGroupOrder: [...state.filterGroupOrder, id],
      filters: {
        ...state.filters,
        groupSelections: {
          ...state.filters.groupSelections,
          [id]: [],
        },
      },
    });
    
    // Save to API
    try {
      const newOrder = [...state.filterGroupOrder, id];
      await saveFilterGroup({ ...newGroup, displayOrder: newOrder.length - 1 });
      // Save order to DB
      await updateFilterGroupOrder(newOrder);
    } catch (error) {
      console.error('Failed to save filter group:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to save filter group. Please try again.');
    }
  },
  renameFilterGroup: async (groupId, label) => {
    const state = get();
    const group = state.filterGroups[groupId];
    if (!group) return;
    
    const updatedGroup = { ...group, label };
    
    // Optimistic update
    set({
      filterGroups: {
        ...state.filterGroups,
        [groupId]: updatedGroup,
      },
    });
    
    // Save to API
    try {
      await updateFilterGroup(groupId, { label, items: updatedGroup.items });
    } catch (error) {
      console.error('Failed to update filter group:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to update filter group. Please try again.');
    }
  },
  deleteFilterGroup: async (groupId) => {
    const state = get();
    if (!state.filterGroups[groupId]) return;
    if (state.filterGroupOrder.length <= 1) {
      get().setToast('At least one filter group is required.');
      return;
    }
    
    const newGroups = { ...state.filterGroups };
    delete newGroups[groupId];
    const newOrder = state.filterGroupOrder.filter(id => id !== groupId);
    const newAssignments = { ...state.filterAssignments };
    (['genre', 'platform'] as const).forEach(key => {
      if (newAssignments[key] === groupId) {
        newAssignments[key] = newOrder[0] || '';
      }
    });
    const newGroupSelections = { ...state.filters.groupSelections };
    delete newGroupSelections[groupId];
    const cleanedProducts = state.products.map(product => {
      if (!product.filterValues?.[groupId]) return product;
      const nextFilterValues = { ...(product.filterValues || {}) };
      delete nextFilterValues[groupId];
      return { ...product, filterValues: nextFilterValues };
    });
    
    // Optimistic update
    set({
      filterGroups: newGroups,
      filterGroupOrder: newOrder,
      filterAssignments: newAssignments,
      filters: {
        ...state.filters,
        groupSelections: newGroupSelections,
      },
      products: cleanedProducts,
    });
    
    // Save to API
    try {
      await deleteFilterGroupAPI(groupId);
      // Update order in DB
      await updateFilterGroupOrder(newOrder);
      // Update assignments if needed
      if (Object.keys(newAssignments).length > 0) {
        await updateFilterAssignments(newAssignments);
      }
    } catch (error) {
      console.error('Failed to delete filter group:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to delete filter group. Please try again.');
    }
  },
  assignFilterGroup: async (assignment, groupId) => {
    const state = get();
    if (!state.filterGroups[groupId]) return;
    
    const newAssignments = {
      ...state.filterAssignments,
      [assignment]: groupId,
    };
    
    // Optimistic update
    set({
      filterAssignments: newAssignments,
    });
    
    // Save to DB
    try {
      await updateFilterAssignments(newAssignments);
    } catch (error) {
      console.error('Failed to save filter assignments:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to save filter assignments. Please try again.');
    }
  },
  saveFilterItem: async (groupId, oldName, newName, item, parentId) => {
    const state = get();
    const group = state.filterGroups[groupId];
    if (!group) return;
    let updatedGroup = group;
    let updatedProducts = state.products;
    let updatedSelections = state.filters.groupSelections;
    if (parentId) {
      const parent = group.items[parentId];
      if (!parent) return {};
      const updatedChildren = parent.children ? { ...parent.children } : {};
      if (oldName && oldName !== newName) {
        delete updatedChildren[oldName];
      }
      // Обеспечиваем, что сохраняем только конфигурацию дочернего элемента без children
      const childConfig: FilterConfigItem = {
        color: item.color,
        textColor: item.textColor,
        symbol: item.symbol,
        iconName: item.iconName,
        customSvg: item.customSvg,
      };
      updatedChildren[newName] = childConfig;
      updatedGroup = {
        ...group,
        items: {
          ...group.items,
          [parentId]: {
            ...parent,
            children: updatedChildren,
          },
        },
      };
      if (oldName && oldName !== newName) {
        const oldKey = buildChildKey(parentId, oldName);
        const newKey = buildChildKey(parentId, newName);
        updatedProducts = state.products.map(product => {
          const values = product.filterValues?.[groupId];
          if (!values?.includes(oldKey)) return product;
          const nextValues = values.map(value => (value === oldKey ? newKey : value));
          return {
            ...product,
            filterValues: {
              ...(product.filterValues || {}),
              [groupId]: nextValues,
            },
          };
        });
        const currentSelections = state.filters.groupSelections[groupId] || [];
        const nextSelections = currentSelections.map(value => (value === oldKey ? newKey : value));
        updatedSelections = {
          ...state.filters.groupSelections,
          [groupId]: nextSelections,
        };
      }
    } else {
      const newItems = { ...group.items };
      const existingChildren = oldName ? group.items[oldName]?.children : undefined;
      if (oldName && oldName !== newName) {
        delete newItems[oldName];
      }
      newItems[newName] = {
        ...item,
        children: existingChildren ?? item.children,
      };
      updatedGroup = { ...group, items: newItems };
      if (oldName && oldName !== newName) {
        const oldPrefix = `${oldName}${FILTER_CHILD_DELIMITER}`;
        const newPrefix = `${newName}${FILTER_CHILD_DELIMITER}`;
        if (groupId === state.filterAssignments.genre) {
          updatedProducts = state.products.map(p => {
            const genres = Array.isArray(p.genre) ? p.genre : (p.genre ? [p.genre] : []);
            if (genres.includes(oldName)) {
              return { ...p, genre: genres.map(g => g === oldName ? newName : g) };
            }
            return p;
          });
        } else if (groupId === state.filterAssignments.platform) {
          updatedProducts = state.products.map(p => p.platforms?.includes(oldName)
            ? { ...p, platforms: p.platforms?.map(plat => (plat === oldName ? newName : plat)) }
            : p
          );
        }
        updatedProducts = updatedProducts.map(product => {
          const values = product.filterValues?.[groupId];
          if (!values?.length) return product;
          const nextValues = values.map(value => {
            if (value === oldName) return newName;
            if (value.startsWith(oldPrefix)) {
              return value.replace(oldPrefix, newPrefix);
            }
            return value;
          });
          return {
            ...product,
            filterValues: {
              ...(product.filterValues || {}),
              [groupId]: nextValues,
            },
          };
        });
        const currentSelections = state.filters.groupSelections[groupId] || [];
        const nextSelections = currentSelections.map(value => {
          if (value === oldName) return newName;
          if (value.startsWith(oldPrefix)) {
            return value.replace(oldPrefix, newPrefix);
          }
          return value;
        });
        updatedSelections = {
          ...state.filters.groupSelections,
          [groupId]: nextSelections,
        };
      }
    }

    // Optimistic update
    set({
      filterGroups: {
        ...state.filterGroups,
        [groupId]: updatedGroup,
      },
      products: updatedProducts,
      filters: updatedSelections === state.filters.groupSelections
        ? state.filters
        : { ...state.filters, groupSelections: updatedSelections },
    });
    
    // Save to API
    try {
      await updateFilterGroup(groupId, { label: updatedGroup.label, items: updatedGroup.items, showIcons: updatedGroup.showIcons });
    } catch (error) {
      console.error('Failed to save filter item:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to save filter item. Please try again.');
    }
  },
  deleteFilterItem: async (groupId, name, parentId) => {
    const state = get();
    const group = state.filterGroups[groupId];
    if (!group) {
      get().setToast(`Filter group "${groupId}" not found`);
      return;
    }
    
    let updatedGroup = group;
    let hasChanges = false;
    
    if (parentId) {
      const parent = group.items[parentId];
      if (!parent) {
        get().setToast(`Parent filter "${parentId}" not found in group "${group.label}"`);
        return;
      }
      if (!parent.children?.[name]) {
        get().setToast(`Child filter "${name}" not found in parent "${parentId}"`);
        return;
      }
      hasChanges = true;
      const updatedChildren = { ...parent.children };
      delete updatedChildren[name];
      updatedGroup = {
        ...group,
        items: {
          ...group.items,
          [parentId]: {
            ...parent,
            children: Object.keys(updatedChildren).length > 0 ? updatedChildren : undefined,
          },
        },
      };
    } else if (group.items[name]) {
      hasChanges = true;
      const newItems = { ...group.items };
      delete newItems[name];
      updatedGroup = { ...group, items: newItems };
    } else {
      get().setToast(`Filter item "${name}" not found in group "${group.label}"`);
      return;
    }
    
    if (!hasChanges) {
      console.warn('No changes detected when trying to delete filter item');
      return;
    }

    const updatedProducts = state.products.map(product => {
      let nextProduct = { ...product };
      if (!parentId) {
        if (groupId === state.filterAssignments.genre) {
          const genres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
          if (genres.includes(name)) {
            nextProduct = { ...nextProduct, genre: genres.filter(g => g !== name) };
          }
        }
        if (groupId === state.filterAssignments.platform && product.platforms?.includes(name)) {
          nextProduct = {
            ...nextProduct,
            platforms: product.platforms?.filter(value => value !== name),
          };
        }
      }
      const groupValues = product.filterValues?.[groupId];
      if (!groupValues?.length) {
        return nextProduct;
      }
      const valuesToRemove = parentId
        ? [buildChildKey(parentId, name)]
        : [
            name,
            ...groupValues.filter(value => value.startsWith(`${name}${FILTER_CHILD_DELIMITER}`)),
          ];
      const remaining = groupValues.filter(value => !valuesToRemove.includes(value));
      const nextFilterValues = { ...(nextProduct.filterValues || {}) };
      if (remaining.length) {
        nextFilterValues[groupId] = remaining;
      } else {
        delete nextFilterValues[groupId];
      }
      return { ...nextProduct, filterValues: nextFilterValues };
    });

    const currentSelections = state.filters.groupSelections[groupId] || [];
    const valuesToRemoveFromFilters = parentId
      ? [buildChildKey(parentId, name)]
      : [
          name,
          ...currentSelections.filter(value => value.startsWith(`${name}${FILTER_CHILD_DELIMITER}`)),
        ];
    const nextSelections = currentSelections.filter(value => !valuesToRemoveFromFilters.includes(value));

    // Optimistic update
    set({
      filterGroups: {
        ...state.filterGroups,
        [groupId]: updatedGroup,
      },
      filters: {
        ...state.filters,
        groupSelections: {
          ...state.filters.groupSelections,
          [groupId]: nextSelections,
        },
      },
      products: updatedProducts,
    });
    
    // Save to API
    try {
      // Save updated filter group
      await updateFilterGroup(groupId, { label: updatedGroup.label, items: updatedGroup.items, showIcons: updatedGroup.showIcons });
      
      // Save updated products that were affected by the deletion
      const originalProductsMap = new Map(state.products.map(p => [p.id, p]));
      const productsToUpdate = updatedProducts.filter(product => {
        const originalProduct = originalProductsMap.get(product.id);
        if (!originalProduct) return false;
        
        // Check if genre changed
        const originalGenres = Array.isArray(originalProduct.genre) ? originalProduct.genre : (originalProduct.genre ? [originalProduct.genre] : []);
        const newGenres = Array.isArray(product.genre) ? product.genre : (product.genre ? [product.genre] : []);
        if (originalGenres.length !== newGenres.length || !originalGenres.every(g => newGenres.includes(g))) return true;
        
        // Check if platforms changed
        const originalPlatforms = originalProduct.platforms || [];
        const newPlatforms = product.platforms || [];
        if (originalPlatforms.length !== newPlatforms.length) return true;
        if (originalPlatforms.some(p => !newPlatforms.includes(p))) return true;
        
        // Check if filterValues changed
        const originalFilterValues = originalProduct.filterValues || {};
        const newFilterValues = product.filterValues || {};
        const originalGroupValues = originalFilterValues[groupId] || [];
        const newGroupValues = newFilterValues[groupId] || [];
        if (originalGroupValues.length !== newGroupValues.length) return true;
        if (originalGroupValues.some(v => !newGroupValues.includes(v))) return true;
        
        return false;
      });
      
      if (productsToUpdate.length > 0) {
        console.log(`Updating ${productsToUpdate.length} products after deleting filter item "${name}"`);
        const { updateProductAPI } = await import('../api/products');
        await Promise.all(
          productsToUpdate.map(product => updateProductAPI(product.id, product))
        );
        console.log(`Successfully updated ${productsToUpdate.length} products`);
      }
    } catch (error) {
      console.error('Failed to delete filter item:', error);
      // Rollback on error
      set(state);
      get().setToast(`Failed to delete filter item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
  reorderFilterItems: async (groupId, itemOrder, parentId) => {
    const state = get();
    const group = state.filterGroups[groupId];
    if (!group) {
      get().setToast(`Filter group "${groupId}" not found`);
      return;
    }
    
    let updatedGroup = group;
    
    if (parentId) {
      // Reorder sub-filters (children)
      const parent = group.items[parentId];
      if (!parent) {
        get().setToast(`Parent filter "${parentId}" not found`);
        return;
      }
      
      const children = parent.children || {};
      const reorderedChildren: FilterConfig = {};
      
      // Reorder children according to itemOrder
      itemOrder.forEach((childName: string) => {
        if (children[childName]) {
          reorderedChildren[childName] = children[childName];
        }
      });
      
      // Add any remaining children that weren't in the order array
      Object.keys(children).forEach(childName => {
        if (!reorderedChildren[childName]) {
          reorderedChildren[childName] = children[childName];
        }
      });
      
      updatedGroup = {
        ...group,
        items: {
          ...group.items,
          [parentId]: {
            ...parent,
            children: reorderedChildren,
          },
        },
      };
    } else {
      // Reorder main filters
      // Create a new object with keys in the specified order
      const reorderedItems: FilterConfig = {} as FilterConfig;
      
      // Reorder items according to itemOrder
      itemOrder.forEach((itemName: string) => {
        if (group.items[itemName]) {
          reorderedItems[itemName] = group.items[itemName];
        }
      });
      
      // Add any remaining items that weren't in the order array
      Object.keys(group.items).forEach(itemName => {
        if (!reorderedItems[itemName]) {
          reorderedItems[itemName] = group.items[itemName];
        }
      });
      
      updatedGroup = {
        ...group,
        items: reorderedItems,
      };
    }
    
    // Optimistic update
    set({
      filterGroups: {
        ...state.filterGroups,
        [groupId]: updatedGroup,
      },
    });
    
    // Save to API
    try {
      await updateFilterItemsOrder(groupId, itemOrder, parentId);
    } catch (error) {
      console.error('Failed to reorder filter items:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to reorder filter items. Please try again.');
    }
  },
  reorderFilterGroups: async (newOrder) => {
    const state = get();
    
    // Validate that all groups exist
    const missingGroups = newOrder.filter(id => !state.filterGroups[id]);
    if (missingGroups.length > 0) {
      get().setToast(`Some filter groups not found: ${missingGroups.join(', ')}`);
      return;
    }
    
    // Validate that all existing groups are included
    const existingGroups = Object.keys(state.filterGroups);
    const missingInOrder = existingGroups.filter(id => !newOrder.includes(id));
    if (missingInOrder.length > 0) {
      // Add missing groups to the end
      newOrder = [...newOrder, ...missingInOrder];
    }
    
    // Optimistic update
    set({
      filterGroupOrder: newOrder,
    });
    
    // Save to API
    try {
      await updateFilterGroupOrder(newOrder);
    } catch (error) {
      console.error('Failed to reorder filter groups:', error);
      // Rollback on error
      set(state);
      get().setToast('Failed to reorder filter groups. Please try again.');
    }
  },

  // Language
  setLanguage: (language: SupportedLanguage) => {
    set({ language });
    // Синхронизируем с i18next
    i18n.changeLanguage(language);
    localStorage.setItem('i18nextLng', language);
  },

  setBadgeColor: async (messageType: MessageType, color: BadgeColor) => {
    const state = get();
    
    const newBadgeColors = {
      ...state.badgeColors,
      [messageType]: color,
    };
    
    // Optimistic update
    set({ badgeColors: newBadgeColors });
    
    // Save to database
    try {
      if (state.isLoggedIn) {
        await updateUserSettings(newBadgeColors);
        get().setToast('Badge color updated!');
      }
    } catch (error) {
      console.error('[useStore] Failed to save badge colors:', error);
      // Rollback on error
      set({ badgeColors: state.badgeColors });
      get().setToast('Failed to save color settings');
    }
  },

  loadUserSettings: async () => {
    try {
      // Check if token exists
      const token = localStorage.getItem('token');
      if (!token) {
        const state = get();
        // Admin might not have a token, that's OK - skip loading settings
        if (state.userRole !== 'admin') {
          console.warn('[useStore] No authentication token found, skipping user settings load');
        }
        return;
      }
      
      const settings = await getUserSettings();
      if (settings && settings.badgeColors) {
        set({ badgeColors: settings.badgeColors });
      }
    } catch (error) {
      // Only log error if it's not a missing token (which we already handled)
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('No authentication token') && !errorMessage.includes('401')) {
        console.error('[useStore] Failed to load user settings:', error);
      } else {
        console.warn('[useStore] Failed to load user settings (authentication required):', errorMessage);
      }
      // Use defaults if loading fails
    }
  },

  // Analytics
  trackProductView: (productId) => {
    const state = get();
    const view: ProductView = {
      productId,
      timestamp: new Date().toISOString(),
      customerEmail: state.isLoggedIn ? state.userEmail : undefined,
    };
    set({ productViews: [...state.productViews, view] });
  },
  startCategoryTime: (categoryId, categoryName) => {
    set(state => {
      // Завершаем предыдущую категорию, если есть
      if (state.currentCategoryStartTime && state.currentCategoryId) {
        const timeSpent = Date.now() - state.currentCategoryStartTime;
        const prevCategoryName = state.currentCategoryId;
        const categoryTime: CategoryTime = {
          categoryId: state.currentCategoryId,
          categoryName: prevCategoryName,
          timeSpent,
          timestamp: new Date().toISOString(),
          customerEmail: state.isLoggedIn ? state.userEmail : undefined,
        };
        return {
          categoryTimes: [...state.categoryTimes, categoryTime],
          currentCategoryStartTime: Date.now(),
          currentCategoryId: categoryId,
        };
      }
      return {
        currentCategoryStartTime: Date.now(),
        currentCategoryId: categoryId,
      };
    });
  },
  endCategoryTime: () => {
    const state = get();
    if (state.currentCategoryStartTime && state.currentCategoryId) {
      const timeSpent = Date.now() - state.currentCategoryStartTime;
      const categoryName = state.currentCategoryId;
      const categoryTime: CategoryTime = {
        categoryId: state.currentCategoryId,
        categoryName,
        timeSpent,
        timestamp: new Date().toISOString(),
        customerEmail: state.isLoggedIn ? state.userEmail : undefined,
      };
      set({
        categoryTimes: [...state.categoryTimes, categoryTime],
        currentCategoryStartTime: null,
        currentCategoryId: null,
      });
    }
  },
  createOrder: async (products, total, shippingMethod, deliveryZone, tipAmount) => {
    const state = get();
    const now = new Date().toISOString();
    const customerEmail = state.isLoggedIn ? state.userEmail : 'guest@example.com';
    
    // Сначала обновляем локальное состояние (optimistic update)
    set(state => {
      const orderId = state.orders.length > 0 ? Math.max(...state.orders.map(o => o.id)) + 1 : 1;
      
      // Регистрируем клиента, если его еще нет
      let updatedCustomers = [...state.customers];
      let customer = updatedCustomers.find(c => c.email === customerEmail);
      if (!customer) {
        customer = {
          email: customerEmail,
          firstName: state.userFirstName,
          lastName: state.userLastName,
          avatar: state.userAvatar,
          name: state.userFirstName && state.userLastName 
            ? `${state.userFirstName} ${state.userLastName}` 
            : state.userFirstName || state.userLastName,
          registeredAt: now,
          totalOrders: 0,
          totalSpent: 0,
        };
        updatedCustomers.push(customer);
      }
      
      // Обновляем статистику клиента
      updatedCustomers = updatedCustomers.map(c =>
        c.email === customerEmail
          ? {
              ...c,
              totalOrders: c.totalOrders + 1,
              totalSpent: c.totalSpent + total,
              lastOrderDate: now,
            }
          : c
      );
      
      const order: Order = {
        id: orderId,
        customerEmail,
        products: [...products],
        total,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        shippingMethod,
        deliveryZone,
        tipAmount,
      };
      
      return {
        orders: [...state.orders, order],
        customers: updatedCustomers,
        // Also add products to purchase history
        purchaseHistory: [...products, ...state.purchaseHistory],
      };
    });
    
    // Затем сохраняем в базу данных
    try {
      const orderData = {
        customerEmail,
        products: products.map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          goldCoins: p.goldCoins,
        })),
        total,
        shippingMethod,
        deliveryZone,
        tipAmount,
      };
      
      await createOrderAPI(orderData);
    } catch (error) {
      console.error('[useStore] Failed to save order to database:', error);
      // Не показываем ошибку пользователю, так как локальное состояние уже обновлено
      // и это не критично для UX
    }
  },
  updateOrderStatus: (orderId, status) => {
    set(state => ({
      orders: state.orders.map(order =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString() }
          : order
      ),
    }));
  },
  registerCustomer: (email, firstName, lastName, avatar) => {
    const state = get();
    if (!state.customers.find(c => c.email === email)) {
      const customer: Customer = {
        email,
        firstName,
        lastName,
        name: firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName,
        avatar,
        registeredAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
      };
      set({ customers: [...state.customers, customer] });
    }
  },
}));

export default useStore;

