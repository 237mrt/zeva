import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  PackageCheck,
  Printer,
  Settings,
  Users,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const navigationItems: NavigationItem[] = [
  { label: 'Genel Bakış', path: '/', icon: LayoutDashboard },
  { label: 'İş Emirleri', path: '/isler', icon: ClipboardList },
  { label: 'Ütü ve Paketleme', path: '/utu-paket', icon: PackageCheck },
  { label: 'Baskı', path: '/baski', icon: Printer },
  { label: 'Müşteriler', path: '/musteriler', icon: Users },
  { label: 'Muhasebe', path: '/muhasebe', icon: WalletCards },
  { label: 'Raporlar', path: '/raporlar', icon: BarChart3 },
  { label: 'Ayarlar', path: '/ayarlar', icon: Settings },
];
