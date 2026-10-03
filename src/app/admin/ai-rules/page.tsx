import { redirect } from 'next/navigation';
import { getIsAdminSession } from '@/lib/auth';
import AdminHeaderNav from '@/components/AdminHeaderNav';
import { BookOpenCheck, ShieldAlert, Cpu, CheckCircle2, AlertTriangle, FileCode } from 'lucide-react';

export default async function AIRulesPage() {
  const isAdmin = await getIsAdminSession();
  if (!isAdmin) redirect('/login');

  const rubricCriteria = [
    { name: '1. Character Development', max: 30, desc: 'Evaluates clear identity, distinct personality, clear goal/motivation, strengths, weaknesses, internal/external conflict, narrative depth, and completeness.' },
    { name: '2. Hero / Villain Relationship', max: 20, desc: 'Evaluates relationship strength, narrative conflict, motivation for opposition, interdependence, story potential, and logical connection between Hero and Villain.' },
    { name: '3. Originality', max: 15, desc: 'Evaluates distinctiveness, creative concept, avoidance of generic archetype execution, unique trait combinations, and franchise potential.' },
    { name: '4. Visual Quality', max: 15, desc: 'Evaluates visual clarity, composition, character readability, aesthetic coherence, and professional presentation.' },
    { name: '5. Prompt Quality', max: 10, desc: 'Evaluates whether visual prompts clearly describe the character, include visual details, and specify style/appearance effectively.' },
    { name: '6. Prompt / Image Consistency', max: 10, desc: 'Compares submitted image against prompt to evaluate character identity consistency, visual attributes, and major mismatch detection.' },
  ];

  return (
    <div className="min-h-screen bg-studio-950 text-white">
      <AdminHeaderNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
        <div>
          <span className="px-3 py-1 rounded-md bg-cyanGlow/20 text-cyanGlow text-xs font-bold uppercase tracking-wider">
            PROGRAMMATIC EVALUATION ENGINE
          </span>
          <h1 className="text-3xl font-black text-white mt-1">ROUND 2 — AI EVALUATION RULES & RUBRIC</h1>
          <p className="text-xs text-gray-400 mt-1">
            Official 100-Point Rubric Rules enforced programmatically by application code. LLM output provides criteria scores; total score is calculated deterministically.
          </p>
        </div>

        {/* RUBRIC GRID */}
        <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-amber-400 uppercase tracking-wider flex items-center space-x-2">
              <BookOpenCheck className="w-5 h-5" />
              <span>100-Point Evaluation Criteria</span>
            </h2>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-xs">
              TOTAL = 100 POINTS
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rubricCriteria.map((item, index) => (
              <div key={index} className="p-4 rounded-xl bg-studio-900 border border-studio-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-sm">{item.name}</span>
                  <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-extrabold text-xs">
                    MAX {item.max} PTS
                  </span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SAFETY RULES SECTION */}
        <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
          <h2 className="text-lg font-black text-rose-400 uppercase tracking-wider flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5" />
            <span>AI Safety Evaluation Rules</span>
          </h2>
          <p className="text-xs text-gray-400">
            Safety evaluation occurs BEFORE character scoring. Prohibited content fails automatically. Borderline content queues for Admin review.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
              <span className="font-black text-emerald-400 text-xs uppercase block">PASS</span>
              <p className="text-xs text-gray-300">Normal fantasy, action, horror, villains, and fictional conflicts are permitted.</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <span className="font-black text-amber-400 text-xs uppercase block">REVIEW_REQUIRED</span>
              <p className="text-xs text-gray-300">Queued for Admin Safety Review. Does NOT automatically disqualify the team.</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
              <span className="font-black text-rose-400 text-xs uppercase block">FAIL / DISQUALIFIED</span>
              <p className="text-xs text-gray-300">Prohibited/vulgar content detected. Total score set to 0. Team marked DISQUALIFIED.</p>
            </div>
          </div>
        </div>

        {/* STRUCTURED JSON SCHEMA REFERENCE */}
        <div className="glass-panel p-6 rounded-2xl border border-studio-800 space-y-4">
          <h2 className="text-lg font-black text-cyanGlow uppercase tracking-wider flex items-center space-x-2">
            <FileCode className="w-5 h-5" />
            <span>AI Response Output JSON Schema</span>
          </h2>
          <pre className="p-4 rounded-xl bg-studio-950 border border-studio-800 text-xs text-amber-400 font-mono overflow-x-auto">
{`{
  "safety": {
    "status": "PASS | REVIEW_REQUIRED | FAIL",
    "reason": "Explicit safety reasoning",
    "confidence": 0.98
  },
  "evaluation": {
    "characterDevelopment": { "score": 26, "max": 30, "evidence": "Detailed character motivation..." },
    "heroVillainRelationship": { "score": 18, "max": 20, "evidence": "Strong ideological clash..." },
    "originality": { "score": 13, "max": 15, "evidence": "Unique combination of sci-fi traits..." },
    "visualQuality": { "score": 13, "max": 15, "evidence": "High contrast studio rendering..." },
    "promptQuality": { "score": 9, "max": 10, "evidence": "Clear lighting and style tags..." },
    "promptImageConsistency": { "score": 8, "max": 10, "evidence": "Minor color mismatch in cloak..." }
  }
}`}
          </pre>
        </div>
      </main>
    </div>
  );
}
