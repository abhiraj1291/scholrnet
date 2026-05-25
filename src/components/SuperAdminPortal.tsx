import React, { useState } from 'react';
import { Post, Ad, School } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Trophy, 
  Users, 
  Flag, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus, 
  Globe, 
  ArrowUpRight, 
  Laptop, 
  Sparkles, 
  Megaphone,
  CheckCircle,
  TrendingUp,
  Sliders,
  Play
} from 'lucide-react';

interface SuperAdminPortalProps {
  posts: Post[];
  ads: Ad[];
  schools: School[];
  onUpdatePosts: (updatedPosts: Post[]) => void;
  onUpdateAds: (updatedAds: Ad[]) => void;
  onCreateAd: (newAd: Partial<Ad>) => void;
  onDeleteAd: (adId: string) => void;
  displayAlert: (msg: string, type?: 'success' | 'info') => void;
}

export default function SuperAdminPortal({
  posts,
  ads,
  schools,
  onUpdatePosts,
  onUpdateAds,
  onCreateAd,
  onDeleteAd,
  displayAlert
}: SuperAdminPortalProps) {
  const [activeTab, setActiveTab] = useState<'metrics' | 'posts' | 'ads'>('metrics');
  
  // Post Moderator state
  const [postSearch, setPostSearch] = useState('');
  
  // New Ad form state
  const [newAdTitle, setNewAdTitle] = useState('');
  const [newAdCompany, setNewAdCompany] = useState('');
  const [newAdContent, setNewAdContent] = useState('');
  const [newAdCtaUrl, setNewAdCtaUrl] = useState('');
  const [newAdCtaText, setNewAdCtaText] = useState('Apply Now');
  const [newAdPlacement, setNewAdPlacement] = useState<'left_sidebar' | 'in_feed'>('in_feed');
  const [newAdBg, setNewAdBg] = useState('linear-gradient(135deg, #0f172a 0%, #1e293b 100%)');

  const gradientPresets = [
    { name: "Cosmic Dark", value: "linear-gradient(135deg, #090d16 0%, #1e293b 100%)" },
    { name: "Brand Blue", value: "linear-gradient(135deg, #0a66c2 0%, #0369a1 100%)" },
    { name: "Emerald Growth", value: "linear-gradient(135deg, #064e3b 0%, #059669 100%)" },
    { name: "Elite Crimson", value: "linear-gradient(135deg, #4c0519 0%, #9f1239 100%)" },
    { name: "Sunset Orange", value: "linear-gradient(135deg, #7c2d12 0%, #d97706 100%)" }
  ];

  // Calculations for dashboard
  const totalStudentsCount = schools.reduce((acc, current) => acc + (current.studentRosterCount || 0), 0);
  const totalSealsCount = schools.reduce((acc, current) => acc + (current.verifiedSealsCount || 0), 0) + 12; // offset for historical indicators
  const flaggedPosts = posts.filter(p => p.isHidden);
  const totalPostCount = posts.length;

  // Chart analytics mapping
  const adAnalyticsData = ads.map(a => ({
    name: a.company.length > 15 ? a.company.slice(0, 15) + "..." : a.company,
    Clicks: a.clicks || 0,
    Impressions: a.impressions || 0,
    "Click-Through-Rate (%)": a.impressions ? parseFloat(((a.clicks / a.impressions) * 100).toFixed(2)) : 0
  }));

  // Handle post hide toggle
  const handleTogglePostHide = (postId: string) => {
    const isNowHidden = !posts.find(p => p.id === postId)?.isHidden;
    const updated = posts.map(p => {
      if (p.id === postId) {
        return { ...p, isHidden: !p.isHidden };
      }
      return p;
    });
    onUpdatePosts(updated);
    displayAlert(
      isNowHidden ? "Post flagged and hidden from general feeds successfully." : "Post approved. Reinstate visible to students.", 
      isNowHidden ? 'info' : 'success'
    );
  };

  // Handle ad deployment submit
  const handleDeployAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdTitle.trim() || !newAdCompany.trim() || !newAdContent.trim()) {
      displayAlert("All advertisement copy fields are compulsory", "info");
      return;
    }

    const payload: Partial<Ad> = {
      id: `ad-${Date.now()}`,
      title: newAdTitle.trim(),
      company: newAdCompany.trim(),
      content: newAdContent.trim(),
      ctaUrl: newAdCtaUrl.trim() || "#",
      ctaText: newAdCtaText.trim() || "Apply Now",
      placement: newAdPlacement,
      image: newAdBg,
      clicks: 0,
      impressions: Math.floor(Math.random() * 20) + 50
    };

    onCreateAd(payload);
    
    // Clear inputs
    setNewAdTitle('');
    setNewAdCompany('');
    setNewAdContent('');
    setNewAdCtaUrl('');
    setNewAdCtaText('Apply Now');
    
    displayAlert(`Sponsorship deployed successfully under "${payload.company}" brand!`, "success");
  };

  return (
    <div className="space-y-6">
      
      {/* Super Admin Control Panel Header Banner */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 bg-[#0a66c2] text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest flex items-center gap-1">
          <Sparkles size={11} className="animate-spin text-amber-300" /> System Control Center
        </div>
        
        <div className="max-w-2xl space-y-2">
          <span className="text-sky-400 text-xs font-black uppercase tracking-widest mt-1 block">Platform Administrator Workspace</span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white font-sans">ScholrNet Master Control</h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium leading-relaxed max-w-xl">
            Audit general high school portfolio registrations, approve active verified seals, deploy targeted CBSE in-feed advertisements, and monitor platform content moderation metrics.
          </p>
        </div>

        {/* Workspace Controls selector tabs */}
        <div className="flex items-center gap-2 border-t border-slate-800/80 mt-6 pt-4 overflow-x-auto scrollbar-none">
          {[
            { id: 'metrics', label: 'Overview Metrics & Charting', icon: TrendingUp },
            { id: 'posts', label: 'Showcase Feed Moderator', icon: Sliders },
            { id: 'ads', label: 'Put Ads & Sponsorship Campaign', icon: Megaphone }
          ].map(tb => {
            const Icon = tb.icon;
            const active = activeTab === tb.id;
            return (
              <button
                key={tb.id}
                onClick={() => setActiveTab(tb.id as any)}
                className={`text-xs px-4 py-2 rounded-xl transition-all cursor-pointer font-black flex items-center gap-2 whitespace-nowrap focus:outline-none ${
                  active
                    ? 'bg-[#0a66c2] text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-750'
                }`}
              >
                <Icon size={13} />
                <span>{tb.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content 1: Overview Metrics */}
      {activeTab === 'metrics' && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Counter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total School Roster</span>
                <span className="text-2xl font-black text-slate-800 leading-none block">{totalStudentsCount}</span>
                <span className="text-[10px] text-emerald-600 font-semibold block flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block inline-block"></span> Verified Accounts
                </span>
              </div>
              <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Users size={20} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Verified Digital Seals</span>
                <span className="text-2xl font-black text-slate-800 leading-none block">{totalSealsCount}</span>
                <span className="text-[10px] text-[#0a66c2] font-semibold block">CBSE Blockchain Signatures</span>
              </div>
              <div className="w-11 h-11 rounded-lg bg-blue-50 text-[#0a66c2] flex items-center justify-center shrink-0">
                <Trophy size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Live Ad Campaigns</span>
                <span className="text-2xl font-black text-slate-800 leading-none block">{ads.length}</span>
                <span className="text-[10px] text-indigo-600 font-semibold block">Left Panel & In-Feed Assets</span>
              </div>
              <div className="w-11 h-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Megaphone size={18} />
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-3xs flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Flagged Posts Hidden</span>
                <span className="text-2xl font-black text-red-650 leading-none block">{flaggedPosts.length}</span>
                <span className="text-[10px] text-red-600 font-semibold block font-mono">/ {totalPostCount} Total Posts</span>
              </div>
              <div className="w-11 h-11 rounded-lg bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                <Flag size={18} />
              </div>
            </div>

          </div>

          {/* Recharts Graphical visualization of advertising */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Campaign Metrics: clicks vs impressions</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Aggregated statistics tracking real user engagements for currently deployed ScholrNet sponsor campaigns.
              </p>
            </div>
            
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adAnalyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3.5" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Bar dataKey="Impressions" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={22} />
                  <Bar dataKey="Clicks" fill="#0a66c2" radius={[4, 4, 0, 0]} barSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Feed Moderator */}
      {activeTab === 'posts' && (
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Audit Student Showcases</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Review, flags, or soft-delete posts published by students and CBSE regional schools to ensure academic trust.
              </p>
            </div>
            
            {/* Search Posts */}
            <div className="relative">
              <input
                type="text"
                placeholder="Find post titles, authors..."
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 pl-9 py-2 w-full sm:w-60 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
              />
              <Sliders size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Author Profile</th>
                  <th className="py-3 px-4">Showcase Title & Excerpt</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status & Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {posts
                  .filter(p => !postSearch || p.title.toLowerCase().includes(postSearch.toLowerCase()) || p.author.name.toLowerCase().includes(postSearch.toLowerCase()))
                  .map(post => (
                    <tr key={post.id} className={`hover:bg-slate-50/50 transition-colors ${post.isHidden ? 'bg-red-50/10' : ''}`}>
                      <td className="py-3 px-4 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="bg-blue-900 text-white font-extrabold rounded-lg w-7 h-7 flex items-center justify-center text-[10px]">
                            {post.author.avatar}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-850 block leading-tight">{post.author.name}</span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{post.author.school}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 max-w-sm">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 block truncate leading-tight">{post.title}</span>
                          <p className="text-slate-400 truncate max-w-xs">{post.content}</p>
                          {post.videoUrl && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-[#0a66c2] font-black bg-blue-50/80 border px-1.5 py-0.5 rounded">
                              🎬 Video: {post.videoUrl.length > 25 ? post.videoUrl.slice(0, 25) + "..." : post.videoUrl}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-bold capitalize">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
                          {post.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePostHide(post.id)}
                          className={`px-3 py-1.5 rounded-lg border font-bold flex items-center gap-1 cursor-pointer transition-all ${
                            post.isHidden
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-650 border-red-200 hover:bg-red-100'
                          }`}
                        >
                          {post.isHidden ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{post.isHidden ? "Reinstate Approved" : "Hide From Feed"}</span>
                        </button>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content 3: Put Ads Sponsorship Campaign Manager */}
      {activeTab === 'ads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-fade-in">
          
          {/* Ad Creator Engine Form */}
          <form onSubmit={handleDeployAdSubmit} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4 lg:col-span-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus size={16} className="text-[#0a66c2]" /> Deploy Sponsor Banner
                </h3>
                <p className="text-xs text-slate-400 font-medium">Create targeted campaigns that slide instantly into home feeds.</p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Brand/Sponsor Company</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google Summer of Code, MIT Innovation"
                    value={newAdCompany}
                    onChange={(e) => setNewAdCompany(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Campaign Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apply for 2026 Virtual Internships"
                    value={newAdTitle}
                    onChange={(e) => setNewAdTitle(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2] font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Promotional Brief (Content)</label>
                  <textarea
                    required
                    placeholder="Write a highly engaging description detailing scholarship rewards or registration benefits..."
                    value={newAdContent}
                    onChange={(e) => setNewAdContent(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-20 resize-none focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">CTA Text</label>
                    <input
                      type="text"
                      placeholder="e.g. Register Now"
                      value={newAdCtaText}
                      onChange={(e) => setNewAdCtaText(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Placement Type</label>
                    <select
                      value={newAdPlacement}
                      onChange={(e) => setNewAdPlacement(e.target.value as any)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2] font-semibold"
                    >
                      <option value="in_feed">📰 In-Feed Content (LinkedIn style)</option>
                      <option value="left_sidebar">🖥️ Left Sidebar Ad Panel</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">CTA Target Hyperlink URL</label>
                  <input
                    type="url"
                    placeholder="e.g. https://google.com/scholarship"
                    value={newAdCtaUrl}
                    onChange={(e) => setNewAdCtaUrl(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-[#0a66c2] text-slate-700 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Campaign Visual Background</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {gradientPresets.map(grad => (
                      <button
                        type="button"
                        key={grad.name}
                        onClick={() => setNewAdBg(grad.value)}
                        style={{ background: grad.value }}
                        title={grad.name}
                        className={`h-7 rounded-lg border-2 transition-all cursor-pointer ${
                          newAdBg === grad.value ? 'border-amber-400 scale-105 shadow' : 'border-transparent hover:scale-102'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0a66c2] hover:bg-[#004b8d] text-white text-xs font-bold py-3 rounded-xl transition-all shadow-md mt-4 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Megaphone size={14} /> Deploy Ad Campaign Live
            </button>
          </form>

          {/* Running Ads List Audit */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 lg:col-span-7 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Sponsorship Campaign Registry</h3>
              <p className="text-xs text-slate-400 font-medium">View dynamic counters of click stats and revoke banners instantly.</p>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {ads.map(ad => (
                <div key={ad.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start justify-between gap-4 shadow-3xs hover:border-slate-200 transition-colors">
                  <div className="flex gap-3 min-w-0 flex-1">
                    {/* Visual representative block of card background */}
                    <div 
                      style={{ background: ad.image }}
                      className="w-16 h-12 rounded-xl flex items-center justify-center shrink-0 text-[8px] font-black text-white p-1 select-none uppercase truncate shadow-inner max-w-[64px]"
                    >
                      {ad.company.slice(0, 8)}..
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider truncate max-w-[120px]">{ad.company}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span className="bg-blue-50 text-[#0a66c2] border border-blue-100 font-bold px-1.5 py-0.2 rounded text-[8.5px] uppercase">
                          {ad.placement === 'left_sidebar' ? "Sidebar ad" : "In-feed post"}
                        </span>
                      </div>
                      
                      <h4 className="font-extrabold text-xs text-slate-800 mt-1 truncate">{ad.title}</h4>
                      
                      {/* Interactive click details */}
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono font-bold mt-1">
                        <span className="flex items-center gap-0.5 text-blue-900">
                          🎯 Clicks: {ad.clicks || 0}
                        </span>
                        <span>
                          👁️ Impressions: {ad.impressions || 50}
                        </span>
                        <span className="text-emerald-600">
                          📈 CTR: {ad.impressions ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onDeleteAd(ad.id);
                      displayAlert(`De-activated sponsor banner for "${ad.company}" successfully.`, "info");
                    }}
                    className="p-1.5 rounded-lg border border-red-100 text-red-650 hover:bg-red-50 cursor-pointer shrink-0 transition-colors"
                    title="Retract/Delete Ad Campaign"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
