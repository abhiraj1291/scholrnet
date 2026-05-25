import { Post, Opportunity, TeamRequest, VerificationRequest, Achievement, Project, Mentor, MentorshipRequest, School, Ad } from './types';

export const INITIAL_USER_PROFILE = {
  name: "Aarav Sharma",
  avatar: "AS",
  grade: "Class XII - Science (PCM)",
  school: "Delhi Public School (DPS), R.K. Puram",
  bio: "Ambitious learner, coder, and astronomy enthusiast. Physics olympiad aspirant and secondary school robotics team captain.",
  skills: ["Python", "Physics Mechanics", "Data Analysis", "React", "CAD Modeling", "Calculus"],
  stats: {
    verifiedAchievements: 4,
    ongoingProjects: 2,
    collaborations: 3
  }
};

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach-1",
    title: "Regional Science Exhibition - 1st Position",
    description: "Designed an automated, IoT-based drip irrigation system for urban terrace organic farms. Awarded Outstanding Tech Innovation.",
    category: "Project",
    institution: "State Science Department",
    year: "2025",
    certificateFile: "certificate_regional_science_first.pdf",
    verificationStatus: "Verified",
    verifiedBy: "Delhi Public School, R.K. Puram",
    verifiedAt: "2025-11-10",
    verificationHash: "SCHOLR-7F9AD29B-C429"
  },
  {
    id: "ach-2",
    title: "National Cyber Olympiad (NCO) - AIR 42",
    description: "Secured All India Rank 42 in the final level of the NCO. Scored perfect 100/100 in the logical reasoning segment.",
    category: "Olympiad",
    institution: "Science Olympiad Foundation (SOF)",
    year: "2025",
    certificateFile: "sof_nco_rank_card_2025.pdf",
    verificationStatus: "Verified",
    verifiedBy: "Delhi Public School, R.K. Puram",
    verifiedAt: "2025-09-18",
    verificationHash: "SCHOLR-3E12D8A4-E393"
  },
  {
    id: "ach-3",
    title: "Research Paper: 'Gravity Anomaly Modeling on Lunar Craters'",
    description: "Co-authored short paper modeling gravity variances using Lunar Reconnaissance Orbiter public archives. Published in High School Astro Journal.",
    category: "Research",
    institution: "Young Scholars Astronomy Guild",
    year: "2026",
    certificateFile: "lunar_gravity_draft_v2.pdf",
    verificationStatus: "Pending",
    verifiedBy: "Pending Verification by Physics Dept"
  },
  {
    id: "ach-4",
    title: "State Chess Championship Under-17 Runner Up",
    description: "Represented school chess club in state tournament, finishing second among 120 competitors.",
    category: "Excellence",
    institution: "Delhi Chess Association",
    year: "2025",
    verificationStatus: "NotVerified"
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: "proj-1",
    title: "Mars Rover CAD Prototyping",
    description: "Developed complete mechanical layout for suspension and rover chassis using Autodesk Fusion 360.",
    collaborators: "Dhruba Sen and Prisha Mehra",
    link: "github.com/aarav-rover-cad",
    skills: ["CAD Modeling", "Physics Mechanics", "3D Printing"],
    verificationStatus: "Pending"
  },
  {
    id: "proj-2",
    title: "PyGrade: High School GPA Tracker Class Tool",
    description: "Simple open-source helper CLI tool that takes CBSE percentages and formats them into transcripts.",
    link: "github.com/aarav/pygrade",
    skills: ["Python", "CBSE Grading System"],
    verificationStatus: "Verified",
    verifiedBy: "Delhi Public School, R.K. Puram",
    verifiedAt: "2025-12-05"
  }
];

