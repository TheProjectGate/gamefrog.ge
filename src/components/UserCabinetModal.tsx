import React, { useState, useEffect } from 'react';
import { Product, View, UserRole, UserMessage } from '../types';
import { CloseIcon, ChevronLeftIcon, CogIcon, ReceiptIcon, CoinIcon, MailIcon, TrashIcon, ArchiveIcon } from './Icons';
import useStore from '../store/useStore';
import { AVATARS, getAvatar } from '../utils/avatars';
import { CardBrand, cardBrandColors, cardBrandLabels, detectCardBrand, formatCardNumber, formatExpiry, normalizeCardNumber, sanitizeExpiry } from '../utils/cardUtils';
import { GEORGIAN_CITIES } from '../data/georgianCities';

interface UserCabinetModalProps {
  userEmail: string;
  userRole: UserRole;
  userGoldCoins: number;
  userMessages: UserMessage[];
  userFirstName?: string;
  userLastName?: string;
  userAvatar?: number;
  onClose: () => void;
  onLogout: () => void;
  purchaseHistory: Product[];
  onNavigate: (view: View) => void;
  onOpenMessage: (messageId: number) => void;
}

const MastercardLogo: React.FC<{ size?: 'sm' | 'md'; className?: string }> = ({ size = 'md', className = '' }) => {
  const circleSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  const containerSize = size === 'sm' ? 'w-6 h-4' : 'w-8 h-5';
  const overlapOffset = size === 'sm' ? 'left-0' : 'left-1';
  const overlapOffsetRight = size === 'sm' ? 'right-0' : 'right-1';

  return (
    <span className={`relative inline-flex items-center justify-center ${containerSize} ${className}`} aria-label="Mastercard">
      <span className={`absolute ${overlapOffset} rounded-full bg-[#EB001B] ${circleSize} opacity-90`} />
      <span className={`absolute ${overlapOffsetRight} rounded-full bg-[#F79E1B] ${circleSize} opacity-90`} />
      <span className="sr-only">Mastercard</span>
    </span>
  );
};

const renderBrandBadge = (brand: CardBrand, extraClasses = '') => {
  const baseClasses =
    `inline-flex items-center justify-center gap-1 uppercase font-black text-[9px] tracking-wider ` +
    `w-[54px] h-[30px] border-[1.5px] border-black rounded-[3px] ${extraClasses}`;
  if (brand === 'mastercard') {
    return (
      <span className={`${baseClasses} bg-white text-black`}>
        <MastercardLogo size="sm" />
      </span>
    );
  }
  return (
    <span className={`${baseClasses} ${cardBrandColors[brand]}`}>
      {cardBrandLabels[brand]}
    </span>
  );
};

const renderBrandStatus = (brand: CardBrand) => {
  if (brand === 'mastercard') {
    return (
      <span className="inline-flex items-center gap-2">
        <MastercardLogo size="sm" />
      </span>
    );
  }
  return cardBrandLabels[brand];
};

