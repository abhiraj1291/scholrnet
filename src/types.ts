export type VerificationStatus = 'NotVerified' | 'Pending' | 'Verified';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'Olympiad' | 'Project' | 'Research' | 'Topper Story' | 'Excellence';
  institution: string;
  year: string;
  certificateFile?: string;
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationHash?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  collaborators?: string;
  link?: string;
  skills: string[];
  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface Comment {
  id: string;
  author: string;
  avatar: string;
  text: string;
  timestamp: string;
}

export interface Post {
  id: string;
  author: {
    name: string;
    avatar: string;
    school: string;
    isVerified: boolean;
  };
  type: 'achievement' | 'project' | 'research' | 'collaboration';
  title: string;
  content: string;
  badgeText?: string;
  likes: number;
  likedByMe?: boolean;
  comments: Comment[];
  tags: string[];
  timestamp: string;
  videoUrl?: string; // Optional embedded video link or mp4 url
  imageUrl?: string; // High-res image URL attachment from gallery
  isHidden?: boolean; // Admin soft-delete flag
}

export interface Ad {
  id: string;
  title: string;
  company: string;
  image?: string; // preset gradients or visual themes
  content: string;
  ctaUrl: string;
  ctaText: string;
  placement: 'left_sidebar' | 'in_feed';
  clicks: number;
  impressions: number;
}

export interface Opportunity {
  id: string;
  name: string;
  type: 'Scholarship' | 'Olympiad' | 'Hackathon' | 'Fellowship';
  provider: string;
  prizePool: string;
  description: string;
  eligibility: string;
  deadline: string;
  applied?: boolean;
}

export interface TeamRequest {
  id: string;
  title: string;
  creatorName: string;
  creatorAvatar: string;
  school: string;
  opportunityName: string;
  lookingFor: string[];
  description: string;
  applicants: Array<{ name: string; school: string; status: 'pending' | 'accepted' | 'declined' }>;
}

export interface VerificationRequest {
  id: string;
  studentName: string;
  studentSchool: string;
  achievementTitle: string;
  category: string;
  institution: string;
  year: string;
  certificateName: string;
  details: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Mentor {
  id: string;
  name: string;
  role: 'Teacher' | 'Coach' | 'Alumni';
  avatar: string;
  institution: string;
  subjects: string[];
  careerGoals: string[];
  projects: string[];
  bio: string;
  rating: number;
  isVerified: boolean;
}

export interface MentorInteraction {
  date: string;
  note: string;
  author: string;
}

export interface MentorshipRequest {
  id: string;
  mentorId: string;
  mentorName: string;
  studentName: string;
  studentSchool: string;
  subject: string;
  message: string;
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  requestedAt: string;
  interactionCount: number;
  interactions: MentorInteraction[];
  feedbackRating?: number;
  feedbackComment?: string;
  communicationRating?: number;
  depthRating?: number;
  effectivenessRating?: number;
  keyTakeaway?: string;
  recommend?: boolean;
  topicsWorkedOn?: string[];
}

export interface SchoolAnnouncement {
  id: string;
  title: string;
  content: string;
  badgeText?: string;
  likes: number;
  timestamp: string;
  type?: 'announcement' | 'event' | 'resource';
  eventDeadline?: string;
  eventReward?: string;
  registeredCount?: number;
  downloadUrl?: string;
  fileSize?: string;
  imageUrl?: string;
}

export interface School {
  id: string;
  name: string;
  avatar: string;
  location: string;
  tagline: string;
  about: string;
  established: string;
  studentRosterCount: number;
  verifiedSealsCount: number;
  trustIndex: string;
  counselorName: string;
  counselorAvatar: string;
  website: string;
  scholars: Array<{
    name: string;
    grade: string;
    seals: number;
    avatar: string;
    bio: string;
  }>;
  announcements: SchoolAnnouncement[];
  bannerUrl?: string;
  customLogoUrl?: string;
  followersCount?: number;
  followedByMe?: boolean;
}

