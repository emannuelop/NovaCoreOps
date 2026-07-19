import React, { useState, useEffect } from 'react';
import { runTransaction, doc, setDoc, updateDoc } from '../lib/firebase';
import { X, Calendar, User, Users, FolderDot, AlertCircle, Clock, Plus, ChevronDown, Trash2, Search, Check, ChevronUp, XCircle, Activity, Edit2, Lock, FileText } from 'lucide-react';
import { Demand, UserProfile, Category, Sector, Professional, StatusType, PriorityType, MovementLog, ChecklistItem } from '../types';
import { 
  createDemand, 
  updateDemandStatus, 
  updateDemandAssignments, 
  updateDemandDueDate,
  subscribeToLogs,
  saveCategory,
  auth,
  db,
  deleteDemand,
  updateDemandInfo,
  updateDemandChecklist
} from '../lib/firebase';
import { formatDateTimeBR, formatTimeElapsed, getStatusBadgeStyles } from '../utils';
import { useIsAdmin } from '../hooks/useIsAdmin';

function toDatetimeLocal(isoString: string | null | undefined): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (e) {
    return '';
  }
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch (e) {
    return null;
  }
}

interface DemandModalProps {
  demand: Demand | null; // null if creating a new one
  users: UserProfile[];
  categories: Category[];
  sectors: Sector[];
  professionals: Professional[];
  onClose: () => void;
  currentUserProfile: UserProfile | null;
  onRefreshCategories: () => void;
  onRefreshSectors: () => void;
}

