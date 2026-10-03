import Link from 'next/link';
import { Film, ShieldCheck, Cpu } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-studio-800 bg-studio-950 mt-20 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center space-x-2">
              <Film className="w-6 h-6 text-amber-400" />
              <span className="font-extrabold text-white text-lg tracking-wider">FRANCHISE FORGE</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              The Official Studio Challenge Operating System. Franchise Forge competition platform.
              Build the studio, survive the spotlight, and pitch the franchise.
            </p>
            <div className="flex items-center space-x-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center space-x-1">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>AI Character Judging</span>
              </span>
              <span className="flex items-center space-x-1">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Safety Verified</span>
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest text-amber-400">Competition</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/" className="hover:text-white transition">Event Overview</Link></li>
              <li><Link href="/rules" className="hover:text-white transition">Official Rules & Rubric</Link></li>
              <li><Link href="/event" className="hover:text-white transition">AWS Workshop Agenda</Link></li>
              <li><Link href="/login" className="hover:text-white transition">Team Access Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-xs uppercase tracking-widest text-amber-400">Key Dates</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><strong className="text-white">Oct 5–6, 2026:</strong> AWS Workshop</li>
              <li><strong className="text-white">Oct 7, 2026:</strong> Main Competition</li>
              <li><strong className="text-white">Teams:</strong> 2–3 Members per Team</li>
            </ul>
          </div>

        </div>

        <div className="border-t border-studio-800 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 Franchise Forge: The Studio Challenge. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Official Competition Platform</p>
        </div>
      </div>
    </footer>
  );
}
