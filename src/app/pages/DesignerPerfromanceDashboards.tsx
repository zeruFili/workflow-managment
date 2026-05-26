// @ts-nocheck
import React, { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Star, TrendingUp, TrendingDown, ChevronLeft, ChevronRight,
  CheckCircle, Clock, AlertTriangle, Pause, Edit2, Check, X,
  BarChart2, Award, Zap, Target, RefreshCw, Activity,
  ChevronDown, Search, ArrowUpDown,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// ─── Inline mock data (mirrors the separate data file) ────────────────────────
const designerProfiles = [
  { designerId: '3',  displayName: 'Emily Chen',    username: 'emily_designer',   email: 'emily@company.com',   avatarInitials: 'EC', role: 'designer', joinedAt: '2024-01-15T00:00:00Z' },
  { designerId: '4',  displayName: 'Michael Brown', username: 'designer',         email: 'michael@company.com', avatarInitials: 'MB', role: 'designer',            joinedAt: '2024-03-01T00:00:00Z' },
  { designerId: '9',  displayName: 'Sophia Ahmed',  username: 'sophia_designer',  email: 'sophia@company.com',  avatarInitials: 'SA', role: 'designer',            joinedAt: '2024-06-10T00:00:00Z' },
  { designerId: '10', displayName: 'Daniel Reed',   username: 'daniel_designer',  email: 'daniel@company.com',  avatarInitials: 'DR', role: 'designer',            joinedAt: '2025-01-20T00:00:00Z' },
];

const designerRatings = [
  { id:'r-ec-001',designerId:'3',taskId:'dtask-2',taskTitle:'Prepare material palette board',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:5,overallRating:4.7,renderingQuality:4.8,timeliness:4.5,creativity:4.9,clientUnderstanding:4.7,revisionEfficiency:4.6,revisionCount:1,status:'approved',completedAt:'2026-05-10T14:00:00Z',feedback:'Excellent material choices, very cohesive palette.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-ec-002',designerId:'3',taskId:'dtask-4',taskTitle:'Update bedroom palette options',projectId:'proj-5',projectName:'Hotel Lobby Redesign',storyPoints:3,overallRating:3.2,renderingQuality:3.0,timeliness:3.5,creativity:3.2,clientUnderstanding:3.0,revisionEfficiency:3.2,revisionCount:3,status:'rejected',completedAt:'2026-05-08T11:30:00Z',feedback:'Palette options were incomplete. Needs stronger material references.',ratedBy:'8',week:19,month:5,quarter:2,year:2026},
  { id:'r-ec-003',designerId:'3',taskId:'dtask-6',taskTitle:'Finalize kitchen cabinetry sketch',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:5,overallRating:4.9,renderingQuality:5.0,timeliness:4.8,creativity:4.9,clientUnderstanding:5.0,revisionEfficiency:4.9,revisionCount:0,status:'approved',completedAt:'2026-05-13T13:20:00Z',feedback:'All dimensions and work notes were complete. Outstanding.',ratedBy:'2',week:20,month:5,quarter:2,year:2026},
  { id:'r-ec-004',designerId:'3',taskId:'dtask-8',taskTitle:'Compile finish sample references',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:3,overallRating:4.5,renderingQuality:4.4,timeliness:4.6,creativity:4.5,clientUnderstanding:4.5,revisionEfficiency:4.4,revisionCount:1,status:'approved',completedAt:'2026-04-26T16:00:00Z',feedback:'Well organized reference sheet, easy for client review.',ratedBy:'2',week:17,month:4,quarter:2,year:2026},
  { id:'r-ec-005',designerId:'3',taskId:'prev-ec-1',taskTitle:'Office Lighting Concept',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:8,overallRating:4.3,renderingQuality:4.4,timeliness:4.0,creativity:4.5,clientUnderstanding:4.2,revisionEfficiency:4.2,revisionCount:2,status:'approved',completedAt:'2026-03-12T10:00:00Z',feedback:'Good concept, minor revisions on fixture spacing.',ratedBy:'2',week:11,month:3,quarter:1,year:2026},
  { id:'r-ec-006',designerId:'3',taskId:'prev-ec-2',taskTitle:'Reception Area Moodboard',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:5,overallRating:4.6,renderingQuality:4.7,timeliness:4.5,creativity:4.8,clientUnderstanding:4.5,revisionEfficiency:4.4,revisionCount:1,status:'approved',completedAt:'2026-02-20T15:00:00Z',feedback:'Very strong moodboard, client loved the direction.',ratedBy:'2',week:8,month:2,quarter:1,year:2026},
  { id:'r-ec-007',designerId:'3',taskId:'prev-ec-3',taskTitle:'Furniture Layout Plan',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:5,overallRating:3.8,renderingQuality:3.9,timeliness:3.5,creativity:4.0,clientUnderstanding:3.8,revisionEfficiency:3.7,revisionCount:3,status:'approved',completedAt:'2026-01-18T12:00:00Z',feedback:'Needed extra revisions due to site constraint issues.',ratedBy:'2',week:3,month:1,quarter:1,year:2026},
  { id:'r-ec-008',designerId:'3',taskId:'prev-ec-4',taskTitle:'Annual Design Report',projectId:'proj-5',projectName:'Hotel Lobby Redesign',storyPoints:13,overallRating:4.4,renderingQuality:4.5,timeliness:4.2,creativity:4.6,clientUnderstanding:4.3,revisionEfficiency:4.4,revisionCount:2,status:'approved',completedAt:'2025-12-15T11:00:00Z',feedback:'Comprehensive and well-structured annual report.',ratedBy:'2',week:51,month:12,quarter:4,year:2025},
  { id:'r-ec-009',designerId:'3',taskId:'prev-ec-5',taskTitle:'Brand Identity Package',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:4.8,renderingQuality:5.0,timeliness:4.6,creativity:4.9,clientUnderstanding:4.8,revisionEfficiency:4.7,revisionCount:1,status:'approved',completedAt:'2025-09-10T14:00:00Z',feedback:'Exceptional brand package, very creative direction.',ratedBy:'2',week:37,month:9,quarter:3,year:2025},
  { id:'r-ec-010',designerId:'3',taskId:'prev-ec-6',taskTitle:'Landscape Concept Boards',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:4.1,renderingQuality:4.0,timeliness:4.3,creativity:4.2,clientUnderstanding:4.0,revisionEfficiency:4.0,revisionCount:2,status:'approved',completedAt:'2025-06-22T10:00:00Z',feedback:'Solid concept, needed one extra revision for plant specs.',ratedBy:'2',week:25,month:6,quarter:2,year:2025},
  { id:'r-mb-001',designerId:'4',taskId:'dtask-1',taskTitle:'Draft living room elevation',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:8,overallRating:4.8,renderingQuality:5.0,timeliness:4.5,creativity:4.9,clientUnderstanding:4.8,revisionEfficiency:4.8,revisionCount:1,status:'approved',completedAt:'2026-05-05T14:00:00Z',feedback:'Outstanding elevation drawing, client loved the detail.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-mb-002',designerId:'4',taskId:'dtask-3',taskTitle:'Review ceiling detail drawings',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:8,overallRating:4.1,renderingQuality:4.0,timeliness:4.3,creativity:4.0,clientUnderstanding:4.2,revisionEfficiency:4.0,revisionCount:2,status:'approved',completedAt:'2026-05-10T15:00:00Z',feedback:'Good work, confirmed measurements matched site.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-mb-003',designerId:'4',taskId:'dtask-7',taskTitle:'Prepare hallway lighting notes',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:2,overallRating:2.8,renderingQuality:2.5,timeliness:3.0,creativity:2.8,clientUnderstanding:2.9,revisionEfficiency:2.8,revisionCount:4,status:'rejected',completedAt:'2026-05-13T18:10:00Z',feedback:'Missed fixture spacing calculations. Needs redo.',ratedBy:'2',week:20,month:5,quarter:2,year:2026},
  { id:'r-mb-004',designerId:'4',taskId:'dtask-5',taskTitle:'Measure reception desk area',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:3.9,renderingQuality:3.8,timeliness:4.0,creativity:3.9,clientUnderstanding:4.0,revisionEfficiency:3.8,revisionCount:2,status:'in_review',completedAt:'2026-04-25T10:00:00Z',feedback:'Measurements are complete, under review for accuracy.',ratedBy:'2',week:17,month:4,quarter:2,year:2026},
  { id:'r-mb-005',designerId:'4',taskId:'prev-mb-1',taskTitle:'Villa Interior Rendering',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:13,overallRating:4.8,renderingQuality:5.0,timeliness:4.7,creativity:4.8,clientUnderstanding:4.8,revisionEfficiency:4.7,revisionCount:1,status:'approved',completedAt:'2026-03-05T10:00:00Z',feedback:'Photorealistic quality, client was very impressed.',ratedBy:'2',week:10,month:3,quarter:1,year:2026},
  { id:'r-mb-006',designerId:'4',taskId:'prev-mb-2',taskTitle:'Office Design Concept',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:21,overallRating:4.1,renderingQuality:4.2,timeliness:4.0,creativity:4.3,clientUnderstanding:4.0,revisionEfficiency:4.0,revisionCount:2,status:'approved',completedAt:'2026-02-10T14:00:00Z',feedback:'Solid design, a couple of revisions required.',ratedBy:'2',week:6,month:2,quarter:1,year:2026},
  { id:'r-mb-007',designerId:'4',taskId:'prev-mb-3',taskTitle:'Interior Render - Lobby',projectId:'proj-5',projectName:'Hotel Lobby Redesign',storyPoints:8,overallRating:3.9,renderingQuality:4.1,timeliness:3.6,creativity:4.0,clientUnderstanding:3.8,revisionEfficiency:3.9,revisionCount:3,status:'approved',completedAt:'2026-01-13T10:00:00Z',feedback:'Good render but timeliness was an issue.',ratedBy:'2',week:2,month:1,quarter:1,year:2026},
  { id:'r-mb-008',designerId:'4',taskId:'prev-mb-4',taskTitle:'Showroom 3D Model',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:13,overallRating:4.6,renderingQuality:4.8,timeliness:4.4,creativity:4.7,clientUnderstanding:4.5,revisionEfficiency:4.5,revisionCount:1,status:'approved',completedAt:'2025-11-20T12:00:00Z',feedback:'Excellent 3D work, very accurate to brief.',ratedBy:'2',week:47,month:11,quarter:4,year:2025},
  { id:'r-mb-009',designerId:'4',taskId:'prev-mb-5',taskTitle:'Outdoor Terrace Layout',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:5,overallRating:3.7,renderingQuality:3.6,timeliness:3.8,creativity:3.8,clientUnderstanding:3.7,revisionEfficiency:3.5,revisionCount:3,status:'approved',completedAt:'2025-08-14T10:00:00Z',feedback:'Layout needed extra revisions for furniture clearance.',ratedBy:'2',week:33,month:8,quarter:3,year:2025},
  { id:'r-mb-010',designerId:'4',taskId:'prev-mb-6',taskTitle:'Concept Board - Minimalist',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:5,overallRating:4.4,renderingQuality:4.5,timeliness:4.3,creativity:4.6,clientUnderstanding:4.3,revisionEfficiency:4.3,revisionCount:1,status:'approved',completedAt:'2025-05-08T15:00:00Z',feedback:'Clean concept, well received by client.',ratedBy:'2',week:19,month:5,quarter:2,year:2025},
  { id:'r-sa-001',designerId:'9',taskId:'sa-task-1',taskTitle:'Lounge Concept Layout',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:4.6,renderingQuality:4.7,timeliness:4.5,creativity:4.8,clientUnderstanding:4.5,revisionEfficiency:4.5,revisionCount:1,status:'approved',completedAt:'2026-05-07T10:00:00Z',feedback:'Clean modern style, circulation was well considered.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-sa-002',designerId:'9',taskId:'sa-task-2',taskTitle:'Bathroom Tile Scheme',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:3,overallRating:4.2,renderingQuality:4.1,timeliness:4.4,creativity:4.2,clientUnderstanding:4.2,revisionEfficiency:4.1,revisionCount:2,status:'approved',completedAt:'2026-05-12T14:00:00Z',feedback:'Good tile selection, minor color adjustment requested.',ratedBy:'2',week:20,month:5,quarter:2,year:2026},
  { id:'r-sa-003',designerId:'9',taskId:'sa-task-3',taskTitle:'Staircase Detail Drawing',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:5,overallRating:3.5,renderingQuality:3.4,timeliness:3.6,creativity:3.5,clientUnderstanding:3.5,revisionEfficiency:3.4,revisionCount:3,status:'in_review',completedAt:'2026-04-28T16:00:00Z',feedback:'Under review; handrail detailing needs clarification.',ratedBy:'2',week:17,month:4,quarter:2,year:2026},
  { id:'r-sa-004',designerId:'9',taskId:'sa-task-4',taskTitle:'Entry Canopy Sketch',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:5,overallRating:4.8,renderingQuality:4.9,timeliness:4.7,creativity:5.0,clientUnderstanding:4.7,revisionEfficiency:4.8,revisionCount:0,status:'approved',completedAt:'2026-03-18T10:00:00Z',feedback:'Perfect entry canopy design, zero revisions needed!',ratedBy:'2',week:11,month:3,quarter:1,year:2026},
  { id:'r-sa-005',designerId:'9',taskId:'sa-task-5',taskTitle:'Facade Material Board',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:8,overallRating:4.3,renderingQuality:4.4,timeliness:4.1,creativity:4.5,clientUnderstanding:4.2,revisionEfficiency:4.2,revisionCount:2,status:'approved',completedAt:'2026-02-14T12:00:00Z',feedback:'Solid facade selection, needed minor supplier updates.',ratedBy:'2',week:7,month:2,quarter:1,year:2026},
  { id:'r-sa-006',designerId:'9',taskId:'sa-task-6',taskTitle:'Lighting Fixture Schedule',projectId:'proj-5',projectName:'Hotel Lobby Redesign',storyPoints:5,overallRating:2.9,renderingQuality:2.8,timeliness:3.1,creativity:3.0,clientUnderstanding:2.8,revisionEfficiency:2.8,revisionCount:4,status:'rejected',completedAt:'2025-12-10T16:00:00Z',feedback:'Fixture schedule was incomplete, missing lumen data.',ratedBy:'2',week:50,month:12,quarter:4,year:2025},
  { id:'r-sa-007',designerId:'9',taskId:'sa-task-7',taskTitle:'Roof Garden Concept',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:4.7,renderingQuality:4.8,timeliness:4.6,creativity:4.9,clientUnderstanding:4.6,revisionEfficiency:4.6,revisionCount:1,status:'approved',completedAt:'2025-09-22T10:00:00Z',feedback:'Stunning roof garden concept, highly creative.',ratedBy:'2',week:38,month:9,quarter:3,year:2025},
  { id:'r-dr-001',designerId:'10',taskId:'dr-task-1',taskTitle:'Master Plan Diagram',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:13,overallRating:3.8,renderingQuality:3.9,timeliness:3.6,creativity:4.0,clientUnderstanding:3.8,revisionEfficiency:3.7,revisionCount:3,status:'approved',completedAt:'2026-05-06T10:00:00Z',feedback:'Diagram is clear but needed layout adjustments.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-dr-002',designerId:'10',taskId:'dr-task-2',taskTitle:'Interior Partition Plan',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:8,overallRating:4.3,renderingQuality:4.4,timeliness:4.1,creativity:4.4,clientUnderstanding:4.3,revisionEfficiency:4.2,revisionCount:2,status:'approved',completedAt:'2026-05-11T12:00:00Z',feedback:'Clear partition plan, measurements were accurate.',ratedBy:'2',week:19,month:5,quarter:2,year:2026},
  { id:'r-dr-003',designerId:'10',taskId:'dr-task-3',taskTitle:'Window Detail Section',projectId:'proj-1',projectName:'City Plaza Renovation',storyPoints:5,overallRating:2.5,renderingQuality:2.4,timeliness:2.6,creativity:2.5,clientUnderstanding:2.5,revisionEfficiency:2.4,revisionCount:5,status:'rejected',completedAt:'2026-04-30T16:00:00Z',feedback:'Window section had multiple dimensional errors.',ratedBy:'2',week:18,month:4,quarter:2,year:2026},
  { id:'r-dr-004',designerId:'10',taskId:'dr-task-4',taskTitle:'Signage Layout Plan',projectId:'proj-3',projectName:'Commercial Tower Interior',storyPoints:3,overallRating:4.5,renderingQuality:4.5,timeliness:4.4,creativity:4.6,clientUnderstanding:4.5,revisionEfficiency:4.4,revisionCount:1,status:'approved',completedAt:'2026-03-25T10:00:00Z',feedback:'Well-positioned signage, good wayfinding logic.',ratedBy:'2',week:12,month:3,quarter:1,year:2026},
  { id:'r-dr-005',designerId:'10',taskId:'dr-task-5',taskTitle:'Color Scheme Review',projectId:'proj-5',projectName:'Hotel Lobby Redesign',storyPoints:5,overallRating:3.6,renderingQuality:3.5,timeliness:3.8,creativity:3.7,clientUnderstanding:3.5,revisionEfficiency:3.5,revisionCount:3,status:'approved',completedAt:'2026-02-18T14:00:00Z',feedback:'Color review completed with some hesitations on accent choices.',ratedBy:'2',week:7,month:2,quarter:1,year:2026},
  { id:'r-dr-006',designerId:'10',taskId:'dr-task-6',taskTitle:'Entrance Gate Drawing',projectId:'proj-4',projectName:'Park & Recreation Center',storyPoints:8,overallRating:4.7,renderingQuality:4.8,timeliness:4.6,creativity:4.8,clientUnderstanding:4.6,revisionEfficiency:4.7,revisionCount:1,status:'approved',completedAt:'2025-11-05T10:00:00Z',feedback:'Beautiful gate drawing, exceeded expectations.',ratedBy:'2',week:45,month:11,quarter:4,year:2025},
  { id:'r-dr-007',designerId:'10',taskId:'dr-task-7',taskTitle:'Furniture Arrangement Plan',projectId:'proj-2',projectName:'Residential Complex - Phase 2',storyPoints:5,overallRating:3.4,renderingQuality:3.3,timeliness:3.5,creativity:3.4,clientUnderstanding:3.4,revisionEfficiency:3.3,revisionCount:4,status:'approved',completedAt:'2025-07-20T12:00:00Z',feedback:'Plan was usable but circulation paths needed work.',ratedBy:'2',week:29,month:7,quarter:3,year:2025},
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const round1 = (n) => Math.round(n * 10) / 10;



const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const CHART_COLORS = ['#6366f1','#10b981','#f59e0b','#ec4899'];

function StarRating({ value, size = 'sm' }) {
  const s = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  return (
    <span className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${s} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function Delta({ prev, curr }) {
  if (prev == null) return null;
  const diff = curr - prev;
  const pct = prev !== 0 ? Math.abs(diff / prev * 100).toFixed(1) : '—';
  if (Math.abs(diff) < 0.01) return <span className="text-xs text-gray-400 ml-1">—</span>;
  return diff > 0
    ? <span className="flex items-center gap-0.5 text-xs text-emerald-600 font-medium ml-1"><TrendingUp className="w-3 h-3" />+{pct}%</span>
    : <span className="flex items-center gap-0.5 text-xs text-red-500 font-medium ml-1"><TrendingDown className="w-3 h-3" />-{pct}%</span>;
}

// ─── Period filtering ─────────────────────────────────────────────────────────
function filterByPeriod(ratings, mode, offset) {
  const NOW_YEAR = 2026, NOW_MONTH = 5, NOW_WEEK = 20, NOW_QUARTER = 2;
  if (mode === 'monthly') {
    let m = NOW_MONTH - offset; let y = NOW_YEAR;
    while (m < 1) { m += 12; y--; }
    while (m > 12) { m -= 12; y++; }
    return ratings.filter(r => r.month === m && r.year === y);
  }
  if (mode === 'weekly') {
    let w = NOW_WEEK - offset; let y = NOW_YEAR;
    while (w < 1) { w += 52; y--; }
    return ratings.filter(r => r.week === w && r.year === y);
  }
  if (mode === 'quarterly') {
    let q = NOW_QUARTER - offset; let y = NOW_YEAR;
    while (q < 1) { q += 4; y--; }
    return ratings.filter(r => r.quarter === q && r.year === y);
  }
  if (mode === 'yearly') {
    return ratings.filter(r => r.year === NOW_YEAR - offset);
  }
  return ratings;
}

function periodLabel(mode, offset) {
  const NOW_YEAR = 2026, NOW_MONTH = 5, NOW_WEEK = 20, NOW_QUARTER = 2;
  if (mode === 'monthly') {
    let m = NOW_MONTH - offset; let y = NOW_YEAR;
    while (m < 1) { m += 12; y--; }
    return `${MONTH_NAMES[m-1]} ${y}`;
  }
  if (mode === 'weekly') {
    let w = NOW_WEEK - offset; let y = NOW_YEAR;
    while (w < 1) { w += 52; y--; }
    return `Week ${w} — ${y}`;
  }
  if (mode === 'quarterly') {
    let q = NOW_QUARTER - offset; let y = NOW_YEAR;
    while (q < 1) { q += 4; y--; }
    return `Q${q} ${y}`;
  }
  return `${NOW_YEAR - offset}`;
}

// ─── KPI computation ──────────────────────────────────────────────────────────
function computeKPIs(ratings) {
  const total = ratings.length;
  const completed = ratings.filter(r => r.status === 'approved').length;
  const rejected = ratings.filter(r => r.status === 'rejected').length;
  const inReview = ratings.filter(r => r.status === 'in_review').length;
  const paused = ratings.filter(r => r.status === 'paused').length;
  const sp = ratings.reduce((s, r) => s + r.storyPoints, 0);
  const completedSP = ratings.filter(r=>r.status==='approved').reduce((s,r)=>s+r.storyPoints,0);
  const ratedRatings = ratings.filter(r => r.overallRating > 0);
  const overallRating = round1(avg(ratedRatings.map(r => r.overallRating)));
  const revCount = round1(avg(ratings.map(r => r.revisionCount)));
  const onTime = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, rejected, inReview, paused, sp, completedSP, overallRating, revCount, onTime };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function DesignerPerformanceDashboard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const isCEO = user.role === 'ceo';
  const isDesigner = user.role === 'designer';
  const viewerDesignerId = user.id;

  const [profiles, setProfiles] = useState(designerProfiles);

  // Which designers to show in selector
  const availableDesigners = isDesigner
    ? profiles.filter(d => d.designerId === viewerDesignerId)
    : profiles;

  const [selectedDesignerId, setSelectedDesignerId] = useState(
    isDesigner ? viewerDesignerId : profiles[0]?.designerId ?? ''
  );
  const [mode, setMode] = useState('monthly');
  const [offset, setOffset] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskSort, setTaskSort] = useState({ key: 'completedAt', dir: 'desc' });
  const [taskPage, setTaskPage] = useState(0);
  const TASK_PER_PAGE = 5;

  useEffect(() => {
    if (!availableDesigners.some(d => d.designerId === selectedDesignerId)) {
      setSelectedDesignerId(availableDesigners[0]?.designerId ?? '');
    }
  }, [availableDesigners, selectedDesignerId]);

  if (availableDesigners.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-sm text-gray-600">
        No performance profile is linked to this account yet.
      </div>
    );
  }

  const designer = profiles.find(d => d.designerId === selectedDesignerId);
  const allRatings = designerRatings.filter(r => r.designerId === selectedDesignerId);
  const currentRatings = filterByPeriod(allRatings, mode, offset);
  const prevRatings = filterByPeriod(allRatings, mode, offset + 1);

  const kpi = useMemo(() => computeKPIs(currentRatings), [currentRatings]);
  const prevKPI = useMemo(() => computeKPIs(prevRatings), [prevRatings]);

  // Trend data for charts (last 6 periods)
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const r = filterByPeriod(allRatings, mode, 5 - i + offset);
      const label = periodLabel(mode, 5 - i + offset);
      const shortLabel = mode === 'monthly' ? label.split(' ')[0]
        : mode === 'quarterly' ? label.split(' ')[0]
        : mode === 'yearly' ? label
        : `W${label.split(' ')[1]}`;
      return {
        label: shortLabel,
        rating: round1(avg(r.map(x => x.overallRating))) || null,
        sp: r.reduce((s, x) => s + x.storyPoints, 0),
        compliance: r.length ? Math.round(r.filter(x=>x.status==='approved').length/r.length*100) : null,
      };
    });
  }, [allRatings, mode, offset]);

  // Radar data
  const radarData = useMemo(() => {
    if (!currentRatings.length) return [];
    return [
      { subject: 'Rendering', A: round1(avg(currentRatings.map(r=>r.renderingQuality))), fullMark: 5 },
      { subject: 'Timeliness', A: round1(avg(currentRatings.map(r=>r.timeliness))), fullMark: 5 },
      { subject: 'Creativity', A: round1(avg(currentRatings.map(r=>r.creativity))), fullMark: 5 },
      { subject: 'Client Und.', A: round1(avg(currentRatings.map(r=>r.clientUnderstanding))), fullMark: 5 },
      { subject: 'Rev. Eff.', A: round1(avg(currentRatings.map(r=>r.revisionEfficiency))), fullMark: 5 },
    ];
  }, [currentRatings]);

  // Story point pie
  const pieSP = useMemo(() => {
    const total = currentRatings.reduce((s,r)=>s+r.storyPoints, 0);
    const completed = currentRatings.filter(r=>r.status==='approved').reduce((s,r)=>s+r.storyPoints,0);
    const rejected = currentRatings.filter(r=>r.status==='rejected').reduce((s,r)=>s+r.storyPoints,0);
    const pending = currentRatings.filter(r=>r.status==='in_review'||r.status==='paused').reduce((s,r)=>s+r.storyPoints,0);
    return [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#6366f1' },
      { name: 'Rejected', value: rejected, color: '#ef4444' },
    ].filter(d=>d.value>0);
  }, [currentRatings]);

  // Comparison table
  const comparisonMetrics = useMemo(() => [
    { label: 'Overall Rating', curr: round1(avg(currentRatings.map(r=>r.overallRating))), prev: round1(avg(prevRatings.map(r=>r.overallRating))) },
    { label: 'Creativity',     curr: round1(avg(currentRatings.map(r=>r.creativity))),    prev: round1(avg(prevRatings.map(r=>r.creativity))) },
    { label: 'Timeliness',     curr: round1(avg(currentRatings.map(r=>r.timeliness))),    prev: round1(avg(prevRatings.map(r=>r.timeliness))) },
    { label: 'Client Understanding', curr: round1(avg(currentRatings.map(r=>r.clientUnderstanding))), prev: round1(avg(prevRatings.map(r=>r.clientUnderstanding))) },
    { label: 'Rendering Quality',  curr: round1(avg(currentRatings.map(r=>r.revisionEfficiency))),  prev: round1(avg(prevRatings.map(r=>r.revisionEfficiency))) },
  ], [currentRatings, prevRatings]);

  // Task history table
  const filteredTasks = useMemo(() => {
    let t = currentRatings;
    if (taskSearch) t = t.filter(r => r.taskTitle.toLowerCase().includes(taskSearch.toLowerCase()) || r.projectName.toLowerCase().includes(taskSearch.toLowerCase()));
    t = [...t].sort((a, b) => {
      const aVal = a[taskSort.key]; const bVal = b[taskSort.key];
      if (typeof aVal === 'number') return taskSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      return taskSort.dir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
    return t;
  }, [currentRatings, taskSearch, taskSort]);

  const taskPages = Math.ceil(filteredTasks.length / TASK_PER_PAGE);
  const pagedTasks = filteredTasks.slice(taskPage * TASK_PER_PAGE, (taskPage + 1) * TASK_PER_PAGE);

  const handleSort = (key) => {
    setTaskSort(prev => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
    setTaskPage(0);
  };

  const saveName = () => {
    setProfiles(prev => prev.map(p => p.designerId === selectedDesignerId ? { ...p, displayName: tempName } : p));
    setEditingName(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Designer Performance
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Analytics & Story Points Dashboard</p>
        </div>

        {/* Designer Selector (CEO / GM only) */}
        {!isDesigner && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={selectedDesignerId}
                onChange={e => setSelectedDesignerId(e.target.value)}
                className="appearance-none pl-10 pr-8 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {availableDesigners.map(d => (
                  <option key={d.designerId} value={d.designerId}>{d.displayName}</option>
                ))}
              </select>
              <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 text-xs font-bold">{designer?.avatarInitials}</span>
              </div>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* ── Designer Profile Card ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow">
          <span className="text-white font-bold">{designer?.avatarInitials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {editingName ? (
              <>
                <input
                  value={tempName}
                  onChange={e => setTempName(e.target.value)}
                  className="border border-indigo-300 rounded px-2 py-0.5 text-sm font-semibold text-gray-900 focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button onClick={saveName} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingName(false)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
              </>
            ) : (
              <>
                <span className="font-semibold text-gray-900">{designer?.displayName}</span>
                {isCEO && (
                  <button onClick={() => { setTempName(designer?.displayName || ''); setEditingName(true); }} className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Edit display name">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-gray-500">@{designer?.username} · {designer?.email}</p>
        </div>
        <div className="text-right hidden sm:block">
          <div className="flex items-center gap-1 justify-end">
            <StarRating value={kpi.overallRating} size="sm" />
            <span className="text-sm font-bold text-gray-700">{kpi.overallRating || '—'}</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Current period rating</p>
        </div>
      </div>

      {/* ── Time Filter ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          {[['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly'],['yearly','Yearly']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => { setMode(val); setOffset(0); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${mode === val ? 'bg-indigo-600 text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setOffset(o => o + 1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-800 min-w-[140px] text-center">{periodLabel(mode, offset)}</span>
          <button onClick={() => setOffset(o => Math.max(0, o - 1))} disabled={offset === 0} className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Avg Rating',      value: kpi.overallRating || '—', prev: prevKPI.overallRating, icon: <Star className="w-4 h-4" />,         color: 'text-amber-500 bg-amber-50' },
          { label: 'Completed Tasks', value: kpi.completed,            prev: prevKPI.completed,     icon: <CheckCircle className="w-4 h-4" />,   color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Story Points',    value: kpi.sp,                   prev: prevKPI.sp,            icon: <Zap className="w-4 h-4" />,           color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Deadline %',      value: kpi.onTime + '%',         prev: prevKPI.onTime,        icon: <Target className="w-4 h-4" />,        color: 'text-sky-600 bg-sky-50' },
          { label: 'Avg Revisions',   value: kpi.revCount,             prev: prevKPI.revCount,      icon: <RefreshCw className="w-4 h-4" />,     color: 'text-purple-600 bg-purple-50' },
          { label: 'In Review',       value: kpi.inReview,             prev: prevKPI.inReview,      icon: <Activity className="w-4 h-4" />,      color: 'text-sky-600 bg-sky-50' },
          { label: 'Paused',          value: kpi.paused,               prev: prevKPI.paused,        icon: <Pause className="w-4 h-4" />,         color: 'text-amber-600 bg-amber-50' },
          { label: 'Rejected',        value: kpi.rejected,             prev: prevKPI.rejected,      icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-500 bg-red-50' },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              <span className={`p-1.5 rounded-lg ${card.color}`}>{card.icon}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{card.value}</p>
            <Delta prev={card.prev} curr={parseFloat(String(card.value))} />
          </div>
        ))}
      </div>

      {/* ── Trend Charts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Rating Trend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Rating Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 5]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v?.toFixed(1) ?? '—', 'Rating']} />
              <Area type="monotone" dataKey="rating" stroke="#6366f1" fill="url(#rGrad)" strokeWidth={2} dot={{ r: 3, fill: '#6366f1' }} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Story Points Trend */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Story Points Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v, 'Points']} />
              <Area type="monotone" dataKey="sp" stroke="#10b981" fill="url(#spGrad)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Deadline Compliance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Deadline Compliance %</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [v != null ? v + '%' : '—', 'Compliance']} />
              <Line type="monotone" dataKey="compliance" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>

        
      </div>

      {/* ── Story Point Breakdown + Comparison ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Story Point Pie */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Story Point Breakdown</p>
          {pieSP.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={pieSP} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" paddingAngle={3}>
                    {pieSP.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v + ' pts', name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {pieSP.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-gray-600">{d.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800">{d.value} pts</span>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-2 flex justify-between text-xs font-semibold text-gray-700">
                  <span>Total</span>
                  <span>{pieSP.reduce((s,d)=>s+d.value,0)} pts</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-sm text-gray-400">No data for this period</div>
          )}
        </div>

        {/* Current vs Previous Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Period Comparison</p>
          <div className="space-y-2">
            <div className="grid grid-cols-3 text-xs text-gray-400 font-medium mb-1">
              <span>Metric</span>
              <span className="text-center">Previous</span>
              <span className="text-center">Current</span>
            </div>
            {comparisonMetrics.map((m, i) => {
              const diff = m.curr - m.prev;
              const improved = diff > 0.05;
              const declined = diff < -0.05;
              return (
                <div key={i} className="grid grid-cols-3 items-center text-xs py-1.5 border-b border-gray-50">
                  <span className="text-gray-600 font-medium truncate pr-1">{m.label}</span>
                  <span className="text-center text-gray-500">{m.prev || '—'}</span>
                  <span className={`text-center font-semibold flex items-center justify-center gap-0.5 ${improved ? 'text-emerald-600' : declined ? 'text-red-500' : 'text-gray-700'}`}>
                    {m.curr || '—'}
                    {improved && <TrendingUp className="w-3 h-3" />}
                    {declined && <TrendingDown className="w-3 h-3" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Task History Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Task History</p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={taskSearch}
              onChange={e => { setTaskSearch(e.target.value); setTaskPage(0); }}
              placeholder="Search tasks or projects…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {[
                  { key: 'taskTitle', label: 'Task' },
                  { key: 'storyPoints', label: 'SP' },
                  { key: 'overallRating', label: 'Rating' },
                  { key: 'completedAt', label: 'Date' },
                ].map(col => (
                  <th key={col.key} className="pb-2 text-left text-xs text-gray-400 font-medium pr-3 whitespace-nowrap">
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-gray-600">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedTasks.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400 text-sm">No tasks for this period</td></tr>
              ) : pagedTasks.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium text-gray-800 truncate max-w-[150px]">{r.taskTitle}</p>
                      <p className="text-xs text-gray-400 truncate max-w-[150px]">{r.projectName}</p>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">{r.storyPoints}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        <StarRating value={r.overallRating} size="sm" />
                        <span className="text-xs font-semibold text-gray-700">{r.overallRating.toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {taskPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">{filteredTasks.length} tasks · page {taskPage + 1} of {taskPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setTaskPage(p => Math.max(0, p - 1))} disabled={taskPage === 0} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button onClick={() => setTaskPage(p => Math.min(taskPages - 1, p + 1))} disabled={taskPage >= taskPages - 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>



    </div>
  );
}

export default DesignerPerformanceDashboard;
