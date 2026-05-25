import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Legend } from 'recharts';
import * as d3 from 'd3';
import { Trophy, HelpCircle, Network, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  month: string;
  olympiadPoints: number;
  projectPoints: number;
  totalVerified: number;
}

const MILESTONE_TIMELINE: AnalyticsData[] = [
  { month: 'Jan', olympiadPoints: 10, projectPoints: 5, totalVerified: 15 },
  { month: 'Feb', olympiadPoints: 15, projectPoints: 15, totalVerified: 30 },
  { month: 'Mar', olympiadPoints: 20, projectPoints: 25, totalVerified: 45 },
  { month: 'Apr', olympiadPoints: 40, projectPoints: 30, totalVerified: 70 },
  { month: 'May', olympiadPoints: 55, projectPoints: 45, totalVerified: 100 }
];

const SKILL_COMPETENCY_DATA = [
  { subject: 'Mathematics', score: 88, classAvg: 60 },
  { subject: 'Physics Mechanics', score: 94, classAvg: 62 },
  { subject: 'Coding / Python', score: 85, classAvg: 55 },
  { subject: 'Chemistry Formulary', score: 72, classAvg: 58 },
  { subject: 'Astronomy & Space', score: 90, classAvg: 45 }
];

// D3 Node & Link Definition
interface SubjectNode extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  group: number;
  val: number;
}

interface SubjectLink extends d3.SimulationLinkDatum<SubjectNode> {
  source: string;
  target: string;
  value: number;
}

