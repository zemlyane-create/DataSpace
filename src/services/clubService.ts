/**
 * ============================================================================
 * CLUB SERVICE (SERVICE LAYER FOR ZEMLYANE.DATASPACE)
 * ============================================================================
 * 
 * Centralized business logic and API service interacting with Supabase tables:
 * - `profiles` (User registration, roles, pin codes)
 * - `stations` (Ecological monitoring posts and points)
 * - `records` (Field measurements and laboratory records)
 * - `newspaper_notes` (Articles, clippings and field dispatches)
 */

import { supabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  UserProfileClient,
  StationClient,
  RecordClient,
  NewspaperNoteClient,
  ProfileRow,
  StationRow,
  RecordRow,
  NewspaperNoteRow,
  mapProfileRowToClient,
  mapProfileClientToInsert,
  mapProfileClientToUpdate,
  mapStationRowToClient,
  mapStationClientToInsert,
  mapStationClientToUpdate,
  mapRecordRowToClient,
  mapRecordClientToInsert,
  mapRecordClientToUpdate,
  mapNewspaperNoteRowToClient,
  mapNewspaperNoteClientToInsert,
  mapNewspaperNoteClientToUpdate,
  normalizeRole,
  isAdminRole,
  getCanonicalRole,
  isPendingRole,
  isRejectedRole,
  getUserStatusFromRole,
  nicknameToTechnicalEmail,
  extractNicknameFromEmail,
  validateNickname,
} from '../types/database.types';

export { 
  isAdminRole, 
  normalizeRole, 
  getCanonicalRole, 
  isPendingRole,
  isRejectedRole,
  getUserStatusFromRole,
  nicknameToTechnicalEmail, 
  extractNicknameFromEmail, 
  validateNickname 
};

// ==========================================
// CRYPTO SAFE UUID GENERATOR (RFC 4122 v4)
// ==========================================
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ==========================================
// LOCAL STORAGE KEYS FOR OFFLINE RESILIENCE
// ==========================================
const LOCAL_STORAGE_PROFILES_KEY = 'zemlyane_db_profiles_v1';
const LOCAL_STORAGE_STATIONS_KEY = 'zemlyane_db_stations_v1';
const LOCAL_STORAGE_RECORDS_KEY = 'zemlyane_db_records_v1';
const LOCAL_STORAGE_NOTES_KEY = 'zemlyane_db_notes_v1';

function getLocal<T>(key: string, fallback: T[] = []): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn(`[LocalCache] Notice reading ${key}:`, e);
    return fallback;
  }
}

