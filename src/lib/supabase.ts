import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient, isSupabaseConfigured as checkSupabaseConfigured } from './supabaseClient';
import { 
  MonitoringRecord, 
  MonitoringStation, 
  NewspaperNote, 
  UserProfile, 
  UserRole, 
  UserStatus,
  AccessControlPolicy
} from '../types';
import { normalizeRole, isAdminRole } from '../types/database.types';
import { evaluatePermissions } from '../hooks/usePermissions';

export const isSupabaseConfigured = checkSupabaseConfigured();

export const supabase: SupabaseClient = supabaseClient;

// ==========================================
// ACCESS CONTROL & PERMISSION EVALUATOR (RBAC)
// ==========================================
export const getAccessControl = evaluatePermissions;

// ==========================================
// STORAGE: UPLOAD TO BUCKET 'field-photos' (FALLBACK: 'images')
// ==========================================
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function uploadImageToSupabase(
  file: File | string, 
  folder: string = 'field-samples',
  bucketName: string = 'field-photos'
): Promise<{ url: string; error?: string }> {
  try {
    const isBase64String = typeof file === 'string';

    if (!isSupabaseConfigured || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      if (isBase64String) {
        return { url: file };
      }
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ url: reader.result as string });
        reader.onerror = () => resolve({ url: '', error: 'Failed to read file' });
        reader.readAsDataURL(file as File);
      });
    }

    let uploadPayload: Blob;
    let fileExt = 'jpg';
    let contentType = 'image/jpeg';

    if (isBase64String) {
      uploadPayload = dataURLtoBlob(file);
      contentType = uploadPayload.type || 'image/jpeg';
      fileExt = contentType.split('/')[1] || 'jpg';
    } else {
      uploadPayload = file;
      fileExt = (file as File).name?.split('.').pop() || 'jpg';
      contentType = (file as File).type || 'image/jpeg';
    }

    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;

    // Try primary bucket ('field-photos')
    let { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, uploadPayload, {
        cacheControl: '3600',
        contentType,
        upsert: false
      });

    // Fallback to 'images' bucket if primary is missing
    if (uploadError && uploadError.message?.includes('Bucket not found')) {
      const fallback = await supabase.storage
        .from('images')
        .upload(fileName, uploadPayload, {
          cacheControl: '3600',
          contentType,
          upsert: false
        });
      if (!fallback.error) {
        const { data } = supabase.storage.from('images').getPublicUrl(fileName);
        return { url: data.publicUrl };
      }
    }

    if (uploadError) {
      console.warn('Supabase storage notice, using client fallback:', uploadError.message);
      if (isBase64String) {
        return { url: file, error: uploadError.message };
      }
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ url: reader.result as string });
        reader.onerror = () => resolve({ url: '', error: uploadError.message });
        reader.readAsDataURL(file as File);
      });
    }

    const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName);
    return { url: data.publicUrl };
  } catch (err: any) {
    console.error('Storage upload error:', err);
    if (typeof file === 'string') {
      return { url: file, error: err?.message };
    }
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ url: reader.result as string });
      reader.readAsDataURL(file as File);
    });
  }
}

// ==========================================
// CALENDAR EVENTS (events)
// ==========================================
export interface SupabaseEvent {
  id?: string;
  title: string;
  event_date: string; // Format: "YYYY-MM-DD"
  description?: string;
  category?: string;
  created_at?: string;
}

const LOCAL_STORAGE_EVENTS_KEY = 'zemlyane_custom_events_v1';

export async function fetchCalendarEvents(): Promise<SupabaseEvent[]> {
  let remoteEvents: SupabaseEvent[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      if (!error && data) {
        remoteEvents = data.map((item: any) => ({
          id: item.id?.toString(),
          title: item.title || item.name || 'Событие',
          event_date: item.event_date || item.date || item.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          description: item.description || item.details || '',
          category: item.category || 'Экология',
          created_at: item.created_at
        }));
      }
    } catch (err) {
      console.warn('Notice loading events from Supabase:', err);
    }
  }

  let localEvents: SupabaseEvent[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (raw) localEvents = JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local events:', e);
  }

  const combined = [...remoteEvents];
  for (const loc of localEvents) {
    if (!combined.some(r => (r.id && loc.id && r.id === loc.id) || (r.event_date === loc.event_date && r.title === loc.title))) {
      combined.push(loc);
    }
  }

  return combined;
}

