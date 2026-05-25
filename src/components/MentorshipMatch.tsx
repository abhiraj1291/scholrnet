import React, { useState } from 'react';
import { Mentor, MentorshipRequest, MentorInteraction } from '../types';
import { 
  User, 
  Search, 
  BookOpen, 
  Briefcase, 
  Code, 
  Star, 
  Send, 
  MessageSquare, 
  Plus, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  GraduationCap, 
  Filter, 
  Calendar,
  Sparkles,
  Award,
  ChevronRight,
  ThumbsUp,
  XCircle,
  Hash
} from 'lucide-react';

interface MentorshipMatchProps {
  currentUser: { name: string; school: string; isVerified?: boolean };
  mentors: Mentor[];
  requests: MentorshipRequest[];
  onAddMentor: (newMentor: Mentor) => void;
  onSendRequest: (req: { mentorId: string; mentorName: string; subject: string; message: string }) => void;
  onAddInteraction: (requestId: string, note: string, author: string) => void;
  onCompleteAndRate: (
    requestId: string, 
    rating: number, 
    comment: string,
    detailed?: {
      communicationRating?: number;
      depthRating?: number;
      effectivenessRating?: number;
      keyTakeaway?: string;
      recommend?: boolean;
      topicsWorkedOn?: string[];
    }
  ) => void;
  onRespondToRequest?: (requestId: string, status: 'accepted' | 'declined') => void;
  externalSearchQuery?: string;
}

