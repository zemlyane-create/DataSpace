/**
 * ============================================================================
 * OFFLINE SYNC SERVICE (PWA & FIELD OPERATIONS RESILIENCE)
 * ============================================================================
 *
 * Provides robust offline storage and background/manual synchronization
 * for field measurements, newspaper publications/notes, and expedition events.
 * Handles automatic uploading of offline Base64 field photos to Supabase Storage.
 */

import { MonitoringRecord, NewspaperNote, CustomMetric } from "../types";
import { SupabaseEvent } from "../lib/supabase";
import { supabase } from "../lib/supabase";

const LOCAL_STORAGE_PENDING_RECORDS_KEY = "zemlyane_pending_sync_records_v1";
const LOCAL_STORAGE_PENDING_PUBLICATIONS_KEY = "zemlyane_pending_publications_v1";
const LOCAL_STORAGE_PENDING_EVENTS_KEY = "zemlyane_pending_events_v1";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  syncedRecords: number;
  syncedPublications: number;
  syncedEvents: number;
  errors: string[];
}

type SyncListener = (pendingCount: number, isOnline: boolean) => void;
const listeners = new Set<SyncListener>();

function notifyListeners(): void {
  const count = getTotalPendingCount();
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  listeners.forEach((fn) => {
    try {
      fn(count, online);
    } catch (e) {
      console.warn("[offlineSyncService] Listener error:", e);
    }
  });
}

// ==========================================
// 1. BASE64 TO SUPABASE STORAGE UPLOADER
// ==========================================

/**
 * Converts a Base64 data URL to a Blob
 */
export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads a Base64 image data URL directly to Supabase Storage bucket ('field-photos' with fallback to 'images').
 * Returns the public URL if uploaded successfully, or the original data URL if failed/offline.
 */
export async function uploadBase64ToStorage(
  dataUrl: string, 
  folder: string = "field-samples",
  primaryBucket: string = "field-photos"
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return dataUrl; // Already a regular URL or empty
  }

  try {
    const blob = dataURLtoBlob(dataUrl);
    const mime = blob.type || "image/jpeg";
    const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

    // Try primary bucket first
    let uploadRes = await supabase.storage
      .from(primaryBucket)
      .upload(fileName, blob, {
        contentType: mime,
        cacheControl: "3600",
        upsert: false
      });

    // If bucket doesn't exist or errored, try 'images' bucket
    if (uploadRes.error && uploadRes.error.message.includes("Bucket not found")) {
      uploadRes = await supabase.storage
        .from("images")
        .upload(fileName, blob, {
          contentType: mime,
          cacheControl: "3600",
          upsert: false
        });
      
      if (!uploadRes.error) {
        const { data } = supabase.storage.from("images").getPublicUrl(fileName);
        return data.publicUrl;
      }
    }

    if (!uploadRes.error) {
      const { data } = supabase.storage.from(primaryBucket).getPublicUrl(fileName);
      return data.publicUrl;
    }

    console.warn("[offlineSyncService] Storage upload failed, retaining DataURL:", uploadRes.error?.message);
    return dataUrl;
  } catch (err) {
    console.warn("[offlineSyncService] Failed to process image upload:", err);
    return dataUrl;
  }
}

// ==========================================
// 2. MONITORING RECORDS QUEUE
// ==========================================

export function getPendingRecords(): MonitoringRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[offlineSyncService] Error reading pending records:", e);
    return [];
  }
}

export function getPendingRecordsCount(): number {
  return getPendingRecords().length;
}

export function enqueueOfflineRecord(record: MonitoringRecord): void {
  try {
    const pending = getPendingRecords();
    const existingIndex = pending.findIndex((r) => r.id === record.id);
    const enrichedRecord: MonitoringRecord = {
      ...record,
      isOfflinePending: true,
      syncStatus: "pending",
    };

    let updatedPending: MonitoringRecord[];
    if (existingIndex >= 0) {
      updatedPending = pending.map((r, i) => (i === existingIndex ? enrichedRecord : r));
    } else {
      updatedPending = [enrichedRecord, ...pending];
    }

    localStorage.setItem(LOCAL_STORAGE_PENDING_RECORDS_KEY, JSON.stringify(updatedPending));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to enqueue offline record:", e);
  }
}

export function dequeueOfflineRecord(recordId: string): void {
  try {
    const pending = getPendingRecords();
    const updated = pending.filter((r) => r.id !== recordId);
    localStorage.setItem(LOCAL_STORAGE_PENDING_RECORDS_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to dequeue record:", e);
  }
}

// ==========================================
// 3. NEWSPAPER / PUBLICATIONS QUEUE
// ==========================================

export function getPendingPublications(): NewspaperNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_PUBLICATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[offlineSyncService] Error reading pending publications:", e);
    return [];
  }
}

