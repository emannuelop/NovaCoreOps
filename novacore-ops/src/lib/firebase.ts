import { 
  UserProfile, 
  Demand, 
  Category, 
  Sector,
  Professional,
  MovementLog, 
  StatusType,
  PriorityType,
  ChecklistItem
} from '../types';

// Fictional Admin Email Constant
export const ADMIN_EMAIL = 'admin@novacore.com';

// Mock DB Instance structures to maintain backward compatibility
export const db = { firestoreDatabaseId: 'novacore-ops-db' };
export const authInstanceObj = {};
export const googleProvider = {};

// Helper to get and set local mock store
const LOCAL_STORAGE_KEY = 'novacore_ops_mock_store';

interface MockStore {
  users: UserProfile[];
  categories: Category[];
  sectors: Sector[];
  professionals: Professional[];
  demands: Demand[];
  logs: Record<string, MovementLog[]>;
}

// Pre-populated realistic and compliant mock data for NovaCore Ops
const initialStore: MockStore = {
  users: [
    {
      uid: 'admin-uid',
      name: 'João Martins',
      email: 'admin@novacore.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      role: 'Administrador',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      uid: 'colab-uid',
      name: 'Carlos Silva',
      email: 'carlos@novacore.com',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
      role: 'Colaborador',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      uid: 'gestor-uid',
      name: 'Mariana Silveira',
      email: 'mariana@novacore.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      role: 'Gestor',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      uid: 'user-uid',
      name: 'Maria Oliveira',
      email: 'maria@novacore.com',
      avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80',
      role: 'Usuário Comum',
      status: 'Aprovado',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      uid: 'pending-uid',
      name: 'Pedro Santos',
      email: 'pedro@novacore.com',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
      role: 'Usuário Comum',
      status: 'Pendente',
      createdAt: new Date().toISOString()
    }
  ],
  categories: [
    { id: 'cat-1', name: 'Tecnologia da Informação', description: 'Suporte, infraestrutura e acessos', createdAt: new Date().toISOString() },
    { id: 'cat-2', name: 'Recursos Humanos', description: 'Contratações, onboarding e benefícios', createdAt: new Date().toISOString() },
    { id: 'cat-3', name: 'Controladoria & Finanças', description: 'Faturamento, reembolsos e relatórios', createdAt: new Date().toISOString() },
    { id: 'cat-4', name: 'Operações & Logística', description: 'Frota, materiais e almoxarifado', createdAt: new Date().toISOString() }
  ],
  sectors: [
    { id: 'sec-1', name: 'Tecnologia da Informação', description: 'Setor de TI e Redes', createdAt: new Date().toISOString() },
    { id: 'sec-2', name: 'Recursos Humanos', description: 'Gestão de Pessoas', createdAt: new Date().toISOString() },
    { id: 'sec-3', name: 'Financeiro', description: 'Contabilidade e Contas', createdAt: new Date().toISOString() },
    { id: 'sec-4', name: 'Operações', description: 'Serviços e Logística', createdAt: new Date().toISOString() }
  ],
  professionals: [], // Derived in App.tsx dynamically from users
  demands: [
    {
      id: 'DEM-204501',
      title: 'Migração do Servidor de Arquivos para Nuvem',
      description: 'Mapear e migrar todos os compartilhamentos de arquivos legados para a estrutura em nuvem segura para melhorar o tempo de SLA.',
      requester: 'Mariana Silveira / Setor Financeiro',
      priority: 'Alta',
      category: 'Tecnologia da Informação',
      status: 'Em aberto',
      assignedTo: null,
      assignedToName: null,
      involvedUids: [],
      involvedNames: [],
      openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      assignedAt: null,
      lastStatusChangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedTimes: { 'Em aberto': 172800, 'Em execução': 0, 'Concluída': 0, 'Cancelada': 0 },
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      checklist: [
        { id: 'chk-1', text: 'Realizar backup total offline', completed: true, completedByUid: 'admin-uid', completedByName: 'João Martins', completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'chk-2', text: 'Mapear permissões de acessos por setor', completed: false, completedByUid: null, completedByName: null, completedAt: null },
        { id: 'chk-3', text: 'Sincronizar arquivos para o bucket na nuvem', completed: false, completedByUid: null, completedByName: null, completedAt: null }
      ],
      observation: ''
    },
    {
      id: 'DEM-204502',
      title: 'Configuração de Acessos para Nova Analista de RH',
      description: 'Liberar credenciais de e-mail institucional, acessos à plataforma de gestão interna de pessoal e configuração física do notebook.',
      requester: 'Carlos Silva / Recursos Humanos',
      priority: 'Média',
      category: 'Recursos Humanos',
      status: 'Em execução',
      assignedTo: 'colab-uid',
      assignedToName: 'Carlos Silva',
      involvedUids: ['admin-uid'],
      involvedNames: ['João Martins'],
      openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastStatusChangedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedTimes: { 'Em aberto': 86400, 'Em execução': 172800, 'Concluída': 0, 'Cancelada': 0 },
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      checklist: [
        { id: 'chk-1', text: 'Criar conta de e-mail corporativo', completed: true, completedByUid: 'colab-uid', completedByName: 'Carlos Silva', completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'chk-2', text: 'Registrar na plataforma de gestão de acessos', completed: true, completedByUid: 'colab-uid', completedByName: 'Carlos Silva', completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() },
        { id: 'chk-3', text: 'Entregar notebook de trabalho configurado', completed: false, completedByUid: null, completedByName: null, completedAt: null }
      ],
      observation: 'Notebook sendo preparado com pacote de ferramentas básico.'
    },
    {
      id: 'DEM-204503',
      title: 'Consolidação de Relatório de Custos e Faturamento Q2',
      description: 'Gerar o fechamento consolidado dos indicadores de custos operacionais do último trimestre para avaliação da gestão.',
      requester: 'Mariana Silveira / Setor Financeiro',
      priority: 'Crítica',
      category: 'Controladoria & Finanças',
      status: 'Concluída',
      assignedTo: 'admin-uid',
      assignedToName: 'João Martins',
      involvedUids: ['gestor-uid'],
      involvedNames: ['Mariana Silveira'],
      openedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
      completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      lastStatusChangedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedTimes: { 'Em aberto': 86400, 'Em execução': 86400, 'Concluída': 0, 'Cancelada': 0 },
      updatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      checklist: [
        { id: 'chk-1', text: 'Exportar logs de consumo do sistema', completed: true },
        { id: 'chk-2', text: 'Montar planilha de faturamento consolidada', completed: true },
        { id: 'chk-3', text: 'Elaborar apresentação executiva em PDF', completed: true }
      ],
      observation: 'Enviado por e-mail para a diretoria. Todos os números de faturamento batem com o esperado.'
    },
    {
      id: 'DEM-204504',
      title: 'Manutenção de Preventiva de Roteadores do Escritório',
      description: 'Agendamento de limpeza física de conectores e atualização preventiva do firmware do roteador central.',
      requester: 'Carlos Silva / Operações',
      priority: 'Baixa',
      category: 'Tecnologia da Informação',
      status: 'Cancelada',
      assignedTo: 'colab-uid',
      assignedToName: 'Carlos Silva',
      involvedUids: [],
      involvedNames: [],
      openedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      assignedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      startedAt: null,
      completedAt: null,
      lastStatusChangedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      elapsedTimes: { 'Em aberto': 86400, 'Em execução': 0, 'Concluída': 0, 'Cancelada': 0 },
      updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      checklist: [],
      observation: 'Substituído pela troca total do aparelho roteador sob nova requisição de expansão de rede.'
    }
  ],
  logs: {}
};