export const INITIAL_POSTS: Post[] = [
  {
    id: "post-school-1",
    author: {
      name: "Delhi Public School (DPS), R.K. Puram",
      avatar: "🏫",
      school: "CBSE Affiliated Registry",
      isVerified: true
    },
    type: "achievement",
    title: "Official Announcement: Zonal CBSE Innovation Exhibits & Verified Seal Sign-off",
    content: "Our scientific advisory board, headed by STEM Coordinator Mrs. Shreya Sen and Prof. Sandeep Kulkarni, is pleased to invite all students to showcase their active projects. Projects backed by verified certificate proof will receive official DPS high school gold seals on ScholrNet, making details accessible directly to Ivy League and peer Admissions Boards.",
    badgeText: "DPS RK PURAM BULLETIN",
    likes: 138,
    comments: [
      {
        id: "c-sc-1",
        author: "Aarav Sharma",
        avatar: "AS",
        text: "Incredible opportunity! I am preparing my lunar gravity anomalies draft to request a DPS seal early.",
        timestamp: "1 day ago"
      }
    ],
    tags: ["DPSRKPuram", "ScienceZonals", "VerifiedSeals", "CBSE"],
    timestamp: "1 day ago"
  },
  {
    id: "post-1",
    author: {
      name: "Aisha Patel",
      avatar: "AP",
      school: "Campion School, Mumbai",
      isVerified: true
    },
    type: "achievement",
    title: "National Merit Scholarship Winner! ✨",
    content: "Thrilled to share that I have been awarded the National Talent Search Examination (NTSE) Scholarship! Extremely grateful to my physics teacher Mr. Kulkarni for guidance and DPS faculties for conducting mock interviews.",
    badgeText: "NTSE SCHOLAR 2025",
    likes: 247,
    comments: [
      {
        id: "c-11",
        author: "Vedant Mishra",
        avatar: "VM",
        text: "Incredible feat, Aisha! Those mock exams were indeed brutal, great to see your hard work pay off!",
        timestamp: "2 hours ago"
      },
      {
        id: "c-12",
        author: "Mrs. Shreya Sen (Coordinator)",
        avatar: "SS",
        text: "Warm congratulations! You have made Campion School immensely proud.",
        timestamp: "1 hour ago"
      }
    ],
    tags: ["NTSE", "Scholarship", "ProudSchool", "MeritWinner"],
    timestamp: "2 hours ago",
    videoUrl: "https://www.youtube.com/embed/Y-i-g7-TWhs"
  },
  {
    id: "post-2",
    author: {
      name: "Raj Kumar",
      avatar: "RK",
      school: "The Doon School, Dehradun",
      isVerified: true
    },
    type: "research",
    title: "Co-authored Research Paper Accepted next week!",
    content: "Our team's physics research paper 'A Study of Resonant Frequencies in DIY Chladni Plates with Salt Patterns' got accepted in CBSE Regional Young Science Review. Look out for the full details!",
    badgeText: "PHYSICS EXCELLENCE",
    likes: 512,
    videoUrl: "https://www.youtube.com/embed/R8yFr6O9Lek",
    comments: [
      {
        id: "c-21",
        author: "Sneha Kapoor",
        avatar: "SK",
        text: "Outstanding work! Can we replicate this in our physics club experiments too?",
        timestamp: "3 hours ago"
      }
    ],
    tags: ["Research", "Acoustics", "CBSECirriculum", "YoungScientist"],
    timestamp: "4 hours ago"
  },
  {
    id: "post-3",
    author: {
      name: "Sneha Kapoor",
      avatar: "SK",
      school: "Cathedral & John Connon, Mumbai",
      isVerified: false
    },
    type: "collaboration",
    title: "Seeking 2 Teammates for Ignite High School Hackathon",
    content: "We are creating a mobile app to connect school students with local donation centers for text-books and revision notes. Looking for a React-Native frontend designer and someone who knows standard API design.",
    badgeText: "IGNITE TEAM RECRUIT",
    likes: 38,
    comments: [
      {
        id: "c-31",
        author: "Arjun Bhat",
        avatar: "AB",
        text: "Highly interested! I have built two responsive React-Native screens recently. DM'ed you!",
        timestamp: "1 hour ago"
      }
    ],
    tags: ["Hackathon", "Ignite2026", "TeammatesNeeded", "SocialImpact"],
    timestamp: "6 hours ago"
  }
];

