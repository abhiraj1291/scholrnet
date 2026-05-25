import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Achievement, Project, VerificationStatus } from '../types';
import { 
  Award, 
  Code, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Play, 
  Globe, 
  Eye, 
  FileText, 
  Send, 
  Sparkles, 
  Plus, 
  PlusCircle, 
  Check, 
  Edit3, 
  Share2, 
  Download, 
  Github, 
  X, 
  Copy,
  Upload,
  User,
  ExternalLink
} from 'lucide-react';

interface StudentProfileProps {
  profile: { name: string; avatar: string; grade: string; school: string; bio: string; skills: string[]; github?: string; website?: string; avatarUrl?: string; bannerUrl?: string };
  achievements: Achievement[];
  projects: Project[];
  onAddAchievement: (ach: Achievement) => void;
  onAddProject: (proj: Project) => void;
  onRequestVerification: (req: { title: string; category: string; org: string; file: string; details: string }) => void;
  onUpdateProfile?: (profile: any) => void;
}

export default function StudentProfile({
  profile,
  achievements,
  projects,
  onAddAchievement,
  onAddProject,
  onRequestVerification,
  onUpdateProfile
}: StudentProfileProps) {
  const [showAchForm, setShowAchForm] = useState(false);
  const [showProjForm, setShowProjForm] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Esc keypress listener to cancel/close any active profile modal or form
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowEditProfileModal(false);
        setShowShareModal(false);
        setShowPdfModal(false);
        setShowAchForm(false);
        setShowProjForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Drag and Drop simulation states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit Profile fields
  const [editName, setEditName] = useState(profile.name);
  const [editAvatar, setEditAvatar] = useState(profile.avatar);
  const [editAvatarUrl, setEditAvatarUrl] = useState((profile as any).avatarUrl || '');
  const [editBannerUrl, setEditBannerUrl] = useState((profile as any).bannerUrl || '');
  const [editGrade, setEditGrade] = useState(profile.grade);
  const [editSchool, setEditSchool] = useState(profile.school);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editGithub, setEditGithub] = useState(profile.github || 'github.com/aarav-sharma');
  const [editWebsite, setEditWebsite] = useState(profile.website || 'scholrnet.in/aarav.sharma');

  const avatarFileRef = useRef<HTMLInputElement>(null);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // High-fidelity student portfolio showcase/photos database
  const [galleryItems, setGalleryItems] = useState([
    {
      id: "gal-1",
      title: "Robotics Suspension Chassis Arm",
      caption: "High-contrast render of the suspension blocks modeled in Autodesk Fusion 360",
      mediaUrl: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80",
      type: "image"
    },
    {
      id: "gal-2",
      title: "Science Exhibition Medal Co-sign",
      caption: "Accepting first prize diploma from senior education coordinators",
      mediaUrl: "https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?auto=format&fit=crop&w=800&q=80",
      type: "image"
    }
  ]);

  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [newGalleryFileUrl, setNewGalleryFileUrl] = useState('');
  const [newGalleryType, setNewGalleryType] = useState<'image' | 'video'>('image');
  const [showGalleryUploader, setShowGalleryUploader] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleGalleryMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setNewGalleryFileUrl(url);
    if (file.type.startsWith('image/')) {
      setNewGalleryType('image');
    } else if (file.type.startsWith('video/')) {
      setNewGalleryType('video');
    }
  };

  const handleAddGalleryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryTitle.trim() || !newGalleryFileUrl) return;

    const newItem = {
      id: `gal-${Date.now()}`,
      title: newGalleryTitle.trim(),
      caption: newGalleryCaption.trim(),
      mediaUrl: newGalleryFileUrl,
      type: newGalleryType
    };

    setGalleryItems([newItem, ...galleryItems]);
    setNewGalleryTitle('');
    setNewGalleryCaption('');
    setNewGalleryFileUrl('');
    setShowGalleryUploader(false);
  };

  // New Achievement form state
  const [achTitle, setAchTitle] = useState('');
  const [achCat, setAchCat] = useState<'Olympiad' | 'Project' | 'Research' | 'Topper Story' | 'Excellence'>('Olympiad');
  const [achDesc, setAchDesc] = useState('');
  const [achOrg, setAchOrg] = useState('');
  const [achYear, setAchYear] = useState('2026');
  const [requestSeal, setRequestSeal] = useState(true);

  // New Project form state
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projCollabs, setProjCollabs] = useState('');
  const [projLink, setProjLink] = useState('');
  const [projSkills, setProjSkills] = useState('');

  // Handle Drag/Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateUpload(e.dataTransfer.files[0].name);
    }
  };

  const simulateUpload = (name: string) => {
    setIsUploading(true);
    setUploadedFileName(name);
    setTimeout(() => {
      setIsUploading(false);
    }, 1200);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateUpload(e.target.files[0].name);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Submit profile edit
  const handleEditProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateProfile) {
      onUpdateProfile({
        ...profile,
        name: editName,
        avatar: editAvatar,
        grade: editGrade,
        school: editSchool,
        bio: editBio,
        github: editGithub,
        website: editWebsite,
        avatarUrl: editAvatarUrl,
        bannerUrl: editBannerUrl
      });
    }
    setShowEditProfileModal(false);
  };

  const handleAddAchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle.trim() || !achDesc.trim() || !achOrg.trim()) return;

    const fileToLog = uploadedFileName || 'uploaded_proof_transcript.pdf';

    const newAch: Achievement = {
      id: `ach-${Date.now()}`,
      title: achTitle.trim(),
      description: achDesc.trim(),
      category: achCat,
      institution: achOrg.trim(),
      year: achYear,
      certificateFile: fileToLog,
      verificationStatus: requestSeal ? 'Pending' : 'NotVerified',
      verifiedBy: requestSeal ? `Pending Verification` : undefined
    };

    onAddAchievement(newAch);

    if (requestSeal) {
      onRequestVerification({
        title: achTitle.trim(),
        category: achCat,
        org: achOrg.trim(),
        file: fileToLog,
        details: achDesc.trim()
      });
    }

    // Reset and close
    setAchTitle('');
    setAchDesc('');
    setAchOrg('');
    setUploadedFileName('');
    setShowAchForm(false);
  };

  const handleAddProjSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim() || !projDesc.trim()) return;

    const skillsArray = projSkills.split(',').map(s => s.trim()).filter(s => s.length > 0);

    const newProj: Project = {
      id: `proj-${Date.now()}`,
      title: projTitle.trim(),
      description: projDesc.trim(),
      collaborators: projCollabs.trim() || undefined,
      link: projLink.trim() || undefined,
      skills: skillsArray.length > 0 ? skillsArray : ["Project"],
      verificationStatus: 'Pending'
    };

    onAddProject(newProj);

    // Reset and close
    setProjTitle('');
    setProjDesc('');
    setProjCollabs('');
    setProjLink('');
    setProjSkills('');
    setShowProjForm(false);
  };

  const shareProfileUrl = `https://${editWebsite || 'scholrnet.in/aarav.sharma'}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareProfileUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div id="student-portfolio-view" className="space-y-6">
      
      {/* Student Banner Presentation Card (Sleek LinkedIn-style with Cover) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl text-white relative overflow-hidden flex flex-col shadow-sm">
        {/* Banner Cover image or fallback gradient */}
        <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950">
          {profile.bannerUrl || (profile as any).bannerUrl ? (
            <img 
              src={profile.bannerUrl || (profile as any).bannerUrl} 
              alt="Profile Cover Banner" 
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-85" 
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/60 via-slate-900 to-blue-950/70" />
          )}
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[0.5px]" />
          <div className="absolute bottom-3 right-4 bg-black/50 border border-white/10 rounded-full px-3 py-1 text-[9px] font-bold text-slate-300 pointer-events-none select-none">
            Verifiable Identity Page
          </div>
        </div>

        {/* Profile Stats & Details Block */}
        <div className="p-5 sm:p-7 pt-0 -mt-8 sm:-mt-10 relative flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
            {/* Profile Avatar Picture or Initials Icon */}
            <div className="w-18 h-18 sm:w-22 sm:h-22 rounded-2xl border-4 border-slate-950 bg-gradient-to-br from-orange-500 to-rose-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-xl relative shrink-0 overflow-hidden select-none">
              {profile.avatarUrl || (profile as any).avatarUrl ? (
                <img 
                  src={profile.avatarUrl || (profile as any).avatarUrl} 
                  alt={profile.name} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover" 
                />
              ) : (
                profile.avatar
              )}
            </div>

            <div className="pt-2 sm:pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-xl font-bold tracking-tight">{profile.name}</span>
                <span className="inline-flex items-center gap-1 bg-blue-900/60 text-blue-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-blue-700/50">
                  <CheckCircle size={10} className="text-emerald-500 fill-emerald-500" />
                  Grade XII Portfolio Active
                </span>
              </div>
              <p className="text-sm font-semibold text-orange-200 mt-1">{profile.grade}</p>
              <p className="text-xs text-slate-300 mt-0.5">{profile.school}</p>
              
              <div className="flex flex-wrap items-center gap-3.5 mt-2">
                {profile.github && (
                  <a href={`https://${profile.github}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors">
                    <Github size={12} /> {profile.github}
                  </a>
                )}
                <a href={shareProfileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors">
                  <Globe size={11} /> {profile.website || 'scholrnet.in/aarav.sharma'}
                </a>
              </div>

              <p className="text-xs text-slate-300 max-w-lg mt-3 bg-white/5 p-3 rounded-xl border border-white/10 italic">
                "{profile.bio}"
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col justify-between items-center sm:items-stretch gap-4 border-t border-white/10 md:border-t-0 pt-4 md:pt-0 shrink-0">
            {/* Display Stats */}
            <div className="flex gap-3 text-center w-full">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1">
                <span className="block text-xl font-black text-orange-400">{achievements.filter(a => a.verificationStatus === 'Verified').length}</span>
                <span className="text-[10px] text-slate-350 uppercase tracking-widest font-black">Verified Seals</span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex-1">
                <span className="block text-xl font-black text-blue-400">{achievements.length + projects.length}</span>
                <span className="text-[10px] text-slate-350 uppercase tracking-widest font-black">Milestones</span>
              </div>
            </div>

            {/* Visual Action Toolbar */}
            <div className="flex flex-wrap gap-2 w-full justify-center sm:justify-start">
              <button
                id="edit-profile-btn"
                onClick={() => {
                  setEditName(profile.name);
                  setEditAvatar(profile.avatar);
                  setEditGrade(profile.grade);
                  setEditSchool(profile.school);
                  setEditBio(profile.bio);
                  setEditGithub(profile.github || 'github.com/aarav-sharma');
                  setEditWebsite(profile.website || 'scholrnet.in/aarav.sharma');
                  setShowEditProfileModal(true);
                }}
                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Edit3 size={13} /> Edit Bio
              </button>
              <button
                id="share-profile-btn"
                onClick={() => setShowShareModal(true)}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs p-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Get Public OG Share Card Link"
              >
                <Share2 size={13} /> Share Link
              </button>
              <button
                id="download-transcript-btn"
                onClick={() => setShowPdfModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
              >
                <Download size={13} /> Export CV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Achievements & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Credentials Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* SEC 1: Academic Achievements */}
          <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <div className="bg-orange-50 dark:bg-orange-950/20 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm">Academic Achievements & Honors</h3>
                  <p className="text-[10px] text-slate-400">Verifiably proven qualifications and Olympiad scores</p>
                </div>
              </div>

              <button
                id="add-award-btn"
                type="button"
                onClick={() => setShowAchForm(!showAchForm)}
                className="bg-blue-950 dark:bg-[#1b2234] hover:bg-blue-900 text-white border dark:border-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Award
              </button>
            </div>

            {/* Achievement Creator Form with Drag and Drop mock proof uploader */}
            {showAchForm && (
              <form onSubmit={handleAddAchSubmit} className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-150 dark:border-slate-850 space-y-3.5 text-xs">
                <h4 className="font-extrabold text-slate-850 dark:text-slate-200">Record a New Academic Honor</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">HONOR TITLE*</label>
                    <input
                      type="text"
                      placeholder="e.g. CBSE District Science Topper"
                      value={achTitle}
                      onChange={(e) => setAchTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-550 text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">CATEGORY*</label>
                    <select
                      value={achCat}
                      onChange={(e) => setAchCat(e.target.value as any)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-550 text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      <option value="Olympiad">🏆 Olympiad Merit</option>
                      <option value="Project">💻 Project Masterpiece</option>
                      <option value="Research">🔬 Scientific Research</option>
                      <option value="Topper Story">📖 Topper Story / Scholars</option>
                      <option value="Excellence">🌟 Leadership / Curricular Excellence</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">AWARDING INSTITUTION*</label>
                  <input
                    type="text"
                    placeholder="e.g. Science Olympiad Foundation, Delhi Board"
                    value={achOrg}
                    onChange={(e) => setAchOrg(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">CONFERRED YEAR*</label>
                    <input
                      type="text"
                      value={achYear}
                      onChange={(e) => setAchYear(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">PROOF/CERTIFICATE FILE (DRAG & DROP SUPPORT)*</label>
                    
                    {/* Interactive drag-and-drop uploader box */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={triggerFileSelect}
                      className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                        dragActive ? 'border-orange-500 bg-orange-50/10' : 'border-slate-250 dark:border-slate-800 hover:border-slate-400 hover:bg-slate-50/10'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".pdf,.jpg,.png"
                      />
                      
                      {isUploading ? (
                        <div className="space-y-1">
                          <Clock size={16} className="text-orange-500 animate-spin mx-auto" />
                          <span className="text-[10px] font-bold text-slate-500 block">Uploading & hashing proof credentials...</span>
                        </div>
                      ) : uploadedFileName ? (
                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-bold">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="text-[11px] truncate whitespace-nowrap overflow-ellipsis max-w-xs">{uploadedFileName} uploaded!</span>
                        </div>
                      ) : (
                        <div className="space-y-1 text-slate-400">
                          <Upload size={16} className="mx-auto text-slate-400" />
                          <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-500">Drag files here or Click to upload</p>
                          <p className="text-[9px] text-slate-400">Accepts transcripts, certificate digests, or project drafts</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">AWARD DESCRIPTION & SIGNIFICANCE</label>
                  <textarea
                    placeholder="Outline your score, achievements, national percentile, or details about the challenge."
                    value={achDesc}
                    onChange={(e) => setAchDesc(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 h-16 focus:outline-none resize-none text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="requestSeal"
                    checked={requestSeal}
                    onChange={(e) => setRequestSeal(e.target.checked)}
                    className="h-4 w-4 accent-blue-950 rounded cursor-pointer"
                  />
                  <label htmlFor="requestSeal" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    Submit verification request to School Counselor (DPS Coordinator)
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAchForm(false)}
                    className="bg-transparent text-slate-550 border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-600 font-bold text-white px-4 py-1.5 rounded-lg hover:bg-orange-700 cursor-pointer"
                  >
                    Add Honor
                  </button>
                </div>
              </form>
            )}

            {/* Achievements List Display */}
            <div className="space-y-4">
              {achievements.map((ach) => {
                let badgeLabel = "Olympiad";
                let badgeColor = "bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900";
                if (ach.category === 'Project') {
                  badgeLabel = "Coding Project";
                  badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900";
                } else if (ach.category === 'Research') {
                  badgeLabel = "Research";
                  badgeColor = "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900";
                } else if (ach.category === 'Topper Story') {
                  badgeLabel = "Topper Story";
                  badgeColor = "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900";
                }

                return (
                  <motion.div
                    key={ach.id}
                    whileHover={{ scale: 1.015, y: -2 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="relative border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:border-slate-200 dark:hover:border-slate-755 transition-colors bg-slate-50/20 dark:bg-slate-900/10 cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                      <div>
                        {/* Title and Category Badge */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm leading-tight">{ach.title}</span>
                          <span className={`text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                            {badgeLabel}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{ach.institution} • {ach.year}</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{ach.description}</p>
                        
                        {ach.certificateFile && (
                          <div className="mt-3 flex items-center gap-1.5 text-slate-400">
                            <FileText size={11} className="text-slate-500" />
                            <span className="text-[10px] font-mono select-none text-slate-450">{ach.certificateFile}</span>
                          </div>
                        )}
                      </div>

                      {/* Verification Badge */}
                      <div className="sm:text-right flex-shrink-0 self-start">
                        {ach.verificationStatus === 'Verified' ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-[#1b2234] text-blue-900 dark:text-blue-300 text-[10px] font-extrabold px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 shadow-sm">
                              <CheckCircle size={10} className="text-blue-800 dark:text-blue-400 fill-blue-800/10" />
                              VERIFIED SEAL
                            </span>
                            <div className="text-[9px] text-slate-400 dark:text-slate-500 block font-mono">
                              Verified by: {ach.verifiedBy}
                              <span className="hidden sm:block mt-0.5 opacity-60">ID: {ach.verificationHash}</span>
                            </div>
                          </div>
                        ) : ach.verificationStatus === 'Pending' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-yellow-200 dark:border-yellow-905">
                              <Clock size={10} className="animate-pulse text-yellow-600" />
                              PENDING SIGNATURE
                            </span>
                            <span className="text-[9px] text-slate-400 block dark:text-slate-500">Submitting proofs...</span>
                          </div>
                        ) : (
                          <div className="space-y-0.5 animate-in">
                            <span className="inline-flex items-center gap-1 bg-slate-50 dark:bg-slate-900/80 text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800">
                              <AlertTriangle size={10} />
                              UNVERIFIED
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* SEC 2: Ongoing Research & Projects */}
          <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Code size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm">Innovations & Practical Coding Projects</h3>
                  <p className="text-[10px] text-slate-400">Collaborative prototypes, web apps, and machine learning models</p>
                </div>
              </div>

              <button
                id="add-proj-btn"
                type="button"
                onClick={() => setShowProjForm(!showProjForm)}
                className="bg-blue-950 dark:bg-[#1b2234] hover:bg-blue-900 text-white border dark:border-slate-800 font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Project
              </button>
            </div>

            {/* Project Creator Form */}
            {showProjForm && (
              <form onSubmit={handleAddProjSubmit} className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-150 dark:border-slate-850 space-y-3.5 text-xs">
                <h4 className="font-bold text-slate-850 dark:text-slate-200">Record a Practical Project</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">PROJECT TITLE*</label>
                    <input
                      type="text"
                      placeholder="e.g. CBSE Grade-12 Chemistry Lab Calculator"
                      value={projTitle}
                      onChange={(e) => setProjTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-550 text-xs text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">REPOSITORY/LINK (E.G. GITHUB)</label>
                    <input
                      type="text"
                      placeholder="e.g. github.com/user/project"
                      value={projLink}
                      onChange={(e) => setProjLink(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-orange-550 text-xs text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">COLLABORATORS (OPTIONAL)</label>
                    <input
                      type="text"
                      placeholder="e.g. Raj Kumar, Aisha Patel"
                      value={projCollabs}
                      onChange={(e) => setProjCollabs(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">SKILLS USED (COMMA SEPARATED)*</label>
                    <input
                      type="text"
                      placeholder="e.g. Python, Recharts, Electronics"
                      value={projSkills}
                      onChange={(e) => setProjSkills(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 focus:outline-none text-slate-800 dark:text-slate-100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">DETAILED PROJECT SPECS</label>
                  <textarea
                    placeholder="Describe your design parameters, target audience, and engineering constraints."
                    value={projDesc}
                    onChange={(e) => setProjDesc(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 h-16 focus:outline-none resize-none text-slate-800 dark:text-slate-100"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowProjForm(false)}
                    className="bg-transparent text-slate-550 border border-slate-200 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-600 font-bold text-white px-4 py-1.5 rounded-lg hover:bg-orange-700 cursor-pointer"
                  >
                    Save Project
                  </button>
                </div>
              </form>
            )}

            {/* Display Projects */}
            <div className="space-y-4">
              {projects.map((proj) => (
                <div key={proj.id} className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 hover:border-slate-200 dark:hover:border-slate-700 transition-colors bg-slate-50/20 dark:bg-slate-900/10">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{proj.title}</span>
                        {proj.link && (
                          <a
                            href={`https://${proj.link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md hover:underline"
                          >
                            <Globe size={10} /> Link
                          </a>
                        )}
                      </div>

                      {proj.collaborators && (
                        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Collaborators: {proj.collaborators}</p>
                      )}

                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed mt-1">{proj.description}</p>

                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {proj.skills.map((skill) => (
                          <span key={skill} className="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold text-[9px] px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="sm:text-right flex-shrink-0 self-start">
                      {proj.verificationStatus === 'Verified' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-250 dark:border-emerald-900">
                          <CheckCircle size={10} className="text-emerald-700 dark:text-emerald-500 fill-emerald-100/10" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 text-[10px] font-extrabold px-3 py-1 rounded-full border border-yellow-250 dark:border-yellow-900">
                          <Clock size={10} className="animate-pulse" />
                          EVALUATING
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SEC 3: Student Media Showcase Gallery */}
          <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-4 sm:p-5.5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-850">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                  <Upload size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-sm">Portfolio Showcase Highlights</h3>
                  <p className="text-[10px] text-slate-400">Add local pictures and videos from device gallery of certificates, projects, and exhibitions</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGalleryUploader(!showGalleryUploader)}
                className="bg-[#0a66c2] hover:bg-blue-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Highlight
              </button>
            </div>

            {/* Gallery Item Creator Form */}
            {showGalleryUploader && (
              <form onSubmit={handleAddGalleryItem} className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-150 dark:border-slate-850 space-y-3.5 text-xs text-slate-705 dark:text-slate-305">
                <span className="font-extrabold text-[10px] text-orange-550 uppercase tracking-widest block">Add Device Highlight Photo / File</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">HIGHLIGHT TITLE</label>
                    <input
                      type="text"
                      placeholder="e.g. Science Fair Trophy or Project Presentation"
                      value={newGalleryTitle}
                      onChange={(e) => setNewGalleryTitle(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-orange-550 text-xs text-slate-850 dark:text-slate-150"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">SELECT DEVICE FILE (PHOTO/VIDEO)</label>
                    <input 
                      type="file" 
                      accept="image/*,video/*" 
                      ref={galleryInputRef}
                      onChange={handleGalleryMediaUpload}
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 hover:border-orange-550 rounded-lg p-2.5 font-bold text-left text-xs text-slate-655 dark:text-slate-305 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{newGalleryFileUrl ? "✓ File Ready in Browser" : "Choose device files..."}</span>
                      <Upload size={12} className="text-[#e75107]" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">CAPTION / SPECS DETAILS</label>
                  <textarea
                    placeholder="Provide detailed description of this award certificate or project design outcome..."
                    value={newGalleryCaption}
                    onChange={(e) => setNewGalleryCaption(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg p-2.5 h-14 focus:outline-none resize-none text-slate-850 dark:text-slate-155"
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setShowGalleryUploader(false)}
                    className="bg-transparent text-slate-550 border border-slate-250 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-100 cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="bg-orange-600 font-bold text-white px-4 py-1.5 rounded-lg hover:bg-orange-700 cursor-pointer"
                  >
                    Add Highlight Badge
                  </button>
                </div>
              </form>
            )}

            {/* Grid display of gallery cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {galleryItems.map((item) => (
                <div key={item.id} className="group border border-slate-150 dark:border-slate-850 rounded-xl overflow-hidden bg-slate-50/10 dark:bg-slate-900/10 shadow-3xs flex flex-col hover:shadow-xs transition-all">
                  <div className="h-32 bg-slate-950 w-full overflow-hidden relative border-b border-slate-100 dark:border-slate-850 flex items-center justify-center">
                    {item.type === 'image' ? (
                      <img 
                        src={item.mediaUrl} 
                        alt={item.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                      />
                    ) : (
                      <video src={item.mediaUrl} className="w-full h-full object-cover" controls playsInline />
                    )}
                    <span className="absolute top-2.5 right-2 text-[9px] font-black uppercase tracking-wider bg-slate-900/90 dark:bg-slate-950/90 px-2 py-0.5 rounded-full text-blue-300 border border-blue-900/20 select-none">
                      {item.type} highlight
                    </span>
                  </div>
                  <div className="p-3.5 space-y-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">{item.title}</h4>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">{item.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Column: Mini bento cards */}
        <div className="space-y-6">
          {/* Skill Tag Deck */}
          <div className="bg-white dark:bg-[#131924] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 space-y-3.5">
            <h4 className="text-xs font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">ACADEMIC COMPETENCIES</h4>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="bg-blue-50 dark:bg-blue-950/30 text-blue-905 dark:text-blue-300 border border-blue-105 dark:border-blue-900 font-bold text-xs px-3.5 py-1.5 rounded-xl block shadow-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
            <div className="pt-2">
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Competencies represent credentials that have been earned through successfully approved projects or verified marks in Olympiads.
              </p>
            </div>
          </div>

          {/* Academic Trust Infobox */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-lg p-5 space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2 text-emerald-400">
              <Sparkles size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">How Verification Works</span>
            </div>
            
            <div className="space-y-3 text-xs leading-relaxed text-slate-300 justify-between">
              <p>
                <strong className="text-white">1. Student uploads file:</strong> Add an Olympiad card, certificate pdf, or co-author draft.
              </p>
              <p>
                <strong className="text-white">2. Counselor verifies:</strong> Your high school coordinator evaluates it inside the School Verification portal.
              </p>
              <p>
                <strong className="text-white">3. Public Cryptographic badge:</strong> Verification seals generate a public ID on ScholrNet, proving authenticity to college admissions boards.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: EDIT PROFILE FORM */}
      {showEditProfileModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditProfileModal(false);
          }}
          id="edit-profile-modal" 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fade-in cursor-pointer"
        >
          <div className="bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl space-y-4 animate-in slide-in-from-bottom-5 duration-300 cursor-default">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3 shrink-0">
              <h3 className="text-slate-900 dark:text-white font-extrabold text-sm flex items-center gap-1.5">
                <Edit3 size={15} className="text-orange-550" />
                Edit Student Portfolio Bio Details
              </h3>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditProfileSubmit} className="space-y-3.5 text-xs flex-1 flex flex-col overflow-hidden">
              <div className="space-y-3.5 overflow-y-auto flex-1 pr-1.5 py-1">
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">AVATAR INITIALS</label>
                    <input
                      type="text"
                      maxLength={3}
                      value={editAvatar}
                      onChange={(e) => setEditAvatar(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-black text-center text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">STUDENT NAME</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-bold text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">PROFILE PICTURE FILE (GALLERY)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={avatarFileRef} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditAvatarUrl(URL.createObjectURL(file));
                      }}
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => avatarFileRef.current?.click()}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-orange-550 rounded-lg p-2 font-bold text-left text-slate-650 dark:text-slate-305 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{editAvatarUrl ? "✓ Custom Photo Loaded" : "Choose JPEG/PNG..."}</span>
                      <Upload size={12} className="text-[#e75107]" />
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">COVER COVER BANNER FILE</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={bannerFileRef} 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setEditBannerUrl(URL.createObjectURL(file));
                      }}
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => bannerFileRef.current?.click()}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:border-orange-550 rounded-lg p-2 font-bold text-left text-slate-650 dark:text-slate-305 flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{editBannerUrl ? "✓ Cover Image Loaded" : "Choose Banner Cover..."}</span>
                      <Upload size={12} className="text-[#e75107]" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">CLASS DIVISION / TRACK</label>
                    <input
                      type="text"
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">HIGH SCHOOL INSTITUTION</label>
                    <input
                      type="text"
                      value={editSchool}
                      onKeyPress={(e) => e.stopPropagation()}
                      onChange={(e) => setEditSchool(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-bold mb-1">LITERAL BRAND BIO / STATEMENT</label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 h-16 resize-none text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">PORTAL WEBSITE DIRECTORY LINK</label>
                    <input
                      type="text"
                      value={editWebsite}
                      onChange={(e) => setEditWebsite(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-medium text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold mb-1">GITHUB HANDLE LINK</label>
                    <input
                      type="text"
                      value={editGithub}
                      onChange={(e) => setEditGithub(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-medium text-slate-800 dark:text-white focus:ring-1 focus:ring-orange-550 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-850 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditProfileModal(false)}
                  className="px-4 py-2 bg-transparent text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all cursor-pointer"
                >
                  Save Profile Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SHAREABLE OG PREVIEW CARD MOCKUP */}
      {showShareModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowShareModal(false);
          }}
          id="share-profile-modal" 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fade-in cursor-pointer"
        >
          <div className="bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-2xl p-6 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl space-y-5 animate-in slide-in-from-bottom-5 duration-300 cursor-default">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 shrink-0">
              <div>
                <h3 className="text-slate-900 dark:text-white font-extrabold text-sm flex items-center gap-1.5">
                  <Share2 size={15} className="text-[#e75107]" />
                  Share Public Student Portfolio
                </h3>
                <p className="text-[10px] text-slate-400">This mock defines how your academic profile unfurls across LinkedIn & social cards</p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Simulated Open Graph Preview Card Form */}
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Open Graph Link Unfurl (OG Mock Profile Card)</span>
              
              <div className="border border-slate-200 dark:border-slate-850 rounded-2xl overflow-hidden shadow-xs bg-[#FAF9F6] dark:bg-[#111721]">
                {/* Simulated URL bar */}
                <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 px-3 py-1.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                  <Globe size={10} className="text-slate-400" />
                  <span>https://scholrnet.in/p/aarav.sharma-dps</span>
                </div>
                
                {/* OG Image Design Cover (High Fidelity & Compact) */}
                <div className="bg-gradient-to-tr from-blue-950 via-slate-900 to-orange-600 p-6 text-white relative flex flex-col justify-between min-h-[160px] overflow-hidden">
                  {/* Absolute watermark logo */}
                  <div className="absolute top-3.5 right-4 flex items-center gap-1 opacity-70">
                    <span className="text-[10px] font-black tracking-widest text-white uppercase border border-white/20 bg-white/5 py-0.5 px-2 rounded-md">ScholrNet Grid</span>
                  </div>

                  {/* Header decoration seals */}
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 bg-orange-600 text-white font-extrabold border border-orange-400 rounded-xl flex items-center justify-center text-sm shadow-sm select-none">
                      {profile.avatar}
                    </div>
                    
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/20 border border-white/30 text-[9px] font-black uppercase rounded-full tracking-wider text-orange-200 backdrop-blur-xs">
                      🏆 Verified Ledger Portfolio
                    </span>
                  </div>

                  <div className="space-y-1 pt-4">
                    <h4 className="text-base font-black tracking-tight">{profile.name}</h4>
                    <p className="text-[11px] font-bold text-orange-200 leading-none">{profile.grade}</p>
                    <p className="text-[10px] text-slate-300 leading-none">{profile.school}</p>
                    <p className="text-[10px] text-slate-350 italic max-w-sm truncate mt-2">
                      "{profile.bio}"
                    </p>
                  </div>
                </div>

                {/* Open Graph metadata details below visual boundary */}
                <div className="p-3 bg-white dark:bg-[#131924] border-t border-slate-150 dark:border-slate-850">
                  <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block">SCHOLRNET.IN</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">{profile.name}’s Certified Research and Olympiad Ledger</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate mt-0.5">Explore the verified records, high school seals, and Innovation index for admissions committees.</p>
                </div>
              </div>
            </div>

            {/* Footer with share link block */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shrink-0">
              <div className="min-w-0">
                <span className="text-[9px] font-black text-slate-400 block uppercase">SHAREABLE PORTFOLIO EMBED URL</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate block font-mono mt-0.5">{shareProfileUrl}</span>
              </div>

              <div className="flex gap-2 self-start sm:self-auto shrink-0">
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
                >
                  {copiedLink ? <Check size={12} /> : <Copy size={12} />}
                  {copiedLink ? "Link Copied!" : "Copy URL"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CRYPTOGRAPHIC VERIFIED PDF TRANSCRIPT EXPORT PREVIEW */}
      {showPdfModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPdfModal(false);
          }}
          id="pdf-transcript-modal" 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fade-in cursor-pointer"
        >
          <div className="bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-2xl p-6 max-w-3xl w-full shadow-2xl space-y-4 animate-in slide-in-from-bottom-5 duration-300 max-h-[90vh] overflow-y-auto cursor-default">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-slate-900 dark:text-white font-extrabold text-sm flex items-center gap-1.5">
                  <FileText size={15} className="text-emerald-500" />
                  Verified Portable PDF Portfolio Export
                </h3>
                <p className="text-[10px] text-slate-400">Cryptographically signed academic record card ready for admissions dossiers</p>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* Official Looking Transcript sheet */}
            <div className="border border-slate-250 dark:border-slate-850 p-6 bg-white text-slate-900 font-sans shadow-inner space-y-6 select-none relative" style={{ color: '#0f172a' }}>
              {/* High School Letterhead banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-slate-900 pb-4 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black tracking-wider block" style={{ color: '#c2410c' }}>OFFICIAL VERIFIED PORTABLE PORTFOLIO CREDENTIAL</span>
                  <h4 className="text-base font-black uppercase tracking-tight" style={{ color: '#1e3a8a' }}>DELHI PUBLIC SCHOOL (DPS)</h4>
                  <p className="text-xs font-bold">R.K. PURAM, NEW DELHI, INDIA</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500">Affiliated to CBSE • Institutional Registration Code: 30129</p>
                </div>
                
                <div className="text-right flex flex-col items-start sm:items-end">
                  <div className="bg-blue-950 text-white text-[9px] font-bold px-3 py-1 rounded border border-orange-500 font-mono">
                    SCHOLRINDEX LEDGER SECURED
                  </div>
                  <span className="text-[8px] text-slate-450 mt-1 block font-mono">TS ID: {Math.random().toString(16).substring(2, 10).toUpperCase()}</span>
                </div>
              </div>

              {/* General Student Meta Metadata */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-150">
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide">FULL LEGAL NAME</span>
                  <span className="font-extrabold" style={{ color: '#0f172a' }}>{profile.name}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide">ENROLLED ACADEMIC CLASS</span>
                  <span className="font-bold text-slate-800">{profile.grade}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide">VERIFIED SEALS INDEX</span>
                  <span className="font-bold text-emerald-700">🏆 {achievements.filter(a => a.verificationStatus === 'Verified').length} Certified Records</span>
                </div>
                <div>
                  <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wide">TRANSCRIPT DATE</span>
                  <span className="font-bold text-slate-800">2026-05-22</span>
                </div>
              </div>

              {/* Achievements Block on Transcript */}
              <div className="space-y-3.5">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">PART I: VERIFIED ACADEMIC ACHIEVEMENTS AND OLYMPIADS</h5>
                
                <div className="space-y-3 font-mono text-[10px]">
                  {achievements.filter(a => a.verificationStatus === 'Verified').map((ach) => (
                    <div key={ach.id} className="border border-slate-150 p-3 rounded-lg flex justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-900" style={{ color: '#0f172a' }}>{ach.title}</span>
                          <span className="text-[8px] uppercase tracking-wider bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded border border-orange-100">
                            SEAL APPROVED
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-550 mt-0.5">{ach.institution} • {ach.year}</p>
                        <p className="text-[9px] text-slate-600 mt-1" style={{ fontFamily: 'monospace' }}>{ach.description}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[8.5px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded block border border-emerald-200">
                          CO-SIGNED Verified Seal
                        </span>
                        <span className="text-[8px] text-slate-400 block mt-1 font-mono">HASH: {ach.verificationHash || 'SCHOLR-5D129'}</span>
                      </div>
                    </div>
                  ))}
                  
                  {achievements.filter(a => a.verificationStatus === 'Verified').length === 0 && (
                    <p className="text-[10px] text-slate-400 font-bold italic">No verifiably sealed honors entered on transcript yet in this stream.</p>
                  )}
                </div>
              </div>

              {/* Verified Projects block */}
              <div className="space-y-3.5">
                <h5 className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 pb-1">PART II: PRACTICAL CODING AND RESEARCH VENTURES</h5>
                
                <div className="space-y-3 font-mono text-[10px]">
                  {projects.filter(p => p.verificationStatus === 'Verified').map((proj) => (
                    <div key={proj.id} className="border border-slate-150 p-3 rounded-lg flex justify-between gap-4">
                      <div>
                        <span className="font-black" style={{ color: '#0f172a' }}>{proj.title}</span>
                        {proj.collaborators && <p className="text-[9px] text-slate-400 mt-0.5">Collaborators: {proj.collaborators}</p>}
                        <p className="text-[9px] text-slate-650 mt-1">{proj.description}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[8.5px] bg-emerald-50 text-emerald-805 font-black border border-emerald-150 px-2.5 py-1 rounded block">
                          VERIFIED LAB CODE
                        </span>
                      </div>
                    </div>
                  ))}

                  {projects.filter(p => p.verificationStatus === 'Verified').length === 0 && (
                    <p className="text-[10px] text-slate-400 font-bold italic">No verifiably sealed innovate projects recorded yet in this stream.</p>
                  )}
                </div>
              </div>

              {/* Signatures block */}
              <div className="grid grid-cols-2 pt-10 border-t border-dashed border-slate-350 text-[10px]">
                <div>
                  <p className="font-black text-slate-800">Mrs. Shreya Sen</p>
                  <p className="text-slate-400 text-[9px] uppercase tracking-wide">High School Admissions Coordinator & Counselor</p>
                  <div className="mt-1 h-1 shadow-inner bg-slate-900 w-24"></div>
                  <span className="text-[8px] font-mono text-slate-400 block mt-0.5">Signed cryptographically: DPS-CO-D59A</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className="text-[9px] font-black text-[#e75107] border border-[#c15908] px-2 py-1 rounded bg-[#fff9f9] tracking-wider select-none">
                    ScholrNet SEAL
                  </span>
                  <span className="text-[8px] text-slate-400 block mt-1 font-mono">ID: SECURE-LEDGER-DPS-XII-MEMBER</span>
                </div>
              </div>
            </div>

            {/* Action Buttons to print */}
            <div className="flex justify-between items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold truncate">✨ Tip: You can choose "Save as PDF" in your system print settings!</span>
              
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="px-4 py-2 bg-transparent text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 font-bold transition-all cursor-pointer text-xs"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs"
                >
                  <Download size={12} /> Confirm & Print to PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
