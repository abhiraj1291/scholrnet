import React from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  MapPin, 
  CheckCircle, 
  Award, 
  Code, 
  GraduationCap, 
  FileText, 
  ChevronRight, 
  MessageSquare, 
  UserPlus, 
  UserMinus, 
  Clock, 
  Calendar, 
  ExternalLink,
  Lock,
  X
} from 'lucide-react';
import { Achievement, Project } from '../types';

interface OtherProfileModalProps {
  studentName: string;
  onClose: () => void;
  isConnected: boolean;
  onToggleConnect: (name: string) => void;
  onOpenChatAndClose: (name: string) => void;
  // Fallbacks to load their specific achievements/projects
  allGlobalAchievements?: Achievement[];
  allGlobalProjects?: Project[];
}

// Highly polished custom portfolios for feed students
const MOCK_OTHER_STUDENT_PROFILES: Record<string, {
  bio: string;
  grade: string;
  school: string;
  avatar: string;
  avatarBg: string;
  skills: string[];
  stats: { verifiedAchievements: number; projects: number; collaborations: number };
  achievements: Achievement[];
  projects: Project[];
}> = {
  "Aisha Patel": {
    school: "Campion School, Mumbai",
    grade: "Class XII - Pure Science",
    avatar: "AP",
    avatarBg: "bg-blue-600",
    bio: "Focused on astrobiological computational modules and genetic engineering drafts. National talent researcher and olympiad medal holder.",
    skills: ["Astrobiology", "Python Analytics", "Genetic Transcription", "CBSE Chemistry"],
    stats: { verifiedAchievements: 3, projects: 2, collaborations: 4 },
    achievements: [
      {
        id: "aisha-1",
        title: "National Talent Search Examination (NTSE) Scholar",
        description: "Awarded pure government scholarship for ranking in state top 1.5% list in CBSE/ICSE screening.",
        category: "Excellence",
        institution: "National Council of Educational Research and Training",
        year: "2025",
        verificationStatus: "Verified",
        verifiedBy: "Campion School, Mumbai",
        verifiedAt: "2025-11-04",
        verificationHash: "CAMPION-SEAL-8A39B"
      },
      {
        id: "aisha-2",
        title: "Gold Medalist - Science Olympiad of Maharashtra",
        description: "Secured first position overall in zonal testing among 24,000 biological science students.",
        category: "Olympiad",
        institution: "Maharashtra Academic Board",
        year: "2025",
        verificationStatus: "Verified",
        verifiedBy: "Campion School, Mumbai",
        verifiedAt: "2025-10-12",
        verificationHash: "CAMPION-SEAL-718CD"
      }
    ],
    projects: [
      {
        id: "aisha-pj1",
        title: "Simulated ASTRO-Bio Gene Mapping Matrix",
        description: "CLI python package that converts environmental stress coordinates into predictive cell decay charts.",
        skills: ["Python", "Biology Model", "Data structures"],
        verificationStatus: "Verified",
        verifiedBy: "Campion School, Mumbai",
        verifiedAt: "25-12-18"
      }
    ]
  },
  "Raj Kumar": {
    school: "The Doon School, Dehradun",
    grade: "Class XI - Technical",
    avatar: "RK",
    avatarBg: "bg-emerald-600",
    bio: "Hardware prototyping hacker, chess champion, and amateur acoustics modeler. Designing CBSE smart physics lab tools.",
    skills: ["Embedded C++", "Microcontrollers", "Acoustical mechanics", "3D Printing"],
    stats: { verifiedAchievements: 2, projects: 1, collaborations: 2 },
    achievements: [
      {
        id: "raj-1",
        title: "CBSE City Topper in Sophomore Olympiad",
        description: "Perfect 100th percentile rank card in mathematics city qualifiers.",
        category: "Olympiad",
        institution: "CBSE Board Association State",
        year: "2025",
        verificationStatus: "Verified",
        verifiedBy: "The Doon School, Dehradun",
        verifiedAt: "2025-12-05",
        verificationHash: "DOON-SEAL-2349A"
      }
    ],
    projects: [
      {
        id: "raj-pj1",
        title: "Chladni Acoustical Plate Frequency Soundboard",
        description: "Hardware microcoded board showing salt physics alignment curves at high resonance pitches.",
        skills: ["Embedded Electronics", "Acoustic math"],
        verificationStatus: "Verified",
        verifiedBy: "The Doon School, Dehradun",
        verifiedAt: "2025-10-09"
      }
    ]
  },
  "Sneha Kapoor": {
    school: "Delhi Public School (DPS), R.K. Puram",
    grade: "Class XII - Science (PCB)",
    avatar: "SK",
    avatarBg: "bg-teal-600",
    bio: "CBSE medical aspirant specializing in plant genetics and IoT urban health tracking tools. Senior biology club head.",
    skills: ["Plant Genetics", "Microbiology Diagnostics", "CBSE Biology", "IoT Sensors"],
    stats: { verifiedAchievements: 5, projects: 2, collaborations: 3 },
    achievements: [
      {
        id: "sneha-1",
        title: "Delhi Biology Fair - Outstanding Research Award",
        description: "Presented a complete workbook taxonomy evaluating CB-salinity levels in regional soil arrays.",
        category: "Research",
        institution: "State Biotech Guild",
        year: "2026",
        verificationStatus: "Verified",
        verifiedBy: "Delhi Public School, R.K. Puram",
        verifiedAt: "2026-02-14",
        verificationHash: "DPSRKP-SEAL-98B321"
      },
      {
        id: "sneha-2",
        title: "Aptitude Topper Class XI Honors Pool",
        description: "Scored cumulative 98.2% across three core school term evaluations in science division.",
        category: "Topper Story",
        institution: "Delhi Public School, R.K. Puram",
        year: "2025",
        verificationStatus: "Verified",
        verifiedBy: "Delhi Public School, R.K. Puram",
        verifiedAt: "2025-06-20",
        verificationHash: "DPSRKP-SEAL-817E1"
      }
    ],
    projects: [
      {
        id: "sneha-pj1",
        title: "SmartBus Sensor SafeSchool ultrasonic warning ring",
        description: "Led development of physical breadboard bus sensors to prevent backing accidents on school grounds.",
        skills: ["Ultrasonics", "Arduino Spark", "CAD Prototyping"],
        verificationStatus: "Verified",
        verifiedBy: "Delhi Public School, R.K. Puram",
        verifiedAt: "2026-03-01"
      }
    ]
  },
  "Vedant Mishra": {
    school: "Campion School, Mumbai",
    grade: "Class XII - Commerce",
    avatar: "VM",
    avatarBg: "bg-orange-600",
    bio: "Passionate about game theory, state level chess maneuvers, and financial modeling widgets.",
    skills: ["Game Theory", "Strategic reasoning", "CBSE Commerce", "Calculus matrices"],
    stats: { verifiedAchievements: 3, projects: 1, collaborations: 2 },
    achievements: [
      {
        id: "vedant-1",
        title: "State Chess Championship - Under-17 Runner Up",
        description: "Secured runner up status out of 120 competitors in the Maharashtra state junior tournaments.",
        category: "Excellence",
        institution: "Western Zone Chess Guild",
        year: "2025",
        verificationStatus: "Verified",
        verifiedBy: "Campion School, Mumbai",
        verifiedAt: "2025-10-18",
        verificationHash: "CAMPION-SEAL-110AB"
      }
    ],
    projects: [
      {
        id: "vedant-pj1",
        title: "Predictive Commercial CBSE CBSE Financial Tracker",
        description: "Custom Excel macro sheets explaining commercial CBSE cbse indexing metrics.",
        skills: ["Excel Logic", "CBSE accounting standards"],
        verificationStatus: "Verified",
        verifiedBy: "Campion School, Mumbai",
        verifiedAt: "2025-11-02"
      }
    ]
  }
};