function setLocal<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[LocalCache] Notice writing ${key}:`, e);
  }
}

// ==========================================
// PREDEFINED ADMIN CREDENTIALS & CONSTANTS
// ==========================================
export const ADMIN_CREDENTIALS = {
  email: 'admin@zemlyane.space',
  password: 'Zemlyane2026!Secure',
  pinCode: '2026',
  fullName: 'Главный Администратор',
  role: 'Администратор',
};

// ==========================================
// 1. PROFILES MANAGEMENT (profiles table)
// ==========================================

export async function ensureAdminProfileExists(): Promise<UserProfileClient> {
  const emailClean = ADMIN_CREDENTIALS.email.toLowerCase();
  try {
    const adminProfile = await getProfileByEmail(emailClean);
    if (adminProfile) {
      if (adminProfile.role !== 'Администратор' || !adminProfile.password) {
        return await updateProfile(adminProfile.id, { 
          role: 'Администратор',
          password: ADMIN_CREDENTIALS.password,
          pinCode: ADMIN_CREDENTIALS.pinCode,
        });
      }
      return adminProfile;
    }
  } catch (err) {
    console.warn('[clubService.ensureAdminProfileExists] Notice checking admin:', err);
  }

  return await registerUser({
    email: emailClean,
    fullName: ADMIN_CREDENTIALS.fullName,
    role: ADMIN_CREDENTIALS.role,
    password: ADMIN_CREDENTIALS.password,
  });
}

export async function registerUser(payload: {
  email: string;
  fullName: string;
  role?: string;
  password?: string;
  pinCode?: string;
}): Promise<UserProfileClient> {
  const emailClean = payload.email.trim().toLowerCase();
  const passwordVal = (payload.password || payload.pinCode || '').trim();
  const isSysAdmin = emailClean === ADMIN_CREDENTIALS.email.toLowerCase();
  const normalizedRole = isSysAdmin ? 'Администратор' : normalizeRole(payload.role || 'Ожидает');

  let profileId = generateUUID();

  // Attempt Supabase Auth registration for RLS auth.uid() compatibility
  if (isSupabaseConfigured()) {
    try {
      if (passwordVal && passwordVal.length >= 6) {
        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
          email: emailClean,
          password: passwordVal,
          options: {
            data: {
              full_name: payload.fullName.trim(),
              role: normalizedRole,
            },
          },
        });

        if (!authError && authData?.user?.id) {
          profileId = authData.user.id;
        } else if (authError) {
          console.warn('[clubService.registerUser] Supabase Auth notice:', authError.message);
        }
      }
    } catch (authErr) {
      console.warn('[clubService.registerUser] Supabase Auth notice:', authErr);
    }

    try {
      // 1. Check if profile already exists in DB by email to avoid ON CONFLICT errors
      const { data: existingRow, error: checkError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', emailClean)
        .maybeSingle();

      if (!checkError && existingRow) {
        // Update existing profile
        const updatePayload = mapProfileClientToUpdate({
          fullName: payload.fullName.trim(),
          role: payload.role ? normalizedRole : (existingRow.role || normalizedRole),
          password: passwordVal || existingRow.password,
        });

        const { data: updatedData, error: updateError } = await supabaseClient
          .from('profiles')
          .update(updatePayload as any)
          .eq('id', existingRow.id)
          .select()
          .single();

        if (!updateError && updatedData) {
          const clientProfile = mapProfileRowToClient(updatedData as ProfileRow);
          const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
          setLocal(LOCAL_STORAGE_PROFILES_KEY, [clientProfile, ...local.filter((p) => p.email !== emailClean)]);
          return clientProfile;
        }
      }

      // 2. Insert new profile
      const insertData = mapProfileClientToInsert({
        id: profileId,
        email: emailClean,
        fullName: payload.fullName.trim(),
        role: normalizedRole,
        password: passwordVal,
        createdAt: new Date().toISOString(),
      });

      const { data: insertedData, error: insertError } = await supabaseClient
        .from('profiles')
        .insert([insertData as any])
        .select()
        .single();

      if (!insertError && insertedData) {
        const clientProfile = mapProfileRowToClient(insertedData as ProfileRow);
        const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
        setLocal(LOCAL_STORAGE_PROFILES_KEY, [clientProfile, ...local.filter((p) => p.email !== emailClean)]);
        return clientProfile;
      } else if (insertError) {
        console.warn('[clubService.registerUser] Supabase insert notice:', insertError.message);
      }
    } catch (dbErr: any) {
      console.warn('[clubService.registerUser] Database communication notice, using local cache:', dbErr?.message || dbErr);
    }
  }

  // Graceful Local Fallback
  const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
  const existing = local.find((p) => p.email === emailClean);
  const newProfile: UserProfileClient = {
    id: existing?.id || profileId,
    email: emailClean,
    fullName: payload.fullName.trim() || 'Исследователь',
    role: normalizedRole,
    status: isPendingRole(normalizedRole) ? 'pending' : 'active',
    password: passwordVal,
    pinCode: passwordVal,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  const updated = [newProfile, ...local.filter((p) => p.email !== emailClean)];
  setLocal(LOCAL_STORAGE_PROFILES_KEY, updated);
  return newProfile;
}

export async function getProfiles(): Promise<UserProfileClient[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        const clientProfiles = (data as ProfileRow[]).map(mapProfileRowToClient);
        setLocal(LOCAL_STORAGE_PROFILES_KEY, clientProfiles);
        return clientProfiles;
      } else if (error) {
        console.warn('[clubService.getProfiles] Notice querying profiles:', error.message);
      }
    } catch (err) {
      console.warn('[clubService.getProfiles] Offline notice:', err);
    }
  }

  return getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
}

export async function getProfileById(id: string): Promise<UserProfileClient | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        return mapProfileRowToClient(data as ProfileRow);
      }
    } catch (err) {
      console.warn('[clubService.getProfileById] Notice:', err);
    }
  }

  const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
  return local.find((p) => p.id === id) || null;
}

export async function getProfileByEmail(email: string): Promise<UserProfileClient | null> {
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return mapProfileRowToClient(data as ProfileRow);
      }
    } catch (err) {
      console.warn('[clubService.getProfileByEmail] Notice:', err);
    }
  }

  const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
  return local.find((p) => p.email.toLowerCase() === cleanEmail) || null;
}

export async function updateProfile(
  id: string,
  updates: Partial<UserProfileClient>
): Promise<UserProfileClient> {
  const updateData = mapProfileClientToUpdate(updates);

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .update(updateData as any)
        .eq('id', id)
        .select()
        .maybeSingle();

      if (!error && data) {
        const updatedProfile = mapProfileRowToClient(data as ProfileRow);
        const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
        setLocal(
          LOCAL_STORAGE_PROFILES_KEY,
          local.map((p) => (p.id === id ? updatedProfile : p))
        );
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('zemlyane_profile_updated', { detail: updatedProfile }));
        }
        return updatedProfile;
      } else if (error) {
        console.warn('[clubService.updateProfile] Notice updating profile:', error.message);
      }
    } catch (err) {
      console.warn('[clubService.updateProfile] Offline update notice:', err);
    }
  }

  const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
  const target = local.find((p) => p.id === id);
  if (!target) {
    // If not found, create or update fallback
    const fallbackProfile: UserProfileClient = {
      id,
      email: updates.email || 'user@zemlyane.space',
      fullName: updates.fullName || 'Исследователь',
      role: normalizeRole(updates.role || 'Участник'),
      ...updates,
      createdAt: new Date().toISOString(),
    };
    setLocal(LOCAL_STORAGE_PROFILES_KEY, [fallbackProfile, ...local]);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('zemlyane_profile_updated', { detail: fallbackProfile }));
    }
    return fallbackProfile;
  }

  const updated: UserProfileClient = {
    ...target,
    ...updates,
    role: normalizeRole(updates.role !== undefined ? updates.role : target.role),
    id: target.id,
  };
  setLocal(
    LOCAL_STORAGE_PROFILES_KEY,
    local.map((p) => (p.id === id ? updated : p))
  );
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('zemlyane_profile_updated', { detail: updated }));
  }
  return updated;
}

export async function deleteProfile(id: string): Promise<boolean> {
  let success = true;

  if (isSupabaseConfigured()) {
    const { error } = await supabaseClient.from('profiles').delete().eq('id', id);
    if (error) {
      console.error('[clubService.deleteProfile] Supabase delete error:', error.message);
      success = false;
    }
  }

  const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
  setLocal(
    LOCAL_STORAGE_PROFILES_KEY,
    local.filter((p) => p.id !== id)
  );

  return success;
}

/**
 * Deletes test accounts (profiles matching test/dummy patterns or unapproved test entries)
 */
export async function cleanTestProfiles(): Promise<{ deletedCount: number; deletedEmails: string[] }> {
  const all = await getProfiles();
  const testPatterns = [
    'test',
    'novice@',
    'example.com',
    'dummy',
    'demo',
    'sample',
    'test@',
    'testuser',
  ];

  const testProfiles = all.filter((p) => {
    // Never delete admin
    if (p.email.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase()) return false;
    const lowerEmail = p.email.toLowerCase();
    const lowerName = p.fullName.toLowerCase();
    return (
      testPatterns.some((pat) => lowerEmail.includes(pat) || lowerName.includes(pat))
    );
  });

  const deletedEmails: string[] = [];

  for (const tp of testProfiles) {
    const ok = await deleteProfile(tp.id);
    if (ok) {
      deletedEmails.push(tp.email);
    }
  }

  return {
    deletedCount: deletedEmails.length,
    deletedEmails,
  };
}

export async function verifyPassword(
  email: string,
  passwordInput: string
): Promise<{ success: boolean; profile?: UserProfileClient; error?: string }> {
  const profile = await getProfileByEmail(email);
  if (!profile) {
    return { success: false, error: 'Пользователь с таким email не найден.' };
  }

  const expectedPassword = profile.password || profile.pinCode;

  if (!expectedPassword) {
    return { success: true, profile };
  }

  if (!passwordInput || !passwordInput.trim()) {
    return { success: false, error: 'Пожалуйста, введите пароль.' };
  }

  if (expectedPassword.trim() === passwordInput.trim()) {
    return { success: true, profile };
  }

  return { success: false, error: 'Неверный пароль доступа.' };
}

export const verifyPinCode = verifyPassword;

/**
 * Check if a nickname is valid and available for registration
 */
export async function checkNicknameAvailability(nickname: string): Promise<{ available: boolean; error?: string }> {
  const validation = validateNickname(nickname);
  if (!validation.isValid) {
    return { available: false, error: validation.error };
  }

  const technicalEmail = nicknameToTechnicalEmail(nickname);

  if (
    technicalEmail === ADMIN_CREDENTIALS.email.toLowerCase() ||
    nickname.trim().toLowerCase() === 'admin'
  ) {
    return { available: false, error: 'Этот никнейм зарезервирован для системного администратора.' };
  }

  const existingProfile = await getProfileByEmail(technicalEmail);
  if (existingProfile) {
    return { available: false, error: 'Пользователь с таким никнеймом уже зарегистрирован в базе.' };
  }

  return { available: true };
}

/**
 * Direct check of user profile from profiles table by auth.uid(), id, email, or nickname
 * (executed on app load, window focus, tab visibility change, and manual refresh button)
 */
export async function refreshCurrentUserProfile(identifier?: string | null): Promise<UserProfileClient | null> {
  if (isSupabaseConfigured()) {
    try {
      let authUid: string | null = null;
      let authEmail: string | null = null;

      // 1. Get current Supabase Auth user if logged in
      try {
        const { data: authData } = await supabaseClient.auth.getUser();
        if (authData?.user) {
          authUid = authData.user.id;
          authEmail = authData.user.email?.toLowerCase() || null;
        }
      } catch (authErr) {
        // Continue with identifier
      }

      let queryEmail: string | null = authEmail;
      let queryId: string | null = authUid;

      if (identifier) {
        const trimmed = identifier.trim();
        if (trimmed.includes('@') || (!trimmed.includes('-') && trimmed.length < 32)) {
          queryEmail = nicknameToTechnicalEmail(trimmed).toLowerCase();
        } else {
          queryId = trimmed;
        }
      }

      if (!queryEmail && !queryId) {
        const localEmail = localStorage.getItem('zemlyane_current_email');
        if (localEmail) {
          queryEmail = localEmail.toLowerCase();
        }
      }

      // 2. Direct UNRESTRICTED query to profiles table
      let profileRow: ProfileRow | null = null;

      if (queryId && queryEmail) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .or(`id.eq.${queryId},email.eq.${queryEmail}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          profileRow = data as ProfileRow;
        }
      } else if (queryId) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', queryId)
          .maybeSingle();

        if (!error && data) {
          profileRow = data as ProfileRow;
        }
      } else if (queryEmail) {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('email', queryEmail)
          .maybeSingle();

        if (!error && data) {
          profileRow = data as ProfileRow;
        }
      }

      if (profileRow) {
        const clientProfile = mapProfileRowToClient(profileRow);
        // Sync local cache
        const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
        const filtered = local.filter(
          (p) => p.id !== clientProfile.id && p.email.toLowerCase() !== clientProfile.email.toLowerCase()
        );
        setLocal(LOCAL_STORAGE_PROFILES_KEY, [clientProfile, ...filtered]);
        return clientProfile;
      }
    } catch (err) {
      console.warn('[clubService.refreshCurrentUserProfile] Direct fetch notice:', err);
    }
  }

  // Fallback to local storage
  const localEmail = identifier ? nicknameToTechnicalEmail(identifier).toLowerCase() : localStorage.getItem('zemlyane_current_email')?.toLowerCase();
  if (localEmail) {
    const local = getLocal<UserProfileClient>(LOCAL_STORAGE_PROFILES_KEY);
    return local.find((p) => p.email.toLowerCase() === localEmail || p.id === identifier) || null;
  }
  return null;
}