export const INITIAL_OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp-1",
    name: "Ignite National Teen Innovation Hackathon 2026",
    type: "Hackathon",
    provider: "Innovation Council of India",
    prizePool: "₹5,00,000",
    description: "National prototype building contest for school pupils of Grade IX-XII. Focus fields: green energy, smart learning, and local micro-finances.",
    eligibility: "Teams of 2-4 school pupils currently studying in secondary level.",
    deadline: "June 15, 2026"
  },
  {
    id: "opp-2",
    name: "Kishore Vaigyanik Protsahan Yojana (KVPY) Fellowships",
    type: "Scholarship",
    provider: "Department of Science and Technology, Govt of India",
    prizePool: "₹7,000/month + Contingency Grants",
    description: "Highly prestigious scholarship program to identify and screen student excellence in basic sciences, biology, chemistry, and mechanics.",
    eligibility: "Grade XI & XII pure science students scoring high cumulative percentages.",
    deadline: "July 20, 2026"
  },
  {
    id: "opp-3",
    name: "Shastri Research Grant for High Schoolers",
    type: "Fellowship",
    provider: "Shastri Science Institute",
    prizePool: "₹50,000 research stipend",
    description: "Provides seed funding, lab access, and teacher guidance to selected high school teams working on chemical or material science formulations.",
    eligibility: "Grade XII students with verified science achievements.",
    deadline: "August 01, 2026"
  },
  {
    id: "opp-4",
    name: "International Astronomy Olympiad State Qualifier",
    type: "Olympiad",
    provider: "Homi Bhabha Centre for Science Education (HBCSE)",
    prizePool: "Fully-funded Training Camp representation to International Finals",
    description: "Highly coveted national selection test representing the first gate to the elite global team.",
    eligibility: "Under-19 secondary pupils.",
    deadline: "June 30, 2026"
  }
];

export const INITIAL_TEAM_REQUESTS: TeamRequest[] = [
  {
    id: "team-1",
    title: "Need CAD Layout Specialist for NASA Space Settlement Contest",
    creatorName: "Dhruba Sen",
    creatorAvatar: "DS",
    school: "Campion School, Mumbai",
    opportunityName: "NASA Space Settlement Design Competition 2026",
    lookingFor: ["Fusion 360", "Orbital Kinematics Expert", "Drafting Specialist"],
    description: "We are designing a centrifugal Mars orbital colony for 10,000 permanent residents. Already have agriculture systems mapped out.",
    applicants: [
      { name: "Pranav Goel", school: "The Doon School", status: "accepted" }
    ]
  },
  {
    id: "team-2",
    title: "Seeking Mentor / Teacher Advisor for High School Bio-Sensor Project",
    creatorName: "Meera Nair",
    creatorAvatar: "MN",
    school: "Holy Cross High, Kochi",
    opportunityName: "National Science Congress 2026",
    lookingFor: ["Biology Advisor", "Embedded Sensors Enthusiast"],
    description: "Developing a soil salinity sensor test strip utilizing direct leaf electrical potential metrics.",
    applicants: []
  }
];

export const INITIAL_VERIFICATION_REQUESTS: VerificationRequest[] = [
  {
    id: "req-1",
    studentName: "Raj Kumar",
    studentSchool: "Delhi Public School (DPS), R.K. Puram",
    achievementTitle: "CBSE City topper in Sophomore Olympiad 2025",
    category: "Olympiad",
    institution: "CBSE Board Association",
    year: "2025",
    certificateName: "cbse_olympiad_topper_raj_kumar.pdf",
    details: "Raj Kumar submitted his scoring transcript showing 99.4 percentile CBSE mathematics sophomore level. Seeking seal certification.",
    requestedAt: "2026-05-20",
    status: "pending"
  },
  {
    id: "req-2",
    studentName: "Sneha Kapoor",
    studentSchool: "Delhi Public School (DPS), R.K. Puram",
    achievementTitle: "Project: Automated SafeSchool Smart Bus Sensor Tracker",
    category: "Project",
    institution: "DPS Science Club",
    year: "2026",
    certificateName: "safeschool_capstone_seniors_2026_spec.pdf",
    details: "Sneha Kapoor led a team of three juniors to build an ultrasonic warning ring for school buses. Tested successfully on campus buses.",
    requestedAt: "2026-05-21",
    status: "pending"
  },
  {
    id: "req-3",
    studentName: "Vedant Mishra",
    studentSchool: "Campion School, Mumbai",
    achievementTitle: "State Robotics Fair Champion",
    category: "Project",
    institution: "Western Zone Robotics Federation",
    year: "2025",
    certificateName: "robotics_championship_trophy_sealed.png",
    details: "Vedant requests Campion School counselor seal for his role as primary robot pilot and designer.",
    requestedAt: "2026-05-19",
    status: "approved"
  }
];

