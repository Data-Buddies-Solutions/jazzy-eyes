'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { PlusCircle, Search, BarChart3, X, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  {
    name: 'Add New Frame',
    href: '/admin/add-new',
    icon: PlusCircle,
  },
  {
    name: 'Manage Inventory',
    href: '/admin/manage',
    icon: Search,
  },
  {
    name: 'View Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    disabled: true,
    badge: 'Phase 4',
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-white border-r-2 border-black transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Store className="w-6 h-6 text-sky-deeper" />
            <h2 className="text-lg font-bold">Jazzy Eyes Admin</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.disabled ? '#' : item.href}
                onClick={(e) => {
                  if (item.disabled) {
                    e.preventDefault();
                    return;
                  }
                  onClose();
                }}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-md transition-colors border-2',
                  isActive
                    ? 'bg-sky-soft border-black font-semibold'
                    : item.disabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent hover:bg-sky-soft/50 hover:border-black'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-2 border-black flex-shrink-0">
          <Link href="/">
            <Button variant="outline" className="w-full border-2 border-black">
              Back to POS
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
}