// Populate initial logs
initialStore.demands.forEach(d => {
  initialStore.logs[d.id] = [
    {
      id: 'log-initial-' + d.id,
      type: 'creation',
      from: '',
      to: 'Em aberto',
      changedByUid: 'admin-uid',
      changedByName: 'João Martins',
      createdAt: d.openedAt
    }
  ];
  if (d.assignedTo) {
    initialStore.logs[d.id].unshift({
      id: 'log-assign-' + d.id,
      type: 'assignee_change',
      from: 'Nenhum',
      to: d.assignedToName || '',
      changedByUid: 'admin-uid',
      changedByName: 'João Martins',
      createdAt: d.assignedAt || d.openedAt
    });
  }
  if (d.status === 'Concluída') {
    initialStore.logs[d.id].unshift({
      id: 'log-conclude-' + d.id,
      type: 'status_change',
      from: 'Em execução',
      to: 'Concluída',
      changedByUid: d.assignedTo || 'admin-uid',
      changedByName: d.assignedToName || 'João Martins',
      createdAt: d.completedAt || d.openedAt,
      duration: 86400
    });
  } else if (d.status === 'Cancelada') {
    initialStore.logs[d.id].unshift({
      id: 'log-cancel-' + d.id,
      type: 'status_change',
      from: 'Em aberto',
      to: 'Cancelada',
      changedByUid: 'admin-uid',
      changedByName: 'João Martins',
      createdAt: d.lastStatusChangedAt
    });
  }
});

