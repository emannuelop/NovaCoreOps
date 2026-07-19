import { auth, ADMIN_EMAIL } from '../lib/firebase';
import { UserProfile } from '../types';

/**
 * Hook to centrally determine if a user has administrator status.
 * Evaluates both the 'Administrador' role and the master admin email configured via VITE_ADMIN_EMAIL.
 */
export function useIsAdmin(currentUserProfile?: UserProfile | null) {
  const adminEmail = ADMIN_EMAIL;
  
  if (!currentUserProfile) {
    const firebaseUser = auth.currentUser;
    if (firebaseUser?.email) {
      return firebaseUser.email.toLowerCase() === adminEmail.toLowerCase();
    }
    return false;
  }
  
  const hasAdminRole = currentUserProfile.role === 'Administrador';
  const hasAdminEmail = 
    currentUserProfile.email?.toLowerCase() === adminEmail.toLowerCase() || 
    auth.currentUser?.email?.toLowerCase() === adminEmail.toLowerCase();
    
  return !!(hasAdminRole || hasAdminEmail);
}