/**
 * Standard session login with credentials (nickname/email and password)
 */
export async function loginUser(
  identifier: string,
  passwordInput?: string
): Promise<{ success: boolean; profile?: UserProfileClient; error?: string }> {
  const cleanIdentifier = identifier.trim().toLowerCase();
  const cleanEmail = nicknameToTechnicalEmail(cleanIdentifier);
  const cleanPassword = (passwordInput || '').trim();

  if (!cleanIdentifier) {
    return { success: false, error: 'Введите никнейм (логин).' };
  }

  // 1. Admin Account Check
  if (
    cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() ||
    cleanEmail === 'admin@zemlyane.kz' ||
    cleanIdentifier === 'admin'
  ) {
    if (!cleanPassword) {
      return { success: false, error: 'Введите пароль администратора.' };
    }

    const admin = await ensureAdminProfileExists();
    const adminExpectedPassword = admin.password || admin.pinCode || ADMIN_CREDENTIALS.password;

    if (
      cleanPassword === adminExpectedPassword.trim() ||
      cleanPassword === ADMIN_CREDENTIALS.password ||
      cleanPassword === ADMIN_CREDENTIALS.pinCode
    ) {
      try {
        localStorage.setItem('zemlyane_current_email', admin.email);
      } catch (e) {
        console.warn(e);
      }
      return { success: true, profile: admin };
    }
    return { success: false, error: 'Неверный пароль администратора.' };
  }

  // 2. Try Supabase Auth SignIn if configured
  if (isSupabaseConfigured() && cleanPassword) {
    try {
      const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!authError && authData.session) {
        let profile = await getProfileByEmail(cleanEmail);
        if (!profile && authData.user) {
          // If auth succeeded but profile row missing, create profile
          profile = await registerUser({
            email: cleanEmail,
            fullName: (authData.user.user_metadata?.full_name as string) || cleanIdentifier,
            role: (authData.user.user_metadata?.role as string) || 'Участник',
            password: cleanPassword,
          });
        }
        if (profile) {
          try {
            localStorage.setItem('zemlyane_current_email', profile.email);
          } catch (e) {
            console.warn(e);
          }
          return { success: true, profile };
        }
      }
    } catch (err) {
      console.warn('[clubService.loginUser] Supabase Auth sign-in notice, attempting profile fallback:', err);
    }
  }

  // 3. Regular user check via profile record / local cache
  const profile = await getProfileByEmail(cleanEmail);
  if (!profile) {
    return {
      success: false,
      error: 'Пользователь с указанным никнеймом не найден в базе данных.',
    };
  }

  const expectedPassword = profile.password || profile.pinCode;

  if (expectedPassword) {
    if (!cleanPassword || expectedPassword.trim() !== cleanPassword) {
      return { success: false, error: 'Неверный пароль для данной учетной записи.' };
    }
  }

  try {
    localStorage.setItem('zemlyane_current_email', profile.email);
  } catch (e) {
    console.warn(e);
  }

  return { success: true, profile };
}