// Load mock store safely
export function getMockStore(): MockStore {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialStore));
    return initialStore;
  }
  try {
    const parsed = JSON.parse(data);
    // Backward compatibility for newly added fields
    if (!parsed.users) parsed.users = initialStore.users;
    if (!parsed.categories) parsed.categories = initialStore.categories;
    if (!parsed.sectors) parsed.sectors = initialStore.sectors;
    if (!parsed.demands) parsed.demands = initialStore.demands;
    if (!parsed.logs) parsed.logs = initialStore.logs;
    return parsed;
  } catch (e) {
    return initialStore;
  }
}

export function saveMockStore(store: MockStore) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

// Custom simple reactive system
type CallbackFn = (...args: any[]) => void;
const listeners: Record<string, Set<CallbackFn>> = {};

export function subscribe(collectionName: string, callback: CallbackFn) {
  if (!listeners[collectionName]) {
    listeners[collectionName] = new Set();
  }
  listeners[collectionName].add(callback);
  return () => {
    listeners[collectionName].delete(callback);
  };
}

export function triggerListeners(collectionName: string, ...args: any[]) {
  if (listeners[collectionName]) {
    listeners[collectionName].forEach(cb => {
      try {
        cb(...args);
      } catch (err) {
        console.error('Listener callback error: ', err);
      }
    });
  }
}

// Current demo user selection setup
let currentMockUser: UserProfile | null = (() => {
  const stored = localStorage.getItem('novacore_demo_current_user');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return null;
    }
  }
  return null;
})();

const authListeners = new Set<(user: any) => void>();

export const auth = {
  get currentUser() {
    return currentMockUser ? {
      uid: currentMockUser.uid,
      email: currentMockUser.email,
      displayName: currentMockUser.name,
      photoURL: currentMockUser.avatarUrl || '',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerData: []
    } : null;
  }
};

export function onAuthStateChanged(authInstance: any, callback: (user: any) => void) {
  authListeners.add(callback);
  // Trigger immediately with current state
  callback(auth.currentUser);
  return () => {
    authListeners.delete(callback);
  };
}

