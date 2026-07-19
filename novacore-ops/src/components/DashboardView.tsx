import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend,
  LabelList
} from 'recharts';
import { 
  FolderOpen, 
  PlayCircle, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Hourglass, 
  Users, 
  TrendingUp,
  SlidersHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpRight,
  AlertCircle,
  Briefcase,
  User,
  UserCheck,
  Award,
  Filter,
  Zap,
  Target,
  CheckSquare
} from 'lucide-react';
import { Demand, UserProfile, Professional } from '../types';
import { formatTimeElapsed, getStatusBadgeStyles } from '../utils';

const priorities = ['Baixa', 'Média', 'Alta', 'Crítica'];
const priorityColorsMap = {
  'Baixa': '#94a3b8',
  'Média': '#3b82f6',
  'Alta': '#f97316',
  'Crítica': '#ef4444'
};

interface DashboardViewProps {
  demands: Demand[];
  users: UserProfile[];
  professionals?: Professional[];
  onSelectDemand?: (demand: Demand) => void;
}

export default function DashboardView({ demands, users, professionals = [], onSelectDemand }: DashboardViewProps) {
  
  // Internal view tabs: 'geral' | 'calendario'
  const [activeSubTab, setActiveSubTab] = useState<'geral' | 'calendario'>('geral');

  // Search filter for professionals tab
  const [profSearch, setProfSearch] = useState('');

  // Expanded professional ID for detailed demand list
  const [expandedProfId, setExpandedProfId] = useState<string | null>(null);

  // States for interactive calendar view
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Local storage date string initializer
  const [selectedDateString, setSelectedDateString] = useState<string | null>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // States for Performance (Desempenho) Tab filters
  const [perfProfId, setPerfProfId] = useState<string>('all');
  const [perfStartDate, setPerfStartDate] = useState<string>('');
  const [perfEndDate, setPerfEndDate] = useState<string>('');
  const [perfCategory, setPerfCategory] = useState<string>('all');

  // -----------------------------
  // DYNAMIC PERFORMANCE & GLOBAL FILTERS WORKING SAMPLE
  // -----------------------------
  const uniqueCategories = useMemo(() => {
    return Array.from(new Set(demands.map(d => d.category).filter(Boolean)));
  }, [demands]);

  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      // 1. Professional filter
      if (perfProfId !== 'all') {
        const isAssigned = d.assignedTo === perfProfId;
        const isInvolved = d.involvedUids?.includes(perfProfId);
        if (!isAssigned && !isInvolved) return false;
      }

      // 2. Category filter
      if (perfCategory !== 'all' && d.category !== perfCategory) {
        return false;
      }

      // 3. Date range filter
      if (d.openedAt) {
        const openDate = new Date(d.openedAt);
        if (perfStartDate) {
          const start = new Date(perfStartDate + 'T00:00:00');
          if (openDate < start) return false;
        }
        if (perfEndDate) {
          const end = new Date(perfEndDate + 'T23:59:59');
          if (openDate > end) return false;
        }
      }
      return true;
    });
  }, [demands, perfProfId, perfCategory, perfStartDate, perfEndDate]);

  // Separate filter for general professional workload grid that ignores the individual professional filter
  const demandsFilteredByNonProf = useMemo(() => {
    return demands.filter(d => {
      // 1. Category filter
      if (perfCategory !== 'all' && d.category !== perfCategory) {
        return false;
      }

      // 2. Date range filter
      if (d.openedAt) {
        const openDate = new Date(d.openedAt);
        if (perfStartDate) {
          const start = new Date(perfStartDate + 'T00:00:00');
          if (openDate < start) return false;
        }
        if (perfEndDate) {
          const end = new Date(perfEndDate + 'T23:59:59');
          if (openDate > end) return false;
        }
      }
      return true;
    });
  }, [demands, perfCategory, perfStartDate, perfEndDate]);

  const performanceDemands = filteredDemands;

  const stats = useMemo(() => {
    // Delayed (Atrasadas) demands based on deadline (dueDate) or SLA standard (24h for Crítica/Alta, 48h for Média/Baixa)
    const checkIsDelayed = (d: Demand): boolean => {
      if (d.status === 'Concluída' || d.status === 'Cancelada') return false;

      // 1. If it has a specific due date (deadline / prazo limite)
      if (d.dueDate) {
        const today = new Date();
        const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (d.dueDate < localTodayStr) {
          return true;
        }
      }

      // 2. Standard SLA limit (using startedAt, lastStatusChangedAt or fallback to openedAt)
      const startTimeStr = d.startedAt || d.openedAt || (d.status === 'Em execução' ? d.lastStatusChangedAt : null);
      if (!startTimeStr) return false;
      
      const diffMs = Date.now() - new Date(startTimeStr).getTime();
      const diffHours = diffMs / (1000 * 3600);
      const slaLimit = (d.priority === 'Crítica' || d.priority === 'Alta') ? 24 : 48;
      return diffHours > slaLimit;
    };

    // Real-time KPI calculations based on filteredDemands
    const totalOpen = filteredDemands.filter(d => d.status === 'Em aberto' || (d.status as string) === 'Pendente').length;
    const totalInProgress = filteredDemands.filter(d => d.status === 'Em execução').length;
    const totalCompleted = filteredDemands.filter(d => d.status === 'Concluída').length;
    const delayedDemands = filteredDemands.filter(checkIsDelayed);
    const totalDelayed = delayedDemands.length;

    // 1. Tempo Médio em Aberto:
    const openTimeDemands = filteredDemands.filter(d => d.elapsedTimes && (d.elapsedTimes['Em aberto'] > 0 || d.status === 'Em aberto'));
    const avgOpenSec = openTimeDemands.length > 0
      ? openTimeDemands.reduce((sum, d) => sum + (d.elapsedTimes['Em aberto'] || 0), 0) / openTimeDemands.length
      : 0;

    // 2. Tempo Médio em Execução:
    const executionTimeDemands = filteredDemands.filter(d => d.elapsedTimes && (d.elapsedTimes['Em execução'] > 0 || d.status === 'Em execução' || d.status === 'Concluída'));
    const avgExecutionSec = executionTimeDemands.length > 0
      ? executionTimeDemands.reduce((sum, d) => sum + (d.elapsedTimes['Em execução'] || 0), 0) / executionTimeDemands.length
      : 0;

    // 3. Tempo Médio de Conclusão (Resolução do ticket - do início da execução até ser concluído):
    const completedDemands = filteredDemands.filter(d => d.status === 'Concluída');
    const avgCompletionSec = completedDemands.length > 0
      ? completedDemands.reduce((sum, d) => {
          const startTimeStr = d.startedAt || d.openedAt;
          const endTimeStr = d.completedAt || d.lastStatusChangedAt || d.updatedAt;
          const totalMs = new Date(endTimeStr).getTime() - new Date(startTimeStr).getTime();
          const totalSec = Math.max(0, Math.floor(totalMs / 1000));
          return sum + totalSec;
        }, 0) / completedDemands.length
      : 0;

    // 4. Tempo Médio de Execução até o Final (do início da execução até ser concluído):
    const execToCompletionDemands = filteredDemands.filter(d => d.status === 'Concluída' && d.startedAt && d.completedAt);
    const avgExecToCompletionSec = execToCompletionDemands.length > 0
      ? execToCompletionDemands.reduce((sum, d) => sum + Math.max(0, Math.floor((new Date(d.completedAt!).getTime() - new Date(d.startedAt!).getTime()) / 1000)), 0) / execToCompletionDemands.length
      : 0;

    // 1. Chart: Demands by priority (por prioridade)
    const priorityData = priorities.map(pri => ({
      name: pri,
      value: filteredDemands.filter(d => d.priority === pri).length,
      color: priorityColorsMap[pri as keyof typeof priorityColorsMap]
    })).filter(item => item.value > 0);

    // 2. Chart: Average Times (New)
    const timeChartData = [
      { name: 'Aberto (Fila)', value: parseFloat((avgOpenSec / 3600).toFixed(1)) },
      { name: 'Execução (Ativo)', value: parseFloat((avgExecutionSec / 3600).toFixed(1)) },
      { name: 'Abertura → Final', value: parseFloat((avgCompletionSec / 3600).toFixed(1)) },
      { name: 'Execução → Final', value: parseFloat((avgExecToCompletionSec / 3600).toFixed(1)) },
    ];

    // 3. Chart: Demands by collaborator (por colaborador)
    const collaboratorCounts: Record<string, number> = {};
    filteredDemands.forEach(d => {
      const colName = d.assignedToName || 'Não Atribuído';
      collaboratorCounts[colName] = (collaboratorCounts[colName] || 0) + 1;
    });
    const collaboratorData = Object.entries(collaboratorCounts).map(([colName, count]) => ({
      name: colName,
      quantidade: count
    })).sort((a, b) => b.quantidade - a.quantidade);

    // 4. Status distribution list
    const statusCounts = {
      'Em aberto': filteredDemands.filter(d => d.status === 'Em aberto' || (d.status as string) === 'Pendente').length,
      'Em execução': filteredDemands.filter(d => d.status === 'Em execução').length,
      'Concluída': filteredDemands.filter(d => d.status === 'Concluída').length,
      'Cancelada': filteredDemands.filter(d => d.status === 'Cancelada').length,
    };

    // Logic to calculate demands per registered Professional (uses demandsFilteredByNonProf)
    const professionalWorkload = professionals.map(prof => {
      const profDemands = demandsFilteredByNonProf.filter(d => d.assignedTo === prof.id || d.involvedUids?.includes(prof.id));
      const open = profDemands.filter(d => d.status === 'Em aberto' || (d.status as string) === 'Pendente').length;
      const inProgress = profDemands.filter(d => d.status === 'Em execução').length;
      const completed = profDemands.filter(d => d.status === 'Concluída').length;
      const canceled = profDemands.filter(d => d.status === 'Cancelada').length;
      const active = open + inProgress;
      const delayed = profDemands.filter(checkIsDelayed).length;

      return {
        professional: prof,
        total: profDemands.length,
        active,
        delayed,
        stats: { open, inProgress, completed, canceled },
        demandsList: profDemands
      };
    }).sort((a, b) => b.active - a.active || b.total - a.total);

    return {
      totalOpen,
      totalInProgress,
      totalCompleted,
      totalDelayed,
      delayedDemands,
      avgOpenSec,
      avgExecutionSec,
      avgCompletionSec,
      avgExecToCompletionSec,
      priorityData,
      timeChartData,
      collaboratorData,
      statusCounts,
      professionalWorkload,
      isDelayed: checkIsDelayed
    };
  }, [filteredDemands, demandsFilteredByNonProf, professionals]);

  const {
    totalOpen,
    totalInProgress,
    totalCompleted,
    totalDelayed,
    delayedDemands,
    avgOpenSec,
    avgExecutionSec,
    avgCompletionSec,
    avgExecToCompletionSec,
    priorityData,
    timeChartData,
    collaboratorData,
    statusCounts,
    professionalWorkload,
    isDelayed
  } = stats;

  const filteredProfWorkload = professionalWorkload;

  // Calendar logic helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDateString(`${y}-${m}-${d}`);
  };

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday, 6 is Saturday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: { date: Date | null; dayNumber: number | null; dateString: string | null }[] = [];

  // Previous month overhang days
  for (let i = 0; i < startDayOfWeek; i++) {
    calendarDays.push({ date: null, dayNumber: null, dateString: null });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dDate = new Date(year, month, d);
    const yStr = dDate.getFullYear();
    const mStr = String(dDate.getMonth() + 1).padStart(2, '0');
    const dStr = String(dDate.getDate()).padStart(2, '0');
    const dateString = `${yStr}-${mStr}-${dStr}`;
    calendarDays.push({ date: dDate, dayNumber: d, dateString });
  }

  // Next month overhang days
  const totalSlotsNeeded = Math.ceil(calendarDays.length / 7) * 7;
  while (calendarDays.length < totalSlotsNeeded) {
    calendarDays.push({ date: null, dayNumber: null, dateString: null });
  }

  const monthsBR = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekDaysBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // All demands for current selected date string
  const selectedDayDemands = selectedDateString 
    ? demands.filter(d => d.dueDate === selectedDateString)
    : [];

  // -----------------------------
  // DYNAMIC PERFORMANCE MATH WORKGROUND
  // -----------------------------
  // (Uses pre-filtered performanceDemands configured globally)

  // Calculate Metrics on filtered sample
  const perfTotal = performanceDemands.length;
  const perfCompleted = performanceDemands.filter(d => d.status === 'Concluída').length;
  const perfInProgress = performanceDemands.filter(d => d.status === 'Em execução').length;
  const perfOpen = performanceDemands.filter(d => d.status === 'Em aberto' || (d.status as string) === 'Pendente').length;
  const perfCanceled = performanceDemands.filter(d => d.status === 'Cancelada').length;
  const perfDelayed = performanceDemands.filter(isDelayed).length;

  const perfCompletionRate = perfTotal > 0 ? Math.round((perfCompleted / perfTotal) * 100) : 0;

  // Completed within SLA
  const perfCompletedWithinSLA = performanceDemands.filter(d => {
    if (d.status !== 'Concluída') return false;
    const startTimeStr = d.startedAt || d.openedAt;
    const durationMs = new Date(d.lastStatusChangedAt || d.updatedAt).getTime() - new Date(startTimeStr).getTime();
    const durationHours = durationMs / (1000 * 3600);
    const slaLimit = (d.priority === 'Crítica' || d.priority === 'Alta') ? 24 : 48;
    return durationHours <= slaLimit;
  }).length;

  const perfSlaComplianceRate = perfCompleted > 0 
    ? Math.round((perfCompletedWithinSLA / perfCompleted) * 100) 
    : 100;

  // Average resolution speed (in hours)
  const perfCompletedWithDurations = performanceDemands.filter(d => d.status === 'Concluída');
  const perfAvgResolutionHours = perfCompletedWithDurations.length > 0
    ? perfCompletedWithDurations.reduce((sum, d) => {
        const startTimeStr = d.startedAt || d.openedAt;
        const diff = new Date(d.lastStatusChangedAt || d.updatedAt).getTime() - new Date(startTimeStr).getTime();
        return sum + (diff / (1000 * 3600));
      }, 0) / perfCompletedWithDurations.length
    : 0;

  // Productivity data series
  const perfDateMap: Record<string, { created: number; resolved: number }> = {};
  performanceDemands.forEach(d => {
    if (d.openedAt) {
      const createdStr = d.openedAt.substring(0, 10);
      if (!perfDateMap[createdStr]) perfDateMap[createdStr] = { created: 0, resolved: 0 };
      perfDateMap[createdStr].created += 1;
    }
    if (d.status === 'Concluída' && (d.lastStatusChangedAt || d.updatedAt)) {
      const resolvedStr = (d.lastStatusChangedAt || d.updatedAt).substring(0, 10);
      if (!perfDateMap[resolvedStr]) perfDateMap[resolvedStr] = { created: 0, resolved: 0 };
      perfDateMap[resolvedStr].resolved += 1;
    }
  });

  const perfTrendChartData = Object.entries(perfDateMap)
    .map(([date, val]) => {
      const parts = date.split('-');
      const formattedDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
      return {
        date,
        formattedDate,
        criadas: val.created,
        concluidas: val.resolved
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  // Leaderboard of professionals calculated inside filter context
  const filteredLeaderboard = professionals.map(prof => {
    const profDem = performanceDemands.filter(d => d.assignedTo === prof.id || d.involvedUids?.includes(prof.id));
    const total = profDem.length;
    const completed = profDem.filter(d => d.status === 'Concluída').length;
    const active = profDem.filter(d => d.status === 'Em aberto' || d.status === 'Em execução').length;
    
    // completed within SLA
    const completedWithinSLA = profDem.filter(d => {
      if (d.status !== 'Concluída') return false;
      const startTimeStr = d.startedAt || d.openedAt;
      const durationMs = new Date(d.lastStatusChangedAt || d.updatedAt).getTime() - new Date(startTimeStr).getTime();
      const durationHours = durationMs / (1000 * 3600);
      const slaLimit = (d.priority === 'Crítica' || d.priority === 'Alta') ? 24 : 48;
      return durationHours <= slaLimit;
    }).length;

    const compliance = completed > 0 ? Math.round((completedWithinSLA / completed) * 100) : 100;

    return {
      professional: prof,
      total,
      completed,
      active,
      compliance
    };
  }).sort((a, b) => b.completed - a.completed || b.compliance - a.compliance);

  // Helper count of all demands scheduled on any day of this month
  const getDemandsWithDueDateThisMonth = () => {
    return demands.filter(d => {
      if (!d.dueDate) return false;
      const [dy, dm] = d.dueDate.split('-');
      return parseInt(dy) === year && (parseInt(dm) - 1) === month;
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#004d4d] flex items-center gap-2 font-sans tracking-tight">
            <TrendingUp className="w-6 h-6 text-[#3abeb9]" /> Dashboard Gerencial
          </h2>
          <p className="text-xs text-slate-500 font-medium">Controle de indicadores, carga de trabalho por profissional e cronograma de entregas</p>
        </div>

        {/* Custom Sub-tabs Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('geral')}
            className={`flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              activeSubTab === 'geral'
                ? 'bg-white text-[#004d4d] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 inline mr-1" /> Geral
          </button>
          <button
            onClick={() => setActiveSubTab('calendario')}
            className={`flex-1 sm:flex-none text-xs font-bold px-4 py-2 rounded-xl transition-all ${
              activeSubTab === 'calendario'
                ? 'bg-white text-[#004d4d] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 inline mr-1" /> Calendário
          </button>
        </div>
      </div>

      {/* Dynamic Interactive Filters Box (Aplica-se apenas ao Geral) */}
      {activeSubTab === 'geral' && (
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-4 text-left">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs">
              <Filter className="w-3.5 h-3.5 text-[#3abeb9]" />
              <span>Filtros do Painel Central</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Professional Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Profissional Responsável</label>
              <div className="relative">
                <select
                  value={perfProfId}
                  onChange={(e) => setPerfProfId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#3abeb9] transition-all text-xs font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-hidden appearance-none cursor-pointer"
                >
                  <option value="all">Todos os Profissionais</option>
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Categorias Dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Filtrar por Categoria</label>
              <div className="relative">
                <select
                  value={perfCategory}
                  onChange={(e) => setPerfCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 hover:border-[#3abeb9] transition-all text-xs font-bold text-slate-800 rounded-xl px-3.5 py-2.5 outline-hidden appearance-none cursor-pointer"
                >
                  <option value="all">Todas as Categorias ({uniqueCategories.length})</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            {/* Custom Start Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Data de Início</label>
              <input
                type="date"
                value={perfStartDate}
                onChange={(e) => setPerfStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-[#3abeb9] transition-all text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2 outline-hidden cursor-pointer"
              />
            </div>

            {/* Custom End Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Data de Fim</label>
              <input
                type="date"
                value={perfEndDate}
                onChange={(e) => setPerfEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 hover:border-[#3abeb9] transition-all text-xs font-semibold text-slate-800 rounded-xl px-3.5 py-2 outline-hidden cursor-pointer"
              />
            </div>

          </div>

          {(perfProfId !== 'all' || perfCategory !== 'all' || perfStartDate !== '' || perfEndDate !== '') && (
            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => {
                  setPerfProfId('all');
                  setPerfCategory('all');
                  setPerfStartDate('');
                  setPerfEndDate('');
                }}
                className="text-[11px] font-bold text-[#3abeb9] hover:underline cursor-pointer opacity-85 hover:opacity-100"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* ======================= TAB 1: GENERAL STATS ======================= */}
      {activeSubTab === 'geral' && (
        <div className="space-y-6">
          {/* Indicators Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Total Open */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between min-h-28 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start text-outline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Em Aberto</span>
                <FolderOpen className="w-4 h-4 text-blue-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-800">
                {totalOpen}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between min-h-28 border-l-4 border-l-amber-500">
              <div className="flex justify-between items-start text-outline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Em Execução</span>
                <PlayCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-800">
                {totalInProgress}
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between min-h-28 border-l-4 border-l-teal-500">
              <div className="flex justify-between items-start text-outline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Concluídas</span>
                <CheckCircle className="w-4 h-4 text-teal-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-slate-800">
                {totalCompleted}
              </div>
            </div>

            {/* Delayed / Atrasadas */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col justify-between min-h-28 border-l-4 border-l-red-500">
              <div className="flex justify-between items-start text-outline">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Atrasadas</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="mt-2 text-2xl font-black text-red-600 flex items-baseline gap-1.5">
                {totalDelayed}
              </div>
            </div>

          </div>

          {/* Average Timing Metric Indicators section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Avg Open */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo em Aberto (Fila)</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">{formatTimeElapsed(Math.round(avgOpenSec))}</h4>
            </div>

            {/* Avg Execution */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tempo Execução (Ativo)</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">{formatTimeElapsed(Math.round(avgExecutionSec))}</h4>
            </div>

            {/* Avg Completion */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Abertura &rarr; Final</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">{formatTimeElapsed(Math.round(avgCompletionSec))}</h4>
            </div>
            
            {/* Avg Execution to Completion */}
            <div className="bg-white p-4 rounded-2xl border border-outline-variant/30 shadow-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Execução &rarr; Final</p>
              <h4 className="text-sm font-black text-slate-800 mt-1">{formatTimeElapsed(Math.round(avgExecToCompletionSec))}</h4>
            </div>

          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Priority distribution */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-4">
                <SlidersHorizontal className="w-4 h-4 text-[#3abeb9]" /> Demanda por Nível de Severidade
              </h3>
              <div className="flex-1 flex flex-col justify-center items-center min-h-[170px]">
                {priorityData.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10">Nenhuma prioridade registrada.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={priorityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {priorityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Custom priority labels */}
              <div className="mt-4 space-y-2">
                {priorities.map(pri => {
                  const count = demands.filter(d => d.priority === pri).length;
                  const percent = demands.length > 0 ? Math.round((count / demands.length) * 100) : 0;
                  const colorHex = priorityColorsMap[pri as keyof typeof priorityColorsMap];
                  return (
                    <div key={pri} className="flex justify-between items-center text-xs text-sans font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colorHex }} />
                        <span className="text-slate-600 font-bold">{pri}</span>
                      </div>
                      <div className="text-right flex items-center gap-1.5 font-mono">
                        <span className="font-bold text-slate-800">{count}</span>
                        <span className="text-slate-400">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Time Comparison Chart */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-col text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2 mb-4">
                <Hourglass className="w-4 h-4 text-[#3abeb9]" /> Tempo Médio (Horas)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timeChartData}>
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: '12px' }} />
                  <Bar dataKey="value" fill="#3abeb9" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="value" position="top" formatter={(val: any) => `${val}h`} style={{ fill: '#475569', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Carga de Trabalho por Profissional (Integrado ao Geral) */}
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs text-left space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-[#3abeb9]" /> Carga de Trabalho por Profissional
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Indicadores operacionais individuais com base nos filtros e período selecionados</p>
              </div>
            </div>

            {filteredProfWorkload.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Users className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-500">Nenhum profissional correspondente encontrado com os filtros ativos.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProfWorkload.map(({ professional, total, active, delayed, stats }) => {
                  const loadColorClass = active > 4 
                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                    : active > 2 
                      ? 'bg-amber-50 border-amber-200 text-amber-700' 
                      : 'bg-[#e6f8f7] border-[#3abeb9]/20 text-[#2ba39e]';

                  const loadLabel = active > 4 
                    ? 'Carga Alta' 
                    : active > 2 
                      ? 'Carga Moderada' 
                      : 'Carga Leve';

                  return (
                    <div 
                      key={professional.id} 
                      className="bg-white border text-left p-4 rounded-xl transition-all duration-200 hover:shadow-xs border-slate-200 hover:border-slate-300 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Hero Header */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3abeb9] to-[#2ba39e] text-white font-extrabold flex items-center justify-center text-xs shadow-3xs select-none shrink-0 uppercase">
                            {professional.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 truncate" title={professional.name}>
                              {professional.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate font-semibold">
                              {professional.description || 'Especialidade Geral'}
                            </p>
                          </div>
                        </div>

                        {/* Badges of Load & Delay status */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${loadColorClass}`}>
                            {loadLabel} ({active} ativas)
                          </span>
                          
                          {delayed > 0 && (
                            <span className="bg-red-50 border border-red-200 text-red-650 text-[9px] font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shrink-0">
                              <AlertCircle className="w-3 h-3" /> {delayed} atrasada{delayed > 1 && 's'}
                            </span>
                          )}
                        </div>

                        {/* Distribution grid bars */}
                        <div className="grid grid-cols-4 gap-1.5 mt-2 pt-2 border-t border-slate-100 font-sans">
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-400">Total</p>
                            <p className="text-xs font-black text-slate-700">{total}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-blue-500">Abertas</p>
                            <p className="text-xs font-black text-blue-600">{stats.open}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-amber-500">Em Exec.</p>
                            <p className="text-xs font-black text-amber-600">{stats.inProgress}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-teal-500">Feito</p>
                            <p className="text-xs font-black text-teal-600">{stats.completed}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================= TAB 2: WORKLOAD BY REGISTERED PROFESSIONAL (RETIRED) ======================= */}
      {false && (
        <div className="space-y-6 text-left">
          
          <div className="bg-white p-5 rounded-2xl border border-dashed border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-[#004d4d] flex items-center gap-1.5 font-sans">
                  <Briefcase className="w-4 h-4 text-[#3abeb9]" /> Distribuição Operacional
                </h3>
                <p className="text-xs text-slate-500 font-medium">Monitore a carga de trabalho atual por profissional cadastrado</p>
              </div>

              {/* Search tool */}
              <div className="relative w-full md:w-72 shrink-0">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Pesquisar profissional..."
                  value={profSearch}
                  onChange={(e) => setProfSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-[#3abeb9] bg-[#fafdfd] font-medium"
                />
              </div>
            </div>

            {/* Professionals Grid Card View */}
            {filteredProfWorkload.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-500">Nenhum profissional encontrado com os critérios de busca.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProfWorkload.map(({ professional, total, active, delayed, stats, demandsList }) => {
                  const isExpanded = expandedProfId === professional.id;
                  
                  // Calculate dynamic colors based on load level
                  const loadColorClass = active > 4 
                    ? 'bg-rose-50 border-rose-200 text-rose-700' 
                    : active > 2 
                      ? 'bg-amber-50 border-amber-200 text-amber-700' 
                      : 'bg-[#e6f8f7] border-[#3abeb9]/20 text-[#2ba39e]';

                  const loadLabel = active > 4 
                    ? 'Carga Alta' 
                    : active > 2 
                      ? 'Carga Moderada' 
                      : 'Carga Leve';

                  return (
                    <div 
                      key={professional.id} 
                      className={`bg-white border text-left p-4 rounded-2xl transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                        isExpanded ? 'border-[#3abeb9] ring-2 ring-[#3abeb9]/5' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        {/* Hero Header */}
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3abeb9] to-[#2ba39e] text-white font-black flex items-center justify-center text-sm shadow-xs select-none shrink-0 uppercase">
                            {professional.name.substring(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-800 truncate" title={professional.name}>
                              {professional.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate font-semibold">
                              {professional.description || 'Especialidade Geral'}
                            </p>
                          </div>
                        </div>

                        {/* Badges of Load & Delay status */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-3">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${loadColorClass}`}>
                            {loadLabel} ({active} ativas)
                          </span>
                          
                          {delayed > 0 && (
                            <span className="bg-red-50 border border-red-200 text-red-650 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <AlertCircle className="w-3.5 h-3.5" /> {delayed} {delayed === 1 ? 'atrasada' : 'atrasadas'}
                            </span>
                          )}
                        </div>

                        {/* Distribution grid bars */}
                        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-slate-100">
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-slate-400">Total</p>
                            <p className="text-sm font-black text-slate-700">{total}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-blue-500">Abertas</p>
                            <p className="text-sm font-black text-blue-600">{stats.open}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-amber-500">Em Exec.</p>
                            <p className="text-sm font-black text-amber-600">{stats.inProgress}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] font-bold text-teal-500">Feito</p>
                            <p className="text-sm font-black text-teal-600">{stats.completed}</p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded trigger footer action */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          onClick={() => setExpandedProfId(isExpanded ? null : professional.id)}
                          className="text-xs font-bold text-[#2ba39e] hover:text-[#004d4d] transition-colors flex items-center gap-1.5"
                        >
                          {isExpanded ? 'Esconder Chamados' : `Ver Chamados (${active})`}
                          <ArrowUpRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expanded active demand panel */}
          {expandedProfId && (() => {
            const currentItem = professionalWorkload.find(i => i.professional.id === expandedProfId);
            if (!currentItem) return null;
            const item = currentItem!;

            const activeList = item.demandsList.filter(d => d.status !== 'Concluída' && d.status !== 'Cancelada');

            return (
              <div className="bg-[#fafdfd] border-2 border-[#3abeb9]/20 p-5 rounded-2xl space-y-4 animate-fade-in text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#3abeb9] text-white font-bold flex items-center justify-center text-xs uppercase shadow-2xs">
                      {item.professional.name.substring(0, 2)}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800">
                        Pauta de Demandas Ativas: <span className="text-[#3abeb9]">{item.professional.name}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold">Exibindo chamados ativos (Em aberto / Em execução)</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedProfId(null)}
                    className="text-xs font-extrabold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Recolher Detalhes
                  </button>
                </div>

                {activeList.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium italic text-center py-6 bg-white border border-slate-200 rounded-xl">
                    Este profissional não possui nenhuma demanda pendente ou em execução neste momento.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[9px] font-extrabold">
                          <th className="py-2.5 px-3">Código</th>
                          <th className="py-2.5 px-3">Título da Demanda</th>
                          <th className="py-2.5 px-3">Setor / Categoria</th>
                          <th className="py-2.5 px-3">Prioridade</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Prazo Limite</th>
                          <th className="py-2.5 px-3 text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white rounded-xl overflow-hidden">
                        {activeList.map(dem => {
                          const badgeStyles = getStatusBadgeStyles(dem.status);
                          const isDemDelayed = isDelayed(dem);
                          
                          // Priorities styles mapping
                          const priColors = dem.priority === 'Crítica'
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : dem.priority === 'Alta'
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : dem.priority === 'Média'
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : 'bg-slate-50 text-slate-600 border-slate-100';

                          return (
                            <tr key={dem.id} className="hover:bg-slate-50 transition-all font-sans font-medium text-slate-700">
                              <td className="py-3 px-3 font-mono font-bold text-[#006a65]">{dem.id}</td>
                              <td className="py-3 px-3">
                                <span className="font-extrabold text-slate-800 break-words block max-w-xs">{dem.title}</span>
                              </td>
                              <td className="py-3 px-3">
                                <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  {dem.category}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`text-[10px] font-bold px-2 py-0.5 border rounded-md ${priColors}`}>
                                  {dem.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full ${badgeStyles}`}>
                                  {dem.status}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                {dem.dueDate ? (
                                  <span className={`font-mono text-xs font-black ${isDemDelayed ? 'text-red-500 font-black' : 'text-slate-600'}`}>
                                    {dem.dueDate.split('-').reverse().join('/')}
                                    {isDemDelayed && ' ⚠️'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">Sem prazo</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                {onSelectDemand && (
                                  <button
                                    onClick={() => onSelectDemand(dem)}
                                    className="px-2.5 py-1 bg-white border border-slate-200 hover:border-[#3abeb9] hover:text-[#3abeb9] text-xs font-bold text-slate-600 rounded-lg transition-all shadow-3xs cursor-pointer"
                                  >
                                    Ver Detalhes
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

      {/* ======================= TAB 3: DUE DATE CALENDAR ======================= */}
      {activeSubTab === 'calendario' && (
        <div className="space-y-6 text-left">
          
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/30 shadow-xs space-y-4">
            
            {/* Calendar controller bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-black text-[#004d4d] flex items-center gap-1.5 font-sans">
                  <Calendar className="w-4 h-4 text-[#3abeb9]" /> Calendário Operacional de Prazos
                </h3>
                <p className="text-xs text-slate-500 font-medium">Distribuição e estimativas de entrega de pautas pelo prazo cadastrado</p>
              </div>

              {/* Navigation tools */}
              <div className="flex items-center gap-2 w-full sm:w-auto self-end">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 bg-slate-50 border border-slate-200 hover:border-[#3abeb9] text-slate-600 hover:text-[#3abeb9] rounded-xl transition-all font-sans font-bold cursor-pointer"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="text-xs font-black text-slate-700 font-sans min-w-[120px] text-center uppercase tracking-wider">
                  {monthsBR[month]} de {year}
                </span>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 bg-slate-50 border border-slate-200 hover:border-[#3abeb9] text-slate-600 hover:text-[#3abeb9] rounded-xl transition-all font-sans font-bold cursor-pointer"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="w-px h-5 bg-slate-200 mx-1" />

                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-200 hover:bg-[#3abeb9]/5 hover:border-[#3abeb9] text-[#2ba39e] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Hoje
                </button>
              </div>
            </div>

            {/* Total scheduled demands callout */}
            <p className="text-[11px] text-slate-500 font-semibold font-sans">
              ℹ️ Existem <strong className="text-[#3abeb9]">{getDemandsWithDueDateThisMonth().length} chamados</strong> com entregas previstas para o mês de {monthsBR[month]}.
            </p>

            {/* Calendar GRID */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-3xs">
              {/* Day headers */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 py-2.5 text-center text-[10px] font-black text-slate-500 uppercase tracking-wider font-sans">
                {weekDaysBR.map((wd, index) => (
                  <div key={wd} className={index === 0 || index === 6 ? 'text-amber-600' : 'text-slate-500'}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day values */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-50/20">
                {calendarDays.map((cell, idx) => {
                  const { date, dayNumber, dateString } = cell;

                  if (!date || !dayNumber || !dateString) {
                    return (
                      <div 
                        key={`empty-${idx}`} 
                        className="min-h-[75px] md:min-h-[100px] bg-slate-50/45 text-slate-300"
                      />
                    );
                  }

                  // Find demands on this specific calendar day
                  const dOnDate = demands.filter(d => d.dueDate === dateString);
                  
                  // Check if this cell day is "today"
                  const todayStr = (() => {
                    const t = new Date();
                    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                  })();
                  const isToday = dateString === todayStr;

                  // Check if this day is currently highlighted/selected
                  const isSelected = dateString === selectedDateString;

                  return (
                    <div
                      key={dateString}
                      onClick={() => setSelectedDateString(dateString)}
                      className={`min-h-[75px] md:min-h-[100px] p-1.5 md:p-2 bg-white hover:bg-[#e6f8f7]/20 transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-[#e6f8f7]/40 ring-2 ring-[#3abeb9] ring-inset z-10' 
                          : ''
                      } ${isToday ? 'border-t-2 border-t-[#3abeb9] bg-[#3abeb9]/5' : ''}`}
                    >
                      {/* Day Number and small visual indication */}
                      <div className="flex justify-between items-center text-left">
                        <span className={`text-xs font-bold leading-none w-5 h-5 flex items-center justify-center rounded-full ${
                          isToday 
                            ? 'bg-[#3abeb9] text-white font-extrabold' 
                            : isSelected 
                              ? 'text-[#2ba39e] font-extrabold' 
                              : 'text-slate-700'
                        }`}>
                          {dayNumber}
                        </span>

                        {isToday && (
                          <span className="text-[8px] bg-[#3abeb9]/25 text-[#2ba39e] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider font-sans scale-90">Today</span>
                        )}
                      </div>

                      {/* Display demands brief lists */}
                      <div className="mt-1 space-y-1 overflow-hidden flex-1 flex flex-col justify-end">
                        {dOnDate.length > 0 && (
                          <>
                            {/* Detailed Mini Pills for larger screens */}
                            <div className="hidden md:flex flex-col gap-1 w-full text-left">
                              {dOnDate.slice(0, 3).map(dem => {
                                const isCompleted = dem.status === 'Concluída';
                                const isCanceled = dem.status === 'Cancelada';
                                
                                let priColors = '';
                                if (isCompleted) {
                                  priColors = 'border-slate-200 bg-slate-50 text-slate-400 line-through';
                                } else if (isCanceled) {
                                  priColors = 'border-red-150 bg-red-50/40 text-red-400 line-through';
                                } else {
                                  priColors = dem.priority === 'Crítica'
                                    ? 'border-red-300 bg-red-50 text-red-700 font-extrabold'
                                    : dem.priority === 'Alta'
                                      ? 'border-amber-300 bg-amber-50 text-amber-750 font-bold'
                                      : 'border-[#3abeb9]/30 bg-[#e6f8f7]/60 text-[#2ba39e]';
                                }

                                return (
                                  <div 
                                    key={dem.id} 
                                    className={`truncate text-[9px] font-bold px-1.5 py-0.5 rounded-md border text-left flex items-center justify-between ${priColors}`}
                                    title={`${dem.id}: ${dem.title} (${dem.status})`}
                                  >
                                    <span className="truncate flex-1 font-sans">
                                      {isCompleted && '✓ '}{dem.id}
                                    </span>
                                    {!isCompleted && !isCanceled && (
                                      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 ml-1" />
                                    )}
                                  </div>
                                );
                              })}
                              {dOnDate.length > 3 && (
                                <p className="text-[8px] font-black text-slate-400 text-center font-sans tracking-wide">
                                  + {dOnDate.length - 3} chamado{dOnDate.length - 3 !== 1 ? 's' : ''}
                                </p>
                              )}
                            </div>

                            {/* Dot Indicators for Mobile / Compact */}
                            <div className="flex md:hidden items-center justify-center gap-0.5 mt-auto">
                              {dOnDate.slice(0, 4).map((dem, dIdx) => {
                                const isCompleted = dem.status === 'Concluída';
                                const isCanceled = dem.status === 'Cancelada';
                                const dotColor = isCompleted
                                  ? 'bg-slate-300'
                                  : isCanceled
                                    ? 'bg-red-300'
                                    : dem.priority === 'Crítica'
                                      ? 'bg-red-500'
                                      : dem.priority === 'Alta'
                                        ? 'bg-amber-500'
                                        : 'bg-[#3abeb9]';
                                return (
                                  <span key={`dot-${dem.id}-${dIdx}`} className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                                );
                              })}
                              {dOnDate.length > 4 && (
                                <span className="text-[7.5px] font-bold text-slate-400 ml-0.5">...</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Interactive details box showing demands for clicked day */}
          {selectedDateString && (() => {
            const dateArr = selectedDateString.split('-');
            const formattedDateBR = dateArr.length === 3 ? `${dateArr[2]}/${dateArr[1]}/${dateArr[0]}` : selectedDateString;
            
            return (
              <div className="bg-[#fafdfd] border-2 border-[#3abeb9]/20 p-5 rounded-2xl space-y-4 animate-fade-in text-left">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-[#3abeb9]" />
                    <div>
                      <h4 className="text-xs font-black text-slate-800 font-sans">
                        Fila de Prazos para: <span className="text-[#3abeb9]">{formattedDateBR}</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-semibold font-sans">Demais prazos com data de solução para esse dia cadastrado</p>
                    </div>
                  </div>

                  <span className="bg-[#e6f8f7] text-[#2ba39e] text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider font-sans shrink-0">
                    {selectedDayDemands.length} {selectedDayDemands.length === 1 ? 'demanda' : 'demandas'}
                  </span>
                </div>

                {selectedDayDemands.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium italic text-center py-8 bg-white border border-slate-200 rounded-xl">
                    Nenhum chamado de entrega operacional cadastrado para {formattedDateBR}. Selecione outra data no calendário.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDayDemands.map(dem => {
                      const badgeStyles = getStatusBadgeStyles(dem.status);
                      
                      // Priority styles card border
                      const priBorder = dem.priority === 'Crítica'
                        ? 'border-l-red-500'
                        : dem.priority === 'Alta'
                          ? 'border-l-amber-500'
                          : dem.priority === 'Média'
                            ? 'border-l-blue-500'
                            : 'border-l-slate-400';

                      return (
                        <div 
                          key={dem.id}
                          className={`bg-white p-4 border border-slate-200 border-l-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:shadow-xs transition-shadow ${priBorder}`}
                        >
                          <div className="space-y-1.5 text-left min-w-0 flex-1">
                            {/* Demand Code & Priority */}
                            <div className="flex items-center gap-2 flex-wrap text-sans">
                              <span className="font-mono text-xs font-black text-[#006a65]">{dem.id}</span>
                              <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                                {dem.category}
                              </span>
                              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 border rounded uppercase ${
                                dem.priority === 'Crítica' ? 'bg-red-50 text-red-650 border-red-200' :
                                dem.priority === 'Alta' ? 'bg-amber-50 text-amber-650 border-amber-200' :
                                dem.priority === 'Média' ? 'bg-blue-50 text-blue-650 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}>
                                {dem.priority}
                              </span>
                            </div>

                            {/* Title */}
                            <h5 className="text-xs font-black text-slate-800 break-words line-clamp-2 md:line-clamp-none">
                              {dem.title}
                            </h5>

                            {/* Assigned Team */}
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-semibold">
                              <User className="w-3.5 h-3.5 text-[#3abeb9]" />
                              <span>Responsáveis:</span>
                              {dem.involvedNames && dem.involvedNames.length > 0 ? (
                                <span className="text-slate-700 font-extrabold truncate max-w-xs">{Array.from(new Set(dem.involvedNames.map(n => n?.trim()).filter(Boolean))).join(', ')}</span>
                              ) : (
                                <span className="text-slate-400 italic">Sem responsável associado</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                            {/* Status */}
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${badgeStyles}`}>
                              {dem.status}
                            </span>

                            {/* Modal redirect button */}
                            {onSelectDemand && (
                              <button
                                onClick={() => onSelectDemand(dem)}
                                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-[#3abeb9] hover:text-[#3abeb9] text-xs font-bold text-slate-700 rounded-xl transition-all shadow-3xs cursor-pointer flex items-center gap-1"
                              >
                                <span>Ver Demanda</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      )}

    </div>
  );
}