export default function MentorshipMatch({ 
  currentUser, 
  mentors, 
  requests, 
  onAddMentor, 
  onSendRequest, 
  onAddInteraction, 
  onCompleteAndRate,
  onRespondToRequest,
  externalSearchQuery
}: MentorshipMatchProps) {

  const [activeSubTab, setActiveSubTab] = useState<'find' | 'requests' | 'register'>('find');
  
  // Search and Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Teacher' | 'Coach' | 'Alumni'>('all');

  // Request form state
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [requestSubject, setRequestSubject] = useState('');
  const [requestMessage, setRequestMessage] = useState('');

  // Interaction logs state
  const [selectedRequest, setSelectedRequest] = useState<MentorshipRequest | null>(null);
  const [newInteractionNote, setNewInteractionNote] = useState('');

  // Rating state
  const [ratingVal, setRatingVal] = useState(5);
  const [feedbackCommentText, setFeedbackCommentText] = useState('');
  const [showRatingModal, setShowRatingModal] = useState<string | null>(null);
  
  // Custom qualitative feedback inputs
  const [communicationRating, setCommunicationRating] = useState(5);
  const [depthRating, setDepthRating] = useState(5);
  const [effectivenessRating, setEffectivenessRating] = useState(5);
  const [keyTakeaway, setKeyTakeaway] = useState('');
  const [recommend, setRecommend] = useState<boolean>(true);
  const [topicsWorkedOn, setTopicsWorkedOn] = useState<string[]>([]);

  // Esc key listener to cancel/close any active mentorship modal
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMentor(null);
        setShowRatingModal(null);
        setSelectedRequest(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Mentor registration form state
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<'Teacher' | 'Coach' | 'Alumni'>('Teacher');
  const [regInstitution, setRegInstitution] = useState('');
  const [regSubjects, setRegSubjects] = useState('');
  const [regCareerGoals, setRegCareerGoals] = useState('');
  const [regProjects, setRegProjects] = useState('');
  const [regBio, setRegBio] = useState('');

  // Handle mentor registration submission
  const handleRegisterMentor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regInstitution.trim() || !regBio.trim()) return;

    const subjectsArray = regSubjects.split(',').map(s => s.trim()).filter(Boolean);
    const careerGoalsArray = regCareerGoals.split(',').map(cg => cg.trim()).filter(Boolean);
    const projectsArray = regProjects.split(',').map(p => p.trim()).filter(Boolean);

    const newMentor: Mentor = {
      id: `mentor-${Date.now()}`,
      name: regName.trim(),
      role: regRole,
      avatar: regName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      institution: regInstitution.trim(),
      subjects: subjectsArray.length > 0 ? subjectsArray : ['General Studies'],
      careerGoals: careerGoalsArray.length > 0 ? careerGoalsArray : ['Higher Academics'],
      projects: projectsArray.length > 0 ? projectsArray : ['Custom Prototype Guide'],
      bio: regBio.trim(),
      rating: 5.0,
      isVerified: true
    };

    onAddMentor(newMentor);
    
    // Clear form
    setRegName('');
    setRegInstitution('');
    setRegSubjects('');
    setRegCareerGoals('');
    setRegProjects('');
    setRegBio('');
    
    // Switch to list
    setActiveSubTab('find');
  };

  // Handle submit mentorship request
  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMentor || !requestSubject.trim() || !requestMessage.trim()) return;

    onSendRequest({
      mentorId: selectedMentor.id,
      mentorName: selectedMentor.name,
      subject: requestSubject.trim(),
      message: requestMessage.trim()
    });

    // Clear form & modal
    setSelectedMentor(null);
    setRequestSubject('');
    setRequestMessage('');
    
    // Switch tab to requests
    setActiveSubTab('requests');
  };

  // Handle submit feedback & completion
  const handleFeedbackSubmit = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    onCompleteAndRate(reqId, ratingVal, feedbackCommentText.trim(), {
      communicationRating,
      depthRating,
      effectivenessRating,
      keyTakeaway: keyTakeaway.trim(),
      recommend,
      topicsWorkedOn
    });
    
    // Refresh selectedRequest view if open
    if (selectedRequest && selectedRequest.id === reqId) {
      setSelectedRequest(prev => prev ? { 
        ...prev, 
        status: 'completed', 
        feedbackRating: ratingVal, 
        feedbackComment: feedbackCommentText,
        communicationRating,
        depthRating,
        effectivenessRating,
        keyTakeaway: keyTakeaway.trim(),
        recommend,
        topicsWorkedOn
      } : null);
    }

    setShowRatingModal(null);
    setFeedbackCommentText('');
    setRatingVal(5);
    setCommunicationRating(5);
    setDepthRating(5);
    setEffectivenessRating(5);
    setKeyTakeaway('');
    setRecommend(true);
    setTopicsWorkedOn([]);
  };

  // Handle submit interaction note
  const handleAddInteractionNote = (e: React.FormEvent, reqId: string) => {
    e.preventDefault();
    if (!newInteractionNote.trim()) return;

    onAddInteraction(reqId, newInteractionNote.trim(), currentUser.name);
    
    // Update local visual state for selectedRequest
    if (selectedRequest) {
      const updatedInteractions: MentorInteraction[] = [
        ...selectedRequest.interactions,
        {
          date: new Date().toISOString().split('T')[0],
          author: currentUser.name,
          note: newInteractionNote.trim()
        }
      ];
      setSelectedRequest(prev => prev ? {
        ...prev,
        interactions: updatedInteractions,
        interactionCount: prev.interactionCount + 1
      } : null);
    }
    
    setNewInteractionNote('');
  };

  // Filter mentors list
  const filteredMentors = mentors.filter(mentor => {
    // Role filter
    if (roleFilter !== 'all' && mentor.role !== roleFilter) return false;

    // Search query matching subjects, career goals, projects, name, bio
    const trimQuery = (externalSearchQuery || searchQuery || '').trim();
    if (!trimQuery) return true;
    const query = trimQuery.toLowerCase();
    
    const matchesName = mentor.name.toLowerCase().includes(query);
    const matchesBio = mentor.bio.toLowerCase().includes(query);
    const matchesInstitution = mentor.institution.toLowerCase().includes(query);
    const matchesSubjects = mentor.subjects.some(s => s.toLowerCase().includes(query));
    const matchesCareer = mentor.careerGoals.some(cg => cg.toLowerCase().includes(query));
    const matchesProjects = mentor.projects.some(p => p.toLowerCase().includes(query));

    return matchesName || matchesBio || matchesInstitution || matchesSubjects || matchesCareer || matchesProjects;
  });

  return (
    <div className="space-y-6">
      {/* Tab Switchers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="space-y-1">
          <h2 className="text-sm font-extrabold text-blue-950 flex items-center gap-1.5 uppercase tracking-wider">
            <GraduationCap className="text-orange-550" size={16} />
            Academic Mentorship Matching
          </h2>
          <p className="text-[10px] text-slate-400">Connect with credentialed teachers, contest coaches, and university-based alumni</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl self-start sm:self-auto gap-1">
          <button
            onClick={() => { setActiveSubTab('find'); setSelectedRequest(null); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'find' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Find a Mentor ({filteredMentors.length})
          </button>
          <button
            onClick={() => setActiveSubTab('requests')}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'requests' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Interactions ({requests.length})
          </button>
          <button
            onClick={() => { setActiveSubTab('register'); setSelectedRequest(null); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
              activeSubTab === 'register' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            List Yourself as Mentor
          </button>
        </div>
      </div>

      {/* SubTab 1: Find a Mentor */}
      {activeSubTab === 'find' && (
        <div className="space-y-6">
          {/* Filtering Bento Bar */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-3 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search subjects, careers (e.g., 'Astro-Physics', 'Research', 'Stanford')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-700"
              />
            </div>

            <div className="flex gap-1.5 shrink-0 select-none">
              {(['all', 'Teacher', 'Coach', 'Alumni'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer capitalize ${
                    roleFilter === role
                      ? 'bg-blue-950 text-white shadow-sm'
                      : 'bg-slate-50 border border-slate-150 text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {role === 'all' ? 'All Roles' : role}
                </button>
              ))}
            </div>
          </div>

          {/* Mentors Grid */}
          {filteredMentors.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-100 rounded-2xl space-y-2">
              <User size={36} className="text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No mentors match your search criteria.</p>
              <p className="text-[10px] text-slate-400">Try modifying your query terms or selection tags.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map((mentor) => (
                <div key={mentor.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-orange-200 transition-all">
                  
                  {/* Avatar & Header */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 font-black text-sm flex items-center justify-center shrink-0">
                          {mentor.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-xs text-slate-800 leading-none">{mentor.name}</h3>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                              mentor.role === 'Teacher' 
                                ? 'bg-blue-50 text-blue-900 border border-blue-100' 
                                : mentor.role === 'Coach' 
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-100' 
                                : 'bg-purple-50 text-purple-900 border border-purple-100'
                            }`}>
                              {mentor.role}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 mt-1 block">{mentor.institution}</span>
                        </div>
                      </div>

                      {/* Coach rating */}
                      <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded text-[10px] font-bold text-yellow-700">
                        <Star size={11} className="fill-yellow-500 stroke-yellow-500" />
                        <span>{mentor.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                      {mentor.bio}
                    </p>

                    {/* Expertise Matrix Tags */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                          <BookOpen size={10} /> Experts:
                        </span>
                        {mentor.subjects.map((sub, i) => (
                          <span key={i} className="text-[9.5px] font-bold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                            {sub}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                          <Briefcase size={10} /> Careers:
                        </span>
                        {mentor.careerGoals.map((cg, i) => (
                          <span key={i} className="text-[9.5px] font-bold text-blue-900 bg-blue-50/40 px-2 py-0.5 rounded">
                            {cg}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap gap-1 items-center">
                        <span className="text-[9px] font-bold uppercase text-slate-400 flex items-center gap-1 shrink-0 mr-1">
                          <Code size={10} /> Projects:
                        </span>
                        {mentor.projects.map((p, i) => (
                          <span key={i} className="text-[9.5px] font-bold text-orange-655 bg-orange-50/30 px-2 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Button to request */}
                  <div className="pt-3 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={() => setSelectedMentor(mentor)}
                      className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-[10.5px] px-3.5 py-2 rounded-lg transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                    >
                      <span>Connect & Request guidance</span>
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Connect Modal Wrapper */}
          {selectedMentor && (
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedMentor(null);
              }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in cursor-pointer"
            >
              <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-150 space-y-4 cursor-default">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black uppercase text-orange-655 tracking-wider block">INITIATE CONNECTION CARD</span>
                    <h3 className="text-sm font-extrabold text-blue-950 mt-1">Request Mentorship from {selectedMentor.name}</h3>
                  </div>
                  <button 
                    onClick={() => setSelectedMentor(null)} 
                    className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Select Focus Topic / Subject</label>
                    <select
                      value={requestSubject}
                      onChange={(e) => setRequestSubject(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950"
                    >
                      <option value="">-- Choose academic focus --</option>
                      {selectedMentor.subjects.map((sub, idx) => (
                        <option key={idx} value={sub}>{sub}</option>
                      ))}
                      <option value="General Academic Planning">General Academic Planning</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold uppercase text-[9px]">Your Message representing your milestones</label>
                    <textarea
                      placeholder="Introduce yourself, your school, and the specific award, research project, or CBSE pathway you would like to consult..."
                      required
                      rows={4}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-150 rounded-lg p-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950 leading-relaxed"
                    />
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 border text-[10px] text-slate-400 leading-normal">
                    💡 <strong>Tip:</strong> Mentors accept requests quicker if you list clean, verified medals or draft research links in your profile folders beforehand!
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedMentor(null)}
                      className="px-4 py-2 border border-slate-250 text-slate-500 hover:bg-slate-50 rounded-lg font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-950 text-white font-extrabold rounded-lg flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <Send size={11} />
                      <span>Send Request</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Requests & Interactions Tracking */}
      {activeSubTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests Left Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">My Connections</h3>
            
            {requests.length === 0 ? (
              <div className="p-6 text-center bg-white border border-slate-100 rounded-2xl text-slate-400 text-xs">
                No active mentorship paths yet.
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => setSelectedRequest(req)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 cursor-pointer ${
                      selectedRequest?.id === req.id 
                        ? 'bg-blue-50/50 border-blue-950 shadow-xs' 
                        : 'bg-white border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full">
                      <div className="flex items-center justify-between w-full">
                        <span className="font-extrabold text-slate-755 text-xs truncate max-w-[150px]">{req.mentorName}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
                          req.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-800'
                            : req.status === 'completed'
                            ? 'bg-blue-50 text-blue-800'
                            : req.status === 'declined'
                            ? 'bg-red-50 text-red-800'
                            : 'bg-yellow-50 text-yellow-800'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded inline-block mt-1 font-bold">{req.subject}</span>
                    </div>

                    <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-relaxed">
                      {req.message}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 pt-2 border-t border-slate-100/50 w-full">
                      <span className="flex items-center gap-1 font-bold">
                        <MessageSquare size={11} /> {req.interactionCount} logs
                      </span>
                      <span>Sent {req.requestedAt}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactions Right Detail Area */}
          <div className="lg:col-span-2">
            {selectedRequest ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
                {/* Header detail */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-150">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-orange-655 uppercase tracking-wider block">GUIDANCE LOG ROOM</span>
                    <h3 className="text-sm font-extrabold text-blue-950 mt-1">Path with {selectedRequest.mentorName}</h3>
                    <p className="text-[10px] text-slate-400 font-bold">Consulting Domain: "{selectedRequest.subject}"</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedRequest.status === 'accepted' && (
                      <button
                        onClick={() => {
                          setRatingVal(5);
                          setFeedbackCommentText('');
                          setShowRatingModal(selectedRequest.id);
                        }}
                        className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-extrabold text-[10.5px] px-3.5 py-1.5 rounded-lg border border-emerald-150 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      >
                        <CheckCircle size={12} /> Leave Feedback & Close
                      </button>
                    )}
                    {selectedRequest.status === 'completed' && (
                      <span className="bg-blue-50 text-blue-800 text-[10px] font-black px-2.5 py-1.5 rounded border border-blue-100 flex items-center gap-1 select-none">
                        <CheckCircle size={12} /> MATCH COMPLETED
                      </span>
                    )}
                  </div>
                </div>

                {/* Initial proposal message */}
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4.5 space-y-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">INITIAL PROPOSAL MESSAGE</span>
                  <p className="text-[11.5px] text-slate-700 leading-normal whitespace-pre-line font-medium">
                    {selectedRequest.message}
                  </p>
                  <span className="text-[9px] text-slate-400 block pt-1 font-bold">Submitted by {selectedRequest.studentName} on {selectedRequest.requestedAt}</span>
                </div>

                {/* Interactions History logs list */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Interaction Timeline & Mentors Feedback Notes</h4>
                  
                  {selectedRequest.interactions.length === 0 ? (
                    <div className="p-4 bg-orange-50/10 border border-orange-105 border-dashed rounded-xl text-center text-slate-400 text-[10px] space-y-1">
                      <Clock size={16} className="mx-auto text-orange-400 inline-block align-middle mr-1.5" />
                      <span>Pending response note from mentor. New logs or chats will propagate here.</span>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {selectedRequest.interactions.map((it, idx) => (
                        <div key={idx} className="flex gap-3 leading-relaxed text-xs">
                          <div className={`w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center shrink-0 ${
                            it.author === currentUser.name 
                              ? 'bg-blue-950 text-white' 
                              : 'bg-orange-600 text-white'
                          }`}>
                            {it.author.split(' ').map(n=>n[0]).join('').substring(0, 2)}
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex-1 space-y-1 leading-relaxed">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-755 text-[10.5px]">{it.author}</span>
                              <span className="text-[9px] text-slate-400 font-bold">{it.date}</span>
                            </div>
                            <p className="text-slate-655 text-[11px] leading-relaxed font-bold whitespace-pre-wrap">
                              {it.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Feedback already left */}
                {selectedRequest.status === 'completed' && selectedRequest.feedbackRating && (
                  <div className="border border-indigo-200 bg-indigo-50/15 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest block">POST-METRIC ALUM PREP FEEDBACK SECURED</span>
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-normal">Status: Verified</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-1 text-slate-850 font-bold text-xs">
                          <span className="text-slate-400 font-extrabold uppercase text-[9px] w-24">Overall Quality:</span>
                          <div className="flex items-center gap-0.5 text-yellow-650">
                            {Array.from({ length: selectedRequest.feedbackRating }).map((_, idx) => (
                              <Star key={idx} size={12} className="fill-yellow-500 stroke-yellow-505 text-yellow-500" />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-850 font-bold text-xs">
                          <span className="text-slate-400 font-extrabold uppercase text-[9px] w-24">Communication:</span>
                          <div className="flex items-center gap-0.5 text-yellow-655">
                            {Array.from({ length: selectedRequest.communicationRating || selectedRequest.feedbackRating || 5 }).map((_, idx) => (
                              <Star key={idx} size={10} className="fill-yellow-500 stroke-yellow-505 text-yellow-500" />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-850 font-bold text-xs">
                          <span className="text-slate-400 font-extrabold uppercase text-[9px] w-24">Subject Depth:</span>
                          <div className="flex items-center gap-0.5 text-yellow-655">
                            {Array.from({ length: selectedRequest.depthRating || selectedRequest.feedbackRating || 5 }).map((_, idx) => (
                              <Star key={idx} size={10} className="fill-yellow-500 stroke-yellow-505 text-yellow-500" />
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-850 font-bold text-xs">
                          <span className="text-slate-400 font-extrabold uppercase text-[9px] w-24">Effectiveness:</span>
                          <div className="flex items-center gap-0.5 text-yellow-655">
                            {Array.from({ length: selectedRequest.effectivenessRating || selectedRequest.feedbackRating || 5 }).map((_, idx) => (
                              <Star key={idx} size={10} className="fill-yellow-500 stroke-yellow-505 text-yellow-500" />
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {selectedRequest.recommend !== undefined && (
                          <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold">Recommend mentor?</span>
                            <span className={`font-black uppercase text-[10px] ${selectedRequest.recommend ? 'text-emerald-600' : 'text-slate-500'}`}>
                              {selectedRequest.recommend ? "✓ Yes, Highly" : "Neutral"}
                            </span>
                          </div>
                        )}

                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 text-[11px] space-y-1">
                          <span className="text-slate-500 font-bold block text-[9px] uppercase tracking-wider">Key Takeaway Milestone:</span>
                          <p className="text-slate-700 font-bold italic leading-tight">
                            "{selectedRequest.keyTakeaway || "Consultation Completed Successfully"}"
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedRequest.topicsWorkedOn && selectedRequest.topicsWorkedOn.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Landmarks Addressed</span>
                        <div className="flex flex-wrap gap-1 text-[11px]">
                          {selectedRequest.topicsWorkedOn.map((topic, i) => (
                            <span key={i} className="text-[9.5px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRequest.feedbackComment && (
                      <div className="bg-white/60 p-3 rounded-xl border border-indigo-100/50 space-y-1 mt-1">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wide block">Narrative Student Evaluation</span>
                        <p className="text-[11px] text-slate-655 italic leading-relaxed">
                          "{selectedRequest.feedbackComment}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Add dynamic interaction form */}
                {selectedRequest.status === 'accepted' && (
                  <form onSubmit={(e) => handleAddInteractionNote(e, selectedRequest.id)} className="border-t border-slate-100 pt-4.5 space-y-2.5">
                    <div className="space-y-1">
                      <label className="block text-slate-400 font-bold uppercase text-[9px]">Add Update or Consultation Note</label>
                      <textarea
                        placeholder="Log update or ask follow-up questions (e.g., 'Draft corrected sir', 'Added the equations for review'...)"
                        required
                        rows={2}
                        value={newInteractionNote}
                        onChange={(e) => setNewInteractionNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950 leading-relaxed"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-[10px] px-4 py-2 rounded-lg flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer ml-auto"
                    >
                      <Send size={11} />
                      Log Consultation update
                    </button>
                  </form>
                )}

                {/* Under Simulation - simulated button for Counselor to quickly reply! */}
                {selectedRequest.status === 'pending' && (
                  <div className="border-t border-slate-100 pt-4.5 space-y-3">
                    <span className="text-[8px] font-black text-orange-655 bg-orange-50 border border-orange-105 px-2 py-0.5 rounded uppercase">Simulator Guidance Rail</span>
                    <p className="text-[10px] text-slate-500">You can simulate how a Mentor accepts or responds to this request by choosing an action:</p>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (onRespondToRequest) {
                            onRespondToRequest(selectedRequest.id, 'accepted');
                            // Instantly mirror in state
                            setSelectedRequest(prev => prev ? { ...prev, status: 'accepted' } : null);
                          }
                        }}
                        className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[10px] px-3.5 py-1.5 rounded-lg border border-emerald-150 cursor-pointer active:scale-95 transition-all"
                      >
                        Accept Connection
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (onRespondToRequest) {
                            onRespondToRequest(selectedRequest.id, 'declined');
                            setSelectedRequest(prev => prev ? { ...prev, status: 'declined' } : null);
                          }
                        }}
                        className="bg-red-50 text-red-800 hover:bg-red-100 font-bold text-[10px] px-3.5 py-1.5 rounded-lg border border-red-150 cursor-pointer active:scale-95 transition-all"
                      >
                        Ignore / Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-24 text-center bg-white border border-slate-100 rounded-2xl space-y-4">
                <MessageSquare size={36} className="text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">Select an active connection log from the list.</p>
                <p className="text-[10px] text-slate-400 max-w-[250px] mx-auto text-center leading-relaxed">
                  Evaluate your feedback timelines, upload research paper corrections, or leave stellar evaluation seals dynamically inside active mentoring hubs!
                </p>
              </div>
            )}
          </div>

          {/* Rating Modal Wrapper */}
          {showRatingModal && (
            <div 
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowRatingModal(null);
              }}
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-100 animate-fade-in overflow-y-auto cursor-pointer"
            >
              <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-150 space-y-4 text-xs my-0.5 sm:my-8 cursor-default">
                <div className="flex justify-between items-start pb-3 border-b border-slate-150">
                  <div>
                    <span className="text-[9px] font-black text-orange-655 uppercase tracking-widest block">QUALITATIVE ADVISOR REVIEW</span>
                    <h3 className="font-extrabold text-blue-950 text-sm mt-0.5">Comprehensive Mentorship Evaluation</h3>
                    <p className="text-[10.5px] text-slate-400 leading-normal font-medium mt-0.5">
                      Student portfolio ratings are locked via CBSE hashes to maintain elite validator standards.
                    </p>
                  </div>
                  <button onClick={() => setShowRatingModal(null)} className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer">×</button>
                </div>

                <form onSubmit={(e) => handleFeedbackSubmit(e, showRatingModal)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  
                  {/* Part 1: Overall Satisfaction Rating */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-2">
                    <label className="block text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                      ★ 1. Overall Guiding Quality
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRatingVal(star)}
                          className="hover:scale-110 transition-transform focus:outline-none cursor-pointer"
                        >
                          <Star
                            size={20}
                            className={`${
                              ratingVal >= star
                                ? 'fill-yellow-500 stroke-yellow-500 text-yellow-500'
                                : 'text-slate-200'
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 font-bold text-slate-850 text-[11px] bg-white border px-2 py-0.5 rounded shadow-2xs">
                        {ratingVal === 1 && "Need Improvement"}
                        {ratingVal === 2 && "Partially Helpful"}
                        {ratingVal === 3 && "Solid Consultation"}
                        {ratingVal === 4 && "Strong Accomplishments"}
                        {ratingVal === 5 && "Outstanding Pedagogy"}
                      </span>
                    </div>
                  </div>

                  {/* Part 2: High-Fidelity Performance Dimensions */}
                  <div className="space-y-3">
                    <span className="block text-slate-400 font-extrabold uppercase text-[9px] tracking-widest">
                      Multi-Dimensional Metrics
                    </span>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Communication Star Rating */}
                      <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-155 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-655 block">Communication clarity</span>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setCommunicationRating(star)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                size={12}
                                className={`${
                                  communicationRating >= star
                                    ? 'fill-yellow-500 stroke-yellow-400 text-yellow-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Technical/Subject Depth Star Rating */}
                      <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-155 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-655 block">Technical/Strategic Depth</span>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setDepthRating(star)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                size={12}
                                className={`${
                                  depthRating >= star
                                    ? 'fill-yellow-500 stroke-yellow-400 text-yellow-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Guidance Effectiveness Star Rating */}
                      <div className="bg-slate-50/50 p-2.5 rounded-lg border border-slate-155 flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-655 block">Effective Progress Help</span>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setEffectivenessRating(star)}
                              className="focus:outline-none cursor-pointer"
                            >
                              <Star
                                size={12}
                                className={`${
                                  effectivenessRating >= star
                                    ? 'fill-yellow-500 stroke-yellow-400 text-yellow-500'
                                    : 'text-slate-200'
                                }`}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 3: Project Milestones Worked On */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                      🎯 2. Consultation Milestones Addressed
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        "Olympiad Targets & Strategy",
                        "CBSE Board Prep Review",
                        "Scientific Method Design",
                        "Project Prototype Debugging",
                        "Engineering Code Revision",
                        "College Admissions Guidance"
                      ].map((topic) => {
                        const isSelected = topicsWorkedOn.includes(topic);
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setTopicsWorkedOn(prev => prev.filter(t => t !== topic));
                              } else {
                                setTopicsWorkedOn(prev => [...prev, topic]);
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold text-[10.5px] transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-950 text-white border-blue-950 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-350 hover:bg-slate-100'
                            }`}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Part 4: Key Takeaway Callout */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                      💬 3. Critical Breakthrough or Key Takeaway
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Successfully structured my research methodology and draft outline"
                      required
                      value={keyTakeaway}
                      onChange={(e) => setKeyTakeaway(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950 leading-relaxed transition-all"
                    />
                  </div>

                  {/* Part 5: Would you recommend Peer Check */}
                  <div className="space-y-1.5">
                    <label className="block text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                      💡 4. Recommend this Mentor to Other Scholars?
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setRecommend(true)}
                        className={`flex-1 py-2 text-center rounded-xl font-bold cursor-pointer border transition-all text-xs ${
                          recommend 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        ✓ Yes, highly recommended!
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecommend(false)}
                        className={`flex-1 py-2 text-center rounded-xl font-bold cursor-pointer border transition-all text-xs ${
                          !recommend 
                            ? 'bg-red-50 border-red-500 text-red-800 shadow-sm font-extrabold'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}
                      >
                        ✗ Neutral / Would not recommend
                      </button>
                    </div>
                  </div>

                  {/* Part 6: Qualitative Narrative Comments */}
                  <div className="space-y-1">
                    <label className="block text-slate-700 font-extrabold text-[10px] uppercase tracking-wider">
                      📝 5. Detailed Qualitative Narrative Feedback
                    </label>
                    <textarea
                      placeholder="Be specific! Describe what questions you asked, how the advisor helped you, and the general quality of guidance..."
                      required
                      rows={3}
                      value={feedbackCommentText}
                      onChange={(e) => setFeedbackCommentText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-950 leading-relaxed transition-all"
                    />
                  </div>

                  {/* Submission and Control Elements */}
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowRatingModal(null)}
                      className="px-3.5 py-2 border border-slate-250 text-slate-500 hover:bg-slate-50 rounded-xl font-bold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 text-white font-extrabold rounded-xl flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-transform"
                    >
                      <CheckCircle size={12} />
                      <span>Approve & Save Evaluation</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SubTab 3: List Yourself as Mentor */}
      {activeSubTab === 'register' && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-blue-950 flex items-center gap-1.5">
              <Sparkles className="text-orange-655" size={14} />
              Verified Board & Alumni Enrollment
            </h3>
            <p className="text-[10.5px] text-slate-400">Join the elite network of advisors guiding Indian school pupils</p>
          </div>

          <form onSubmit={handleRegisterMentor} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs text-slate-700">
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Full Verified Name</label>
                <input
                  type="text"
                  placeholder="e.g., Mrs. Priya Subramanian"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Your Counselor/Coach Role</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="Teacher">Teacher / Coordinator</option>
                  <option value="Coach">Olympiad Coach / Advisor</option>
                  <option value="Alumni">High-achieving Alumna/Alumnus</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Primary Affiliated Institution</label>
                <input
                  type="text"
                  placeholder="e.g., Delhi Public School, R.K Puram / Cornell University Alumni group"
                  required
                  value={regInstitution}
                  onChange={(e) => setRegInstitution(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px]">Sovereign Advisor Profile Bio</label>
                <textarea
                  placeholder="Share a short summary of your background, physics/coding awards coached, or higher admission insights..."
                  required
                  rows={4}
                  value={regBio}
                  onChange={(e) => setRegBio(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 leading-relaxed"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px] flex items-center justify-between">
                  <span>Subjects of Expertise</span>
                  <span className="text-slate-400 font-normal leading-none capitalize">comma separated</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Physics Mechanics, Calculus, Astronomy & Space"
                  required
                  value={regSubjects}
                  onChange={(e) => setRegSubjects(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px] flex items-center justify-between">
                  <span>Counseling Career Fields</span>
                  <span className="text-slate-400 font-normal leading-none capitalize">comma separated</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Software Engineer, Research Scientist, Ivy Admissions"
                  required
                  value={regCareerGoals}
                  onChange={(e) => setRegCareerGoals(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-slate-500 font-bold uppercase text-[9px] flex items-center justify-between">
                  <span>Projects / Academic Competitions Coached</span>
                  <span className="text-slate-400 font-normal leading-none capitalize">comma separated</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Mars rover CAD Prototyping, National Cyber Olympiad"
                  required
                  value={regProjects}
                  onChange={(e) => setRegProjects(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-[10.5px] text-slate-505 space-y-1.5 leading-relaxed">
                <span className="font-extrabold text-blue-901 uppercase tracking-wider text-[9px] flex items-center gap-1">
                  <Award size={12} className="text-orange-550" /> Administrative Credentials Verification
                </span>
                <p>
                  Mentorship profiles on ScholrNet require verified counselor registers. By enrolling in this sandbox simulator, your advisor token is pre-verified instantly so other students can connect, send proposals, or complete sessions under your name.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-950 hover:bg-blue-900 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Confirm Registration & List Profile
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
