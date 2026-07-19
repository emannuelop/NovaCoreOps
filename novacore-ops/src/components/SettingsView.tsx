import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Layers, 
  Shield, 
  XOctagon, 
  Check, 
  Lock, 
  Unlock,
  Plus,
  Trash2,
  Edit2,
  FolderLock,
  Ban,
  CheckCircle2,
  SquareDot,
  ToggleLeft,
  ToggleRight,
  FolderDot,
  AlertTriangle
} from 'lucide-react';
import { UserProfile, Category, Sector, Demand, Professional } from '../types';
import { 
  updateUserProfile, 
  deleteUser,
  saveCategory, 
  deleteCategory, 
  saveSector, 
  deleteSector,
  saveProfessional,
  deleteProfessional,
  auth
} from '../lib/firebase';
import { useIsAdmin } from '../hooks/useIsAdmin';

interface SettingsViewProps {
  users: UserProfile[];
  currentUserProfile: UserProfile | null;
  categories: Category[];
  onRefreshCategories: () => void;
  sectors: Sector[];
  onRefreshSectors: () => void;
  professionals: Professional[];
  onRefreshProfessionals: () => void;
  demands: Demand[];
  onRefreshUsers?: () => void;
}

export default function SettingsView({ 
  users, 
  currentUserProfile,
  categories,
  onRefreshCategories,
  sectors,
  onRefreshSectors,
  professionals,
  onRefreshProfessionals,
  demands,
  onRefreshUsers
}: SettingsViewProps) {
  // Tabs: 'usuarios' | 'categorias' | 'setores'
  const [activeSubTab, setActiveSubTab] = useState<'usuarios' | 'categorias' | 'setores'>('usuarios');

  // User management filter: 'Todos' | 'Pendentes' | 'Liberados' | 'Bloqueados'
  const [userFilter, setUserFilter] = useState<'Todos' | 'Pendentes' | 'Liberados' | 'Bloqueados'>('Todos');

  // Active/Inactive filters
  const [catFilter, setCatFilter] = useState<'active' | 'inactive'>('active');
  const [secFilter, setSecFilter] = useState<'active' | 'inactive'>('active');
  const [profFilter, setProfFilter] = useState<'active' | 'inactive'>('active');

  // Check if current user is admin to perform actions using centralized hook
  const isAdmin = useIsAdmin(currentUserProfile);

  // New Category form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [catError, setCatError] = useState('');

  // Edit Category state
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDesc, setEditCatDesc] = useState('');

  // New Sector form state
  const [newSecName, setNewSecName] = useState('');
  const [newSecDesc, setNewSecDesc] = useState('');
  const [secError, setSecError] = useState('');

  // Edit Sector state
  const [editingSecId, setEditingSecId] = useState<string | null>(null);
  const [editSecName, setEditSecName] = useState('');
  const [editSecDesc, setEditSecDesc] = useState('');

  // New Professional form state
  const [newProfName, setNewProfName] = useState('');
  const [newProfDesc, setNewProfDesc] = useState('');
  const [profError, setProfError] = useState('');

  // Edit Professional state
  const [editingProfId, setEditingProfId] = useState<string | null>(null);
  const [editProfName, setEditProfName] = useState('');
  const [editProfDesc, setEditProfDesc] = useState('');

  // Secure state-based delete confirmation to guarantee 100% iframe compatibility
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'category' | 'sector' | 'professional';
    id: string;
    name: string;
    inUse: boolean;
  } | null>(null);
  const [isDeletingState, setIsDeletingState] = useState(false);

  // General messages and user delete target
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);
  const [userDeleteTarget, setUserDeleteTarget] = useState<UserProfile | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeletingState(true);
    setGeneralError(null);
    setGeneralSuccess(null);
    try {
      if (deleteTarget.type === 'category') {
        await deleteCategory(deleteTarget.id);
        onRefreshCategories();
      } else if (deleteTarget.type === 'sector') {
        await deleteSector(deleteTarget.id);
        onRefreshSectors();
      } else if (deleteTarget.type === 'professional') {
        await deleteProfessional(deleteTarget.id);
        onRefreshProfessionals();
      }
      setGeneralSuccess(`Item "${deleteTarget.name}" excluído com sucesso.`);
      setDeleteTarget(null);
    } catch (err) {
      setGeneralError(`Erro ao excluir ${deleteTarget.type === 'category' ? 'categoria' : deleteTarget.type === 'sector' ? 'setor' : 'profissional'}.`);
    } finally {
      setIsDeletingState(false);
    }
  };

  const handleToggleAdmin = async (user: UserProfile) => {
    setGeneralError(null);
    setGeneralSuccess(null);
    if (!isAdmin) {
      setGeneralError('Apenas Administradores podem alterar permissões.');
      return;
    }
    try {
      const newRole = user.role === 'Administrador' ? 'Usuário Comum' : 'Administrador';
      await updateUserProfile(user.uid, { role: newRole });
      setGeneralSuccess(`Função do usuário ${user.name} atualizada para ${newRole}.`);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      console.error(err);
      setGeneralError('Erro ao alterar cargo do usuário.');
    }
  };

  const handleToggleBlock = async (user: UserProfile) => {
    setGeneralError(null);
    setGeneralSuccess(null);
    if (!isAdmin) {
      setGeneralError('Apenas Administradores podem bloquear/desbloquear usuários.');
      return;
    }
    try {
      const newStatus = user.status === 'Bloqueado' ? 'Aprovado' : 'Bloqueado';
      await updateUserProfile(user.uid, { status: newStatus });
      setGeneralSuccess(`Status do usuário ${user.name} alterado para ${newStatus === 'Bloqueado' ? 'Bloqueado' : 'Ativo/Liberado'}.`);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      console.error(err);
      setGeneralError('Erro ao alterar status de bloqueio do usuário.');
    }
  };

  const handleApprove = async (user: UserProfile) => {
    setGeneralError(null);
    setGeneralSuccess(null);
    if (!isAdmin) {
      setGeneralError('Apenas Administradores podem aprovar usuários.');
      return;
    }
    try {
      await updateUserProfile(user.uid, { status: 'Aprovado' });
      setGeneralSuccess(`Usuário ${user.name} aprovado com sucesso.`);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      console.error(err);
      setGeneralError('Erro ao aprovar usuário.');
    }
  };

  const handleDeleteUser = (user: UserProfile) => {
    setGeneralError(null);
    setGeneralSuccess(null);
    if (!isAdmin) {
      setGeneralError('Apenas Administradores podem excluir usuários.');
      return;
    }
    setUserDeleteTarget(user);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userDeleteTarget) return;
    setIsDeletingUser(true);
    try {
      await deleteUser(userDeleteTarget.uid);
      setGeneralSuccess(`Usuário ${userDeleteTarget.name} excluído com sucesso.`);
      setUserDeleteTarget(null);
      if (onRefreshUsers) onRefreshUsers();
    } catch (err) {
      console.error(err);
      setGeneralError(`Erro ao excluir o usuário ${userDeleteTarget.name}.`);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // CATEGORIES CRUD
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    if (!isAdmin) {
      setCatError('Apenas administradores podem cadastrar categorias.');
      return;
    }
    if (!newCatName.trim()) {
      setCatError('O nome do setor/categoria é obrigatório.');
      return;
    }

    // Check if name already exists
    const exists = categories.some(
      c => c.name.toLowerCase() === newCatName.trim().toLowerCase()
    );
    if (exists) {
      setCatError('Uma categoria com este nome já existe.');
      return;
    }

    const catId = `cat-${Date.now()}`;
    const newCat: Category = {
      id: catId,
      name: newCatName.trim(),
      description: newCatDesc.trim(),
      createdAt: new Date().toISOString(),
      inactive: false
    };

    try {
      await saveCategory(newCat);
      setNewCatName('');
      setNewCatDesc('');
      onRefreshCategories();
    } catch (err) {
      setCatError('Erro ao salvar categoria.');
    }
  };

  const handleStartEditCat = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
    setEditCatDesc(cat.description || '');
  };

  const handleSaveEditCat = async (cat: Category) => {
    setCatError('');
    if (!editCatName.trim()) {
      setCatError('O nome não pode ser vazio.');
      return;
    }

    // Check if name already exists in others
    const exists = categories.some(
      c => c.id !== cat.id && c.name.toLowerCase() === editCatName.trim().toLowerCase()
    );
    if (exists) {
      setCatError('Uma categoria com este nome já existe.');
      return;
    }

    const updated: Category = {
      ...cat,
      name: editCatName.trim(),
      description: editCatDesc.trim()
    };

    try {
      await saveCategory(updated);
      setEditingCatId(null);
      onRefreshCategories();
    } catch (err) {
      setCatError('Erro ao atualizar categoria.');
    }
  };

  const handleToggleCatInactive = async (cat: Category) => {
    setGeneralError(null);
    const updated: Category = {
      ...cat,
      inactive: !cat.inactive
    };
    try {
      await saveCategory(updated);
      onRefreshCategories();
    } catch (err) {
      setGeneralError('Erro ao alterar status da categoria.');
    }
  };

  const handleDeleteCat = (cat: Category) => {
    setDeleteTarget({
      type: 'category',
      id: cat.id,
      name: cat.name,
      inUse: demands.some(d => d.category === cat.name)
    });
  };

  // SECTORS CRUD
  const handleAddSector = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError('');
    if (!isAdmin) {
      setSecError('Apenas administradores podem cadastrar setores.');
      return;
    }
    if (!newSecName.trim()) {
      setSecError('O nome do setor é obrigatório.');
      return;
    }

    // Check duplication
    const exists = sectors.some(
      s => s.name.toLowerCase() === newSecName.trim().toLowerCase()
    );
    if (exists) {
      setSecError('Um setor com este nome já existe.');
      return;
    }

    const secId = `sec-${Date.now()}`;
    const newSec: Sector = {
      id: secId,
      name: newSecName.trim(),
      description: newSecDesc.trim(),
      createdAt: new Date().toISOString(),
      inactive: false
    };

    try {
      await saveSector(newSec);
      setNewSecName('');
      setNewSecDesc('');
      onRefreshSectors();
    } catch (err) {
      setSecError('Erro ao salvar setor.');
    }
  };

  const handleStartEditSec = (sec: Sector) => {
    setEditingSecId(sec.id);
    setEditSecName(sec.name);
    setEditSecDesc(sec.description || '');
  };

  const handleSaveEditSec = async (sec: Sector) => {
    setSecError('');
    if (!editSecName.trim()) {
      setSecError('O nome do setor não pode ser vazio.');
      return;
    }

    const exists = sectors.some(
      s => s.id !== sec.id && s.name.toLowerCase() === editSecName.trim().toLowerCase()
    );
    if (exists) {
      setSecError('Um setor com este nome já existe.');
      return;
    }

    const updated: Sector = {
      ...sec,
      name: editSecName.trim(),
      description: editSecDesc.trim()
    };

    try {
      await saveSector(updated);
      setEditingSecId(null);
      onRefreshSectors();
    } catch (err) {
      setSecError('Erro ao atualizar setor.');
    }
  };

  const handleToggleSecInactive = async (sec: Sector) => {
    setGeneralError(null);
    const updated: Sector = {
      ...sec,
      inactive: !sec.inactive
    };
    try {
      await saveSector(updated);
      onRefreshSectors();
    } catch (err) {
      setGeneralError('Erro ao alterar status do setor.');
    }
  };

  const handleDeleteSec = (sec: Sector) => {
    setDeleteTarget({
      type: 'sector',
      id: sec.id,
      name: sec.name,
      inUse: demands.some(d => d.requester === sec.name)
    });
  };

  // PROFESSIONALS CRUD
  const handleAddProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfError('');
    if (!isAdmin) {
      setProfError('Apenas administradores podem cadastrar profissionais.');
      return;
    }
    if (!newProfName.trim()) {
      setProfError('O nome do profissional é obrigatório.');
      return;
    }

    // Check duplication
    const exists = professionals.some(
      p => p.name.toLowerCase() === newProfName.trim().toLowerCase()
    );
    if (exists) {
      setProfError('Um profissional com este nome já existe.');
      return;
    }

    const profId = `prof-${Date.now()}`;
    const newProf: Professional = {
      id: profId,
      name: newProfName.trim(),
      description: newProfDesc.trim(),
      createdAt: new Date().toISOString(),
      inactive: false
    };

    try {
      await saveProfessional(newProf);
      setNewProfName('');
      setNewProfDesc('');
      onRefreshProfessionals();
    } catch (err) {
      setProfError('Erro ao salvar profissional.');
    }
  };

  const handleStartEditProf = (prof: Professional) => {
    setEditingProfId(prof.id);
    setEditProfName(prof.name);
    setEditProfDesc(prof.description || '');
  };

  const handleSaveEditProf = async (prof: Professional) => {
    setProfError('');
    if (!editProfName.trim()) {
      setProfError('O nome do profissional não pode ser vazio.');
      return;
    }

    const exists = professionals.some(
      p => p.id !== prof.id && p.name.toLowerCase() === editProfName.trim().toLowerCase()
    );
    if (exists) {
      setProfError('Um profissional com este nome já existe.');
      return;
    }

    const updated: Professional = {
      ...prof,
      name: editProfName.trim(),
      description: editProfDesc.trim()
    };

    try {
      await saveProfessional(updated);
      setEditingProfId(null);
      onRefreshProfessionals();
    } catch (err) {
      setProfError('Erro ao atualizar profissional.');
    }
  };

  const handleToggleProfInactive = async (prof: Professional) => {
    setGeneralError(null);
    const updated: Professional = {
      ...prof,
      inactive: !prof.inactive
    };
    try {
      await saveProfessional(updated);
      onRefreshProfessionals();
    } catch (err) {
      setGeneralError('Erro ao alterar status do profissional.');
    }
  };

  const handleDeleteProf = (prof: Professional) => {
    setDeleteTarget({
      type: 'professional',
      id: prof.id,
      name: prof.name,
      inUse: demands.some(d => d.involvedUids?.includes(prof.id) || d.involvedNames?.includes(prof.name))
    });
  };


  // Helper styles for user statuses
  const getStatusBadge = (status?: string) => {
    const currentStatus = status || 'Pendente';
    if (currentStatus === 'Aprovado') {
      return (
        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200/60 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
          Aprovado
        </span>
      );
    } else if (currentStatus === 'Bloqueado') {
      return (
        <span className="bg-rose-50 text-rose-600 border border-rose-200/60 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
          Bloqueado
        </span>
      );
    } else {
      return (
        <span className="bg-amber-50 text-amber-600 border border-amber-200/60 font-black text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider">
          Pendente
        </span>
      );
    }
  };

  // Filter logic for users list
  const filteredUsers = users.filter((user) => {
    const status = user.status || 'Pendente';
    if (userFilter === 'Pendentes') {
      return status === 'Pendente';
    }
    if (userFilter === 'Liberados') {
      return status === 'Aprovado';
    }
    if (userFilter === 'Bloqueados') {
      return status === 'Bloqueado';
    }
    return true; // 'Todos'
  });

  return (
    <div className="space-y-6 text-left">
      
      {/* Settings Screen Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-[#3abeb9] uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          <span>Painel de Controle</span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Configurações
        </h2>
      </div>

      {/* Settings Sub Tabs (Usuários vs Categorias vs Setores) */}
      <div className="bg-slate-100/80 p-1.5 rounded-2xl max-w-md flex border border-slate-200/30">
        <button 
          onClick={() => setActiveSubTab('usuarios')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSubTab === 'usuarios'
              ? 'bg-white text-[#3abeb9] shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" /> Usuários
        </button>
        <button 
          onClick={() => setActiveSubTab('categorias')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSubTab === 'categorias'
              ? 'bg-white text-[#3abeb9] shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FolderDot className="w-4 h-4" /> Categorias
        </button>
        <button 
          onClick={() => setActiveSubTab('setores')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeSubTab === 'setores'
              ? 'bg-white text-[#3abeb9] shadow-xs'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" /> Setores
        </button>
      </div>

      {generalError && (
        <div className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-100">
          <span>{generalError}</span>
          <button onClick={() => setGeneralError(null)} className="text-red-400 hover:text-red-700 font-bold ml-2 cursor-pointer">X</button>
        </div>
      )}
      {generalSuccess && (
        <div className="bg-teal-50 text-teal-800 border border-teal-100 text-xs font-semibold px-4 py-3 rounded-2xl flex items-center justify-between animate-in fade-in duration-100">
          <span>{generalSuccess}</span>
          <button onClick={() => setGeneralSuccess(null)} className="text-teal-400 hover:text-teal-800 font-bold ml-2 cursor-pointer">X</button>
        </div>
      )}

      {activeSubTab === 'usuarios' && (
        <div className="bg-white rounded-3xl border border-slate-100/90 shadow-xs overflow-hidden">
          
          {/* Card Header with Filtering Controls */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">
                Controle e Liberação de Usuários
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Aprove e bloqueie o acesso dos funcionários de forma simples e direta.
              </p>
            </div>

            {/* Segmented controls for tabs */}
            <div className="bg-[#f1f5f9] p-1 rounded-2xl flex items-center border border-slate-200/50 self-start sm:self-auto shrink-0 shadow-2xs">
              {(['Todos', 'Pendentes', 'Liberados', 'Bloqueados'] as const).map((tab) => {
                const isActive = userFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setUserFilter(tab)}
                    className={`px-3.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all ${
                      isActive
                        ? 'bg-white text-[#2ba39e] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Users List */}
          <div className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-semibold">
                Nenhum usuário encontrado para esta seleção.
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isUserAdmin = user.role === 'Administrador';
                const isUserBlocked = user.status === 'Bloqueado';
                const isUserPending = !user.status || user.status === 'Pendente';
                const isSelf = user.uid === currentUserProfile?.uid;

                return (
                  <div key={user.uid} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 transition-colors">
                    
                    {/* User Info (Left) */}
                    <div className="flex items-start gap-3.5 w-full md:w-auto">
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name} 
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-full border border-slate-100 shadow-xs shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-200/50 shrink-0">
                          {user.name ? user.name.substring(0, 2).toUpperCase() : 'US'}
                        </div>
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-[15px] truncate">
                            {user.name}
                          </h4>
                          {getStatusBadge(user.status)}
                          {isSelf && (
                            <span className="bg-slate-100 text-slate-500 text-[8px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded border border-slate-200/40">
                              VOCÊ
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium truncate">
                          {user.email}
                        </p>
                        
                        <div className="pt-2 text-left">
                          <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">
                            CARGO
                          </div>
                          <div className="text-xs font-bold text-slate-700">
                            {user.role || 'Usuário Comum'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions Panel (Right) */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      {isUserPending && (
                        <button
                          onClick={() => handleApprove(user)}
                          disabled={!isAdmin}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> APROVAR
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleAdmin(user)}
                        disabled={!isAdmin || isSelf}
                        className={`px-3.5 py-2 border rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                          isUserAdmin
                            ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {isUserAdmin ? 'TORNAR COMUM' : 'TORNAR ADMIN'}
                      </button>

                      <button
                        onClick={() => handleToggleBlock(user)}
                        disabled={!isAdmin || isSelf}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer ${
                          isUserBlocked
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100/80 hover:bg-rose-100'
                        }`}
                      >
                        {isUserBlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> DESBLOQUEAR
                          </>
                        ) : (
                          <>
                            <XOctagon className="w-3.5 h-3.5" /> BLOQUEAR
                          </>
                        )}
                      </button>


                    </div>

                  </div>
                );
              })
            )}
          </div>

        </div>
      )}

      {activeSubTab === 'categorias' && (
        <div className="space-y-6">
          
          {/* Create Category Card (Horizontal style matching screenshot) */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-[15px] tracking-tight mb-4">
              <Plus className="w-4 h-4 text-[#3abeb9] stroke-[3]" />
              <span>Cadastrar Nova Categoria</span>
            </div>
            
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nome da Categoria (Ex: TI & Telecom, Urgência)"
                  disabled={!isAdmin}
                  className="w-full text-sm border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:border-[#3abeb9] focus:bg-white focus:ring-1 focus:ring-[#3abeb9]/30 transition-all disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={!isAdmin || !newCatName.trim()}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                Adicionar
              </button>
            </form>

            {catError && (
              <p className="text-red-500 text-[11px] font-semibold mt-2">{catError}</p>
            )}
            
            {!isAdmin && (
              <p className="text-slate-400 text-[10px] font-medium mt-2">Apenas administradores podem registrar categorias.</p>
            )}
          </div>

          {/* Categories List Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FolderDot className="w-5 h-5 text-slate-500" />
                <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">Categorias Cadastradas</h3>
              </div>

              {/* Status Pill Filters */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setCatFilter('active')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    catFilter === 'active'
                      ? 'border-2 border-slate-950 text-slate-900 bg-slate-50/50'
                      : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Ativos ({categories.filter(c => !c.inactive).length})
                </button>
                <button
                  type="button"
                  onClick={() => setCatFilter('inactive')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    catFilter === 'inactive'
                      ? 'border-2 border-slate-950 text-slate-900 bg-slate-50/50'
                      : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Inativos ({categories.filter(c => c.inactive).length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {categories.filter(c => catFilter === 'active' ? !c.inactive : c.inactive).length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                  Nenhuma categoria {catFilter === 'active' ? 'ativa' : 'inativa'} cadastrada.
                </div>
              ) : (
                categories
                  .filter(c => catFilter === 'active' ? !c.inactive : c.inactive)
                  .map((cat) => {
                  const isEditing = editingCatId === cat.id;
                  const isUsed = demands.some(d => d.category === cat.name);

                  return (
                    <div key={cat.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/20 transition-colors">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full text-left p-1">
                          <input 
                            type="text" 
                            value={editCatName} 
                            onChange={(e) => setEditCatName(e.target.value)} 
                            className="flex-1 w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#3abeb9]"
                            placeholder="Nome da Categoria"
                          />
                          <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button 
                              onClick={() => handleSaveEditCat(cat)}
                              className="px-3.5 py-2 bg-[#3abeb9] hover:bg-[#2bbbb5] text-white text-xs font-bold rounded-xl whitespace-nowrap"
                            >
                              Salvar
                            </button>
                            <button 
                              onClick={() => setEditingCatId(null)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl whitespace-nowrap"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-extrabold text-[15px] text-slate-800 ${cat.inactive ? 'text-slate-400 line-through font-bold' : ''}`}>
                              {cat.name}
                            </h4>
                            {cat.inactive && (
                              <span className="bg-rose-50 text-rose-600 border border-rose-100/50 font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase">
                                Inativo
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleCatInactive(cat)}
                            disabled={!isAdmin}
                            title={cat.inactive ? "Ativar Categoria" : "Inativar Categoria"}
                            className={`p-1.5 rounded-lg transition-colors border disabled:opacity-40 cursor-pointer ${
                              cat.inactive 
                                ? 'bg-rose-50 border-rose-150 text-rose-500 hover:bg-rose-100'
                                : 'bg-emerald-50 border-emerald-150 text-emerald-500 hover:bg-emerald-100'
                            }`}
                          >
                            {cat.inactive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Trigger */}
                          <button
                            onClick={() => handleStartEditCat(cat)}
                            disabled={!isAdmin}
                            title="Editar"
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-45 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>

                          {/* Delete Trigger */}
                          <button
                            onClick={() => handleDeleteCat(cat)}
                            disabled={!isAdmin}
                            title="Excluir permanentemente"
                            className="p-1.5 rounded-lg bg-rose-50/50 border border-rose-100/40 text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'setores' && (
        <div className="space-y-6">
          
          {/* Create Sector Card (Horizontal style matching screenshot) */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-2xs">
            <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-[15px] tracking-tight mb-4">
              <Plus className="w-4 h-4 text-[#3abeb9] stroke-[3]" />
              <span>Cadastrar Novo Setor</span>
            </div>
            
            <form onSubmit={handleAddSector} className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input 
                  type="text" 
                  value={newSecName}
                  onChange={(e) => setNewSecName(e.target.value)}
                  placeholder="Nome do Setor (Ex: Logística, Enfermagem)"
                  disabled={!isAdmin}
                  className="w-full text-sm border border-slate-200 bg-slate-50/50 rounded-xl px-4 py-3 outline-none focus:border-[#3abeb9] focus:bg-white focus:ring-1 focus:ring-[#3abeb9]/30 transition-all disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={!isAdmin || !newSecName.trim()}
                className="bg-[#0f172a] hover:bg-slate-800 text-white font-extrabold text-sm px-6 py-3 rounded-xl transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center justify-center"
              >
                Adicionar
              </button>
            </form>

            {secError && (
              <p className="text-red-500 text-[11px] font-semibold mt-2">{secError}</p>
            )}
            
            {!isAdmin && (
              <p className="text-slate-400 text-[10px] font-medium mt-2">Apenas administradores podem registrar setores.</p>
            )}
          </div>

          {/* Sectors List Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-slate-500" />
                <h3 className="font-extrabold text-[15px] text-slate-800 tracking-tight">Setores Cadastrados</h3>
              </div>

              {/* Status Pill Filters */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSecFilter('active')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    secFilter === 'active'
                      ? 'border-2 border-slate-950 text-slate-900 bg-slate-50/50'
                      : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Ativos ({sectors.filter(s => !s.inactive).length})
                </button>
                <button
                  type="button"
                  onClick={() => setSecFilter('inactive')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    secFilter === 'inactive'
                      ? 'border-2 border-slate-950 text-slate-900 bg-slate-50/50'
                      : 'border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  Inativos ({sectors.filter(s => s.inactive).length})
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {sectors.filter(s => secFilter === 'active' ? !s.inactive : s.inactive).length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs font-semibold">
                  Nenhum setor {secFilter === 'active' ? 'ativo' : 'inativo'} cadastrado.
                </div>
              ) : (
                sectors
                  .filter(s => secFilter === 'active' ? !s.inactive : s.inactive)
                  .map((sec) => {
                  const isEditing = editingSecId === sec.id;
                  const isUsed = demands.some(d => d.requester === sec.name);

                  return (
                    <div key={sec.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/20 transition-colors">
                      {isEditing ? (
                        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full text-left p-1">
                          <input 
                            type="text" 
                            value={editSecName} 
                            onChange={(e) => setEditSecName(e.target.value)} 
                            className="flex-1 w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#3abeb9]"
                            placeholder="Nome do Setor"
                          />
                          <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                            <button 
                              onClick={() => handleSaveEditSec(sec)}
                              className="px-3.5 py-2 bg-[#3abeb9] hover:bg-[#2bbbb5] text-white text-xs font-bold rounded-xl whitespace-nowrap"
                            >
                              Salvar
                            </button>
                            <button 
                              onClick={() => setEditingSecId(null)}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl whitespace-nowrap"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-left flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className={`font-extrabold text-[15px] text-slate-800 ${sec.inactive ? 'text-slate-400 line-through font-bold' : ''}`}>
                              {sec.name}
                            </h4>
                            {sec.inactive && (
                              <span className="bg-rose-50 text-rose-600 border border-rose-100/50 font-black text-[9px] px-1.5 py-0.5 rounded-md uppercase">
                                Inativo
                              </span>
                            )}
                          </div>
                          {sec.description && (
                            <p className="text-xs text-slate-400 font-medium mt-0.5">{sec.description}</p>
                          )}
                        </div>
                      )}

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle Active Status */}
                          <button
                            onClick={() => handleToggleSecInactive(sec)}
                            disabled={!isAdmin}
                            title={sec.inactive ? "Ativar Setor" : "Inativar Setor"}
                            className={`p-1.5 rounded-lg transition-colors border disabled:opacity-40 cursor-pointer ${
                              sec.inactive 
                                ? 'bg-rose-50 border-rose-150 text-rose-500 hover:bg-rose-100'
                                : 'bg-emerald-50 border-emerald-150 text-emerald-500 hover:bg-emerald-100'
                            }`}
                          >
                            {sec.inactive ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit Trigger */}
                          <button
                            onClick={() => handleStartEditSec(sec)}
                            disabled={!isAdmin}
                            title="Editar"
                            className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-45 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>

                          {/* Delete Trigger */}
                          <button
                            onClick={() => handleDeleteSec(sec)}
                            disabled={!isAdmin}
                            title="Excluir permanentemente"
                            className="p-1.5 rounded-lg bg-rose-50/50 border border-rose-100/40 text-rose-500 hover:text-rose-700 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* State-Based Confirmation Modal for Deletion (Safe from IFrame Window Blocks) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            
            <h3 className="font-extrabold text-[#111c24] text-base tracking-tight mb-2">
              Confirmar Exclusão?
            </h3>
            
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-4">
              Você está prestes a excluir permanentemente {
                deleteTarget.type === 'category' 
                  ? 'a categoria' 
                  : deleteTarget.type === 'sector' 
                  ? 'o setor' 
                  : 'o profissional'
              } <strong className="text-slate-800 font-extrabold">{deleteTarget.name}</strong>.
            </p>

            {deleteTarget.inUse && (
              <div className="bg-amber-50 border border-amber-100 text-amber-700 p-3 rounded-xl text-[11px] font-semibold text-left leading-relaxed mb-5">
                <p>⚠️ <strong>Aviso:</strong> Este item está ativamente vinculado a demandas existentes no sistema. Excluí-lo permanentemente pode afetar a exibição do histórico dessas demandas.</p>
              </div>
            )}

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingState}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeletingState}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingState ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>Excluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State-Based Confirmation Modal for User Deletion (Safe from IFrame Window Blocks) */}
      {userDeleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 text-center">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
            </div>
            
            <h3 className="font-extrabold text-[#111c24] text-base tracking-tight mb-2">
              Excluir Usuário?
            </h3>
            
            <p className="text-slate-500 font-medium text-xs leading-relaxed mb-5">
              Você está prestes a excluir permanentemente o acesso do usuário <strong className="text-slate-800 font-extrabold">{userDeleteTarget.name}</strong> ({userDeleteTarget.email}).
            </p>

            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={() => setUserDeleteTarget(null)}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingUser ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>Excluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
