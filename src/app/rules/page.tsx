import { ShieldAlert, CheckCircle2, Scale } from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4">COMPETITION RULES & AI RUBRIC</h1>
        <p className="text-neutralAccent-400 text-sm max-w-2xl mx-auto">
          Official guidelines governing team composition, round submissions, content safety guidelines, and AI judging rubrics.
        </p>
      </div>

      {/* Rules Breakdown */}
      <div className="space-y-8">
        
        {/* Section 1: Team & Registration */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-champagne-300" />
            <h2 className="text-xl font-bold text-white">1. Team Composition & Registration</h2>
          </div>
          <ul className="space-y-3 text-sm text-neutralAccent-300 list-disc list-inside">
            <li>Teams must consist of <strong>2 to 3 participants</strong> per team.</li>
            <li>Registration is completed externally prior to the event. Organizers import team credentials via CSV.</li>
            <li>Each team receives a unique <strong>Team Code</strong> (e.g., `FF26-001`) and secret <strong>Access Code</strong> for studio login.</li>
            <li>Member contact information (phone/email) is strictly isolated and never exposed to other competing studios.</li>
          </ul>
        </div>

        {/* Section 2: Image Safety & Content Moderation */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700 bg-studio-900/60">
          <div className="flex items-center space-x-3 mb-4">
            <ShieldAlert className="w-6 h-6 text-neutralAccent-300" />
            <h2 className="text-xl font-bold text-white">2. Visual Safety & Content Moderation Policy</h2>
          </div>
          <p className="text-neutralAccent-300 text-sm mb-4 leading-relaxed">
            Round 2 requires generating or uploading visual character assets. All visual assets pass through a mandatory 2-stage AI Safety Filter prior to judging:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-4">
            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700">
              <span className="font-bold text-white block mb-1">PASS</span>
              <p className="text-neutralAccent-400">
                Horror themes, dark fantasy, monsters, action scenes, and intense narrative drama complying with guidelines are approved.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700">
              <span className="font-bold text-neutralAccent-300 block mb-1">REVIEW REQUIRED</span>
              <p className="text-neutralAccent-400">
                Borderline or ambiguous visual elements trigger an admin review queue. Organizers manually inspect before qualification.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700">
              <span className="font-bold text-crimsonGlow block mb-1">FAIL (DISQUALIFY)</span>
              <p className="text-neutralAccent-400">
                Explicit pornography, nudity, genital exposure, or prohibited vulgar content results in immediate automatic disqualification.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: AI Rubric */}
        <div className="glass-panel p-8 rounded-2xl border border-studio-700">
          <div className="flex items-center space-x-3 mb-4">
            <Scale className="w-6 h-6 text-neutralAccent-300" />
            <h2 className="text-xl font-bold text-white">3. Round 2 AI Judging Rubric (100 Points Total)</h2>
          </div>
          <p className="text-neutralAccent-300 text-sm mb-6">
            The local AI Judge evaluates entries strictly according to the fixed rubric configured by organizers. Scores are computed programmatically:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Character Development</strong>
                <span className="text-neutralAccent-400">Hero & Villain goals, weaknesses, and depth</span>
              </div>
              <span className="text-base font-bold text-white">30 Pts</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Hero–Villain Relationship</strong>
                <span className="text-neutralAccent-400">Moral contrast & narrative conflict tension</span>
              </div>
              <span className="text-base font-bold text-white">20 Pts</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Originality</strong>
                <span className="text-neutralAccent-400">Concept uniqueness & world innovation</span>
              </div>
              <span className="text-base font-bold text-white">15 Pts</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Visual Quality</strong>
                <span className="text-neutralAccent-400">Aesthetic composition & image fidelity</span>
              </div>
              <span className="text-base font-bold text-white">15 Pts</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Prompt Quality</strong>
                <span className="text-neutralAccent-400">Textual prompt clarity & detail</span>
              </div>
              <span className="text-base font-bold text-white">10 Pts</span>
            </div>

            <div className="p-4 rounded-xl bg-studio-850 border border-studio-700 flex justify-between items-center">
              <div>
                <strong className="text-white block text-sm">Prompt–Image Consistency</strong>
                <span className="text-neutralAccent-400">Alignment between text prompt & rendered image</span>
              </div>
              <span className="text-base font-bold text-white">10 Pts</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
