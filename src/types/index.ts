export type ProductFilterValues = Record<string, string[]>;

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  genre: string[]; // Массив жанров
  condition: 'new' | 'used';
  stock: number;
  tags?: string[];
  platforms?: string[];
  goldCoins?: number; // Количество золотых монет, начисляемых при покупке
  coinExclusive?: boolean; // Продаётся только за монеты
  coinPrice?: number; // Стоимость в монетах, если продукт продаётся за монеты
  bundleItems?: number[]; // Продукты, входящие в набор (минимум два)
  filterValues?: ProductFilterValues; // Дополнительные значения для динамических групп фильтров
  youtubeVideoId?: string; // YouTube video ID для отображения видео вместо изображения
  // Analytics
  wishlistCount?: number; // Кол-во добавлений в вишлист (агрегированное/локальное)
  // Discounts
  discountPercent?: number; // Текущая скидка в %, если есть
}

export interface FilterConfigItem {
  color: string;
  textColor: string;
  symbol: string;
  iconName?: string; // Lucide icon component name (e.g., "Gamepad2")
  customSvg?: string; // Custom SVG icon data (base64 or SVG string)
  children?: FilterConfig;
}
export type FilterConfig = { [key: string]: FilterConfigItem };
export interface FilterGroup {
  id: string;
  label: string;
  items: FilterConfig;
}

export type View = 'home' | 'browse' | 'cart' | 'wishlist' | 'admin' | 'sale' | 'payment-status' | 'payment-sim';
export type UserRole = 'admin' | null;
export type PaymentMethod = 'unipay' | 'googlepay';

export type MessageType = 'order' | 'wishlist' | 'general';

export interface UserMessage {
  id: number;
  subject: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  type?: MessageType; // 'order' for receipts, 'wishlist' for favorites, 'general' for other
}

// Badge color palette
export type BadgeColor = 
  | 'red' 
  | 'green' 
  | 'blue' 
  | 'yellow' 
  | 'purple' 
  | 'pink' 
  | 'orange' 
  | 'cyan';

export interface BadgeColorConfig {
  order: BadgeColor;
  wishlist: BadgeColor;
  general: BadgeColor;
}

// Analytics Types
export type OrderStatus = 'pending' | 'delivered' | 'cancelled';

export interface Order {
  id: number;
  customerEmail: string;
  products: Product[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  shippingMethod?: 'delivery' | 'pickup';
  deliveryZone?: 'city' | 'region';
  tipAmount?: number;
}

export interface Customer {
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string; // Для обратной совместимости (полное имя)
  avatar?: number; // Индекс аватарки (0-9)
  registeredAt: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
}

export interface ProductView {
  productId: number;
  timestamp: string;
  customerEmail?: string;
}

export interface CategoryTime {
  categoryId: string; // genre или platform
  categoryName: string;
  timeSpent: number; // в миллисекундах
  timestamp: string;
  customerEmail?: string;
}

export interface CheckoutSummaryItem {
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl: string;
  goldCoins?: number;
}

export interface CheckoutSummary {
  orderId: string;
  currency: string;
  subtotal: number;
  tip: number;
  deliveryFee: number;
  total: number;
  email: string;
  shippingMethod: 'delivery' | 'pickup' | null;
  deliveryZone: 'city' | 'region' | null;
  items: CheckoutSummaryItem[];
  isSimulated: boolean;
  createdAt: string;
  paymentMethod: PaymentMethod;
}
