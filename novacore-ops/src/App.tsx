import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, 
  Layers, 
  FolderLock, 
  BarChart3, 
  Menu, 
  Plus, 
  LogOut, 
  LogIn, 
  ShieldCheck 
} from 'lucide-react';
import { 
  Demand, 
  UserProfile, 
  Category, 
  Sector,
  Professional,
  StatusType 
} from './types';
import { 
  subscribeToActiveDemands, 
  subscribeToHistoricalDemands,
  subscribeToUserProfile,
  getCategories, 
  getSectors,
  getUsers,
  getHistoricalDemands,
  loginWithGoogle, 
  checkRedirectResult,
  logoutUser, 
  auth,
  db,
  onAuthStateChanged,
  setDemoUser
} from './lib/firebase';
import ListView from './components/ListView';
import KanbanView from './components/KanbanView';
import DashboardView from './components/DashboardView';
import SettingsView from './components/SettingsView';
import BlockedOrPendingView from './components/BlockedOrPendingView';
import LoginView from './components/LoginView';
import DemandModal from './components/DemandModal';
import { useIsAdmin } from './hooks/useIsAdmin';

export default function App() {
  
  // Tab control states: 'kanban' | 'demandas' | 'dash' | 'config'
  const [activeTab, setActiveTab] = useState<'kanban' | 'demandas' | 'dash' | 'config'>('kanban');

  // Firebase state
  const [activeDemands, setActiveDemands] = useState<Demand[]>([]);
  const [historicalDemands, setHistoricalDemands] = useState<Demand[]>([]);
  const [lastHistoricalDoc, setLastHistoricalDoc] = useState<any>(null);
  const [hasMoreHistorical, setHasMoreHistorical] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Combine active and historical demands into a single memoized array
  const demands = useMemo(() => {
    const combined = [...activeDemands];
    const activeIds = new Set(combined.map(d => d.id));
    for (const d of historicalDemands) {
      if (!activeIds.has(d.id)) {
        combined.push(d);
      }
    }
    combined.sort((a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime());
    return combined;
  }, [activeDemands, historicalDemands]);

  // Derive professionals list dynamically from approved system users
  const professionals: Professional[] = useMemo(() => {
    return users
      .filter(u => u.status === 'Aprovado')
      .map(u => ({
        id: u.uid,
        name: u.name,
        inactive: false,
        description: u.role || 'Colaborador'
      }));
  }, [users]);

  // Computed check for administrator role using centralized hook
  const isSupportOrAdmin = useIsAdmin(currentUser);

  // Selected demand for modal
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Authentication error state
  const [authError, setAuthError] = useState<string | null>(null);

  // 0. Process Google sign-in redirect results on app load
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const userProfile = await checkRedirectResult();
        if (userProfile) {
          setCurrentUser(userProfile);
          setAuthError(null);
        }
      } catch (e: any) {
        console.error('Redirect result error handled in App component:', e);
        if (e.message === 'unauthorized-domain') {
          setAuthError('unauthorized-domain');
        } else {
          setAuthError(e.message || String(e));
        }
      }
    };
    handleRedirect();
  }, []);

  // 1. Listen to Auth changes & subscribe to user profile
  useEffect(() => {
    let profileUnsub: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }
      if (firebaseUser) {
        profileUnsub = subscribeToUserProfile(firebaseUser.uid, (profile) => {
          if (profile) {
            setCurrentUser(profile);
          } else {
            setCurrentUser({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuário Google',
              email: firebaseUser.email || '',
              avatarUrl: firebaseUser.photoURL || '',
              role: 'Usuário Comum',
              status: 'Pendente',
              createdAt: new Date().toISOString()
            });
          }
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      if (profileUnsub) {
        (profileUnsub as () => void)();
      }
    };
  }, []);

  // 2. Listen to currentUser change & load collections if approved
  useEffect(() => {
    if (!currentUser || (currentUser.status !== 'Aprovado' && currentUser.email.toLowerCase() !== 'admin@novacore.com')) {
      // Clear states when logged out or not approved to avoid leaking stale data
      setActiveDemands([]);
      setHistoricalDemands([]);
      setUsers([]);
      setCategories([]);
      setSectors([]);
      return;
    }

    // Subscribe to Active Demands in real-time (Optimization)
    const unsubDemands = subscribeToActiveDemands((fetchedActive) => {
      setActiveDemands(fetchedActive);
    });

    // Subscribe to Historical Demands in real-time (Optimization)
    const unsubHistorical = subscribeToHistoricalDemands((fetchedHistorical) => {
      setHistoricalDemands((prev) => {
        const fetchedIds = new Set(fetchedHistorical.map(d => d.id));
        const extraHistorical = prev.filter(d => !fetchedIds.has(d.id) && (d.status === 'Concluída' || d.status === 'Cancelada'));
        const combined = [...fetchedHistorical, ...extraHistorical];
        combined.sort((a, b) => new Date(b.openedAt || 0).getTime() - new Date(a.openedAt || 0).getTime());
        return combined;
      });
    });

    // Fetch static tables once on load to minimize reads (Optimization)
    const loadStaticData = async () => {
      try {
        const fetchedCats = await getCategories();
        setCategories(fetchedCats);

        const fetchedSecs = await getSectors();
        setSectors(fetchedSecs);

        const fetchedUsers = await getUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Error loading static tables:', err);
      }
    };
    loadStaticData();

    return () => {
      unsubDemands();
      unsubHistorical();
    };
  }, [currentUser]);

  // Historical demands dynamic pagination methods
  const loadInitialHistoricalDemands = async () => {
    if (isLoadingMore || !currentUser) return;
    setIsLoadingMore(true);
    try {
      const result = await getHistoricalDemands(null, 40);
      setHistoricalDemands(result.demands);
      setLastHistoricalDoc(result.lastDoc);
      setHasMoreHistorical(result.hasMore);
    } catch (err) {
      console.error('Error loading initial historical demands:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleLoadMoreHistoricalDemands = async () => {
    if (isLoadingMore || !hasMoreHistorical || !currentUser) return;
    setIsLoadingMore(true);
    try {
      const result = await getHistoricalDemands(lastHistoricalDoc, 40);
      setHistoricalDemands(prev => {
        const existingIds = new Set(prev.map(d => d.id));
        const filteredNew = result.demands.filter(d => !existingIds.has(d.id));
        return [...prev, ...filteredNew];
      });
      setLastHistoricalDoc(result.lastDoc);
      setHasMoreHistorical(result.hasMore);
    } catch (err) {
      console.error('Error loading more historical demands:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Load historical demands dynamically when History tab is active
  useEffect(() => {
    if (activeTab === 'demandas' && historicalDemands.length === 0 && currentUser?.status === 'Aprovado') {
      loadInitialHistoricalDemands();
    }
  }, [activeTab, currentUser, historicalDemands.length]);

  const handleRefreshCategories = async () => {
    const fetchedCats = await getCategories();
    setCategories(fetchedCats);
  };

  const handleRefreshSectors = async () => {
    const fetchedSecs = await getSectors();
    setSectors(fetchedSecs);
  };

  const handleRefreshUsers = async () => {
    const fetchedUsers = await getUsers();
    setUsers(fetchedUsers);
  };

  const handleRefreshProfessionals = async () => {
    // Dynamic list reactively computed from users state
  };

  const handleDemoLogin = async (userProfile: UserProfile) => {
    setLoading(true);
    setAuthError(null);
    try {
      setDemoUser(userProfile);
      setCurrentUser(userProfile);
    } catch (e: any) {
      console.error('Login error: ', e);
      setAuthError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await logoutUser();
      setCurrentUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActiveTabTitle = () => {
    switch (activeTab) {
      case 'kanban': return 'Quadro Kanban';
      case 'demandas': return 'Histórico de Demandas';
      case 'dash': return 'Indicadores Operacionais';
      case 'config': return 'Painel de Configurações';
      default: return 'NovaCore Ops';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 border-4 border-[#3abeb9] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-500">Carregando painel de controle...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginView 
        onLogin={handleDemoLogin} 
        isLoading={loading} 
        error={authError} 
        onClearError={() => setAuthError(null)} 
      />
    );
  }

  const userStatus = currentUser.status || 'Pendente';
  if (userStatus !== 'Aprovado') {
    return (
      <BlockedOrPendingView 
        user={{ ...currentUser, status: userStatus }} 
        onLogout={handleLogout} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-surface selection:bg-[#3abeb9]/20 flex flex-col justify-between">
      
      {/* TopAppBar Navigation Shell */}
      <header className="w-full top-0 sticky z-45 bg-white shadow-xs flex justify-between items-center px-4 py-3 border-b border-outline-variant/30 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1 select-none">
              NovaCore <span className="text-[#3abeb9] font-black">Ops</span>
            </h1>
          </div>
        </div>

        {/* Action icons right */}
        <div className="flex items-center gap-3">
          
          {/* Active profile header widget */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-1.5 pl-3 pr-3 rounded-full select-none">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-slate-800 truncate max-w-[120px]">{currentUser?.name}</p>
              </div>
              {currentUser?.avatarUrl ? (
                <img 
                  src={currentUser.avatarUrl} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="w-6 h-6 rounded-full border border-primary/10 object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#3abeb9]/15 text-[#3abeb9] font-black flex items-center justify-center text-[10px] border border-[#3abeb9]/15">
                  {currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'SR'}
                </div>
              )}
            </div>

            {/* Prominent, highly visible "Sair" button as requested */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/50 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer shadow-3xs"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="font-black">Sair</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main content body */}
      <main className={`${activeTab === 'kanban' ? 'max-w-full px-6 lg:px-12' : 'max-w-6xl px-4'} w-full mx-auto py-6 mb-24 flex-1 transition-all duration-300`}>
        
        <div className="space-y-6">
          
          {/* Active views dispatcher based on active tab state */}
          {activeTab === 'kanban' && (
            <KanbanView 
              demands={demands} 
              users={users}
              onSelectDemand={(dem) => {
                setSelectedDemand(dem);
                setIsModalOpen(true);
              }}
              currentUserProfile={currentUser}
              onAddDemand={() => {
                setSelectedDemand(null);
                setIsModalOpen(true);
              }}
            />
          )}

          {activeTab === 'demandas' && (
            <ListView 
              demands={demands} 
              categories={categories}
              currentUserProfile={currentUser}
              users={users}
              onSelectDemand={(dem) => {
                setSelectedDemand(dem);
                setIsModalOpen(true);
              }}
              onOpenCreateModal={() => {
                setSelectedDemand(null);
                setIsModalOpen(true);
              }}
              mode="historico"
              onLoadMoreHistorical={handleLoadMoreHistoricalDemands}
              hasMoreHistorical={hasMoreHistorical}
              isLoadingMore={isLoadingMore}
            />
          )}

          {activeTab === 'dash' && isSupportOrAdmin && (
            <DashboardView 
              demands={demands} 
              users={users}
              professionals={professionals}
              onSelectDemand={(dem) => {
                setSelectedDemand(dem);
                setIsModalOpen(true);
              }}
            />
          )}

          {activeTab === 'config' && isSupportOrAdmin && (
            <SettingsView 
              users={users} 
              currentUserProfile={currentUser} 
              categories={categories}
              onRefreshCategories={handleRefreshCategories}
              sectors={sectors}
              onRefreshSectors={handleRefreshSectors}
              professionals={professionals}
              onRefreshProfessionals={handleRefreshProfessionals}
              demands={demands}
              onRefreshUsers={handleRefreshUsers}
            />
          )}

        </div>

      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-outline-variant/30 shadow-lg flex justify-around items-center h-16 px-2">
        
        {/* Kanban */}
        <button 
          onClick={() => setActiveTab('kanban')}
          className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all scale-95 active:scale-90 ${
            activeTab === 'kanban' 
              ? 'text-[#3abeb9] font-black bg-[#3abeb9]/5' 
              : 'text-slate-500 hover:text-[#3abeb9]'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-xs mt-1 font-black tracking-wide">Kanban</span>
        </button>

        {/* Histórico */}
        <button 
          onClick={() => setActiveTab('demandas')}
          className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all scale-95 active:scale-90 ${
            activeTab === 'demandas' 
              ? 'text-[#3abeb9] font-black bg-[#3abeb9]/5' 
              : 'text-slate-500 hover:text-[#3abeb9]'
          }`}
        >
          <FolderLock className="w-5 h-5" />
          <span className="text-xs mt-1 font-black tracking-wide">Histórico</span>
        </button>

        {/* Dash (Admin & Support only) */}
        {isSupportOrAdmin && (
          <button 
            onClick={() => setActiveTab('dash')}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all scale-95 active:scale-90 ${
              activeTab === 'dash' 
                ? 'text-[#3abeb9] font-black bg-[#3abeb9]/5' 
                : 'text-slate-500 hover:text-[#3abeb9]'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-xs mt-1 font-black tracking-wide">Desempenho</span>
          </button>
        )}

        {/* Config (Admin & Support only) */}
        {isSupportOrAdmin && (
          <button 
            onClick={() => setActiveTab('config')}
            className={`flex flex-col items-center justify-center px-3 py-1 rounded-xl transition-all scale-95 active:scale-90 ${
              activeTab === 'config' 
                ? 'text-[#3abeb9] font-black bg-[#3abeb9]/5' 
                : 'text-slate-500 hover:text-[#3abeb9]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
               <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs mt-1 font-black tracking-wide">Config</span>
          </button>
        )}

      </nav>

      {/* Demand creation/editing Modal */}
      {isModalOpen && (
        <DemandModal 
          demand={selectedDemand}
          users={users}
          categories={categories}
          sectors={sectors}
          professionals={professionals}
          currentUserProfile={currentUser}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedDemand(null);
          }}
          onRefreshCategories={handleRefreshCategories}
          onRefreshSectors={handleRefreshSectors}
        />
      )}

    </div>
  );
}