export function getPendingPublicationsCount(): number {
  return getPendingPublications().length;
}

export function enqueueOfflinePublication(note: NewspaperNote): void {
  try {
    const pending = getPendingPublications();
    const existingIndex = pending.findIndex((n) => n.id === note.id);
    const enrichedNote: NewspaperNote = {
      ...note,
      isOfflinePending: true,
      syncStatus: "pending",
    };

    let updated: NewspaperNote[];
    if (existingIndex >= 0) {
      updated = pending.map((n, i) => (i === existingIndex ? enrichedNote : n));
    } else {
      updated = [enrichedNote, ...pending];
    }

    localStorage.setItem(LOCAL_STORAGE_PENDING_PUBLICATIONS_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to enqueue offline publication:", e);
  }
}

export const queuePublicationForSync = enqueueOfflinePublication;

export function dequeueOfflinePublication(noteId: string): void {
  try {
    const pending = getPendingPublications();
    const updated = pending.filter((n) => n.id !== noteId);
    localStorage.setItem(LOCAL_STORAGE_PENDING_PUBLICATIONS_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to dequeue publication:", e);
  }
}

// ==========================================
// 4. CALENDAR EVENTS QUEUE
// ==========================================

export function getPendingEvents(): SupabaseEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PENDING_EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("[offlineSyncService] Error reading pending events:", e);
    return [];
  }
}

export function getPendingEventsCount(): number {
  return getPendingEvents().length;
}

export function enqueueOfflineEvent(event: SupabaseEvent): void {
  try {
    const pending = getPendingEvents();
    const existingIndex = pending.findIndex((evt) => evt.id === event.id);

    let updated: SupabaseEvent[];
    if (existingIndex >= 0) {
      updated = pending.map((evt, i) => (i === existingIndex ? event : evt));
    } else {
      updated = [event, ...pending];
    }

    localStorage.setItem(LOCAL_STORAGE_PENDING_EVENTS_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to enqueue offline event:", e);
  }
}

export const queueEventForSync = enqueueOfflineEvent;

export function dequeueOfflineEvent(eventId: string): void {
  try {
    const pending = getPendingEvents();
    const updated = pending.filter((evt) => evt.id !== eventId);
    localStorage.setItem(LOCAL_STORAGE_PENDING_EVENTS_KEY, JSON.stringify(updated));
    notifyListeners();
  } catch (e) {
    console.error("[offlineSyncService] Failed to dequeue event:", e);
  }
}

// ==========================================
// 5. TOTAL PENDING STATUS
// ==========================================

export function getTotalPendingCount(): number {
  return getPendingRecordsCount() + getPendingPublicationsCount() + getPendingEventsCount();
}

/**
 * Prepares record payload for Supabase database.
 * Strips client-only UI flags, serializes custom parameters safely into notes/metadata to avoid
 * PostgREST schema cache errors on unmigrated tables, and ensures backwards compatibility.
 */
export function sanitizeRecordForSupabase(
  record: MonitoringRecord, 
  omitUnmigratedCols: boolean = false
): Record<string, any> {
  const { isOfflinePending, syncStatus, ...rest } = record;
  const payload: Record<string, any> = {};

  // Extract customAttributes if any
  const rawCustom = record.customAttributes;
  const customAttrs: CustomMetric[] = Array.isArray(rawCustom)
    ? rawCustom
    : rawCustom && typeof rawCustom === "object"
    ? Object.values(rawCustom)
    : [];

  let serializedNotes = record.notes || "";

  // If custom attributes exist, embed them into notes with a safe invisible marker
  // so they are persisted to Supabase without requiring a schema migration in PostgreSQL
  if (customAttrs.length > 0) {
    // Strip existing marker if present
    const cleanNotes = serializedNotes.replace(/\n?<!--CUSTOM_METRICS:.*?-->/s, "").trim();
    const encoded = `<!--CUSTOM_METRICS:${JSON.stringify(customAttrs)}-->`;
    serializedNotes = cleanNotes ? `${cleanNotes}\n${encoded}` : encoded;
  }

  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      // Never send client-only or unmigrated customAttributes as a raw column to avoid schema cache errors
      if (key === "customAttributes" || key === "custom_attributes") {
        continue;
      }
      if (
        omitUnmigratedCols &&
        (key === "isAnomaly" || key === "aiAlert" || key === "researcherName")
      ) {
        continue;
      }
      payload[key] = value;
    }
  }

  // Set serialized notes containing embedded custom metrics
  payload.notes = serializedNotes;

  // Ensure snake_case field aliases are also populated for database schema versatility
  if (record.stationCode && !payload.station_code) {
    payload.station_code = record.stationCode;
  }
  if (record.stationName && !payload.station_name) {
    payload.station_name = record.stationName;
  }
  if (record.researcherName && !payload.researcher_name && !omitUnmigratedCols) {
    payload.researcher_name = record.researcherName;
  }

  return payload;
}