export default function OtherProfileModal({
  studentName,
  onClose,
  isConnected,
  onToggleConnect,
  onOpenChatAndClose,
  allGlobalAchievements = [],
  allGlobalProjects = []
}: OtherProfileModalProps) {
  
  // Choose profile data or fallback to generic
  const profileDetails = MOCK_OTHER_STUDENT_PROFILES[studentName] || {
    school: "Delhi Public School (DPS), R.K. Puram",
    grade: "Class XII - Scholar Guild",
    avatar: studentName.split(' ').map(n=>n[0]).join(''),
    avatarBg: "bg-indigo-650",
    bio: "Ambitious scholar, active contributor in regional STEM/Commerce research, and competitive student representative.",
    skills: ["CBSE Curriculum Studies", "Academics", "Peer Collaboration"],
    stats: { verifiedAchievements: 2, projects: 1, collaborations: 1 },
    achievements: allGlobalAchievements.filter(a => a.verifiedBy && a.verifiedBy.includes(studentName)) || [],
    projects: allGlobalProjects.filter(p => p.collaborators && p.collaborators.includes(studentName)) || []
  };

  // If achievements are empty in general profile fallback, give mock achievements
  const achievementsToRender = profileDetails.achievements.length > 0 ? profileDetails.achievements : [
    {
      id: "fallback-a1",
      title: "State Academic Excellence Honors Roll",
      description: "Recognized as a senior honors certificate holder for outstanding commitment to high school diagnostics.",
      category: "Excellence" as const,
      institution: "State Department of Education",
      year: "2025",
      verificationStatus: "Verified" as const,
      verifiedBy: profileDetails.school,
      verifiedAt: "2025-11-20",
      verificationHash: `SEAL-${studentName.toUpperCase().replace(/\s/g, "")}-7FDF98`
    }
  ];

  const projectsToRender = profileDetails.projects.length > 0 ? profileDetails.projects : [
    {
      id: "fallback-p1",
      title: "School Portfolio Co-Curricular Project File",
      description: "Practical physics assignment and experimental lab drafts sealed for CBSE submission archives.",
      skills: ["Research Diagnostics", "CBSE Standards"],
      verificationStatus: "Verified" as const,
      verifiedBy: profileDetails.school,
      verifiedAt: "2025-12-01"
    }
  ];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] overflow-y-auto cursor-pointer"
      id="other-portfolio-detail-overlay"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-8 overflow-hidden cursor-default"
      >
        
        {/* Top Banner Cover */}
        <div className="h-32 bg-gradient-to-r from-blue-900 via-indigo-950 to-orange-600/95 relative px-6 flex items-end justify-between pb-4">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-slate-900/40 text-white hover:bg-slate-900/60 p-1.5 rounded-full transition-colors focus:outline-none cursor-pointer"
            title="Close Portfolio View"
          >
            <X size={16} />
          </button>
          
          <div className="absolute top-4 left-4 bg-emerald-500/10 backdrop-blur-sm border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[8.5px] font-black text-emerald-300 uppercase tracking-widest flex items-center gap-1">
            <CheckCircle size={10} className="fill-emerald-405 text-slate-900" />
            Verified Student Registry
          </div>

          <div className="flex items-center gap-3.5 translate-y-6">
            <div className={`w-18 h-18 rounded-2xl ${profileDetails.avatarBg} text-white font-black text-xl flex items-center justify-center shadow-lg border-2 border-white shrink-0`}>
              {profileDetails.avatar}
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-none flex items-center gap-1" id="other-student-name">
                {studentName}
                <CheckCircle size={13} className="fill-blue-500 text-white" />
              </h3>
              <span className="text-[10px] text-indigo-200 font-bold block mt-1">{profileDetails.grade}</span>
            </div>
          </div>
        </div>

        {/* Outer body */}
        <div className="pt-9 px-6 pb-6 space-y-5.5">
          {/* Institution indicator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
            <div>
              <span className="text-[8px] font-black uppercase text-slate-400 block">Enrolled High School</span>
              <span className="text-[11.5px] font-bold text-slate-800">{profileDetails.school}</span>
            </div>
            
            {/* Action buttons (Linked, DM, etc.) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onToggleConnect(studentName)}
                className={`text-[10.5px] font-extrabold px-3 py-1.5 rounded-xl border flex items-center gap-1 cursor-pointer transition-all focus:outline-none ${
                  isConnected
                    ? 'bg-emerald-55/60 text-emerald-800 border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100'
                }`}
              >
                {isConnected ? <CheckCircle size={12} /> : <UserPlus size={12} />}
                {isConnected ? 'Linked' : 'Connect'}
              </button>
              
              <button
                type="button"
                onClick={() => onOpenChatAndClose(studentName)}
                className="bg-blue-950 hover:bg-blue-900 text-white text-[10.5px] font-extrabold px-3.5 py-1.5 rounded-xl flex items-center gap-1 transition-all cursor-pointer focus:outline-none"
              >
                <MessageSquare size={12} /> Message
              </button>
            </div>
          </div>

          {/* Quick Stats Grid & Bio */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bio Column */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest">Student Bio Profile</h4>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "{profileDetails.bio}"
              </p>
              
              {/* Skills */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Acclaimed Core Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {profileDetails.skills.map(sk => (
                    <span key={sk} className="bg-slate-50 border border-slate-150 text-slate-600 text-[10px] font-medium px-2 py-0.5 rounded-md">
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 h-fit text-center">
              <div>
                <span className="text-3xl font-black text-[#e75107]">{profileDetails.stats.verifiedAchievements}</span>
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block mt-1">Verified Seals</span>
              </div>
              <div className="border-t border-slate-200/50 pt-3">
                <span className="text-base font-bold text-slate-800">{profileDetails.stats.projects} Coding Projects</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase block tracking-wider">Showcased</span>
              </div>
            </div>
          </div>

          {/* Certified Achievements Stack */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Award size={13} className="text-orange-600" />
              Verified Achievements Records ({achievementsToRender.length})
            </h4>
            
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-1">
              {achievementsToRender.map((ach, idx) => (
                <div key={ach.id || idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 space-y-2">
                  <div className="flex items-start justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-xs text-slate-850 leading-tight">{ach.title}</h5>
                        <span className="bg-orange-50 text-orange-600 text-[8px] font-black uppercase px-2 py-0.5 rounded-md border border-orange-100">
                          {ach.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">{ach.institution} • {ach.year}</p>
                    </div>
                  </div>
                  
                  <p className="text-[10.5px] text-slate-600 leading-normal">{ach.description}</p>
                  
                  {ach.verificationStatus === 'Verified' && (
                    <div className="bg-white border border-slate-150 rounded-lg p-2 flex items-center justify-between text-[9px] font-mono text-slate-450 mt-1">
                      <span className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                        <CheckCircle size={11} className="text-emerald-500" />
                        Sealed DPS Cabinet
                      </span>
                      <span>HASH: {ach.verificationHash || "SCHOLR-7F9AD29B"}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Direct Projects Stack */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Code size={13} className="text-[#0a66c2]" />
              Featured Capstones & Coding Projects
            </h4>
            
            <div className="space-y-3">
              {projectsToRender.map((proj, idx) => (
                <div key={proj.id || idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-xs text-slate-850 leading-tight">{proj.title}</h5>
                    <p className="text-[10px] text-slate-500">{proj.description}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {proj.skills.map(sk => (
                        <span key={sk} className="bg-slate-50 text-slate-500 text-[8.5px] px-1.5 py-0.5 rounded">
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <span className="inline-flex items-center gap-0.5 bg-blue-50 text-blue-800 text-[9px] font-black uppercase px-2.5 py-1 rounded-md border border-blue-100 shrink-0 h-fit">
                    Verified Project
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}