export const INITIAL_MENTORS: Mentor[] = [
  {
    id: "mentor-1",
    name: "Prof. Sandeep Kulkarni",
    role: "Coach",
    avatar: "SK",
    institution: "Homi Bhabha Centre for Science Education (HBCSE)",
    subjects: ["Physics Mechanics", "Calculus", "Astronomy & Space"],
    careerGoals: ["Research Scientist", "Engineering Academics", "Olympiad Excellence"],
    projects: ["Gravity Anomaly Modeling", "Mars rover CAD Prototyping", "Chladni Plate Acoustical Modeling"],
    bio: "Senior Physics Coach and Olympiad Trainer. Passionate about helping high school students build mathematically sound research papers and navigate Ivy League & IISc physics admissions.",
    rating: 4.9,
    isVerified: true
  },
  {
    id: "mentor-2",
    name: "Mrs. Shreya Sen",
    role: "Teacher",
    avatar: "SS",
    institution: "Delhi Public School (DPS), R.K. Puram",
    subjects: ["Calculus", "Mathematics", "Science Exhibition Lab"],
    careerGoals: ["Admissions Board Preparation", "Government Fellowship Streams", "Urban Tech Ventures"],
    projects: ["Drip Irrigation IoT", "PyGrade Tracker Tool", "Ultrasonic Bus Sensors"],
    bio: "Head Coordinator of Academic Honors & CBSE Project Submissions at DPS. Mentors students looking to get their research papers or innovative IoT models officially sealed and verified.",
    rating: 4.8,
    isVerified: true
  },
  {
    id: "mentor-3",
    name: "Neha Singhal",
    role: "Alumni",
    avatar: "NS",
    institution: "Stanford University / ex-DPS R.K. Puram '24",
    subjects: ["Python", "React", "CAD Modeling"],
    careerGoals: ["Software Engineer", "Silicon Valley Founders", "AI/ML Researchers"],
    projects: ["PyGrade Tracker Tool", "Urban Agriculture IoT Dashboard"],
    bio: "High-achieving DPS Alumna, currently studying Computer Science and Robotics at Stanford. Gold Medalist in National Cyber Olympiad. Excited to coach peers on hackathons, full-stack React projects, and US admissions essays.",
    rating: 5.0,
    isVerified: true
  },
  {
    id: "mentor-4",
    name: "Anoop Joshi",
    role: "Coach",
    avatar: "AJ",
    institution: "Delhi Chess Academy",
    subjects: ["Strategic Reasoning", "CBSE Co-Curricular Excellence"],
    careerGoals: ["Professional Athletics", "Strategic Thinking Careers"],
    projects: ["Chess Club State Champion Prep"],
    bio: "FIDE Master and Junior Chess Coach. Helps chess and board game athletes develop rigorous game theories, cognitive focus, and balance active tournaments alongside CBSE science streams.",
    rating: 4.7,
    isVerified: true
  }
];

