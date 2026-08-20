import React from 'react';
import { UserProfile, AccessControlPolicy } from '../types';
import { getCanonicalRole, isAdminRole, isPendingRole, isRejectedRole } from '../types/database.types';

/**
 * Evaluates the strict Role-Based Access Control (RBAC) policy for a given user profile.
 * Status and permissions are derived purely from user.role.
 * 
 * Matrix of Roles:
 * 1. Ожидает (Pending / Unassigned):
 *    - Waiting banner shown, basic guest read permissions
 * 
 * 2. Участник (Participant / Member):
 *    - Field Journal: Hidden (no raw records view, no entry, no export)
 *    - Map: Fully visible
 *    - Analytics: Averaged aggregate graphs only (raw data & export blocked)
 *    - Download/Edit: Blocked
 *    - Newspaper & Calendar: Read-only
 *    - PISA, Theme/Font settings, Research cards: Visible
 * 
 * 3. Исследователь (Researcher):
 *    - Field Journal: Full access to add/view records
 *    - Analytics: Full access
 *    - Download data: Allowed (CSV/Excel/Reports)
 *    - Newspaper & Calendar: Read-only (no edit/publish)
 * 
 * 4. Корреспондент (Correspondent / Editor):
 *    - Field Journal: Full access to add/view records
 *    - Analytics: Full access
 *    - Download data: Allowed
 *    - Newspaper & Calendar: Full access to edit, publish and delete
 * 
 * 5. Руководитель (Leader / Admin):
 *    - Field Journal: Full access
 *    - Analytics: Full access
 *    - Download data: Allowed
 *    - Newspaper & Calendar: Full access
 *    - Admin Panel & User Management: Full access
 */
export function evaluatePermissions(user: UserProfile | null): AccessControlPolicy {
  const isGuest = !user;
  const isPending = !!user && (isPendingRole(user.role) || user.status === 'pending');
  const isRejected = !!user && (isRejectedRole(user.role) || user.status === 'rejected');
  const isActive = !!user && !isPending && !isRejected;

  const canonical = user ? getCanonicalRole(user.role) : 'member';

  const isMember = isActive && canonical === 'member';
  const isResearcher = isActive && canonical === 'researcher';
  const isEditor = isActive && canonical === 'editor';
  const isLeader = isActive && (canonical === 'leader' || canonical === 'admin');
  const isAdmin = isActive && isAdminRole(user.role);

  // Grouped capabilities based on the strict RBAC Matrix
  const canAccessJournal = isActive && (isResearcher || isEditor || isLeader || isAdmin);
  const canCreateRecords = isActive && (isResearcher || isEditor || isLeader || isAdmin);
  const canViewRawRecords = isActive && (isResearcher || isEditor || isLeader || isAdmin);
  const canExportData = isActive && (isResearcher || isEditor || isLeader || isAdmin);
  const canEditData = isActive && (isResearcher || isEditor || isLeader || isAdmin);
  const canDeleteRecords = isActive && (isLeader || isAdmin);

  const canViewAnalytics = true; // Everyone can view analytics
  const canViewRawAnalytics = isActive && (isResearcher || isEditor || isLeader || isAdmin); // Averaged vs Raw data

  const canViewMap = true; // Map and points are accessible to everyone (including Participant)

  // Newspaper and Calendar editing: ONLY Correspondent, Leader, Admin
  const canEditNewspaper = isActive && (isEditor || isLeader || isAdmin);
  const canEditCalendar = isActive && (isEditor || isLeader || isAdmin);

  const canAccessPisa = true;
  const canViewResearchInfo = true;
  const canManageUsers = isAdmin;

  return {
    isGuest,
    isActiveMember: isActive,
    isPending,
    isMember,
    isResearcher,
    isEditor,
    isLeader,
    isAdmin,

    canAccessJournal,
    canViewRawRecords,
    canCreateRecords,
    canEditData,
    canExportData,
    canViewAnalytics,
    canViewRawAnalytics,
    canViewMap,
    canEditNewspaper,
    canEditCalendar,
    canAccessPisa,
    canViewResearchInfo,
    canCreateNewspaper: canEditNewspaper,
    canCreateEvents: canEditCalendar,
    canUploadImages: isActive && !isMember,
    canDeleteRecords,
    canManageUsers,
  };
}

/**
 * React Hook for consuming RBAC permissions
 */
export function usePermissions(user: UserProfile | null): AccessControlPolicy {
  return React.useMemo(() => evaluatePermissions(user), [user]);
}

/**
 * Declarative component for conditional rendering based on RBAC permission flag
 */
interface PermissionGateProps {
  can: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({ can, children, fallback = null }) => {
  if (!can) return <>{fallback}</>;
  return <>{children}</>;
};
