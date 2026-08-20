import { CategoryInfo, MonitoringStation, MonitoringRecord, NewspaperNote, WeatherData } from "../types";

export const CATEGORIES: CategoryInfo[] = [
  {
    id: "atmosphere",
    name: "Атмосфера",
    prefix: "ATM",
    color: "bg-sky-600 text-white border-sky-500",
    iconName: "CloudSun",
    description: "Метеорологические замеры, температура воздуха, давление, влажность и CO2",
    definition: "Атмосфера (от. др.-греч. ἀτμός — пар и σφαῖρα — шар) — газовая (воздушная) оболочка Земли. Удерживается силой тяжести Земли и совершает совместное вращение с нашей планетой. Состоит из нескольких слоёв и не имеет чёткой верхней границы (толщина от 1000 до 3000 км). Концентрация газов постоянна, за исключением воды (H2O) и углекислого газа (CO2), концентрация которого растёт с середины XX века.",
    airCompositionTable: [
      { gas: "Азот (N₂)", percent: "78.08%" },
      { gas: "Кислород (O₂)", percent: "20.95%" },
      { gas: "Аргон (Ar)", percent: "0.934%" },
      { gas: "Углекислый газ (CO₂)", percent: "0.034–0.042%" },
      { gas: "Неон, Гелий, Метан, Криптон и др.", percent: "< 0.002%" }
    ]
  },
  {
    id: "hydrosphere",
    name: "Гидросфера",
    prefix: "HYD",
    color: "bg-blue-600 text-white border-blue-500",
    iconName: "Droplets",
    description: "Гидрохимические исследования, температура воды, pH, прозрачность, TDS",
    definition: "Гидросфера (от др.-греч. гидро «вода» + сфера «шар») — водная оболочка Земли. Её принято делить на Мировой океан, континентальные поверхностные воды, ледники и подземные воды."
  },
  {
    id: "lithosphere",
    name: "Педосфера",
    prefix: "SOIL",
    color: "bg-amber-700 text-white border-amber-600",
    iconName: "Layers",
    description: "Почвенные пробы, pH грунта, плотность, структура и водопроницаемость",
    definition: "Педосфера (от греч. πέδον «грунт» + σφαίρα «шар») — почвенная оболочка Земли. Верхний плодородный слой земной коры, находящийся на стыке живой и неживой природы."
  },
  {
    id: "biosphere",
    name: "Биосфера",
    prefix: "BIO",
    color: "bg-emerald-600 text-white border-emerald-500",
    iconName: "Trees",
    description: "Флора, фауна, биомониторинг по видам и индекс разнообразия Шеннона",
    definition: "Биосфера (от др.-греч. βιος — жизнь и σφαῖρα — сфера, шар) — оболочка Земли, заселённая живыми организмами, находящаяся под их воздействием и занятая продуктами их жизнедеятельности, а также совокупность её свойств как планеты, где создаются условия для развития биологических систем. Глобальная экосистема Земли."
  },
  {
    id: "anthropogenic",
    name: "Антропогенная нагрузка",
    prefix: "ANT",
    color: "bg-orange-600 text-white border-orange-500",
    iconName: "User",
    description: "Шкала уровня мусора (1-5), вытаптывание, шум, свалки и транспорт",
    definition: "Степень прямого или косвенного воздействия хозяйственной деятельности человека на природную среду."
  },
  {
    id: "geology",
    name: "Геологическая летопись",
    prefix: "MIN",
    color: "bg-purple-700 text-white border-purple-600",
    iconName: "Gem",
    description: "Минералы и породы, блеск, твердость по Моосу, черта и кислотный тест",
    definition: "Совокупность горных пород, минералов и отложений, отражающих историю развития земной коры."
  },
  {
    id: "fossils",
    name: "Затерянный мир",
    prefix: "FOS",
    color: "bg-amber-800 text-white border-amber-700",
    iconName: "Skull",
    description: "Палеонтологические находки, окаменелости и таксономия",
    definition: "Фоссилии (от лат. fossilis — ископаемый, окаменелость в палеонтологии) — ископаемые остатки организмов или следы их жизнедеятельности, относящиеся к прежним геологическим эпохам."
  }
];