export default function AcademicAnalytics() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState<string | null>(
    "Click any neural topic node in the Interactive Mindmap to evaluate its mathematical linkages!"
  );

  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous SVG contents
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 360;
    const height = 280;

    const nodes: SubjectNode[] = [
      { id: 'maths', label: 'Mathematics', group: 1, val: 24 },
      { id: 'phys', label: 'Physics', group: 2, val: 22 },
      { id: 'code', label: 'Computer Science', group: 3, val: 20 },
      { id: 'astro', label: 'Astro-Physics', group: 2, val: 15 },
      { id: 'robo', label: 'Bio-Robotics', group: 3, val: 14 },
      { id: 'iot', label: 'IoT Sensors', group: 4, val: 12 },
      { id: 'chem', label: 'Chemistry', group: 4, val: 12 }
    ];

    const links: SubjectLink[] = [
      { source: 'maths', target: 'phys', value: 4 },
      { source: 'maths', target: 'code', value: 3 },
      { source: 'phys', target: 'astro', value: 5 },
      { source: 'phys', target: 'robo', value: 4 },
      { source: 'code', target: 'robo', value: 5 },
      { source: 'code', target: 'iot', value: 4 },
      { source: 'chem', target: 'iot', value: 2 },
      { source: 'maths', target: 'chem', value: 2 }
    ];

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .style('background', '#FAF9F6')
      .style('border-radius', '12px');

    const simulation = d3.forceSimulation<SubjectNode>(nodes)
      .force('link', d3.forceLink<SubjectNode, SubjectLink>(links).id(d => d.id).distance(65))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Draw Links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#E2E8F0')
      .attr('stroke-opacity', 0.8)
      .attr('stroke-width', d => Math.sqrt(d.value) * 1.5);

    // Draw Nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => d.val)
      .attr('fill', d => {
        if (d.group === 1) return '#0C447C'; // Deep blue
        if (d.group === 2) return '#D85A30'; // Terracotta orange
        if (d.group === 3) return '#10B981'; // Green
        return '#8B5CF6'; // Purple
      })
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        let relations = links
          .filter(l => (typeof l.source === 'object' ? (l.source as any).id : l.source) === d.id || 
                       (typeof l.target === 'object' ? (l.target as any).id : l.target) === d.id)
          .map(l => {
            const src = typeof l.source === 'object' ? (l.source as any).label : l.source;
            const tgt = typeof l.target === 'object' ? (l.target as any).label : l.target;
            return src === d.label ? tgt : src;
          });
        setSelectedNodeInfo(
          `Topic Focus: "${d.label}" has high dynamic correlation with ${relations.join(', ')} on your profile.`
        );
      });

    // Node titles
    const label = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text(d => d.label)
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .attr('dx', d => d.val + 4)
      .attr('dy', 3)
      .style('pointer-events', 'none');

    // Drag interactions callback definitions
    node.call(
      d3.drag<SVGCircleElement, SubjectNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as any).x)
        .attr('y1', d => (d.source as any).y)
        .attr('x2', d => (d.target as any).x)
        .attr('y2', d => (d.target as any).y);

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!);

      label
        .attr('x', d => d.x!)
        .attr('y', d => d.y!);
    });

  }, []);

  return (
    <div className="space-y-6">
      {/* Bento analytics layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Recharts Area Progress */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                <TrendingUp size={15} className="text-orange-550" />
                Portfolio Score Growth (Verification Points)
              </h3>
              <p className="text-[10px] text-slate-400">Calculated based on school verification of awards and projects</p>
            </div>
            <span className="bg-blue-50 text-blue-901 font-black text-[10px] px-2 py-1 rounded">
              Aarav Sharma
            </span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MILESTONE_TIMELINE} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOlympiad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D85A30" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#D85A30" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProject" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0C447C" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0C447C" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: '#F1F5F9' }} />
                <Area type="monotone" name="Olympiad Points" dataKey="olympiadPoints" stroke="#D85A30" strokeWidth={2} fillOpacity={1} fill="url(#colorOlympiad)" />
                <Area type="monotone" name="Project Points" dataKey="projectPoints" stroke="#0C447C" strokeWidth={2} fillOpacity={1} fill="url(#colorProject)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Recharts Competencies Compared to Average */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
              <Trophy size={15} className="text-orange-550" />
              Core Competency Comparison
            </h3>
            <p className="text-[10px] text-slate-400">Your score vs estimated National school averages</p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={SKILL_COMPETENCY_DATA} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F8FAFC" />
                <XAxis dataKey="subject" tick={{ fontSize: 8, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, borderColor: '#F1F5F9' }} />
                <Legend wrapperStyle={{ fontSize: 9, paddingTop: 5 }} />
                <Bar name="Your Level %" dataKey="score" fill="#0C447C" radius={[4, 4, 0, 0]} />
                <Bar name="National Avg %" dataKey="classAvg" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Card 3: Interactive Mindmap powered by D3 */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-slate-850 text-xs flex items-center gap-1.5">
              <Network size={16} className="text-blue-900" />
              D3 Interactive Subject Mindmap & Curriculum Links
            </h3>
            <p className="text-[10px] text-slate-400">Interconnected graph mapping your achievements back to academic foundations. Drag nodes to explore relationships.</p>
          </div>

          <div className="text-[9px] flex gap-2 font-black">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-900 inline-block"></span> MATHS</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span> PHYSICS</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> CODING</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
          {/* Map canvas */}
          <div className="md:col-span-2 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden min-h-[280px]">
            <svg ref={svgRef} className="max-w-full h-auto" />
          </div>

          {/* Details sidepanel */}
          <div className="bg-orange-50/20 border border-orange-105 rounded-xl p-4 flex flex-col justify-between text-xs space-y-4">
            <div className="space-y-2">
              <span className="font-black text-[9px] tracking-wider text-orange-650 block uppercase">NODE HIGHLIGHTS</span>
              <p className="text-slate-700 leading-normal font-bold">
                {selectedNodeInfo}
              </p>
            </div>

            <div className="text-[10px] text-slate-400 space-y-2.5 pt-4 border-t border-slate-200/50">
              <p>
                <strong>Inter-disciplinary Focus:</strong> Your Astro-Physics honor links directly to advanced algebra frameworks and coordinate computations.
              </p>
              <p className="italic">
                💡 Tip: Connecting more papers or Olympiad trophies to your projects automatically maps related node fibers, helping university admittances evaluate your core research fields dynamically!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
