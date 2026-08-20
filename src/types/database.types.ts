/**
 * ============================================================================
 * DATABASE TYPES & MAPPINGS FOR ZEMLYANE.DATASPACE
 * ============================================================================
 * 
 * Defines raw Supabase PostgreSQL schema structures (snake_case)
 * alongside frontend client representations (camelCase) and bidirectional mappers.
 */

// ==========================================
// 1. RAW DATABASE SCHEMA TYPES (snake_case)
// ==========================================

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  avatar_url?: string | null;
  password?: string | null;
  pin_code?: string | null;
  created_at: string;
}

export interface ProfileInsert {
  id?: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  password?: string | null;
  pin_code?: string | null;
  created_at?: string;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  password?: string | null;
  pin_code?: string | null;
  created_at?: string;
}

export interface StationRow {
  id: string;
  name: string;
  coordinates: string | null;
  year_founded: number | null;
  description: string | null;
}

export interface StationInsert {
  id?: string;
  name: string;
  coordinates?: string | null;
  year_founded?: number | null;
  description?: string | null;
}

export interface StationUpdate {
  id?: string;
  name?: string;
  coordinates?: string | null;
  year_founded?: number | null;
  description?: string | null;
}

export interface RecordRow {
  id: string;
  station_id: string;
  value: any;
  date: string;
  notes: string | null;
}

export interface RecordInsert {
  id?: string;
  station_id: string;
  value: any;
  date?: string;
  notes?: string | null;
}

export interface RecordUpdate {
  id?: string;
  station_id?: string;
  value?: any;
  date?: string;
  notes?: string | null;
}

export interface NewspaperNoteRow {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string | null;
}

export interface NewspaperNoteInsert {
  id?: string;
  title: string;
  content: string;
  date?: string;
  author?: string | null;
}