export const INITIAL_STATIONS: MonitoringStation[] = [
  {
    id: "st-alx-01",
    code: "ALX-01",
    name: "с. Александровка — речной пост",
    category: "hydrosphere",
    lat: 53.2167,
    lng: 63.6333,
    description: "Стационарный эко-пост на реке у с. Александровка",
    establishedYear: 2021
  },
  {
    id: "st-tbl-01",
    code: "TBL-01",
    name: "р. Тобол — створовый забор",
    category: "hydrosphere",
    lat: 53.1833,
    lng: 63.5833,
    description: "Пост долговременного мониторинга бассейна реки Тобол",
    establishedYear: 2020
  },
  {
    id: "st-kst-01",
    code: "KST-01",
    name: "Костанай — городская эко-станция",
    category: "atmosphere",
    lat: 53.2144,
    lng: 63.6246,
    description: "Мониторинг качества воздуха и антропогенной нагрузки в городской черте",
    establishedYear: 2022
  },
  {
    id: "st-ast-01",
    code: "AST-01",
    name: "Астана — степной био-биоценоз",
    category: "biosphere",
    lat: 51.1693,
    lng: 71.4491,
    description: "Стационар наблюдения степных биоценозов и фенологии растений",
    establishedYear: 2019
  }
];

export const INITIAL_WEATHER: WeatherData = {
  station: "Казахстан, Пост эко-мониторинга «Земляне»",
  temperature: "+22°C",
  humidity: "55%",
  pressure: "752 мм рт. ст.",
  windSpeed: "3.2 м/с",
  windDirection: "СЗ",
  cloudiness: "Ясно",
  precipitation: "0.0 мм",
  updatedAt: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
  forecastUrl: "https://yandex.ru/pogoda/"
};

export const INITIAL_RECORDS: MonitoringRecord[] = [
  {
    id: "rec-demo-01",
    stationCode: "ALX-01",
    stationName: "с. Александровка — речной пост",
    category: "hydrosphere",
    date: "2026-05-15",
    lat: 53.2167,
    lng: 63.6333,
    researcherName: "Ахметов Д. (8А)",
    notes: "Весенний промер прозрачности и pH водоема.",
    hydrosphere: {
      waterTemp: 14.5,
      transparency: 42,
      ph: 7.4,
      tds: 220,
      ec: 340,
      nitrates: 3.2,
      dissolvedOxygen: 8.8
    }
  },
  {
    id: "rec-demo-02",
    stationCode: "TBL-01",
    stationName: "р. Тобол — створовый забор",
    category: "hydrosphere",
    date: "2026-06-10",
    lat: 53.1833,
    lng: 63.5833,
    researcherName: "Петрова М. (9Б)",
    notes: "Контрольный гидрохимический анализ створа.",
    hydrosphere: {
      waterTemp: 18.2,
      transparency: 30,
      ph: 8.1,
      tds: 310,
      nitrates: 6.8,
      dissolvedOxygen: 6.5
    }
  },
  {
    id: "rec-demo-03",
    stationCode: "KST-01",
    stationName: "Костанай — городская эко-станция",
    category: "atmosphere",
    date: "2026-07-02",
    lat: 53.2144,
    lng: 63.6246,
    researcherName: "Группа «Земляне»",
    notes: "Летний замер метеорологических показателей.",
    atmosphere: {
      airTemp: 26.5,
      humidity: 48,
      pressure: 748,
      cloudiness: 20,
      windSpeed: 4.1,
      windDirection: "СЗ",
      co2Ppm: 425
    }
  }
];

export const INITIAL_NEWSPAPER_NOTES: NewspaperNote[] = [
  {
    id: "note-01",
    title: "Экспедиция «Тобол-2026»: Первые результаты весеннего мониторинга",
    content: "Юные исследователи клуба «Земляне» провели комплексный сбор данных по прозрачности и гидрохимии на постах ALX-01 и TBL-01. Все ключевые показатели соответствуют природной норме.",
    author: "Пресс-центр клуба «Земляне»",
    date: "2026-05-18",
    category: "Экспедиции"
  }
];
