import React from 'react';
import { ShieldAlert, LogOut, CheckCircle2, Clock } from 'lucide-react';
import { UserProfile } from '../types';
import { logoutUser } from '../lib/firebase';

interface BlockedOrPendingViewProps {
  user: UserProfile;
  onLogout: () => void;
}

export default function BlockedOrPendingView({ user, onLogout }: BlockedOrPendingViewProps) {
  const isBlocked = user.status === 'Bloqueado';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-8 text-center space-y-6">
        
        {/* Brand */}
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
            NovaCore <span className="text-[#3abeb9] font-bold">Ops</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Controle de Atividades Internas
          </p>
        </div>

        {/* Status Illustration */}
        <div className="py-4">
          {isBlocked ? (
            <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mx-auto">
              <ShieldAlert className="w-10 h-10" />
            </div>
          ) : (
            <div className="w-20 h-20 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-center text-amber-500 mx-auto">
              <Clock className="w-10 h-10" />
            </div>
          )}
        </div>

        {/* Text descriptions */}
        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-800">
            {isBlocked ? 'Acesso Suspenso' : 'Aguardando Aprovação'}
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            {isBlocked 
              ? `Olá, ${user.name}. Sua conta vinculada ao e-mail ${user.email} foi suspensa por um Administrador.` 
              : `Olá, ${user.name}. Seu cadastro com o e-mail ${user.email} foi enviado com sucesso e está aguardando liberação.`
            }
          </p>
          <div className="pt-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${
              isBlocked 
                ? 'bg-rose-50 text-[#f05252] border-rose-200/50' 
                : 'bg-amber-50 text-amber-600 border-amber-200/50'
            }`}>
              {isBlocked ? 'Status: Bloqueado' : 'Status: Pendente de Liberação'}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100 space-y-1.5">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">O que fazer agora?</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            {isBlocked
              ? 'Caso ache que isso seja um erro de permissão, entre em contato diretamente com a diretoria de suporte ou coordenação do Painel.'
              : 'Solicite a um coordenador ou administrador para acessar a aba "Configurações" e clicar no botão "APROVAR" no seu perfil.'
            }
          </p>
        </div>

        {/* Logout action */}
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 py-3 rounded-2xl text-slate-600 font-extrabold text-sm transition-all active:scale-98 cursor-pointer border border-slate-200/20"
        >
          <LogOut className="w-4 h-4" /> Sair da Conta
        </button>

      </div>
    </div>
  );
}
