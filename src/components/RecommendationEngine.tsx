import React, { useState } from 'react';
import { Achievement, Project, Opportunity } from '../types';
import { 
  Trophy, 
  Users, 
  MapPin, 
  Sparkles, 
  Brain, 
  ArrowRight, 
  Compass, 
  Code, 
  Flame, 
  ChevronRight, 
  ShieldCheck, 
  BookOpen, 
  UserPlus, 
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Award,
  CheckCircle,
  Bot
} from 'lucide-react';

interface RecommendedUser {
  name: string;
  avatar: string;
  school: string;
  role: string;
  skills: string[];
  matchScore: number;
  reason: string;
}

interface RecommendationEngineProps {
  studentName: string;
  grade: string;
  school: string;
  achievements: Achievement[];
  projects: Project[];
  opportunities: Opportunity[];
  onApplyOpportunity: (id: string) => void;
  onInitiateCollaboration: (studentName: string, message: string) => void;
}

interface AIRecommendPlan {
  suggestedFocusArea: string;
  customOlympiadTarget: string;
  competitorsTips: string;
  unexploredContests: Array<{ name: string; type: string; gapAddressed: string }>;
}

export default function RecommendationEngine({
  studentName,
  grade,
  school,
  achievements,
  projects,
  opportunities,
  onApplyOpportunity,
  onInitiateCollaboration
}: RecommendationEngineProps) {

  const [activeSegment, setActiveSegment] = useState<'opportunities' | 'partners' | 'ai'>('opportunities');
  const [aiReport, setAiReport] = useState<AIRecommendPlan | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [invitedUsers, setInvitedUsers] = useState<string[]>([]);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);

  // 1. Dynamic Client-Side Rule Engine mapping Aarav's real assets to Opportunities
  const analyzeOpportunityMatch = (opp: Opportunity): { score: number; reasons: string[] } => {
    let score = 50;
    const reasons: string[] = [];

    // Analyze skills and title
    const lowerName = opp.name.toLowerCase();
    const lowerDesc = opp.description.toLowerCase();

    // Physics mapping
    const hasPhysics = achievements.some(a => a.title.toLowerCase().includes('physics') || a.description.toLowerCase().includes('physics')) ||
                        projects.some(p => p.title.toLowerCase().includes('physics') || p.description.toLowerCase().includes('physics'));
    
    // IoT/Sensor mapping
    const hasIoT = achievements.some(a => a.description.toLowerCase().includes('iot') || a.title.toLowerCase().includes('drip')) ||
                    projects.some(p => p.description.toLowerCase().includes('irrigation'));

    // Coding mapping
    const hasCoding = achievements.some(a => a.title.toLowerCase().includes('cyber') || a.title.toLowerCase().includes('olympiad')) ||
                      projects.some(p => p.skills.includes('Python') || p.skills.includes('React'));

    if (opp.type === 'Olympiad') {
      if (hasPhysics || hasCoding) {
        score += 35;
        reasons.push("Matches your strong standing in school-level scientific contest portfolios");
      }
      if (lowerName.includes('astronomy') && (lowerDesc.includes('space') || hasPhysics)) {
        score += 12;
        reasons.push("Matches your active 'Gravity Anomaly Modeling on Lunar Craters' manuscript");
      }
    }

    if (opp.type === 'Scholarship') {
      if (achievements.some(a => a.verificationStatus === 'Verified')) {
        score += 30;
        reasons.push("Aligns with your 2+ officially verified State high-school milestones");
      }
      if (opp.eligibility.toLowerCase().includes('science') || opp.eligibility.toLowerCase().includes('xii')) {
        score += 15;
        reasons.push("Matches Class XII pure Science CBSE state qualifications tracker profile");
      }
    }

    if (opp.type === 'Hackathon') {
      if (hasIoT || hasCoding) {
        score += 40;
        reasons.push("Direct overlap with your PyGrade CLI transcribers and Urban Drip irrigation sensors");
      }
    }

    if (opp.type === 'Fellowship') {
      if (achievements.some(a => a.category === 'Research')) {
        score += 45;
        reasons.push("Matches your active co-authored Astrophysics draft status");
      }
    }

    return { 
      score: Math.min(98, score), 
      reasons: reasons.length > 0 ? reasons : ["General recommendation based on CBSE secondary grade levels"] 
    };
  };

  // 2. Predefined mock profiles that match Aarav's physics and coding fields
  const matchedCollaborators: RecommendedUser[] = [
    {
      name: "Dhruba Sen",
      avatar: "DS",
      school: "Campion School, Mumbai",
      role: "Frequent CAD Co-designer",
      skills: ["Fusion 360", "Orbital Kinematics", "3D Printing"],
      matchScore: 96,
      reason: "Outstanding mutual connection in Mars Rover CAD layout. Dhruba is looking for a Physics mechanics analyst to map centrifugal gravities."
    },
    {
      name: "Sneha Kapoor",
      avatar: "SK",
      school: "Cathedral & John Connon, Mumbai",
      role: "DPS R.K. Puram Coding Cohort",
      skills: ["React Native", "Ultrasonic Sensors", "IoT Node.js"],
      matchScore: 92,
      reason: "Common background in Delhi Public School IoT exhibitions. Sneha leads SafeSchool bus alert tracking which directly correlates to your IoT terrace drip irrigation architectures."
    },
    {
      name: "Raj Kumar",
      avatar: "RK",
      school: "The Doon School, Dehradun",
      role: "Acoustical Research Peer",
      skills: ["Physics Acoustics", "Chladni Plates", "Experimental Lab"],
      matchScore: 88,
      reason: "Highly related science researcher. Raj completed frequency modeling that coordinates to your Space/Physics publication structures."
    },
    {
      name: "Meera Nair",
      avatar: "MN",
      school: "Holy Cross High, Kochi",
      role: "Ecology Tech Explorer",
      skills: ["Soil Biology", "Embedded Sensors", "E-Soil Metrics"],
      matchScore: 84,
      reason: "Bio-sensors project lead. Meera is modeling leaf salinity potentials which meshes perfectly with your urban automated agricultural controls."
    },
    {
      name: "Aisha Patel",
      avatar: "AP",
      school: "Campion School, Mumbai",
      role: "NTSE Scholarship Alumni Link",
      skills: ["Calculus", "NTSE Mentorship", "Numerical Physics"],
      matchScore: 80,
      reason: "Top science scholarship holder. Aisha has won NTSE grants matching your target KVPY science fellowship roadmap."
    }
  ];

  // Call server-side Gemini endpoint to parse report dynamically
  const generateAiRecommendations = async () => {
    setIsAiLoading(true);
    setErrorText(null);
    setAiReport(null);

    try {
      const res = await fetch('/api/gemini/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          grade,
          school,
          achievements: achievements.map(a => ({ title: a.title, category: a.category, desc: a.description })),
          projects: projects.map(p => ({ title: p.title, desc: p.description, skills: p.skills })),
          isRecommendationSpecific: true // tells server to shape it for opportunities mapping
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Advisor took too long to formulate custom opportunities.");

      // Adapt the schema for AI Recommend view
      setAiReport({
        suggestedFocusArea: data.academicReview || "Focus heavily on numerical astronomy and coordinate systems.",
        customOlympiadTarget: data.strengths?.[0] ? `Olympiad Target: ${data.strengths[0]}` : "Aspirant: HBCSE Astronomy Olympiad Second Gate.",
        competitorsTips: data.portfolioEnhancements?.[0] || "Draft a clean PDF repository of irrigation schematics to secure Shastri research grants.",
        unexploredContests: data.opportunitiesRecommended || [
          { name: "National Cyber Challenge", type: "Hackathon", gapAddressed: "Leverages your rank-42 cyber Olympiad score" }
        ]
      });
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to establish real-time link with server Gemini engine.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const inviteCollaborator = (name: string) => {
    setInvitedUsers(prev => [...prev, name]);
    onInitiateCollaboration(name, `Hello ${name}! I noticed your academic background matches my projects on ScholrNet. Let's form a team for the upcoming Ignite Teen Innovation Hackathon!`);
  };

  const connectUser = (name: string) => {
    setConnectedUsers(prev => [...prev, name]);
  };

  return (
    <div className="space-y-6">
      {/* Visual Hub Header (Flattened & Minimal) */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border-b-2 border-orange-500 shadow-sm relative overflow-hidden">
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1 bg-orange-600/25 border border-orange-500/45 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-orange-200">
              <Bot size={10} /> Smart Algorithm Recs
            </span>
            <h3 className="text-lg font-bold tracking-tight">Personalized Recommendation Engine</h3>
            <p className="text-xs text-slate-300">Evaluating achievements, projects, and skills to suggest custom opportunities and matching peers</p>
          </div>

          <div className="flex bg-white/5 border border-white/10 p-1 rounded-xl">
            <button
              onClick={() => setActiveSegment('opportunities')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'opportunities' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Opp Matches
            </button>
            <button
              onClick={() => setActiveSegment('partners')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'partners' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              Collaborators & Connections
            </button>
            <button
              onClick={() => setActiveSegment('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSegment === 'ai' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-300 hover:text-white'
              }`}
            >
              AI Custom Path
            </button>
          </div>
        </div>
      </div>

      {/* Error warning inside bento */}
      {errorText && (
        <div className="bg-red-50 border border-red-150 rounded-2xl p-4 flex gap-3 text-xs text-red-800">
          <AlertCircle className="shrink-0 text-red-600" size={16} />
          <div className="space-y-1">
            <span className="font-bold">Real-time LLM Recommendation link offline</span>
            <p className="leading-relaxed">{errorText}</p>
          </div>
        </div>
      )}

      {/* Segment 1: Opportunity Matches */}
      {activeSegment === 'opportunities' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((opp) => {
            const analysisResult = analyzeOpportunityMatch(opp);
            return (
              <div key={opp.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:border-orange-200 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${
                        opp.type === 'Scholarship' ? 'bg-blue-50 text-blue-900 border-blue-100' :
                        opp.type === 'Olympiad' ? 'bg-yellow-50 text-yellow-800 border-yellow-100' :
                        opp.type === 'Hackathon' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                        'bg-purple-50 text-purple-800 border-purple-100'
                      }`}>
                        {opp.type}
                      </span>
                      <h4 className="font-extrabold text-xs text-slate-805 mt-2 leading-snug">{opp.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-1">Provider: {opp.provider}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10.5px] font-black text-slate-900 bg-slate-50 border px-2.5 py-1 rounded-lg block">
                        🏆 {opp.prizePool}
                      </span>
                      <span className="text-[9px] text-emerald-600 bg-emerald-50/50 border border-emerald-100 font-extrabold px-1.5 py-0.5 rounded inline-block mt-1.5">
                        {analysisResult.score}% Smart Match
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-550 leading-relaxed pt-2">
                    {opp.description}
                  </p>

                  <div className="bg-slate-50/40 border border-slate-100 rounded-xl p-3 mt-3.5 space-y-2">
                    <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase block">RECOMMENDATION ALIGNMENT NOTES</span>
                    <ul className="space-y-1.5">
                      {analysisResult.reasons.map((reason, i) => (
                        <li key={i} className="text-[10px] text-slate-600 leading-normal flex items-start gap-1.5 font-medium">
                          <CheckCircle size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold">
                    ⏳ Deadline: {opp.deadline}
                  </span>
                  
                  {opp.applied ? (
                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3.5 py-1.5 rounded-lg border border-slate-150 select-none flex items-center gap-1">
                      Already Applied
                    </span>
                  ) : (
                    <button
                      onClick={() => onApplyOpportunity(opp.id)}
                      className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-[10px] px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm flex items-center gap-1"
                    >
                      <span>Apply directly</span>
                      <ChevronRight size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Segment 2: Collaborators & Connections */}
      {activeSegment === 'partners' && (
        <div className="space-y-6">
          <div className="space-y-1">
            <h4 className="text-xs font-black tracking-wider text-slate-400 uppercase">Classmates & Co-Scholars Matching Your Profile</h4>
            <p className="text-[10px] text-slate-400">Suggesting connections who have similar academic backgrounds or common sensor/astronomy interests</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {matchedCollaborators.map((user) => {
              const isInvited = invitedUsers.includes(user.name);
              const isConnected = connectedUsers.includes(user.name);
              return (
                <div key={user.name} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 hover:border-orange-200 transition-all flex flex-col justify-between">
                  
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
                          {user.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-xs text-slate-800 leading-none">{user.name}</h3>
                            <span className="text-[8px] bg-indigo-50 text-indigo-900 border border-indigo-100 px-1.5 py-0.5 rounded uppercase font-black">
                              {user.role}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-1 block leading-none">{user.school}</span>
                        </div>
                      </div>

                      <span className="text-[10px] text-orange-655 bg-orange-50/50 border border-orange-100 font-black px-2 py-0.5 rounded-lg shrink-0">
                        {user.matchScore}% Interest Match
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {user.reason}
                    </p>

                    <div className="flex flex-wrap gap-1 items-center pt-1 select-none">
                      <span className="text-[9px] font-bold uppercase text-slate-400 mr-1.5 flex items-center gap-0.5">
                        <Code size={11} /> Overlap skills:
                      </span>
                      {user.skills.map((skill, i) => (
                        <span key={i} className="text-[9.5px] font-bold text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => connectUser(user.name)}
                      disabled={isConnected}
                      className={`font-semibold text-[10px] px-3.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                        isConnected
                          ? 'bg-slate-50 text-slate-400 border-slate-150'
                          : 'border-slate-205 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <UserPlus size={11} />
                      <span>{isConnected ? 'Connection Requested' : 'Add to Network'}</span>
                    </button>

                    <button
                      onClick={() => inviteCollaborator(user.name)}
                      disabled={isInvited}
                      className={`font-extrabold text-[10.5px] px-4 py-1.5 rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer ${
                        isInvited
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-blue-955 text-white hover:bg-blue-900'
                      }`}
                    >
                      <MessageSquare size={11} />
                      <span>{isInvited ? 'Invitation Sent' : 'Invite to Collaborator'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Segment 3: AI Recommendations Plan */}
      {activeSegment === 'ai' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <span className="text-[8px] font-black text-orange-655 uppercase tracking-widest block">LLM GROUNDED DIRECTIVES</span>
              <h4 className="text-sm font-extrabold text-blue-950 mt-1">Sovereign Admissions & Olympiads Blueprint Guide</h4>
              <p className="text-[10px] text-slate-400">Instruct Gemini to analyze your transcript layers to point out unexplored government scholarships</p>
            </div>

            <button
              onClick={generateAiRecommendations}
              disabled={isAiLoading}
              className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md border active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isAiLoading ? (
                <RefreshCw size={13} className="animate-spin" />
              ) : (
                <Brain size={13} />
              )}
              Analyze Unexplored Paths
            </button>
          </div>

          {isAiLoading ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw size={24} className="text-orange-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-655 animate-pulse">Running trajectory index matching algorithms...</p>
              <p className="text-[9.5px] text-slate-400">Comparing urban irrigation CAD projects against Shastri criteria guidelines.</p>
            </div>
          ) : aiReport ? (
            <div className="space-y-5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Proposed Focus */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-1.5">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">SUGGESTED HIGH ACADEMIC FOCUS</span>
                  <p className="text-slate-700 leading-normal font-bold">
                    {aiReport.suggestedFocusArea}
                  </p>
                </div>

                {/* Portofolio Optimization tips */}
                <div className="bg-orange-50/20 border border-orange-105 rounded-xl p-4 space-y-1.5">
                  <span className="text-[8px] font-black text-orange-655 uppercase tracking-widest block">PORTFOLIO OPTIMIZATION ROADMAP</span>
                  <p className="text-slate-700 leading-normal font-bold">
                    {aiReport.competitorsTips}
                  </p>
                </div>
              </div>

              {/* Contests suggested by AI */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">UNEXPLORED FELLOWSHIPS & CONTEST BLUEPRINTS</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {aiReport.unexploredContests.map((c, i) => (
                    <div key={i} className="bg-white border rounded-xl p-3 space-y-1 shadow-sm">
                      <span className="font-bold text-slate-800 block text-[11px] leading-tight">{c.name}</span>
                      <span className="text-[8px] font-black text-blue-900 bg-blue-50 px-1 py-0.5 rounded uppercase">{c.type}</span>
                      <p className="text-[10px] text-slate-500 leading-normal pt-1.5 font-medium">{c.whyFit || (c as any).gapAddressed}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 border border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/20">
              <Compass size={32} className="text-slate-300 mx-auto" />
              <p className="font-bold text-xs text-slate-600">No Custom AI Recommendation Map generated.</p>
              <p className="text-[10px] text-slate-400 max-w-[210px] mx-auto leading-relaxed">
                Press "Analyze Unexplored Paths" to match your verified Olympiad standing and lunar research models against CBSE fellowships.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
