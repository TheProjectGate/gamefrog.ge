import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseIcon } from './Icons';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface SaleModalProps {
  saleEndsAt: string;
  onClose: () => void;
  onNavigateToSale: () => void;
}

const calculateTimeLeft = (targetDate: number): TimeLeft => {
  const now = Date.now();
  const difference = Math.max(targetDate - now, 0);

  const days = Math.floor(difference / (1000 * 60 * 60 * 24));
  const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((difference / (1000 * 60)) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  return { days, hours, minutes, seconds };
};

const SaleModal: React.FC<SaleModalProps> = ({ saleEndsAt, onClose, onNavigateToSale }) => {
  const { t } = useTranslation();
  const targetTimestamp = useMemo(() => new Date(saleEndsAt).getTime(), [saleEndsAt]);
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetTimestamp));
  const discountValue = 60;

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetTimestamp));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTimestamp]);

  const formatUnit = (value: number) => value.toString().padStart(2, '0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-fade-in">
      <div className="relative max-w-2xl w-full mx-4 rounded-none border-8 border-black bg-[#FFD700] shadow-2xl">
        <div className="absolute -top-4 -right-4">
          <button
            onClick={onClose}
            className="w-12 h-12 bg-black text-white border-4 border-white flex items-center justify-center"
            aria-label={t('saleModal.closeAria')}
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-[#FF3131] text-white text-center py-3 border-b-8 border-black">
          <p className="text-sm sm:text-base font-bold tracking-[0.3em] uppercase">
            {t('saleModal.banner')}
          </p>
        </div>

        <div className="p-8 sm:p-10 bg-white flex flex-col gap-8">
          <div className="text-center space-y-3">
            <span className="inline-block px-4 py-1 bg-black text-[#FFD700] font-black uppercase tracking-[0.4em] text-sm sm:text-base">
              {t('saleModal.badge')}
            </span>
            <h2 className="text-4xl sm:text-5xl font-black uppercase text-black leading-tight">
              {t('saleModal.headlinePrefix')}{' '}
              <span className="text-[#FF3131]">{t('saleModal.headlineHighlight', { discount: discountValue })}</span>{' '}
              {t('saleModal.headlineSuffix')}
            </h2>
            <p className="text-base sm:text-lg font-semibold text-black/80 max-w-xl mx-auto">
              {t('saleModal.description')}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {[
              { label: t('saleModal.countdown.days'), value: timeLeft.days },
              { label: t('saleModal.countdown.hours'), value: timeLeft.hours },
              { label: t('saleModal.countdown.minutes'), value: timeLeft.minutes },
              { label: t('saleModal.countdown.seconds'), value: timeLeft.seconds },
            ].map((unit) => (
              <div key={unit.label} className="flex flex-col items-center bg-[#1F1F1F] text-[#FFD700] border-4 border-black py-4 sm:py-5">
                <span className="text-2xl sm:text-3xl font-black">
                  {formatUnit(unit.value)}
                </span>
                <span className="mt-1 text-xs sm:text-sm font-semibold uppercase tracking-[0.3em] text-white/70">
                  {unit.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-black font-bold uppercase tracking-[0.2em] text-center sm:text-left">
              <span className="inline-block bg-[#FFFC33] px-3 py-2 border-4 border-black">
                {t('saleModal.ctaHint')}
              </span>
            </div>
            <button
              onClick={onNavigateToSale}
              className="w-full sm:w-auto bg-[#FF3131] hover:bg-black text-white font-black uppercase tracking-[0.3em] px-6 py-4 border-4 border-black transition-transform transform hover:-translate-y-1 hover:translate-x-1"
            >
              {t('saleModal.ctaButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleModal;

