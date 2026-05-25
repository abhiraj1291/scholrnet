import React, { useState } from 'react';
import { Opportunity } from '../types';
import { Search, Trophy, Briefcase, Calendar, Award, Check } from 'lucide-react';

interface OpportunitiesBoardProps {
  opportunities: Opportunity[];
  onApply: (id: string) => void;
  onFindTeammate: (opportunityName: string) => void;
  externalSearchQuery?: string;
}

export default function OpportunitiesBoard({ opportunities, onApply, onFindTeammate, externalSearchQuery }: OpportunitiesBoardProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'Scholarship' | 'Olympiad' | 'Hackathon' | 'Fellowship'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = opportunities.filter(opp => {
    const matchesCat = activeCategory === 'all' || opp.type === activeCategory;
    const query = (externalSearchQuery || searchQuery || '').toLowerCase();
    const matchesSearch = 
      opp.name.toLowerCase().includes(query) ||
      opp.provider.toLowerCase().includes(query) ||
      opp.description.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-850 text-base flex items-center gap-2">
            <Trophy className="text-orange-600" size={18} />
            National Academic Opportunities Directory
          </h3>
          <p className="text-xs text-slate-400 mt-1">Verified scholarships, government fellowships, code battles, and Olympiad calendars</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search opportunities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-2 w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-blue-900"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Listings' },
          { id: 'Scholarship', label: '💸 Scholarships' },
          { id: 'Olympiad', label: '🏅 Olympiads' },
          { id: 'Hackathon', label: '💻 Hackathons' },
          { id: 'Fellowship', label: '🔬 Fellowships' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as any)}
            className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
              activeCategory === tab.id
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-2">
            <Award size={36} className="mx-auto text-slate-300 animate-bounce" />
            <p className="font-semibold text-xs text-slate-600">No active opportunity listings found.</p>
          </div>
        ) : (
          filtered.map(opp => {
            let tagColor = "bg-emerald-50 border-emerald-100 text-emerald-800";
            if (opp.type === 'Scholarship') tagColor = "bg-orange-50 border-orange-100 text-orange-850";
            else if (opp.type === 'Olympiad') tagColor = "bg-blue-50 border-blue-105 text-blue-900";
            else if (opp.type === 'Fellowship') tagColor = "bg-purple-50 border-purple-105 text-purple-900";

            return (
              <div key={opp.id} className="border border-slate-150 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors bg-slate-50/10">
                <div className="space-y-3">
                  {/* Provider & Type */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase truncate max-w-[150px]" title={opp.provider}>
                      {opp.provider}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-md ${tagColor}`}>
                      {opp.type}
                    </span>
                  </div>

                  {/* Title & value */}
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-xs leading-snug">{opp.name}</h4>
                    <span className="text-[11px] font-bold text-orange-650 block mt-1.5">Stipend/Award: {opp.prizePool}</span>
                  </div>

                  {/* Desc */}
                  <p className="text-[11px] text-slate-600 leading-normal">{opp.description}</p>

                  {/* Eligibility */}
                  <div className="bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-[10px] space-y-1 text-slate-600">
                    <span className="font-bold text-slate-700 block">ELIGIBILITY:</span>
                    <p className="leading-normal">{opp.eligibility}</p>
                  </div>
                </div>

                <div className="border-t border-slate-100/75 mt-4 pt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-450 font-medium">
                    <Calendar size={11} />
                    <span>Apply before: {opp.deadline}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Find Teammate Trigger */}
                    {opp.type === 'Hackathon' && (
                      <button
                        onClick={() => onFindTeammate(opp.name)}
                        className="text-[9px] font-bold text-blue-950 bg-blue-50 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-all cursor-pointer focus:outline-none"
                      >
                        Find teammates
                      </button>
                    )}

                    {opp.applied ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-800 px-3 py-1.5 border border-emerald-100 rounded-lg">
                        <Check size={9} /> Applied
                      </span>
                    ) : (
                      <button
                        onClick={() => onApply(opp.id)}
                        className="bg-orange-600 hover:bg-orange-700 text-[10px] font-extrabold text-white px-3.5 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