/**
 * Session Logout
 */
export async function logoutUser(): Promise<void> {
  try {
    localStorage.removeItem('zemlyane_current_email');
    if (isSupabaseConfigured()) {
      await supabaseClient.auth.signOut().catch(() => {});
    }
  } catch (e) {
    console.warn('Logout error:', e);
  }
}

/**
 * Subscribes to Supabase auth state change and session syncing
 */
export function subscribeToAuthChanges(callback: (profile: UserProfileClient | null) => void): () => void {
  if (isSupabaseConfigured()) {
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.email) {
        const profile = await getProfileByEmail(session.user.email);
        callback(profile);
      } else {
        const localEmail = localStorage.getItem('zemlyane_current_email');
        if (localEmail) {
          const profile = await getProfileByEmail(localEmail);
          callback(profile);
        } else {
          callback(null);
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }

  return () => {};
}

// ==========================================
// 2. STATIONS MANAGEMENT (stations table)
// ==========================================

export async function getStations(): Promise<StationClient[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('stations')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('[clubService.getStations] Notice fetching stations:', error.message);
    } else if (data && data.length > 0) {
      const clientStations = (data as StationRow[]).map(mapStationRowToClient);
      setLocal(LOCAL_STORAGE_STATIONS_KEY, clientStations);
      return clientStations;
    }
  }

  return getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
}