export default function DemandModal({ 
  demand, 
  users, 
  categories, 
  sectors,
  professionals,
  onClose,
  currentUserProfile,
  onRefreshCategories,
  onRefreshSectors
}: DemandModalProps) {
  const isEditing = !!demand;

  const isAdmin = useIsAdmin(currentUserProfile);

  // Ticker for updating current session time live in the modal
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    if (demand && (demand.status === 'Em aberto' || demand.status === 'Em execução')) {
      const interval = setInterval(() => {
        setTicker(prev => prev + 1);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [demand]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.prof-selector-container')) {
        setIsProfDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute times
  let openTimeSeconds = 0;
  let executionTimeSeconds = 0;
  let openedToFinalSeconds = 0;
  let executionToFinalSeconds = 0;

  if (demand) {
    if (demand.elapsedTimes) {
      openTimeSeconds = demand.elapsedTimes['Em aberto'] || 0;
      executionTimeSeconds = demand.elapsedTimes['Em execução'] || 0;
    }
    
    // Add current session time if still in that status
    if (demand.status === 'Em aberto') {
      const lastChange = new Date(demand.lastStatusChangedAt || demand.openedAt).getTime();
      openTimeSeconds += Math.max(0, Math.floor((Date.now() - lastChange) / 1000));
    } else if (demand.status === 'Em execução') {
      const lastChange = new Date(demand.lastStatusChangedAt || demand.openedAt).getTime();
      executionTimeSeconds += Math.max(0, Math.floor((Date.now() - lastChange) / 1000));
    }

    const endMs = demand.completedAt 
      ? new Date(demand.completedAt).getTime() 
      : (demand.status === 'Concluída' || demand.status === 'Cancelada') 
        ? new Date(demand.lastStatusChangedAt || demand.updatedAt).getTime() 
        : Date.now();

    // 1. Tempo de Abertura até o Final (Opened to Final)
    const openMs = new Date(demand.openedAt).getTime();
    openedToFinalSeconds = Math.max(0, Math.floor((endMs - openMs) / 1000));

    // 2. Tempo de Execução até o Final (Execution to Final)
    if (demand.startedAt) {
      const startMs = new Date(demand.startedAt).getTime();
      executionToFinalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
    } else if (demand.status === 'Em execução') {
      const startMs = new Date(demand.lastStatusChangedAt || demand.openedAt).getTime();
      executionToFinalSeconds = Math.max(0, Math.floor((endMs - startMs) / 1000));
    }
  }

  // Form states
  const [adminEditing, setAdminEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requester, setRequester] = useState('');
  const [priority, setPriority] = useState<PriorityType | ''>('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<StatusType>('Em aberto');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [involvedUids, setInvolvedUids] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [isProfDropdownOpen, setIsProfDropdownOpen] = useState(false);
  const [profSearchQuery, setProfSearchQuery] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Category creation state
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // Logs state
  const [logs, setLogs] = useState<MovementLog[]>([]);

  // Checklist state
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItemText, setNewCheckItemText] = useState('');

  // Manual times state
  const [openedAtState, setOpenedAtState] = useState('');
  const [startedAtState, setStartedAtState] = useState('');
  const [completedAtState, setCompletedAtState] = useState('');
  const [isOpenedAtManuallyEdited, setIsOpenedAtManuallyEdited] = useState(false);
  const [isStartedAtManuallyEdited, setIsStartedAtManuallyEdited] = useState(false);
  const [isCompletedAtManuallyEdited, setIsCompletedAtManuallyEdited] = useState(false);

  // Observation/Comment state
  const [observation, setObservation] = useState('');
  const [isSavingObservation, setIsSavingObservation] = useState(false);

  const canModify = () => {
    if (!currentUserProfile) return false;
    return isAdmin;
  };

  const isConcluded = isEditing && (demand?.status === 'Concluída' || demand?.status === 'Cancelada');

  const isExecutor = demand ? (demand.assignedTo === currentUserProfile?.uid || demand.involvedUids?.includes(currentUserProfile?.uid || '')) : false;

  const isReadOnly = isEditing && (!isAdmin || !adminEditing || isConcluded);

  const canUserEditDemand = !isConcluded && (isAdmin || isExecutor || !isEditing);
  const canSave = !isConcluded && (isAdmin || (isEditing && isExecutor));

  const handleAddCheckItem = () => {
    if (!newCheckItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: newCheckItemText.trim(),
      completed: false
    };
    setChecklist(prev => [...prev, newItem]);
    setNewCheckItemText('');
  };

  const handleToggleCheckItem = (id: string) => {
    if (isEditing && !canUserEditDemand) return;
    const currentUid = currentUserProfile?.uid || auth.currentUser?.uid || 'guest';
    const currentName = currentUserProfile?.name || auth.currentUser?.displayName || 'Convidado';
    const nowStr = new Date().toISOString();
    
    setChecklist(prev => prev.map(item => {
      if (item.id === id) {
        const completed = !item.completed;
        return {
          ...item,
          completed,
          completedByUid: completed ? currentUid : null,
          completedByName: completed ? currentName : null,
          completedAt: completed ? nowStr : null
        };
      }
      return item;
    }));
  };

  const handleRemoveCheckItem = (id: string) => {
    if (!isAdmin) return;
    setChecklist(prev => prev.filter(item => item.id !== id));
  };

  // Set initial states when demand changes
  useEffect(() => {
    if (demand) {
      setAdminEditing(false);
      setTitle(demand.title);
      setDescription(demand.description || '');
      setRequester(demand.requester);
      setPriority(demand.priority);
      setCategory(demand.category);
      setStatus(demand.status);
      setAssignedTo(demand.assignedTo || '');
      setInvolvedUids(demand.involvedUids || []);
      setDueDate(demand.dueDate || '');
      setChecklist(demand.checklist || []);
      setOpenedAtState(toDatetimeLocal(demand.openedAt));
      setStartedAtState(toDatetimeLocal(demand.startedAt));
      setCompletedAtState(toDatetimeLocal(demand.completedAt));
      setObservation(demand.observation || '');
    } else {
      setAdminEditing(true);
      setTitle('');
      setDescription('');
      setRequester('');
      setPriority('');
      setCategory('');
      setStatus('Em aberto');
      setAssignedTo('');
      setInvolvedUids([]);
      setDueDate('');
      setOpenedAtState('');
      setStartedAtState('');
      setCompletedAtState('');
      setChecklist([]);
      setObservation('');
    }
    setIsOpenedAtManuallyEdited(false);
    setIsStartedAtManuallyEdited(false);
    setIsCompletedAtManuallyEdited(false);
  }, [demand, categories, sectors]);

  // Automatic status/timestamp updates
  useEffect(() => {
    if (status === 'Concluída' && !completedAtState) {
      setCompletedAtState(toDatetimeLocal(new Date().toISOString()));
    } else if (status !== 'Concluída' && completedAtState) {
      // Don't necessarily clear if it was set manually, but user said "quando faço a conclusão colocando em cluido"
      // Maybe we only clear if it was NOT set manually? The user didn't specify.
    }
    
    if (status === 'Em execução' && !startedAtState) {
      setStartedAtState(toDatetimeLocal(new Date().toISOString()));
    }
  }, [status]);

  useEffect(() => {
    if (startedAtState && status === 'Em aberto') {
      setStatus('Em execução');
    }
  }, [startedAtState]);

  // Optimizaton: Fetch movement logs only when demand ID changes, avoiding massive re-subscription loops
  useEffect(() => {
    if (demand && demand.id) {
      const unsubscribe = subscribeToLogs(demand.id, (fetchedLogs) => {
        setLogs(fetchedLogs);
      });
      return () => unsubscribe();
    } else {
      setLogs([]);
    }
  }, [demand?.id]);

  const handleCreateCategory = async () => {
    if (!isAdmin) {
      setErrorMessage('Apenas Administradores podem criar categorias.');
      return;
    }
    if (!newCatName.trim()) return;
    try {
      const catId = `cat-${Date.now()}`;
      const newCat: Category = {
        id: catId,
        name: newCatName.trim(),
        description: newCatDesc.trim(),
        createdAt: new Date().toISOString()
      };
      await saveCategory(newCat);
      onRefreshCategories();
      setCategory(newCat.name);
      setNewCatName('');
      setNewCatDesc('');
      setShowNewCatInput(false);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao criar categoria. Verifique suas permissões.');
    }
  };

  const handleDelete = async () => {
    if (!demand) return;
    if (demand.status === 'Concluída' || status === 'Concluída') {
      setErrorMessage('Demandas concluídas não podem ser excluídas, apenas canceladas.');
      return;
    }
    setIsConfirmingDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!demand) return;
    if (!isAdmin) {
      setErrorMessage('Apenas administradores podem excluir uma demanada.');
      return;
    }
    if (demand.status === 'Concluída' || status === 'Concluída') {
      setErrorMessage('Demandas concluídas não podem ser excluídas, apenas canceladas.');
      return;
    }
    try {
      setErrorMessage('');
      await deleteDemand(demand.id);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao excluir a demanada. Por favor, tente novamente.');
    }
  };

  const handleCancelDemand = () => {
    if (!demand) return;
    setIsConfirmingCancel(true);
  };

  const handleConfirmCancel = async () => {
    if (!demand) return;
    try {
      setErrorMessage('');
      const currentUid = currentUserProfile?.uid || auth.currentUser?.uid || 'guest';
      const currentName = currentUserProfile?.name || auth.currentUser?.displayName || 'Convidado';
      
      await updateDemandStatus(demand.id, 'Cancelada', currentUid, currentName);
      setStatus('Cancelada');
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao cancelar a demanda. Por favor, tente novamente.');
    }
  };

  const handleSaveObservation = async () => {
    if (!demand) return;
    setIsSavingObservation(true);
    setErrorMessage('');
    try {
      const nowStr = new Date().toISOString();
      const demandDocRef = doc(db, 'demands', demand.id);
      
      await updateDoc(demandDocRef, {
        observation: observation.trim(),
        updatedAt: nowStr
      });

      // Also create a movement log for this observation change
      const logId = crypto.randomUUID();
      const logRef = doc(db, 'demands', demand.id, 'logs', logId);
      const currentUid = currentUserProfile?.uid || auth.currentUser?.uid || 'guest';
      const currentName = currentUserProfile?.name || auth.currentUser?.displayName || 'Convidado';

      await setDoc(logRef, {
        id: logId,
        type: 'observation_change' as any,
        from: '',
        to: 'Observação do executor atualizada',
        changedByUid: currentUid,
        changedByName: currentName,
        createdAt: nowStr
      });
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao salvar a observação. Por favor, tente novamente.');
    } finally {
      setIsSavingObservation(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (isConcluded) {
      setErrorMessage('Esta demanda foi finalizada (concluída ou cancelada) e não pode ser mais editada.');
      return;
    }
    if (!isAdmin && !isEditing) {
      setErrorMessage('Permissão negada: Apenas administradores podem criar demandas.');
      return;
    }
    if (isEditing && !isAdmin && !isExecutor) {
      setErrorMessage('Permissão negada: Somente administradores ou os profissionais envolvidos podem alterar esta demanda.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Por favor, preencha o título da demanda.');
      return;
    }
    if (!requester || !requester.trim()) {
      setErrorMessage('Por favor, selecione um solicitante/setor.');
      return;
    }
    if (!priority) {
      setErrorMessage('Por favor, selecione a gravidade da demanda.');
      return;
    }
    if (!category) {
      setErrorMessage('Por favor, selecione uma categoria.');
      return;
    }

    setIsSaving(true);
    try {
      const currentUid = currentUserProfile?.uid || auth.currentUser?.uid || 'guest';
      const currentName = currentUserProfile?.name || auth.currentUser?.displayName || 'Convidado';
      const currentEmail = currentUserProfile?.email || auth.currentUser?.email || 'admin@novacore.com';

      const manualOpenedAt = isOpenedAtManuallyEdited ? fromDatetimeLocal(openedAtState) : undefined;
      const manualStartedAt = isStartedAtManuallyEdited ? fromDatetimeLocal(startedAtState) : undefined;
      const manualCompletedAt = isCompletedAtManuallyEdited ? fromDatetimeLocal(completedAtState) : undefined;

      // Manual Datetime Validations
      const effectiveOpenedAt = manualOpenedAt !== undefined ? manualOpenedAt : demand?.openedAt;
      const effectiveStartedAt = manualStartedAt !== undefined ? manualStartedAt : demand?.startedAt;
      const effectiveCompletedAt = manualCompletedAt !== undefined ? manualCompletedAt : demand?.completedAt;

      if (effectiveOpenedAt) {
        if (effectiveStartedAt) {
          if (new Date(effectiveStartedAt).getTime() < new Date(effectiveOpenedAt).getTime()) {
            setErrorMessage('A data/hora de início da execução não pode ser anterior à data de abertura.');
            setIsSaving(false);
            return;
          }
        }
        if (effectiveCompletedAt) {
          if (new Date(effectiveCompletedAt).getTime() < new Date(effectiveOpenedAt).getTime()) {
            setErrorMessage('A data/hora de conclusão não pode ser anterior à data de abertura.');
            setIsSaving(false);
            return;
          }
          if (effectiveStartedAt && new Date(effectiveCompletedAt).getTime() < new Date(effectiveStartedAt).getTime()) {
            setErrorMessage('A data/hora de conclusão não pode ser anterior ao início da execução.');
            setIsSaving(false);
            return;
          }
        }
      }

      let finalStatus = status;
      let finalChecklist = [...checklist];
      if (isAdmin && manualCompletedAt) {
        finalStatus = 'Concluída';
        // Automatically complete all checklist items under the manual closure
        finalChecklist = checklist.map(item => {
          if (!item.completed) {
            return {
              ...item,
              completed: true,
              completedByUid: currentUid,
              completedByName: currentName,
              completedAt: manualCompletedAt
            };
          }
          return item;
        });
      }

      if (isEditing && demand) {
        // 0. Validate Checklist before allowing movement to Completed (Concluída)
        if (finalStatus === 'Concluída' && !manualCompletedAt) {
          const hasUncompleted = checklist.some(item => !item.completed);
          if (hasUncompleted) {
            setErrorMessage('Não é possível concluir a demanda: Existem etapas pendentes no checklist.');
            setIsSaving(false);
            return;
          }
        }

        const queuedLogs: Array<{
          type: string;
          from: string;
          to: string;
          duration?: number;
        }> = [];

        const nowStr = new Date().toISOString();
        const demandDocRef = doc(db, 'demands', demand.id);

        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(demandDocRef);
          if (!snap.exists()) {
            throw new Error('A demanda que você está tentando editar não foi encontrada.');
          }

          const demandState = snap.data() as Demand;
          const updates: any = {
            updatedAt: nowStr
          };

          // 1. Check if status changed
          if (finalStatus !== demandState.status) {
            const oldStatus = demandState.status;
            const elapsedSeconds = Math.floor(
              (new Date(nowStr).getTime() - new Date(demandState.lastStatusChangedAt || demandState.openedAt).getTime()) / 1000
            );

            const updatedElapsed = { ...demandState.elapsedTimes };
            updatedElapsed[oldStatus] = (updatedElapsed[oldStatus] || 0) + elapsedSeconds;

            updates.status = finalStatus;
            updates.lastStatusChangedAt = nowStr;
            updates.elapsedTimes = updatedElapsed;

            if (finalStatus === 'Em execução' && !demandState.startedAt) {
              updates.startedAt = nowStr;
            }
            if (finalStatus === 'Concluída' && !demandState.completedAt) {
              updates.completedAt = nowStr;
            }

            queuedLogs.push({
              type: 'status_change',
              from: oldStatus,
              to: finalStatus,
              duration: elapsedSeconds
            });
          }

          // 2. Check if admin and other fields changed
          if (isAdmin) {
            if (
              title !== demandState.title ||
              description !== (demandState.description || '') ||
              priority !== demandState.priority ||
              category !== demandState.category ||
              requester !== demandState.requester ||
              manualOpenedAt !== undefined ||
              manualStartedAt !== undefined ||
              manualCompletedAt !== undefined
            ) {
              updates.title = title.trim();
              updates.description = description.trim();
              updates.priority = priority as PriorityType;
              updates.category = category;
              updates.requester = requester;

              if (manualOpenedAt !== undefined) {
                updates.openedAt = manualOpenedAt;
              }
              if (manualStartedAt !== undefined) {
                updates.startedAt = manualStartedAt;
              }
              if (manualCompletedAt !== undefined) {
                updates.completedAt = manualCompletedAt;
              }

              if (manualOpenedAt !== undefined || manualStartedAt !== undefined || manualCompletedAt !== undefined) {
                // Recalculate elapsedTimes if manual dates are set
                const finalOpenedAt = manualOpenedAt !== undefined ? manualOpenedAt : demandState.openedAt;
                const finalStartedAt = manualStartedAt !== undefined ? manualStartedAt : demandState.startedAt;
                const finalCompletedAt = manualCompletedAt !== undefined ? manualCompletedAt : (updates.completedAt || demandState.completedAt);

                const newElapsed = { ...(updates.elapsedTimes || demandState.elapsedTimes || {}) };

                if (finalStartedAt) {
                  const openMs = new Date(finalOpenedAt as string).getTime();
                  const startMs = new Date(finalStartedAt as string).getTime();
                  newElapsed['Em aberto'] = Math.max(0, Math.floor((startMs - openMs) / 1000));

                  const endMs = finalCompletedAt 
                    ? new Date(finalCompletedAt as string).getTime() 
                    : (finalStatus === 'Concluída' || finalStatus === 'Cancelada' 
                        ? new Date((updates.lastStatusChangedAt || demandState.lastStatusChangedAt || demandState.updatedAt) as string).getTime() 
                        : Date.now());

                  newElapsed['Em execução'] = Math.max(0, Math.floor((endMs - startMs) / 1000));
                } else {
                  const openMs = new Date(finalOpenedAt as string).getTime();
                  const endMs = finalCompletedAt 
                    ? new Date(finalCompletedAt as string).getTime() 
                    : (finalStatus === 'Concluída' || finalStatus === 'Cancelada' 
                        ? new Date((updates.lastStatusChangedAt || demandState.lastStatusChangedAt || demandState.updatedAt) as string).getTime() 
                        : Date.now());
                  newElapsed['Em aberto'] = Math.max(0, Math.floor((endMs - openMs) / 1000));
                  newElapsed['Em execução'] = 0;
                }
                updates.elapsedTimes = newElapsed;
              }
            }

            // Check if assignments changed
            const firstProfId = involvedUids[0] || null;
            const matchedProf = professionals.find(p => p.id === firstProfId);
            const matchedUser = users.find(u => u.uid === firstProfId);
            const primaryUid = firstProfId;
            const primaryName = matchedProf ? matchedProf.name : (matchedUser ? matchedUser.name : null);

            // Map selected IDs to names without duplicates
            const involvedNames: string[] = [];
            involvedUids.forEach(uid => {
              const matchedP = professionals.find(p => p.id === uid);
              const matchedU = users.find(u => u.uid === uid);
              const name = matchedP ? matchedP.name : (matchedU ? matchedU.name : null);
              if (name && !involvedNames.includes(name)) {
                involvedNames.push(name);
              }
            });

            if (demandState.assignedTo !== primaryUid) {
              updates.assignedTo = primaryUid;
              updates.assignedToName = primaryName;
              updates.assignedAt = nowStr;

              queuedLogs.push({
                type: 'assignee_change',
                from: demandState.assignedToName || 'Nenhum',
                to: primaryName || 'Nenhum'
              });
            }

            const oldInvolvedUids = demandState.involvedUids || [];
            if (JSON.stringify([...oldInvolvedUids].sort()) !== JSON.stringify([...involvedUids].sort())) {
              updates.involvedUids = involvedUids;
              updates.involvedNames = involvedNames;

              queuedLogs.push({
                type: 'involved_change',
                from: demandState.involvedNames?.join(', ') || 'Nenhum',
                to: involvedNames.join(', ') || 'Nenhum'
              });
            }

            // Check if dueDate changed
            if (dueDate !== (demandState.dueDate || '')) {
              updates.dueDate = dueDate || null;
            }
          }

          // 3. Always save checklist updates (for both admin and common user toggling)
          updates.checklist = finalChecklist;

          // 4. Save observation updates for both admin and common user
          if (observation.trim() !== (demandState.observation || '')) {
            updates.observation = observation.trim();
          }

          // Apply all updates to the doc in transaction
          transaction.update(demandDocRef, updates);
        });

        // Write audit logs
        for (const queuedLog of queuedLogs) {
          const logId = crypto.randomUUID();
          const logRef = doc(db, 'demands', demand.id, 'logs', logId);
          const logData: MovementLog = {
            id: logId,
            type: queuedLog.type as any,
            from: queuedLog.from,
            to: queuedLog.to,
            changedByUid: currentUid,
            changedByName: currentName,
            createdAt: nowStr
          };
          if (queuedLog.duration !== undefined) {
            logData.duration = queuedLog.duration;
          }
          await setDoc(logRef, logData);
        }
      } else {
        // Create new
        const firstProfId = involvedUids[0] || null;
        const matchedProf = professionals.find(p => p.id === firstProfId);
        const matchedUser = users.find(u => u.uid === firstProfId);
        const primaryUid = firstProfId;
        const primaryName = matchedProf ? matchedProf.name : (matchedUser ? matchedUser.name : null);

        const involvedNames: string[] = [];
        involvedUids.forEach(uid => {
          const matchedP = professionals.find(p => p.id === uid);
          const matchedU = users.find(u => u.uid === uid);
          const name = matchedP ? matchedP.name : (matchedU ? matchedU.name : null);
          if (name && !involvedNames.includes(name)) {
            involvedNames.push(name);
          }
        });

        const elapsedInit: Record<StatusType, number> = {
          'Em aberto': 0,
          'Em execução': 0,
          'Concluída': 0,
          'Cancelada': 0
        };

        const dateStr = new Date().toISOString();
        const targetStatus = (isAdmin && manualCompletedAt) ? 'Concluída' : status;

        await createDemand({
          title: title.trim(),
          description: description.trim(),
          requester: requester.trim(),
          priority: priority as PriorityType,
          category,
          status: targetStatus,
          assignedTo: primaryUid,
          assignedToName: primaryName,
          involvedUids,
          involvedNames,
          openedAt: dateStr,
          assignedAt: primaryUid ? dateStr : null,
          startedAt: manualStartedAt || (targetStatus === 'Em execução' ? dateStr : null),
          completedAt: manualCompletedAt || (targetStatus === 'Concluída' ? dateStr : null),
          lastStatusChangedAt: dateStr,
          elapsedTimes: elapsedInit,
          updatedAt: dateStr,
          createdByUid: currentUid,
          createdByEmail: currentEmail,
          dueDate: dueDate || null,
          checklist: finalChecklist || [],
          observation: observation.trim()
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      setErrorMessage('Erro ao salvar demanda. Por favor, tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleInvolved = (uid: string) => {
    if (involvedUids.includes(uid)) {
      setInvolvedUids(involvedUids.filter(id => id !== uid));
    } else {
      setInvolvedUids([...involvedUids, uid]);
    }
  };

  // Status lists (excluding Cancelada so it can only be done via the action button)
  const statusOptions: StatusType[] = [
    'Em aberto',
    'Em execução',
    'Concluída'
  ];

  const priorityOptions: PriorityType[] = ['Baixa', 'Média', 'Alta', 'Crítica'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-primary/40 backdrop-blur-xs transition-opacity duration-200" 
        onClick={onClose}
      />

      <form 
        onSubmit={handleSave}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-xl border border-outline-variant/30 relative z-10 flex flex-col my-8 max-h-[90vh]"
      >
        
        {/* Header */}
        <header className="px-6 py-4 border-b border-outline-variant/30 flex justify-between items-center bg-surface-container-low rounded-t-2xl font-sans">
          <div className="min-w-0 flex-1 mr-4">
            <h3 className="text-lg font-black text-slate-900 truncate" title={isEditing && demand ? (demand.title || `Detalhes # ${demand.id}`) : 'Cadastrar Nova Demanda'}>
              {isEditing && demand ? (demand.title || `Detalhes da Demanda #${demand.id}`) + ` (#${demand.id})` : 'Cadastrar Nova Demanda'}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5 truncate">
              {isEditing && demand ? `Setor: ${demand.requester} | Categoria: ${demand.category || 'Sem categoria'}` : 'Abra um novo ticket para o time'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isEditing && isAdmin && !isConcluded && (
              <button
                type="button"
                onClick={() => setAdminEditing(!adminEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  adminEditing
                    ? 'bg-[#3abeb9] border-[#3abeb9] text-white hover:opacity-90'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs'
                }`}
                title={adminEditing ? "Modo de Visualização" : "Modo de Edição"}
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>{adminEditing ? 'Visualizando' : 'Editar'}</span>
              </button>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:bg-surface-container-high p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content Form */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar text-left">
          
          {!isAdmin && isEditing && !isConcluded && !isExecutor && (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex gap-2">
              <Lock className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <p><strong>Apenas Leitura:</strong> Esta demanda está atribuída a outro profissional. Por não ser um envolvido, você não pode alterar campos, checklists ou o status.</p>
            </div>
          )}

          {isEditing && demand && (
            <div className="bg-[#f2faf9] border border-[#3abeb9]/20 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2 text-[#2ba39e] font-black text-xs uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>Métricas de Tempo e Execução</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Tempo em Aberto (Fila)</span>
                  <p className="text-sm font-bold text-slate-800">{formatTimeElapsed(openTimeSeconds)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Tempo de Execução (Ativo)</span>
                  <p className="text-sm font-bold text-slate-800">{formatTimeElapsed(executionTimeSeconds)}</p>
                </div>
                <div className="col-span-2 sm:col-span-1" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#3abeb9]/10">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Data de Abertura</span>
                  <p className="text-sm font-bold text-slate-800">{formatDateTimeBR(demand.openedAt)}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Início da Execução</span>
                  <p className="text-sm font-bold text-slate-800">{demand.startedAt ? formatDateTimeBR(demand.startedAt) : '---'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Data de Conclusão</span>
                  <p className="text-sm font-bold text-slate-800">{demand.completedAt ? formatDateTimeBR(demand.completedAt) : '---'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#3abeb9]/10">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Tempo de Abertura até o Final</span>
                  <p className="text-sm font-bold text-[#3abeb9]">{openedToFinalSeconds > 0 ? formatTimeElapsed(openedToFinalSeconds) : '---'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase block">Tempo de Execução até o Final</span>
                  <p className="text-sm font-bold text-[#3abeb9]">{executionToFinalSeconds > 0 ? formatTimeElapsed(executionToFinalSeconds) : '---'}</p>
                </div>
              </div>
            </div>
          )}
          
          {isReadOnly ? (
            <div className="space-y-5">
              
              {/* Title & Metadata Card */}
              <div className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-3.5 shadow-2xs space-y-2.5">
                <div>
                  <span className="text-[10px] font-extrabold text-[#3abeb9] uppercase tracking-widest block mb-0.5">Título do Chamado</span>
                  <h4 className="text-base font-black text-slate-900 leading-snug break-words">{title || 'Sem título'}</h4>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-200/45">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Setor / Solicitante</span>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/60 text-slate-700 text-xs font-bold px-2 py-1 rounded-lg shadow-3xs">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>{requester || 'Não informado'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Categoria</span>
                    <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200/60 text-[#3abeb9] text-xs font-bold px-2 py-1 rounded-lg shadow-3xs">
                      <FolderDot className="w-3 h-3 text-[#3abeb9]" />
                      <span>{category || 'Sem Categoria'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Prazo / Limite</span>
                    <div className={`inline-flex items-center gap-1.5 border text-xs font-bold px-2 py-1 rounded-lg shadow-3xs ${
                      dueDate 
                        ? 'bg-rose-50/45 border-rose-150 text-rose-700' 
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}>
                      <Calendar className="w-3 h-3" />
                      <span>{dueDate ? dueDate.split('-').reverse().join('/') : 'Sem prazo'}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-0.5">Gravidade</span>
                    <div className="inline-flex">
                      <span className={`inline-flex items-center gap-1.5 border text-xs font-bold px-2 py-1 rounded-lg shadow-3xs ${
                        priority === 'Crítica' ? 'bg-red-50 border-red-200 text-red-700' :
                        priority === 'Alta' ? 'bg-orange-50 border-orange-200 text-orange-700' :
                        priority === 'Média' ? 'bg-sky-50 border-sky-150 text-sky-700' :
                        'bg-slate-50 border-slate-200 text-slate-600'
                      }`}>
                        <AlertCircle className="w-3 h-3" />
                        <span>{priority}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description Card */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Descrição Detalhada</span>
                <div className="bg-slate-50/50 border border-slate-200/40 rounded-2xl p-4 text-sm text-slate-700 whitespace-pre-line leading-relaxed min-h-[90px]">
                  {description ? description : <span className="text-slate-400 italic">Nenhum detalhe técnico fornecido.</span>}
                </div>
              </div>

            </div>
          ) : (
            <>
              {/* Title / Requester Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-primary block">Título da Demanda</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Vazamento no ar condicionado central"
                    className="w-full text-sm border border-outline-variant rounded-xl p-2.5 focus:border-[#3abeb9] focus:ring-1 focus:ring-[#3abeb9]/40 outline-none transition-all disabled:bg-surface disabled:text-on-surface-variant text-slate-700 font-sans"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary block font-medium">Solicitante / Setor</label>
                  <select 
                    value={requester}
                    onChange={(e) => setRequester(e.target.value)}
                    className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none disabled:bg-surface disabled:text-on-surface-variant font-medium text-slate-700 font-sans"
                    required
                  >
                    <option value="">Selecione um Setor / Solicitante</option>
                    {sectors.filter(sec => !sec.inactive || sec.name === demand?.requester).map(sec => (
                      <option key={sec.id} value={sec.name}>{sec.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-primary block font-sans">Descrição Detalhada</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalhes completos sobre a situação, impacto e observações..."
                  className="w-full text-sm border border-outline-variant rounded-xl p-2.5 focus:border-[#3abeb9] focus:ring-1 focus:ring-[#3abeb9]/40 outline-none transition-all disabled:bg-surface disabled:text-on-surface-variant text-slate-700 font-sans"
                />
              </div>

              {/* Metrics Configuration Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Priority */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary block">Prioridade</label>
                  <select 
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityType)}
                    className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none disabled:bg-surface disabled:text-on-surface-variant text-slate-700 font-sans"
                    required
                  >
                    <option value="">Selecione a Gravidade</option>
                    {priorityOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-primary block">Categoria</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none disabled:bg-surface disabled:text-on-surface-variant text-slate-700 font-sans"
                    required
                  >
                    <option value="">Selecione uma Categoria</option>
                    {categories.filter(cat => !cat.inactive || cat.name === demand?.category).map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prazo / Data Limite (dueDate) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                  <Calendar className="w-3.5 h-3.5 text-[#3abeb9]" /> Prazo / Data Limite
                </label>
                <input 
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full text-sm border border-[#3abeb9] rounded-xl p-2.5 bg-white focus:border-[#3abeb9] focus:ring-1 focus:ring-[#3abeb9]/40 outline-none transition-all disabled:bg-surface disabled:text-on-surface-variant font-medium text-slate-700"
                />
              </div>

              {/* Seção Exclusiva de Administração (Manual Timestamps) */}
              {isAdmin && isEditing && (
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest block">
                    Controle Manual de Horários (Apenas Admin)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary block">Data de Abertura</label>
                      <input 
                        type="datetime-local"
                        value={openedAtState}
                        onChange={(e) => {
                          setOpenedAtState(e.target.value);
                          setIsOpenedAtManuallyEdited(true);
                        }}
                        className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none font-sans text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary block">Início da Execução</label>
                      <input 
                        type="datetime-local"
                        value={startedAtState}
                        onChange={(e) => {
                          setStartedAtState(e.target.value);
                          setIsStartedAtManuallyEdited(true);
                        }}
                        className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none font-sans text-slate-700"
                      />
                    </div>
                     <div className="space-y-1.5">
                      <label className="text-xs font-bold text-primary block">Conclusão / Término</label>
                      <input 
                        type="datetime-local"
                        value={completedAtState}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompletedAtState(val);
                          setIsCompletedAtManuallyEdited(true);
                          if (val) {
                            setStatus('Concluída');
                          }
                        }}
                        className="w-full text-sm border border-outline-variant rounded-xl p-2.5 bg-white focus:border-[#3abeb9] outline-none font-sans text-slate-700"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic font-medium leading-relaxed">
                    Deixe em branco para permitir o preenchimento automático em tempo real no fluxo de status.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Checklist de Subtarefas */}
          <div className="pt-4 border-t border-outline-variant/30 space-y-3 text-left">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                <Check className="w-4 h-4 text-[#3abeb9] stroke-[3]" /> Checklist de Subtarefas
              </label>
              {checklist.length > 0 && (
                <span className="bg-[#e6f8f7] text-[#2ba39e] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">
                  {checklist.filter(item => item.completed).length} de {checklist.length} concluídas
                </span>
              )}
            </div>

            {/* list of items */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {checklist.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-3 text-center font-medium bg-slate-50 border border-slate-200/50 rounded-xl">
                  Nenhuma etapa cadastrada no checklist.
                </p>
              ) : (
                checklist.map((item) => (
                  <div 
                    key={item.id} 
                    className="flex items-start gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
                  >
                    <button
                      type="button"
                      disabled={!isEditing || !canUserEditDemand}
                      onClick={() => handleToggleCheckItem(item.id)}
                      className={`mt-0.5 w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                        item.completed 
                          ? 'border-[#3abeb9] bg-[#3abeb9] text-white' 
                          : 'border-slate-300 bg-white hover:border-[#3abeb9]/60'
                      }`}
                    >
                      {item.completed && <Check className="w-3 h-3 stroke-[3.5] text-white" />}
                    </button>

                    <div className="flex-1 min-w-0 text-left">
                      <span className={`text-xs font-semibold break-words block ${item.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-700'}`}>
                        {item.text}
                      </span>
                      {item.completed && item.completedByName && (
                        <span className="text-[9px] text-slate-400 font-mono block mt-0.5">
                          Concluído por {item.completedByName} {item.completedAt && `em ${formatDateTimeBR(item.completedAt)}`}
                        </span>
                      )}
                    </div>

                    {isAdmin && !isConcluded && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCheckItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all shrink-0"
                        title="Remover etapa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* input to add new stage */}
            {isAdmin && !isConcluded && (
              <div className="flex items-center gap-2 mt-2">
                <input 
                  type="text"
                  value={newCheckItemText}
                  onChange={(e) => setNewCheckItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCheckItem();
                    }
                  }}
                  placeholder="Nova etapa do checklist (ex: Ligar para fornecedor)..."
                  className="flex-1 text-xs border border-outline-variant rounded-xl p-2.5 focus:border-[#3abeb9] outline-none transition-all placeholder-slate-400 font-sans font-medium text-slate-705"
                />
                <button
                  type="button"
                  onClick={handleAddCheckItem}
                  className="px-4 py-2.5 bg-[#e6f8f7] text-[#2ba39e] hover:bg-[#3abeb9] hover:text-white rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Inserir</span>
                </button>
              </div>
            )}
          </div>

          {/* Observações / Comentários do Executor */}
          {isEditing && (
            <div className="pt-4 border-t border-outline-variant/30 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                  <FileText className="w-4 h-4 text-[#3abeb9] stroke-[2]" /> Observação do Executor / Comentários
                </label>
                {demand?.observation && (
                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-sans border border-emerald-200">
                    Preenchido
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {isAdmin || isExecutor ? (
                  <div className="space-y-2">
                    <textarea
                      value={observation}
                      onChange={(e) => setObservation(e.target.value)}
                      placeholder="Adicione observações sobre o andamento, dificuldades ou detalhes da conclusão desta demanda..."
                      className="w-full text-xs border border-outline-variant rounded-xl p-3 focus:border-[#3abeb9] focus:ring-1 focus:ring-[#3abeb9]/40 outline-none transition-all placeholder-slate-400 font-sans font-semibold text-slate-705 min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveObservation}
                        disabled={isSavingObservation || observation.trim() === (demand?.observation || '')}
                        className="px-4 py-2 bg-[#e6f8f7] text-[#2ba39e] hover:bg-[#3abeb9] hover:text-white disabled:bg-slate-50 disabled:text-slate-400 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border border-[#3abeb9]/10 disabled:border-slate-200"
                      >
                        {isSavingObservation ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-[#2ba39e]/30 border-t-[#2ba39e] rounded-full animate-spin"></span>
                            <span>Salvando...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Salvar Observação</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
                    {demand?.observation ? (
                      demand.observation
                    ) : (
                      <span className="text-slate-400 italic font-normal">Nenhuma observação registrada pelo executor para este chamado.</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status & Assignments: Enabled for both edits AND creation */}
          <div className="pt-4 border-t border-outline-variant/30 space-y-5 text-left">
            
            {/* Professionals Searchable Multi-select Dropdown (appears first now) */}
            <div className="space-y-2 relative prof-selector-container text-left">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                  <Users className="w-3.5 h-3.5 text-[#3abeb9]" /> Profissionais Envolvidos
                </label>
                <span className="bg-[#e6f8f7] text-[#2ba39e] text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {involvedUids.length} selecionado{involvedUids.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isReadOnly ? (
                // Read Only View
                <div className="flex flex-wrap gap-1.5 p-3 border border-outline-variant/40 rounded-xl bg-slate-50 min-h-12">
                  {involvedUids.length === 0 ? (
                    <span className="text-xs text-slate-400 italic font-medium">Nenhum profissional envolvido</span>
                  ) : (
                    involvedUids.map(uid => {
                      const p = professionals.find(p => p.id === uid);
                      return (
                        <span key={uid} className="bg-white border border-slate-200 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-lg">
                          {p ? p.name : uid}
                        </span>
                      );
                    })
                  )}
                </div>
              ) : (
                // Editable View
                <div className="space-y-2">
                  {/* Dropdown input trigger */}
                  <div 
                    onClick={() => setIsProfDropdownOpen(!isProfDropdownOpen)}
                    className="flex items-center gap-2 border border-outline-variant/60 rounded-xl px-3.5 py-2.5 bg-white focus-within:border-[#3abeb9] focus-within:ring-2 focus-within:ring-[#3abeb9]/10 transition-all cursor-pointer shadow-2xs"
                  >
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input 
                      type="text"
                      value={profSearchQuery}
                      onChange={(e) => { 
                        setProfSearchQuery(e.target.value); 
                        setIsProfDropdownOpen(true); 
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onFocus={() => setIsProfDropdownOpen(true)}
                      placeholder="Digitar ou selecionar profissional..."
                      className="w-full text-xs font-semibold outline-none bg-transparent placeholder-slate-400 text-slate-800"
                    />
                    {isProfDropdownOpen ? (
                      <ChevronUp className="w-4 h-4 text-slate-400 hover:text-[#3abeb9] shrink-0 transition-colors" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400 hover:text-[#3abeb9] shrink-0 transition-colors" />
                    )}
                  </div>

                  {/* Selected Professionals pills area below search input */}
                  {involvedUids.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border border-dashed border-[#3abeb9]/30 rounded-xl bg-[#fafdfd]">
                      {involvedUids.map(uid => {
                        const p = professionals.find(prof => prof.id === uid);
                        return (
                          <span 
                            key={uid} 
                            className="bg-[#e6f8f7] border border-[#3abeb9]/20 text-[#2ba39e] text-xs font-bold px-2.5 py-1 rounded-xl flex items-center gap-1.5 max-w-full shadow-3xs"
                          >
                            <span className="truncate">{p ? p.name : uid}</span>
                            <button 
                              type="button" 
                              onClick={() => toggleInvolved(uid)}
                              className="hover:bg-[#3abeb9]/20 rounded-full p-0.5 transition-colors shrink-0"
                            >
                              <X className="w-3 h-3 text-[#3abeb9]" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Dropdown Options Box */}
                  {isProfDropdownOpen && (
                    <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 shadow-lg rounded-2xl p-1.5 space-y-1 custom-scrollbar">
                      {(() => {
                        const activeAndSelected = professionals.filter(p => !p.inactive || involvedUids.includes(p.id));
                        const filtered = activeAndSelected.filter(p => p.name.toLowerCase().includes(profSearchQuery.toLowerCase()));

                        if (filtered.length === 0) {
                          return (
                            <p className="text-xs font-semibold text-slate-400 py-4 text-center">
                              {profSearchQuery ? 'Nenhum profissional encontrado' : 'Nenhum profissional cadastrado'}
                            </p>
                          );
                        }

                        return filtered.map(p => {
                          const isChecked = involvedUids.includes(p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => toggleInvolved(p.id)}
                              className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                                isChecked 
                                  ? 'bg-[#e6f8f7] border-[#3abeb9]/35 text-[#2ba39e] font-bold' 
                                  : 'bg-white hover:bg-slate-50 border-transparent text-slate-600 font-medium'
                              }`}
                            >
                              <span className="truncate font-semibold">{p.name}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                isChecked 
                                  ? 'border-[#3abeb9] bg-[#3abeb9] text-white' 
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {isChecked && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Etapa de Status: Enabled for BOTH edits and creation. Visually styled, striking and prominent */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-primary flex items-center gap-1.5 font-sans">
                  <Clock className="w-3.5 h-3.5 text-[#3abeb9]" /> Etapa de Status da Demanda
                </label>
                <span className="text-[10px] font-black uppercase text-[#2ba39e] tracking-wider bg-[#3abeb9]/10 px-2.5 py-1 rounded-full">
                  Status Selecionado: {status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(() => {
                  const currentOptions = Array.from(new Set([...statusOptions, status])) as StatusType[];
                  const isStatusDisabled = !isEditing || isConcluded || !canUserEditDemand;

                  return currentOptions.map(opt => {
                    const isActive = status === opt;
                    
                    // Style config based on status type
                    let activeStyles = '';
                    let hoverStyles = '';
                    let iconBg = '';
                    
                    if (opt === 'Em aberto') {
                      activeStyles = 'border-amber-500 bg-amber-50/75 text-amber-800 ring-2 ring-amber-500/15 shadow-xs';
                      hoverStyles = 'hover:bg-amber-50/20 hover:border-amber-300';
                      iconBg = isActive ? 'bg-amber-500 text-white font-bold' : 'bg-slate-100 text-slate-400';
                    } else if (opt === 'Em execução') {
                      activeStyles = 'border-blue-500 bg-blue-50/75 text-blue-800 ring-2 ring-blue-500/15 shadow-xs';
                      hoverStyles = 'hover:bg-blue-50/20 hover:border-blue-300';
                      iconBg = isActive ? 'bg-blue-500 text-white font-bold' : 'bg-slate-100 text-slate-400';
                    } else if (opt === 'Concluída') {
                      activeStyles = 'border-[#3abeb9] bg-[#f0fbfb] text-[#004d4d] ring-2 ring-[#3abeb9]/15 shadow-xs';
                      hoverStyles = 'hover:bg-[#f0fbfb]/30 hover:border-[#3abeb9]/50';
                      iconBg = isActive ? 'bg-[#3abeb9] text-white font-bold' : 'bg-slate-100 text-slate-400';
                    } else { // Cancelada or others
                      activeStyles = 'border-rose-500 bg-rose-50/75 text-rose-800 ring-2 ring-rose-500/15 shadow-xs';
                      hoverStyles = 'hover:bg-rose-50/20 hover:border-rose-300';
                      iconBg = isActive ? 'bg-rose-500 text-white font-bold' : 'bg-slate-100 text-slate-400';
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          if (!isStatusDisabled) {
                            setStatus(opt);
                          }
                        }}
                        disabled={isStatusDisabled}
                        className={`group relative text-left p-3 rounded-2xl border transition-all duration-200 outline-none flex items-center gap-3 ${
                          isActive 
                            ? `${activeStyles} border-2` 
                            : `bg-white border-slate-200 text-slate-500 font-medium ${hoverStyles}`
                        } ${isStatusDisabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {/* Status Icon Indicator */}
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${iconBg}`}>
                          {opt === 'Em aberto' ? (
                            <Clock className="w-4 h-4" />
                          ) : opt === 'Em execução' ? (
                            <Activity className="w-4 h-4" />
                          ) : opt === 'Concluída' ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </div>

                        {/* Label */}
                        <div className="leading-tight shrink min-w-0">
                          <p className={`text-xs font-black ${isActive ? 'text-inherit' : 'text-slate-800 group-hover:text-slate-900'}`}>
                            {opt}
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium shrink block truncate">
                            {opt === 'Em aberto' ? 'Pendente de atendimento' : 
                             opt === 'Em execução' ? 'Sendo resolvida agora' : 
                             opt === 'Concluída' ? 'Trabalho finalizado' : 'Ticket arquivado'}
                          </span>
                        </div>

                        {/* Selected Indicator Circle */}
                        {isActive && (
                          <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                            opt === 'Em aberto' ? 'bg-amber-500' :
                            opt === 'Em execução' ? 'bg-blue-500' :
                            opt === 'Concluída' ? 'bg-[#3abeb9]' :
                            'bg-rose-500'
                          }`} />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

          </div>

        </div>

        {errorMessage && (
          <div className="px-6 py-2">
            <div className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-4 py-2.5 rounded-xl">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="px-6 py-4 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-3 rounded-b-2xl">
          {isConfirmingDelete ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3 bg-red-50 border border-red-100 p-3 rounded-xl">
              <span className="text-xs text-red-700 font-bold">
                Confirmar exclusão permanente desta demanda?
              </span>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-3 py-1.5 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold rounded-lg transition-all active:scale-95"
                >
                  Não, manter
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95"
                >
                  Sim, excluir
                </button>
              </div>
            </div>
          ) : isConfirmingCancel ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full gap-3 bg-amber-50 border border-amber-100 p-3 rounded-xl">
              <span className="text-xs text-amber-850 font-bold">
                Confirmar cancelamento definitivo desta demanda?
              </span>
              <div className="flex gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsConfirmingCancel(false)}
                  className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-bold rounded-lg transition-all active:scale-95"
                >
                  Não, manter ativa
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="px-3 py-1.5 bg-[#d97706] hover:bg-[#b45309] text-white text-xs font-bold rounded-lg shadow-xs transition-all active:scale-95"
                >
                  Sim, cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              {isEditing && (
                <div className="mr-auto flex items-center gap-2">
                  {isAdmin && status !== 'Concluída' && status !== 'Cancelada' && (
                    <button 
                      type="button" 
                      onClick={handleDelete}
                      className="px-4 py-2.5 bg-red-50 text-red-650 hover:bg-red-100 border border-red-200 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir Demanda
                    </button>
                  )}
                  {status !== 'Cancelada' && (isAdmin || isExecutor) && (
                    <button 
                      type="button" 
                      onClick={handleCancelDemand}
                      className="px-4 py-2.5 bg-amber-50 text-[#d97706] hover:bg-[#fef3c7] border border-[#f59e0b]/45 text-xs font-bold rounded-xl flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Cancelar Demanda
                    </button>
                  )}
                </div>
              )}
              {!canSave && (
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high rounded-xl transition-all"
                >
                  Fechar
                </button>
              )}
              {canSave && (
                <button 
                  type="submit" 
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-[#3abeb9] text-[#FFF] text-xs font-bold rounded-xl hover:opacity-95 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>{isEditing ? 'Salvar Mudanças' : 'Cadastrar Demanda'}</>
                  )}
                </button>
              )}
            </>
          )}
        </footer>
      </form>
    </div>
  );
}
