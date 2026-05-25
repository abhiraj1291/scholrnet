import React, { useState } from 'react';
import { Post, Comment, Ad } from '../types';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Award, 
  FileText, 
  Code, 
  Users, 
  Search, 
  Send, 
  CheckCircle, 
  Video, 
  Play, 
  ExternalLink, 
  EyeOff, 
  Trash2, 
  Plus, 
  Film,
  Image
} from 'lucide-react';

interface FeedSectionProps {
  posts: Post[];
  currentUser: { name: string; avatar: string; school: string; isVerified?: boolean };
  onUpdatePosts: (updatedPosts: Post[]) => void;
  externalSearchQuery?: string;
  connections: string[];
  onToggleConnect: (name: string) => void;
  onViewProfile?: (name: string) => void;
  onViewSchool?: (schoolName: string) => void;
  ads: Ad[];
  onAdClick?: (adId: string) => void;
  isAdminView?: boolean;
}

// Subcomponent: LinkedIn-Style Interactive Sponsored Card
export function AdCard({ ad, onAdClick }: { ad: Ad; onAdClick?: (adId: string) => void }) {
  if (!ad) return null;
  return (
    <div className="bg-[#f0f4f9] border border-blue-100 rounded-2xl p-5 mb-5 shadow-3xs relative overflow-hidden group transition-all hover:bg-[#ebf0f7]">
      {/* Decorative Accent */}
      <div className="absolute top-0 right-0 bg-[#0a66c2] text-[9px] text-white font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-widest shadow-3xs">
        Sponsored
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Ad Image / Visual Theme */}
        <div 
          style={{ background: ad.image || 'linear-gradient(135deg, #0a66c2 0%, #0369a1 100%)' }}
          className="w-full sm:w-28 h-20 rounded-xl flex items-center justify-center text-white shrink-0 shadow-inner font-extrabold text-xs text-center p-2 uppercase tracking-wide select-none"
        >
          {ad.company}
        </div>
        
        {/* Ad Content */}
        <div className="flex-1 space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{ad.company}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              <span className="text-[10px] text-[#0a66c2] font-semibold hover:underline cursor-pointer flex items-center gap-0.5">
                Verifiable Academy Sponsor <ExternalLink size={8} />
              </span>
            </div>
            
            <h4 className="font-extrabold text-sm text-slate-800 group-hover:text-[#0a66c2] transition-colors leading-snug mt-1">{ad.title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed mt-1">{ad.content}</p>
          </div>
          
          <div className="pt-2 flex items-center justify-between gap-4">
            <span className="text-[10px] text-slate-400 font-medium">Brought to you by ScholrNet Partnerships</span>
            <a 
              href={ad.ctaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onAdClick && onAdClick(ad.id)}
              className="inline-flex items-center gap-1.5 bg-[#0a66c2] hover:bg-[#004b8d] text-white text-xs font-bold px-4 py-2 rounded-full shadow-3xs hover:shadow-2xs transition-all shrink-0 cursor-pointer"
            >
              <span>{ad.ctaText}</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedSection({ 
  posts, 
  currentUser, 
  onUpdatePosts, 
  externalSearchQuery,
  connections,
  onToggleConnect,
  onViewProfile,
  onViewSchool,
  ads = [],
  onAdClick,
  isAdminView = false
}: FeedSectionProps) {
  const [activeFilter, setActiveFilter] = useState<'all' | 'achievement' | 'project' | 'research' | 'collaboration'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // School search states
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostType, setNewPostType] = useState<'achievement' | 'project' | 'research' | 'collaboration'>('achievement');
  const [newPostBadge, setNewPostBadge] = useState('');
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // Custom video post-attaching states
  const [newPostVideoUrl, setNewPostVideoUrl] = useState('');
  const [showVideoToggle, setShowVideoToggle] = useState(false);
  const [newPostImageUrl, setNewPostImageUrl] = useState('');
  const [galleryMediaPreview, setGalleryMediaPreview] = useState<string | null>(null);
  const [galleryMediaType, setGalleryMediaType] = useState<'image' | 'video' | null>(null);
  const mediaInputRef = React.useRef<HTMLInputElement>(null);

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setGalleryMediaPreview(fileUrl);
    
    if (file.type.startsWith('image/')) {
      setGalleryMediaType('image');
      setNewPostImageUrl(fileUrl);
      setNewPostVideoUrl(''); // reset video url
    } else if (file.type.startsWith('video/')) {
      setGalleryMediaType('video');
      setNewPostVideoUrl(fileUrl);
      setNewPostImageUrl(''); // reset image url
    }
  };

  const clearAttachedMedia = () => {
    setGalleryMediaPreview(null);
    setGalleryMediaType(null);
    setNewPostImageUrl('');
    setNewPostVideoUrl('');
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  // Preset demo videos so users have immediate access to engaging media
  const DEMO_VIDEO_PRESETS = [
    { title: "🤖 IoT Robot Demo", url: "https://www.youtube.com/embed/Y-i-g7-TWhs" },
    { title: "🔬 Frequencies Lab", url: "https://www.youtube.com/embed/R8yFr6O9Lek" },
    { title: "💻 Portfolio Pitch", url: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
  ];

  // Filter ads for in-feed list
  const inFeedAds = ads.filter(a => a.placement === 'in_feed');

  // Handle Likes
  const handleLike = (id: string) => {
    const updated = posts.map(post => {
      if (post.id === id) {
        const liked = !post.likedByMe;
        return {
          ...post,
          likes: liked ? post.likes + 1 : post.likes - 1,
          likedByMe: liked
        };
      }
      return post;
    });
    onUpdatePosts(updated);
  };

  // Add Comment
  const handleAddComment = (postId: string) => {
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: currentUser.name,
      avatar: currentUser.avatar,
      text: commentText.trim(),
      timestamp: "Just now"
    };

    const updated = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...post.comments, newComment]
        };
      }
      return post;
    });

    onUpdatePosts(updated);
    setCommentText('');
  };

  // Create Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !newPostTitle.trim()) return;

    const newPost: Post = {
      id: `post-${Date.now()}`,
      author: {
        name: currentUser.name,
        avatar: currentUser.avatar,
        school: currentUser.school,
        isVerified: currentUser.isVerified !== false // default true
      },
      type: newPostType,
      title: newPostTitle.trim(),
      content: newPostContent.trim(),
      badgeText: newPostBadge.trim() || undefined,
      likes: 0,
      comments: [],
      tags: [newPostType.toUpperCase(), "STUDENT_LOG"],
      timestamp: "Just now",
      videoUrl: newPostVideoUrl.trim() || undefined,
      imageUrl: newPostImageUrl.trim() || undefined
    };

    onUpdatePosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostBadge('');
    setNewPostVideoUrl('');
    setShowVideoToggle(false);
    clearAttachedMedia();
  };

  // Delete / Hide Post for Platform Admin moderation
  const handleModerationHide = (postId: string) => {
    const updated = posts.map(p => {
      if (p.id === postId) {
        return { ...p, isHidden: !p.isHidden };
      }
      return p;
    });
    onUpdatePosts(updated);
  };

  // Filters and search logic (Admins can also see hidden posts to manage them)
  const filteredPosts = posts.filter(post => {
    // Hidden posts filtered out for students, visible for admins
    if (post.isHidden && !isAdminView) return false;

    const matchesFilter = activeFilter === 'all' || post.type === activeFilter;
    const searchLower = (externalSearchQuery || searchQuery || '').toLowerCase();
    const matchesSearch = 
      post.title.toLowerCase().includes(searchLower) ||
      post.content.toLowerCase().includes(searchLower) ||
      post.author.name.toLowerCase().includes(searchLower) ||
      post.author.school.toLowerCase().includes(searchLower);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Create Showcase Post Box (Students & Schools both leverage this) */}
      {!isAdminView && (
        <form onSubmit={handleCreatePost} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0a66c2] text-white font-extrabold flex items-center justify-center text-sm shadow-inner shrink-0">
              {currentUser.avatar}
            </div>
            <div className="flex-1 space-y-3">
              <input
                type="text"
                placeholder="What academic feat or project milestone are you showcasing?"
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="w-full text-sm font-semibold text-slate-800 placeholder-slate-400 border border-slate-100 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/50 focus:border-transparent transition-all"
                required
              />
              <textarea
                placeholder="Explain the technical background, key outcomes, results, or masteries. Be descriptive so academic counsel can verify and award stamps!"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="w-full text-xs text-slate-600 placeholder-slate-400 border border-slate-100 rounded-xl p-3 h-24 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/50 focus:border-transparent resize-none transition-all"
                required
              />
            </div>
          </div>

          {/* Local Media Input (Hidden) */}
          <input 
            type="file" 
            accept="image/*,video/*" 
            ref={mediaInputRef} 
            onChange={handleMediaUpload} 
            className="hidden" 
          />

          {/* Dynamic Media Preview UI */}
          {galleryMediaPreview && (
            <div className="rounded-xl border border-slate-150 p-2.5 bg-slate-50/50 animate-fade-in flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {galleryMediaType === 'image' ? (
                  <img src={galleryMediaPreview} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                ) : (
                  <video src={galleryMediaPreview} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                )}
                <div className="text-[11px]">
                  <span className="font-bold text-slate-700 block">Attached {galleryMediaType === 'image' ? 'Image File' : 'Video Clip'}</span>
                  <span className="text-slate-400">Media parsed successfully and ready to publish</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={clearAttachedMedia}
                className="text-[10px] font-bold text-red-650 hover:text-red-800 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors select-none cursor-pointer"
              >
                Clear Media
              </button>
            </div>
          )}

          {/* Dynamic Video attachment panel expander */}
          {showVideoToggle && (
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 space-y-3 mt-1 animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-[#0a66c2] flex items-center gap-1.5">
                  <Video size={14} /> Attach Educational Video Showcase
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Optional Media</span>
              </div>
              <input
                type="url"
                placeholder="Paste YouTube Embed URL or any direct MP4 link..."
                value={newPostVideoUrl}
                onChange={(e) => setNewPostVideoUrl(e.target.value)}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2] text-slate-700"
              />
              <div>
                <span className="text-[10px] text-slate-400 font-bold block mb-1.5">Quick Academic Presets:</span>
                <div className="flex flex-wrap gap-2">
                  {DEMO_VIDEO_PRESETS.map(pre => (
                    <button
                      type="button"
                      key={pre.title}
                      onClick={() => {
                        setNewPostVideoUrl(pre.url);
                      }}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border font-bold transition-all ${
                        newPostVideoUrl === pre.url
                          ? 'bg-blue-900 border-blue-900 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pre.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
            {/* Left Options Configs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={newPostType}
                onChange={(e) => setNewPostType(e.target.value as any)}
                className="bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 font-bold text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-900"
              >
                <option value="achievement">🏆 Achievement</option>
                <option value="project">💻 Coding / Project</option>
                <option value="research">🔬 Research Paper</option>
                <option value="collaboration">🤝 Teammate Search</option>
              </select>

              <input
                type="text"
                placeholder="Specific Badge (e.g. NTSE Finalist)"
                value={newPostBadge}
                onChange={(e) => setNewPostBadge(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-slate-600 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-900 w-40 font-medium"
              />

              <button
                type="button"
                onClick={() => mediaInputRef.current?.click()}
                className={`flex items-center gap-1 border rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  galleryMediaPreview 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Select Photo or Video from Device Gallery"
              >
                <Image size={12} />
                <span>{galleryMediaPreview ? "✓ Media Attached" : "+ Upload Media"}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVideoToggle(!showVideoToggle)}
                className={`flex items-center gap-1 border rounded-lg px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  showVideoToggle 
                    ? 'bg-orange-50 text-orange-600 border-orange-200' 
                    : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Video size={12} />
                <span>{newPostVideoUrl && !galleryMediaPreview ? "✓ Embed Video Attached" : "+ Embed Video"}</span>
              </button>
            </div>

            <button
              type="submit"
              className="bg-[#0a66c2] hover:bg-[#004b8d] active:scale-95 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Send size={13} />
              Post Showcase
            </button>
          </div>
        </form>
      )}

      {/* Search High Schools Directory Widget (LinkedIn Business Pages Style) */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 relative" id="school-search-widget">
        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mb-2">
          <span>🏫 Search High Schools Directories (LinkedIn Business Pages)</span>
        </label>
        <div className="relative">
          <input 
            type="text"
            placeholder="Search school registries (e.g. Campion Mumbai, Delhi Public School, Doon...)"
            value={schoolSearchQuery}
            onChange={(e) => {
              setSchoolSearchQuery(e.target.value);
              setShowSchoolDropdown(true);
            }}
            onFocus={() => setShowSchoolDropdown(true)}
            className="w-full text-xs bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-900"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          
          {showSchoolDropdown && schoolSearchQuery && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-100">
              {(() => {
                const list = [
                  { name: "Delhi Public School (DPS), R.K. Puram", tagline: "Service Before Self", avatar: "🏢", location: "New Delhi, India" },
                  { name: "Campion School, Mumbai", tagline: "Joy in Learning", avatar: "🏫", location: "Mumbai, Maharashtra" },
                  { name: "The Doon School, Dehradun", tagline: "The Aristocracy of Service", avatar: "🏰", location: "Dehradun, Uttarakhand" }
                ].filter(s => 
                  s.name.toLowerCase().includes(schoolSearchQuery.toLowerCase()) ||
                  s.location.toLowerCase().includes(schoolSearchQuery.toLowerCase())
                );
                
                if (list.length === 0) {
                  return <div className="p-3 text-center text-xs text-slate-400 font-medium">No schools match your query</div>;
                }
                
                return list.map((sch, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      onViewSchool?.(sch.name);
                      setShowSchoolDropdown(false);
                      setSchoolSearchQuery('');
                    }}
                    className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                  >
                    <span className="text-xl shrink-0">{sch.avatar}</span>
                    <div className="space-y-0.5 truncate0">
                      <h5 className="text-xs font-bold text-slate-800 truncate">{sch.name}</h5>
                      <p className="text-[10px] text-[#0a66c2] font-semibold truncate">{sch.tagline}</p>
                      <p className="text-[9px] text-slate-400 truncate">{sch.location}</p>
                    </div>
                  </button>
                ));
              })()}
            </div>
          )}
        </div>
        
        {/* Quick Link Tag Chips of schools */}
        <div className="flex flex-wrap items-center gap-2 mt-2.5">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mr-1">Direct Links:</span>
          {[
            { name: "Delhi Public School (DPS), R.K. Puram", avatar: "🏢" },
            { name: "Campion School, Mumbai", avatar: "🏫" },
            { name: "The Doon School, Dehradun", avatar: "🏰" }
          ].map((sch, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onViewSchool?.(sch.name)}
              className="bg-white hover:bg-slate-100 text-[10px] font-extrabold text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
            >
              <span>{sch.avatar}</span>
              <span>{sch.name.split(',')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid Filter Tags */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'all', label: 'All Feeds' },
            { id: 'achievement', label: '🏆 Achievements' },
            { id: 'project', label: '💻 Projects' },
            { id: 'research', label: '🔬 Research' },
            { id: 'collaboration', label: '🤝 Teams' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`text-xs font-semibold px-4 py-2 rounded-xl border focus:outline-none transition-all whitespace-nowrap cursor-pointer ${
                activeFilter === tab.id
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm font-extrabold'
                  : 'bg-white border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search showcases, students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/50 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Main feed listing with mixed Sponsored Interstitials */}
      <div className="space-y-5">
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <Award className="mx-auto text-slate-350 w-12 h-12 mb-3" />
            <p className="font-semibold text-slate-700">No showcase matches your search criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Create an entry for this selection to show university boards!</p>
          </div>
        ) : (
          filteredPosts.map((post, postIndex) => {
            let PostIcon = Award;
            let themeClass = "bg-orange-50 border-orange-100 text-orange-850";
            if (post.type === 'project') {
              PostIcon = Code;
              themeClass = "bg-emerald-50 border-emerald-100 text-emerald-850";
            } else if (post.type === 'research') {
              PostIcon = FileText;
              themeClass = "bg-blue-50 border-blue-100 text-blue-850";
            } else if (post.type === 'collaboration') {
              PostIcon = Users;
              themeClass = "bg-indigo-50 border-indigo-100 text-indigo-850";
            }

            return (
              <React.Fragment key={post.id}>
                
                {/* Visual Post Box */}
                <article className={`bg-white rounded-2xl border shadow-2xs overflow-hidden transition-all ${
                  post.isHidden 
                    ? 'border-red-200 bg-red-50/20' 
                    : 'border-slate-100 hover:shadow-sm'
                }`}>
                  <div className="p-5">
                    {/* Header line info */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => !post.isHidden && onViewProfile && onViewProfile(post.author.name)}
                          className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#0a66c2] to-sky-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md border border-slate-100 cursor-pointer hover:opacity-90 transition-opacity select-none shrink-0"
                        >
                          {post.author.avatar}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              onClick={() => !post.isHidden && onViewProfile && onViewProfile(post.author.name)}
                              className="font-extrabold text-slate-800 text-sm leading-tight hover:text-[#0a66c2] transition-colors cursor-pointer"
                            >
                              {post.author.name}
                            </span>
                            {post.author.isVerified && (
                              <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-blue-1e0 select-none">
                                <CheckCircle size={9} className="fill-blue-600 text-white" />
                                CBSE VERIFIED
                              </span>
                            )}
                            {post.isHidden && (
                              <span className="inline-flex items-center bg-red-100 text-red-750 text-[9px] font-black px-2 py-0.5 rounded-full border border-red-200 select-none">
                                <EyeOff size={9} className="mr-0.5" /> HIDDEN BY SUPERADMIN
                              </span>
                            )}
                          </div>
                          <p 
                            onClick={() => !post.isHidden && onViewSchool && onViewSchool(post.author.school)}
                            className="text-xs text-slate-400 font-medium hover:underline cursor-pointer inline-block mt-0.5"
                          >
                            {post.author.school}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-slate-400 font-bold">{post.timestamp}</span>
                        
                        {/* Admin Action Control Buttons */}
                        {isAdminView ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleModerationHide(post.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                post.isHidden 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              }`}
                              title={post.isHidden ? "Unhide Showcase Post" : "Hide/Flag Post"}
                            >
                              {post.isHidden ? <CheckCircle size={13} /> : <EyeOff size={13} />}
                              <span>{post.isHidden ? "Approve Post" : "Flag / Hide"}</span>
                            </button>
                          </div>
                        ) : (
                          // Standard connect button
                          post.author.name !== currentUser.name && (
                            <button
                              type="button"
                              onClick={() => onToggleConnect(post.author.name)}
                              className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer ${
                                connections.includes(post.author.name)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : 'bg-orange-50 text-orange-600 border border-orange-100 hover:bg-orange-100'
                              }`}
                            >
                              {connections.includes(post.author.name) ? '✓ Linked' : '+ Connect'}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Badge text category marker */}
                    {post.badgeText && (
                      <div className={`inline-flex items-center gap-1.5 border px-3 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase mb-3 ${themeClass}`}>
                        <PostIcon size={11} strokeWidth={2.5} />
                        {post.badgeText}
                      </div>
                    )}

                    {/* Title and technical writing */}
                    <h3 className="font-bold text-slate-800 text-sm sm:text-base mb-2">{post.title}</h3>
                    <p className="text-slate-650 text-xs sm:text-sm leading-relaxed whitespace-pre-line">{post.content}</p>

                    {/* Image attachment rendering */}
                    {post.imageUrl && !post.isHidden && (
                      <div className="mt-4 mb-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs max-h-[440px] flex items-center justify-center">
                        <img 
                          src={post.imageUrl} 
                          alt="Post Attachment" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover max-h-[440px] transition-transform duration-300 hover:scale-[1.01]" 
                        />
                      </div>
                    )}

                    {/* Interactive video component rendering */}
                    {post.videoUrl && !post.isHidden && (
                      <div className="mt-4 mb-2 relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-2xs">
                        <div className="absolute top-3 left-3 z-10 bg-slate-900/90 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                          <Film size={10} className="text-orange-500 animate-pulse" />
                          🎬 VIDEO SHOWCASE
                        </div>
                        {post.videoUrl.includes('youtube.com') || post.videoUrl.includes('youtu.be') || post.videoUrl.includes('embed') ? (
                          <div className="aspect-video w-full">
                            <iframe
                              src={post.videoUrl}
                              title={post.title}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                        ) : (
                          <video
                            src={post.videoUrl}
                            controls
                            className="w-full max-h-96 object-contain"
                            poster="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600"
                          />
                        )}
                      </div>
                    )}

                    {/* Tags log */}
                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {post.tags.map(tag => (
                          <span key={tag} className="bg-slate-50 text-slate-400 font-bold text-[9px] px-2 py-1 rounded-md">
                            #{tag.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Totals index */}
                    <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{post.likes} academic recommendation approvals</span>
                      <span>{post.comments.length} student discussions</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  {!isAdminView && (
                    <div className="px-5 py-2 bg-slate-50/50 border-t border-slate-100 grid grid-cols-3 gap-1 select-none">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          post.likedByMe 
                            ? 'text-orange-600 bg-orange-50/50' 
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        <Heart size={14} className={post.likedByMe ? 'fill-orange-600 border-none' : ''} />
                        <span>Applaud</span>
                      </button>

                      <button
                        onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                        className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeCommentPostId === post.id 
                            ? 'text-[#0a66c2] bg-blue-50/50' 
                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        <MessageSquare size={14} />
                        <span>Discuss</span>
                      </button>

                      <button 
                        onClick={() => alert(`Review link generated for: "${post.title}". Ready to forward to counsel.`)}
                        className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all cursor-pointer"
                      >
                        <Share2 size={14} />
                        <span>Forward</span>
                      </button>
                    </div>
                  )}

                  {/* Comment Thread */}
                  {activeCommentPostId === post.id && !isAdminView && (
                    <div className="bg-slate-50/30 border-t border-slate-100 p-5 space-y-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-900 border text-white font-extrabold flex items-center justify-center text-[11px] shrink-0">
                          {currentUser.avatar}
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            placeholder="Provide supportive advice or ask about their research process..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                            className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3.5 py-2 focus:outline-none focus:ring-1 focus:ring-[#0a66c2] text-slate-700"
                          />
                          <button
                            onClick={() => handleAddComment(post.id)}
                            className="bg-[#0a66c2] hover:bg-[#004b8d] text-white px-3.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Send size={11} />
                          </button>
                        </div>
                      </div>

                      {post.comments.length > 0 ? (
                        <div className="space-y-3 mt-2">
                          {post.comments.map(comment => (
                            <div key={comment.id} className="flex gap-3 text-xs animate-fade-in">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 border text-slate-500 font-bold flex items-center justify-center shrink-0">
                                {comment.avatar}
                              </div>
                              <div className="flex-1 bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-extrabold text-slate-800 text-[11px]">{comment.author}</span>
                                  <span className="text-[9px] text-slate-400 font-bold">{comment.timestamp}</span>
                                </div>
                                <p className="text-slate-600 leading-normal text-xs">{comment.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 text-center py-2 font-medium">No discussions yet. Offer support or ask a query!</p>
                      )}
                    </div>
                  )}
                </article>

                {/* LinkedIn-style Sponsored Cards inside list feed (every 2 post boxes) */}
                {(postIndex + 1) % 2 === 0 && inFeedAds.length > 0 && (
                  <AdCard 
                    ad={inFeedAds[Math.floor((postIndex / 2)) % inFeedAds.length]} 
                    onAdClick={onAdClick} 
                  />
                )}

              </React.Fragment>
            );
          })
        )}
      </div>
    </div>
  );
}