export interface NewspaperNoteUpdate {
  id?: string;
  title?: string;
  content?: string;
  date?: string;
  author?: string | null;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Generic Supabase Database Schema Interface
 */
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      stations: {
        Row: StationRow;
        Insert: StationInsert;
        Update: StationUpdate;
        Relationships: [];
      };
      records: {
        Row: RecordRow;
        Insert: RecordInsert;
        Update: RecordUpdate;
        Relationships: [];
      };
      newspaper_notes: {
        Row: NewspaperNoteRow;
        Insert: NewspaperNoteInsert;
        Update: NewspaperNoteUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

// ==========================================
// 2. CLIENT DOMAIN MODELS (camelCase)
// ==========================================

export interface UserProfileClient {
  id: string;
  email: string;
  nickname?: string;
  fullName: string;
  role: string;
  status?: string;
  avatarUrl?: string;
  password?: string;
  pinCode?: string;
  createdAt: string;
}

export interface StationClient {
  id: string;
  name: string;
  coordinates: string;
  yearFounded?: number;
  description: string;
}

export interface RecordClient {
  id: string;
  stationId: string;
  value: any;
  date: string;
  notes: string;
}

export interface NewspaperNoteClient {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
}

export function nicknameToTechnicalEmail(nicknameOrEmail: string): string {
  const trimmed = nicknameOrEmail.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  return `${trimmed}@zemlyane.space`;
}

export function extractNicknameFromEmail(emailOrNickname?: string | null): string {
  if (!emailOrNickname) return '';
  const trimmed = emailOrNickname.trim().toLowerCase();
  if (trimmed.endsWith('@zemlyane.space')) {
    return trimmed.replace('@zemlyane.space', '');
  }
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  return trimmed;
}

export function validateNickname(nickname: string): { isValid: boolean; error?: string } {
  const trimmed = nickname.trim().toLowerCase();
  if (!trimmed) {
    return { isValid: false, error: 'Введите никнейм.' };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Никнейм должен содержать не менее 3 символов.' };
  }
  if (trimmed.length > 20) {
    return { isValid: false, error: 'Никнейм не должен превышать 20 символов.' };
  }
  const regex = /^[a-z0-9_-]+$/;
  if (!regex.test(trimmed)) {
    return { 
      isValid: false, 
      error: 'Разрешены только латинские буквы (a-z), цифры (0-9), дефис (-) и подчеркивание (_).' 
    };
  }
  return { isValid: true };
}

// ==========================================
// ROLE AND STATUS UTILITIES
// ==========================================
export const VALID_ROLES = [
  'Участник',
  'Исследователь',
  'Корреспондент',
  'Руководитель',
  'Администратор',
] as const;

export function isPendingRole(role?: string | null): boolean {
  if (!role) return true;
  const r = role.trim().toLowerCase();
  return (
    r === '' ||
    r === 'ожидает' ||
    r === 'pending' ||
    r === 'waiting' ||
    r === 'none' ||
    r === 'null' ||
    r === 'undefined'
  );
}

export function isRejectedRole(role?: string | null): boolean {
  if (!role) return false;
  const r = role.trim().toLowerCase();
  return r === 'отклонен' || r === 'отклонено' || r === 'rejected' || r === 'blocked';
}

export function normalizeRole(role?: string | null): string {
  if (!role || isPendingRole(role)) return 'Ожидает';
  if (isRejectedRole(role)) return 'Отклонен';
  const r = role.trim().toLowerCase();
  if (r === 'admin' || r === 'администратор' || r === 'administrator') return 'Администратор';
  if (r === 'leader' || r === 'руководитель' || r === 'head' || r === 'teacher') return 'Руководитель';
  if (r === 'researcher' || r === 'исследователь') return 'Исследователь';
  if (r === 'editor' || r === 'корреспондент' || r === 'journalist') return 'Корреспондент';
  if (r === 'member' || r === 'участник' || r === 'user' || r === 'participant') return 'Участник';
  return role.trim();
}

export function getUserStatusFromRole(role?: string | null, email?: string | null): 'active' | 'pending' | 'rejected' {
  if (email && email.toLowerCase() === 'admin@zemlyane.space') return 'active';
  if (isRejectedRole(role)) return 'rejected';
  if (isPendingRole(role)) return 'pending';
  return 'active';
}

export function getCanonicalRole(role?: string | null): 'admin' | 'leader' | 'researcher' | 'editor' | 'member' | 'pending' {
  if (isPendingRole(role)) return 'pending';
  if (isRejectedRole(role)) return 'pending';
  const norm = normalizeRole(role);
  if (norm === 'Администратор') return 'admin';
  if (norm === 'Руководитель') return 'leader';
  if (norm === 'Исследователь') return 'researcher';
  if (norm === 'Корреспондент') return 'editor';
  if (norm === 'Участник') return 'member';
  return 'member';
}

export function isAdminRole(role?: string | null): boolean {
  const c = getCanonicalRole(role);
  return c === 'admin' || c === 'leader';
}

// ==========================================
// 3. BIDIRECTIONAL MAPPERS
// ==========================================

/**
 * Profiles Mappers (Computes client status purely from role; does not use DB status column)
 */
export function mapProfileRowToClient(row: ProfileRow): UserProfileClient {
  const pwd = row.password || row.pin_code || undefined;
  const isSysAdmin = row.email?.toLowerCase() === 'admin@zemlyane.space';
  const rawRole = isSysAdmin ? 'Администратор' : row.role;
  const normalizedRoleStr = isSysAdmin ? 'Администратор' : normalizeRole(rawRole);
  const status = getUserStatusFromRole(rawRole, row.email);

  return {
    id: row.id,
    email: row.email,
    nickname: extractNicknameFromEmail(row.email),
    fullName: row.full_name || 'Исследователь',
    role: normalizedRoleStr,
    status: status,
    avatarUrl: row.avatar_url || undefined,
    password: pwd,
    pinCode: pwd, // backward compatibility
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function mapProfileClientToInsert(client: Partial<UserProfileClient> & { email: string }): ProfileInsert {
  const pwd = (client.password || client.pinCode)?.trim() || null;
  const isSysAdmin = client.email.trim().toLowerCase() === 'admin@zemlyane.space';
  const roleVal = isSysAdmin ? 'Администратор' : (client.role ? normalizeRole(client.role) : 'Ожидает');

  return {
    ...(client.id ? { id: client.id } : {}),
    email: client.email.trim().toLowerCase(),
    full_name: client.fullName?.trim() || null,
    role: roleVal,
    avatar_url: client.avatarUrl || null,
    password: pwd,
    pin_code: pwd,
    created_at: client.createdAt || new Date().toISOString(),
  };
}

export function mapProfileClientToUpdate(client: Partial<UserProfileClient>): ProfileUpdate {
  const update: ProfileUpdate = {};
  if (client.email !== undefined) update.email = client.email.trim().toLowerCase();
  if (client.fullName !== undefined) update.full_name = client.fullName.trim() || null;
  if (client.role !== undefined) update.role = normalizeRole(client.role);
  if (client.avatarUrl !== undefined) update.avatar_url = client.avatarUrl;
  if (client.password !== undefined || client.pinCode !== undefined) {
    const pwd = (client.password || client.pinCode)?.trim() || null;
    update.password = pwd;
    update.pin_code = pwd;
  }
  if (client.createdAt !== undefined) update.created_at = client.createdAt;
  return update;
}

/**
 * Stations Mappers
 */
export function mapStationRowToClient(row: StationRow): StationClient {
  return {
    id: row.id,
    name: row.name,
    coordinates: row.coordinates || '0, 0',
    yearFounded: row.year_founded ?? undefined,
    description: row.description || '',
  };
}

export function mapStationClientToInsert(client: Partial<StationClient> & { name: string }): StationInsert {
  return {
    ...(client.id ? { id: client.id } : {}),
    name: client.name.trim(),
    coordinates: client.coordinates?.trim() || null,
    year_founded: client.yearFounded ?? null,
    description: client.description?.trim() || null,
  };
}

export function mapStationClientToUpdate(client: Partial<StationClient>): StationUpdate {
  const update: StationUpdate = {};
  if (client.name !== undefined) update.name = client.name.trim();
  if (client.coordinates !== undefined) update.coordinates = client.coordinates.trim() || null;
  if (client.yearFounded !== undefined) update.year_founded = client.yearFounded ?? null;
  if (client.description !== undefined) update.description = client.description.trim() || null;
  return update;
}

/**
 * Records Mappers
 */
export function mapRecordRowToClient(row: RecordRow): RecordClient {
  return {
    id: row.id,
    stationId: row.station_id,
    value: row.value,
    date: row.date,
    notes: row.notes || '',
  };
}

export function mapRecordClientToInsert(client: Partial<RecordClient> & { stationId: string; value: any }): RecordInsert {
  return {
    ...(client.id ? { id: client.id } : {}),
    station_id: client.stationId,
    value: client.value,
    date: client.date || new Date().toISOString().split('T')[0],
    notes: client.notes?.trim() || null,
  };
}

export function mapRecordClientToUpdate(client: Partial<RecordClient>): RecordUpdate {
  const update: RecordUpdate = {};
  if (client.stationId !== undefined) update.station_id = client.stationId;
  if (client.value !== undefined) update.value = client.value;
  if (client.date !== undefined) update.date = client.date;
  if (client.notes !== undefined) update.notes = client.notes.trim() || null;
  return update;
}

/**
 * Newspaper Notes Mappers
 */
export function mapNewspaperNoteRowToClient(row: NewspaperNoteRow): NewspaperNoteClient {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    date: row.date,
    author: row.author || 'Редколлегия',
  };
}

export function mapNewspaperNoteClientToInsert(client: Partial<NewspaperNoteClient> & { title: string; content: string }): NewspaperNoteInsert {
  return {
    ...(client.id ? { id: client.id } : {}),
    title: client.title.trim(),
    content: client.content.trim(),
    date: client.date || new Date().toISOString().split('T')[0],
    author: client.author?.trim() || 'Редколлегия',
  };
}

export function mapNewspaperNoteClientToUpdate(client: Partial<NewspaperNoteClient>): NewspaperNoteUpdate {
  const update: NewspaperNoteUpdate = {};
  if (client.title !== undefined) update.title = client.title.trim();
  if (client.content !== undefined) update.content = client.content.trim();
  if (client.date !== undefined) update.date = client.date;
  if (client.author !== undefined) update.author = client.author.trim() || null;
  return update;
}