export async function getStationById(id: string): Promise<StationClient | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('stations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return mapStationRowToClient(data as StationRow);
    }
  }

  const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
  return local.find((s) => s.id === id) || null;
}

export async function addStation(
  station: Omit<StationClient, 'id'> & { id?: string }
): Promise<StationClient> {
  const insertData = mapStationClientToInsert(station);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('stations')
      .insert([insertData] as any)
      .select()
      .single();

    if (error) {
      console.error('[clubService.addStation] Supabase error:', error.message);
      throw new Error(`Не удалось добавить станцию в базу: ${error.message}`);
    }

    const created = mapStationRowToClient(data as StationRow);
    const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
    setLocal(LOCAL_STORAGE_STATIONS_KEY, [...local, created]);
    return created;
  }

  const newStation: StationClient = {
    id: station.id || `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: station.name.trim(),
    coordinates: station.coordinates || '0, 0',
    yearFounded: station.yearFounded || new Date().getFullYear(),
    description: station.description || '',
  };

  const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
  setLocal(LOCAL_STORAGE_STATIONS_KEY, [...local, newStation]);
  return newStation;
}

export async function updateStation(
  id: string,
  updates: Partial<StationClient>
): Promise<StationClient> {
  const updateData = mapStationClientToUpdate(updates);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('stations')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления станции: ${error.message}`);
    }

    const updated = mapStationRowToClient(data as StationRow);
    const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
    setLocal(
      LOCAL_STORAGE_STATIONS_KEY,
      local.map((s) => (s.id === id ? updated : s))
    );
    return updated;
  }

  const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
  const target = local.find((s) => s.id === id);
  if (!target) throw new Error('Станция не найдена.');

  const updated: StationClient = { ...target, ...updates, id: target.id };
  setLocal(
    LOCAL_STORAGE_STATIONS_KEY,
    local.map((s) => (s.id === id ? updated : s))
  );
  return updated;
}

