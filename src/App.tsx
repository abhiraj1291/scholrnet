import React, { useState, useEffect } from 'react';
import { 
  INITIAL_USER_PROFILE, 
  INITIAL_ACHIEVEMENTS, 
  INITIAL_PROJECTS, 
  INITIAL_POSTS, 
  INITIAL_OPPORTUNITIES, 
  INITIAL_TEAM_REQUESTS, 
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_MENTORS,
  INITIAL_MENTORSHIP_REQUESTS,
  INITIAL_SCHOOLS,
  INITIAL_ADS
} from './mockData';
import { Post, Opportunity, TeamRequest, VerificationRequest, Achievement, Project, Mentor, MentorshipRequest, School, SchoolAnnouncement, Ad } from './types';

import ScholrNetLogo from './components/ScholrNetLogo';
import SuperAdminPortal from './components/SuperAdminPortal';

// Importing Custom Sub-Components
import FeedSection from './components/FeedSection';
import StudentProfile from './components/StudentProfile';
import OpportunitiesBoard from './components/OpportunitiesBoard';
import TeammateFinder from './components/TeammateFinder';
import AcademicAnalytics from './components/AcademicAnalytics';
import ScholrAICounselor from './components/ScholrAICounselor';
import SchoolAdminPortal from './components/SchoolAdminPortal';
import MentorshipMatch from './components/MentorshipMatch';
import RecommendationEngine from './components/RecommendationEngine';
import SchoolPage from './components/SchoolPage';
import OtherProfileModal from './components/OtherProfileModal';

