import Link from 'next/link';
import { Film, Sparkles, Cpu, Trophy, Calendar, Users, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      
      {/* Background Subtle Warm Grid & Glow Atmosphere */}
      <div className="absolute inset-0 bg-studio-grid bg-[size:40px_40px] opacity-25 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-500/15 via-studio-900/10 to-transparent blur-3xl pointer-events-none" />

      {/* HERO SECTION */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Harmonious Amber Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full glass-panel-gold mb-8 text-xs font-semibold tracking-wider text-amber-400 border border-amber-500/30 shadow-md">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>FRANCHISE FORGE OPERATING SYSTEM</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl md:text-7xl font-extrabold tracking-tight mb-6 text-white uppercase">
          FRANCHISE FORGE
          <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200">
            THE STUDIO CHALLENGE
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-lg md:text-xl font-bold tracking-widest text-amber-400 uppercase mb-8 max-w-4xl mx-auto text-glow-gold">
          BUILD THE STUDIO // SURVIVE THE SPOTLIGHT // PITCH THE FRANCHISE
        </p>

        {/* Subtitle / Description */}
        <p className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          Participants step into the shoes of entertainment studio executives to conceive, design, and pitch an original fictional entertainment universe across 3 high-stakes rounds powered by AI judging.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-studio-950 font-black text-base shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-3 transition hover:scale-[1.02]"
          >
            <span>ENTER STUDIO PORTAL</span>
            <ArrowRight className="w-5 h-5 text-studio-950" />
          </Link>

          <Link
            href="/rules"
            className="w-full sm:w-auto px-8 py-4 rounded-xl glass-panel text-white font-semibold text-base border border-amber-500/30 hover:border-amber-400 flex items-center justify-center space-x-2 transition"
          >
            <span>VIEW OFFICIAL RULES & RUBRIC</span>
          </Link>
        </div>

        {/* Event Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto glass-panel p-6 rounded-2xl border border-amber-500/20">
          <div className="border-r border-studio-800 pr-4">
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-1">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">AWS Workshop</span>
            </div>
            <p className="text-lg font-bold text-white">5th & 6th Oct 2026</p>
          </div>

          <div className="border-r border-studio-800 pr-4">
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-1">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Main Event</span>
            </div>
            <p className="text-lg font-bold text-white">7th October 2026</p>
          </div>

          <div className="border-r border-studio-800 pr-4">
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-1">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Team Size</span>
            </div>
            <p className="text-lg font-bold text-white">2–3 Members</p>
          </div>

          <div>
            <div className="flex items-center justify-center space-x-2 text-amber-400 mb-1">
              <Cpu className="w-4 h-4 text-amber-400" />
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">AI Judging</span>
            </div>
            <p className="text-lg font-bold text-white">AI Studio Judge</p>
          </div>
        </div>

      </section>


      {/* COMPETITION ROUNDS SECTION */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-amber-400 mb-2">Competition Structure</h2>
          <p className="text-3xl md:text-5xl font-black text-white">THE 3-ROUND STUDIO WORKFLOW</p>
          <p className="text-slate-400 text-sm max-w-2xl mx-auto mt-4">
            From concept greenlight to character creation and marketing strategy, lead your studio through each forge phase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* ROUND 1 */}
          <div className="glass-panel p-8 rounded-2xl border border-studio-700 hover:border-amber-500/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-bl-xl border-l border-b border-amber-500/20">
              ROUND 1
            </div>
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Film className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">GREENLIGHT FORGE</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Conceive the core franchise premise, genre, target audience, world-building concepts, central conflict, and elevator pitch.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Franchise Name & Genre Definition</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Core Premise & World Concept</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Elevator Pitch Submission</span>
              </li>
            </ul>
          </div>

          {/* ROUND 2 */}
          <div className="glass-panel p-8 rounded-2xl border border-amber-500/30 hover:border-amber-400 transition-all group relative overflow-hidden bg-studio-900/70">
            <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500/20 text-amber-300 text-xs font-bold rounded-bl-xl border-l border-b border-amber-500/30">
              ROUND 2 (AI JUDGED)
            </div>
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Cpu className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">CHARACTER & VISUAL FORGE</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Build Hero and Villain archetypes, relationship dynamics, visual prompts, and rendered artwork evaluated by the AI Judge.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Hero & Villain Character Profiles</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Mandatory AI Image Safety Check</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>100-Point Configurable Rubric Scoring</span>
              </li>
            </ul>
          </div>

          {/* ROUND 3 */}
          <div className="glass-panel p-8 rounded-2xl border border-studio-700 hover:border-amber-500/40 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-bl-xl border-l border-b border-amber-500/20">
              ROUND 3
            </div>
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
              <Sparkles className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">MARKETING FORGE</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Develop the global promotional copy, tagline, intended audience response, and key poster visual assets.
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Strategic Marketing Angle</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Tagline & Key Copy Asset</span>
              </li>
              <li className="flex items-center space-x-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Promotional Poster S3 Upload</span>
              </li>
            </ul>
          </div>

        </div>

      </section>

    </div>
  );
}
