import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../chat/avatars/base/Avatar';
import { AvatarRegistry } from '../chat/avatars/base/AvatarRegistry';
import { DialogueEngine } from '../chat/dialogues/DialogueEngine';
import { SmartDialogueEngine } from '../chat/dialogues/SmartDialogueEngine';
import { Message, ChatContext } from '../chat/types';
import useStore from '../store/useStore';
import { fetchActiveOffers } from '../api/offers';
import { saveChatMessage, getChatMessages } from '../api/chatMessages';
import ChatBubble from './ChatBubble';
import { getPersonality } from '../chat/personalities/PersonalityRegistry';
import { generateSystemPrompt } from '../chat/personalities/PersonalitySystemPromptGenerator';

const TYPEWRITER_DELAY = 65;

type ChatAssistantProps = {
  greetingTrigger?: number;
  avatarId?: string;
};

const ChatAssistant: React.FC<ChatAssistantProps> = ({
  greetingTrigger,
  avatarId = 'kratos',
}) => {
  const { t } = useTranslation();
  const avatarConfig = useMemo(() => {
    const config = AvatarRegistry.get(avatarId);
    if (!config) {
      console.warn(`Avatar ${avatarId} not found, using kratos`);
      return AvatarRegistry.get('kratos')!;
    }
    return config;
  }, [avatarId]);

  // State declarations - must be before any useEffect that uses them
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTalkAnimation, setShowTalkAnimation] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [chatBubblesSettings, setChatBubblesSettings] = useState({
    enabled: true,
    testMode: false,
    minInterval: 20,
    maxInterval: 40,
    displayDuration: 5,
    maxPerDay: 10,
  });
  const [commentsShownToday, setCommentsShownToday] = useState<number>(0);
  const [lastCommentDate, setLastCommentDate] = useState<string>('');

  // Стабилизируем значения настроек для использования в зависимостях
  // Используем дефолтные значения, чтобы избежать изменения типа в зависимостях
  const bubblesEnabled = chatBubblesSettings.enabled ?? true;
  const maxPerDay = chatBubblesSettings.maxPerDay ?? 10;

  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [userRegistrationDate, setUserRegistrationDate] = useState<string | undefined>();
  const [viewedProducts, setViewedProducts] = useState<number[]>([]);
  const [lastPurchaseCount, setLastPurchaseCount] = useState<number>(0);
  const [hasShownWelcome, setHasShownWelcome] = useState<boolean>(false);
  const [lastActionTime, setLastActionTime] = useState<number>(Date.now());

  // Получаем данные из store для контекста
  const products = useStore(state => state.products);
  const wishlist = useStore(state => state.wishlist);
  const cart = useStore(state => state.cart);
  const userEmail = useStore(state => state.userEmail);
  const userFirstName = useStore(state => state.userFirstName);
  const userLastName = useStore(state => state.userLastName);
  const userPhone = useStore(state => state.userPhone);
  const userAddress = useStore(state => state.userAddress);
  const userRole = useStore(state => state.userRole);
  const currentView = useStore(state => state.currentView);
  const selectedProduct = useStore(state => state.selectedProduct);
  const purchaseHistory = useStore(state => state.purchaseHistory);
  const language = useStore(state => state.language);
  
  const [lastView, setLastView] = useState<string>('home');

  // Функция для замены параметров
  const replaceParams = useCallback((text: string, params: Record<string, string | number> = {}): string => {
    const userName = userFirstName || 'warrior';
    let result = text
      .replace(/\{\{userName\}\}/gi, userName)
      .replace(/\{\{USERNAME\}\}/g, userName);
    
    Object.entries(params).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'gi');
      result = result.replace(regex, String(value));
    });
    
    return result;
  }, [userFirstName]);

  // Отслеживаем просмотренные продукты
  useEffect(() => {
    if (selectedProduct && !viewedProducts.includes(selectedProduct.id)) {
      setViewedProducts(prev => [...prev.slice(-9), selectedProduct.id]); // Храним последние 10
      setLastActionTime(Date.now()); // Обновляем время последнего действия
    }
  }, [selectedProduct, viewedProducts]);

  // Отслеживаем изменения страницы и обновляем время действия
  useEffect(() => {
    if (currentView && currentView !== lastView) {
      setLastView(currentView);
      setLastActionTime(Date.now());
    }
  }, [currentView, lastView]);

  // Отслеживаем новые покупки
  useEffect(() => {
    const currentPurchaseCount = purchaseHistory?.length || 0;
    
    if (currentPurchaseCount > lastPurchaseCount && lastPurchaseCount > 0) {
      // Проверяем лимит комментариев в день
      if (commentsShownToday >= maxPerDay) {
        setLastPurchaseCount(currentPurchaseCount);
        return;
      }

      // Новая покупка! Показываем комментарий через 30 секунд
      const timer = setTimeout(() => {
        if (!isOpen && bubblesEnabled && userEmail && commentsShownToday < maxPerDay) {
          const lastPurchase = purchaseHistory?.[purchaseHistory.length - 1];
          const lastProduct = lastPurchase?.products?.[0];
          if (lastProduct) {
            const userName = userFirstName || 'warrior';
            const personality = getPersonality(avatarId);
            const personalityKey = personality.id === 'kratos' ? 'kratos' : 'general';
            let comment: string;
            try {
              comment = t(`chat.bubbleComments.contextual.triggers.afterPurchase.${personalityKey}`, { 
                userName, 
                productName: lastProduct.name 
              }).replace(/\{\{userName\}\}/gi, userName).replace(/\{\{productName\}\}/gi, lastProduct.name);
            } catch (e) {
              comment = t('chat.bubbleComments.contextual.triggers.afterPurchase.general', { 
                productName: lastProduct.name 
              }).replace(/\{\{productName\}\}/gi, lastProduct.name);
            }
            setBubbleText(comment);
            setCommentsShownToday(prev => prev + 1);
          }
        }
      }, 30000); // 30 секунд после покупки
      return () => clearTimeout(timer);
    }
    setLastPurchaseCount(currentPurchaseCount);
  }, [purchaseHistory, lastPurchaseCount, isOpen, bubblesEnabled, maxPerDay, userEmail, userFirstName, commentsShownToday, avatarId, t]);

  // Загружаем активные предложения
  useEffect(() => {
    const loadOffers = async () => {
      try {
        const offers = await fetchActiveOffers();
        setActiveOffers(offers);
      } catch (error) {
        console.error('Failed to load offers:', error);
      }
    };
    loadOffers();
  }, []);

  // Загружаем дату регистрации пользователя
  useEffect(() => {
    const loadUserRegistrationDate = async () => {
      if (!userEmail) {
        setUserRegistrationDate(undefined);
        return;
      }
      try {
        const { getUserProfile } = await import('../api/users');
        const profile = await getUserProfile(userEmail);
        setUserRegistrationDate(profile.createdAt);
      } catch (error) {
        console.error('Failed to load user registration date:', error);
        setUserRegistrationDate(undefined);
      }
    };
    loadUserRegistrationDate();
  }, [userEmail]);

  // Загружаем настройки комментариев чата
  useEffect(() => {
    const loadChatBubblesSettings = async () => {
      try {
        const response = await fetch('/api/ai-chat-settings/chat-bubbles');
        if (response.ok) {
          const data = await response.json();
          setChatBubblesSettings({
            enabled: data.enabled ?? true,
            testMode: data.testMode ?? false,
            minInterval: data.minInterval ?? 20,
            maxInterval: data.maxInterval ?? 40,
            displayDuration: data.displayDuration ?? 5,
            maxPerDay: data.maxPerDay ?? 10,
          });
        }
      } catch (error) {
        console.error('Failed to load chat bubbles settings:', error);
        // Используем значения по умолчанию
      }
    };
    loadChatBubblesSettings();
  }, []);

  // Инициализация и сброс счетчика комментариев в день
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (lastCommentDate !== today) {
      setCommentsShownToday(0);
      setLastCommentDate(today);
    }
  }, [lastCommentDate]);

  // Генерируем случайные комментарии для всплывающего окна на основе стиля персонажа
  const generateBubbleComment = useCallback(() => {
    if (!userEmail) return null;

    const personality = getPersonality(avatarId);
    const comments: string[] = [];
    const userName = userFirstName || 'warrior';
    const recentPurchase = purchaseHistory && purchaseHistory.length > 0 
      ? purchaseHistory[purchaseHistory.length - 1] 
      : null;
    const recentProduct = recentPurchase?.products?.[0]?.name;
    const allPurchasedProducts = purchaseHistory 
      ? purchaseHistory.flatMap(order => order.products?.map(p => p.name) || [])
      : [];
    const randomPurchasedProduct = allPurchasedProducts.length > 0
      ? allPurchasedProducts[Math.floor(Math.random() * allPurchasedProducts.length)]
      : null;

    // Используем стиль персонажа для выбора комментариев
    const personalityKey = personality.id === 'kratos' ? 'kratos' : personality.id;
    const commentBaseKey = `chat.bubbleComments.${personalityKey}`;

    // Приветствия с именем
    if (userFirstName) {
      try {
        comments.push(t(`${commentBaseKey}.greetings.withName1`, { userName }));
        comments.push(t(`${commentBaseKey}.greetings.withName2`, { userName }));
        comments.push(t(`${commentBaseKey}.greetings.withName3`, { userName }));
      } catch (e) {
        // Fallback на other если переводы для этого персонажа не найдены
        comments.push(t('chat.bubbleComments.other.greetings.withName1', { userName }));
        comments.push(t('chat.bubbleComments.other.greetings.withName2', { userName }));
        comments.push(t('chat.bubbleComments.other.greetings.withName3', { userName }));
      }
    }

    // Вопросы о покупках
    if (recentProduct) {
      try {
        comments.push(t(`${commentBaseKey}.purchases.recent1`, { userName, productName: recentProduct }));
        comments.push(t(`${commentBaseKey}.purchases.recent2`, { userName, productName: recentProduct }));
        comments.push(t(`${commentBaseKey}.purchases.recent3`, { userName, productName: recentProduct }));
      } catch (e) {
        comments.push(t('chat.bubbleComments.other.purchases.recent1', { productName: recentProduct }));
        comments.push(t('chat.bubbleComments.other.purchases.recent2', { productName: recentProduct }));
        comments.push(t('chat.bubbleComments.other.purchases.recent3', { userName, productName: recentProduct }));
      }
    } else if (randomPurchasedProduct) {
      try {
        comments.push(t(`${commentBaseKey}.purchases.random1`, { productName: randomPurchasedProduct }));
        comments.push(t(`${commentBaseKey}.purchases.random2`, { productName: randomPurchasedProduct }));
      } catch (e) {
        // Fallback
      }
    }

    // Общие комментарии
    try {
      const generalComments = t(`${commentBaseKey}.general`, { returnObjects: true }) as string[];
      if (Array.isArray(generalComments)) {
        generalComments.forEach(comment => {
          const replacedComment = comment.replace(/\{\{userName\}\}/g, userName);
          comments.push(replacedComment);
        });
      }
    } catch (e) {
      // Fallback на other
      const generalComments = t('chat.bubbleComments.other.general', { returnObjects: true }) as string[];
      if (Array.isArray(generalComments)) {
        generalComments.forEach(comment => {
          const replacedComment = comment.replace(/\{\{userName\}\}/g, userName);
          comments.push(replacedComment);
        });
      }
    }

    return comments.length > 0 
      ? comments[Math.floor(Math.random() * comments.length)]
      : null;
  }, [userEmail, userFirstName, purchaseHistory, avatarId, t]);

  // ТРИГГЕР 1: Приветствие при входе на сайт
  useEffect(() => {
    
    if (!bubblesEnabled || isOpen || !userEmail || hasShownWelcome) {
      return;
    }

    // Проверяем лимит комментариев в день
    if (commentsShownToday >= maxPerDay) {
      return;
    }

    // Показываем приветствие через 2 секунды после входа
    const welcomeTimer = setTimeout(() => {
      if (!isOpen && bubblesEnabled && userEmail && commentsShownToday < maxPerDay) {
        const userName = userFirstName || 'warrior';
        let comment: string;
        
        const personality = getPersonality(avatarId);
        const personalityKey = personality.id === 'kratos' ? 'kratos' : personality.id;
        
        try {
          if (userFirstName) {
            comment = t(`chat.bubbleComments.contextual.triggers.welcome.${personalityKey}WithName`, { userName });
          } else {
            comment = t(`chat.bubbleComments.contextual.triggers.welcome.${personalityKey}WithoutName`);
          }
        } catch (e) {
          // Fallback
          if (userFirstName) {
            comment = t('chat.bubbleComments.contextual.triggers.welcome.withName', { userName });
          } else {
            comment = t('chat.bubbleComments.contextual.triggers.welcome.withoutName');
          }
        }
        
        setBubbleText(replaceParams(comment));
        setHasShownWelcome(true);
        setCommentsShownToday(prev => prev + 1);
      }
    }, 2000);

    return () => clearTimeout(welcomeTimer);
  }, [userEmail, hasShownWelcome, isOpen, bubblesEnabled, maxPerDay, commentsShownToday, userFirstName, avatarId, t, replaceParams]);

  // ТРИГГЕР 2: Долгий поиск без результата (45-60 секунд без действий)
  useEffect(() => {
    if (!bubblesEnabled || isOpen || !userEmail) {
      return;
    }

    // Проверяем лимит комментариев в день
    if (commentsShownToday >= maxPerDay) {
      return;
    }

    const checkLongSearch = () => {
      const timeSinceLastAction = Date.now() - lastActionTime;
      const longSearchThreshold = 45000; // 45 секунд
      
      if (timeSinceLastAction >= longSearchThreshold && !bubbleText && commentsShownToday < maxPerDay) {
        const personality = getPersonality(avatarId);
        const personalityKey = personality.id === 'kratos' ? 'kratos' : 'general';
        let comment: string;
        try {
          comment = t(`chat.bubbleComments.contextual.triggers.longSearch.${personalityKey}`);
        } catch (e) {
          comment = t('chat.bubbleComments.contextual.triggers.longSearch.general');
        }
        setBubbleText(comment);
        setCommentsShownToday(prev => prev + 1);
      }
    };

    const interval = setInterval(checkLongSearch, 5000); // Проверяем каждые 5 секунд

    return () => clearInterval(interval);
  }, [lastActionTime, isOpen, bubblesEnabled, maxPerDay, userEmail, bubbleText, commentsShownToday, avatarId, t]);

  // ТРИГГЕР 3: Комментарий при просмотре продукта (только один раз на продукт)
  useEffect(() => {
    if (!bubblesEnabled || isOpen || !userEmail || !selectedProduct) {
      return;
    }

    // Проверяем лимит комментариев в день
    if (commentsShownToday >= maxPerDay) {
      return;
    }

    // Показываем комментарий через 3 секунды после открытия продукта
    const productTimer = setTimeout(() => {
      if (!isOpen && bubblesEnabled && userEmail && selectedProduct && commentsShownToday < maxPerDay) {
        const product = selectedProduct;
        const isInWishlist = wishlist.includes(product.id);
        const hasDiscount = product.discountPercent && product.discountPercent > 0;
        const discount = product.discountPercent || 0;
        
        let comment: string;
        
        if (hasDiscount && !isInWishlist) {
          comment = replaceParams(
            t('chat.bubbleComments.contextual.viewingProduct.withDiscount', { productName: product.name, discount }),
            { productName: product.name, discount }
          );
        } else if (!isInWishlist) {
          comment = replaceParams(
            t('chat.bubbleComments.contextual.viewingProduct.noDiscount', { productName: product.name }),
            { productName: product.name }
          );
        } else {
          comment = replaceParams(
            t('chat.bubbleComments.contextual.viewingProduct.inWishlist', { productName: product.name }),
            { productName: product.name }
          );
        }
        
        setBubbleText(comment);
        setCommentsShownToday(prev => prev + 1);
      }
    }, 3000);

    return () => clearTimeout(productTimer);
  }, [selectedProduct, isOpen, bubblesEnabled, maxPerDay, userEmail, wishlist, commentsShownToday, t, replaceParams]);

  // Очищаем комментарий при закрытии чата или изменении страницы
  useEffect(() => {
    if (isOpen) {
      setBubbleText(null);
    }
  }, [isOpen]);

  // Старый код с автоматическим переключением - УДАЛЕН
  // Теперь комментарии показываются только по триггерам

  // Загружаем историю переписки при открытии чата (только за сегодня)
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!isOpen || !userEmail) return;
      
      setIsLoadingHistory(true);
      try {
        // Загружаем сообщения только за сегодня
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        const history = await getChatMessages(todayStr, undefined, 100);
        
        // Преобразуем в формат Message
        const historyMessages: Message[] = history.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime(),
          pendingActions: msg.pending_actions,
        }));
        
        setMessages(historyMessages);
      } catch (error) {
        console.error('Failed to load chat history:', error);
        // Не показываем ошибку пользователю, просто продолжаем с пустой историей
      } finally {
        setIsLoadingHistory(false);
      }
    };
    
    loadChatHistory();
  }, [isOpen, userEmail]);

  // Функция для извлечения метаданных из сообщения
  const extractMetadata = useCallback((content: string, pendingActions?: PendingAction[]) => {
    const metadata: {
      productMentions?: string[];
      userInfoMentions?: string[];
      actions?: string[];
    } = {};

    // Извлекаем упоминания продуктов
    const productMentions: string[] = [];
    products.forEach(product => {
      if (content.toLowerCase().includes(product.name.toLowerCase())) {
        productMentions.push(product.name);
      }
    });
    if (productMentions.length > 0) {
      metadata.productMentions = productMentions;
    }

    // Извлекаем упоминания личной информации
    const userInfoMentions: string[] = [];
    if (userFirstName && content.toLowerCase().includes(userFirstName.toLowerCase())) {
      userInfoMentions.push('first_name');
    }
    if (userLastName && content.toLowerCase().includes(userLastName.toLowerCase())) {
      userInfoMentions.push('last_name');
    }
    if (userPhone && content.includes(userPhone)) {
      userInfoMentions.push('phone');
    }
    if (userAddress && content.toLowerCase().includes(userAddress.toLowerCase())) {
      userInfoMentions.push('address');
    }
    if (userEmail && content.toLowerCase().includes(userEmail.toLowerCase())) {
      userInfoMentions.push('email');
    }
    if (userInfoMentions.length > 0) {
      metadata.userInfoMentions = userInfoMentions;
    }

    // Извлекаем действия
    const actions: string[] = [];
    if (pendingActions && pendingActions.length > 0) {
      pendingActions.forEach(action => {
        actions.push(`${action.type}:${action.productId}`);
      });
    }
    // Также ищем упоминания действий в тексте
    if (content.toLowerCase().includes('add to cart') || content.toLowerCase().includes('добавить в корзину')) {
      actions.push('ADD_TO_CART_MENTIONED');
    }
    if (content.toLowerCase().includes('add to wishlist') || content.toLowerCase().includes('добавить в вишлист')) {
      actions.push('ADD_TO_WISHLIST_MENTIONED');
    }
    if (actions.length > 0) {
      metadata.actions = actions;
    }

    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }, [products, userFirstName, userLastName, userPhone, userAddress, userEmail]);

  // Используем SmartDialogueEngine если AI включен, иначе обычный
  const useAI = avatarConfig.aiConfig?.enabled ?? true;
  const dialogueEngine = useMemo(() => {
    if (useAI) {
      return new SmartDialogueEngine(avatarConfig.dialogueRules, {
        geminiEnabled: true,
        fallbackToRules: true,
      });
    }
    return new DialogueEngine(avatarConfig.dialogueRules);
  }, [avatarConfig.dialogueRules, useAI]);
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef(false);
  const [triggerPosition, setTriggerPosition] = useState({ bottom: 72, left: 16 });
  const [isMobile, setIsMobile] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<number | null>(null);
  const talkCooldownRef = useRef<number | null>(null);
  const messageIdRef = useRef(0);
  const greetingHandledRef = useRef<number>(0);

  const generateMessageId = useCallback(() => {
    messageIdRef.current += 1;
    return Date.now() + messageIdRef.current;
  }, []);

  // Получаем функции для действий из store
  const addToCart = useStore(state => state.addToCart);
  const toggleWishlist = useStore(state => state.toggleWishlist);
  const openProductModal = useStore(state => state.openProductModal);

  // Функция для парсинга действий из ответа AI
  const parseActionsFromResponse = useCallback((response: string): Array<{ type: string; productId: number }> => {
    const actions: Array<{ type: string; productId: number }> = [];
    if (!response) return actions;
    
    // Формат: [ACTION:ADD_TO_CART:123] или [_ACTION:ADD_TO_CART:123] или [ACTION:ADD_TO_WISHLIST:456]
    // Также поддерживаем варианты с пробелами: [ACTION: ADD_TO_CART : 123]
    // Поддерживаем подчеркивание в начале: [_ACTION:...] или [ACTION:...]
    const actionRegex = /\[_?ACTION\s*:\s*(\w+)\s*:\s*(\d+)\]/gi;
    let match;
    
    while ((match = actionRegex.exec(response)) !== null) {
      const [, type, productIdStr] = match;
      const productId = parseInt(productIdStr, 10);
      if (!isNaN(productId) && productId > 0) {
        const normalizedType = type.toUpperCase().trim();
        if (normalizedType === 'ADD_TO_CART' || normalizedType === 'ADD_TO_WISHLIST') {
          actions.push({ type: normalizedType, productId });
          console.log(`[ChatAssistant] Found action: ${normalizedType} for product ${productId}`);
        } else {
          console.warn(`[ChatAssistant] Unknown action type: ${normalizedType}`);
        }
      } else {
        console.warn(`[ChatAssistant] Invalid product ID: ${productIdStr}`);
      }
    }
    
    if (actions.length === 0 && response.includes('ACTION')) {
      console.warn('[ChatAssistant] Response contains "ACTION" but no valid actions were parsed:', response);
    }
    
    return actions;
  }, []);

  // Функция для удаления маркеров действий из текста
  const removeActionMarkers = useCallback((text: string): string => {
    // Удаляем оба формата: [ACTION:...] и [_ACTION:...]
    return text.replace(/\[_?ACTION:\w+:\d+\]/g, '').trim();
  }, []);

  // Функция для выполнения действий
  const executeActions = useCallback((actions: Array<{ type: string; productId: number }>) => {
    console.log('[ChatAssistant] Executing actions:', actions);
    actions.forEach(action => {
      const product = products.find(p => p.id === action.productId);
      if (!product) {
        console.warn(`[ChatAssistant] Product ${action.productId} not found in products list`);
        console.log('[ChatAssistant] Available product IDs:', products.map(p => p.id));
        return;
      }

      try {
        switch (action.type) {
          case 'ADD_TO_CART':
            console.log(`[ChatAssistant] Adding product ${product.id} (${product.name}) to cart`);
            addToCart(product);
            break;
          case 'ADD_TO_WISHLIST':
            console.log(`[ChatAssistant] Adding product ${product.id} (${product.name}) to wishlist`);
            toggleWishlist(product.id);
            break;
          default:
            console.warn(`[ChatAssistant] Unknown action type: ${action.type}`);
        }
      } catch (error) {
        console.error(`[ChatAssistant] Error executing action ${action.type} for product ${action.productId}:`, error);
      }
    });
  }, [products, addToCart, toggleWishlist]);

  const getAssistantReply = useCallback(
    async (text: string): Promise<{ reply: string; actions?: Array<{ type: string; productId: number }>; pendingActions?: Array<{ type: 'ADD_TO_CART' | 'ADD_TO_WISHLIST'; productId: number; productName?: string }> }> => {
      // Подготавливаем данные о ВСЕХ продуктах (не только со скидками)
      const allProducts = (products || [])
        .slice(0, 100) // Ограничиваем до 100 продуктов для контекста
        .map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          description: p.description,
          discountPercent: p.discountPercent,
          tags: p.tags || [],
          genre: Array.isArray(p.genre) ? p.genre : p.genre ? [p.genre] : [],
          platforms: p.platforms || [],
          stock: p.stock,
          condition: p.condition,
          coinExclusive: p.coinExclusive,
          coinPrice: p.coinPrice,
        }));

      // Извлекаем уже заданные вопросы из истории сообщений
      const previousQuestions = messages
        .filter(msg => msg.role === 'assistant')
        .map(msg => msg.content)
        .slice(-20); // Последние 20 ответов ассистента

      const context: ChatContext = {
        messages,
        userRole: userRole || undefined,
        currentView: currentView || undefined,
        timestamp: Date.now(),
        translate: t,
        language: language || 'en', // Язык интерфейса для AI
        avatarSystemPrompt: generateSystemPrompt(avatarId), // System prompt на основе стиля персонажа
        // Расширенный контекст для ИИ - ВСЯ информация о пользователе
        userEmail: userEmail || undefined,
        userFirstName: userFirstName || undefined,
        userLastName: userLastName || undefined,
        userPhone: userPhone || undefined,
        userAddress: userAddress || undefined,
        userAvatar: useStore.getState().userAvatar || undefined,
        userRegistrationDate: userRegistrationDate || undefined,
        purchaseHistory: (purchaseHistory || []).slice(-20).map(order => ({
          id: order.id,
          total: order.total,
          createdAt: order.createdAt,
          products: (order.products || []).map(p => ({
            name: p.name,
            price: p.price,
          })),
        })),
        previousQuestions: previousQuestions.length > 0 ? previousQuestions : undefined,
        products: allProducts, // Теперь передаем все продукты
        activeOffers: (activeOffers || []).map(offer => ({
          id: offer.id,
          discountPercent: offer.discountPercent,
          endsAt: offer.endsAt,
          productIds: offer.productIds,
        })),
        wishlist: wishlist.length > 0 ? wishlist : undefined,
      };

      // Если используется SmartDialogueEngine, вызываем асинхронный метод
      if (dialogueEngine instanceof SmartDialogueEngine) {
        try {
          const result = await dialogueEngine.generateSmartResponse(text, context);
          
          console.log('[ChatAssistant] Raw AI response:', result);
          
          // Парсим предложенные действия из ответа (но не выполняем их автоматически)
          const suggestedActions = parseActionsFromResponse(result);
          console.log('[ChatAssistant] Parsed suggested actions:', suggestedActions);
          
          // Удаляем маркеры действий из текста ответа
          const cleanReply = removeActionMarkers(result);
          console.log('[ChatAssistant] Clean reply:', cleanReply);
          
          // Преобразуем действия в pendingActions для отображения кнопок
          const pendingActions = suggestedActions.map(action => ({
            type: action.type as 'ADD_TO_CART' | 'ADD_TO_WISHLIST',
            productId: action.productId,
            productName: products.find(p => p.id === action.productId)?.name,
          }));
          
          return { reply: cleanReply || t('chat.notUnderstood'), actions: undefined, pendingActions };
        } catch (error) {
          console.error('[ChatAssistant] Error generating smart response:', error);
          // Fallback к обычному движку
          const fallbackReply = dialogueEngine.generateResponse(text, context);
          return { reply: fallbackReply || t('chat.notUnderstood') };
        }
      }

      // Обычный движок
      const reply = dialogueEngine.generateResponse(text, context);
      return { reply: reply || t('chat.notUnderstood'), pendingActions: undefined };
    },
    [
      dialogueEngine,
      messages,
      t,
      products,
      wishlist,
      userEmail,
      userFirstName,
      userLastName,
      userPhone,
      userAddress,
      userRole,
      currentView,
      purchaseHistory,
      activeOffers,
      userRegistrationDate,
      addToCart,
      toggleWishlist,
      openProductModal,
      parseActionsFromResponse,
      removeActionMarkers,
      extractMetadata,
    ],
  );

  useEffect(() => {
    const container = messagesEndRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, isTyping, isOpen]);

  const stopTalkingAnimation = useCallback(() => {
    if (talkCooldownRef.current) {
      window.clearTimeout(talkCooldownRef.current);
    }
    talkCooldownRef.current = window.setTimeout(() => {
      setShowTalkAnimation(false);
      talkCooldownRef.current = null;
    }, 600);
  }, []);

  const typeAssistantMessage = useCallback(
    (text: string, pendingActions?: Array<{ type: 'ADD_TO_CART' | 'ADD_TO_WISHLIST'; productId: number; productName?: string }>) => {
      if (!text) return;

      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }

      const assistantMessageId = generateMessageId();
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          pendingActions: pendingActions,
        },
      ]);

      setIsTyping(true);
      setShowTalkAnimation(true);

      let charIndex = 0;
      typingIntervalRef.current = window.setInterval(() => {
        charIndex += 1;
        setMessages(prev =>
          prev.map(message =>
            message.id === assistantMessageId
              ? { ...message, content: text.slice(0, charIndex), pendingActions: charIndex >= text.length ? pendingActions : undefined }
              : message,
          ),
        );

        if (charIndex >= text.length) {
          if (typingIntervalRef.current) {
            window.clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
          }
          setIsTyping(false);
          stopTalkingAnimation();
        }
      }, TYPEWRITER_DELAY);
    },
    [generateMessageId, stopTalkingAnimation],
  );

  const resolveGreeting = useCallback(() => {
    if (typeof avatarConfig.greeting === 'function') {
      return avatarConfig.greeting();
    }
    if (typeof avatarConfig.greeting === 'string') {
      if (avatarConfig.greeting.startsWith('chat.')) {
        return t(avatarConfig.greeting);
      }
      return avatarConfig.greeting;
    }
    return t('chat.greeting');
  }, [avatarConfig.greeting, t]);

  useEffect(() => {
    if (!greetingTrigger) return;
    if (greetingHandledRef.current === greetingTrigger) return;
    greetingHandledRef.current = greetingTrigger;
    setIsOpen(true);
    const greeting = resolveGreeting();
    typeAssistantMessage(greeting);
  }, [greetingTrigger, typeAssistantMessage, resolveGreeting]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const userMessageContent = inputValue.trim();
    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: userMessageContent,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    
    // Сохраняем сообщение пользователя в БД
    if (userEmail) {
      const userMetadata = extractMetadata(userMessageContent);
      saveChatMessage('user', userMessageContent, undefined, userMetadata).catch(err => {
        console.error('[ChatAssistant] Failed to save user message:', err);
      });
    }
    
    try {
      const result = await getAssistantReply(userMessageContent);
      // Передаем pendingActions для отображения кнопок подтверждения
      typeAssistantMessage(result.reply, result.pendingActions);
      
      // Сохраняем ответ ассистента в БД
      if (userEmail) {
        const assistantMetadata = extractMetadata(result.reply, result.pendingActions);
        saveChatMessage('assistant', result.reply, result.pendingActions, assistantMetadata).catch(err => {
          console.error('[ChatAssistant] Failed to save assistant message:', err);
        });
      }
      
      // НЕ выполняем действия автоматически - ждем подтверждения пользователя через кнопки
    } catch (error: any) {
      console.error('[ChatAssistant] Error getting reply:', error);
      
      // Проверяем, является ли это ошибкой квоты
      const isQuotaError = error?.message?.toLowerCase().includes('quota') || 
                          error?.message?.toLowerCase().includes('rate limit') ||
                          error?.message?.toLowerCase().includes('429') ||
                          error?.status === 429 ||
                          error?.response?.status === 429;
      
      if (isQuotaError) {
        // Логируем ошибку квоты в админку (без показа пользователю)
        try {
          await fetch('/api/ai-quota-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              error: error.message || 'AI quota exceeded',
              timestamp: new Date().toISOString(),
              userEmail: userEmail || null,
            }),
          }).catch(() => {}); // Игнорируем ошибки логирования
        } catch (logError) {
          console.error('[ChatAssistant] Failed to log quota error:', logError);
        }
        
        // Показываем обычное сообщение пользователю без упоминания ошибки
        const errorMessage = t('chat.notUnderstood');
        typeAssistantMessage(errorMessage);
      } else {
        // Для других ошибок показываем обычное сообщение
        const errorMessage = t('chat.notUnderstood');
        typeAssistantMessage(errorMessage);
      }
      
      // Сохраняем сообщение об ошибке
      if (userEmail) {
        saveChatMessage('assistant', t('chat.notUnderstood'), undefined, { actions: ['ERROR'] }).catch(err => {
          console.error('[ChatAssistant] Failed to save error message:', err);
        });
      }
    } finally {
      setIsTyping(false);
    }
  };

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        window.clearInterval(typingIntervalRef.current);
      }
      if (talkCooldownRef.current) {
        window.clearTimeout(talkCooldownRef.current);
      }
    };
  }, []);

  // Prevent focus on hidden elements - blur any focused element when panel closes
  useEffect(() => {
    if (!isOpen && chatPanelRef.current) {
      const activeElement = document.activeElement;
      if (activeElement && chatPanelRef.current.contains(activeElement)) {
        (activeElement as HTMLElement).blur();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const wrapper = triggerWrapperRef.current;
    if (!wrapper) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
      hasDraggedRef.current = false;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragStartRef.current) return;
      const touch = event.touches[0];
      const deltaX = dragStartRef.current.x - touch.clientX;
      const deltaY = dragStartRef.current.y - touch.clientY;

      if (!hasDraggedRef.current) {
        const threshold = 5;
        if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) {
          return;
        }
        hasDraggedRef.current = true;
      }

      event.preventDefault();

      setTriggerPosition(prev => {
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const safeBottom = Math.max(8, Math.min(viewportHeight - 80, prev.bottom + deltaY));
        const safeLeft = Math.max(8, Math.min(viewportWidth - 80, prev.left - deltaX));
        return { bottom: safeBottom, left: safeLeft };
      });

      dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (hasDraggedRef.current) {
        event.preventDefault();
      }
      dragStartRef.current = null;
      hasDraggedRef.current = false;
    };

    wrapper.addEventListener('touchstart', handleTouchStart, { passive: false });
    wrapper.addEventListener('touchmove', handleTouchMove, { passive: false });
    wrapper.addEventListener('touchend', handleTouchEnd);
    wrapper.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      wrapper.removeEventListener('touchstart', handleTouchStart);
      wrapper.removeEventListener('touchmove', handleTouchMove);
      wrapper.removeEventListener('touchend', handleTouchEnd);
      wrapper.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isMobile]);

  return (
    <div className="chat-assistant-container fixed bottom-24 right-6 z-50">
      <div
        ref={chatPanelRef}
        id="gamefrog-chat"
        className={`chat-panel ${isOpen ? 'chat-panel--open' : ''}`}
        aria-hidden={!isOpen}
        style={{
          pointerEvents: isOpen ? 'auto' : 'none',
          visibility: isOpen ? 'visible' : 'hidden',
          backgroundImage: avatarConfig.backgroundImage
            ? `url(${avatarConfig.backgroundImage})`
            : undefined,
        }}
      >
        <div className="pop-chat-frame">
          <header className="pop-chat-header">
            <div>
              <p className="pop-chat-eyebrow">{avatarConfig.displayName} {t('chat.online')}</p>
            </div>
            <button
              type="button"
              className="pop-chat-close"
              onClick={() => setIsOpen(false)}
              aria-label={t('chat.hideChat')}
              tabIndex={isOpen ? 0 : -1}
              aria-disabled={!isOpen}
            >
              ×
            </button>
          </header>
          <div
            ref={messagesEndRef}
            className="pop-chat-feed no-scrollbar"
            aria-live="polite"
          >
            {messages.map(message => (
              <div key={message.id}>
                <div
                  className={`pop-chat-bubble pop-chat-bubble--${message.role}`}
                >
                  {message.content}
                </div>
                {message.role === 'assistant' && message.pendingActions && message.pendingActions.length > 0 && (
                  <div className="mt-2 ml-0 flex flex-wrap gap-2">
                    {message.pendingActions.map((action, index) => {
                      const product = products.find(p => p.id === action.productId);
                      if (!product) return null;
                      
                      const actionText = action.type === 'ADD_TO_CART' 
                        ? t('chat.addToCart') || 'Add to Cart'
                        : t('chat.addToWishlist') || 'Add to Wishlist';
                      const productName = action.productName || product.name;
                      
                      return (
                        <button
                          key={`${message.id}-${action.productId}-${index}`}
                          onClick={() => {
                            if (action.type === 'ADD_TO_CART') {
                              addToCart(product);
                            } else {
                              toggleWishlist(product.id);
                            }
                            // Удаляем pending action после выполнения
                            setMessages(prev =>
                              prev.map(msg =>
                                msg.id === message.id
                                  ? { ...msg, pendingActions: msg.pendingActions?.filter(a => a !== action) }
                                  : msg
                              )
                            );
                          }}
                          className="px-3 py-1.5 text-xs sm:text-sm font-bold border-2 border-black bg-[#FFD700] hover:bg-black hover:text-[#FFD700] transition-colors btn-pop rounded"
                          title={`${actionText}: ${productName}`}
                        >
                          {actionText}: {productName.length > 20 ? productName.substring(0, 20) + '...' : productName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form className="pop-chat-form" onSubmit={handleSend}>
            <input
              type="text"
              value={inputValue}
              onChange={event => setInputValue(event.target.value)}
              placeholder={t('chat.askAboutSales')}
              tabIndex={isOpen ? 0 : -1}
              aria-disabled={!isOpen}
            />
            <button 
              type="submit"
              tabIndex={isOpen ? 0 : -1}
              aria-disabled={!isOpen}
            >
              {t('chat.send')}
            </button>
          </form>
        </div>
      </div>
      <div
        ref={triggerWrapperRef}
        className={`chat-trigger-wrapper chat-trigger-wrapper--absolute ${isMobile ? 'touch-none' : ''}`}
        style={
          isMobile
            ? {
                position: 'fixed',
                bottom: triggerPosition.bottom,
                left: triggerPosition.left,
              }
            : undefined
        }
      >
        <div className="relative">
          {/* Всплывающий комментарий */}
          {bubbleText && !isOpen && (
            <ChatBubble
              text={bubbleText}
              onClose={() => setBubbleText(null)}
              duration={5000}
            />
          )}
          
          <button
            type="button"
            className={`chat-avatar-trigger ${
              isOpen ? 'chat-avatar-trigger--active' : ''
            }`}
            onClick={() => setIsOpen(prev => !prev)}
            aria-expanded={isOpen}
            aria-controls="gamefrog-chat"
            aria-label={isOpen ? t('chat.collapseChat') : t('chat.openChat')}
          >
            <div className="chat-avatar-shell">
              <Avatar
                config={avatarConfig}
                talking={showTalkAnimation}
              />
            </div>
          </button>
        </div>
        <div className="chat-trigger-bg" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ChatAssistant;

