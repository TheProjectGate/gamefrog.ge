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
import { Message, ChatContext } from '../chat/types';

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

  const dialogueEngine = useMemo(
    () => new DialogueEngine(avatarConfig.dialogueRules),
    [avatarConfig.dialogueRules]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showTalkAnimation, setShowTalkAnimation] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
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

  const getAssistantReply = useCallback(
    (text: string) => {
      const context: ChatContext = {
        messages,
        timestamp: Date.now(),
        translate: t,
      };
      const reply = dialogueEngine.generateResponse(text, context);
      return reply || t('chat.notUnderstood');
    },
    [dialogueEngine, messages, t],
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
    (text: string) => {
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
              ? { ...message, content: text.slice(0, charIndex) }
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

  const handleSend = (event: React.FormEvent) => {
    event.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: inputValue.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    const replyText = getAssistantReply(userMessage.content);
    typeAssistantMessage(replyText);
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
              <div
                key={message.id}
                className={`pop-chat-bubble pop-chat-bubble--${message.role}`}
              >
                {message.content}
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
        <div className="chat-trigger-bg" aria-hidden="true" />
      </div>
    </div>
  );
};

export default ChatAssistant;

