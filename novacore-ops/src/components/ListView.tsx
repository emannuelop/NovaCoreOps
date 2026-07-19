import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronRight, User, AlertCircle, Plus, ClipboardList, Activity, CheckCircle2, History, Calendar, FileDown, FileSpreadsheet, FileText } from 'lucide-react';
import { Demand, Category, StatusType, PriorityType, UserProfile } from '../types';
import { getStatusBadgeStyles, getPriorityStyles, formatRelativeDate, formatTimeElapsed } from '../utils';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ListViewProps {
  demands: Demand[];
  categories: Category[];
  currentUserProfile: UserProfile | null;
  onSelectDemand: (demand: Demand) => void;
  onOpenCreateModal: () => void;
  mode?: 'inicio' | 'historico';
  users?: UserProfile[];
  onLoadMoreHistorical?: () => void;
  hasMoreHistorical?: boolean;
  isLoadingMore?: boolean;
}

export default function ListView({ 
  demands, 
  categories, 
  currentUserProfile,
  onSelectDemand,
  onOpenCreateModal,
  mode = 'inicio',
  users = [],
  onLoadMoreHistorical,
  hasMoreHistorical = false,
  isLoadingMore = false
}: ListViewProps) {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedPriority, setSelectedPriority] = useState<string>('Todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedStatus, selectedPriority, selectedCategory, mode]);

  const isAdmin = useIsAdmin(currentUserProfile);

  // Determine if a demand belongs to the current user
  const isMyDemand = (d: Demand) => {
    if (!currentUserProfile) return false;
    const isAssignee = d.assignedTo === currentUserProfile.uid;
    const isInvolved = d.involvedUids?.includes(currentUserProfile.uid);
    return isAssignee || isInvolved;
  };

  // Filter demands based on mode and user permissions
  const filteredDemands = demands.filter(d => {
    // Search terms matches: title, code/ID, requester name/sector or any part
    const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || 
                          d.id.toLowerCase().includes(search.toLowerCase()) ||
                          d.requester.toLowerCase().includes(search.toLowerCase());

    const matchesInvolved = d.assignedToName?.toLowerCase().includes(search.toLowerCase()) ||
                            (d.involvedNames || []).some(name => name.toLowerCase().includes(search.toLowerCase()));
    
    const matchesSearchExtended = matchesSearch || matchesInvolved;
    
    const matchesPriority = selectedPriority === 'Todos' || d.priority === selectedPriority;
    const matchesCategory = selectedCategory === 'Todos' || d.category === selectedCategory;

    if (mode === 'inicio') {
      // In Início view, open demands or very recent updates
      const isOpen = d.status !== 'Concluída' && d.status !== 'Cancelada';
      const isRecent = d.openedAt 
        ? (Date.now() - new Date(d.openedAt).getTime() < 3 * 24 * 60 * 60 * 1000) 
        : false;

      return matchesSearchExtended && (isOpen || isRecent) && matchesPriority && matchesCategory;
    } else {
      // In Histórico view: 
      // - Admins can see all demands matching the status
      // - Common users can ONLY see their own demands
      const matchesStatus = selectedStatus === 'Todos' || d.status === selectedStatus;
      const matchesOwnership = isAdmin || isMyDemand(d);

      return matchesSearchExtended && matchesStatus && matchesPriority && matchesCategory && matchesOwnership;
    }
  });

  // Helper to compute live elapsed times for exports
  const getElapsedTimesDetails = (d: Demand) => {
    let openSec = d.elapsedTimes?.['Em aberto'] || 0;
    let execSec = d.elapsedTimes?.['Em execução'] || 0;

    if (d.status === 'Em aberto') {
      const lastChange = new Date(d.lastStatusChangedAt || d.openedAt).getTime();
      openSec += Math.max(0, Math.floor((Date.now() - lastChange) / 1000));
    } else if (d.status === 'Em execução') {
      const lastChange = new Date(d.lastStatusChangedAt || d.openedAt).getTime();
      execSec += Math.max(0, Math.floor((Date.now() - lastChange) / 1000));
    }

    // Total time is from start of execution to completion/current time
    let totalSec = 0;
    if (d.startedAt) {
      const startMs = new Date(d.startedAt).getTime();
      const endMs = d.completedAt 
        ? new Date(d.completedAt).getTime()
        : (d.status === 'Concluída' || d.status === 'Cancelada' 
            ? new Date(d.lastStatusChangedAt || d.updatedAt).getTime() 
            : Date.now());
      if (endMs > startMs) {
        totalSec = Math.floor((endMs - startMs) / 1000);
      }
    } else {
      // fallback in case it was completed but startedAt is missing
      if (d.completedAt && d.openedAt) {
        const startMs = new Date(d.openedAt).getTime();
        const endMs = new Date(d.completedAt).getTime();
        if (endMs > startMs) {
          totalSec = Math.floor((endMs - startMs) / 1000);
        }
      }
    }

    return {
      openTime: formatTimeElapsed(openSec),
      execTime: formatTimeElapsed(execSec),
      totalTime: formatTimeElapsed(totalSec),
      openSec,
      execSec,
      totalSec
    };
  };

  const getCreatorEmail = (d: Demand) => {
    if (d.createdByEmail) return d.createdByEmail;
    const creatorUser = users.find(u => u.uid === d.createdByUid);
    if (creatorUser?.email) return creatorUser.email;
    if (currentUserProfile && d.createdByUid === currentUserProfile.uid) {
      return currentUserProfile.email;
    }
    return 'admin@novacore.com';
  };

  const getChecklistSummary = (d: Demand) => {
    if (!d.checklist || d.checklist.length === 0) return 'Sem checklist';
    const done = d.checklist.filter(item => item.completed).length;
    const total = d.checklist.length;
    const listItems = d.checklist.map((item, idx) => `[${idx + 1}] ${item.text}: ${item.completed ? 'Sim' : 'Não'}`).join(' | ');
    return `${done}/${total} concluídas (${listItems})`;
  };

  // Export to Excel compatible CSV (with UTF-8 BOM representation and semicolon separators)
  const handleExportExcel = () => {
    const headers = [
      'Código da Demanda',
      'Assunto / Título',
      'Descrição Detalhada',
      'Solicitante / Setor',
      'Responsável pela Abertura (E-mail)',
      'Categoria',
      'Gravidade da Demanda',
      'Status Atual',
      'Profissionais Envolvidos',
      'Progresso do Checklist',
      'Observações do Executor',
      'Data de Abertura',
      'Início da Execução',
      'Data de Conclusão / Cancelamento',
      'Tempo em Atendimento (Ativo)',
      'Tempo de Transição (Trâmite)',
      'Última Movimentação'
    ];

    const rows = filteredDemands.map(d => {
      const times = getElapsedTimesDetails(d);
      const checklistStr = getChecklistSummary(d);
      
      const csvInvolved = Array.from(
        new Set([d.assignedToName, ...(d.involvedNames || [])].map(n => n?.trim()).filter(Boolean))
      );

      return [
        d.id,
        d.title.replace(/"/g, '""').replace(/;/g, ','),
        (d.description || '').replace(/"/g, '""').replace(/;/g, ','),
        d.requester.replace(/"/g, '""').replace(/;/g, ','),
        getCreatorEmail(d).replace(/"/g, '""').replace(/;/g, ','),
        (d.category || 'Sem Categoria').replace(/"/g, '""').replace(/;/g, ','),
        d.priority,
        d.status,
        csvInvolved.join(', ').replace(/"/g, '""').replace(/;/g, ','),
        checklistStr.replace(/"/g, '""').replace(/;/g, ','),
        (d.observation || '').replace(/"/g, '""').replace(/;/g, ','),
        d.openedAt ? new Date(d.openedAt).toLocaleString('pt-BR') : '',
        d.startedAt ? new Date(d.startedAt).toLocaleString('pt-BR') : 'Não iniciado',
        d.completedAt ? new Date(d.completedAt).toLocaleString('pt-BR') : (d.status === 'Cancelada' ? 'Cancelada' : 'Pendente'),
        times.execTime,
        times.totalTime,
        d.updatedAt ? new Date(d.updatedAt).toLocaleString('pt-BR') : ''
      ];
    });

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(val => `"${val}"`).join(';'))
    ].join('\n');

    // Add unicode UTF-8 BOM bytes (\xEF\xBB\xBF) so Excel reads accents perfectly
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `historico_demandas_novacore_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF using client-side jsPDF and autoTable
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Add Title and Header
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('NovaCore Ops - Demandas', 14, 18);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('Relatório Consolidado de Histórico de Atividades e SLA Técnico', 14, 24);

    // Meta Info (right aligned)
    const dateStr = new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const username = currentUserProfile?.name || 'Administrador';
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Gerado em: ${dateStr}`, 215, 18);
    doc.text(`Emitido por: ${username}`, 215, 23);
    doc.text(`Filtros: Status: ${selectedStatus} | Categoria: ${selectedCategory}`, 215, 28);

    // Summary Statistics Cards (KPIs)
    const checkIsDelayed = (d: Demand): boolean => {
      if (d.status === 'Concluída' || d.status === 'Cancelada') return false;
      if (d.dueDate) {
        const today = new Date();
        const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        if (d.dueDate < localTodayStr) return true;
      }
      const startTimeStr = d.startedAt || d.openedAt || (d.status === 'Em execução' ? d.lastStatusChangedAt : null);
      if (!startTimeStr) return false;
      const diffHours = (Date.now() - new Date(startTimeStr).getTime()) / (1000 * 3600);
      const slaLimit = (d.priority === 'Crítica' || d.priority === 'Alta') ? 24 : 48;
      return diffHours > slaLimit;
    };

    const totalCount = filteredDemands.length;
    const completed = filteredDemands.filter(d => d.status === 'Concluída');
    const running = filteredDemands.filter(d => d.status === 'Em execução');
    const open = filteredDemands.filter(d => d.status === 'Em aberto');
    const delayedCount = filteredDemands.filter(checkIsDelayed).length;

    const completedWithinSLA = completed.filter(d => {
      const startTimeStr = d.startedAt || d.openedAt;
      if (!startTimeStr) return true;
      const durationHours = (new Date(d.completedAt || d.lastStatusChangedAt || d.updatedAt).getTime() - new Date(startTimeStr).getTime()) / (1000 * 3600);
      const slaLimit = (d.priority === 'Crítica' || d.priority === 'Alta') ? 24 : 48;
      return durationHours <= slaLimit;
    }).length;

    const slaRate = completed.length > 0
      ? Math.round((completedWithinSLA / completed.length) * 100)
      : 100;

    const kpis = [
      { label: 'TOTAL REGISTRADO', value: `${totalCount} demanda${totalCount !== 1 ? 's' : ''}`, color: [71, 85, 105], bg: [248, 250, 252] },
      { label: 'EM EXECUÇÃO / SELEÇÃO', value: `${running.length} exec. / ${open.length} aberto`, color: [58, 190, 185], bg: [240, 253, 250] },
      { label: 'CONCLUÍDAS', value: `${completed.length} finalizada${completed.length !== 1 ? 's' : ''}`, color: [22, 163, 74], bg: [240, 253, 244] },
      { label: 'EM ATRASO', value: `${delayedCount} em atraso`, color: [220, 38, 38], bg: [254, 242, 242] }
    ];

    kpis.forEach((kpi, idx) => {
      const x = 14 + idx * 66;
      const w = 60;
      const y = 33;
      const h = 17;

      // Draw card background
      doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
      doc.setDrawColor(226, 232, 240); // soft border
      doc.rect(x, y, w, h, 'FD');

      // Draw left color accent border bar
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(x, y, w, 1.2, 'F');

      // Card Label
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(115, 115, 115); // cool neutral-400
      doc.text(kpi.label, x + 3, y + 5);

      // Card Value
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(kpi.value, x + 3, y + 12);
    });

    // Generate table data
    const pdfHeaders = [
      'Cód.',
      'Demanda / Detalhes',
      'Solicitante / Setor',
      'Categoria',
      'Profissionais Envolvidos',
      'Gravidade',
      'Status',
      'Datas (Abertura / Início / Fim)',
      'Tempo Atend. (Total)'
    ];
    
    const rows = filteredDemands.map(d => {
      const times = getElapsedTimesDetails(d);
      
      const checklistDone = d.checklist ? d.checklist.filter(item => item.completed).length : 0;
      const checklistTotal = d.checklist ? d.checklist.length : 0;
      const checklistText = checklistTotal > 0 ? `Checklist: ${checklistDone}/${checklistTotal}` : 'Sem checklist';

      // Title & Details
      const descSnippet = d.description ? (d.description.length > 70 ? d.description.slice(0, 68) + '...' : d.description) : 'Sem descrição';
      const demandColText = `${d.title}\n${descSnippet}\n[${checklistText}]`;

      // Profissionais Text (Responsável e Envolvidos Unified) without duplicates
      const allNamesStr = [d.assignedToName, ...(d.involvedNames || [])]
        .map(n => n?.trim())
        .filter(Boolean);
      const uniqueInvolvedList = Array.from(new Set(allNamesStr));
      const profsText = uniqueInvolvedList.length > 0 ? uniqueInvolvedList.join(', ') : 'Não designado';

      // Dates Info
      const openedStr = d.openedAt ? new Date(d.openedAt).toLocaleDateString('pt-BR') : '-';
      const startedStr = d.startedAt ? new Date(d.startedAt).toLocaleDateString('pt-BR') : 'Não inic.';
      const completedStr = d.completedAt ? new Date(d.completedAt).toLocaleDateString('pt-BR') : (d.status === 'Cancelada' ? 'Canc.' : 'Pend.');
      const datesColText = `Ab: ${openedStr}\nIn: ${startedStr}\nFim: ${completedStr}`;

      // Tempo de Atendimento / Trâmite
      const totalTime = times.totalTime || '0m';

      return [
        d.id,
        demandColText,
        d.requester,
        d.category || 'Sem Categoria',
        profsText,
        d.priority,
        d.status,
        datesColText,
        totalTime
      ];
    });

    // Use autoTable
    autoTable(doc, {
      startY: 54,
      head: [pdfHeaders],
      body: rows,
      theme: 'striped',
      headStyles: {
        fillColor: [58, 190, 185], // NovaCore brand color (#3abeb9)
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left'
      },
      styles: {
        fontSize: 6.5,
        cellPadding: 2,
        textColor: [30, 41, 59], // slate-800
        valign: 'middle'
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 13 },
        1: { cellWidth: 65 },
        2: { cellWidth: 26 },
        3: { cellWidth: 23 },
        4: { cellWidth: 56 },
        5: { halign: 'center', cellWidth: 16 },
        6: { halign: 'center', cellWidth: 18 },
        7: { cellWidth: 27 },
        8: { cellWidth: 24 }
      },
      didParseCell: (data: any) => {
        if (data.section === 'body') {
          // Priority coloring is at index 5
          if (data.column.index === 5) {
            const cellValue = data.cell.raw;
            if (cellValue === 'Crítica') {
              data.cell.styles.textColor = [185, 28, 28]; // red-700
              data.cell.styles.fontStyle = 'bold';
            } else if (cellValue === 'Alta') {
              data.cell.styles.textColor = [194, 65, 12]; // orange-700
              data.cell.styles.fontStyle = 'bold';
            } else if (cellValue === 'Média') {
              data.cell.styles.textColor = [180, 83, 9]; // amber-700
            }
          }
          // Status coloring is at index 6
          if (data.column.index === 6) {
            const cellValue = data.cell.raw;
            if (cellValue === 'Concluída') {
              data.cell.styles.textColor = [22, 101, 52]; // green-800
              data.cell.styles.fontStyle = 'bold';
            } else if (cellValue === 'Cancelada') {
              data.cell.styles.textColor = [156, 163, 175]; // slate-400
            } else if (cellValue === 'Em execução') {
              data.cell.styles.textColor = [58, 190, 185]; // brand color
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    });

    // Add page numbers footer to each page
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      
      // Left aligned: copyright
      doc.text(`NovaCore Ops © ${new Date().getFullYear()} - Gestão Interna de Demandas`, 14, 200);
      
      // Right aligned: page X of Y
      doc.text(`Página ${i} de ${pageCount}`, 260, 200);
    }

    // Save actual downloadable PDF file!
    doc.save(`historico_demandas_novacore_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const isOverdue = (dem: Demand) => {
    if (!dem.dueDate) return false;
    if (dem.status === 'Concluída' || dem.status === 'Cancelada') return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const due = new Date(dem.dueDate + 'T23:59:59');
    return due.getTime() < today.getTime();
  };

  const statuses: string[] = [
    'Todos', 
    'Em aberto', 
    'Em execução', 
    'Concluída', 
    'Cancelada'
  ];

  const priorities = ['Todos', 'Baixa', 'Média', 'Alta', 'Crítica'];

  // Metrics calculation
  const emAndamentoCount = demands.filter(d => (isAdmin || isMyDemand(d)) && d.status === 'Em execução').length;
  const concluidasCount = demands.filter(d => (isAdmin || isMyDemand(d)) && d.status === 'Concluída').length;

  const getFirstName = () => {
    if (!currentUserProfile?.name) return 'Suporte';
    const parts = currentUserProfile.name.split(' ');
    return parts[0];
  };

  const itemsPerPage = 15;
  const totalPages = Math.ceil(filteredDemands.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedDemands = filteredDemands.slice(startIndex, startIndex + itemsPerPage);
  const demandsToRender = mode === 'historico' ? paginatedDemands : filteredDemands;

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header based on active mode */}
      {mode === 'inicio' ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-1 text-left">
          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Olá, {getFirstName()}
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Acompanhe o status das demandas e desempenho por setor em tempo real.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 py-1 text-left">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#3abeb9] uppercase tracking-widest">
              <History className="w-4 h-4" />
              <span>Histórico de Atividades</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Pesquisa e Histórico
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              {isAdmin 
                ? 'Filtre, busque e examine todas as demandas cadastradas no sistema.'
                : 'Acompanhe e audite o histórico de todas as suas demandas abertas ou envolvidas.'
              }
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={filteredDemands.length === 0}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:hover:bg-emerald-50 disabled:cursor-not-allowed text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-3xs cursor-pointer"
              title="Baixar planilha de dados compatível com Excel (exporta todas as páginas do filtro atual)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
            </button>
          </div>
        </div>
      )}

      {/* Metric/Activity Overview Cards - Only show in Início view */}
      {mode === 'inicio' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: EM ANDAMENTO */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-xs flex justify-between items-center relative overflow-hidden">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-amber-500 uppercase tracking-widest">
                <Activity className="w-3.5 h-3.5" />
                <span>Em Execução</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {emAndamentoCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shrink-0 shadow-xs border border-amber-100/50">
              <Activity className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Card 2: CONCLUÍDAS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100/90 shadow-xs flex justify-between items-center relative overflow-hidden">
            <div className="space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#3abeb9] uppercase tracking-widest">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Demandas Concluídas</span>
              </div>
              <p className="text-3xl font-extrabold text-slate-800 tracking-tight">
                {concluidasCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#e6f8f7] rounded-xl flex items-center justify-center text-[#3abeb9] shrink-0 shadow-xs border border-[#3abeb9]/10">
              <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>
        </div>
      )}

      {/* Section Divider */}
      <div className="flex items-center gap-2 pt-2">
        <span className={`${mode === 'inicio' ? 'text-amber-500' : 'text-[#3abeb9]'} text-[10px]`}>●</span>
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
          {mode === 'inicio' ? 'Demandas Ativas & Recentes' : 'Filtros de Pesquisa Avançada'}
        </h3>
      </div>

      {/* Grid of Search + Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100/90 shadow-2xs space-y-4">
        
        {/* Search */}
        <div className="relative group text-left">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3abeb9] transition-colors" />
          <input 
            type="text" 
            placeholder={mode === 'inicio' ? "Buscar por título, código (#DEM-XXX) ou solicitante..." : "Buscar todo o histórico..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-sm pl-11 pr-4 py-2.5 bg-slate-50/50 rounded-xl border border-slate-100 outline-none focus:bg-white focus:border-[#3abeb9] focus:ring-1 focus:ring-[#3abeb9]/20 transition-all font-medium"
          />
        </div>

        {/* Filter Selection Panel */}
        <div className={`grid grid-cols-1 ${mode === 'inicio' ? 'sm:grid-cols-2' : 'sm:grid-cols-3'} gap-3 text-left`}>
          
          {/* Status Select - Only show in Histórico / Archive view */}
          {mode !== 'inicio' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtrar por Status</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:bg-white focus:border-[#3abeb9] font-semibold text-slate-700"
              >
                {statuses.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          )}

          {/* Priority Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtrar por Prioridade</label>
            <select 
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:bg-white focus:border-[#3abeb9] font-semibold text-slate-700"
            >
              {priorities.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Category Select */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Filtrar por Categoria</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:bg-white focus:border-[#3abeb9] font-semibold text-slate-700"
            >
              <option value="Todos">Todos</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

        </div>

      </div>

      {/* Demand Cards List */}
      <div className="space-y-3.5">
        {demandsToRender.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-slate-300" />
            <div className="text-left md:text-center">
              <h4 className="text-sm font-bold text-slate-700">Nenhuma demanda encontrada</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">Tente reajustar seus termos de busca ou filtros selecionados</p>
            </div>
          </div>
        ) : (
          demandsToRender.map((dem) => {
            const isCritical = dem.priority === 'Crítica';
            const formattedTime = dem.openedAt 
              ? new Date(dem.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
              : '00:00';
            const formattedDate = dem.openedAt 
              ? new Date(dem.openedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).toUpperCase() 
              : '01 JUN';

            const overdueVal = isOverdue(dem);

            return (
              <div 
                key={dem.id}
                onClick={() => onSelectDemand(dem)}
                className={`bg-white p-5 rounded-2xl shadow-2xs cursor-pointer hover:shadow-md transition-all duration-200 flex flex-col gap-3 group border-l-4 ${
                  overdueVal 
                    ? 'border border-red-500 border-l-red-500 ring-2 ring-red-100/50 bg-red-50/5' 
                    : `border border-slate-100/90 ${isCritical ? 'border-l-red-500' : 'border-l-[#3abeb9]'}`
                }`}
              >
                {/* Row 1: ID, Category & Status Pill */}
                <div className="flex justify-between items-center w-full gap-2 text-left">
                  <div className="flex items-center gap-2.5">
                    <span className="bg-slate-900 text-white font-mono font-black px-2.5 py-0.5 rounded text-xs tracking-wide shadow-2xs">
                      {dem.id}
                    </span>
                    <span className="text-slate-500 font-extrabold text-xs uppercase tracking-wider">
                      {dem.category}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusBadgeStyles(dem.status)}`}>
                    {dem.status}
                  </span>
                </div>

                {/* Row 2: Title, details, requester & action button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full text-left">
                  <div className="space-y-2 flex-1 min-w-0">
                    <h5 className="text-[17px] font-extrabold text-slate-900 leading-snug group-hover:text-[#3abeb9] transition-colors flex items-center gap-2 flex-wrap">
                      {dem.title}
                      {overdueVal && (
                        <span className="bg-red-500 text-white text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow-sm">
                          Vencido
                        </span>
                      )}
                      {dem.observation && (
                        <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full border border-emerald-250 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-500" /> Obs
                        </span>
                      )}
                    </h5>
                    
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {/* Requester badge */}
                      <span className="bg-slate-100 text-slate-700 font-extrabold px-2.5 py-1 rounded text-xs uppercase border border-slate-200/50">
                        {dem.requester.split('/')[0].trim()}
                      </span>

                      {/* Priority badge */}
                      <span className={`px-2.5 py-1 rounded text-xs uppercase font-extrabold tracking-wider border ${getPriorityStyles(dem.priority)}`}>
                        {dem.priority}
                      </span>

                      {/* Involved professionals badge (Unified) */}
                      {(() => {
                        const allNamesStr = [dem.assignedToName, ...(dem.involvedNames || [])]
                          .map(n => n?.trim())
                          .filter(Boolean);
                        const uniqueInvolved = Array.from(new Set(allNamesStr));

                        if (uniqueInvolved.length === 0) return null;

                        return (
                          <span className="bg-[#e6f8f7] text-[#2ba39e] font-extrabold px-2.5 py-1 rounded text-xs uppercase border border-[#3abeb9]/15 max-w-[340px] truncate" title={uniqueInvolved.join(', ')}>
                            Envolvidos: {uniqueInvolved.join(', ').toUpperCase()}
                          </span>
                        );
                      })()}

                      {/* Duo Date badge */}
                      {dem.dueDate && (
                        <span className={`px-2.5 py-1 rounded text-xs uppercase font-extrabold tracking-wider border flex items-center gap-1 shrink-0 ${
                          overdueVal 
                            ? 'bg-red-50 border-red-200 text-red-700' 
                            : 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        }`}>
                          <Calendar className="w-3.5 h-3.5" /> Prazo: {dem.dueDate.split('-').reverse().join('/')}
                        </span>
                      )}
                    </div>

                    {/* Datetime label */}
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider pt-1">
                      ABERTURA: {formattedTime} • {formattedDate}
                    </p>
                  </div>

                  {/* Far right details button */}
                  <div className="flex items-center justify-end shrink-0 pl-1 select-none">
                    <span className="text-[#3abeb9] font-black text-xs uppercase tracking-wider flex items-center gap-0.5 group-hover:opacity-80 transition-opacity">
                      DETALHES <ChevronRight className="w-4 h-4 text-[#3abeb9]" />
                    </span>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {mode === 'historico' && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 pt-5 mt-6">
          <div className="text-xs text-slate-500 font-semibold order-2 sm:order-1">
            Mostrando <span className="font-bold text-[#3abeb9]">{startIndex + 1}</span> até{" "}
            <span className="font-bold text-[#3abeb9]">
              {Math.min(startIndex + itemsPerPage, filteredDemands.length)}
            </span>{" "}
            de <span className="font-bold text-[#3abeb9]">{filteredDemands.length}</span> demandas
          </div>
          <div className="flex gap-1.5 order-1 sm:order-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={activePage === 1}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
              if (page === 1 || page === totalPages || Math.abs(page - activePage) <= 1) {
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      activePage === page
                        ? 'bg-[#3abeb9] border-[#3abeb9] text-white shadow-3xs font-extrabold'
                        : 'border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              }
              if (page === 2 && activePage > 3) {
                return <span key="ellipsis-left" className="px-1 text-slate-400 text-xs self-center select-none font-bold">...</span>;
              }
              if (page === totalPages - 1 && activePage < totalPages - 2) {
                return <span key="ellipsis-right" className="px-1 text-slate-400 text-xs self-center select-none font-bold">...</span>;
              }
              return null;
            })}
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={activePage === totalPages}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              Próximo
            </button>
          </div>
        </div>
      )}

      {/* Optimized dynamic page expansion for the Spark plan */}
      {mode === 'historico' && hasMoreHistorical && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMoreHistorical}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 text-xs font-extrabold rounded-xl border border-slate-200 transition-all flex items-center gap-2 cursor-pointer shadow-3xs active:scale-95"
          >
            {isLoadingMore ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#3abeb9] border-t-transparent rounded-full animate-spin"></span>
                <span>Buscando registros no banco...</span>
              </>
            ) : (
              <span>Carregar mais histórico de demandas</span>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
