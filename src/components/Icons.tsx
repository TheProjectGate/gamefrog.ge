import React from 'react';
import {
  ShoppingCart as LucideShoppingCart,
  X as LucideX,
  Search as LucideSearch,
  ChevronLeft as LucideChevronLeft,
  ChevronRight as LucideChevronRight,
  Filter as LucideFilter,
  Grid as LucideGrid,
  List as LucideList,
  Trash2 as LucideTrash2,
  Heart as LucideHeart,
  Check as LucideCheck,
  User as LucideUser,
  Settings as LucideSettings,
  Receipt as LucideReceipt,
  Home as LucideHome,
  Package as LucidePackage,
  Edit as LucideEdit,
  Plus as LucidePlus,
  SlidersHorizontal as LucideSliders,
  Star as LucideStar,
  Twitter as LucideTwitter,
  Facebook as LucideFacebook,
  Instagram as LucideInstagram,
  Youtube as LucideYoutube,
  ArrowUp as LucideArrowUp,
  Menu as LucideMenu,
  Coins as LucideCoins,
  Mail as LucideMail,
  Archive as LucideArchive,
  Car as LucideCar,
  MapPin as LucideMapPin,
  BarChart3 as LucideBarChart3,
  Tag as LucideTag,
  Info as LucideInfo,
  Play as LucidePlay,
  Volume2 as LucideVolume2,
  VolumeX as LucideVolumeX,
} from 'lucide-react';

export const CartIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideShoppingCart className={className} />
);

export const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideX className={className} />
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideSearch className={className} />
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideChevronLeft className={className} />
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideChevronRight className={className} />
);

export const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideFilter className={className} />
);

export const GridIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideGrid className={className} />
);

export const ListIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideList className={className} />
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideTrash2 className={className} />
);

export const HeartIcon: React.FC<{ className?: string; isFilled?: boolean }> = ({ className, isFilled }) => (
  <LucideHeart className={className} fill={isFilled ? 'currentColor' : 'none'} />
);

export const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideCheck className={className} />
);

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideUser className={className} />
);

export const CogIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideSettings className={className} />
);

export const ReceiptIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideReceipt className={className} />
);

export const DashboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideHome className={className} />
);

export const PackageIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucidePackage className={className} />
);

export const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideEdit className={className} />
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucidePlus className={className} />
);

export const SlidersIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideSliders className={className} />
);

export const StarIcon: React.FC<{ className?: string; isFilled?: boolean }> = ({ className, isFilled }) => (
  <LucideStar className={className} fill={isFilled ? 'currentColor' : 'none'} />
);

export const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideTwitter className={className} />
);

export const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideFacebook className={className} />
);

export const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideInstagram className={className} />
);

export const YouTubeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideYoutube className={className} />
);

export const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideArrowUp className={className} />
);

export const MenuIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideMenu className={className} />
);

export const CoinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideCoins className={className} />
);

export const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideMail className={className} />
);

export const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideArchive className={className} />
);

export const CarIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideCar className={className} />
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideMapPin className={className} />
);

export const AnalyticsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideBarChart3 className={className} />
);

export const TagIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideTag className={className} />
);

export const InfoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucideInfo className={className} />
);

export const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <LucidePlay className={className} />
);

export const VolumeIcon: React.FC<{ className?: string; muted?: boolean }> = ({ className, muted }) => {
  const Icon = muted ? LucideVolumeX : LucideVolume2;
  return <Icon className={className} />;
};