// Set active demo profile
export function setDemoUser(user: UserProfile | null) {
  currentMockUser = user;
  if (user) {
    localStorage.setItem('novacore_demo_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('novacore_demo_current_user');
  }
  
  // Notify authorization listeners
  const fbUser = auth.currentUser;
  authListeners.forEach(cb => cb(fbUser));
  
  // Trigger changes on user profile as well
  triggerListeners('users');
  triggerListeners('demands');
}

export async function loginWithGoogle(): Promise<UserProfile | null> {
  // Mock login with first approved user (fallback if used)
  const store = getMockStore();
  const approved = store.users.find(u => u.status === 'Aprovado') || store.users[0];
  setDemoUser(approved);
  return approved;
}

export async function checkRedirectResult(): Promise<UserProfile | null> {
  return null;
}

export async function logoutUser() {
  setDemoUser(null);
}

// Categories Mock CRUD
export async function getCategories(): Promise<Category[]> {
  return getMockStore().categories;
}

export function subscribeToCategories(callback: (categories: Category[]) => void, onError?: (err: Error) => void) {
  callback(getMockStore().categories);
  return subscribe('categories', () => {
    callback(getMockStore().categories);
  });
}

export async function saveCategory(category: Category): Promise<void> {
  const store = getMockStore();
  const index = store.categories.findIndex(c => c.id === category.id);
  if (index !== -1) {
    store.categories[index] = category;
  } else {
    store.categories.push(category);
  }
  saveMockStore(store);
  triggerListeners('categories');
}

export async function deleteCategory(id: string): Promise<void> {
  const store = getMockStore();
  store.categories = store.categories.filter(c => c.id !== id);
  saveMockStore(store);
  triggerListeners('categories');
}

// Sectors Mock CRUD
export async function getSectors(): Promise<Sector[]> {
  return getMockStore().sectors;
}

export function subscribeToSectors(callback: (sectors: Sector[]) => void, onError?: (err: Error) => void) {
  callback(getMockStore().sectors);
  return subscribe('sectors', () => {
    callback(getMockStore().sectors);
  });
}

export async function saveSector(sector: Sector): Promise<void> {
  const store = getMockStore();
  const index = store.sectors.findIndex(s => s.id === sector.id);
  if (index !== -1) {
    store.sectors[index] = sector;
  } else {
    store.sectors.push(sector);
  }
  saveMockStore(store);
  triggerListeners('sectors');
}

export async function deleteSector(id: string): Promise<void> {
  const store = getMockStore();
  store.sectors = store.sectors.filter(s => s.id !== id);
  saveMockStore(store);
  triggerListeners('sectors');
}

// Professionals CRUD
export async function getProfessionals(): Promise<Professional[]> {
  return getMockStore().professionals;
}

export function subscribeToProfessionals(callback: (professionals: Professional[]) => void, onError?: (err: Error) => void) {
  callback(getMockStore().professionals);
  return subscribe('professionals', () => {
    callback(getMockStore().professionals);
  });
}

export async function saveProfessional(professional: Professional): Promise<void> {
  const store = getMockStore();
  const index = store.professionals.findIndex(p => p.id === professional.id);
  if (index !== -1) {
    store.professionals[index] = professional;
  } else {
    store.professionals.push(professional);
  }
  saveMockStore(store);
  triggerListeners('professionals');
}

export async function deleteProfessional(id: string): Promise<void> {
  const store = getMockStore();
  store.professionals = store.professionals.filter(p => p.id !== id);
  saveMockStore(store);
  triggerListeners('professionals');
}

// Demands mock operations
export function subscribeToActiveDemands(callback: (demands: Demand[]) => void, onError?: (err: Error) => void) {
  const fetchActive = () => {
    const list = getMockStore().demands.filter(d => d.status === 'Em aberto' || d.status === 'Em execução');
    list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    callback(list);
  };
  fetchActive();
  return subscribe('demands', fetchActive);
}

export function subscribeToHistoricalDemands(callback: (demands: Demand[]) => void, onError?: (err: Error) => void) {
  const fetchHist = () => {
    const list = getMockStore().demands.filter(d => d.status === 'Concluída' || d.status === 'Cancelada');
    list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
    callback(list);
  };
  fetchHist();
  return subscribe('demands', fetchHist);
}

export function subscribeToDemands(callback: (demands: Demand[]) => void, onError?: (err: Error) => void) {
  return subscribeToActiveDemands(callback, onError);
}

export async function getHistoricalDemands(
  lastDoc: any = null,
  pageSize: number = 40
): Promise<{ demands: Demand[]; lastDoc: any; hasMore: boolean }> {
  const list = getMockStore().demands.filter(d => d.status === 'Concluída' || d.status === 'Cancelada');
  list.sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime());
  
  // Client pagination
  const startIdx = lastDoc ? Number(lastDoc) : 0;
  const pageItems = list.slice(startIdx, startIdx + pageSize);
  const nextDocIdx = startIdx + pageSize;
  const hasMore = nextDocIdx < list.length;
  
  return {
    demands: pageItems,
    lastDoc: hasMore ? nextDocIdx : null,
    hasMore
  };
}

