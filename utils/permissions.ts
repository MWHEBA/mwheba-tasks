/**
 * Permission utilities for role-based access control
 * 
 * Roles:
 * - admin: Full access to all system functions
 * - designer: Can create and edit tasks, but cannot delete
 * - print_manager: Can view and update task status, but cannot create tasks
 */

import { AuthService } from '../services/authService';

export type UserRole = 'admin' | 'designer' | 'print_manager';

/**
 * Permission checks for different actions
 */
export const Permissions = {
  /**
   * Check if user can create tasks
   * Admin and Designer can create tasks
   */
  canCreateTask: (): boolean => {
    return AuthService.isAdmin() || AuthService.isDesigner();
  },

  /**
   * Check if user can edit tasks
   * All authenticated users can edit tasks (update status, add comments, etc.)
   */
  canEditTask: (): boolean => {
    return AuthService.isAuthenticated();
  },

  /**
   * Check if user can delete tasks
   * Only Admin can delete tasks
   */
  canDeleteTask: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can create clients
   * Only Admin can create clients
   */
  canCreateClient: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can edit clients
   * Only Admin can edit clients
   */
  canEditClient: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can delete clients
   * Only Admin can delete clients
   */
  canDeleteClient: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can manage settings
   * Only Admin can manage settings
   */
  canManageSettings: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can manage statuses
   * Only Admin can manage statuses
   */
  canManageStatuses: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can manage products
   * Only Admin can manage products
   */
  canManageProducts: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can manage users
   * Only Admin can manage users
   */
  canManageUsers: (): boolean => {
    return AuthService.isAdmin();
  },

  /**
   * Check if user can view tasks
   * All authenticated users can view tasks
   */
  canViewTasks: (): boolean => {
    return AuthService.isAuthenticated();
  },

  /**
   * Check if user can update task status
   * All authenticated users can update task status
   */
  canUpdateTaskStatus: (): boolean => {
    return AuthService.isAuthenticated();
  },

  /**
   * Check if user can add comments
   * All authenticated users can add comments
   */
  canAddComments: (): boolean => {
    return AuthService.isAuthenticated();
  },

  /**
   * Check if user can add attachments
   * All authenticated users can add attachments
   */
  canAddAttachments: (): boolean => {
    return AuthService.isAuthenticated();
  },

  /**
   * Get user role display name in Arabic
   */
  getRoleDisplayName: (role: UserRole): string => {
    const roleNames: Record<UserRole, string> = {
      admin: 'مدير النظام',
      designer: 'مصمم',
      print_manager: 'مدير الطباعة',
    };
    return roleNames[role] || role;
  },

  /**
   * Get current user role
   */
  getCurrentUserRole: (): UserRole | null => {
    const user = AuthService.getStoredUser();
    return user?.role || null;
  },

  /**
   * Check if user has specific role
   */
  hasRole: (role: UserRole): boolean => {
    return AuthService.hasRole(role);
  },
};