export async function deleteStation(id: string): Promise<boolean> {
  let success = true;

  if (isSupabaseConfigured()) {
    // Delete linked records first
    await supabaseClient.from('records').delete().eq('station_id', id);
    const { error } = await supabaseClient.from('stations').delete().eq('id', id);
    if (error) {
      console.error('[clubService.deleteStation] Error:', error.message);
      success = false;
    }
  }

  const local = getLocal<StationClient>(LOCAL_STORAGE_STATIONS_KEY);
  setLocal(
    LOCAL_STORAGE_STATIONS_KEY,
    local.filter((s) => s.id !== id)
  );

  const localRecords = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  setLocal(
    LOCAL_STORAGE_RECORDS_KEY,
    localRecords.filter((r) => r.stationId !== id)
  );

  return success;
}

// ==========================================
// 3. RECORDS MANAGEMENT (records table)
// ==========================================

export async function getRecords(): Promise<RecordClient[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('[clubService.getRecords] Notice fetching records:', error.message);
    } else if (data && data.length > 0) {
      const clientRecords = (data as RecordRow[]).map(mapRecordRowToClient);
      setLocal(LOCAL_STORAGE_RECORDS_KEY, clientRecords);
      return clientRecords;
    }
  }

  return getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
}

export async function getRecordsByStation(stationId: string): Promise<RecordClient[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('records')
      .select('*')
      .eq('station_id', stationId)
      .order('date', { ascending: false });

    if (!error && data) {
      return (data as RecordRow[]).map(mapRecordRowToClient);
    }
  }

  const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  return local.filter((r) => r.stationId === stationId);
}