/**
 * Decodes record from Supabase, restoring customAttributes from either raw column
 * or extracted from embedded metadata inside notes.
 */
export function decodeRecordFromSupabase(raw: any): MonitoringRecord {
  if (!raw) return raw;
  const rec: MonitoringRecord = { ...raw };

  // 1. Resolve custom attributes
  if (rec.customAttributes && Array.isArray(rec.customAttributes)) {
    // Already populated
  } else if (raw.custom_attributes && Array.isArray(raw.custom_attributes)) {
    rec.customAttributes = raw.custom_attributes;
  } else if (typeof rec.notes === "string" && rec.notes.includes("<!--CUSTOM_METRICS:")) {
    try {
      const match = rec.notes.match(/<!--CUSTOM_METRICS:(.*?)-->/s);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          rec.customAttributes = parsed;
        }
      }
      // Clean visible notes string
      rec.notes = rec.notes.replace(/\n?<!--CUSTOM_METRICS:.*?-->/s, "").trim();
    } catch (e) {
      console.warn("[offlineSyncService] Error decoding custom attributes from notes:", e);
    }
  }

  // 2. Normalize aliases
  if (!rec.stationCode && raw.station_code) {
    rec.stationCode = raw.station_code;
  }
  if (!rec.stationName && raw.station_name) {
    rec.stationName = raw.station_name;
  }
  if (!rec.researcherName && raw.researcher_name) {
    rec.researcherName = raw.researcher_name;
  }

  return rec;
}

// ==========================================
// 6. SYNCHRONIZATION RUNNERS
// ==========================================

/**
 * Syncs all pending records, publications and events to Supabase
 */