export async function getLogs(demandId: string): Promise<MovementLog[]> {
  const logs = getMockStore().logs[demandId] || [];
  return [...logs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function subscribeToLogs(demandId: string, callback: (logs: MovementLog[]) => void, onError?: (err: Error) => void) {
  const fetchLogs = () => {
    const list = getMockStore().logs[demandId] || [];
    callback([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };
  fetchLogs();
  return subscribe('demands', fetchLogs);
}

export async function createDemand(demand: Omit<Demand, 'id'>): Promise<string> {
  const store = getMockStore();
  const idNum = Math.floor(100000 + Math.random() * 900000);
  const demandId = `DEM-${idNum}`;
  
  const fullDemand: Demand = {
    ...demand,
    id: demandId,
    openedAt: new Date().toISOString(),
    lastStatusChangedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  store.demands.push(fullDemand);
  
  // Write log
  const logId = crypto.randomUUID();
  const log: MovementLog = {
    id: logId,
    type: 'creation',
    from: '',
    to: 'Em aberto',
    changedByUid: currentMockUser?.uid || 'anonymous',
    changedByName: currentMockUser?.name || 'Demonstração',
    createdAt: new Date().toISOString()
  };
  
  store.logs[demandId] = [log];
  saveMockStore(store);
  triggerListeners('demands');
  return demandId;
}

export async function deleteDemand(id: string): Promise<void> {
  const store = getMockStore();
  store.demands = store.demands.filter(d => d.id !== id);
  delete store.logs[id];
  saveMockStore(store);
  triggerListeners('demands');
}

export async function updateDemandStatus(
  demandId: string, 
  newStatus: StatusType, 
  userUid: string, 
  userName: string
): Promise<void> {
  const store = getMockStore();
  const index = store.demands.findIndex(d => d.id === demandId);
  if (index === -1) return;
  
  const demand = store.demands[index];
  const oldStatus = demand.status;
  if (oldStatus === newStatus) return;
  
  const nowStr = new Date().toISOString();
  const elapsedSeconds = Math.floor(
    (new Date(nowStr).getTime() - new Date(demand.lastStatusChangedAt).getTime()) / 1000
  );
  
  const updatedElapsed = { ...demand.elapsedTimes };
  updatedElapsed[oldStatus] = (updatedElapsed[oldStatus] || 0) + elapsedSeconds;
  
  demand.status = newStatus;
  demand.lastStatusChangedAt = nowStr;
  demand.elapsedTimes = updatedElapsed;
  demand.updatedAt = nowStr;
  
  if (newStatus === 'Em execução' && !demand.startedAt) {
    demand.startedAt = nowStr;
  }
  if (newStatus === 'Concluída' && !demand.completedAt) {
    demand.completedAt = nowStr;
  }
  
  // Add log entry
  const logId = crypto.randomUUID();
  const log: MovementLog = {
    id: logId,
    type: 'status_change',
    from: oldStatus,
    to: newStatus,
    changedByUid: userUid,
    changedByName: userName,
    createdAt: nowStr,
    duration: elapsedSeconds
  };
  
  if (!store.logs[demandId]) store.logs[demandId] = [];
  store.logs[demandId].push(log);
  
  saveMockStore(store);
  triggerListeners('demands');
}

export async function updateDemandAssignments(
  demandId: string,
  primaryUid: string | null,
  primaryName: string | null,
  involvedUids: string[],
  involvedNames: string[],
  userUid: string,
  userName: string
): Promise<void> {
  const store = getMockStore();
  const index = store.demands.findIndex(d => d.id === demandId);
  if (index === -1) return;
  
  const demand = store.demands[index];
  const oldAssignedTo = demand.assignedTo;
  const oldAssignedToName = demand.assignedToName;
  const oldInvolvedUids = demand.involvedUids || [];
  const nowStr = new Date().toISOString();
  
  demand.assignedTo = primaryUid;
  demand.assignedToName = primaryName;
  demand.involvedUids = involvedUids;
  demand.involvedNames = involvedNames;
  demand.updatedAt = nowStr;
  
  if (oldAssignedTo !== primaryUid) {
    demand.assignedAt = nowStr;
  }
  
  if (!store.logs[demandId]) store.logs[demandId] = [];
  
  if (oldAssignedTo !== primaryUid) {
    store.logs[demandId].push({
      id: crypto.randomUUID(),
      type: 'assignee_change',
      from: oldAssignedToName || 'Nenhum',
      to: primaryName || 'Nenhum',
      changedByUid: userUid,
      changedByName: userName,
      createdAt: nowStr
    });
  }
  
  if (JSON.stringify(oldInvolvedUids.sort()) !== JSON.stringify(involvedUids.sort())) {
    store.logs[demandId].push({
      id: crypto.randomUUID(),
      type: 'involved_change',
      from: demand.involvedNames?.join(', ') || 'Nenhum',
      to: involvedNames.join(', ') || 'Nenhum',
      changedByUid: userUid,
      changedByName: userName,
      createdAt: nowStr
    });
  }
  
  saveMockStore(store);
  triggerListeners('demands');
}

export async function updateDemandDueDate(demandId: string, dueDate: string | null): Promise<void> {
  const store = getMockStore();
  const index = store.demands.findIndex(d => d.id === demandId);
  if (index !== -1) {
    store.demands[index].dueDate = dueDate;
    store.demands[index].updatedAt = new Date().toISOString();
    saveMockStore(store);
    triggerListeners('demands');
  }
}

export async function updateDemandInfo(
  demandId: string,
  title: string,
  description: string,
  priority: PriorityType,
  category: string,
  requester: string,
  startedAt?: string | null,
  completedAt?: string | null
): Promise<void> {
  const store = getMockStore();
  const index = store.demands.findIndex(d => d.id === demandId);
  if (index === -1) return;
  
  const demand = store.demands[index];
  demand.title = title;
  demand.description = description;
  demand.priority = priority;
  demand.category = category;
  demand.requester = requester;
  demand.updatedAt = new Date().toISOString();
  
  if (startedAt !== undefined) demand.startedAt = startedAt;
  if (completedAt !== undefined) demand.completedAt = completedAt;
  
  saveMockStore(store);
  triggerListeners('demands');
}

export async function updateDemandChecklist(demandId: string, checklist: ChecklistItem[]): Promise<void> {
  const store = getMockStore();
  const index = store.demands.findIndex(d => d.id === demandId);
  if (index !== -1) {
    store.demands[index].checklist = checklist;
    store.demands[index].updatedAt = new Date().toISOString();
    saveMockStore(store);
    triggerListeners('demands');
  }
}

// User Profile collection support
export async function getUsers(): Promise<UserProfile[]> {
  return getMockStore().users;
}

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  callback(getMockStore().users);
  return subscribe('users', () => {
    callback(getMockStore().users);
  });
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const fetchProf = () => {
    const user = getMockStore().users.find(u => u.uid === uid) || null;
    callback(user);
  };
  fetchProf();
  return subscribe('users', fetchProf);
}

export async function updateUserProfile(uid: string, fields: Partial<UserProfile>): Promise<void> {
  const store = getMockStore();
  const index = store.users.findIndex(u => u.uid === uid);
  if (index !== -1) {
    store.users[index] = { ...store.users[index], ...fields };
    saveMockStore(store);
    triggerListeners('users');
  }
}

export async function deleteUser(uid: string): Promise<void> {
  const store = getMockStore();
  store.users = store.users.filter(u => u.uid !== uid);
  saveMockStore(store);
  triggerListeners('users');
}


// Mock Firestore-level mutations imported directly in DemandModal
export const doc = (dbInstance: any, collectionName: string, id: string, ...extra: string[]) => {
  if (extra.length > 0) {
    return { collectionName: `${collectionName}/${id}/${extra[0]}`, id: extra[1] };
  }
  return { collectionName, id };
};

export const setDoc = async (docRef: any, data: any, options?: { merge?: boolean }) => {
  const store = getMockStore();
  const colName = docRef.collectionName;
  if (colName === 'demands') {
    const arr = store.demands;
    const idx = arr.findIndex(x => x.id === docRef.id);
    if (idx !== -1) {
      arr[idx] = options?.merge ? { ...arr[idx], ...data } : { id: docRef.id, ...data };
    } else {
      arr.push({ id: docRef.id, ...data });
    }
  } else if (colName === 'users') {
    const arr = store.users;
    const idx = arr.findIndex(x => x.uid === docRef.id);
    if (idx !== -1) {
      arr[idx] = options?.merge ? { ...arr[idx], ...data } : { uid: docRef.id, ...data };
    } else {
      arr.push({ uid: docRef.id, ...data });
    }
  } else if (typeof colName === 'string' && colName.startsWith('demands/') && colName.endsWith('/logs')) {
    const parts = colName.split('/');
    const demandId = parts[1];
    if (!store.logs[demandId]) {
      store.logs[demandId] = [];
    }
    const arr = store.logs[demandId];
    const idx = arr.findIndex(x => x.id === docRef.id);
    if (idx !== -1) {
      arr[idx] = { ...arr[idx], ...data };
    } else {
      arr.push({ id: docRef.id, ...data });
    }
  }
  saveMockStore(store);
  triggerListeners('demands');
};

export const updateDoc = async (docRef: any, data: any) => {
  const store = getMockStore();
  const colName = docRef.collectionName as keyof MockStore;
  if (colName === 'demands') {
    const idx = store.demands.findIndex(x => x.id === docRef.id);
    if (idx !== -1) {
      store.demands[idx] = { ...store.demands[idx], ...data };
    }
  } else if (colName === 'users') {
    const idx = store.users.findIndex(x => x.uid === docRef.id);
    if (idx !== -1) {
      store.users[idx] = { ...store.users[idx], ...data };
    }
  }
  saveMockStore(store);
  triggerListeners(docRef.collectionName);
};

export const runTransaction = async (dbInstance: any, callback: (transaction: any) => Promise<any>) => {
  const transaction = {
    get: async (docRef: any) => {
      const store = getMockStore();
      const colName = docRef.collectionName as keyof MockStore;
      let item: any = null;
      if (colName === 'demands') {
        item = store.demands.find(x => x.id === docRef.id);
      } else if (colName === 'users') {
        item = store.users.find(x => x.uid === docRef.id);
      }
      return {
        exists: () => !!item,
        data: () => item
      };
    },
    update: (docRef: any, updates: any) => {
      const store = getMockStore();
      const colName = docRef.collectionName as keyof MockStore;
      if (colName === 'demands') {
        const idx = store.demands.findIndex(x => x.id === docRef.id);
        if (idx !== -1) {
          store.demands[idx] = { ...store.demands[idx], ...updates };
          saveMockStore(store);
          triggerListeners('demands');
        }
      } else if (colName === 'users') {
        const idx = store.users.findIndex(x => x.uid === docRef.id);
        if (idx !== -1) {
          store.users[idx] = { ...store.users[idx], ...updates };
          saveMockStore(store);
          triggerListeners('users');
        }
      }
    }
  };
  return callback(transaction);
};