export async function getRecordById(id: string): Promise<RecordClient | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('records')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return mapRecordRowToClient(data as RecordRow);
    }
  }

  const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  return local.find((r) => r.id === id) || null;
}

export async function addRecord(
  record: Omit<RecordClient, 'id'> & { id?: string }
): Promise<RecordClient> {
  const insertData = mapRecordClientToInsert(record);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('records')
      .insert([insertData] as any)
      .select()
      .single();

    if (error) {
      console.error('[clubService.addRecord] Supabase error:', error.message);
      throw new Error(`Не удалось зафиксировать замер в базе: ${error.message}`);
    }

    const created = mapRecordRowToClient(data as RecordRow);
    const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
    setLocal(LOCAL_STORAGE_RECORDS_KEY, [created, ...local]);
    return created;
  }

  const newRecord: RecordClient = {
    id: record.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    stationId: record.stationId,
    value: record.value,
    date: record.date || new Date().toISOString().split('T')[0],
    notes: record.notes || '',
  };

  const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  setLocal(LOCAL_STORAGE_RECORDS_KEY, [newRecord, ...local]);
  return newRecord;
}

export async function updateRecord(
  id: string,
  updates: Partial<RecordClient>
): Promise<RecordClient> {
  const updateData = mapRecordClientToUpdate(updates);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('records')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления замера: ${error.message}`);
    }

    const updated = mapRecordRowToClient(data as RecordRow);
    const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
    setLocal(
      LOCAL_STORAGE_RECORDS_KEY,
      local.map((r) => (r.id === id ? updated : r))
    );
    return updated;
  }

  const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  const target = local.find((r) => r.id === id);
  if (!target) throw new Error('Запись замера не найдена.');

  const updated: RecordClient = { ...target, ...updates, id: target.id };
  setLocal(
    LOCAL_STORAGE_RECORDS_KEY,
    local.map((r) => (r.id === id ? updated : r))
  );
  return updated;
}

export async function deleteRecord(id: string): Promise<boolean> {
  let success = true;

  if (isSupabaseConfigured()) {
    const { error } = await supabaseClient.from('records').delete().eq('id', id);
    if (error) {
      console.error('[clubService.deleteRecord] Error:', error.message);
      success = false;
    }
  }

  const local = getLocal<RecordClient>(LOCAL_STORAGE_RECORDS_KEY);
  setLocal(
    LOCAL_STORAGE_RECORDS_KEY,
    local.filter((r) => r.id !== id)
  );

  return success;
}

// ==========================================
// 4. NEWSPAPER NOTES (newspaper_notes table)
// ==========================================

export async function getNewspaperNotes(): Promise<NewspaperNoteClient[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('newspaper_notes')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('[clubService.getNewspaperNotes] Notice:', error.message);
    } else if (data && data.length > 0) {
      const clientNotes = (data as NewspaperNoteRow[]).map(mapNewspaperNoteRowToClient);
      setLocal(LOCAL_STORAGE_NOTES_KEY, clientNotes);
      return clientNotes;
    }
  }

  return getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
}

export async function getNewspaperNoteById(id: string): Promise<NewspaperNoteClient | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('newspaper_notes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return mapNewspaperNoteRowToClient(data as NewspaperNoteRow);
    }
  }

  const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
  return local.find((n) => n.id === id) || null;
}

export async function addNewspaperNote(
  note: Omit<NewspaperNoteClient, 'id'> & { id?: string }
): Promise<NewspaperNoteClient> {
  const insertData = mapNewspaperNoteClientToInsert(note);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('newspaper_notes')
      .insert([insertData] as any)
      .select()
      .single();

    if (error) {
      console.error('[clubService.addNewspaperNote] Supabase error:', error.message);
      throw new Error(`Не удалось опубликовать заметку: ${error.message}`);
    }

    const created = mapNewspaperNoteRowToClient(data as NewspaperNoteRow);
    const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
    setLocal(LOCAL_STORAGE_NOTES_KEY, [created, ...local]);
    return created;
  }

  const newNote: NewspaperNoteClient = {
    id: note.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    title: note.title.trim(),
    content: note.content.trim(),
    date: note.date || new Date().toISOString().split('T')[0],
    author: note.author || 'Редколлегия',
  };

  const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
  setLocal(LOCAL_STORAGE_NOTES_KEY, [newNote, ...local]);
  return newNote;
}

export async function updateNewspaperNote(
  id: string,
  updates: Partial<NewspaperNoteClient>
): Promise<NewspaperNoteClient> {
  const updateData = mapNewspaperNoteClientToUpdate(updates);

  if (isSupabaseConfigured()) {
    const { data, error } = await supabaseClient
      .from('newspaper_notes')
      .update(updateData as any)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Ошибка обновления заметки: ${error.message}`);
    }

    const updated = mapNewspaperNoteRowToClient(data as NewspaperNoteRow);
    const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
    setLocal(
      LOCAL_STORAGE_NOTES_KEY,
      local.map((n) => (n.id === id ? updated : n))
    );
    return updated;
  }

  const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
  const target = local.find((n) => n.id === id);
  if (!target) throw new Error('Заметка не найдена.');

  const updated: NewspaperNoteClient = { ...target, ...updates, id: target.id };
  setLocal(
    LOCAL_STORAGE_NOTES_KEY,
    local.map((n) => (n.id === id ? updated : n))
  );
  return updated;
}