export async function syncAllPendingData(
  onProgress?: (syncedItemType: string, id: string) => void
): Promise<SyncResult> {
  const pendingRecs = getPendingRecords();
  const pendingPubs = getPendingPublications();
  const pendingEvts = getPendingEvents();

  const totalCount = pendingRecs.length + pendingPubs.length + pendingEvts.length;

  if (totalCount === 0) {
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      syncedRecords: 0,
      syncedPublications: 0,
      syncedEvents: 0,
      errors: [],
    };
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: totalCount,
      syncedRecords: 0,
      syncedPublications: 0,
      syncedEvents: 0,
      errors: ["Нет подключения к сети интернет. Синхронизация отложена."],
    };
  }

  let syncedRecords = 0;
  let syncedPublications = 0;
  let syncedEvents = 0;
  const errors: string[] = [];

  // 1. Sync Records (With Photo Uploads)
  const remainingRecs: MonitoringRecord[] = [];
  for (const record of pendingRecs) {
    try {
      const recCopy = { ...record };

      // Process and upload attached photos to Supabase Storage
      if (recCopy.biosphere?.photoUrl?.startsWith("data:image/")) {
        recCopy.biosphere = {
          ...recCopy.biosphere,
          photoUrl: await uploadBase64ToStorage(recCopy.biosphere.photoUrl, "biosphere")
        };
      }
      if (recCopy.fossils?.photoUrl?.startsWith("data:image/")) {
        recCopy.fossils = {
          ...recCopy.fossils,
          photoUrl: await uploadBase64ToStorage(recCopy.fossils.photoUrl, "fossils")
        };
      }
      if (recCopy.geology?.photoUrl?.startsWith("data:image/")) {
        recCopy.geology = {
          ...recCopy.geology,
          photoUrl: await uploadBase64ToStorage(recCopy.geology.photoUrl, "geology")
        };
      }
      if (recCopy.lithosphere?.photoUrl?.startsWith("data:image/")) {
        recCopy.lithosphere = {
          ...recCopy.lithosphere,
          photoUrl: await uploadBase64ToStorage(recCopy.lithosphere.photoUrl, "pedosphere")
        };
      }
      if (recCopy.anthropogenic?.photoUrl?.startsWith("data:image/")) {
        recCopy.anthropogenic = {
          ...recCopy.anthropogenic,
          photoUrl: await uploadBase64ToStorage(recCopy.anthropogenic.photoUrl, "anthropogenic")
        };
      }

      let payload = sanitizeRecordForSupabase(recCopy, false);
      let { error } = await supabase.from("records").upsert([payload]);

      if (error && (error.message?.includes("schema cache") || error.message?.includes("column"))) {
        payload = sanitizeRecordForSupabase(recCopy, true);
        const retryRes = await supabase.from("records").upsert([payload]);
        error = retryRes.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      syncedRecords++;
      if (onProgress) onProgress("record", record.id);
    } catch (err: any) {
      console.warn(`[offlineSyncService] Error syncing record ${record.id}:`, err);
      errors.push(`Замер ${record.stationCode} (${record.date}): ${err.message || "Ошибка записи"}`);
      remainingRecs.push(record);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_PENDING_RECORDS_KEY, JSON.stringify(remainingRecs));

  // 2. Sync Publications (With Photo Uploads)
  const remainingPubs: NewspaperNote[] = [];
  for (const pub of pendingPubs) {
    try {
      const pubCopy = { ...pub };
      if (pubCopy.imageUrl?.startsWith("data:image/")) {
        pubCopy.imageUrl = await uploadBase64ToStorage(pubCopy.imageUrl, "publications");
      }

      const { isOfflinePending, syncStatus, ...cleanPub } = pubCopy;
      const pubPayload = {
        id: cleanPub.id,
        title: cleanPub.title,
        content: cleanPub.content,
        author: cleanPub.author || "Юный корреспондент",
        date: cleanPub.date,
        category: cleanPub.category || "Экспедиционный отчёт",
        imageUrl: cleanPub.imageUrl || null,
        isClipping: cleanPub.isClipping !== false
      };
      
      // Try publications table first, fallback to newspaper_notes
      let { error } = await supabase.from("publications").upsert([pubPayload]);
      if (error && (error.message?.includes("relation") || error.message?.includes("does not exist") || error.message?.includes("schema cache"))) {
        const res2 = await supabase.from("newspaper_notes").upsert([pubPayload]);
        error = res2.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      syncedPublications++;
      if (onProgress) onProgress("publication", pub.id);
    } catch (err: any) {
      console.warn(`[offlineSyncService] Error syncing publication ${pub.id}:`, err);
      errors.push(`Публикация «${pub.title}»: ${err.message || "Ошибка записи"}`);
      remainingPubs.push(pub);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_PENDING_PUBLICATIONS_KEY, JSON.stringify(remainingPubs));

  // 3. Sync Events
  const remainingEvts: SupabaseEvent[] = [];
  for (const evt of pendingEvts) {
    try {
      let { error } = await supabase.from("events").upsert([
        {
          id: evt.id,
          title: evt.title,
          event_date: evt.event_date,
          description: evt.description || "",
          category: evt.category || "Экология"
        }
      ]);

      if (error && (error.message?.includes("category") || error.message?.includes("schema cache") || error.message?.includes("column"))) {
        const fallback = await supabase.from("events").upsert([
          {
            id: evt.id,
            title: evt.title,
            event_date: evt.event_date,
            description: evt.description || ""
          }
        ]);
        error = fallback.error;
      }

      if (error) {
        throw new Error(error.message);
      }

      syncedEvents++;
      if (onProgress) onProgress("event", evt.id || "");
    } catch (err: any) {
      console.warn(`[offlineSyncService] Error syncing event ${evt.id}:`, err);
      errors.push(`Событие «${evt.title}»: ${err.message || "Ошибка записи"}`);
      remainingEvts.push(evt);
    }
  }
  localStorage.setItem(LOCAL_STORAGE_PENDING_EVENTS_KEY, JSON.stringify(remainingEvts));

  notifyListeners();

  const totalSynced = syncedRecords + syncedPublications + syncedEvents;
  const totalFailed = remainingRecs.length + remainingPubs.length + remainingEvts.length;

  return {
    success: totalFailed === 0,
    syncedCount: totalSynced,
    failedCount: totalFailed,
    syncedRecords,
    syncedPublications,
    syncedEvents,
    errors,
  };
}

/**
 * Backward-compatible alias for syncing pending records
 */
export async function syncPendingRecords(
  onRecordSynced?: (recordId: string) => void
): Promise<SyncResult> {
  return syncAllPendingData((type, id) => {
    if (type === "record" && onRecordSynced) {
      onRecordSynced(id);
    }
  });
}

/**
 * Subscribe to sync queue state and online/offline status changes
 */
export function subscribeToSyncState(callback: SyncListener): () => void {
  listeners.add(callback);
  callback(getTotalPendingCount(), typeof navigator !== "undefined" ? navigator.onLine : true);

  const handleOnline = () => notifyListeners();
  const handleOffline = () => notifyListeners();

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  };
}
