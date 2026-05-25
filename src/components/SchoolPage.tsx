import React, { useState } from 'react';
import { motion } from 'motion/react';
import { School, SchoolAnnouncement } from '../types';
import { 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  ShieldCheck, 
  Globe, 
  FileText, 
  Megaphone, 
  Plus, 
  Heart, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Award,
  LayoutGrid,
  List,
  MessageCircle,
  Eye,
  Info
} from 'lucide-react';

interface SchoolPageProps {
  schools: School[];
  selectedSchoolId: string;
  onSelectSchool: (id: string) => void;
  onViewStudentProfile: (name: string) => void;
  isCounselorOfThisSchool: boolean;
  onPublishAnnouncement: (schoolId: string, announce: Partial<SchoolAnnouncement>) => void;
  onDeleteAnnouncement?: (schoolId: string, announceId: string) => void;
  registeredEventIds?: string[];
  onToggleEventRegistration?: (announceId: string) => void;
}

export default function SchoolPage({
  schools,
  selectedSchoolId,
  onSelectSchool,
  onViewStudentProfile,
  isCounselorOfThisSchool,
  onPublishAnnouncement,
  onDeleteAnnouncement,
  registeredEventIds = [],
  onToggleEventRegistration
}: SchoolPageProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'scholars' | 'announcements'>('overview');
  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceContent, setNewAnnounceContent] = useState('');
  const [newAnnounceBadge, setNewAnnounceBadge] = useState('Official Notice');
  const [announcementLikes, setAnnouncementLikes] = useState<Record<string, number>>({});
  const [likedAnnouncements, setLikedAnnouncements] = useState<Record<string, boolean>>({});
  const [announcementFilter, setAnnouncementFilter] = useState<'all' | 'announcements' | 'events' | 'resources'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [inlinePostType, setInlinePostType] = useState<'announcement' | 'event' | 'resource'>('announcement');

  // Instagram Post enhancements
  const [newAnnounceImage, setNewAnnounceImage] = useState('https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80');
  const [instagramMode, setInstagramMode] = useState<'grid' | 'feed'>('feed');
  const [selectedPostModal, setSelectedPostModal] = useState<SchoolAnnouncement | null>(null);
  const [schoolComments, setSchoolComments] = useState<Record<string, Array<{ id: string; author: string; text: string; timestamp: string }>>>({
    'ann-1-1': [
      { id: '1', author: 'Aarav Sharma', text: 'Amazing science and IoT opportunities! Can we upload CBSE code repositories?', timestamp: '1 day ago' },
      { id: '2', author: 'Sneha Kapoor', text: 'I would love to display my biomedical monitoring project there!', timestamp: '12 hours ago' }
    ],
    'ann-2-1': [
      { id: '1', author: 'Vedant Mishra', text: 'Ready to submit my finance analysis abstract. Appreciate the review!', timestamp: '2 days ago' }
    ],
    'ann-3-1': [
      { id: '1', author: 'Raj Kumar', text: 'Can Class XI students seek advice directly from Prof. Shastri?', timestamp: '3 days ago' }
    ]
  });
  const [newCommentInputText, setNewCommentInputText] = useState<Record<string, string>>({});

  // LinkedIn-style Business following mechanics
  const [followedSchools, setFollowedSchools] = useState<Record<string, boolean>>({
    'sch-1': true,
    'sch-2': false,
    'sch-3': false
  });
  const [schoolFollowers, setSchoolFollowers] = useState<Record<string, number>>({
    'sch-1': 1420,
    'sch-2': 890,
    'sch-3': 1130
  });

  // Photo / Text Profile Customization variables
  const [customTaglines, setCustomTaglines] = useState<Record<string, string>>({});
  const [customAbouts, setCustomAbouts] = useState<Record<string, string>>({});
  const [customLogos, setCustomLogos] = useState<Record<string, string>>({});
  const [customBanners, setCustomBanners] = useState<Record<string, string>>({});
  const [customGalleries, setCustomGalleries] = useState<Record<string, string[]>>({
    'sch-1': [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80"
    ],
    'sch-2': [
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80"
    ]
  });

  const [showSchoolCustomizer, setShowSchoolCustomizer] = useState(false);
  const [editTaglineInput, setEditTaglineInput] = useState('');
  const [editAboutInput, setEditAboutInput] = useState('');
  
  const schoolLogoFileRef = React.useRef<HTMLInputElement>(null);
  const schoolBannerFileRef = React.useRef<HTMLInputElement>(null);
  const schoolGalleryFileRef = React.useRef<HTMLInputElement>(null);

  const school = schools.find(s => s.id === selectedSchoolId) || schools[0];

  if (!school) {
    return (
      <div className="bg-white rounded-2xl p-8 border text-center text-slate-400">
        <Building2 className="mx-auto w-12 h-12 mb-2" />
        <p>No school profile is loaded.</p>
      </div>
    );
  }

  const handleCreateAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceTitle.trim() || !newAnnounceContent.trim()) return;

    onPublishAnnouncement(school.id, {
      title: newAnnounceTitle.trim(),
      content: newAnnounceContent.trim(),
      badgeText: newAnnounceBadge.trim() || undefined,
      type: inlinePostType,
      imageUrl: newAnnounceImage,
      eventDeadline: inlinePostType === 'event' ? "28-June-2026" : undefined,
      eventReward: inlinePostType === 'event' ? "Honors Seal & 100 CBSE points" : undefined,
      downloadUrl: inlinePostType === 'resource' ? "https://cbse.gov.in/notes-circ-2026.pdf" : undefined,
      fileSize: inlinePostType === 'resource' ? "1.6 MB" : undefined
    });

    setNewAnnounceTitle('');
    setNewAnnounceContent('');
    setNewAnnounceBadge('Official Notice');
    setInlinePostType('announcement');
    // Set a different random preset image for next post
    const presets = [
      'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80'
    ];
    setNewAnnounceImage(presets[Math.floor(Math.random() * presets.length)]);
  };

  const handleAddSchoolComment = (postId: string) => {
    const text = (newCommentInputText[postId] || '').trim();
    if (!text) return;

    const comment = {
      id: `scm-${Date.now()}`,
      author: isCounselorOfThisSchool ? 'School Counselor' : 'Aarav Sharma',
      text,
      timestamp: 'Just now'
    };

    setSchoolComments(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), comment]
    }));

    setNewCommentInputText(prev => ({ ...prev, [postId]: '' }));
  };

  const toggleLikeAnnouncement = (announceId: string) => {
    setLikedAnnouncements(prev => {
      const isLiked = !prev[announceId];
      setAnnouncementLikes(prevLikes => ({
        ...prevLikes,
        [announceId]: (prevLikes[announceId] || 0) + (isLiked ? 1 : -1)
      }));
      return { ...prev, [announceId]: isLiked };
    });
  };

  return (
    <div className="space-y-6" id="school-public-profile-view">
      {/* Top School Search & Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
        <div>
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Academic Trust Network Registry</span>
          <h4 className="text-xs font-bold text-slate-800">Browse High Schools with Verified Credential Registries</h4>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="school-select" className="text-[10px] font-black uppercase text-slate-500">View School:</label>
          <select
            id="school-select"
            value={school.id}
            onChange={(e) => onSelectSchool(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 font-bold text-[#0a66c2] focus:outline-none focus:ring-1 focus:ring-blue-900 shadow-3xs cursor-pointer"
          >
            {schools.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Cover Banner & Overview Card */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        {/* Cover Block with Customizable Photo support */}
        <div className="h-40 bg-gradient-to-r from-[#0a66c2]/80 to-[#004b8d]/60 relative p-6 flex items-end justify-between overflow-hidden">
          {customBanners[school.id] ? (
            <img 
              src={customBanners[school.id]} 
              alt="School Banner Cover" 
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover opacity-90" 
            />
          ) : (
            <div className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200'}` }} />
          )}
          <div className="absolute inset-0 bg-black/10" />

          <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1 z-10">
            <ShieldCheck size={11} className="text-emerald-400 fill-emerald-400/10" />
            Verified Seal Issuer
          </div>
          
          <div className="flex items-center gap-4 translate-y-8 z-10">
            <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              {customLogos[school.id] ? (
                <img 
                  src={customLogos[school.id]} 
                  alt={school.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl" 
                />
              ) : (
                <span className="text-3xl font-black text-[#0a66c2]" id="school-avatar-logo">{school.avatar}</span>
              )}
            </div>
          </div>
        </div>

        {/* School Identity Details */}
        <div className="pt-12 px-6 pb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight" id="school-page-title">{school.name}</h2>
                
                {/* LinkedIn style Follow / Like Page Button */}
                <button
                  type="button"
                  onClick={() => {
                    const currentlyFollowed = !!followedSchools[school.id];
                    setFollowedSchools(prev => ({ ...prev, [school.id]: !currentlyFollowed }));
                    setSchoolFollowers(prev => ({
                      ...prev,
                      [school.id]: (prev[school.id] || 0) + (currentlyFollowed ? -1 : 1)
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                    followedSchools[school.id]
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 animate-pulse'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                >
                  <Heart size={11} className={followedSchools[school.id] ? 'fill-emerald-500 text-emerald-600' : ''} />
                  <span>{followedSchools[school.id] ? 'Following Page' : 'Follow Page'}</span>
                </button>

                {/* Counselor customization button */}
                {isCounselorOfThisSchool && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditTaglineInput(customTaglines[school.id] || school.tagline);
                      setEditAboutInput(customAbouts[school.id] || school.about);
                      setShowSchoolCustomizer(!showSchoolCustomizer);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 border border-slate-202 text-slate-700 font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>⚙ Customize Photos & Page</span>
                  </button>
                )}
              </div>

              <p className="text-sm font-semibold text-[#0a66c2] italic">
                {customTaglines[school.id] || school.tagline}
              </p>
              
              <div className="flex flex-wrap items-center gap-3.5 pt-1 text-slate-400 text-xs">
                <span className="flex items-center gap-1 font-medium">
                  <MapPin size={13} className="text-slate-450" />
                  {school.location}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="text-slate-455" />
                  Est. {school.established}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={13} className="text-slate-455" />
                  {schoolFollowers[school.id] || 0} Followers
                </span>
                <span className="flex items-center gap-1">
                  <Globe size={13} className="text-slate-455" />
                  <a href={school.website} target="_blank" rel="noreferrer" className="hover:underline text-slate-500 font-medium flex items-center gap-0.5">
                    {school.website.replace("https://", "")} <ExternalLink size={10} />
                  </a>
                </span>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <div className="bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
                <span className="block text-lg font-black text-slate-800">{school.studentRosterCount}</span>
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider mt-0.5">Students Active</span>
              </div>
              <div className="bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-center min-w-[105px]">
                <span className="block text-lg font-black text-slate-800">{school.verifiedSealsCount}</span>
                <span className="text-[8.5px] uppercase font-bold text-slate-400 block tracking-wider mt-0.5">Verified Seals</span>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-2.5 text-center min-w-[110px] col-span-2 sm:col-span-1">
                <span className="block text-lg font-black text-[#0a66c2]">{school.trustIndex}</span>
                <span className="text-[8.5px] uppercase font-black text-[#0a66c2] tracking-widest block mt-0.5">CBSE Trust code</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-650 leading-relaxed max-w-4xl pt-1">
            {customAbouts[school.id] || school.about}
          </p>
        </div>
      </div>

      {/* Dynamic Counselor Profile Customizer */}
      {isCounselorOfThisSchool && showSchoolCustomizer && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-200 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <span>🛠 School Profile Customizer Workspace (Counselor Mode)</span>
            </h4>
            <button 
              type="button" 
              onClick={() => setShowSchoolCustomizer(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Close Panel
            </button>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              setCustomTaglines(prev => ({ ...prev, [school.id]: editTaglineInput }));
              setCustomAbouts(prev => ({ ...prev, [school.id]: editAboutInput }));
              setShowSchoolCustomizer(false);
            }} 
            className="space-y-4 text-xs text-slate-700"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Custom Brand Tagline</label>
                <input 
                  type="text" 
                  value={editTaglineInput}
                  onChange={(e) => setEditTaglineInput(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
                  placeholder="e.g. CBSE Center of Excellence" 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Custom Brand Logo file</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={schoolLogoFileRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCustomLogos(prev => ({ ...prev, [school.id]: URL.createObjectURL(file) }));
                    }
                  }}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => schoolLogoFileRef?.current?.click()}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-600 hover:border-blue-900 text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{customLogos[school.id] ? "✓ Logo Picture Selected" : "Choose brand file..."}</span>
                  <Building2 size={13} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Custom Cover Banner file</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={schoolBannerFileRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setCustomBanners(prev => ({ ...prev, [school.id]: URL.createObjectURL(file) }));
                    }
                  }}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => schoolBannerFileRef?.current?.click()}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-600 hover:border-blue-900 text-left flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{customBanners[school.id] ? "✓ Custom Cover Selected" : "Choose cover image..."}</span>
                  <Building2 size={13} className="text-slate-400" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Append Photos to School Spotlight Gallery</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={schoolGalleryFileRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setCustomGalleries(prev => {
                        const existing = prev[school.id] || [];
                        return { ...prev, [school.id]: [...existing, url] };
                      });
                    }
                  }}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => schoolGalleryFileRef?.current?.click()}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-[#0a66c2] hover:border-blue-900 text-left flex items-center justify-between cursor-pointer"
                >
                  <span>+ Select and Upload Highlight Picture</span>
                  <Building2 size={13} className="text-[#0a66c2]" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">School Overview (About)</label>
              <textarea 
                value={editAboutInput}
                onChange={(e) => setEditAboutInput(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-blue-900 text-slate-800"
                placeholder="Write physical details of the school campus, curriculum, and leadership credentials..."
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button 
                type="button" 
                onClick={() => setShowSchoolCustomizer(false)}
                className="bg-slate-200 text-slate-700 px-4 py-1.5 rounded-lg font-bold hover:bg-slate-300 transition-colors cursor-pointer"
              >
                Discard Edits
              </button>
              <button 
                type="submit" 
                className="bg-[#0a66c2] text-white px-5 py-1.5 rounded-lg font-bold hover:bg-[#004b8d] transition-colors cursor-pointer"
              >
                Save School Credentials & Photos
              </button>
            </div>
          </form>
        </div>
      )}

      {/* School Secondary Tabs Control */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === 'overview'
              ? 'border-orange-500 text-blue-950 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🏫 School Intel & Staff
        </button>
        <button
          onClick={() => setActiveTab('scholars')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === 'scholars'
              ? 'border-orange-500 text-blue-950 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          🌟 Scholars Showcase ({school.scholars.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition-all ${
            activeTab === 'announcements'
              ? 'border-orange-500 text-blue-950 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          📢 Announcements ({school.announcements.length})
        </button>
      </div>

      {/* RENDER ACTIVE TAB */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in" id="school-tab-overview">
          {/* Left Columns details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Academic Credentials Framework</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                As a fully registered partner in the ScholrNet Academic Trust Network, our school seals are backed by CBSE/State education audits and secured using unique cryptography. When a student files a project or olympiad result here, the Counselor verifies its authenticity, appending our state verification seal directly.
              </p>
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h5 className="font-extrabold text-[11px] text-slate-700">School Sealing Authority Code</h5>
                  <p className="text-[10px] text-slate-400 font-mono">HASH: SHA256//IN-CBSE-COUNCIL-{school.id.toUpperCase()}-SEALS-2026</p>
                </div>
                <div className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-3 py-1.5 rounded-lg border border-emerald-100">
                  SECURE ACTIVE
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4.5">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Faculty and Department Leads</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1b2234] text-white flex items-center justify-center font-bold text-xs">
                    {school.counselorAvatar}
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">{school.counselorName}</h5>
                    <span className="text-[10px] text-[#0a66c2] font-semibold">Chief Academic Counselor</span>
                    <p className="text-[10px] text-slate-400 mt-1">Handles board validation queues, and signs verified student badges.</p>
                  </div>
                </div>
                
                <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold text-xs">
                    SK
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-800">Prof. Sandeep Kulkarni</h5>
                    <span className="text-[10px] text-[#0a66c2] font-semibold">STEM Advisor & Physics Coach</span>
                    <p className="text-[10px] text-slate-400 mt-1">Oversees high school physics olympiads, robotics clubs, and space projects.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* School Spotlight Photo Gallery */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3.5">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Campus Spotlight & Highlights Photo Gallery</h4>
              <p className="text-[10px] text-slate-400">Visual glimpses, science research centers, and infrastructure of {school.name}</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(customGalleries[school.id] || []).concat([
                  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=400&q=80",
                  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=400&q=80"
                ]).slice(0, 4).map((imgUrl, index) => (
                  <div key={index} className="h-40 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group relative">
                    <img 
                      src={imgUrl} 
                      alt="School highlight" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102" 
                    />
                    <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:bg-transparent" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right sidebar details */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 relative overflow-hidden shadow-sm space-y-4">
              <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase block">State Affiliation Status</span>
              <div>
                <h5 className="font-extrabold text-xs">National Registry Board</h5>
                <p className="text-[10.5px] text-slate-300 mt-1 select-none">CBSE Senior Secondary Affiliated Registry</p>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider block">Official Location</span>
                <p className="text-xs font-semibold text-slate-100 mt-1">{school.location}</p>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <span className="text-[9px] text-slate-450 uppercase font-bold tracking-wider block">Registered Domain</span>
                <p className="text-xs font-semibold text-blue-400 mt-1">{school.website}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scholars' && (
        <div id="school-tab-scholars" className="space-y-4 animate-fade-in">
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4.5">
            <h4 className="font-extrabold text-xs text-slate-800">Verified Scholars Showcase Directory</h4>
            <p className="text-[11px] text-slate-450 mt-0.5">Explore profiles of active students from {school.name} with verified gold seals from our counselor cabinet.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {school.scholars.map((scholar, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.015, y: -2 }}
                transition={{ type: "spring", stiffness: 450, damping: 25 }}
                className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex flex-col justify-between hover:shadow-md transition-shadow cursor-default"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-orange-600 font-extrabold text-[#fff] text-xs flex items-center justify-center">
                        {scholar.avatar}
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-800 leading-tight">{scholar.name}</h5>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-semibold">{scholar.grade}</p>
                      </div>
                    </div>
                    <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                      🏆 {scholar.seals} Seals
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    "{scholar.bio}"
                  </p>
                </div>

                <div className="border-t border-slate-100/80 pt-3.5 mt-4.5 flex items-center justify-between">
                  <span className="text-[9px] text-[#0a66c2] font-black uppercase tracking-wider">DPS Scholar Registry</span>
                  <button
                    onClick={() => onViewStudentProfile(scholar.name)}
                    className="text-[10.5px] font-extrabold text-[#0a66c2] hover:text-[#004b8d] flex items-center gap-0.5 group focus:outline-none"
                  >
                    View Portfolio
                    <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'announcements' && (
        <div id="school-tab-announcements" className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in text-xs">
          {/* Announcements post display stack */}
          <div className="lg:col-span-3 space-y-4">
            {/* Publisher Box ONLY visible if isCounselorOfThisSchool is true */}
            {isCounselorOfThisSchool && (
              <form onSubmit={handleCreateAnnouncement} className="bg-white border-2 border-[#0a66c2]/80 rounded-2xl p-5 shadow-xs space-y-4 relative">
                <div className="absolute top-4 right-4 bg-[#0a66c2] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-widest">
                  School Admin Board
                </div>
                <div className="space-y-1.5 text-left">
                  <h4 className="font-extrabold text-xs text-[#0a66c2] flex items-center gap-1.5 leading-none">
                    <Megaphone size={14} className="text-orange-600" />
                    Publish Instagram-Style School Bulletin
                  </h4>
                  <p className="text-[10px] text-slate-400">Announcements propagate to the home feeds of all students and colleges immediately with premium visuals.</p>
                </div>

                {/* Format selection */}
                <div className="text-left">
                  <label className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Bulletin Form Type</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                    {(['announcement', 'event', 'resource'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setInlinePostType(t);
                          setNewAnnounceBadge(t === 'announcement' ? 'Official Notice' : t === 'event' ? 'Event Update' : 'Admission Circular');
                        }}
                        className={`py-1 rounded-lg text-[9px] font-black uppercase tracking-wider text-center cursor-pointer transition-all ${
                          inlinePostType === t
                            ? 'bg-[#0a66c2] text-white border-none shadow-3xs'
                            : 'text-slate-500 hover:text-slate-805 bg-transparent border-transparent'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Title (e.g. Science Exhibition Registration Open!)"
                      value={newAnnounceTitle}
                      onChange={(e) => setNewAnnounceTitle(e.target.value)}
                      className="text-xs bg-slate-50 placeholder-slate-400 border border-slate-200 rounded-xl p-3 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900 w-full"
                      required
                    />
                    <select
                      value={newAnnounceBadge}
                      onChange={(e) => setNewAnnounceBadge(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-205 rounded-xl p-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-900 cursor-pointer"
                    >
                      <option value="Official Notice">📢 Official Notice</option>
                      <option value="Event Update">🎪 Event Update</option>
                      <option value="Honors List">🏆 Honors List</option>
                      <option value="Admission Circular">🏫 Admissions board</option>
                    </select>
                  </div>
                  
                  <textarea
                    placeholder="Provide details about dates, eligibility, challenge guidelines, or links. High school students can read and share this immediately."
                    value={newAnnounceContent}
                    onChange={(e) => setNewAnnounceContent(e.target.value)}
                    className="text-xs bg-slate-50 placeholder-slate-400 border border-slate-200 rounded-xl p-3 h-24 focus:outline-none focus:ring-1 focus:ring-blue-900 w-full resize-none"
                    required
                  />

                  {/* Instagram Media Presets Selection */}
                  <div className="space-y-1.5 text-left">
                    <label className="block text-[9.5px] text-slate-400 font-bold uppercase tracking-wider">Instagram Media Cover Attachment</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { label: '🏆 Science Expo', url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80' },
                        { label: '💻 Coding Labs', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80' },
                        { label: '🎓 Scholars Hall', url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80' },
                        { label: '🏀 Sports Honors', url: 'https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=800&q=80' },
                        { label: '📚 Study Lounge', url: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=800&q=80' }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setNewAnnounceImage(preset.url)}
                          className={`border rounded-xl p-1 transition-all relative overflow-hidden h-11 focus:outline-none ${
                            newAnnounceImage === preset.url 
                              ? 'border-[#0a66c2] ring-1 ring-blue-500' 
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                          }`}
                        >
                          <img src={preset.url} alt={preset.label} className="absolute inset-x-0 inset-y-0 w-full h-full object-cover opacity-60" />
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-0.5">
                            <span className="text-[7.5px] font-extrabold text-white text-center leading-none tracking-tight">{preset.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="pt-1.5">
                      <input 
                        type="url"
                        placeholder="Or hand-paste any custom image URL..."
                        value={newAnnounceImage}
                        onChange={(e) => setNewAnnounceImage(e.target.value)}
                        className="text-[10px] bg-slate-50 placeholder-slate-400 border border-slate-205 rounded-xl p-2 font-medium text-slate-805 focus:outline-none focus:ring-1 focus:ring-blue-900 w-full font-mono"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-[#0a66c2] hover:bg-[#004b8d] active:scale-95 text-white font-black text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/10 cursor-pointer focus:outline-none"
                  >
                    <Plus size={14} /> Publish As School Post
                  </button>
                </div>
              </form>
            )}

            {/* Filter Pills and Format Switcher Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white border border-slate-100 rounded-2xl p-4 shadow-3xs">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[9px] font-black uppercase text-slate-405 tracking-wider shrink-0 pl-1.5">CATEGORY:</span>
                {[
                  { id: 'all', label: 'All Postings', icon: '📢' },
                  { id: 'announcements', label: 'General', icon: '📄' },
                  { id: 'events', label: 'Events & SignUp', icon: '🎪' },
                  { id: 'resources', label: 'Guides', icon: '📚' }
                ].map(pill => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setAnnouncementFilter(pill.id as any)}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all border ${
                      announcementFilter === pill.id
                        ? 'bg-blue-900 text-white border-blue-900 shadow-3xs font-extrabold'
                        : 'bg-white text-slate-500 hover:text-slate-800 border-slate-205'
                    }`}
                  >
                    <span>{pill.icon}</span> <span>{pill.label}</span>
                  </button>
                ))}
              </div>

              {/* Instagram Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 p-1 rounded-xl self-end md:self-auto">
                <button
                  type="button"
                  onClick={() => setInstagramMode('feed')}
                  className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    instagramMode === 'feed'
                      ? 'bg-white text-[#0a66c2] shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List size={13} />
                  Feed View
                </button>
                <button
                  type="button"
                  onClick={() => setInstagramMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                    instagramMode === 'grid'
                      ? 'bg-white text-[#0a66c2] shadow-3xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Grid View
                </button>
              </div>
            </div>

            {school.announcements.length === 0 ? (
              <div className="bg-white border rounded-2xl p-10 text-center text-slate-400 space-y-2">
                <Megaphone size={30} className="mx-auto text-slate-300" />
                <p className="font-bold text-xs">No school announcements logged yet.</p>
                <p className="text-[10px]">Announcements, competitive notices, and events will propagate here once published.</p>
              </div>
            ) : instagramMode === 'grid' ? (
              /* Instagram Mode: GRID VIEW */
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {school.announcements
                  .filter(ann => {
                    if (announcementFilter === 'all') return true;
                    const isEvent = ann.type === 'event' || ann.badgeText?.toLowerCase().includes('event') || ann.badgeText?.toLowerCase().includes('comp');
                    const isResource = ann.type === 'resource' || ann.badgeText?.toLowerCase().includes('resource') || ann.badgeText?.toLowerCase().includes('circular');
                    
                    if (announcementFilter === 'events') return isEvent;
                    if (announcementFilter === 'resources') return isResource;
                    if (announcementFilter === 'announcements') return !isEvent && !isResource;
                    return true;
                  })
                  .map((announce) => {
                    const likesCount = (announce.likes || 0) + (announcementLikes[announce.id] || 0);
                    const commentsCount = (schoolComments[announce.id] || []).length;
                    return (
                      <div 
                        key={announce.id}
                        onClick={() => setSelectedPostModal(announce)}
                        className="group relative aspect-square bg-[#121212] overflow-hidden rounded-2xl border border-slate-150 cursor-pointer shadow-3xs hover:shadow-md transition-all duration-155"
                      >
                        <img 
                          src={announce.imageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80'} 
                          alt={announce.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-hover:opacity-80"
                        />
                        {/* Upper Right Mini Indicator */}
                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white font-black text-[7.5px] uppercase px-1.5 py-0.5 rounded">
                          {announce.badgeText || "Post"}
                        </div>

                        {/* Hover Instagram Stats Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center justify-center text-white p-3 text-center space-y-1">
                          <h5 className="font-extrabold text-[11px] leading-tight line-clamp-2">{announce.title}</h5>
                          <div className="flex items-center gap-3.5 text-xs font-black pt-1">
                            <span className="flex items-center gap-1 text-red-400">
                              <Heart size={13} className="fill-red-400 stroke-none" /> {likesCount}
                            </span>
                            <span className="flex items-center gap-1 text-sky-400">
                              <MessageCircle size={13} className="fill-sky-400 stroke-none" /> {commentsCount}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              /* Instagram Mode: FEED VIEW */
              <div className="space-y-6">
                {school.announcements
                  .filter(ann => {
                    if (announcementFilter === 'all') return true;
                    const isEvent = ann.type === 'event' || ann.badgeText?.toLowerCase().includes('event') || ann.badgeText?.toLowerCase().includes('comp');
                    const isResource = ann.type === 'resource' || ann.badgeText?.toLowerCase().includes('resource') || ann.badgeText?.toLowerCase().includes('circular');
                    
                    if (announcementFilter === 'events') return isEvent;
                    if (announcementFilter === 'resources') return isResource;
                    if (announcementFilter === 'announcements') return !isEvent && !isResource;
                    return true;
                  })
                  .map((announce) => {
                    const hasLiked = likedAnnouncements[announce.id];
                    const likesCount = (announce.likes || 0) + (announcementLikes[announce.id] || 0);
                    const isEvent = announce.type === 'event' || announce.badgeText?.toLowerCase().includes('event') || announce.badgeText?.toLowerCase().includes('comp');
                    const isResource = announce.type === 'resource' || announce.badgeText?.toLowerCase().includes('resource') || announce.badgeText?.toLowerCase().includes('circular');
                    const hasRegistered = registeredEventIds.includes(announce.id);
                    const isDownloading = downloadingId === announce.id;
                    const comments = schoolComments[announce.id] || [];

                    return (
                      <div key={announce.id} className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm text-left">
                        {/* 1. Header Row */}
                        <div className="p-4 flex items-center justify-between border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0a66c2] to-blue-900 border border-blue-105 text-white font-extrabold text-xs flex items-center justify-center shadow-3xs">
                              {school.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-extrabold text-xs text-slate-800 leading-none block hover:underline cursor-pointer">{school.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold block mt-1">{announce.timestamp} · CBSE Trust Verification Sealing</span>
                            </div>
                          </div>
                          
                          <span className={`bg-blue-50 text-[#0a66c2] text-[9px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-blue-105 ${
                            isEvent ? 'bg-orange-50 text-orange-600 border-orange-105' : ''
                          }`}>
                            {announce.badgeText || "Official Notice"}
                          </span>
                        </div>

                        {/* 2. Covered Visual Image */}
                        <div className="aspect-[16/9] w-full bg-[#f9fafb] relative overflow-hidden group border-b border-slate-100">
                          <img 
                            src={announce.imageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80'} 
                            alt={announce.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-101"
                          />
                        </div>

                        {/* 3. Action bar */}
                        <div className="p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-650">
                              <button
                                type="button"
                                onClick={() => toggleLikeAnnouncement(announce.id)}
                                className={`flex items-center gap-1.5 focus:outline-none transition-transform hover:scale-105 active:scale-95 ${
                                  hasLiked ? 'text-red-500' : 'text-slate-500 hover:text-red-500'
                                }`}
                              >
                                <Heart size={17} className={hasLiked ? 'fill-red-500 text-red-500' : ''} />
                                <span>{likesCount} Appreciations</span>
                              </button>
                              
                              <span className="flex items-center gap-1.5 text-slate-500">
                                <MessageCircle size={17} />
                                <span>{comments.length} Comments</span>
                              </span>
                            </div>
                            
                            <span className="text-[8px] text-slate-400 font-mono tracking-wider font-extrabold uppercase bg-slate-50 p-1 rounded border border-slate-100 select-none">
                              🔒 Cryptographic Trust Ledger Signed
                            </span>
                          </div>

                          {/* 4. Description Content */}
                          <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">{announce.title}</h4>
                            <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{announce.content}</p>
                          </div>

                          {/* 5. Embedded Special Forms/Buttons */}
                          {isEvent && (
                            <div className="bg-gradient-to-br from-orange-50/20 to-orange-50/5 border border-orange-100/70 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                              <div className="grid grid-cols-2 gap-4 text-left w-full sm:w-auto">
                                <div>
                                  <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block font-mono">DEADLINE</span>
                                  <span className="text-xs font-black text-slate-800 mt-0.5 block">{announce.eventDeadline || "28-June-2026"}</span>
                                </div>
                                <div>
                                  <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block font-mono">REWARD</span>
                                  <span className="text-xs font-black text-orange-700 mt-0.5 block flex items-center gap-0.5">
                                    <Award size={11} className="text-[#e75107]" /> {announce.eventReward || "Honors Seal Point"}
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onToggleEventRegistration) onToggleEventRegistration(announce.id);
                                }}
                                className={`w-full sm:w-auto text-center px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all border ${
                                  hasRegistered 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100' 
                                    : 'bg-[#0a66c2] text-white border-transparent hover:bg-[#004b8d]'
                                }`}
                              >
                                {hasRegistered ? "✓ Registered" : "🎪 Register Now"}
                              </button>
                            </div>
                          )}

                          {isResource && (
                            <div className="bg-blue-50/10 border border-blue-102 p-3.5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                              <div className="space-y-0.5 w-full sm:w-auto text-left">
                                <span className="text-[8px] text-slate-450 font-bold uppercase tracking-wider block font-mono">SYLLABUS CURRICULUM RESOURCE</span>
                                <p className="text-[10.5px] text-[#0a66c2] font-mono truncate max-w-[285px] font-bold">
                                  {announce.downloadUrl || "https://cbse.gov.in/notes-circ-2026.pdf"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  setDownloadingId(announce.id);
                                  setTimeout(() => {
                                    setDownloadingId(null);
                                    alert(`Successfully downloaded Guide circular: "${announce.title}"!`);
                                  }, 1000);
                                }}
                                disabled={isDownloading}
                                className="w-full sm:w-auto text-center px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer transition-all border flex items-center justify-center gap-1.5 bg-[#0a66c2] text-white hover:bg-[#004b8d]"
                              >
                                <FileText size={12} />
                                {isDownloading ? "Downloading..." : `Download Material (${announce.fileSize || "1.4 MB"})`}
                              </button>
                            </div>
                          )}

                          {/* 6. Instagram Visual Inline Commentary */}
                          <div className="border-t border-slate-100 pt-3 space-y-2 text-left">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Discussions ({comments.length})</span>
                            
                            {comments.length > 0 && (
                              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                                {comments.map((c) => (
                                  <div key={c.id} className="text-xs flex items-start gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100/50">
                                    <div className="w-5.5 h-5.5 rounded-md bg-slate-205 flex items-center justify-center text-[9px] uppercase font-bold text-slate-600 shrink-0">
                                      {c.author.substring(0, 1)}
                                    </div>
                                    <div className="space-y-0.5 min-w-0 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-[10px] text-slate-755 block">{c.author}</span>
                                        <span className="text-[8.5px] text-slate-400 block font-normal">{c.timestamp}</span>
                                      </div>
                                      <p className="text-[10.5px] text-slate-600 leading-normal">{c.text}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Commentary box */}
                            <div className="flex items-center gap-2 pt-1">
                              <input 
                                type="text"
                                placeholder={`Comment publicly as ${isCounselorOfThisSchool ? 'Counselor...' : 'Aarav...'}`}
                                value={newCommentInputText[announce.id] || ''}
                                onChange={(e) => {
                                  const text = e.target.value;
                                  setNewCommentInputText(prev => ({ ...prev, [announce.id]: text }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddSchoolComment(announce.id);
                                }}
                                className="flex-1 text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-[#0a66c2] focus:border-transparent text-slate-805 bg-slate-50/50"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddSchoolComment(announce.id)}
                                className="bg-[#0a66c2] text-white hover:bg-[#004b8d] px-4 py-2.5 rounded-xl text-xs font-black cursor-pointer h-full transition-colors flex items-center justify-center"
                              >
                                Post
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center border-t border-slate-50 pt-2.5 text-[9px] text-slate-400">
                            {isCounselorOfThisSchool && onDeleteAnnouncement && (
                              <button
                                type="button"
                                onClick={() => onDeleteAnnouncement(school.id, announce.id)}
                                className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline flex items-center gap-0.5 cursor-pointer focus:outline-none"
                              >
                                Retract public posting
                              </button>
                            )}
                            <div className="ml-auto flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Verified Trust Sealing</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Right sidebar notices */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 text-left">
              <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide flex items-center gap-1">
                <Info size={14} className="text-[#0a66c2]" />
                Notice Board Rules
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Posts on this board represent signed bulletins from the Counselors' office of {school.name}. High school students, prospective college admissions grids, and alumni clubs receive live feed updates instantly upon publishing.
              </p>
              <div className="border-t border-slate-100 pt-3">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Affiliation Code</span>
                <span className="text-[10px] text-slate-750 font-mono mt-0.5 block">CBSE-9381.182-SECURE</span>
              </div>
            </div>
          </div>

          {/* Instagram Style Selected Post Modal */}
          {selectedPostModal && (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in text-slate-800">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col justify-between">
                
                {/* Modal Title */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#0a66c2] text-white flex items-center justify-center font-black text-xs select-none">
                      {school.avatar}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 leading-none">{school.name}</h4>
                      <p className="text-[9.5px] text-slate-400 block mt-0.5">{selectedPostModal.timestamp}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPostModal(null)}
                    className="text-slate-400 hover:text-slate-705 font-bold transition-all text-xs w-7 h-7 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center focus:outline-none"
                  >
                    ✕
                  </button>
                </div>

                {/* Cover Photo */}
                <div className="aspect-[16/9] w-full bg-[#121212] overflow-hidden">
                  <img 
                    src={selectedPostModal.imageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80'} 
                    alt={selectedPostModal.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Caption, likes, comments */}
                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  <div className="space-y-1 text-left">
                    <span className="bg-blue-50 text-blue-900 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-blue-100">{selectedPostModal.badgeText || 'Notice'}</span>
                    <h5 className="font-extrabold text-sm text-slate-850 pt-1 leading-tight">{selectedPostModal.title}</h5>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{selectedPostModal.content}</p>
                  </div>

                  {/* Comments directory inside modal */}
                  <div className="border-t border-slate-100 pt-3 text-left">
                    <span className="text-[9.5px] font-black uppercase text-slate-405 tracking-wider block mb-2">Student Appreciations ({(schoolComments[selectedPostModal.id] || []).length})</span>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(schoolComments[selectedPostModal.id] || []).map((c, idx) => (
                        <div key={c.id || idx} className="text-xs flex items-start gap-2 bg-slate-50 p-2 rounded-xl">
                          <div className="w-5 h-5 rounded bg-slate-205 flex items-center justify-center text-[9px] font-bold text-slate-500 shrink-0">
                            {c.author.substring(0, 1)}
                          </div>
                          <div>
                            <span className="font-extrabold text-[10px] text-slate-705 block font-sans">{c.author}</span>
                            <p className="text-[10.5px] text-slate-600 mt-0.5">{c.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      toggleLikeAnnouncement(selectedPostModal.id);
                    }}
                    className="flex items-center gap-1.5 font-bold text-xs text-red-500 hover:underline"
                  >
                    <Heart size={16} className={likedAnnouncements[selectedPostModal.id] ? 'fill-red-500 text-red-500' : ''} />
                    <span>Appreciate ({(selectedPostModal.likes || 0) + (announcementLikes[selectedPostModal.id] || 0)})</span>
                  </button>

                  <button
                    onClick={() => setSelectedPostModal(null)}
                    className="bg-[#0a66c2] text-white hover:bg-[#004b8d] font-bold text-xs px-4 py-2 rounded-xl"
                  >
                    Close Modal
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