export async function saveCalendarEventToSupabase(
  title: string, 
  dateStr: string, 
  description: string = '',
  category: string = 'Экология'
): Promise<{ success: boolean; event: SupabaseEvent; source: 'supabase' | 'local' }> {
  const newEvent: SupabaseEvent = {
    id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title,
    event_date: dateStr,
    description,
    category,
    created_at: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    const existing: SupabaseEvent[] = raw ? JSON.parse(raw) : [];
    existing.push(newEvent);
    localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(existing));
  } catch (e) {
    console.warn('Error writing to local storage:', e);
  }

  let savedRemotely = false;
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  if (isOnline && isSupabaseConfigured) {
    try {
      // 1. Try upsert with all fields including category
      let { data, error } = await supabase
        .from('events')
        .upsert([
          {
            id: newEvent.id,
            title: newEvent.title,
            event_date: newEvent.event_date,
            description: newEvent.description || '',
            category: newEvent.category || 'Экология'
          }
        ])
        .select();

      // 2. If 'category' column is not in the schema, retry with standard core columns
      if (error && (error.message?.includes('category') || error.message?.includes('schema cache') || error.message?.includes('column'))) {
        const fallbackRes = await supabase
          .from('events')
          .upsert([
            {
              id: newEvent.id,
              title: newEvent.title,
              event_date: newEvent.event_date,
              description: newEvent.description || ''
            }
          ])
          .select();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (!error && data && data[0]) {
        savedRemotely = true;
      } else if (error) {
        console.warn('Supabase insert event notice:', error.message);
      }
    } catch (err) {
      console.warn('Supabase insert notice:', err);
    }
  }

  if (!savedRemotely) {
    try {
      const rawQueue = localStorage.getItem('zemlyane_pending_events_v1');
      const queue: SupabaseEvent[] = rawQueue ? JSON.parse(rawQueue) : [];
      if (!queue.some(e => e.id === newEvent.id)) {
        queue.push(newEvent);
        localStorage.setItem('zemlyane_pending_events_v1', JSON.stringify(queue));
      }
    } catch (qErr) {
      console.warn('Queue event error:', qErr);
    }
  }

  return { success: true, event: newEvent, source: savedRemotely ? 'supabase' : 'local' };
}

export async function deleteCalendarEventFromSupabase(
  id: string,
  eventDetails?: { title?: string; event_date?: string }
): Promise<{ success: boolean; error?: string }> {
  // 1. Remove from local storage cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_EVENTS_KEY);
    if (raw) {
      const existing: SupabaseEvent[] = JSON.parse(raw);
      const filtered = existing.filter(e => {
        if (id && e.id === id) return false;
        if (eventDetails?.title && eventDetails?.event_date && e.title === eventDetails.title && e.event_date === eventDetails.event_date) return false;
        return true;
      });
      localStorage.setItem(LOCAL_STORAGE_EVENTS_KEY, JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn('Error deleting local event:', e);
  }

  // 2. Remove from pending sync queue
  try {
    const rawQueue = localStorage.getItem('zemlyane_pending_events_v1');
    if (rawQueue) {
      const queue: SupabaseEvent[] = JSON.parse(rawQueue);
      const filtered = queue.filter(e => {
        if (id && e.id === id) return false;
        if (eventDetails?.title && eventDetails?.event_date && e.title === eventDetails.title && e.event_date === eventDetails.event_date) return false;
        return true;
      });
      localStorage.setItem('zemlyane_pending_events_v1', JSON.stringify(filtered));
    }
  } catch (qErr) {
    console.warn('Error removing event from queue:', qErr);
  }

  // 3. Delete from Supabase remote database if online
  if (isSupabaseConfigured && (typeof navigator === 'undefined' || navigator.onLine)) {
    try {
      let query = supabase.from('events').delete();
      if (id) {
        query = query.eq('id', id);
      } else if (eventDetails?.title && eventDetails?.event_date) {
        query = query.eq('title', eventDetails.title).eq('event_date', eventDetails.event_date);
      }
      const { error } = await query;
      if (error) {
        console.error('Delete calendar event error from Supabase:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      console.error('Delete calendar event exception:', err);
      return { success: false, error: err?.message || 'Ошибка при удалении из базы данных' };
    }
  }
  return { success: true };
}

// ==========================================
// MONITORING RECORDS (JSONB Flexible Structure)
// ==========================================
export async function fetchMonitoringRecords(): Promise<MonitoringRecord[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('records')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data && data.length > 0) {
      return data as MonitoringRecord[];
    }
  } catch (err) {
    console.warn('Notice fetching monitoring records from Supabase:', err);
  }
  return null;
}

export async function insertMonitoringRecord(record: MonitoringRecord): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('records').insert([record]);
    if (error) {
      console.warn('Notice saving record to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Insert record error:', err);
    return false;
  }
}

export async function deleteMonitoringRecordFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('records').delete().eq('id', id);
    return !error;
  } catch (err) {
    console.error('Delete record error:', err);
    return false;
  }
}

// ==========================================
// MONITORING STATIONS
// ==========================================
export async function fetchMonitoringStations(): Promise<MonitoringStation[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('stations').select('*');
    if (!error && data && data.length > 0) {
      return data as MonitoringStation[];
    }
  } catch (err) {
    console.warn('Notice fetching stations from Supabase:', err);
  }
  return null;
}

export async function insertMonitoringStation(station: MonitoringStation): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('stations').insert([station]);
    return !error;
  } catch (err) {
    console.error('Insert station error:', err);
    return false;
  }
}