const UserCabinetModal: React.FC<UserCabinetModalProps> = ({ 
  userEmail, 
  userRole, 
  userGoldCoins, 
  userMessages, 
  userFirstName,
  userLastName,
  userAvatar,
  userPhone,
  userAddress,
  onClose, 
  onLogout, 
  purchaseHistory, 
  onNavigate, 
  onOpenMessage 
}) => {
  const [view, setView] = useState<'main' | 'info' | 'history' | 'messages'>('main');
  const [messagesTab, setMessagesTab] = useState<'inbox' | 'archive' | 'trash'>('inbox');
  const [openedMessageIds, setOpenedMessageIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const {
    deleteUserMessage,
    deleteUserMessages,
    archiveUserMessages,
    unarchiveUserMessages,
    restoreUserMessages,
    updateUserProfile,
    userPaymentCards,
    addPaymentCard,
    removePaymentCard,
    setDefaultUserPaymentCard,
    refreshPaymentCards,
    setToast,
  } = useStore();
  
  // Состояние для редактирования профиля
  const [editFirstName, setEditFirstName] = useState(userFirstName || '');
  const [editLastName, setEditLastName] = useState(userLastName || '');
  const [editAvatar, setEditAvatar] = useState<number>(userAvatar ?? 0);
  const [editPhone, setEditPhone] = useState(userPhone || '');
  const [editCity, setEditCity] = useState('');
  const [editAddressDetails, setEditAddressDetails] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const hasSavedCards = userPaymentCards.length > 0;
  const [isCardFormOpen, setIsCardFormOpen] = useState(!hasSavedCards);
  const [makeDefaultCard, setMakeDefaultCard] = useState(!hasSavedCards);
  const detectedCardBrand = detectCardBrand(cardNumber);
  
  // Аккордеон для секций информации
  type InfoSection = 'personal' | 'avatar' | 'contact' | 'payment';
  const [openInfoSections, setOpenInfoSections] = useState<Set<InfoSection>>(new Set(['personal']));
  
  const toggleInfoSection = (section: InfoSection) => {
    setOpenInfoSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  useEffect(() => {
    setEditFirstName(userFirstName || '');
    setEditLastName(userLastName || '');
    setEditAvatar(userAvatar ?? 0);
    setEditPhone(userPhone || '');
    
    // Parse address if it exists (format: "City, details")
    if (userAddress) {
      const parts = userAddress.split(',');
      if (parts.length > 1) {
        setEditCity(parts[0].trim());
        setEditAddressDetails(parts.slice(1).join(',').trim());
      } else {
        setEditCity('');
        setEditAddressDetails(userAddress);
      }
    } else {
      setEditCity('');
      setEditAddressDetails('');
    }
  }, [userFirstName, userLastName, userAvatar, userPhone, userAddress]);
  useEffect(() => {
    setIsCardFormOpen(!hasSavedCards);
    setMakeDefaultCard(!hasSavedCards);
  }, [hasSavedCards]);
  useEffect(() => {
    if (userEmail) {
      refreshPaymentCards(userEmail);
    }
  }, [userEmail, refreshPaymentCards]);
  const resetPaymentInputs = () => {
    setCardholderName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
  };
  const handleCardNumberInput = (value: string) => {
    setCardNumber(normalizeCardNumber(value));
  };
  const handleCardExpiryInput = (value: string) => {
    setCardExpiry(sanitizeExpiry(value));
  };
  const handleCardCvvInput = (value: string) => {
    setCardCvv(value.replace(/\D/g, '').slice(0, 4));
  };
  const unreadCount = userMessages.filter(message => !message.isRead).length;
  const inboxMessages = userMessages.filter(m => !m.isArchived && !m.isDeleted);
  const archiveMessages = userMessages.filter(m => m.isArchived && !m.isDeleted);
  const trashMessages = userMessages.filter(m => m.isDeleted);
  const currentList = messagesTab === 'inbox' ? inboxMessages : messagesTab === 'archive' ? archiveMessages : trashMessages;
  const allSelected = currentList.length > 0 && currentList.every(m => selectedIds.has(m.id));

  const handleBack = () => setView('main');
  const handleRemoveCard = async (fingerprint: string) => {
    const confirmed = window.confirm('Remove saved card?');
    if (!confirmed) return;
    const removed = await removePaymentCard(fingerprint);
    if (removed) {
      resetPaymentInputs();
      setToast('Payment information removed.');
    }
  };
  const handleSetDefaultCard = async (fingerprint: string) => {
    const updated = await setDefaultUserPaymentCard(fingerprint);
    if (updated) {
      setToast('Default payment card updated.');
    }
  };
  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    const baselineFirstName = userFirstName || '';
    const baselineLastName = userLastName || '';
    const baselineAvatar = userAvatar ?? 0;
    const baselinePhone = userPhone || '';
    const baselineAddress = userAddress || '';
    const trimmedCardholder = cardholderName.trim();
    const normalizedExpiryDigits = sanitizeExpiry(cardExpiry);

    // Combine city and address details
    const fullAddress = editCity && editAddressDetails 
      ? `${editCity}, ${editAddressDetails}` 
      : editCity || editAddressDetails || '';

    const profileChanged =
      editFirstName !== baselineFirstName ||
      editLastName !== baselineLastName ||
      editAvatar !== baselineAvatar ||
      editPhone !== baselinePhone ||
      fullAddress !== baselineAddress;

    if (profileChanged) {
      await updateUserProfile(
        editFirstName || undefined, 
        editLastName || undefined, 
        editAvatar,
        editPhone || undefined,
        fullAddress || undefined
      );
    }

    const paymentInputProvided =
      trimmedCardholder.length > 0 || cardNumber.length > 0 || normalizedExpiryDigits.length > 0;

    let paymentUpdated = false;
    if (paymentInputProvided) {
      paymentUpdated = await addPaymentCard(
        {
          cardholderName: trimmedCardholder,
          cardNumber,
          expiry: normalizedExpiryDigits,
        },
        { makeDefault: makeDefaultCard }
      );
      if (paymentUpdated) {
        resetPaymentInputs();
        setMakeDefaultCard(false);
        setToast('Payment information saved.');
      }
    }

    if (!profileChanged && !paymentInputProvided) {
      setToast('No changes to save.');
      return;
    }

    if (paymentInputProvided && !paymentUpdated) {
      return;
    }

    handleBack();
  };

  const renderMainView = () => (
    <>
        <h2 id="user-cabinet-title" className="text-3xl sm:text-4xl font-display text-black uppercase mb-4">User Cabinet</h2>
        <div className="flex items-center justify-center mb-6">
          {/* Блок с аватаркой и текстом по центру */}
          <div className="flex items-stretch gap-4">
            {/* Аватарка слева от текста */}
            {userAvatar !== undefined && (
              <div className="w-auto h-20 aspect-square border-4 border-black flex-shrink-0 overflow-hidden bg-gray-100">
                <img 
                  src={getAvatar(userAvatar).image} 
                  alt={getAvatar(userAvatar).name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            {/* Имя и информация по левой стороне, справа от аватарки */}
            <div className="text-left">
              <p className="text-black/80 mb-2 text-lg">
                Welcome back,
              </p>
              <p className="font-bold text-[#0047AB] text-xl">
                {userFirstName && userLastName 
                  ? `${userFirstName} ${userLastName}` 
                  : userFirstName || userLastName || userEmail}
              </p>
              <p className="text-sm text-black/60 mt-1">{userEmail}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 mb-6">
        <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 border-4 border-black shadow-[4px_4px_0_0_#000] bg-[#FFD700] flex items-center justify-center">
                <CoinIcon className="w-6 h-6 text-black" />
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-black border-2 border-white rounded-full min-w-[1.4rem] h-5 px-1.5 flex items-center justify-center leading-none">
                    {userGoldCoins > 99 ? '99+' : `+${userGoldCoins}`}
                </span>
            </div>
            <button
                onClick={() => setView('messages')}
                className="relative w-12 h-12 border-4 border-black shadow-[4px_4px_0_0_#000] bg-[#FF6B6B] flex items-center justify-center hover:bg-[#ff4f4f] transition-colors"
                aria-label="Open inbox"
            >
                <MailIcon className="w-6 h-6 text-black" />
                <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] font-black border-2 border-white rounded-full min-w-[1.4rem] h-5 px-1.5 flex items-center justify-center leading-none">
                    {unreadCount > 99 ? '99+' : `+${unreadCount}`}
                </span>
            </button>
        </div>
            <div className="h-2" />
        </div>
        <div className="space-y-4 mb-8">
            {userRole === 'admin' && (
                <button
                    onClick={() => {
                        onClose();
                        onNavigate('admin');
                    }}
                    className="w-full bg-[#FFD700] text-black font-bold text-lg py-4 px-6 border-4 border-black flex items-center justify-center gap-3 transition-colors hover:bg-black hover:text-[#FFD700] btn-pop"
                >
                    Admin Panel
                </button>
            )}
            <button
                onClick={() => setView('info')}
                className="w-full bg-white text-black font-bold text-lg py-4 px-6 border-4 border-black flex items-center justify-center gap-3 transition-colors hover:bg-gray-200 btn-pop"
            >
                <CogIcon className="w-6 h-6" />
                <span>My Information</span>
            </button>
            <button
                onClick={() => setView('history')}
                className="w-full bg-white text-black font-bold text-lg py-4 px-6 border-4 border-black flex items-center justify-center gap-3 transition-colors hover:bg-gray-200 btn-pop"
            >
                <ReceiptIcon className="w-6 h-6" />
                <span>Purchase History</span>
            </button>
        </div>
        <button
            onClick={onLogout}
            className="w-full bg-red-600 text-white font-bold text-lg py-4 px-6 border-4 border-black transition-colors hover:bg-black hover:text-white btn-pop"
        >
            Logout
        </button>
    </>
  );

  const renderInfoView = () => (
    <div className="text-left">
      <div className="flex items-center gap-4 mb-4 border-b-2 border-black pb-3 -mt-2">
        <button
          onClick={handleBack}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:bg-[#FFD700] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-6 h-6 text-black" />
        </button>
        <h2 className="text-3xl sm:text-4xl font-display text-black uppercase">My Information</h2>
      </div>
      <form onSubmit={handleSaveInfo} className="space-y-3">
        {/* Personal Information Accordion */}
        <div className="border-2 border-black">
          <button
            type="button"
            onClick={() => toggleInfoSection('personal')}
            className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
          >
            <span className="font-bold text-black uppercase text-sm">1. Personal Information</span>
            <span className="text-black font-bold text-lg">
              {openInfoSections.has('personal') ? '−' : '+'}
            </span>
          </button>
          {openInfoSections.has('personal') && (
            <div className="p-4 space-y-3 bg-white">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-firstName" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">First Name</label>
                  <input 
                    id="edit-firstName" 
                    name="edit-firstName"
                    type="text" 
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]" 
                    placeholder="First Name" 
                  />
                </div>
                <div>
                  <label htmlFor="edit-lastName" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Last Name</label>
                  <input 
                    id="edit-lastName" 
                    name="edit-lastName"
                    type="text" 
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]" 
                    placeholder="Last Name" 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Avatar Selection Accordion */}
        <div className="border-2 border-black">
          <button
            type="button"
            onClick={() => toggleInfoSection('avatar')}
            className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
          >
            <span className="font-bold text-black uppercase text-sm">2. Choose Avatar</span>
            <span className="text-black font-bold text-lg">
              {openInfoSections.has('avatar') ? '−' : '+'}
            </span>
          </button>
          {openInfoSections.has('avatar') && (
            <div className="p-4 bg-white">
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((avatar) => (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setEditAvatar(avatar.id)}
                    className={`w-full aspect-square border-2 overflow-hidden bg-gray-100 transition-all ${
                      editAvatar === avatar.id
                        ? 'border-black shadow-[3px_3px_0_0_#000] scale-110'
                        : 'border-gray-300 hover:border-black'
                    }`}
                    title={avatar.name}
                  >
                    <img 
                      src={avatar.image} 
                      alt={avatar.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {AVATARS[editAvatar] && (
                <p className="text-xs text-black/70 mt-2 text-center">Selected: {AVATARS[editAvatar]?.name}</p>
              )}
            </div>
          )}
        </div>

        {/* Contact Information Accordion */}
        <div className="border-2 border-black">
          <button
            type="button"
            onClick={() => toggleInfoSection('contact')}
            className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
          >
            <span className="font-bold text-black uppercase text-sm">3. Contact Information</span>
            <span className="text-black font-bold text-lg">
              {openInfoSections.has('contact') ? '−' : '+'}
            </span>
          </button>
          {openInfoSections.has('contact') && (
            <div className="p-4 space-y-3 bg-white">
              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Phone Number</label>
                <input 
                  id="phone" 
                  name="phone"
                  type="tel" 
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]" 
                  placeholder="+995 XXX XX XX XX" 
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">City</label>
                <select
                  id="city"
                  name="city"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                >
                  <option value="">Select city...</option>
                  {GEORGIAN_CITIES.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="addressDetails" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">Street, Building, Apartment</label>
                <input
                  id="addressDetails"
                  name="addressDetails"
                  type="text"
                  value={editAddressDetails}
                  onChange={(e) => setEditAddressDetails(e.target.value)}
                  className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                  placeholder="e.g. Rustaveli Ave 12, apt 45"
                />
              </div>
            </div>
          )}
        </div>

        {/* Payment Information Accordion */}
        <div className="border-2 border-black">
          <button
            type="button"
            onClick={() => toggleInfoSection('payment')}
            className="w-full flex items-center justify-between bg-[#FFD700] hover:bg-[#FFE44D] px-4 py-2 border-b-2 border-black transition-colors"
          >
            <span className="font-bold text-black uppercase text-sm">4. Payment Information</span>
            <span className="text-black font-bold text-lg">
              {openInfoSections.has('payment') ? '−' : '+'}
            </span>
          </button>
          {openInfoSections.has('payment') && (
            <div className="p-4 space-y-4 bg-white">
              {userPaymentCards.length > 0 && (
                <div className="space-y-3">
                  {userPaymentCards.map(card => (
                    <div
                      key={card.fingerprint}
                      className={`border-2 border-black p-3 text-xs sm:text-sm font-bold uppercase space-y-1 bg-gray-50 ${
                        card.isDefault ? 'shadow-[4px_4px_0_0_#000]' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {renderBrandBadge(card.cardType)}
                        <span className="tracking-widest">{card.maskedNumber}</span>
                        <span>Exp. {card.expiry || '—'}</span>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveCard(card.fingerprint)}
                            className="text-[11px] normal-case font-semibold text-red-600 hover:text-red-800 underline underline-offset-2"
                          >
                            Remove
                          </button>
                          <label className="flex items-center gap-2 text-[11px] font-semibold normal-case">
                            <input
                              type="radio"
                              name="default-card"
                              className="accent-black"
                              checked={card.isDefault}
                              onChange={() => handleSetDefaultCard(card.fingerprint)}
                            />
                            Default
                          </label>
                        </div>
                      </div>
                      {card.cardholderName && (
                        <p className="text-[11px] normal-case text-black/70">
                          Cardholder: {card.cardholderName}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsCardFormOpen(prev => !prev)}
                className="w-full bg-[#FFD700] text-black font-bold text-xs sm:text-sm uppercase py-2 px-4 border-2 border-black transition-colors hover:bg-black hover:text-[#FFD700]"
              >
                {isCardFormOpen ? 'Hide card form' : 'Add new card'}
              </button>
              {isCardFormOpen && (
                <>
                  <div>
                    <label htmlFor="cardholder" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                      Cardholder Name
                    </label>
                    <input
                      id="cardholder"
                      name="cardholder"
                      type="text"
                      value={cardholderName}
                      onChange={e => setCardholderName(e.target.value)}
                      className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                      placeholder="John Pixel"
                      autoComplete="cc-name"
                    />
                  </div>
                  <div>
                    <label htmlFor="card" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                      Credit Card
                    </label>
                    <div className="relative">
                      <input
                        id="card"
                        name="card"
                        type="text"
                        inputMode="numeric"
                        value={formatCardNumber(cardNumber)}
                        onChange={e => handleCardNumberInput(e.target.value)}
                        className="w-full h-12 text-base bg-white pr-28 pl-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                        placeholder="4111 1111 1111 1111"
                        autoComplete="cc-number"
                      />
                      {cardNumber.length > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase">
                          {renderBrandBadge(detectedCardBrand, 'text-[10px]')}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-black/60 mt-1">
                      We detect Visa, Mastercard, AmEx, Discover, Maestro and MIR automatically. Numbers are stored only on your device.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="expiry" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                        Expiry
                      </label>
                      <input
                        id="expiry"
                        name="expiry"
                        type="text"
                        inputMode="numeric"
                        value={formatExpiry(cardExpiry)}
                        onChange={e => handleCardExpiryInput(e.target.value)}
                        className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                        placeholder="MM/YY"
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label htmlFor="cvv" className="block text-xs font-bold text-black uppercase tracking-wider mb-1">
                        CVV <span className="normal-case text-[10px] font-normal">(not stored)</span>
                      </label>
                      <input
                        id="cvv"
                        name="cvv"
                        type="password"
                        inputMode="numeric"
                        value={cardCvv}
                        onChange={e => handleCardCvvInput(e.target.value)}
                        className="w-full h-10 text-base bg-white px-3 py-1 border-2 border-black focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                        placeholder="123"
                        autoComplete="cc-csc"
                      />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-xs font-bold uppercase text-black mb-1">Status</span>
                      <span className="text-sm font-black text-[#0047AB]">
                        {cardNumber ? renderBrandStatus(detectedCardBrand) : 'Awaiting card...'}
                      </span>
                      <span className="text-[11px] text-black/60">Card type updates as you type.</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-black uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="accent-black w-4 h-4"
                      checked={makeDefaultCard}
                      onChange={e => setMakeDefaultCard(e.target.checked)}
                    />
                    Make this my default payment method
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <button type="submit" className="w-full bg-[#FFD700] text-black font-bold text-base py-3 px-4 border-2 border-black transition-colors hover:bg-black hover:text-[#FFD700] btn-pop mt-4">
          Save Changes
        </button>
      </form>
    </div>
  );

  const renderHistoryView = () => (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4 -mt-2">
        <button
          onClick={handleBack}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-7 h-7 text-black" />
        </button>
        <h2 className="text-4xl font-display text-black uppercase">Purchase History</h2>
      </div>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {purchaseHistory.length > 0 ? (
          purchaseHistory.map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex gap-4 items-center bg-gray-50 p-3 border-2 border-black">
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover border-2 border-black" />
              <div className="flex-grow">
                <h3 className="font-bold text-black">{item.name}</h3>
                <p className="text-sm text-black/70">Purchased</p>
              </div>
              <p className="font-black text-lg text-[#FF0000]">${item.price.toFixed(2)}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-lg text-black/80 mb-6">You haven't purchased anything yet.</p>
            <button
              onClick={() => {
                onClose();
                onNavigate('browse');
              }}
              className="bg-[#FFD700] text-black font-bold py-3 px-8 border-4 border-black transition-colors hover:bg-black hover:text-[#FFD700] btn-pop"
            >
              Start Shopping
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const toggleMessage = (messageId: number) => {
    const wasOpen = openedMessageIds.has(messageId);
    setOpenedMessageIds(prev => {
      const next = new Set<number>(prev);
      if (wasOpen) {
        next.remove ? next.delete(messageId) : next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
    if (!wasOpen) {
      onOpenMessage(messageId);
    }
  };

  const toggleSelect = (messageId: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(messageId);
      else next.delete(messageId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(currentList.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (ids.length === 1) {
      deleteUserMessage(ids[0]);
    } else {
      deleteUserMessages(ids);
    }
    setSelectedIds(new Set());
    setOpenedMessageIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    archiveUserMessages(ids);
    setSelectedIds(new Set());
    setOpenedMessageIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  };

  const renderMessagesView = () => (
    <div className="text-left">
      <div className="flex items-center gap-4 mb-6 border-b-4 border-black pb-4 -mt-2">
        <button
          onClick={handleBack}
          className="flex-shrink-0 w-12 h-12 flex items-center justify-center border-4 border-black bg-white hover:bg-[#FFD700] transition-colors"
          aria-label="Go back"
        >
          <ChevronLeftIcon className="w-7 h-7 text-black" />
        </button>
        <h2 className="text-4xl font-display text-black uppercase">Inbox</h2>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={() => { setMessagesTab('inbox'); setSelectedIds(new Set()); setOpenedMessageIds(new Set()); }}
            className={`w-12 h-12 flex items-center justify-center border-4 border-black ${messagesTab === 'inbox' ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'}`}
            title="Inbox"
            aria-label="Inbox"
          >
            <MailIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => { setMessagesTab('archive'); setSelectedIds(new Set()); setOpenedMessageIds(new Set()); }}
            className={`w-12 h-12 flex items-center justify-center border-4 border-black ${messagesTab === 'archive' ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'}`}
            title="Archive"
            aria-label="Archive"
          >
            <ArchiveIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => { setMessagesTab('trash'); setSelectedIds(new Set()); setOpenedMessageIds(new Set()); }}
            className={`w-12 h-12 flex items-center justify-center border-4 border-black ${messagesTab === 'trash' ? 'bg-black text-white' : 'bg-white hover:bg-gray-200'}`}
            title="Trash"
            aria-label="Trash"
          >
            <TrashIcon className="w-6 h-6" />
          </button>
          <label className="flex items-center gap-2 font-bold text-sm">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => toggleSelectAll(e.target.checked)}
            />
            Select All
          </label>
        </div>
      </div>
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {currentList.length ? (
          currentList.map(message => {
            const isOpen = openedMessageIds.has(message.id);
            const isWishlistSale = /wish\s*list|wishlist|скидка/i.test(message.subject) || /wish\s*list|wishlist|скидка/i.test(message.body);
            return (
              <div key={message.id} className={`border-2 border-black shadow-[4px_4px_0_0_#000] ${isWishlistSale ? 'bg-yellow-50' : 'bg-white'}`}>
                <div className="w-full flex items-center gap-3 p-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(message.id)}
                    onChange={(e) => toggleSelect(message.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => toggleMessage(message.id)}
                  >
                    <h3 className="text-xl font-black text-black flex items-center gap-2 truncate">
                      {!message.isRead && !openedMessageIds.has(message.id) && (
                        <span className="text-xs uppercase tracking-wide text-[#FF0000]">New</span>
                      )}
                      <span className="truncate">{message.subject}</span>
                    </h3>
                  </button>
                  <span className="text-xs font-bold text-black/60 flex-shrink-0">
                    {new Date(message.createdAt).toLocaleString()}
                  </span>
                  <div className="ml-auto flex items-center gap-2">
                    {messagesTab === 'archive' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); unarchiveUserMessages([message.id]); setSelectedIds(prev => { const n = new Set(prev); n.delete(message.id); return n; }); }}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-200"
                        title="Move to Inbox"
                        aria-label="Unarchive message"
                      >
                        <MailIcon className="w-4 h-4" />
                      </button>
                    )}
                    {messagesTab !== 'archive' && messagesTab !== 'trash' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); archiveUserMessages([message.id]); setSelectedIds(prev => { const n = new Set(prev); n.delete(message.id); return n; }); }}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-200"
                        title="Archive"
                        aria-label="Archive message"
                      >
                        <ArchiveIcon className="w-4 h-4" />
                      </button>
                    )}
                    {messagesTab === 'trash' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); restoreUserMessages([message.id]); setSelectedIds(prev => { const n = new Set(prev); n.delete(message.id); return n; }); }}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-gray-200"
                        title="Restore to Inbox"
                        aria-label="Restore message"
                      >
                        <MailIcon className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteUserMessage(message.id); setSelectedIds(prev => { const n = new Set(prev); n.delete(message.id); return n; }); }}
                        className="w-8 h-8 flex items-center justify-center border-2 border-black bg-white hover:bg-red-500 hover:text-white"
                        title="Move to Trash"
                        aria-label="Move message to Trash"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t-2 border-dashed border-black/20 p-4 pt-3">
                    <p className="text-sm text-black/80 leading-relaxed whitespace-pre-line">{message.body}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-black/30">
            <p className="text-lg text-black/70 mb-4">No messages yet.</p>
            <p className="text-sm text-black/50">Messages sent from the admin center will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-cabinet-title"
    >
      <div
        className="relative bg-white border-4 border-black w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-black hover:text-[#FF0000] transition-colors z-10"
          aria-label="Close user cabinet"
        >
          <CloseIcon className="w-6 h-6" />
        </button>
        {view === 'main' && renderMainView()}
        {view === 'info' && renderInfoView()}
        {view === 'history' && renderHistoryView()}
        {view === 'messages' && renderMessagesView()}

      </div>
    </div>
  );
};

export default UserCabinetModal;
