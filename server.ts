import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import {
  INITIAL_SCHOOLS,
  INITIAL_POSTS,
  INITIAL_ACHIEVEMENTS,
  INITIAL_PROJECTS,
  INITIAL_VERIFICATION_REQUESTS,
  INITIAL_ADS
} from "./src/mockData";
import { Post, SchoolAnnouncement, Ad } from "./src/types";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory database initialized with deep copies of the mock data structure
  const state = {
    schools: JSON.parse(JSON.stringify(INITIAL_SCHOOLS)),
    posts: JSON.parse(JSON.stringify(INITIAL_POSTS)),
    achievements: JSON.parse(JSON.stringify(INITIAL_ACHIEVEMENTS)),
    projects: JSON.parse(JSON.stringify(INITIAL_PROJECTS)),
    verificationRequests: JSON.parse(JSON.stringify(INITIAL_VERIFICATION_REQUESTS)),
    ads: JSON.parse(JSON.stringify(INITIAL_ADS)),
    registeredEventIds: ["ann-2"]
  };

  // Initialize server-side Gemini client
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({
    apiKey: apiKey || "MOCK_KEY", // safeguard if not set yet, handled in route
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // API Route: Portfolio Analysis
  app.post("/api/gemini/analyze-portfolio", async (req: express.Request, res: express.Response) => {
    try {
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "Gemini API key is not configured. Please supply your API key in Settings > Secrets."
        });
      }

      const { achievements, projects, name, grade, school } = req.body;
      
      const prompt = `You are ScholrAI, an expert academic advisor for high school and school students.
Evaluate the following student's profile, achievements, and projects, and generate customized, high-impact strategies:

Student Name: ${name || "Anonymous Student"}
Grade / Class: ${grade || "N/A"}
School / Institute: ${school || "N/A"}

Achievements:
${JSON.stringify(achievements || [])}

Projects & Research:
${JSON.stringify(projects || [])}

Please output a JSON response containing the following structure:
{
  "academicReview": "Constructive, encouraging 3-sentence summary of their current academic trajectory and potential.",
  "strengths": ["Core Strength 1", "Core Strength 2"],
  "opportunitiesRecommended": [
    {
      "name": "Opportunity Name (e.g. Kishore Vaigyanik Protsahan Yojana, Google Science Fair)",
      "type": "Scholarship / Olympiad / Hackathon / Fellowship",
      "whyFit": "1-sentence reason why their current profile matches this brilliantly."
    },
    {
      "name": "Opportunity Name 2",
      "type": "Scholarship / Olympiad / Hackathon / Fellowship",
      "whyFit": "1-sentence explanation of suitability."
    }
  ],
  "portfolioEnhancements": [
    "Specific tip on how they can present their achievements better.",
    "Another tip about showcasing research or collaborative work."
  ]
}

Response MUST be a raw JSON object string. Do not wrap in markdown \`\`\`json or \`\`\` wrappers.`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const textOutput = result.text || "{}";
      res.json(JSON.parse(textOutput.trim()));
    } catch (err: any) {
      console.error("Gemini portfolio analysis failed:", err);
      res.status(500).json({ error: err.message || "Failed to analyze portfolio" });
    }
  });

  // API Route: Advisor Counseling Q&A
  app.post("/api/gemini/ask-advisor", async (req: express.Request, res: express.Response) => {
    try {
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
        return res.status(400).json({
          error: "Gemini API key is not configured. Please supply your API key in Settings > Secrets."
        });
      }

      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message is required." });
      }

      const systemPrompt = `You are ScholrAI, a highly expert student counselor, Olympiad mentor, and portfolio advisor for secondary/high school students.
A student asks you for help. Answer their question clearly with practical, actionable academic advice.
Give concise, motivating responses, including bullet points where relevant, avoiding corporate or complex jargon. Maintain a warm, encouraging developer-academic tone.

Student Question: ${message}`;

      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: systemPrompt,
      });

      res.json({ answer: result.text || "No response received." });
    } catch (err: any) {
      console.error("Gemini Advisor Q&A failed:", err);
      res.status(500).json({ error: err.message || "Advisor error" });
    }
  });

  // REST API: GET all synchronized backend data at once
  app.get("/api/data", (req: express.Request, res: express.Response) => {
    res.json({
      schools: state.schools,
      posts: state.posts,
      achievements: state.achievements,
      projects: state.projects,
      verificationRequests: state.verificationRequests,
      registeredEventIds: state.registeredEventIds,
      ads: state.ads
    });
  });

  // REST API: GET advertisements list
  app.get("/api/ads", (req: express.Request, res: express.Response) => {
    res.json({ ads: state.ads });
  });

  // REST API: POST create or update an advertisement
  app.post("/api/ads", (req: express.Request, res: express.Response) => {
    try {
      const { ad } = req.body;
      if (!ad) {
        return res.status(400).json({ error: "No ad data supplied" });
      }
      
      const existingIndex = state.ads.findIndex((item: any) => item.id === ad.id);
      if (existingIndex >= 0) {
        state.ads[existingIndex] = { ...state.ads[existingIndex], ...ad };
      } else {
        const newAd: Ad = {
          id: `ad-${Date.now()}`,
          title: ad.title || "Untitled Ad",
          company: ad.company || "Sponsor Company",
          image: ad.image || "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          content: ad.content || "",
          ctaUrl: ad.ctaUrl || "#",
          ctaText: ad.ctaText || "Learn More",
          placement: ad.placement || "left_sidebar",
          clicks: 0,
          impressions: Math.floor(Math.random() * 50) + 100
        };
        state.ads.push(newAd);
      }
      res.json({ success: true, ads: state.ads });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to upsert ad" });
    }
  });

  // REST API: DELETE an advertisement
  app.delete("/api/ads/:id", (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      state.ads = state.ads.filter((item: any) => item.id !== id);
      res.json({ success: true, ads: state.ads });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete ad" });
    }
  });

  // REST API: POST click tracker for an advertisement
  app.post("/api/ads/:id/click", (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      state.ads = state.ads.map((item: any) => {
        if (item.id === id) {
          return { ...item, clicks: (item.clicks || 0) + 1 };
        }
        return item;
      });
      res.json({ success: true, ads: state.ads });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to count click" });
    }
  });

  // REST API: POST sync posts (e.g., likes, comments, student custom postings)
  app.post("/api/posts/sync", (req: express.Request, res: express.Response) => {
    try {
      const { posts } = req.body;
      if (Array.isArray(posts)) {
        state.posts = posts;
      }
      res.json({ success: true, posts: state.posts });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to sync posts" });
    }
  });

  // REST API: POST Add Achievement
  app.post("/api/achievements", (req: express.Request, res: express.Response) => {
    try {
      const { achievement } = req.body;
      if (achievement) {
        state.achievements = [achievement, ...state.achievements];
      }
      res.json({ success: true, achievements: state.achievements });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add achievement" });
    }
  });

  // REST API: POST Add Project
  app.post("/api/projects", (req: express.Request, res: express.Response) => {
    try {
      const { project } = req.body;
      if (project) {
        state.projects = [project, ...state.projects];
      }
      res.json({ success: true, projects: state.projects });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add project" });
    }
  });

  // REST API: POST Add Verification Request
  app.post("/api/verification-requests", (req: express.Request, res: express.Response) => {
    try {
      const { request } = req.body;
      if (request) {
        state.verificationRequests = [request, ...state.verificationRequests];
      }
      res.json({ success: true, verificationRequests: state.verificationRequests });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add verification request" });
    }
  });

  // REST API: POST Action on Verification Request (Approve / Reject digital seal)
  app.post("/api/verification-requests/:id/action", (req: express.Request, res: express.Response) => {
    try {
      const { id } = req.params;
      const { action, signatureHash } = req.body;
      const targetRequest = state.verificationRequests.find((r: any) => r.id === id);

      if (!targetRequest) {
        return res.status(404).json({ error: "Verification request not found" });
      }

      state.verificationRequests = state.verificationRequests.map((req: any) => {
        if (req.id === id) {
          return { ...req, status: action === 'approve' ? 'approved' : 'rejected' };
        }
        return req;
      });

      if (action === 'approve') {
        const studentName = targetRequest.studentName;
        if (studentName === "Aarav Sharma") {
          state.achievements = state.achievements.map((ach: any) => {
            if (ach.title === targetRequest.achievementTitle) {
              return {
                ...ach,
                verificationStatus: 'Verified',
                verifiedBy: "Delhi Public School (DPS), R.K. Puram Office",
                verifiedAt: new Date().toISOString().split('T')[0],
                verificationHash: signatureHash
              };
            }
            return ach;
          });

          const newSystemPost: Post = {
            id: `post-milestone-${Date.now()}`,
            author: {
              name: "Aarav Sharma",
              avatar: "AS",
              school: "Delhi Public School (DPS), R.K. Puram",
              isVerified: true
            },
            type: 'achievement',
            title: `SEAL APPROVED: ${targetRequest.achievementTitle}! 🏅`,
            content: `Very glad to announce that my school has officially verified and sealed my academic honor! Secure hash identity generated in Ledger: ${signatureHash}. Ready to lock this credential inside university admissions.`,
            badgeText: targetRequest.category.toUpperCase(),
            likes: 1,
            comments: [],
            tags: ["SchoolVerified", "PortofolioAchievement", "TrustUnlocked"],
            timestamp: "Just now"
          };
          state.posts = [newSystemPost, ...state.posts];
        } else {
          state.posts = state.posts.map((post: any) => {
            if (post.author.name === studentName) {
              return {
                ...post,
                author: { ...post.author, isVerified: true }
              };
            }
            return post;
          });

          const helperSchoolName = (name: string) => {
            if (name.includes("Sneha")) return "Delhi Public School (DPS), R.K. Puram";
            if (name.includes("Aisha")) return "Campion School, Mumbai";
            if (name.includes("Vedant")) return "Campion School, Mumbai";
            return "Delhi Public School (DPS), R.K. Puram";
          };

          const classmatePost: Post = {
            id: `post-classmate-${Date.now()}`,
            author: {
              name: studentName,
              avatar: studentName.split(' ').map((n: string) => n[0]).join(''),
              school: helperSchoolName(studentName),
              isVerified: true
            },
            type: 'achievement',
            title: `Official Digital seal: ${targetRequest.achievementTitle}!`,
            content: `Administrative review complete. The institution has sealed this milestone into the student's trusted profile. Safe identification ID generated: ${signatureHash}.`,
            badgeText: targetRequest.category.toUpperCase(),
            likes: 12,
            comments: [],
            tags: ["VerifiablePortfolio", "ScholristIndex"],
            timestamp: "Just now"
          };
          state.posts = [classmatePost, ...state.posts];
        }
      } else {
        const studentName = targetRequest.studentName;
        if (studentName === "Aarav Sharma") {
          state.achievements = state.achievements.map((ach: any) => {
            if (ach.title === targetRequest.achievementTitle) {
              return { ...ach, verificationStatus: 'NotVerified', verifiedBy: undefined };
            }
            return ach;
          });
        }
      }

      res.json({
        success: true,
        verificationRequests: state.verificationRequests,
        achievements: state.achievements,
        posts: state.posts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to process verification action" });
    }
  });

  // REST API: POST Create School Announcement / Bulletin
  app.post("/api/schools/:schoolId/announcements", (req: express.Request, res: express.Response) => {
    try {
      const { schoolId } = req.params;
      const { title, content, badgeText, type, eventDeadline, eventReward, downloadUrl, fileSize } = req.body;

      const school = state.schools.find((s: any) => s.id === schoolId);
      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }

      const activeBadge = badgeText || "Bulletin";
      const activeType = type || "announcement";

      const newAnn: SchoolAnnouncement = {
        id: `ann-custom-${Date.now()}`,
        title: title || "Official Bulletin Update",
        content: content || "",
        badgeText: activeBadge,
        type: activeType,
        eventDeadline,
        eventReward,
        downloadUrl,
        fileSize,
        likes: 0,
        timestamp: "Just now"
      };

      school.announcements = [newAnn, ...school.announcements];

      const newPost: Post = {
        id: `post-school-custom-${Date.now()}`,
        author: {
          name: school.name,
          avatar: school.avatar || "🏫",
          school: "CBSE Affiliated Registry",
          isVerified: true
        },
        type: "achievement",
        title: newAnn.title,
        content: newAnn.content,
        badgeText: activeBadge.toUpperCase(),
        likes: 0,
        comments: [],
        tags: [school.tagline?.replace(/\s/g, "") || "SchoolPatch", "Bulletin"],
        timestamp: "Just now"
      };
      state.posts = [newPost, ...state.posts];

      res.json({
        success: true,
        schools: state.schools,
        posts: state.posts
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to publish announcement" });
    }
  });

  // REST API: DELETE School Announcement
  app.delete("/api/schools/:schoolId/announcements/:announceId", (req: express.Request, res: express.Response) => {
    try {
      const { schoolId, announceId } = req.params;
      const school = state.schools.find((s: any) => s.id === schoolId);
      if (!school) {
        return res.status(404).json({ error: "School not found" });
      }

      school.announcements = school.announcements.filter((ann: any) => ann.id !== announceId);

      res.json({
        success: true,
        schools: state.schools
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete announcement" });
    }
  });

  // REST API: POST Register/Toggle sign-up for Event
  app.post("/api/events/:announceId/register", (req: express.Request, res: express.Response) => {
    try {
      const { announceId } = req.params;
      const isAlready = state.registeredEventIds.includes(announceId);

      if (isAlready) {
        state.registeredEventIds = state.registeredEventIds.filter((id: string) => id !== announceId);
      } else {
        state.registeredEventIds = [...state.registeredEventIds, announceId];
      }

      res.json({
        success: true,
        registeredEventIds: state.registeredEventIds,
        isRegistered: !isAlready
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to register for event" });
    }
  });

  // Lite REST route for mock notifications or logs
  app.get("/api/health", (req: express.Request, res: express.Response) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Setup Vite Dev Server / Static files
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in developer mode using Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode serving static dist folder...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: express.Request, res: express.Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ScholrNet Backend Running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
