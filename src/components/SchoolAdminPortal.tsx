import React, { useState } from 'react';
import { VerificationRequest, School, SchoolAnnouncement } from '../types';
import { 
  ShieldCheck, 
  User, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  Clock, 
  Lock, 
  Search, 
  UserPlus, 
  Sliders, 
  BookOpen, 
  Sparkles, 
  Award,
  Globe,
  Star,
  Users,
  Edit2,
  Megaphone,
  Plus,
  Trash2,
  ExternalLink,
  Tag,
  Download,
  Terminal,
  AlertCircle
} from 'lucide-react';

interface SchoolAdminPortalProps {
  requests: VerificationRequest[];
  schoolName: string;
  onApproveRequest: (id: string, signHash: string) => void;
  onRejectRequest: (id: string) => void;
  schools: School[];
  selectedSchoolId: string;
  onPublishAnnouncement: (schoolId: string, announce: Partial<SchoolAnnouncement>) => void;
  onDeleteAnnouncement: (schoolId: string, announceId: string) => void;
  registeredEventIds?: string[];
}

export default function SchoolAdminPortal({ 
  requests, 
  schoolName, 
  onApproveRequest, 
  onRejectRequest,
  schools,
  selectedSchoolId,
  onPublishAnnouncement,
  onDeleteAnnouncement,
  registeredEventIds = []
}: SchoolAdminPortalProps) {
  const [adminTab, setAdminTab] = useState<'backlog' | 'roster' | 'showcase' | 'publications'>('backlog');
  const [rosterSearch, setRosterSearch] = useState('');

  // School posting creator states
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'announcement' | 'event' | 'resource'>('announcement');
  const [postBadgeText, setPostBadgeText] = useState('Official Circular');
  
  // Custom posting meta states
  const [eventDeadline, setEventDeadline] = useState('25-June-2026');
  const [eventReward, setEventReward] = useState('Verification Gold Seal & CBSE Credit Units');
  const [downloadUrl, setDownloadUrl] = useState('https://cbse.gov.in/curriculum-docs-2026.pdf');
  const [fileSize, setFileSize] = useState('1.8 MB');

  const school = schools.find(s => s.id === selectedSchoolId) || schools[0];
  
  // Simulated Roster Database state
  const [studentRoster, setStudentRoster] = useState([
    { id: 'ros-1', name: "Aarav Sharma", grade: "Class XII - Science (PCM)", status: "Active", verifiedSeals: 4, averageGrade: "96.4%", counselorNote: "Highly proactive in STEM projects; selected for national astronomy elite tier." },
    { id: 'ros-2', name: "Sneha Kapoor", grade: "Class XII - Science (PCB)", status: "Active", verifiedSeals: 5, averageGrade: "98.2%", counselorNote: "Exceptional research presentation skills. CBSE Regional state topper candidate." },
    { id: 'ros-3', name: "Vedant Mishra", grade: "Class XII - Commerce", status: "Active", verifiedSeals: 3, averageGrade: "94.8%", counselorNote: "Secured top positions in state math Olympiads. Preparing finance paper." },
    { id: 'ros-4', name: "Raj Kumar", grade: "Class XI - Technical", status: "Active", verifiedSeals: 2, averageGrade: "91.5%", counselorNote: "Focusing on hardware engineering & smart robotic prototyping." },
    { id: 'ros-5', name: "Prisha Mehra", grade: "Class XI - Science (PCM)", status: "Active", verifiedSeals: 1, averageGrade: "92.0%", counselorNote: "CAD modeling and robotics club assistant leads." }
  ]);
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  const pending = requests.filter(r => r.status === 'pending');
  const processed = requests.filter(r => r.status !== 'pending');

  const handleApprove = (id: string) => {
    const signatureHash = `SCHOLR-SEAL-${Math.random().toString(16).substring(2, 10).toUpperCase()}-${new Date().getFullYear()}`;
    onApproveRequest(id, signatureHash);
  };

  const toggleStudentStatus = (id: string) => {
    setStudentRoster(prev => prev.map(st => {
      if (st.id === id) {
        return { ...st, status: st.status === "Active" ? "Suspended" : "Active" };
      }
      return st;
    }));
  };

  const startEditingNote = (id: string, currentNote: string) => {
    setEditingNoteId(id);
    setTempNoteText(currentNote);
  };

  const saveNote = (id: string) => {
    setStudentRoster(prev => prev.map(st => {
      if (st.id === id) {
        return { ...st, counselorNote: tempNoteText };
      }
      return st;
    }));
    setEditingNoteId(null);
  };

  const filteredRoster = studentRoster.filter(st => 
    st.name.toLowerCase().includes(rosterSearch.toLowerCase()) ||
    st.grade.toLowerCase().includes(rosterSearch.toLowerCase())
  );

  return (
    <div id="school-admin-dashboard" className="space-y-6">
      {/* Admin Dashboard Stats Header (Flattened & Minimal) */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 bg-blue-900 border border-blue-700/50 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-blue-200">
              <ShieldCheck size={11} className="text-emerald-400" />
              Administrative Verification Sealed Access
            </span>
            <h3 className="text-xl font-bold tracking-tight">{schoolName}</h3>
            <p className="text-xs text-slate-300">Evaluating transcripts, olympiad scoring guilds, and student-caps milestone folders</p>
          </div>

          {/* Quick Stats Bento */}
          <div className="grid grid-cols-3 gap-3 text-center self-stretch md:self-auto">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[90px] sm:min-w-[110px]">
              <span className="block text-2xl font-black text-emerald-400">{processed.filter(r => r.status === 'approved').length + 15}</span>
              <span className="text-[9px] text-slate-350 font-medium uppercase tracking-wider block mt-1">Total Verified</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[90px] sm:min-w-[110px]">
              <span className="block text-2xl font-black text-yellow-400">{pending.length}</span>
              <span className="text-[9px] text-slate-350 font-medium uppercase tracking-wider block mt-1">Requests</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 min-w-[90px] sm:min-w-[110px]">
              <span className="block text-2xl font-black text-blue-400">98.2%</span>
              <span className="text-[9px] text-slate-350 font-medium uppercase tracking-wider block mt-1">Trust Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* Counselor Core Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2">
        <button
          id="tab-backlog-btn"
          onClick={() => setAdminTab('backlog')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            adminTab === 'backlog'
              ? 'border-orange-500 text-orange-655 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📝 Backlog Queue ({pending.length})
        </button>
        <button
          id="tab-roster-btn"
          onClick={() => setAdminTab('roster')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            adminTab === 'roster'
              ? 'border-orange-500 text-orange-655 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📋 Student Roster Management
        </button>
         <button
          id="tab-showcase-btn"
          onClick={() => setAdminTab('showcase')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            adminTab === 'showcase'
              ? 'border-orange-500 text-orange-655 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🌟 School Public Showcase Page
        </button>
        <button
          id="tab-publications-btn"
          onClick={() => setAdminTab('publications')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            adminTab === 'publications'
              ? 'border-orange-500 text-orange-655 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📢 Dispatch & Events Board
        </button>
      </div>

      {/* Backlog Tab Content */}
      {adminTab === 'backlog' && (
        <div id="admin-panel-backlog" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left Side: Backlog Requests */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Clock size={14} className="text-orange-550" />
                    Counselor Verification Backlog
                  </h4>
                  <p className="text-[10px] text-slate-400">Accept and seal student certifications with high authenticity logs</p>
                </div>
                <span className="bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 font-bold text-[10px] px-2 py-0.5 rounded border border-yellow-105 dark:border-yellow-900/50">
                  {pending.length} Pending
                </span>
              </div>

              {pending.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                  <p className="font-extrabold text-xs text-slate-655 dark:text-slate-350">All student record verifications are complete!</p>
                  <p className="text-[10px] text-slate-400">New requests will instantly propagate here in real-time.</p>
                </div>
              ) : (
                <div className="space-y-4.5">
                  {pending.map((req) => (
                    <div key={req.id} className="border border-slate-150 dark:border-slate-850 rounded-xl p-4.5 bg-slate-50/20 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3.5">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[10px] flex items-center justify-center">
                              {req.studentName.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">{req.studentName}</span>
                          </div>
                          <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Submitted at {req.requestedAt}</span>
                        </div>

                        <span className="text-[9px] font-black uppercase text-blue-900 dark:text-blue-200 bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 rounded-md border border-blue-105 dark:border-blue-900">
                          {req.category}
                        </span>
                      </div>

                      <div className="bg-white dark:bg-[#1b2234] border border-slate-150 dark:border-slate-800 rounded-xl p-3.5 space-y-2">
                        <h5 className="font-bold text-xs text-slate-850 dark:text-slate-200 leading-tight">{req.achievementTitle}</h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-350 leading-relaxed">{req.details}</p>
                        
                        {req.certificateName && (
                          <div className="inline-flex items-center gap-1.5 border border-slate-150 dark:border-slate-850 bg-slate-50 dark:bg-slate-900 rounded-lg px-2.5 py-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                            <FileText size={11} className="text-orange-655" />
                            <span>{req.certificateName}</span>
                          </div>
                        )}
                      </div>

                      {/* Counselor approval action buttons - ONE CLICK CHANNELS */}
                      <div className="flex items-center gap-2.5 pt-1 justify-end border-t border-slate-100 dark:border-slate-800">
                        <button
                          onClick={() => onRejectRequest(req.id)}
                          className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-1.5 rounded-lg transition-all cursor-pointer focus:outline-none"
                        >
                          ❌ Request Revision
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="text-[10.5px] font-extrabold text-white bg-orange-600 hover:bg-orange-700 px-5 py-1.5 rounded-lg transition-all flex items-center gap-1 cursor-pointer focus:outline-none"
                        >
                          <ShieldCheck size={12} /> Sign & Verify Seal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Processed Requests & Administrative Rules */}
          <div className="space-y-6">
            {/* SEC: Verification Ledger */}
            <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-3.5">
              <h4 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Verification History Ledger</h4>
              
              {processed.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic">No processed requests logged yet in this session.</p>
              ) : (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {processed.map(req => (
                    <div key={req.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/10 dark:bg-slate-900/60 flex items-center justify-between gap-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-extrabold text-slate-755 dark:text-slate-200 text-[11px] block truncate">{req.achievementTitle}</span>
                        <span className="text-[9px] text-slate-455 block truncate">Applicant: {req.studentName}</span>
                      </div>

                      <div>
                        {req.status === 'approved' ? (
                          <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 text-[9px] font-black px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-900 shrink-0">
                            SEALED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-400 text-[9px] font-black px-2 py-0.5 rounded border border-red-100 dark:border-red-900 shrink-0">
                            REVISION
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Guidelines Box */}
            <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-blue-400">
                <Lock size={12} />
                <span className="text-[10px] font-black tracking-wider uppercase">Administrative Directives</span>
              </div>

              <div className="text-[10.5px] text-slate-350 leading-relaxed space-y-2.5">
                <p>
                  <strong className="text-white">Strict Audit Trails:</strong> Every verification logged publishes a secure hash signature directly readable by prospective admission guilds.
                </p>
                <p>
                  <strong className="text-white">Revision Guidance:</strong> When requesting updates, describe exactly which certificate seals feel blurry or missing.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Roster-Tab Content */}
      {adminTab === 'roster' && (
        <div id="admin-panel-roster" className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm space-y-4.5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Users size={14} className="text-[#e75107]" />
                DPS RK Puram Student Registry Roster
              </h4>
              <p className="text-[10px] text-slate-400">Inspect academic standings, registry flags, and update confidential school comments</p>
            </div>
            
            {/* Search filter for roster */}
            <div className="relative w-full sm:w-64">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                placeholder="Search registry names or classes..."
                className="w-full text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-850 rounded-xl pl-8 pr-3 py-1.5 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Registry Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200 border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Class/Grade Division</th>
                  <th className="p-3">Aptitude Avg</th>
                  <th className="p-3 text-center">Verified Seals</th>
                  <th className="p-3">Registry Standing</th>
                  <th className="p-3">Confidential Counselor Counselor Notes</th>
                  <th className="p-3 text-right">Administrative Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRoster.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                    <td className="p-3 font-extrabold text-slate-850 dark:text-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-orange-600 font-extrabold text-[10px] text-white flex items-center justify-center">
                          {st.name.split(' ').map(n=>n[0]).join('')}
                        </div>
                        <span>{st.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400 font-medium">{st.grade}</td>
                    <td className="p-3 font-mono font-bold text-orange-655">{st.averageGrade}</td>
                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-200">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#fff9f9] dark:bg-slate-900 border border-[#c15908] dark:border-slate-800 text-[10px] font-extrabold text-orange-655 dark:text-orange-400">
                        🏆 {st.verifiedSeals} Sealed
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black tracking-wide uppercase ${
                        st.status === 'Active' 
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' 
                          : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-100 dark:border-red-900/50'
                      }`}>
                        {st.status}
                      </span>
                    </td>
                    <td className="p-3 max-w-sm">
                      {editingNoteId === st.id ? (
                        <div className="flex gap-1.5">
                          <textarea
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            className="text-[10px] p-2 border border-slate-250 dark:border-slate-850 rounded-lg focus:outline-none w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                            rows={2}
                          />
                          <button
                            onClick={() => saveNote(st.id)}
                            className="bg-orange-600 hover:bg-orange-750 text-white font-black text-[9px] px-2.5 py-1 rounded-md"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1 group">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic truncate-3-lines">
                            {st.counselorNote || "No notes logged yet."}
                          </span>
                          <button
                            onClick={() => startEditingNote(st.id, st.counselorNote)}
                            className="text-slate-400 hover:text-slate-800 dark:hover:text-white p-0.5 shrink-0"
                            title="Edit notes"
                          >
                            <Edit2 size={10} />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toggleStudentStatus(st.id)}
                        className={`text-[9px] uppercase tracking-wider px-2.5 py-1.5 rounded-md font-black cursor-pointer transition-colors ${
                          st.status === 'Active'
                            ? 'bg-red-50 dark:bg-red-950/20 text-red-755 hover:bg-red-100'
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-755 hover:bg-emerald-100'
                        }`}
                      >
                        {st.status === 'Active' ? "🚩 Flag Registry" : "✅ Restore Registration"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Public-Showcase Tab Content */}
      {adminTab === 'showcase' && (
        <div id="admin-panel-showcase" className="space-y-6 animate-fade-in">
          {/* Showcase header decoration banner */}
          <div className="bg-gradient-to-r from-blue-950 to-orange-600 rounded-2xl p-6.5 text-white flex flex-col sm:flex-row justify-between items-center gap-4 relative overflow-hidden">
            <div className="space-y-1.5 text-center sm:text-left">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-[9px] font-black uppercase tracking-widest text-orange-200">
                <Globe size={11} className="text-orange-400" /> Live Public Board Portfolio Link
              </span>
              <h4 className="text-lg font-bold tracking-tight">DPS RK Puram Elite High-Flier Scholars</h4>
              <p className="text-xs text-slate-200">This directory connects Ivy League admissions boards with our verified seal owners directly.</p>
            </div>
            
            <a 
              href="#copy" 
              onClick={(e) => {
                e.preventDefault();
                alert("DPS RK Puram Global Showcase Link copied to clipboard! (Simulated)");
              }}
              className="px-4.5 py-2 bg-white text-blue-950 hover:bg-orange-50 font-black text-xs rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
            >
              <Globe size={13} /> Copy Directory URL
            </a>
          </div>

          {/* Grid of Elite Student Profiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Aarav Sharma card */}
            <div className="bg-white dark:bg-[#131924] border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 bg-orange-600 text-white rounded-xl font-black text-sm flex items-center justify-center">
                  AS
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-blue-105">
                    AIR 42 NCO
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Aarav Sharma</h5>
                <span className="text-[10px] text-[#e75107] font-bold">Class XII - Science (PCM)</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Ambitious coder and astronomy model researcher. Developing gravity anomalistic curves for Lunar craters and CAPS robotic suspension blocks.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Seals</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">🌟 4 Gold Badges</span>
              </div>
            </div>

            {/* Sneha Kapoor card */}
            <div className="bg-white dark:bg-[#131924] border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl font-black text-sm flex items-center justify-center">
                  SK
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-emerald-105">
                    CBSE 98.2% List
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Sneha Kapoor</h5>
                <span className="text-[10px] text-emerald-600 font-bold">Class XII - Science (PCB)</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Passionate genetics major and chemistry diagnostic assistant. Published a complete biology workbook layout for school revision.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Seals</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">🌟 5 Gold Badges</span>
              </div>
            </div>

            {/* Vedant Mishra card */}
            <div className="bg-white dark:bg-[#131924] border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 bg-blue-900 text-white rounded-xl font-black text-sm flex items-center justify-center">
                  VM
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 text-[8.5px] font-black uppercase px-2 py-0.5 rounded border border-indigo-110">
                    Calculus Leader
                  </span>
                </div>
              </div>

              <div>
                <h5 className="font-extrabold text-sm text-slate-800 dark:text-slate-100">Vedant Mishra</h5>
                <span className="text-[10px] text-blue-900 dark:text-blue-400 font-bold">Class XII - Commerce</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Olympiad mathematical gold medalist. Actively designing predictive analytics charts and studying economic indexes for commercial boards.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Verified Seals</span>
                <span className="text-xs font-black text-slate-800 dark:text-white">🌟 3 Gold Badges</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Publications Dispatch & Events Board Tab Content */}
      {adminTab === 'publications' && (
        <div id="admin-publications-hub" className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-xs">
          {/* Left Block: Publications Builder Form */}
          <div className="lg:col-span-1 bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="pb-2.5 border-b border-slate-100 dark:border-slate-850">
              <h4 className="font-extrabold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                <Megaphone size={14} className="text-[#e75107]" />
                Dispatch Custom Bulletin
              </h4>
              <p className="text-[10px] text-slate-450 mt-0.5">Publish certified guidelines, co-curricular events, or digital study resources instantly.</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (!postTitle.trim() || !postContent.trim()) return;
              
              onPublishAnnouncement(school.id, {
                title: postTitle.trim(),
                content: postContent.trim(),
                badgeText: postBadgeText.trim(),
                type: postType,
                eventDeadline: postType === 'event' ? eventDeadline : undefined,
                eventReward: postType === 'event' ? eventReward : undefined,
                downloadUrl: postType === 'resource' ? downloadUrl : undefined,
                fileSize: postType === 'resource' ? fileSize : undefined
              });

              setPostTitle('');
              setPostContent('');
              setPostBadgeText('Official Circular');
            }} className="space-y-4 text-xs">
              {/* Type Selection */}
              <div>
                <label className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-2">Publications Channel Type</label>
                <div className="grid grid-cols-3 gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
                  {(['announcement', 'event', 'resource'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setPostType(t);
                        setPostBadgeText(t === 'announcement' ? 'Circular' : t === 'event' ? 'Competition Update' : 'Academic Resource');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider text-center cursor-pointer transition-all ${
                        postType === t
                          ? 'bg-[#e75107]/10 dark:bg-[#e75107]/20 text-[#e75107] border border-[#e75107]/25'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-750'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Badge */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Bulletin Title</label>
                  <input
                    type="text"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    placeholder="e.g. Winter Semester Practical Lab Dates"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-lg p-2.5 font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-550"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Badge Title tag</label>
                  <input
                    type="text"
                    value={postBadgeText}
                    onChange={(e) => setPostBadgeText(e.target.value)}
                    placeholder="e.g. Official Notice, Honors"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg p-2.5 font-bold text-[#e75157] focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Sub fields */}
              {postType === 'event' && (
                <div className="grid grid-cols-1 gap-3 bg-orange-52/20 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 p-3 rounded-xl">
                  <div>
                    <label className="block text-[9.5px] text-orange-600 font-black uppercase mb-1">Registration Cut-off Date</label>
                    <input
                      type="text"
                      value={eventDeadline}
                      onChange={(e) => setEventDeadline(e.target.value)}
                      placeholder="e.g. 15-June-2026"
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold focus:outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] text-orange-600 font-black uppercase mb-1">Rewards & Honors</label>
                    <input
                      type="text"
                      value={eventReward}
                      onChange={(e) => setEventReward(e.target.value)}
                      placeholder="e.g. Cash Prize & Verified Certificate"
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold focus:outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {postType === 'resource' && (
                <div className="grid grid-cols-1 gap-3 bg-blue-52/20 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3 rounded-xl">
                  <div>
                    <label className="block text-[9.5px] text-[#0a66c2] font-black uppercase mb-1">Syllabus PDF / Material Link</label>
                    <input
                      type="text"
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="e.g. https://domain.edu/notes.pdf"
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold focus:outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] text-[#0a66c2] font-black uppercase mb-1">Document File Size</label>
                    <input
                      type="text"
                      value={fileSize}
                      onChange={(e) => setFileSize(e.target.value)}
                      placeholder="e.g. 1.8 MB"
                      className="w-full text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold focus:outline-none text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Main Narrative */}
              <div>
                <label className="block text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mb-1">Bulletin Narrative Body</label>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Provide precise steps, challenge scopes, or registration instruction links..."
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 h-24 resize-none text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none font-medium"
                  required
                />
              </div>

              {/* Submit Dispatch */}
              <button
                type="submit"
                className="w-full bg-[#e75107] hover:bg-[#c13d00] active:scale-95 text-white font-black text-xs py-2.5 rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none"
              >
                <Plus size={14} /> Seal and Broadcast Board
              </button>
            </form>
          </div>

          {/* Right Block: Current Postings Audit & Live Enrollment Registry */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl p-4.5">
              <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-200">Active Publications Board Control</h4>
              <p className="text-[10.5px] text-slate-450 mt-1">Review active events, enrollment status logs, and circular downloads. Revoke/Retract listings at any time.</p>
            </div>

            {school.announcements.length === 0 ? (
              <div className="bg-white dark:bg-[#131924] border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
                <AlertCircle size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-bold">No active broadcast bulletins exist for {school.name}.</p>
                <p className="text-[10px]">Utilize the editor on the left to queue and seal a dispatch.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {school.announcements.map((ann) => {
                  const hasAaravSignedUp = registeredEventIds.includes(ann.id);
                  const isEvent = ann.type === 'event' || ann.badgeText?.toLowerCase().includes('event') || ann.badgeText?.toLowerCase().includes('comp');
                  const isResource = ann.type === 'resource' || ann.badgeText?.toLowerCase().includes('resource') || ann.badgeText?.toLowerCase().includes('circular');

                  return (
                    <div key={ann.id} className="bg-white dark:bg-[#131924] border border-slate-150 dark:border-slate-850 rounded-2xl p-5 shadow-3xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                              isEvent 
                                ? 'bg-orange-50 dark:bg-orange-950/30 text-[#e75107] border border-orange-100' 
                                : isResource 
                                  ? 'bg-blue-50 dark:bg-blue-950/30 text-[#0a66c2] border border-blue-100'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                            }`}>
                              {ann.badgeText || "Circular"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold">{ann.timestamp}</span>
                          </div>
                          <h4 className="font-extrabold text-xs text-slate-850 dark:text-slate-100 truncate">{ann.title}</h4>
                        </div>

                        {/* Revoke button */}
                        <button
                          onClick={() => onDeleteAnnouncement(school.id, ann.id)}
                          className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all shrink-0 cursor-pointer"
                          title="Revoke Post"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed whitespace-pre-wrap font-medium">{ann.content}</p>

                      {/* Display sub fields specifically */}
                      {isEvent && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-orange-50/10 dark:bg-slate-900 border border-orange-105/60 dark:border-slate-800 p-3 rounded-xl">
                          <div>
                            <span className="text-[8.5px] uppercase font-black text-slate-400 block tracking-wider">REGISTRATION DEADLINE</span>
                            <span className="text-[11px] font-bold text-slate-800 dark:text-white mt-0.5 block">{ann.eventDeadline || "30-June-2026"}</span>
                          </div>
                          <div>
                            <span className="text-[8.5px] uppercase font-black text-slate-400 block tracking-wider">CERTIFICATE REWARD</span>
                            <span className="text-[11px] font-bold text-orange-655 dark:text-orange-400 mt-0.5 block flex items-center gap-1">
                              <Award size={11} /> {ann.eventReward || "Verification Badge"}
                            </span>
                          </div>
                        </div>
                      )}

                      {isResource && (
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-blue-50/10 dark:bg-slate-900 border border-blue-105/60 dark:border-slate-800 p-3 rounded-xl text-xs font-mono">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{ann.downloadUrl || "https://cbse.gov.in/notes.pdf"}</span>
                          <span className="text-[9.5px] font-bold text-[#0a66c2] bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md">{ann.fileSize || "1.5 MB"}</span>
                        </div>
                      )}

                      {/* Event Enrollment Live Tracking Section */}
                      {isEvent && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Live Participant Signups</span>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {hasAaravSignedUp ? (
                              <div className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900 rounded-lg py-1 px-2.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400">Aarav Sharma</span>
                                <span className="text-[9px] text-emerald-600/70 font-semibold">(Registered Student)</span>
                              </div>
                            ) : null}
                            
                            {/* Standard simulation signup list */}
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-lg py-1 px-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span className="text-[10px] font-semibold text-slate-655 dark:text-slate-350">Sneha Kapoor</span>
                              <span className="text-[9px] text-slate-400">(Class XII)</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-lg py-1 px-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              <span className="text-[10px] font-semibold text-slate-655 dark:text-slate-350">Vedant Mishra</span>
                              <span className="text-[9px] text-slate-400">(Class XII)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
