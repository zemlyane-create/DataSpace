export type ResearchCategory = 
  | "atmosphere" 
  | "hydrosphere" 
  | "lithosphere" 
  | "biosphere" 
  | "anthropogenic" 
  | "geology" 
  | "fossils";

export interface CategoryInfo {
  id: ResearchCategory;
  name: string;
  prefix: string; // e.g. HYD, SOIL, ATM, BIO, ANT, MIN, FOS
  color: string;
  iconName: string;
  description: string;
  definition?: string;
  airCompositionTable?: { gas: string; percent: string }[];
}

export interface MonitoringStation {
  id: string;
  code: string; // e.g., ALX-01, TBL-01
  name: string;
  category: ResearchCategory;
  lat: number;
  lng: number;
  description: string;
  establishedYear: number;
}

export interface AtmosphereParams {
  airTemp?: number; // °C
  humidity?: number; // %
  pressure?: number; // мм рт.ст.
  cloudiness?: number; // %
  windSpeed?: number; // м/с
  windDirection?: string; // Н, С, СЗ и т.д.
  precipitation?: number; // мм
  co2Ppm?: number; // ppm
  co2Percent?: number; // % (converted)
}

export interface HydrosphereParams {
  waterTemp?: number; // °C
  transparency?: number; // см (диск Секки)
  ph?: number; // 0-14
  tds?: number; // мг/л
  ec?: number; // мкСм/см
  nitrates?: number; // мг/л
  dissolvedOxygen?: number; // мг/л
}

export interface LithosphereParams {
  soilPh?: number; // 0-14
  texture?: string; // песчаный, суглинок и т.д.
  soilColor?: string; // e.g. "Темно-серый черноземный"
  soilColorRgb?: { r: number; g: number; b: number; hex: string };
  heavyMetals?: string; // Низкий, Средний, Повышенный
  aggregateStructure?: string; // зернистая, комковатая и т.д.
  waterStability?: number; // %
  density?: number; // г/см³
  permeability?: number; // мм/мин
  photoUrl?: string; // фото почвы / почвенного разреза
}

export interface SpeciesCount {
  speciesName: string;
  count: number;
}

export interface BiosphereParams {
  floraSpecies?: string;
  faunaSpecies?: string;
  lifeSigns?: string; // норы, хатки, следы, экскременты, гнезда
  plantPhenology?: {
    vegetationStart?: string;
    floweringStart?: string;
    peakFlowering?: string;
    seedRipening?: string;
    leafFallStart?: string;
    leafFallEnd?: string;
  };
  animalPhenology?: {
    birdArrivalDate?: string;
    pollinatorsAppearance?: string;
    activityPeriod?: string;
  };
  speciesCounts?: SpeciesCount[];
  shannonIndex?: number; // Calculated H'
  photoUrl?: string;
}

export interface AnthropogenicParams {
  litterLevel?: number; // 1-5 scale
  tramplingLevel?: number; // 1-5 scale
  firePitsCount?: number;
  illegalDumps?: boolean;
  noiseLevel?: number; // дБА
  trafficIntensity?: number; // авто/час
  photoUrl?: string;
}

export interface GeologyParams {
  mineralName?: string;
  geneticType?: "Осадочный" | "Магматический" | "Метаморфический";
  colorInSample?: string;
  streakColor?: string;
  luster?: "Стеклянный" | "Металлический" | "Перламутровый" | "Матовый" | "Шелковистый";
  mohsHardness?: number; // 1-10
  cleavageFracture?: string;
  acidReaction?: "Отсутствует" | "Слабое вскипание" | "Интенсивное вскипание";
  magneticProperties?: boolean;
  microscopeFeatures?: string;
  photoUrl?: string;
}

export interface FossilParams {
  organismGroup?: string;
  certaintyLevel?: "До вида" | "До рода" | "До семейства" | "До отряда";
  lengthMm?: number;
  widthMm?: number;
  thicknessMm?: number;
  diameterMm?: number;
  photoUrl?: string;
}

export interface CustomMetric {
  id: string;
  name: string;           // Название, напр. "Радиационный фон", "Микропластик"
  value: number | string; // Численное или текстовое значение
  unit: string;           // Единица измерения, напр. "мкЗв/ч", "шт/л", "мг/дм³"
  minNorm?: number;       // Опциональная граница нормы
  maxNorm?: number;
}

export interface MonitoringRecord {
  id: string;
  stationCode: string; // e.g., ALX-01, TBL-01
  stationName: string;
  category: ResearchCategory;
  date: string; // YYYY-MM-DD
  lat: number;
  lng: number;
  researcherName: string;
  notes?: string;

  atmosphere?: AtmosphereParams;
  hydrosphere?: HydrosphereParams;
  lithosphere?: LithosphereParams;
  biosphere?: BiosphereParams;
  anthropogenic?: AnthropogenicParams;
  geology?: GeologyParams;
  fossils?: FossilParams;

  // Custom User-defined extensible metrics & measurements
  customAttributes?: Record<string, CustomMetric> | CustomMetric[];

  aiAlert?: string;
  isAnomaly?: boolean;
  isOfflinePending?: boolean;
  syncStatus?: 'synced' | 'pending';
}

export interface NewspaperNote {
  id: string;
  title: string;
  content: string;
  author: string;
  date: string;
  category: string;
  imageUrl?: string;
  isClipping?: boolean;
  isOfflinePending?: boolean;
  syncStatus?: 'synced' | 'pending';
}

export interface WeatherData {
  station: string;
  temperature: string;
  humidity: string;
  pressure: string;
  windSpeed: string;
  windDirection: string;
  cloudiness: string;
  precipitation: string;
  updatedAt: string;
  forecastUrl: string;
}

export type UserStatus = 'pending' | 'active' | 'rejected';
export type CanonicalRole = 'admin' | 'leader' | 'researcher' | 'editor' | 'member';
export type UserRole = 'Администратор' | 'Руководитель' | 'Исследователь' | 'Корреспондент' | 'Участник' | string;

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  avatarUrl?: string;
  password?: string;
  pinCode?: string;
}

export interface AccessControlPolicy {
  isGuest: boolean;
  isActiveMember: boolean;
  isPending: boolean;
  isMember: boolean;
  isResearcher: boolean;
  isEditor: boolean;
  isLeader: boolean;
  isAdmin: boolean;

  canAccessJournal: boolean;
  canViewRawRecords: boolean;
  canCreateRecords: boolean;
  canEditData: boolean;
  canExportData: boolean;
  canViewAnalytics: boolean;
  canViewRawAnalytics: boolean;
  canViewMap: boolean;
  canEditNewspaper: boolean;
  canEditCalendar: boolean;
  canAccessPisa: boolean;
  canViewResearchInfo?: boolean;
  canCreateNewspaper: boolean;
  canCreateEvents: boolean;
  canUploadImages: boolean;
  canDeleteRecords: boolean;
  canManageUsers: boolean;
}

export interface FilterState {
  stationCode: string; // "ALL" or specific code
  category: ResearchCategory | "ALL";
  dateFrom: string;
  dateTo: string;
  parameterKey: string;
}