export async function deleteNewspaperNote(id: string): Promise<boolean> {
  let success = true;

  if (isSupabaseConfigured()) {
    const { error } = await supabaseClient.from('newspaper_notes').delete().eq('id', id);
    if (error) {
      console.error('[clubService.deleteNewspaperNote] Error:', error.message);
      success = false;
    }
  }

  const local = getLocal<NewspaperNoteClient>(LOCAL_STORAGE_NOTES_KEY);
  setLocal(
    LOCAL_STORAGE_NOTES_KEY,
    local.filter((n) => n.id !== id)
  );

  return success;
}

// ==========================================
// 5. UNIFIED SERVICE OBJECT EXPORT
// ==========================================

export const clubService = {
  // Constants & Auth
  ADMIN_CREDENTIALS,
  ensureAdminProfileExists,
  loginUser,
  logoutUser,
  subscribeToAuthChanges,

  // Profiles
  registerUser,
  getProfiles,
  getProfileById,
  getProfileByEmail,
  updateProfile,
  deleteProfile,
  cleanTestProfiles,
  verifyPassword,
  verifyPinCode,

  // Stations
  getStations,
  getStationById,
  addStation,
  updateStation,
  deleteStation,

  // Records
  getRecords,
  getRecordsByStation,
  getRecordById,
  addRecord,
  updateRecord,
  deleteRecord,

  // Newspaper Notes
  getNewspaperNotes,
  getNewspaperNoteById,
  addNewspaperNote,
  updateNewspaperNote,
  deleteNewspaperNote,
};

export default clubService;