export const INITIAL_MENTORSHIP_REQUESTS: MentorshipRequest[] = [
  {
    id: "mreq-1",
    mentorId: "mentor-1",
    mentorName: "Prof. Sandeep Kulkarni",
    studentName: "Aarav Sharma",
    studentSchool: "Delhi Public School (DPS), R.K. Puram",
    subject: "Physics Mechanics",
    message: "Respected Sir, I am draft-preparing a research paper on gravity anomalies around Lunar Craters. I would be immensely honored if you could provide critique on my mathematical orbits before I request a DPS school seal.",
    status: "accepted",
    requestedAt: "2026-05-18",
    interactionCount: 2,
    interactions: [
      {
        date: "2026-05-19",
        author: "Prof. Sandeep Kulkarni",
        note: "Hello Aarav, I reviewed your gravity equation draft. The spherical harmonic order you are using looks brilliant but your tide compensation needs a small derivative update. Let's fix that during our weekend calls!"
      },
      {
        date: "2026-05-20",
        author: "Aarav Sharma",
        note: "Thank you so much, Sir! I updated the lunar mass derivatives based on your feedback. I have uploaded the revised draft in my portfolio section."
      }
    ],
    feedbackRating: 5,
    feedbackComment: "Invaluable mathematical insights! Prof. Kulkarni helped me identify critical errors in my lunar orbit constants."
  },
  {
    id: "mreq-2",
    mentorId: "mentor-3",
    mentorName: "Neha Singhal",
    studentName: "Aarav Sharma",
    studentSchool: "Delhi Public School (DPS), R.K. Puram",
    subject: "Python",
    message: "Hi Neha! Congrats on Stanford. I built PyGrade, a CBSE transcripts formatter. I am thinking of adding full-stack React capabilities. I would love some tips on how DPS projects get noticed by Stanford admissions.",
    status: "pending",
    requestedAt: "2026-05-22",
    interactionCount: 0,
    interactions: []
  }
];

