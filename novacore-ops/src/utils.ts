import { StatusType } from './types';

export function formatTimeElapsed(seconds: number): string {
  if (!seconds || seconds <= 0) return '0 seg';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

export function formatDateTimeBR(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function formatRelativeDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);

    if (diffSec < 60) {
      return 'Agora mesmo';
    } else if (diffMin < 60) {
      return `Há ${diffMin} min`;
    } else if (diffHr < 24) {
      return `Há ${diffHr}h`;
    } else if (diffDays === 1) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  } catch {
    return '';
  }
}

export function getStatusBadgeStyles(status: StatusType): string {
  switch (status) {
    case 'Em aberto':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Em execução':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Concluída':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Cancelada':
      return 'bg-red-50 text-red-600 border-red-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

export function getPriorityStyles(priority: string): string {
  switch (priority) {
    case 'Baixa':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'Média':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Alta':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Crítica':
      return 'bg-red-100 text-red-800 border-red-300 font-bold';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}
