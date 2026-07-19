import React from 'react';
import { 
  Shield, 
  Users, 
  UserCheck, 
  Lock, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Briefcase 
} from 'lucide-react';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLogin: (user: UserProfile) => void;
  isLoading: boolean;
  error?: string | null;
  onClearError?: () => void;
}

// Available demo users for portfolio review
const demoUsers: (UserProfile & { badge: string; description: string; capabilities: string[] })[] = [
  {
    uid: 'admin-uid',
    name: 'João Martins',
    email: 'admin@novacore.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    role: 'Administrador',
    status: 'Aprovado',
    badge: 'Controle Total',
    description: 'Acesso completo a todas as funções operacionais, analíticas e administrativas.',
    capabilities: ['Quadro Kanban editável', 'Histórico completo de demandas', 'Gráficos de SLA e desempenho', 'Configurações de categorias, setores e usuários']
  },
  {
    uid: 'gestor-uid',
    name: 'Mariana Silveira',
    email: 'mariana@novacore.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    role: 'Gestor',
    status: 'Aprovado',
    badge: 'Gestão Geral',
    description: 'Responsável pelo monitoramento operacional e aprovação de fluxos corporativos.',
    capabilities: ['Quadro Kanban completo', 'Histórico de demandas', 'Gráficos de indicadores de SLA', 'Acesso a áreas de controle']
  },
  {
    uid: 'colab-uid',
    name: 'Carlos Silva',
    email: 'carlos@novacore.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    role: 'Colaborador',
    status: 'Aprovado',
    badge: 'Executor / Técnico',
    description: 'Profissional focado em executar tarefas, atualizar status e registrar logs.',
    capabilities: ['Movimentação de etapas no Kanban', 'Atualização de observações e checklists', 'Acesso ao histórico de demandas executadas']
  },
  {
    uid: 'user-uid',
    name: 'Maria Oliveira',
    email: 'maria@novacore.com',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
    role: 'Usuário Comum',
    status: 'Aprovado',
    badge: 'Requisitante',
    description: 'Pode abrir novas solicitações e acompanhar o progresso em tempo real.',
    capabilities: ['Criação de novas demandas', 'Visualização simples do Kanban de status', 'Acompanhamento de andamento de chamados']
  },
  {
    uid: 'pending-uid',
    name: 'Pedro Santos',
    email: 'pedro@novacore.com',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    role: 'Usuário Comum',
    status: 'Pendente',
    badge: 'Restrito',
    description: 'Demonstra a tela de segurança padrão quando um usuário novo se cadastra.',
    capabilities: ['Bloqueio automático de navegação', 'Mensagem intuitiva de pendência', 'Botão proeminente para deslogar']
  }
];

export default function LoginView({ onLogin, isLoading }: LoginViewProps) {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden">
      
      {/* Background soft ambient lights */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#3abeb9]/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#2bbbb5]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-5xl space-y-8 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-[#3abeb9]/10 border border-[#3abeb9]/20 flex items-center justify-center text-[#3abeb9] shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.25} stroke="currentColor" className="w-7 h-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
              NovaCore <span className="text-[#3abeb9] font-bold">Ops</span>
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400 uppercase tracking-widest">
              Ambiente de Demonstração Interativa
            </p>
          </div>
          <div className="max-w-2xl mx-auto bg-[#3abeb9]/5 border border-[#3abeb9]/10 rounded-2xl p-4 text-slate-600 text-xs sm:text-sm font-semibold leading-relaxed">
            Bem-vindo ao sistema de controle de demandas e SLA da <strong>NovaCore Ops</strong>. 
            Esta é uma versão anonimizada e segura preparada para o portfólio. 
            Por favor, escolha um dos perfis abaixo para explorar as permissões e recursos da plataforma.
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoUsers.map((user) => {
            const isAdmin = user.role === 'Administrador';
            const isPending = user.status === 'Pendente';
            const isCollaborator = user.role === 'Colaborador';
            const isManager = user.role === 'Gestor';

            let accentBorder = 'hover:border-slate-300';
            let iconColor = 'text-slate-400';
            if (isAdmin) {
              accentBorder = 'hover:border-amber-400/80';
              iconColor = 'text-amber-500';
            } else if (isManager) {
              accentBorder = 'hover:border-blue-400/80';
              iconColor = 'text-blue-500';
            } else if (isCollaborator) {
              accentBorder = 'hover:border-[#3abeb9]/80';
              iconColor = 'text-[#3abeb9]';
            } else if (isPending) {
              accentBorder = 'hover:border-rose-400/80';
              iconColor = 'text-rose-500';
            }

            return (
              <div 
                key={user.uid}
                onClick={() => !isLoading && onLogin({
                  uid: user.uid,
                  name: user.name,
                  email: user.email,
                  avatarUrl: user.avatarUrl,
                  role: user.role,
                  status: user.status,
                  createdAt: user.createdAt
                })}
                className={`group bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 flex flex-col justify-between transition-all duration-300 hover:shadow-md cursor-pointer ${accentBorder} active:scale-98`}
              >
                <div className="space-y-3.5">
                  {/* Header / Avatar & Role */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={user.avatarUrl} 
                        alt={user.name} 
                        className="w-11 h-11 rounded-full border-2 border-slate-50 object-cover shrink-0"
                      />
                      <div>
                        <h4 className="text-sm font-black text-slate-800 leading-tight group-hover:text-[#3abeb9] transition-colors">
                          {user.name}
                        </h4>
                        <span className="text-[10px] font-black text-slate-400 tracking-wider block mt-0.5">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges & Description */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="bg-slate-50 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200/60 uppercase tracking-wider">
                        {user.role}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        isAdmin ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        isManager ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        isCollaborator ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        isPending ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {user.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                      {user.description}
                    </p>
                  </div>

                  {/* Capabilities Bullet points */}
                  <div className="border-t border-slate-50 pt-3 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Recursos habilitados:</p>
                    <ul className="space-y-1">
                      {user.capabilities.map((cap, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 font-medium leading-normal">
                          <CheckCircle className={`w-3 h-3 shrink-0 mt-0.5 ${iconColor}`} />
                          <span>{cap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Selection Action Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  className="w-full py-2.5 bg-slate-50 text-slate-700 group-hover:bg-[#3abeb9] group-hover:text-white font-extrabold text-xs rounded-xl transition-all duration-300 flex items-center justify-center gap-2 border border-slate-100 shadow-2xs group-hover:border-transparent group-hover:shadow-sm"
                >
                  <UserCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>Acessar Perfil</span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer info & Tech Info */}
        <div className="text-center space-y-1 pt-4 border-t border-slate-200/40">
          <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">
            Tecnologias Demonstradas: React 19 • TypeScript • Tailwind CSS v4 • Lucide Icons • Recharts • Local Persistence
          </p>
          <p className="text-[10px] text-slate-400 font-semibold leading-normal">
            Todos os dados, modificações, movimentações de status e logs realizados serão salvos localmente no seu navegador para simular a fidelidade do banco de dados.
          </p>
        </div>

      </div>
    </div>
  );
}