import { 
  Home, 
  User, 
  Trophy, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Bell, 
  Search, 
  GraduationCap, 
  AlertCircle, 
  Check, 
  MessageSquare,
  Building2,
  Network,
  Compass,
  Bot,
  Settings,
  LogOut,
  Sliders,
  ChevronDown,
  RefreshCw,
  Shield,
  Layers,
  ChevronRight,
  Moon,
  Rocket,
  Briefcase,
  Gamepad2,
  Smartphone,
  PlayCircle
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'opportunities' | 'teams' | 'analytics' | 'advisor' | 'school' | 'mentors' | 'recommendations' | 'admin_panel'>('home');
  const [currentRole, setCurrentRole] = useState<'student' | 'admin' | 'super_admin'>('student');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authProvider, setAuthProvider] = useState<string | null>(null);

  // Email login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpName, setSignUpName] = useState('');
  const [signUpSchool, setSignUpSchool] = useState('');
  const [signUpRole, setSignUpRole] = useState<'student' | 'admin'>('student');

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpName.trim() || !loginEmail.trim() || !loginPassword.trim()) {
      displayAlert("Please fill in all details to sign up", "info");
      return;
    }

    setAuthProvider('Local Credentials (Sign Up)');
    setAuthLoading(true);

    const email = loginEmail.trim().toLowerCase();
    const role = signUpRole;
    const profileName = signUpName.trim();
    const profileSchool = signUpSchool.trim() || "Delhi Public School (DPS), R.K. Puram";
    const profileAvatar = profileName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "ST";

    setCurrentRole(role === 'admin' ? 'admin' : 'student');
    setProfile(prev => ({
      ...prev,
      name: profileName,
      school: profileSchool,
      avatar: profileAvatar,
      grade: "Grade XII",
      bio: "Active ScholrNet Member • Verified Account"
    }));

    if (role === 'admin') {
      setActiveTab('school');
    } else {
      setActiveTab('home');
    }

    setTimeout(() => {
      setAuthLoading(false);
      setIsLoggedIn(true);
      setLoginEmail('');
      setLoginPassword('');
      setSignUpName('');
      setSignUpSchool('');
      setIsSignUp(false);
      displayAlert(`Academic account created successfully! Welcome to ScholrNet, ${profileName}.`, 'success');
    }, 1200);
  };

  // Advertisements Local State
  const [ads, setAds] = useState<Ad[]>(INITIAL_ADS);

  // Interactive Settings and Loading features
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('scholrnet_theme');
    return saved === 'dark';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scholrnet_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scholrnet_theme', 'light');
    }
  }, [isDarkMode]);

  // Global keydown Escape listener to close/cancel open popups
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettingsModal(false);
        setViewingStudentName(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);
  const [settings, setSettings] = useState({
    autoVerify: true,
    emailAlerts: true,
    digilockerSync: true,
    aiCofounderSuggestions: true
  });

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      displayAlert("Synced academic data with blockchain registry securely!", "success");
    }, 1100);
  };

  // Core Global States
  const [profile, setProfile] = useState(INITIAL_USER_PROFILE);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [schools, setSchools] = useState<School[]>(INITIAL_SCHOOLS);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('sch-1');
  const [selectedSchoolIdForOverlay, setSelectedSchoolIdForOverlay] = useState<string | null>(null);
  const [viewingStudentName, setViewingStudentName] = useState<string | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(INITIAL_OPPORTUNITIES);
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>(INITIAL_TEAM_REQUESTS);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>(INITIAL_VERIFICATION_REQUESTS);
  const [mentors, setMentors] = useState<Mentor[]>(INITIAL_MENTORS);
  const [mentorshipRequests, setMentorshipRequests] = useState<MentorshipRequest[]>(INITIAL_MENTORSHIP_REQUESTS);
  const [registeredEventIds, setRegisteredEventIds] = useState<string[]>(["ann-2"]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await fetch("/api/data");
        if (res.ok) {
          const data = await res.json();
          if (data.schools) setSchools(data.schools);
          if (data.posts) setPosts(data.posts);
          if (data.achievements) setAchievements(data.achievements);
          if (data.projects) setProjects(data.projects);
          if (data.verificationRequests) setVerificationRequests(data.verificationRequests);
          if (data.registeredEventIds) setRegisteredEventIds(data.registeredEventIds);
          if (data.ads) setAds(data.ads);
        }
      } catch (err) {
        console.warn("Could not load backend database state, using default structures:", err);
      }
    };
    fetchInitialData();
  }, []);

  const handleUpdatePosts = async (updatedPosts: Post[]) => {
    setPosts(updatedPosts);
    try {
      await fetch("/api/posts/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posts: updatedPosts })
      });
    } catch (err) {
      console.error("Failed to sync posts back to backend:", err);
    }
  };

  const handleCreateAd = async (newAd: Partial<Ad>) => {
    try {
      const res = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ad: newAd })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ads) setAds(data.ads);
      } else {
        setAds(prev => [...prev, newAd as Ad]);
      }
    } catch (err) {
      console.error("Failed to save ad:", err);
      setAds(prev => [...prev, newAd as Ad]);
    }
  };

  const handleDeleteAd = async (adId: string) => {
    try {
      const res = await fetch(`/api/ads/${adId}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        if (data.ads) setAds(data.ads);
      } else {
        setAds(prev => prev.filter(a => a.id !== adId));
      }
    } catch (err) {
      console.error("Failed to delete ad:", err);
      setAds(prev => prev.filter(a => a.id !== adId));
    }
  };

  const handleAdClick = async (adId: string) => {
    try {
      const res = await fetch(`/api/ads/${adId}/click`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.ads) setAds(data.ads);
      } else {
        setAds(prev => prev.map(a => a.id === adId ? { ...a, clicks: (a.clicks || 0) + 1 } : a));
      }
    } catch (err) {
      console.error("Failed to track ad click:", err);
    }
  };

  // LinkedIn style connections & notifications State
  const [connections, setConnections] = useState<string[]>(["Sneha Kapoor", "Vedant Mishra"]);
  const [notifications, setNotifications] = useState([
    { id: 'not-1', title: 'Counselor Shreya Sen processed your CBSE Olympiad verification request and co-signed the seals.', type: 'verification', timestamp: '2 hours ago', unread: true },
    { id: 'not-2', title: 'Aisha Patel sent you a connection request.', type: 'connection', timestamp: '1 day ago', unread: true, fromUser: 'Aisha Patel' },
    { id: 'not-3', title: 'Sneha Kapoor authenticated her co-authored Research paper successfully.', type: 'achievement', timestamp: '2 days ago', unread: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Chat/Messaging States
  const [chatContacts, setChatContacts] = useState([
    { id: 'ch-1', name: "Aisha Patel", school: "DPS RK Puram", avatar: "AP", online: true, messages: [
      { sender: 'them', text: 'Hey Aarav! Did Mrs. Shreya Sen verify your robotics milestone?', time: '9:30 AM' },
      { sender: 'me', text: 'Hey! Yes she did, got the digital cryptographic signature seal this morning.', time: '9:32 AM' },
      { sender: 'them', text: 'That is awesome. I am submitting my blockchain lab project today!', time: '9:33 AM' }
    ] },
    { id: 'ch-2', name: "Sneha Kapoor", school: "DPS RK Puram", avatar: "SK", online: true, messages: [
      { sender: 'them', text: 'Aarav, are we working on the Hackathon team search query tonight?', time: 'Yesterday' },
      { sender: 'me', text: 'Yes! Let’s meet at 5 PM on Teams or the workspace lounge.', time: 'Yesterday' }
    ] },
    { id: 'ch-3', name: "Vedant Mishra", school: "DPS RK Puram", avatar: "VM", online: false, messages: [
      { sender: 'them', text: 'Hi, congratulations on the Olympiad score!', time: '2 days ago' }
    ] }
  ]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [isChatMinimized, setIsChatMinimized] = useState(true);

  const handleToggleConnect = (name: string) => {
    if (connections.includes(name)) {
      setConnections(prev => prev.filter(c => c !== name));
      displayAlert(`Removed connection with ${name}.`, 'info');
    } else {
      setConnections(prev => [...prev, name]);
      displayAlert(`Secure connection established with ${name}!`, 'success');
      
      // Auto register a notification
      const newNot = {
        id: `not-${Date.now()}`,
        title: `You connected with ${name}! You can now exchange verified direct credentials.`,
        type: 'connection',
        timestamp: 'Just now',
        unread: true
      };
      setNotifications(prev => [newNot, ...prev]);
    }
  };

  const handleOpenChatWithStudent = (studentName: string) => {
    let contact = chatContacts.find(c => c.name.toLowerCase() === studentName.toLowerCase());
    if (!contact) {
      const newId = `ch-dynamic-${Date.now()}`;
      const initials = studentName.split(' ').map(n=>n[0]).join('');
      contact = {
        id: newId,
        name: studentName,
        school: "ScholrNet Partner",
        avatar: initials,
        online: true,
        messages: [
          { sender: 'them', text: `Hi! Let's connect on ScholrNet.`, time: 'Just now' }
        ]
      };
      setChatContacts(prev => [...prev, contact]);
    }
    setActiveChatId(contact.id);
    setIsChatMinimized(false);
  };

  const handleViewSchool = (schoolName: string) => {
    const matched = schools.find(s => s.name.toLowerCase().includes(schoolName.toLowerCase()) || schoolName.toLowerCase().includes(s.name.toLowerCase()));
    if (matched) {
      setSelectedSchoolId(matched.id);
      setSelectedSchoolIdForOverlay(matched.id);
    }
  };

  const handlePublishAnnouncement = async (schoolId: string, announce: Partial<SchoolAnnouncement>) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(announce)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schools) setSchools(data.schools);
        if (data.posts) setPosts(data.posts);
        displayAlert("Official announcement successfully published on school page and student feeds!", "success");
      }
    } catch (err) {
      console.error("Failed to publish announcement to backend:", err);
    }
  };

  const handleToggleEventRegistration = async (announceId: string) => {
    try {
      const res = await fetch(`/api/events/${announceId}/register`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.registeredEventIds) setRegisteredEventIds(data.registeredEventIds);
        if (data.isRegistered) {
          displayAlert("Signed up successfully! You are officially registered for this Competition/Event.", "success");
        } else {
          displayAlert("Cancelled your registration sign-up for this event.", "info");
        }
      }
    } catch (err) {
      console.error("Failed to toggle event registration to backend:", err);
    }
  };

  const handleDeleteAnnouncement = async (schoolId: string, announceId: string) => {
    try {
      const res = await fetch(`/api/schools/${schoolId}/announcements/${announceId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.schools) setSchools(data.schools);
        displayAlert("Circular retracted successfully from Delhi Public Board.", "info");
      }
    } catch (err) {
      console.error("Failed to delete announcement from backend:", err);
    }
  };

  // App Alerts Notification
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  const displayAlert = (text: string, type: 'success' | 'info' = 'success') => {
    setAlert({ text, type });
    setTimeout(() => {
      setAlert(null);
    }, 4500);
  };

  const handleLogin = (provider: string, emailIn?: string, passwordIn?: string) => {
    setAuthProvider(provider);
    setAuthLoading(true);

    const email = (emailIn || loginEmail || 'aarav@scholrnet.com').trim().toLowerCase();

    let role: 'student' | 'admin' | 'super_admin' = 'student';
    let profileName = "Aarav Sharma";
    let profileSchool = "Delhi Public School (DPS), R.K. Puram";
    let profileAvatar = "AS";

    if (email === 'admin@scholrnet.com' || email.includes('admin')) {
      role = 'super_admin';
      profileName = "Platform Administrator";
      profileSchool = "ScholrNet Master Control";
      profileAvatar = "SA";
    } else if (email === 'shreya@scholrnet.com' || email.includes('school') || email.includes('counselor')) {
      role = 'admin';
      profileName = "Mrs. Shreya Sen";
      profileSchool = "Delhi Public School (DPS), R.K. Puram";
      profileAvatar = "SS";
    } else {
      role = 'student';
      profileName = "Aarav Sharma";
      profileSchool = "Delhi Public School (DPS), R.K. Puram";
      profileAvatar = "AS";
    }

    setCurrentRole(role);
    setProfile(prev => ({
      ...prev,
      name: profileName,
      school: profileSchool,
      avatar: profileAvatar
    }));

    if (role === 'admin') {
      setActiveTab('school');
    } else if (role === 'super_admin') {
      setActiveTab('admin_panel');
    } else {
      setActiveTab('home');
    }

    setTimeout(() => {
      setAuthLoading(false);
      setIsLoggedIn(true);
      setAuthProvider(null);
      setLoginEmail('');
      setLoginPassword('');
      displayAlert(`Welcome to ScholrNet! Authenticated successfully as ${profileName}.`, 'success');
    }, 1200);
  };

  // State Updaters
  const handleAddMentor = (newMentor: Mentor) => {
    setMentors(prev => [newMentor, ...prev]);
    displayAlert(`Successfully registered ${newMentor.name} as a verified advisor!`, 'success');
  };

  const handleSendMentorshipRequest = (req: { mentorId: string; mentorName: string; subject: string; message: string }) => {
    const newRequest: MentorshipRequest = {
      id: `mreq-${Date.now()}`,
      mentorId: req.mentorId,
      mentorName: req.mentorName,
      studentName: profile.name,
      studentSchool: profile.school,
      subject: req.subject,
      message: req.message,
      status: 'pending',
      requestedAt: new Date().toISOString().split('T')[0],
      interactionCount: 0,
      interactions: []
    };
    setMentorshipRequests(prev => [newRequest, ...prev]);
    displayAlert(`Mentorship proposal submitted to ${req.mentorName}!`, 'success');
  };

  const handleAddInteraction = (requestId: string, note: string, author: string) => {
    setMentorshipRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          interactionCount: r.interactionCount + 1,
          interactions: [
            ...r.interactions,
            {
              date: new Date().toISOString().split('T')[0],
              author,
              note
            }
          ]
        };
      }
      return r;
    }));
    displayAlert(`Consultation update note logged successfully.`, 'success');
  };

  const handleCompleteAndRate = (
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
  ) => {
    setMentorshipRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status: 'completed',
          feedbackRating: rating,
          feedbackComment: comment,
          communicationRating: detailed?.communicationRating,
          depthRating: detailed?.depthRating,
          effectivenessRating: detailed?.effectivenessRating,
          keyTakeaway: detailed?.keyTakeaway,
          recommend: detailed?.recommend,
          topicsWorkedOn: detailed?.topicsWorkedOn
        };
      }
      return r;
    }));
    
    // Also update that mentor's average rating in mentors list
    setMentors(prev => prev.map(m => {
      const parentRequest = mentorshipRequests.find(r => r.id === requestId);
      if (parentRequest && m.id === parentRequest.mentorId) {
        return {
          ...m,
          rating: Number(((m.rating + rating) / 2).toFixed(1))
        };
      }
      return m;
    }));

    displayAlert(`Completed mentorship path and successfully submitted detailed feedback.`, 'success');
  };

  const handleRespondToRequest = (requestId: string, status: 'accepted' | 'declined') => {
    setMentorshipRequests(prev => prev.map(r => {
      if (r.id === requestId) {
        return {
          ...r,
          status
        };
      }
      return r;
    }));
    displayAlert(`Response simulated: request ${status.toUpperCase()}!`, 'success');
  };

  const handleInitiateCollaboration = (name: string, message: string) => {
    displayAlert(`Inquiry proposal dispatched to ${name}. Matches logged to connection registers!`, 'success');
  };

  const handleAddAchievement = async (newAch: Achievement) => {
    try {
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievement: newAch })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.achievements) setAchievements(data.achievements);
        displayAlert(`Honor "${newAch.title}" uploaded! Request pending submission to DPS Department.`, 'info');
      }
    } catch (err) {
      console.error("Failed to add achievement:", err);
    }
  };

  const handleAddProject = async (newProj: Project) => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: newProj })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.projects) setProjects(data.projects);
        displayAlert(`Innovation project "${newProj.title}" recorded to profile!`, 'success');
      }
    } catch (err) {
      console.error("Failed to add project:", err);
    }
  };

  const handleRequestVerification = async (reqDetails: { title: string; category: string; org: string; file: string; details: string }) => {
    const newReq: VerificationRequest = {
      id: `req-${Date.now()}`,
      studentName: profile.name,
      studentSchool: profile.school,
      achievementTitle: reqDetails.title,
      category: reqDetails.category as any,
      institution: reqDetails.org,
      year: "2026",
      certificateName: reqDetails.file,
      details: reqDetails.details,
      requestedAt: new Date().toISOString().split('T')[0],
      status: 'pending'
    };

    try {
      const res = await fetch("/api/verification-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: newReq })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verificationRequests) setVerificationRequests(data.verificationRequests);
        displayAlert(`Inquiry proposal dispatched to Mrs. Shreya Sen. Matches logged to connection registers!`, 'success');
      }
    } catch (err) {
      console.error("Failed to request verification:", err);
    }
  };

  // Counselor Approves digital seal
  const handleApproveRequest = async (id: string, signatureHash: string) => {
    try {
      const res = await fetch(`/api/verification-requests/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", signatureHash })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verificationRequests) setVerificationRequests(data.verificationRequests);
        if (data.achievements) setAchievements(data.achievements);
        if (data.posts) setPosts(data.posts);

        const targetRequest = verificationRequests.find(r => r.id === id);
        if (targetRequest) {
          if (targetRequest.studentName === profile.name) {
            displayAlert(`Aarav's milestone "${targetRequest.achievementTitle}" officially sealed with secure registration!`, 'success');
          } else {
            displayAlert(`Sealed credential folder for ${targetRequest.studentName} successfully!`, 'success');
          }
        }
      }
    } catch (err) {
      console.error("Failed to approve verification request:", err);
    }
  };

  const handleRejectRequest = async (id: string) => {
    try {
      const res = await fetch(`/api/verification-requests/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.verificationRequests) setVerificationRequests(data.verificationRequests);
        if (data.achievements) setAchievements(data.achievements);
        displayAlert(`Request flagged for revision. Logs updated.`, 'info');
      }
    } catch (err) {
      console.error("Failed to reject verification request:", err);
    }
  };

  // Apply Opportunity
  const handleApplyOpportunity = (id: string) => {
    setOpportunities(prev => prev.map(opp => {
      if (opp.id === id) {
        return { ...opp, applied: true };
      }
      return opp;
    }));
    const target = opportunities.find(o => o.id === id);
    displayAlert(`Awesome! Applied successfully to "${target?.name}".`, 'success');
  };

  // Find Teammates helper
  const handleFindTeammateTrigger = (opportunityName: string) => {
    setActiveTab('teams');
    displayAlert(`Searching teammate logs for: "${opportunityName}"...`, 'info');
  };

  // Add Team request
  const handleAddTeamRequest = (newReq: TeamRequest) => {
    setTeamRequests(prev => [newReq, ...prev]);
    displayAlert(`Recruitment request posted! Classmates can now apply to join your group.`, 'success');
  };

  // Apply to join other team
  const handleApplyToTeam = (requestId: string, studentName: string, studentSchool: string) => {
    setTeamRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        const alreadyIn = req.applicants.some(a => a.name === studentName);
        if (alreadyIn) return req;
        return {
          ...req,
          applicants: [...req.applicants, { name: studentName, school: studentSchool, status: 'pending' }]
        };
      }
      return req;
    }));
    displayAlert(`Sent request to join group! Monitor the status under Co-Scholars.`, 'info');
  };

  // Counselor / Owner manages applicant approvals
  const handleUpdateApplicantStatus = (requestId: string, studentName: string, status: 'accepted' | 'declined') => {
    setTeamRequests(prev => prev.map(req => {
      if (req.id === requestId) {
        return {
          ...req,
          applicants: req.applicants.map(app => {
            if (app.name === studentName) {
              return { ...app, status };
            }
            return app;
          })
        };
      }
      return req;
    }));
    displayAlert(`Applicant ${studentName} status updated to: ${status.toUpperCase()}!`, 'success');
  };

  // Small helpers
  const schoolNameForRequester = (name: string) => {
    if (name.includes("Raj")) return "The Doon School";
    if (name.includes("Sneha")) return "Cathedral & John Connon";
    if (name.includes("Vedant")) return "Campion School";
    return "Delhi Public School";
  };

  if (!isLoggedIn) {
    const WorkspaceIllustration = () => (
      <svg viewBox="0 0 650 500" className="w-full h-auto select-none pointer-events-none drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Large background ambient cloud/arc */}
        <path d="M50 380 C 150 140, 500 140, 600 380 L600 450 L50 450 Z" fill="#F4F4F9" opacity="0.85" />
        <circle cx="350" cy="180" r="145" fill="#E8EBFC" opacity="0.45" />
        
        {/* Back wall art / clouds */}
        <path d="M 400 160 Q 420 150, 440 160 T 480 160 L 480 170 L 400 170 Z" fill="white" opacity="0.9" />
        <path d="M 160 210 Q 180 200, 200 210 T 240 210 L 240 220 L 160 220 Z" fill="white" opacity="0.9" />

        {/* Bookshelf unit on the right */}
        <g id="bookshelf">
          {/* Outer frame */}
          <rect x="480" y="140" width="130" height="300" rx="4" fill="#F8EDE3" stroke="#D0C9C0" strokeWidth="2.5" />
          <line x1="480" y1="230" x2="610" y2="230" stroke="#D0C9C0" strokeWidth="2.5" />
          <line x1="480" y1="310" x2="610" y2="310" stroke="#D0C9C0" strokeWidth="2.5" />
          <line x1="545" y1="310" x2="545" y2="440" stroke="#D0C9C0" strokeWidth="1.5" />
          
          {/* Top shelf decorations */}
          {/* Globe on stand */}
          <circle cx="510" cy="170" r="16" fill="#A0C49D" />
          {/* Globe details */}
          <path d="M497 173 C 500 165, 508 160, 515 162 C 522 165, 524 175, 513 183 Z" fill="#C4D7B2" />
          <path d="M510 154 A 16 16 0 0 1 522 181" stroke="#5F7161" strokeWidth="2" fill="none" />
          {/* Axis/base */}
          <path d="M510 150 L510 154" stroke="#5F7161" strokeWidth="2" />
          <path d="M510 186 L510 196" stroke="#5F7161" strokeWidth="2" />
          <path d="M498 196 L522 196" stroke="#5F7161" strokeWidth="2" rx="1" />
          <path d="M524 163 C528 170, 526 178, 521 182" stroke="#5F7161" strokeWidth="1.5" fill="none" />

          {/* Sleeping Lazy Cat */}
          <path d="M545 195 C545 180, 575 180, 580 195 Z" fill="#E78895" />
          <circle cx="575" cy="190" r="6" fill="#E78895" />
          {/* Ears */}
          <polygon points="571,185 574,181 576,186" fill="#E78895" />
          <polygon points="576,185 579,181 581,186" fill="#E78895" />
          {/* Tail wrapping around */}
          <path d="M545 195 C538 195, 536 186, 542 183" stroke="#E78895" strokeWidth="3" fill="none" strokeLinecap="round" />
          <line x1="573" y1="192" x2="577" y2="192" stroke="#5C3D2E" strokeWidth="0.75" />

          {/* Vertical Books on middle shelf */}
          <rect x="495" y="240" width="10" height="60" fill="#9F8772" />
          <rect x="507" y="245" width="12" height="55" fill="#609966" />
          <rect x="521" y="238" width="14" height="62" fill="#3F497F" />
          {/* Folders in green background */}
          <rect x="542" y="240" width="18" height="60" fill="#5F7161" rx="1" />
          <rect x="562" y="240" width="18" height="60" fill="#5F7161" rx="1" />
          <rect x="582" y="240" width="18" height="60" fill="#5F7161" rx="1" />
          {/* Folder finger holes */}
          <circle cx="551" cy="285" r="2.5" fill="white" />
          <circle cx="571" cy="285" r="2.5" fill="white" />
          <circle cx="591" cy="285" r="2.5" fill="white" />

          {/* Bottom shelf drawer cabinets */}
          <rect x="490" y="325" width="45" height="40" rx="3" fill="#E2C799" />
          <rect x="490" y="375" width="45" height="45" rx="3" fill="#E2C799" />
          <circle cx="512" cy="345" r="3" fill="#5C3D2E" />
          <circle cx="512" cy="397" r="3" fill="#5C3D2E" />

          {/* Modern Table Lamp on Bottom Left section */}
          {/* Base */}
          <path d="M570 410 L590 410" stroke="#4F4A45" strokeWidth="3" strokeLinecap="round" />
          <line x1="580" y1="410" x2="580" y2="380" stroke="#4F4A45" strokeWidth="2" />
          {/* Lamp conical shade */}
          <polygon points="565,380 595,380 605,350 555,350" fill="#E78895" />
          {/* Glowing yellow field */}
          <polygon points="555,350 605,350 615,440 545,440" fill="#FFF3CD" opacity="0.25" />
          {/* Small dial */}
          <circle cx="560" cy="425" r="5" fill="#808080" />
          <circle cx="575" cy="425" r="5" fill="#808080" />
          <circle cx="590" cy="425" r="5" fill="#808080" />
        </g>

        {/* The Student/User sitting in the armchair */}
        <g id="sitting-person">
          {/* Armchair Teal Blue */}
          <path d="M190 350 C180 350, 160 370, 160 400 L160 480 C160 490, 180 490, 210 490 C265 490, 310 470, 315 440 L315 390 C315 370, 290 350, 270 350 Z" fill="#EDF4F2" stroke="#8CA1A5" strokeWidth="1.5" />
          {/* Seat Cushion upper */}
          <rect x="175" y="415" width="130" height="18" rx="5" fill="#C4DFDF" stroke="#8CA1A5" strokeWidth="1.5" />
          {/* Chair steel legs */}
          <line x1="180" y1="470" x2="165" y2="520" stroke="#333333" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="290" y1="470" x2="305" y2="520" stroke="#333333" strokeWidth="2.5" strokeLinecap="round" />
          {/* Armrests */}
          <rect x="235" y="380" width="80" height="12" rx="4" fill="#D2E9E9" stroke="#8CA1A5" strokeWidth="1" />

          {/* Human Body */}
          {/* Legs (Golden Brown Pants) */}
          <path d="M185 415 C185 370, 240 370, 240 440 L220 500 C215 510, 205 515, 195 515" stroke="#6F4E37" strokeWidth="26" strokeLinecap="round" fill="none" />
          <path d="M225 415 C230 380, 280 380, 290 440 L280 500 C275 510, 265 515, 255 515" stroke="#6F4E37" strokeWidth="22" strokeLinecap="round" fill="none" />
          
          {/* Upper Torso (Dark Forest Green Tee) */}
          <path d="M220 340 C200 340, 212 400, 230 430 C245 440, 275 440, 280 390 C285 340, 260 340, 240 340 Z" fill="#2D5A27" />
          
          {/* Face Skin, Neck & Beard */}
          <rect x="230" y="285" width="15" height="18" fill="#D2B48C" /> {/* Neck */}
          <circle cx="238" cy="260" r="18" fill="#D2B48C" /> {/* Face Circle */}
          {/* Beard elements */}
          <path d="M220 262 C220 282, 250 282, 256 262 Z" fill="#222222" />
          <rect x="238" y="272" width="12" height="6" fill="#222222" rx="2" />
          <circle cx="242" cy="256" r="3" fill="#D2B48C" /> {/* Ear */}
          
          {/* Hair (Black Curly / Fluffy) */}
          <circle cx="225" cy="248" r="8" fill="#222222" />
          <circle cx="235" cy="242" r="9" fill="#222222" />
          <circle cx="245" cy="244" r="9" fill="#222222" />
          <circle cx="254" cy="252" r="7" fill="#222222" />
          <circle cx="230" cy="254" r="7" fill="#222222" />

          {/* Eyeglasses */}
          <rect x="220" y="254" width="12" height="6" rx="1.5" stroke="white" strokeWidth="1.5" fill="none" />
          <line x1="232" y1="257" x2="238" y2="257" stroke="white" strokeWidth="1.5" />
          <line x1="238" y1="257" x2="242" y2="253" stroke="white" strokeWidth="1.5" />

          {/* Relaxed Arm Type 1: Hand on Chin */}
          <path d="M272 345 C282 355, 260 415, 235 410 C220 405, 225 365, 238 340" stroke="#2D5A27" strokeWidth="15" strokeLinecap="round" fill="none" />
          <path d="M235 340 C235 330, 225 325, 230 310" stroke="#D2B48C" strokeWidth="7" strokeLinecap="round" fill="none" />

          {/* Relaxed Arm Type 2: Typing on Laptop on Lap */}
          <path d="M245 350 C260 365, 255 400, 205 385" stroke="#2D5A27" strokeWidth="12" strokeLinecap="round" fill="none" />
          <path d="M205 385 L195 380" stroke="#D2B48C" strokeWidth="6" strokeLinecap="round" />

          {/* open Laptop Computer sitting on human thigh */}
          {/* Screen lid panel */}
          <line x1="165" y1="350" x2="190" y2="395" stroke="#555555" strokeWidth="4.5" strokeLinecap="round" />
          {/* Keyboard and base assembly */}
          <line x1="190" y1="395" x2="238" y2="395" stroke="#333333" strokeWidth="5" strokeLinecap="round" />
          {/* screen glow representation */}
          <polygon points="165,348 190,393 230,393 180,315" fill="#E8EBFC" opacity="0.15" />

          {/* Sleek Shoes */}
          <rect x="180" y="505" width="22" height="11" rx="4" fill="white" stroke="#6F4E37" strokeWidth="1" />
          <rect x="246" y="505" width="22" height="11" rx="4" fill="white" stroke="#6F4E37" strokeWidth="1" />
          <circle cx="190" cy="510" r="2.5" fill="#E78895" />
          <circle cx="256" cy="510" r="2.5" fill="#E78895" />
        </g>
      </svg>
    );    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between relative font-sans selection:bg-[#0a66c2]/80 selection:text-white animate-fade-in">
        
        {/* Brand/SSO Header mimicking landing page */}
        <header className="bg-white border-b border-slate-100 py-3.5 px-6 sticky top-0 z-50 shadow-2xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo Left */}
            <div className="flex items-center gap-2.5 select-none">
              <ScholrNetLogo className="w-10 h-10 shadow-3xs border border-slate-200" />
              <div className="flex items-center text-[#0a66c2] font-sans text-2xl font-bold tracking-tight">
                <span>Scholr</span>
                <div className="bg-[#0a66c2] text-white px-2 py-0.5 rounded-[4px] font-bold text-lg ml-0.5 flex items-center justify-center">
                  Net
                </div>
              </div>
            </div>

            {/* Navigation Buttons Right */}
            <div className="flex items-center gap-7">
              <div className="hidden lg:flex items-center gap-7">
                <div 
                  onClick={() => displayAlert("The ScholrNet Companion App is coming soon to the iOS App Store & Google Play Store in Q3 2026! Keep your portfolio verified to receive priority access.", "info")}
                  className="flex flex-col items-center justify-center text-[#5f5f5f] hover:text-[#0a66c2] cursor-pointer transition-colors group select-none"
                >
                  <Smartphone size={21} className="stroke-[1.6] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] mt-1 font-sans font-bold tracking-wide">Get the app</span>
                </div>
                <div className="h-10 border-l border-slate-200 mx-1"></div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleLogin('DirectSign', 'aarav@scholrnet.com', 'student123')}
                  className="px-6 py-2.5 rounded-full border border-[#0a66c2] text-[#0a66c2] hover:bg-blue-50/50 transition duration-150 font-bold text-sm cursor-pointer focus:outline-none"
                >
                  Quick Student
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin('DirectSign', 'admin@scholrnet.com', 'admin123')}
                  className="px-6 py-2.5 rounded-full bg-[#0a66c2] text-white hover:bg-[#004b8d] transition duration-150 font-bold text-sm cursor-pointer shadow-2xs focus:outline-none"
                >
                  Quick Master Admin
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Global Alerts system */}
        {alert && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 text-white text-xs font-bold px-5 py-3 rounded-full border border-slate-850 shadow-2xl flex items-center gap-2 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>{alert.text}</span>
          </div>
        )}

        {/* Main hero page splitting */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-12 py-10 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Block with Title, Role Switcher and SSO */}
          <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
            {authLoading ? (
              <div className="max-w-[420px] w-full bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-6 shadow-xl py-12 animate-pulse">
                <div className="flex justify-center">
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <div className="absolute inset-0 border-3 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 border-3 border-t-[#0a66c2] border-r-[#0a66c2] rounded-full animate-spin"></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-800">Signing into Portfolio</h3>
                  <p className="text-xs text-slate-500">Establishing direct secure connection to {authProvider}...</p>
                </div>
                <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
                  Secure cryptographic signatures keep academic seals private.
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-2">
                  <h1 className="text-[#191919] font-sans font-black text-3xl sm:text-4xl lg:text-[45px] leading-[1.1] tracking-tight max-w-[550px]">
                    Your Academic & Scholarship Portfolio Network
                  </h1>
                  <p className="text-slate-500 text-sm max-w-[450px]">
                    Connect with verifiers, publish STEM papers, match with mentors, and verify achievements via CBSE Blockchain seals.
                  </p>
                </div>

                {/* Proper Email Password Sign In/Up Card with Google & Microsoft SSO */}
                <form 
                  onSubmit={isSignUp ? handleSignUpSubmit : (e) => {
                    e.preventDefault();
                    if (!loginEmail.trim()) {
                      displayAlert("Email address is required", "info");
                      return;
                    }
                    handleLogin('Credentials', loginEmail, loginPassword);
                  }}
                  className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 w-full max-w-[420px] mx-auto lg:mx-0 shadow-md space-y-4 relative overflow-hidden transition-all duration-300"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-black uppercase text-[#0a66c2]">
                      {isSignUp ? "Create Academic Profile" : "Secure Account Login"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      SSL Encrypted
                    </span>
                  </div>

                  <div className="space-y-3.5">
                    {isSignUp && (
                      <div className="space-y-3.5 animate-in fade-in duration-200">
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-455 block tracking-wide">Your Full Name</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Aarav Sharma"
                            value={signUpName}
                            onChange={(e) => setSignUpName(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-[#0a66c2] focus:border-transparent text-slate-800 font-medium bg-slate-50/30"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase font-bold text-slate-455 block tracking-wide">High School / Institution</label>
                          <input 
                            type="text" 
                            required
                            placeholder="e.g. Delhi Public School, R.K. Puram"
                            value={signUpSchool}
                            onChange={(e) => setSignUpSchool(e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-[#0a66c2] focus:border-transparent text-slate-800 font-medium bg-slate-50/30"
                          />
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-455 block tracking-wide">Register Account As</span>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setSignUpRole('student')}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                signUpRole === 'student'
                                  ? 'border-[#0a66c2] bg-blue-50/50 text-[#0a66c2]'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              🎓 Student
                            </button>
                            <button
                              type="button"
                              onClick={() => setSignUpRole('admin')}
                              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                                signUpRole === 'admin'
                                  ? 'border-[#0a66c2] bg-blue-50/50 text-[#0a66c2]'
                                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                              🏫 Counselor
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-455 block tracking-wide">Academic Email Address</label>
                      <input 
                        type="email" 
                        required
                        placeholder="e.g. aarav@scholrnet.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-[#0a66c2] focus:border-transparent text-slate-800 font-medium bg-slate-50/30"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] uppercase font-bold text-slate-455 block tracking-wide">Crypto Key or Password</label>
                        {!isSignUp && <span className="text-[9px] text-[#0a66c2] hover:underline cursor-pointer font-bold">Forgot?</span>}
                      </div>
                      <input 
                        type="password"
                        required
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-[#0a66c2] focus:border-transparent text-slate-800 bg-slate-50/30"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#0a66c2] hover:bg-[#004b8d] text-white text-xs font-black py-3 px-4 rounded-xl shadow-3xs hover:shadow-2xs transition-all cursor-pointer h-[44px]"
                  >
                    {isSignUp ? "Register Account" : "Authenticate & Sign In"}
                  </button>

                  {/* SSO Quick Directory */}
                  <div className="space-y-2.5">
                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-150"></div>
                      <span className="flex-shrink mx-3 text-[9px] text-slate-400 font-black uppercase tracking-widest">Or login with</span>
                      <div className="flex-grow border-t border-slate-150"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleLogin('Google Account', 'google.student@scholrnet.com', 'google123')}
                        className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 px-3 hover:bg-slate-50 active:scale-95 transition-all text-xs font-extrabold text-slate-700 cursor-pointer focus:outline-none"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.08H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.92l2.85-2.22.81-.6z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.08l3.66 2.84c.87-2.6 3.3-4.54 6.16-4.54z" />
                        </svg>
                        <span>Google</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLogin('Microsoft Live', 'microsoft.student@scholrnet.com', 'live123')}
                        className="flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-2.5 px-3 hover:bg-slate-50 active:scale-95 transition-all text-xs font-extrabold text-slate-700 cursor-pointer focus:outline-none"
                      >
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 23 23">
                          <rect x="0" y="0" width="11" height="11" fill="#F25022"/>
                          <rect x="12" y="0" width="11" height="11" fill="#7FBA00"/>
                          <rect x="0" y="12" width="11" height="11" fill="#00A4EF"/>
                          <rect x="12" y="12" width="11" height="11" fill="#FFB900"/>
                        </svg>
                        <span>Microsoft</span>
                      </button>
                    </div>
                  </div>

                  {/* Toggle Sign Up vs Sign In Link */}
                  <div className="text-center pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setLoginEmail('');
                        setLoginPassword('');
                        setSignUpName('');
                        setSignUpSchool('');
                      }}
                      className="text-xs text-[#0a66c2] hover:text-[#004b8d] font-bold hover:underline cursor-pointer focus:outline-none"
                    >
                      {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                    </button>
                  </div>

                  {/* Sandbox Profiles Slide Down lists for quick evaluations */}
                  <div className="border-t border-slate-100 pt-3.5 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Sandbox Credentials:</span>
                      <span className="text-[9px] bg-sky-50 text-[#0a66c2] border border-sky-100 font-bold px-1.5 py-0.2 rounded uppercase select-none font-mono">1-Click</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {[
                        { role: "student", label: "Aarav Sharma (Student Showcase)", email: "aarav@scholrnet.com", pass: "student123", icon: "🎓" },
                        { role: "school_rep", label: "Counselor Shreya Sen (School Board)", email: "shreya@scholrnet.com", pass: "school123", icon: "🏫" },
                        { role: "master_admin", label: "Super Admin (Monitor/Telemetry Panel)", email: "admin@scholrnet.com", pass: "admin123", icon: "🛡️" }
                      ].map(sandbox => (
                        <button
                          type="button"
                          key={sandbox.email}
                          onClick={() => {
                            setIsSignUp(false);
                            setLoginEmail(sandbox.email);
                            setLoginPassword(sandbox.pass);
                            displayAlert(`Autofilled demo credentials for ${sandbox.label}`, 'info');
                          }}
                          className="text-left w-full hover:bg-slate-50 border border-slate-150/40 rounded-xl p-2 flex items-center gap-2.5 transition-colors focus:outline-none cursor-pointer"
                        >
                          <span className="text-sm shrink-0">{sandbox.icon}</span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[10px] font-extrabold text-slate-755 block leading-tight">{sandbox.label}</span>
                            <span className="text-[9.5px] text-slate-400 block font-mono">Email: {sandbox.email}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </form>

                {/* Subtext User Agreements mimicking picture */}
                <p className="text-[11px] text-[#5e5e5e] leading-relaxed max-w-[420px]">
                  By clicking Continue or Authenticate, you agree to ScholrNet's{' '}
                  <span className="text-[#0a66c2] font-semibold hover:underline cursor-pointer">User Agreement</span>,{' '}
                  <span className="text-[#0a66c2] font-semibold hover:underline cursor-pointer">Privacy Policy</span>, and{' '}
                  <span className="text-[#0a66c2] font-semibold hover:underline cursor-pointer">Cookie Policy</span>.
                </p>
              </div>
            )}
          </div>

          {/* Right Column illustration */}
          <div className="lg:col-span-6 flex items-center justify-center overflow-hidden animate-in fade-in zoom-in-95 duration-500">
            <WorkspaceIllustration />
          </div>
        </main>

        {/* Dynamic high quality bottom footer */}
        <footer className="w-full border-t border-slate-200 py-6 px-6 bg-slate-50 text-[11px] text-slate-500 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[#0a66c2]">ScholrNet © {new Date().getFullYear()}</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium">Academic Trust Network</span>
            </div>
            
            <div className="flex flex-wrap gap-5 font-medium justify-center pointer-events-none select-none">
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">About</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Accessibility</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">User Agreement</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Privacy Policy</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Cookie Policy</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Copyright Policy</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Brand Policy</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Guest Controls</span>
              <span className="hover:underline hover:text-[#0a66c2] cursor-pointer">Community Guidelines</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      
      {/* 1. Global Platform Warning Alert Banner */}
      {alert && (
        <div className="fixed bottom-6 right-6 z-100 max-w-sm bg-slate-900 border border-slate-800 text-white p-4.5 rounded-2xl shadow-xl flex gap-3 transition-all animate-bounce">
          <Check className={`${alert.type === 'success' ? 'text-emerald-500' : 'text-orange-500'} shrink-0`} size={18} />
          <p className="text-xs font-semibold leading-relaxed">{alert.text}</p>
        </div>
      )}

      {/* 2. Primary Navigation Header */}
      <header className="sticky top-0 bg-white border-b border-slate-200 z-50 shadow-3xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 gap-4">
            
            {/* Logo and Search */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 flex-1">
              <div className="flex items-center justify-between">
                <div 
                  onClick={triggerRefresh}
                  className="flex items-center gap-3 group cursor-pointer"
                  title="Click to sync and refresh academic grid"
                >
                  <div className="bg-white p-1 rounded-xl border border-slate-200 transition-all group-hover:scale-105 active:scale-95 shadow-3xs flex items-center justify-center shrink-0">
                    <ScholrNetLogo className="w-11 h-11" isSpinning={isRefreshing} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#0a66c2] leading-none flex items-center">
                      <span>Scholr</span>
                      <span className="bg-[#0a66c2] text-white px-1.5 py-0.5 rounded-[3px] font-bold text-sm ml-0.5">Net</span>
                    </h1>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mt-0.5">Verified Academic Grid</span>
                  </div>
                </div>
              </div>

              {/* Minimalist Integration Search Bar */}
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="Search portfolios, opportunities, mentors..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 hover:bg-slate-150 transition-all font-semibold text-slate-700"
                />

                {/* Global Search Suggestions panel */}
                {globalSearchQuery && (
                  <div className="absolute left-0 mt-2 w-full bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-xl shadow-2xl z-[9999] py-3 text-xs divide-y divide-slate-100 dark:divide-slate-850 animate-in fade-in slide-in-from-top-3 duration-200">
                    {/* Index 1: Students */}
                    <div className="p-3.5 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">Student Portfolios</span>
                      
                      {[
                        { name: "Aarav Sharma", desc: "XII STEM • Robotics Club Lead", school: "Delhi Public School" },
                        { name: "Vedant Mishra", desc: "XII Commerce • Calculus Merit", school: "Delhi Public School" },
                        { name: "Sneha Kapoor", desc: "XII PCB • Genetics & Medicine", school: "Delhi Public School" },
                        { name: "Aisha Patel", desc: "XI STEM • Blockchain Lead", school: "Delhi Public School" }
                      ].filter(st => st.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || st.desc.toLowerCase().includes(globalSearchQuery.toLowerCase()))
                       .slice(0, 3)
                       .map(st => (
                        <div 
                          key={st.name} 
                          onClick={() => {
                            setGlobalSearchQuery('');
                            setActiveTab('profile');
                            displayAlert(`Opening ${st.name}'s verified credential ledger!`, 'info');
                          }}
                          className="flex items-center justify-between p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer group"
                        >
                          <div>
                            <p className="font-extrabold text-slate-800 dark:text-slate-200">{st.name}</p>
                            <p className="text-[10px] text-slate-500">{st.desc} • {st.school}</p>
                          </div>
                          <span className="text-[10px] text-orange-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Portfolio →</span>
                        </div>
                      ))}
                    </div>

                    {/* Index 2: Schools */}
                    <div className="p-3.5 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1">🏫 Schools Directory</span>
                      {[
                        { name: "Delhi Public School (DPS), R.K. Puram", location: "New Delhi, India", code: "CBSE-30129", seals: "15 Seals Approved" }
                      ].filter(sc => sc.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) || sc.location.toLowerCase().includes(globalSearchQuery.toLowerCase()))
                       .map(sc => (
                        <div 
                          key={sc.name} 
                          onClick={() => {
                            setGlobalSearchQuery('');
                            if (currentRole === 'admin') {
                              setActiveTab('school');
                            } else {
                              setActiveTab('home');
                            }
                            displayAlert(`Viewing school roster for ${sc.name}!`, 'info');
                          }}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer"
                        >
                          <p className="font-extrabold text-slate-800 dark:text-slate-200">{sc.name}</p>
                          <p className="text-[10px] text-slate-500">{sc.location} • Verified Board Code: {sc.code} ({sc.seals})</p>
                        </div>
                      ))}
                    </div>

                    {/* Index 3: Achievements */}
                    <div className="p-3.5 space-y-2">
                      <span className="text-[9px] font-black text-slate-400 tracking-widest uppercase">🏆 Honors & Achievements</span>
                      {[
                        { title: "National Cyber Olympiad (NCO) AIR-42", creator: "Aarav Sharma", status: "VERIFIED" },
                        { title: "Smart Robotic Hand prototype", creator: "Aarav Sharma", status: "VERIFIED" },
                        { title: "Mathematics Merit Certificate Tier-1", creator: "Vedant Mishra", status: "VERIFIED" },
                        { title: "CBSE Regional Biology Worksheets", creator: "Sneha Kapoor", status: "VERIFIED" }
                      ].filter(ac => ac.title.toLowerCase().includes(globalSearchQuery.toLowerCase()))
                       .slice(0, 3)
                       .map(ac => (
                        <div 
                          key={ac.title} 
                          onClick={() => {
                            setGlobalSearchQuery('');
                            setActiveTab('profile');
                          }}
                          className="p-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg cursor-pointer flex justify-between items-center"
                        >
                          <div>
                            <p className="font-bold text-slate-850 dark:text-slate-200 truncate max-w-[200px]">{ac.title}</p>
                            <p className="text-[10px] text-slate-500">{ac.creator}</p>
                          </div>
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-450 px-2 py-0.5 rounded text-[8.5px] font-black shrink-0">
                            {ac.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Header Right Actions Group */}
            <div className="flex flex-wrap items-center gap-3.5 self-start md:self-auto w-full sm:w-auto">
              {/* Platform Role Switcher */}
              <div className="flex items-center gap-1 bg-slate-50 border border-[#e2e8f0] p-1.5 rounded-xl text-xs flex-1 sm:flex-initial">
                <button
                  onClick={() => {
                    setCurrentRole('student');
                    setActiveTab('home');
                  }}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentRole === 'student'
                      ? 'bg-[#0a66c2] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Student
                </button>
                <button
                  onClick={() => {
                    setCurrentRole('admin');
                    setActiveTab('school');
                  }}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentRole === 'admin'
                      ? 'bg-[#0a66c2] text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Counselor
                </button>
                <button
                  onClick={() => {
                    setCurrentRole('super_admin');
                    setActiveTab('admin_panel');
                  }}
                  className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentRole === 'super_admin'
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Super Admin
                </button>
              </div>

              {/* Notification Bell Dropdown Panel */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-150 text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all font-semibold cursor-pointer relative focus:outline-none"
                  title="Academy Alerts & Verifications"
                >
                  <Bell size={15} />
                  {notifications.some(n => n.unread) && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-orange-605 rounded-full ring-2 ring-white animate-pulse" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-205 rounded-2xl shadow-2xl z-[9999] py-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800">Alerts & Notifications</p>
                      <button 
                        onClick={() => {
                          setNotifications(p => p.map(n => ({...n, unread: false})));
                          displayAlert("All incoming records cleared!", "info");
                        }}
                        className="text-[9.5px] text-orange-600 hover:underline font-extrabold focus:outline-none"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-slate-400 italic text-[11px]">No alerts logged yet.</p>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-3.5 space-y-2 hover:bg-slate-50 transition-colors ${n.unread ? 'bg-orange-50/20' : ''}`}>
                            <p className="font-semibold text-slate-700 leading-snug text-[11px]">{n.title}</p>
                            
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-slate-400 font-medium font-mono">{n.timestamp}</span>
                              
                              {n.type === 'connection' && n.fromUser && !connections.includes(n.fromUser) && (
                                <button
                                  onClick={() => {
                                    setConnections(prev => [...prev, n.fromUser]);
                                    setNotifications(prev => prev.map(item => item.id === n.id ? {...item, unread: false} : item));
                                    displayAlert(`Successfully connected with ${n.fromUser}!`, 'success');
                                  }}
                                  className="text-[9px] uppercase tracking-wider px-2 py-1 bg-orange-600 font-black text-white rounded-md hover:bg-orange-700 focus:outline-none"
                                >
                                  Accept Connection
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Account Dropdown Control */}
              <div className="relative z-50">
                <button
                  onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                  className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-50 border border-slate-150 hover:bg-slate-100 active:scale-95 transition-all text-xs font-bold text-slate-700 cursor-pointer focus:outline-none relative"
                >
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    AS
                  </div>
                  <span className="hidden leading-none pr-1 sm:inline">Aarav Sharma</span>
                  <ChevronDown size={12} className="text-slate-400" />
                </button>

                {showAccountDropdown && (
                  <div className="absolute right-0 mt-2.5 w-60 bg-white border border-slate-200 rounded-xl shadow-xl z-[999] py-2 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-800">Aarav Sharma</p>
                      <p className="text-[10px] font-medium text-slate-400 mt-0.5">dps-rk-puram.verified.in</p>
                    </div>

                    <div className="p-1 space-y-0.5">
                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          setActiveTab('profile');
                          displayAlert("Navigated to verified student credentials!", "info");
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <User size={13} className="text-slate-400" />
                        Student Portfolio
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          setShowSettingsModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <Settings size={13} className="text-slate-400" />
                        Account Settings
                      </button>

                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          triggerRefresh();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-lg flex items-center gap-2 transition-all cursor-pointer"
                      >
                        <RefreshCw size={13} className="text-slate-400" />
                        Instant LEDGER Cache Refresh
                      </button>
                    </div>

                    <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-3">
                      <button
                        onClick={() => {
                          setShowAccountDropdown(false);
                          setIsLoggedIn(false);
                          displayAlert("Successfully signed out of your secure profile.", "info");
                        }}
                        className="w-full text-left py-1 text-xs font-semibold text-red-650 hover:text-red-700 rounded flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut size={13} />
                        Logout Session
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Selection Row (Visible only for Students) */}
          {currentRole === 'student' && (
            <nav className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1.5 border-t border-slate-100 scrollbar-none">
              {[
                { id: 'home', label: 'Home Feed', icon: Home },
                { id: 'recommendations', label: 'Smart Matches', icon: Compass },
                { id: 'mentors', label: 'Mentor Match', icon: GraduationCap },
                { id: 'profile', label: 'My Portfolio', icon: User },
                { id: 'opportunities', label: 'Opportunities Board', icon: Trophy },
                { id: 'teams', label: 'Teammates / Recruit', icon: Users },
                { id: 'analytics', label: 'Academic Insights', icon: Network },
                { id: 'advisor', label: 'ScholrAI Mentor', icon: Bot }
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`text-xs font-extrabold flex items-center gap-1.5 px-4.5 py-3.5 border-b-2 transition-all whitespace-nowrap cursor-pointer focus:outline-none ${
                      active
                        ? 'border-orange-500 text-blue-955 bg-orange-50/10'
                        : 'border-transparent text-slate-500 hover:text-blue-950 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>
      </header>

      {/* 3. Primary App Shell Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full relative">
        {isRefreshing ? (
          /* Custom Shimmer Skeleton Loaders (Fluid & High-Contrast) */
          <div className="space-y-8 animate-pulse">
            {/* Shimmer header card */}
            <div className="bg-slate-100 rounded-2xl h-40 border border-slate-200 relative overflow-hidden flex flex-col justify-end p-6 space-y-4">
              <div className="h-5 bg-slate-350 rounded-lg w-1/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded-md w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded-md w-1/3"></div>
              </div>
            </div>

            {/* Custom Layout Skeleton depending on active tab */}
            {activeTab === 'home' && currentRole === 'student' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
                {/* 2-Columns left forum skeleton */}
                <div className="lg:col-span-2 space-y-6">
                  {[1, 2].map(n => (
                    <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-150"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                          <div className="h-2.5 bg-slate-150 rounded w-1/3"></div>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <div className="h-3 bg-slate-200 rounded w-full"></div>
                        <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right side helper cards skeleton */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-150"></div>
                      <div className="h-3 bg-slate-150 rounded w-1/3"></div>
                    </div>
                    <div className="h-2.5 bg-slate-200 rounded w-full"></div>
                    <div className="h-8 bg-slate-150 rounded-xl w-full"></div>
                  </div>
                </div>
              </div>
            ) : (
              /* Grid layouts for directory lists (opportunities, profile overview, teams, recommendations) */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div key={n} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4.5">
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-slate-150 rounded w-1/4"></div>
                      <div className="h-5 bg-slate-200 rounded-full w-14"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-2.5 bg-slate-150 rounded w-full"></div>
                    </div>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="w-6 h-6 rounded-full bg-slate-150"></div>
                      <div className="h-7 bg-slate-150 rounded-xl w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (currentRole === 'super_admin' || activeTab === 'admin_panel') ? (
          /* Super Admin Flow */
          <div className="space-y-6 animate-fade-in">
            <SuperAdminPortal
              posts={posts}
              ads={ads}
              schools={schools}
              onUpdatePosts={handleUpdatePosts}
              onUpdateAds={setAds}
              onCreateAd={handleCreateAd}
              onDeleteAd={handleDeleteAd}
              displayAlert={displayAlert}
            />
          </div>
        ) : currentRole === 'admin' ? (
          /* Counselor Flow */
          <div className="space-y-6 animate-fade-in">
            <SchoolAdminPortal
              requests={verificationRequests}
              schoolName="Delhi Public School (DPS), R.K. Puram"
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              schools={schools}
              selectedSchoolId={selectedSchoolId}
              onPublishAnnouncement={handlePublishAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
            />
          </div>
        ) : (
          /* Main Student view switcher */
          <div className="space-y-6 animate-fade-in">
            {activeTab === 'home' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                
                {/* COLUMN 1: LEFT SIDEBAR (Profile Preview & Sidebar Ads Panel) */}
                <div className="md:col-span-1 space-y-6 text-xs">
                  
                  {/* Miniature User Info widget */}
                  <div className="bg-white border border-slate-150 rounded-2xl p-4.5 shadow-3xs space-y-3.5 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0a66c2] to-blue-900 text-white font-black text-xs flex items-center justify-center shadow-inner shrink-0 leading-none">
                        {profile.avatar}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-slate-800 leading-none block truncate">{profile.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-1 truncate">{profile.school}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-slate-50 pt-2">
                      "{profile.bio}"
                    </p>

                    <button
                      onClick={() => setActiveTab('profile')}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-705 text-[10.5px] font-extrabold py-2 rounded-xl transition-all cursor-pointer focus:outline-none"
                    >
                      Modify Portfolio Card
                    </button>
                  </div>

                  {/* LEFT SIDEBAR ADS PANEL (Directly fulfills: "on left side make panel for ad") */}
                  <div className="bg-white border text-left border-slate-150 rounded-2xl p-4 shadow-3xs space-y-3 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#0a66c2] text-[7.5px] text-white font-black px-2 py-0.5 rounded-bl uppercase tracking-wider">
                      Ad
                    </div>
                    <h5 className="font-black text-[9px] text-[#0a66c2] uppercase tracking-wider flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0a66c2]"></span>
                      Sponsor Bulletin
                    </h5>
                    
                    {/* Render left_sidebar Ads */}
                    {ads.filter(ad => ad.placement === 'left_sidebar').length === 0 ? (
                      <div className="text-[10px] text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No active sidebar ads
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {ads
                          .filter(ad => ad.placement === 'left_sidebar')
                          .map(ad => (
                            <div key={ad.id} className="group border-b border-slate-100 last:border-none pb-3 last:pb-0 space-y-2">
                              {/* Visual Mini Header */}
                              <div className="flex items-center gap-2">
                                <div 
                                  style={{ background: ad.image || 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
                                  className="w-6.5 h-6.5 rounded-lg text-white font-black text-[7.5px] flex items-center justify-center p-0.5 uppercase tracking-tight shrink-0 select-none"
                                >
                                  {ad.company.substring(0, 3)}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-[8.5px] font-black text-slate-450 uppercase tracking-wider block">{ad.company}</span>
                                  <h6 className="font-extrabold text-[10px] text-slate-800 group-hover:text-[#0a66c2] transition-colors line-clamp-1 leading-none mt-0.5">{ad.title}</h6>
                                </div>
                              </div>
                              
                              <p className="text-[10.5px] text-slate-500 leading-normal line-clamp-3">{ad.content}</p>
                              
                              <a 
                                href={ad.ctaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleAdClick && handleAdClick(ad.id)}
                                className="w-full text-center block bg-slate-100 text-slate-700 hover:bg-[#0a66c2] hover:text-white border border-slate-200 hover:border-[#0a66c2] text-[9.5px] font-black uppercase tracking-wider py-1.5 rounded-lg transition-colors cursor-pointer"
                              >
                                {ad.ctaText} →
                              </a>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* COLUMN 2 & 3: CENTER STREAM (Feed Section with LinkedIn style in-feed ad injection) */}
                <div className="md:col-span-2 space-y-6">
                  <FeedSection
                    posts={posts}
                    currentUser={profile}
                    onUpdatePosts={handleUpdatePosts}
                    externalSearchQuery={globalSearchQuery}
                    connections={connections}
                    onToggleConnect={handleToggleConnect}
                    onViewProfile={(name) => {
                      if (name === profile.name) {
                        setActiveTab('profile');
                      } else {
                        setViewingStudentName(name);
                      }
                    }}
                    onViewSchool={handleViewSchool}
                    ads={ads}
                    onAdClick={handleAdClick}
                  />
                </div>

                {/* COLUMN 4: RIGHT SIDEBAR (Trust Ledger flat notice) */}
                <div className="md:col-span-1 space-y-6 text-xs">
                  <div className="bg-slate-900 border border-slate-850 text-white rounded-2xl p-4.5 relative overflow-hidden shadow-sm text-left">
                    <span className="text-[8.5px] font-black tracking-widest text-orange-400 uppercase block mb-2">SCHOLRINDEX SECURE LEDGER</span>
                    <h5 className="font-extrabold text-xs mb-1.5">What are Verified Portfolios?</h5>
                    <p className="text-[10.5px] leading-relaxed text-slate-350">
                      Standard portfolios are filled with self-proclaimed text. ScholrNet matches students' certificates directly with high school registers, providing third-party verification seals trusted by colleges.
                    </p>
                    <div className="border-t border-slate-800 pt-3 mt-4 text-[9.5px] text-slate-400">
                      <span>Certified Hash Authority</span>
                      <span className="font-mono text-[9px] block mt-0.5 text-slate-500">SHA256::CBSE-PLATFORM-STAMP</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {activeTab === 'profile' && (
              <StudentProfile
                profile={profile}
                achievements={achievements}
                projects={projects}
                onAddAchievement={handleAddAchievement}
                onAddProject={handleAddProject}
                onRequestVerification={handleRequestVerification}
                onUpdateProfile={(updated) => setProfile(updated)}
              />
            )}

            {activeTab === 'opportunities' && (
              <OpportunitiesBoard
                opportunities={opportunities}
                onApply={handleApplyOpportunity}
                onFindTeammate={handleFindTeammateTrigger}
                externalSearchQuery={globalSearchQuery}
              />
            )}

            {activeTab === 'teams' && (
              <TeammateFinder
                requests={teamRequests}
                onAddRequest={handleAddTeamRequest}
                onApplyToTeam={handleApplyToTeam}
                onUpdateApplicants={handleUpdateApplicantStatus}
                externalSearchQuery={globalSearchQuery}
              />
            )}

            {activeTab === 'analytics' && (
              <AcademicAnalytics />
            )}

            {activeTab === 'advisor' && (
              <ScholrAICounselor
                studentName={profile.name}
                grade={profile.grade}
                school={profile.school}
                achievements={achievements}
                projects={projects}
              />
            )}

            {activeTab === 'mentors' && (
              <MentorshipMatch
                currentUser={profile}
                mentors={mentors}
                requests={mentorshipRequests}
                onAddMentor={handleAddMentor}
                onSendRequest={handleSendMentorshipRequest}
                onAddInteraction={handleAddInteraction}
                onCompleteAndRate={handleCompleteAndRate}
                onRespondToRequest={handleRespondToRequest}
                externalSearchQuery={globalSearchQuery}
              />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationEngine
                studentName={profile.name}
                grade={profile.grade}
                school={profile.school}
                achievements={achievements}
                projects={projects}
                opportunities={opportunities}
                onApplyOpportunity={handleApplyOpportunity}
                onInitiateCollaboration={handleInitiateCollaboration}
              />
            )}

            {/* School Pages tab content removed from main shell - schools are now accessed via search/overlays directly */}
          </div>
        )}
      </main>

      {/* 5. Account/Ledger Settings Dialogue Modal Modal popup */}
      {showSettingsModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowSettingsModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] animate-fade-in cursor-pointer"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 cursor-default">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-slate-800 font-extrabold text-sm">
                <Settings size={15} className="text-orange-600" />
                <span>Account & Credentials Settings</span>
              </div>
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-xs p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Content - Minimal Options Form */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sync & Verification Standards</h4>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.autoVerify} 
                      onChange={(e) => setSettings({...settings, autoVerify: e.target.checked})}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 border-slate-300 w-3.5 h-3.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Auto-Match High School Registries</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Permits ScholrNet validator bots to match active certificates with official high-school databases.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.digilockerSync} 
                      onChange={(e) => setSettings({...settings, digilockerSync: e.target.checked})}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 border-slate-300 w-3.5 h-3.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">DigiLocker CBSE State Pool</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Unlocks lightning-fast third-party cryptographic proof generation for competitive results.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.aiCofounderSuggestions} 
                      onChange={(e) => setSettings({...settings, aiCofounderSuggestions: e.target.checked})}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 border-slate-300 w-3.5 h-3.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Allow ScholrAI Teammate Finder</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Uses private vector search pipelines on profiles to assist matching teammate recommendations.</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer group select-none">
                    <input 
                      type="checkbox" 
                      checked={settings.emailAlerts} 
                      onChange={(e) => setSettings({...settings, emailAlerts: e.target.checked})}
                      className="mt-1 rounded text-orange-600 focus:ring-orange-500 border-slate-300 w-3.5 h-3.5"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">Admissions Counselor Notifications</span>
                      <p className="text-[10px] text-slate-400 leading-normal mt-0.5">Fires instant secure channel alerts when credentials gets signed by the high school admin.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Appearance Theme Selector */}
              <div className="border-t border-slate-150 dark:border-slate-800 pt-4">
                <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Appearance Theme</h4>
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-3 rounded-xl justify-between">
                  <div className="flex items-center gap-2">
                    <Moon size={15} className={`text-slate-600 dark:text-slate-300 transition-colors ${isDarkMode ? 'fill-amber-400 text-amber-500' : ''}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Dark Mode Palette</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Enable an ambient eye-safe dark theme</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isDarkMode ? 'bg-orange-600' : 'bg-slate-250 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        isDarkMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Sandbox info card */}
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-3">
                <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest block mb-0.5">PERSISTENCE MODE</span>
                <p className="text-[10px] leading-relaxed text-slate-500">
                  Modifying inputs updates local state context instantly. Session details survive perspective switching.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <button 
                onClick={() => {
                  setSettings({ autoVerify: true, emailAlerts: true, digilockerSync: true, aiCofounderSuggestions: true });
                  setIsDarkMode(false);
                  displayAlert("Configurations reset to platform defaults!", "info");
                }}
                className="text-slate-450 hover:text-slate-700 font-extrabold text-[10px] uppercase tracking-wider cursor-pointer"
              >
                Reset Default
              </button>
              
              <button 
                onClick={() => {
                  setShowSettingsModal(false);
                  displayAlert("Verified setting configurations modified successfully!", "success");
                }}
                className="bg-blue-950 text-white hover:bg-slate-800 font-black text-xs px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Elegant Platform Footer */}
      <footer className="bg-white border-t border-slate-150 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-400 text-[11px] space-y-1 font-medium">
          <p>© {new Date().getFullYear()} ScholrNet Trust. All Rights Reserved. Verified Scholastic Portfolios.</p>
          <div className="flex justify-center gap-4 text-slate-350 select-none">
            <span>CBSE Sealing Standard</span>
            <span>•</span>
            <span>SECURE-HASH-SHIELD v1.2</span>
            <span>•</span>
            <span>Admissions Grounding Ledger</span>
          </div>
        </div>
      </footer>

      {/* 6. LinkedIn Style Collapsible Bottom-Right Messaging Drawer */}
      <div className={`fixed bottom-0 right-6 w-80 bg-white dark:bg-[#131924] border border-slate-205 dark:border-slate-800 rounded-t-2xl shadow-2xl z-[999] transition-all duration-300 ${isChatMinimized ? 'h-12' : 'h-96'}`}>
        {/* Chat Drawer Header */}
        <div 
          onClick={() => setIsChatMinimized(!isChatMinimized)}
          className="bg-blue-950 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageSquare size={14} className="text-orange-400" />
              <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            </div>
            <span className="font-extrabold text-xs tracking-wide">ScholrNet Direct Messaging</span>
          </div>
          
          <div className="flex items-center gap-1.5">
            {isChatMinimized ? (
              <span className="text-[9px] bg-orange-600 font-bold px-1.5 py-0.5 rounded uppercase font-black text-white">Open ({chatContacts.filter(c => c.online).length} Active)</span>
            ) : (
              <ChevronDown size={14} className="text-slate-305" />
            )}
          </div>
        </div>

        {/* Chat Drawer Content */}
        {!isChatMinimized && (
          <div className="h-[calc(100%-3rem)] flex flex-col justify-between text-xs animate-in slide-in-from-bottom-5 duration-200">
            {activeChatId ? (
              /* Active Chat View */
              <div className="flex-1 flex flex-col justify-between h-full">
                {/* Active Chat Header */}
                {(() => {
                  const contact = chatContacts.find(c => c.id === activeChatId);
                  if (!contact) return null;
                  return (
                    <>
                      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-880 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveChatId(null);
                            }}
                            className="text-slate-500 hover:text-slate-800 dark:hover:text-white font-extrabold text-xs pr-1 focus:outline-none cursor-pointer"
                          >
                            ← Back
                          </button>
                          <div className="w-6 h-6 rounded-md bg-orange-605 text-white font-extrabold text-[10px] flex items-center justify-center select-none shadow-sm">
                            {contact.avatar}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight">{contact.name}</p>
                            <p className="text-[9px] text-slate-400">{contact.school}</p>
                          </div>
                        </div>

                        <span className={`w-1.5 h-1.5 rounded-full ${contact.online ? 'bg-emerald-500' : 'bg-slate-350'}`} />
                      </div>

                      {/* Messages Thread list */}
                      <div className="flex-1 p-3.5 space-y-3.5 overflow-y-auto max-h-[220px]">
                        {contact.messages.map((m, idx) => (
                          <div key={idx} className={`flex flex-col ${m.sender === 'me' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                              m.sender === 'me' 
                                ? 'bg-orange-600 text-white rounded-tr-none font-bold' 
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-850 dark:text-slate-200 rounded-tl-none font-bold'
                            }`}>
                              <p className="text-[11px] font-medium leading-normal">{m.text}</p>
                            </div>
                            <span className="text-[8px] text-slate-400 mt-1 font-mono">{m.time}</span>
                          </div>
                        ))}
                      </div>

                      {/* Message submit form block */}
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!newMessageText.trim()) return;

                          const myMsg = { sender: 'me', text: newMessageText.trim(), time: 'Just now' };
                          
                          setChatContacts(contacts => contacts.map(c => {
                            if (c.id === activeChatId) {
                              return { ...c, messages: [...c.messages, myMsg] };
                            }
                            return c;
                          }));

                          setNewMessageText('');

                          setTimeout(() => {
                            const answers = [
                              `That sounds wonderful, Aarav! Let's definitely submit our co-author profile hashes.`,
                              `Got it. I am online in the student recommendation room, send me the links!`,
                              `Perfect, let's look at DPS R.K. Puram showcase board index.`,
                              `Indeed! ScholrNet verifies this in real-time, it is so exciting.`
                            ];
                            const randomAns = answers[Math.floor(Math.random() * answers.length)];
                            setChatContacts(contacts => contacts.map(c => {
                              if (c.id === activeChatId) {
                                return { 
                                  ...c, 
                                  messages: [...c.messages, { sender: 'them', text: randomAns, time: 'Just now' }] 
                                };
                              }
                              return c;
                            }));
                          }, 900);
                        }}
                        className="bg-slate-50 dark:bg-slate-900 border-t border-slate-150 dark:border-slate-800 p-2.5 flex items-center gap-2"
                      >
                        <input
                          type="text"
                          value={newMessageText}
                          onChange={(e) => setNewMessageText(e.target.value)}
                          placeholder="Type a secure DM..."
                          className="flex-1 bg-white dark:bg-slate-800 text-slate-805 dark:text-slate-200 border border-slate-250 dark:border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500 text-[10.5px]"
                        />
                        <button 
                          type="submit"
                          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer"
                        >
                          Send
                        </button>
                      </form>
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Contact List view */
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-bold uppercase text-[9px] tracking-wider select-none">
                  Select Connection to start direct ledger DMs
                </div>
                {chatContacts.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => setActiveChatId(c.id)}
                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-black text-xs flex items-center justify-center">
                        {c.avatar}
                      </div>

                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-200 leading-tight">{c.name}</p>
                        <p className="text-[10px] text-slate-400 italic truncate max-w-[150px]">
                          {c.messages[c.messages.length - 1]?.text}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`w-2 h-2 rounded-full ${c.online ? 'bg-emerald-500 shadow-xs' : 'bg-slate-350'}`} />
                      <span className="text-[8px] text-slate-400">{c.messages[c.messages.length - 1]?.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5.5 LinkedIn-Style Centered School Space Overlay Dialog Modal */}
      {selectedSchoolIdForOverlay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-slate-200/80 shadow-2xl relative flex flex-col">
            
            {/* Overlay Sticky Header */}
            <div className="sticky top-0 bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between z-40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black uppercase tracking-wider text-[#0a66c2]">🏫 School Business Showcase Page</span>
                <span className="bg-[#0a66c2]/10 text-[#0a66c2] text-[9px] font-bold px-2.5 py-1 rounded-full uppercase">Verified Profile</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSelectedSchoolIdForOverlay(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-1.5 rounded-full shadow-3xs cursor-pointer transition-all"
              >
                ✕ Close Workspace
              </button>
            </div>

            {/* Content Body displaying interactive SchoolPage directly */}
            <div className="p-6 overflow-y-auto flex-1 text-slate-700">
              <SchoolPage
                schools={schools}
                selectedSchoolId={selectedSchoolIdForOverlay}
                onSelectSchool={(id) => setSelectedSchoolIdForOverlay(id)}
                onViewStudentProfile={(name) => {
                  setSelectedSchoolIdForOverlay(null);
                  if (name === profile.name) {
                    setActiveTab('profile');
                  } else {
                    setViewingStudentName(name);
                  }
                }}
                isCounselorOfThisSchool={currentRole === 'admin' && selectedSchoolIdForOverlay === 'sch-1'}
                onPublishAnnouncement={handlePublishAnnouncement}
                onDeleteAnnouncement={handleDeleteAnnouncement}
                registeredEventIds={registeredEventIds}
                onToggleEventRegistration={handleToggleEventRegistration}
              />
            </div>
            
            {/* Footer Workspace Action */}
            <div className="border-t border-slate-100 px-6 py-3.5 bg-slate-50/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSchoolIdForOverlay(null)}
                className="bg-slate-800 text-white font-bold text-xs px-5 py-2 rounded-xl hover:bg-slate-900 cursor-pointer shadow-3xs transition-all"
              >
                Return to Network Home
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. Other Student Profile Modal View */}
      {viewingStudentName && (
        <OtherProfileModal
          studentName={viewingStudentName}
          onClose={() => setViewingStudentName(null)}
          isConnected={connections.includes(viewingStudentName)}
          onToggleConnect={handleToggleConnect}
          onOpenChatAndClose={(name) => {
            handleOpenChatWithStudent(name);
            setViewingStudentName(null);
          }}
          allGlobalAchievements={achievements}
          allGlobalProjects={projects}
        />
      )}
    </div>
  );
}
