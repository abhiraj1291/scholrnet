import React, { useState } from 'react';
import { TeamRequest } from '../types';
import { Search, Users, ShieldAlert, PlusCircle, UserPlus, Check, X, FileText, Send } from 'lucide-react';

interface TeammateFinderProps {
  requests: TeamRequest[];
  onAddRequest: (req: TeamRequest) => void;
  onApplyToTeam: (id: string, name: string, school: string) => void;
  onUpdateApplicants: (requestId: string, studentName: string, status: 'accepted' | 'declined') => void;
  externalSearchQuery?: string;
}

export default function TeammateFinder({ requests, onAddRequest, onApplyToTeam, onUpdateApplicants, externalSearchQuery }: TeammateFinderProps) {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [oppName, setOppName] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !lookingFor.trim() || !desc.trim()) return;

    const newRequest: TeamRequest = {
      id: `team-${Date.now()}`,
      title: title.trim(),
      creatorName: "Aarav Sharma",
      creatorAvatar: "AS",
      school: "Delhi Public School, R.K. Puram",
      opportunityName: oppName.trim() || "Independent Collaboration",
      lookingFor: lookingFor.split(',').map(s => s.trim()).filter(s => s.length > 0),
      description: desc.trim(),
      applicants: []
    };

    onAddRequest(newRequest);

    // Reset
    setTitle('');
    setOppName('');
    setLookingFor('');
    setDesc('');
    setShowForm(false);
  };

  const filtered = requests.filter(req => {
    const query = (externalSearchQuery || searchQuery || '').toLowerCase();
    return (
      req.title.toLowerCase().includes(query) ||
      req.opportunityName.toLowerCase().includes(query) ||
      req.description.toLowerCase().includes(query) ||
      req.creatorName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
            <Users className="text-orange-650" size={18} />
            Co-Scholars & Teammate Recruitment Hub
          </h3>
          <p className="text-xs text-slate-400 mt-1">Join forces with peers across diverse districts to build high-scoring scientific presentations and olympiad groups</p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-950 hover:bg-blue-900 active:scale-95 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 transition-all self-start cursor-pointer focus:outline-none"
        >
          <PlusCircle size={14} /> Recruit Teammates
        </button>
      </div>

      {/* Recruiter Form */}
      {showForm && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-50 border border-slate-205 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
          <h4 className="font-bold text-slate-800 text-sm">Post Team Recruitment Request</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">RECRUITMENT TITLE*</label>
              <input
                type="text"
                placeholder="e.g. Seeking chemistry wiz for state science congress"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-500 font-bold mb-1">TARGET CONTEST/OPPORTUNITY</label>
              <input
                type="text"
                placeholder="e.g. Ignite High School Hackathon 2026"
                value={oppName}
                onChange={(e) => setOppName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">TALENT SOUGHT (COMMA SEPARATED)*</label>
            <input
              type="text"
              placeholder="e.g. React Native dev, UI Designer, Physics nerd"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none text-xs"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-bold mb-1">COLLABORATIVE PLAN DETAILS*</label>
            <textarea
              placeholder="Provide background. Where are you currently stuck? What timeline do you envision?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-20 focus:outline-none resize-none text-xs"
              required
            />
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-transparent text-slate-550 border border-slate-200 px-4 py-2 rounded-lg font-bold hover:bg-slate-100 cursor-pointer text-xs"
            >
              Discard
            </button>
            <button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-5 py-2 rounded-lg cursor-pointer text-xs"
            >
              Post Recruitment
            </button>
          </div>
        </form>
      )}

      {/* Filter search results */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter team requests by skill, contest name, or student..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-xs bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 w-full focus:outline-none focus:ring-1 focus:ring-blue-900"
        />
      </div>

      {/* Team Listings Layout */}
      <div className="space-y-5">
        {filtered.map(req => {
          const isMyRequest = req.creatorName === "Aarav Sharma";
          const alreadyApplied = req.applicants.some(a => a.name === "Aarav Sharma");

          return (
            <div key={req.id} className="border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors bg-slate-50/30 grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Left 2 Columns: Request Meta */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-orange-600 border text-white font-black text-xs flex items-center justify-center">
                    {req.creatorAvatar}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 text-xs block">{req.creatorName}</span>
                    <span className="text-[10px] text-slate-450 block">{req.school}</span>
                  </div>
                </div>

                <div>
                  <h4 className="font-extrabold text-slate-850 text-sm mb-1">{req.title}</h4>
                  <p className="text-[10px] text-blue-900 font-bold">Associated Target: {req.opportunityName}</p>
                  <p className="text-xs text-slate-600 leading-relaxed mt-2.5">{req.description}</p>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[9px] font-black tracking-wider text-slate-400 uppercase block">LOOKING FOR:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {req.lookingFor.map(role => (
                      <span key={role} className="bg-orange-50 border border-orange-100 text-orange-900 text-[10px] px-2.5 py-1 rounded-md font-bold">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Interaction Action & Applicants */}
              <div className="border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-slate-450 uppercase block tracking-wider">APPLICANT LISTING ({req.applicants.length})</span>

                  {req.applicants.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No join requests received yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                      {req.applicants.map(app => (
                        <div key={app.name} className="bg-slate-50 border border-slate-100 p-2 rounded-xl flex items-center justify-between text-[10.5px]">
                          <div>
                            <span className="font-bold text-slate-750 block">{app.name}</span>
                            <span className="text-[9px] text-slate-400 block truncate max-w-[120px]">{app.school}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {app.status === 'pending' ? (
                              isMyRequest ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => onUpdateApplicants(req.id, app.name, 'accepted')}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-md cursor-pointer"
                                    title="Accept Scholar"
                                  >
                                    <Check size={11} />
                                  </button>
                                  <button
                                    onClick={() => onUpdateApplicants(req.id, app.name, 'declined')}
                                    className="bg-red-550 hover:bg-red-650 text-white p-1 rounded-md cursor-pointer"
                                    title="Decline"
                                  >
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <span className="bg-yellow-50 text-yellow-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-yellow-200">
                                  PENDING
                                </span>
                              )
                            ) : app.status === 'accepted' ? (
                              <span className="bg-emerald-50 text-emerald-800 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200">
                                ACCEPTED
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-400 text-[9px] font-black px-1.5 py-0.5 rounded">
                                DECLINED
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50">
                  {isMyRequest ? (
                    <div className="text-[10px] text-slate-400 font-semibold bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 flex items-center gap-1 text-center justify-center">
                      <ShieldAlert size={12} className="text-blue-900" />
                      You own this recruitment request
                    </div>
                  ) : alreadyApplied ? (
                    <button className="w-full bg-slate-100 border text-slate-400 font-bold text-xs py-2 rounded-xl cursor-not-allowed flex items-center justify-center gap-1" disabled>
                      <Check size={13} /> Applied to join
                    </button>
                  ) : (
                    <button
                      onClick={() => onApplyToTeam(req.id, "Aarav Sharma", "Delhi Public School, R.K. Puram")}
                      className="w-full bg-orange-650 hover:bg-orange-700 text-white font-extrabold text-xs py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 focus:outline-none"
                    >
                      <UserPlus size={13} />
                      Request to Join Team
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