export const INITIAL_SCHOOLS: School[] = [
  {
    id: "sch-1",
    name: "Delhi Public School (DPS), R.K. Puram",
    avatar: "🏢",
    location: "Sector XII, R.K. Puram, New Delhi",
    tagline: "Service Before Self",
    about: "Delhi Public School, R.K. Puram is one of India's most prestigious co-educational day-cum-boarding schools. Highly recognized for excellence in mathematical sciences, robotics development, and national olympiads channels.",
    established: "1972",
    studentRosterCount: 220,
    verifiedSealsCount: 145,
    trustIndex: "CBSE-IN-DEL-981",
    counselorName: "Mrs. Shreya Sen",
    counselorAvatar: "SS",
    website: "https://dpsrkpuram.in",
    scholars: [
      {
        name: "Aarav Sharma",
        grade: "Class XII - Science (PCM)",
        seals: 4,
        avatar: "AS",
        bio: "Ambitious learner, coder, and astronomy enthusiast. CAPS robotic assistant."
      },
      {
        name: "Sneha Kapoor",
        grade: "Class XII - Science (PCB)",
        seals: 5,
        avatar: "SK",
        bio: "Pre-med major studying plant genetic arrays and diagnostic workflows."
      }
    ],
    announcements: [
      {
        id: "ann-1-1",
        title: "Registration Open: Regional CBSE Science Fair & IoT Prototyping Showcase",
        content: "DPS R.K. Puram will host the zonal Innovation Fair on June 10. Students who present verified hardware prototypes signed early by science coordinators will be fast-tracked to the national selections. Contact Mrs. Shreya Sen for credential matching.",
        badgeText: "Official Notice",
        likes: 42,
        timestamp: "2 days ago",
        imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "sch-2",
    name: "Campion School, Mumbai",
    avatar: "🏫",
    location: "Cooperage Road, Fort, Mumbai",
    tagline: "Joy in Learning",
    about: "Campion School is an ICSE boys' school in Fort, Mumbai. Fosters leadership traits, public speaking, and outstanding co-authored computational science research papers.",
    established: "1943",
    studentRosterCount: 180,
    verifiedSealsCount: 94,
    trustIndex: "ICSE-IN-MAH-401",
    counselorName: "Mr. Shailesh Kulkarni",
    counselorAvatar: "SK",
    website: "https://campionschool.in",
    scholars: [
      {
        name: "Aisha Patel",
        grade: "Class XII - Pure Science",
        seals: 3,
        avatar: "AP",
        bio: "National Merit scholar researching astrobio simulation frameworks."
      },
      {
        name: "Vedant Mishra",
        grade: "Class XII - Commerce",
        seals: 3,
        avatar: "VM",
        bio: "State chess team captain and financial CBA cbse analyst."
      }
    ],
    announcements: [
      {
        id: "ann-2-1",
        title: "Dignity in Inquiry: Young Authors Research Summit 2026",
        content: "We are partnering with the Western Scholars League for a high school abstract review. Admissions officers from domestic and international universities will evaluate papers directly. Send drafts by May 30.",
        badgeText: "Honors List",
        likes: 31,
        timestamp: "5 days ago",
        imageUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80"
      }
    ]
  },
  {
    id: "sch-3",
    name: "The Doon School, Dehradun",
    avatar: "🏰",
    location: "Mall Road, Dehradun, Uttarakhand",
    tagline: "The Aristocracy of Service",
    about: "The Doon School is India's preeminent all-boys boarding school, specializing in rigorous cbse training files, physical chemistry laboratory studies, and environmental research projects.",
    established: "1935",
    studentRosterCount: 150,
    verifiedSealsCount: 112,
    trustIndex: "CBSE-IN-UTT-220",
    counselorName: "Dr. Arvind Chona",
    counselorAvatar: "AC",
    website: "https://doonschool.com",
    scholars: [
      {
        name: "Raj Kumar",
        grade: "Class XI - Technical",
        seals: 2,
        avatar: "RK",
        bio: "Developing responsive physical acoustics plates and robotic circuits."
      }
    ],
    announcements: [
      {
        id: "ann-3-1",
        title: "Summer Boarding Research Fellowships",
        content: "Selected pupils of Class XI may apply for the annual Shastri Science Institute lab grants during summer breaks. All applications require certified proof of STEM achievements.",
        badgeText: "Event Update",
        likes: 56,
        timestamp: "3 days ago",
        imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80"
      }
    ]
  }
];

export const INITIAL_ADS: Ad[] = [
  {
    id: "ad-sidebar-1",
    title: "MIT Teen Tech Summer Bootcamp 2026",
    company: "MIT Innovation Labs",
    image: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    content: "An elite 4-week virtual incubation for global high schoolers. Work with real academic researchers, draft peer-accepted abstracts, and pitch ideas to top VC chairs.",
    ctaUrl: "https://mit.edu/summer-tech",
    ctaText: "Apply Online",
    placement: "left_sidebar",
    clicks: 142,
    impressions: 4890
  },
  {
    id: "ad-sidebar-2",
    title: "Stanford Math & Physics Honors Elite Track",
    company: "Stanford pre-collegiate",
    image: "linear-gradient(135deg, #881337 0%, #4c0519 100%)",
    content: "Master Advanced Mechanics, Calculus BC, and Electrodynamics. Boost your ScholrNet Trust Index with verified Stanford tutors and earn official recommendation credentials.",
    ctaUrl: "https://stanford.edu/honors",
    ctaText: "Explore Courses",
    placement: "left_sidebar",
    clicks: 89,
    impressions: 3120
  },
  {
    id: "ad-feed-1",
    title: "Ready to Supercharge Your Academic Portfolio?",
    company: "ScholrNet Premium",
    image: "linear-gradient(135deg, #0a66c2 0%, #0369a1 100%)",
    content: "Unlock ScholrNet Premium & get direct matching with Ivy League counselors, AI feedback reviews for research drafts, unlimited Digital Seals, and guaranteed verified certificate hashes.",
    ctaUrl: "https://scholrnet.com/premium",
    ctaText: "Get Premium (Free Trial)",
    placement: "in_feed",
    clicks: 341,
    impressions: 12050
  },
  {
    id: "ad-feed-2",
    title: "Score 1550+ on SAT with ScholrNet Adaptive Labs",
    company: "ScholrNet Prep",
    image: "linear-gradient(135deg, #4f46e5 0%, #312e81 100%)",
    content: "Guaranteed score improvements. Try our adaptive AI diagnostic module to target weak zones, practice CBSE syllabus cross-alignments, and view verifiable mock evaluations.",
    ctaUrl: "https://scholrnet.com/sat-prep",
    ctaText: "Solve Free Drills",
    placement: "in_feed",
    clicks: 156,
    impressions: 6730
  }
];


