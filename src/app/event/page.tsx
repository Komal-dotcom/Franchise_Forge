import { Cpu, Trophy } from 'lucide-react';

export default function EventPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">EVENT AGENDA & SCHEDULE</h1>
        <p className="text-slate-400 text-sm max-w-2xl mx-auto">
          Franchise Forge 2026 key timeline, hands-on AWS workshop sessions, and main competition rounds.
        </p>
      </div>

      {/* Timeline Grid */}
      <div className="space-y-8">
        
        {/* DAY 1 & 2: AWS WORKSHOP */}
        <div className="glass-panel p-8 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-bold mb-4 border border-amber-500/20">
            <Cpu className="w-4 h-4" />
            <span>DAY 1 & 2 — 5th & 6th OCTOBER 2026</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">AWS & AI WORKSHOP SESSIONS</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            Hands-on technical workshop covering AWS Cloud Architecture, Amazon S3 asset bucket management, generative AI visual prompting, and studio workflow optimizations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-studio-900 border border-studio-700">
              <strong className="text-amber-400 block mb-1">Morning Session</strong>
              <p className="text-slate-300">AWS Cloud Foundations & S3 Submission Bucket Configuration for entertainment assets.</p>
            </div>
            <div className="p-4 rounded-xl bg-studio-900 border border-studio-700">
              <strong className="text-amber-400 block mb-1">Afternoon Session</strong>
              <p className="text-slate-300">Generative AI visual prompting techniques & character consistency optimization.</p>
            </div>
          </div>
        </div>

        {/* DAY 3: MAIN COMPETITION */}
        <div className="glass-panel-gold p-8 rounded-2xl border border-amber-500/30 relative overflow-hidden">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-md bg-amber-500/20 text-amber-400 text-xs font-bold mb-4 border border-amber-500/30">
            <Trophy className="w-4 h-4" />
            <span>DAY 3 — 7th OCTOBER 2026</span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">MAIN COMPETITION</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            The full-day franchise forge operating challenge across Round 1 (Greenlight), Round 2 (Character Forge & AI Judge), and Round 3 (Marketing Forge).
          </p>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-xl bg-studio-900/90 border border-studio-700">
              <strong className="text-white text-sm block mb-0.5">Round 1: Greenlight Forge</strong>
              <span className="block text-slate-400">Core Premise, Genre & Elevator Pitch Submission</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-900/90 border border-studio-700">
              <strong className="text-white text-sm block mb-0.5">Round 2: Character & Visual Forge</strong>
              <span className="block text-slate-400">Hero/Villain profiles, prompts & AI Judge Evaluation</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-900/90 border border-studio-700">
              <strong className="text-white text-sm block mb-0.5">Round 3: Marketing Forge</strong>
              <span className="block text-slate-400">Target Audience Strategy, Copywriting & Poster Assets</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