export async function deleteMonitoringStationFromSupabase(code: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    await supabase.from('records').delete().eq('stationCode', code);
    const { error } = await supabase.from('stations').delete().eq('code', code);
    return !error;
  } catch (err) {
    console.error('Delete station error:', err);
    return false;
  }
}

// ==========================================
// NEWSPAPER / PUBLICATIONS (publications & newspaper_notes)
// ==========================================
export async function fetchNewspaperNotesFromSupabase(): Promise<NewspaperNote[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    let { data, error } = await supabase
      .from('publications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error && (error.message?.includes('does not exist') || error.message?.includes('relation') || error.message?.includes('schema cache'))) {
      const fallback = await supabase
        .from('newspaper_notes')
        .select('*')
        .order('id', { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

    if (!error && data && data.length > 0) {
      return data.map((item: any) => ({
        id: item.id?.toString(),
        title: item.title || '',
        content: item.content || '',
        author: item.author || 'Юный корреспондент',
        date: item.date || new Date().toLocaleDateString('ru-RU'),
        category: item.category || 'Экспедиционный отчёт',
        imageUrl: item.imageUrl || item.image_url || '',
        isClipping: item.isClipping !== undefined ? item.isClipping : (item.is_clipping !== undefined ? item.is_clipping : true)
      }));
    }
  } catch (err) {
    console.warn('Notice fetching newspaper notes from Supabase:', err);
  }
  return null;
}

export async function insertNewspaperNoteToSupabase(note: NewspaperNote): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    let finalImageUrl = note.imageUrl;

    // If image is Base64 and online, upload to Supabase Storage
    if (finalImageUrl && finalImageUrl.startsWith('data:image/')) {
      try {
        const uploadRes = await uploadImageToSupabase(finalImageUrl, 'publications', 'field-photos');
        if (uploadRes?.url) {
          finalImageUrl = uploadRes.url;
        }
      } catch (uploadErr) {
        console.warn('Could not upload article photo to storage:', uploadErr);
      }
    }

    const { isOfflinePending, syncStatus, ...cleanNote } = note;
    const notePayload = {
      id: cleanNote.id,
      title: cleanNote.title,
      content: cleanNote.content,
      author: cleanNote.author || 'Юный корреспондент',
      date: cleanNote.date,
      category: cleanNote.category || 'Экспедиционный отчёт',
      imageUrl: finalImageUrl || null,
      isClipping: cleanNote.isClipping !== false
    };

    // Try publications table first, then fallback to newspaper_notes
    let { error } = await supabase.from('publications').upsert([notePayload]);
    if (error && (error.message?.includes('not find') || error.message?.includes('relation') || error.message?.includes('schema cache'))) {
      const fallback = await supabase.from('newspaper_notes').upsert([notePayload]);
      error = fallback.error;
    }

    if (error) {
      console.warn('Notice saving note to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Insert newspaper note error:', err);
    return false;
  }
}

export async function deleteNewspaperNoteFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    let { error } = await supabase.from('publications').delete().eq('id', id);
    if (error && (error.message?.includes('does not exist') || error.message?.includes('relation'))) {
      const fallback = await supabase.from('newspaper_notes').delete().eq('id', id);
      error = fallback.error;
    }
    return !error;
  } catch (err) {
    console.error('Delete newspaper note error:', err);
    return false;
  }
}

// ==========================================
// USER PROFILES & MODERATION (profiles)
// ==========================================
export async function fetchProfilesFromSupabase(): Promise<UserProfile[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data && data.length > 0) {
      return data.map((p: any) => ({
        id: p.id,
        email: p.email,
        fullName: p.full_name || p.fullName || 'Исследователь',
        role: (p.role as UserRole) || 'Участник',
        status: (p.status as UserStatus) || 'pending',
        createdAt: p.created_at || p.createdAt || new Date().toISOString(),
        avatarUrl: p.avatar_url || p.avatarUrl
      }));
    }
  } catch (err) {
    console.warn('Notice fetching profiles from Supabase:', err);
  }
  return null;
}

export async function saveProfileToSupabase(profile: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const cleanEmail = profile.email.trim().toLowerCase();
    
    // Check if profile exists by ID or email
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .or(`id.eq.${profile.id},email.eq.${cleanEmail}`)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('profiles')
        .update({
          email: cleanEmail,
          full_name: profile.fullName,
          role: normalizeRole(profile.role),
          status: profile.status || 'active',
          avatar_url: profile.avatarUrl || null,
        })
        .eq('id', existing.id);
      return !error;
    } else {
      const { error } = await supabase
        .from('profiles')
        .insert([
          {
            id: profile.id,
            email: cleanEmail,
            full_name: profile.fullName,
            role: normalizeRole(profile.role),
            status: profile.status || 'active',
            avatar_url: profile.avatarUrl || null,
            created_at: profile.createdAt || new Date().toISOString(),
          },
        ]);
      return !error;
    }
  } catch (err) {
    console.warn('Notice saving profile to Supabase:', err);
    return false;
  }
}
