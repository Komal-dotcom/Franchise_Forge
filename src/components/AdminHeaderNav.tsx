'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UploadCloud, ShieldAlert, BookOpenCheck, Edit3, Award, FileText } from 'lucide-react';

export default function AdminHeaderNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Control Center', href: '/admin', icon: LayoutDashboard },
    { label: 'Team Dossiers', href: '/admin/teams', icon: Users },
    { label: 'CSV Import', href: '/admin/import', icon: UploadCloud },
    { label: 'R2 AI Judge Queue', href: '/admin/ai-judge', icon: ShieldAlert },
    { label: 'AI Evaluation Rules', href: '/admin/ai-rules', icon: BookOpenCheck },
    { label: 'R3 Manual Judging', href: '/admin/manual-judging', icon: Edit3 },
    { label: 'Final Pitch Panel', href: '/admin/final-pitch', icon: Award },
    { label: 'Audit Log', href: '/admin/audit-log', icon: FileText },
  ];

  return (
    <div className="glass-panel border-b border-amber-500/20 bg-studio-950/80 mb-8 sticky top-20 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2.5 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isActive
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-studio-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
