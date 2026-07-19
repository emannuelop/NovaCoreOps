import React from 'react';
import { 
  ChevronRight, 
  User, 
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Lock,
  ArrowUpDown,
  FileText
} from 'lucide-react';
import { Demand, StatusType, UserProfile } from '../types';
import { getPriorityStyles, formatRelativeDate } from '../utils';
import { updateDemandStatus, auth } from '../lib/firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface KanbanViewProps {
  demands: Demand[];
  users: UserProfile[];
  onSelectDemand: (demand: Demand) => void;
  currentUserProfile: UserProfile | null;
  onAddDemand: () => void;
}

export default function KanbanView({ 
  demands, 
  users, 
  onSelectDemand,
  currentUserProfile,
  onAddDemand
}: KanbanViewProps) {

  const [filterMode, setFilterMode] = React.useState<'all' | 'my'>('all');
  const [sortBy, setSortBy] = React.useState<'none' | 'priority' | 'deadline'>('none');

  const priorityWeight = {
    'Crítica': 4,
    'Alta': 3,
    'Média': 2,
    'Baixa': 1
  };

  const sortDemands = (list: Demand[]) => {
    if (sortBy === 'priority') {
      return [...list].sort((a, b) => {
        const weightA = priorityWeight[a.priority] || 0;
        const weightB = priorityWeight[b.priority] || 0;
        return weightB - weightA;
      });
    } else if (sortBy === 'deadline') {
      return [...list].sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
    }
    return list;
  };

  const isOverdue = (dem: Demand) => {
    if (!dem.dueDate) return false;
    if (dem.status === 'Concluída' || dem.status === 'Cancelada') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dem.dueDate + 'T23:59:59');
    return due.getTime() < today.getTime();
  };

  // Flow columns
  const columns: { label: StatusType; color: string }[] = [
    { label: 'Em aberto', color: 'bg-blue-500' },
    { label: 'Em execução', color: 'bg-amber-500' }
  ];

  const isAdmin = useIsAdmin(currentUserProfile);

  const isMyDemand = (d: Demand) => {
    if (!currentUserProfile) return false;
    const isAssignee = d.assignedTo === currentUserProfile.uid;
    const isInvolved = d.involvedUids?.includes(currentUserProfile.uid);
    return isAssignee || isInvolved;
  };

  const canModifyDemand = (demand: Demand) => {
    if (!currentUserProfile) return false;
    
    // Support/Admin can write/update anything
    return isAdmin;
  };

  const filteredDemands = demands.filter(d => {
    if (!isAdmin || filterMode === 'my') {
      return isMyDemand(d);
    }
    return true;
  });

  const getFirstName = () => {
    if (!currentUserProfile?.name) return 'Equipe';
    return currentUserProfile.name.split(' ')[0];
  };

  return (
    <div className="space-y-6">
      
      {/* Welcome Board Intro & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1">
        <div className="text-left">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Olá, {getFirstName()}
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Monitore visualmente o fluxo operacional e altere etapas de forma ágil.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={onAddDemand}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-[#3abeb9] hover:bg-[#2bbbb5] text-white font-extrabold text-sm rounded-xl shadow-xs hover:scale-[1.02] active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span>Nova Demanda</span>
          </button>
        )}
      </div>

      {/* Controls Container: Filter + Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-2.5 rounded-2xl border border-slate-200/50 shadow-2xs">
        {/* Visual Filter Segmented Control */}
        {!isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit shrink-0 select-none border border-slate-200/40">
            <button
              disabled={true}
              className="px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all bg-white text-[#3abeb9] shadow-2xs"
            >
              Minhas Demandas
              <span className="ml-2 bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {demands.filter(d => isMyDemand(d) && (d.status === 'Em aberto' || d.status === 'Em execução')).length}
              </span>
            </button>
          </div>
        )}

        {isAdmin && (
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit shrink-0 select-none border border-slate-200/40">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-[#3abeb9] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todas as Demandas
            </button>
            <button
              onClick={() => setFilterMode('my')}
              className={`px-4 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'my'
                  ? 'bg-white text-[#3abeb9] shadow-2xs'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
            >
              Minhas Demandas
              <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full text-[10px] font-black">
                {demands.filter(d => isMyDemand(d) && (d.status === 'Em aberto' || d.status === 'Em execução')).length}
              </span>
            </button>
          </div>
        )}

        {/* Sorting Segmented Control */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit select-none border border-slate-200/40 ml-auto sm:ml-0">
          <span className="text-[10px] font-black uppercase text-slate-400 px-2 tracking-wider flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            Ordenar por:
          </span>
          <button
            onClick={() => setSortBy('none')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              sortBy === 'none'
                ? 'bg-white text-[#3abeb9] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Padrão
          </button>
          <button
            onClick={() => setSortBy('priority')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              sortBy === 'priority'
                ? 'bg-white text-[#3abeb9] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Prioridade
          </button>
          <button
            onClick={() => setSortBy('deadline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              sortBy === 'deadline'
                ? 'bg-white text-[#3abeb9] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Prazo
          </button>
        </div>
      </div>

      {/* Kanban Board Container side-by-side and expanded */}
      <div className="flex flex-row overflow-x-auto gap-6 pb-6 custom-scrollbar snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none w-full">
        {columns.map((column) => {
          let colDemands = filteredDemands.filter(d => d.status === column.label);
          const totalCount = colDemands.length;
          colDemands = sortDemands(colDemands);

          return (
            <div 
              key={column.label}
              className="kanban-column shrink-0 sm:shrink-0 flex flex-col gap-4 snap-start w-[calc(100vw-48px)] sm:w-full"
            >
              
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 text-left">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${column.color} ring-4 ring-offset-2 ring-offset-white ${column.label === 'Em aberto' ? 'ring-blue-100' : 'ring-amber-100'}`} />
                  <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">{column.label}</h3>
                  <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full text-xs font-extrabold border border-slate-200/50">
                    {totalCount}
                  </span>
                </div>
              </div>

              {/* Column List */}
              <div className="flex flex-col gap-3.5 min-h-[550px] bg-slate-50/60 p-3 rounded-2xl border border-slate-200/60 shadow-xs">
                {colDemands.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-slate-400 p-4 border border-dashed border-slate-200 rounded-xl bg-white/40">
                    <AlertCircle className="w-6 h-6 stroke-[1.5] mb-2 text-slate-300" />
                    <span className="text-xs font-bold">Sem atividades nesta etapa</span>
                  </div>
                ) : (
                  colDemands.map((dem) => {
                    const overdueVal = isOverdue(dem);
                    return (
                      <div 
                        key={dem.id}
                        onClick={() => onSelectDemand(dem)}
                        className={`bg-white p-5 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group space-y-4 border ${
                          overdueVal 
                            ? 'border-red-500 ring-2 ring-red-100/50 bg-red-50/5' 
                            : 'border-slate-100/90 hover:border-[#3abeb9]/50'
                        }`}
                      >
                        {/* Header ID/Priority */}
                        <div className="flex justify-between items-center text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-slate-900 text-white font-mono font-extrabold px-2.5 py-0.5 rounded text-[10px] tracking-wide shadow-2xs">{dem.id}</span>
                            {!canModifyDemand(dem) && (
                              <span className="bg-slate-100 text-slate-500 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-slate-200/40 flex items-center gap-0.5" title="Apenas leitura">
                                <Lock className="w-2.5 h-2.5" /> LEITURA
                              </span>
                            )}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider border ${getPriorityStyles(dem.priority)}`}>
                            {dem.priority}
                          </span>
                        </div>

                        {/* Title & Category info */}
                        <div className="text-left">
                          <h4 className="text-[14px] font-black text-slate-800 leading-snug group-hover:text-[#3abeb9] line-clamp-3 transition-colors">
                            {dem.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50 uppercase tracking-wide">
                              {dem.category}
                            </span>
                            {dem.observation && (
                              <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-black uppercase tracking-wider" title="Contém observações do executor">
                                <FileText className="w-3 h-3 text-emerald-500" /> Obs
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assignments / Controls footer (Unified) */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-left min-w-0 w-full">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Users className="w-3.5 h-3.5 text-[#3abeb9] shrink-0" />
                            {(() => {
                              const allNamesStr = [dem.assignedToName, ...(dem.involvedNames || [])]
                                .map(n => n?.trim())
                                .filter(Boolean);
                              const uniqueInvolved = Array.from(new Set(allNamesStr));

                              return (
                                <span className="text-slate-600 font-extrabold text-[10px] truncate block flex-1" title={uniqueInvolved.join(', ')}>
                                  {uniqueInvolved.length > 0 ? uniqueInvolved.join(', ') : 'Não atribuído'}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Relative timing badge */}
                        <div className="pt-2 flex flex-col gap-1.5 border-t border-slate-100 text-[9px] text-outline text-left">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-outline/70" />
                              {formatRelativeDate(dem.openedAt)}
                            </span>
                            <span className="font-semibold text-[#3abeb9]">
                              {dem.requester.split(' ')[0]}
                            </span>
                          </div>
                          
                          {dem.dueDate && (
                            <div className={`flex items-center gap-1 px-2 py-1 rounded font-bold text-[10px] w-fit ${
                              overdueVal 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              <Calendar className="w-3.5 h-3.5 shrink-0" />
                              Prazo: {dem.dueDate.split('-').reverse().join('/')} {overdueVal && '(VENCIDO)'}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
