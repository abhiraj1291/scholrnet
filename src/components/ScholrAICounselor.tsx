import React, { useState } from 'react';
import { Achievement, Project } from '../types';
import { Sparkles, Send, Brain, Compass, BookOpen, AlertCircle, RefreshCw, Layers, Bot } from 'lucide-react';

interface ScholrAICounselorProps {
  studentName: string;
  grade: string;
  school: string;
  achievements: Achievement[];
  projects: Project[];
}

interface AnalysisResponse {
  academicReview: string;
  strengths: string[];
  opportunitiesRecommended: Array<{ name: string; type: string; whyFit: string }>;
  portfolioEnhancements: string[];
}

export default function ScholrAICounselor({ studentName, grade, school, achievements, projects }: ScholrAICounselorProps) {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: `Hello Aarav! I am ScholrAI, your academic portfolio mentor. Click "Perform Deep Portfolio Review" below to send your verified achievements for analysis, or ask me any question about Olympiad preparation, CBSE pathways, or research paper styling!` }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Analysis result state
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Handle Ask Advice Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || isChatLoading) return;

    const userMsg = chatMessage.trim();
    setChatHistory(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatMessage('');
    setIsChatLoading(true);
    setErrorText(null);

    try {
      const res = await fetch('/api/gemini/ask-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Advisor took too long to respond.");

      setChatHistory(prev => [...prev, { sender: 'ai', text: data.answer }]);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Could not communicate with ScholrAI.");
      setChatHistory(prev => [
        ...prev,
        { sender: 'ai', text: `⚠️ Error: Could not generate advice. Please ensure you have added your Gemini API key in Settings > Secrets.` }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Full Portfolio Analysis
  const handleAnalyzePortfolio = async () => {
    setIsAnalyzing(true);
    setErrorText(null);
    setAnalysis(null);

    try {
      const res = await fetch('/api/gemini/analyze-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: studentName,
          grade,
          school,
          achievements: achievements.map(a => ({ title: a.title, category: a.category, desc: a.description, status: a.verificationStatus })),
          projects: projects.map(p => ({ title: p.title, desc: p.description, status: p.verificationStatus }))
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not complete automated portfolio evaluation.");

      setAnalysis(data);
    } catch (err: any) {
      console.error(err);
      setErrorText(err.message || "Failed to analyze student credentials.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Informative Header Banner */}
      <div className="bg-orange-600 rounded-2xl border border-orange-700 shadow-sm p-4 text-white flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-extrabold text-sm flex items-center gap-1.5 leading-none">
            <Bot size={16} />
            Coached by ScholrAI Academic Model
          </h3>
          <p className="text-[11px] text-orange-50 mt-1 max-w-xl leading-normal">
            Your personalized LLM advisor reviews your verified milestones using expert CBSE, ICSE, and College Admissions framework algorithms to recommend ideal contests.
          </p>
        </div>

        <button
          onClick={handleAnalyzePortfolio}
          disabled={isAnalyzing}
          className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-md border border-slate-950/20 active:scale-95 disabled:opacity-50 cursor-pointer"
        >
          {isAnalyzing ? (
            <RefreshCw size={13} className="animate-spin" />
          ) : (
            <Brain size={13} />
          )}
          Deep Portfolio Review
        </button>
      </div>

      {/* Error Warnings */}
      {errorText && (
        <div className="bg-red-50 border border-red-150 rounded-2xl p-4 flex gap-3 text-xs text-red-800">
          <AlertCircle className="shrink-0 text-red-600" size={16} />
          <div className="space-y-1 leading-normal">
            <span className="font-bold">Advisor Integration Interrupted</span>
            <p>{errorText}</p>
            <p className="font-semibold text-[10.5px] mt-1 text-red-750">
              💡 Please verify that you have added your credentials under the <strong className="font-extrabold uppercase text-xs">Settings &gt; Secrets</strong> menu (parameter Name: <code className="bg-red-100 px-1 py-0.5 rounded font-mono font-black">GEMINI_API_KEY</code>).
            </p>
          </div>
        </div>
      )}

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Advisor Chat Container */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 flex flex-col justify-between min-h-[460px]">
          <div className="space-y-1 pb-3 border-b border-slate-100">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 text-blue-950">
              <Compass size={14} />
              Interactive Academic Advising Workspace
            </h4>
            <p className="text-[10px] text-slate-400">Ask questions about scholarships, research paper structures, essay topics, or test prep</p>
          </div>

          {/* Chat text panel */}
          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-4 pr-1 scrollbar-thin">
            {chatHistory.map((item, index) => (
              <div
                key={index}
                className={`flex gap-3 text-xs ${item.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {item.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center shrink-0">
                    AI
                  </div>
                )}
                <div
                  className={`rounded-2xl p-3.5 max-w-[85%] leading-relaxed ${
                    item.sender === 'user'
                      ? 'bg-blue-950 text-white'
                      : 'bg-slate-50 border border-slate-100 text-slate-755'
                  }`}
                >
                  <p className="whitespace-pre-line">{item.text}</p>
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex gap-3 text-xs justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center shrink-0 animate-bounce">
                  AI
                </div>
                <span className="text-slate-400 font-semibold animate-pulse">ScholrAI is formulating recommendation pathways...</span>
              </div>
            )}
          </div>

          {/* Chat input form */}
          <form onSubmit={handleSendMessage} className="border-t border-slate-100 pt-3.5 flex gap-2.5">
            <input
              type="text"
              placeholder="Ask: 'Which scholarships fit a XII math topper?', 'How to draft project abstracts?'..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              disabled={isChatLoading}
              className="flex-1 bg-slate-50 border border-slate-150 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
            <button
              type="submit"
              disabled={isChatLoading || !chatMessage.trim()}
              className="bg-blue-950 hover:bg-blue-900 text-white px-4.5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Right 1 Column: Automated Portfolio Evaluation Report card */}
        <div className="bg-slate-50/50 border border-slate-150 rounded-2xl p-5 space-y-4">
          <div className="space-y-1.5 pb-2.5 border-b border-slate-200">
            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1">
              <Layers size={13} className="text-orange-550" />
              Automated Advisor Review
            </h4>
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Generated in real-time</span>
          </div>

          {isAnalyzing ? (
            <div className="py-12 text-center space-y-3">
              <RefreshCw size={24} className="text-orange-600 animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-655 animate-pulse">Evaluating verified awards list...</p>
              <p className="text-[9.5s] text-slate-450 leading-relaxed max-w-[200px] mx-auto">Evaluating state credits & aligning Olympiad records to fellowships.</p>
            </div>
          ) : analysis ? (
            <div className="space-y-5 text-xs scrollbar-thin max-h-[380px] overflow-y-auto pr-1">
              {/* Overall review statement */}
              <div className="space-y-1">
                <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">TRAJECTORY INDEX</span>
                <p className="text-slate-700 leading-normal bg-white p-3 rounded-xl border border-slate-120 font-medium">
                  {analysis.academicReview}
                </p>
              </div>

              {/* Strengths */}
              <div className="space-y-1">
                <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">CORE STRENGTHS</span>
                <div className="space-y-1">
                  {analysis.strengths.map((str, i) => (
                    <span key={i} className="block bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg p-2 font-bold text-[10.5px]">
                      ✔ {str}
                    </span>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="space-y-1">
                <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">SUIT_CONTEST RECOMMENDATIONS</span>
                <div className="space-y-2">
                  {analysis.opportunitiesRecommended.map((opp, i) => (
                    <div key={i} className="bg-white border rounded-xl p-2.5 space-y-1 shadow-sm">
                      <span className="font-bold text-slate-800 block text-[11px]">{opp.name}</span>
                      <span className="text-[9px] font-bold text-blue-900 bg-blue-50/70 px-1.5 py-0.5 rounded uppercase">{opp.type}</span>
                      <p className="text-[10px] text-slate-550 leading-normal pt-1">{opp.whyFit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations for improvement */}
              <div className="space-y-1.5 pb-2">
                <span className="font-black text-[9px] text-slate-400 uppercase tracking-widest block">PORTFOLIO POLISHING TIPS</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-normal">
                  {analysis.portfolioEnhancements.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <BookOpen size={30} className="text-slate-300 mx-auto" />
              <p className="text-[11px] font-semibold text-slate-600">No portfolio evaluation generated.</p>
              <p className="text-[10px] leading-relaxed text-slate-400 max-w-[190px] mx-auto">
                Press "Deep Portfolio Review" at the top to evaluate your verified achievements with LLM criteria.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
