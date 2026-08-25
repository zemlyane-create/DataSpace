import ExcelJS from "exceljs";
import { MonitoringRecord, FilterState, ResearchCategory, CustomMetric } from "../types";

const CATEGORY_NAMES_RU: Record<string, string> = {
  hydrosphere: "Гидросфера",
  atmosphere: "Атмосфера",
  lithosphere: "Литосфера (Почва)",
  biosphere: "Биомониторинг",
  anthropogenic: "Антропогенная нагрузка",
  geology: "Геологическая летопись",
  fossils: "Затерянный мир (Фоссилии)",
  ALL: "Все категории"
};

/**
 * Calculates CO2 concentration in percentage from ppm
 * 10,000 ppm = 1.00%
 */
export function calculateCo2Percent(ppm?: number | null): number | null {
  if (ppm === undefined || ppm === null || isNaN(ppm)) return null;
  return Number((ppm / 10000).toFixed(4));
}

/**
 * Helper to extract custom metrics into a readable string
 */
function formatCustomAttributes(record: MonitoringRecord): string {
  if (!record.customAttributes) return "";
  const list: CustomMetric[] = Array.isArray(record.customAttributes)
    ? record.customAttributes
    : Object.values(record.customAttributes);
  
  if (list.length === 0) return "";
  return list.map(m => `${m.name}: ${m.value}${m.unit ? " " + m.unit : ""}`).join("; ");
}

/**
 * Main function to export comprehensive environmental research journal to Excel (.xlsx)
 * with individual columns for all parameters, solid borders, text wrapping, and calculated CO2 %.
 */
export async function exportJournalToExcel(
  records: MonitoringRecord[],
  filterState?: Partial<FilterState>
) {
  const currentCategory = filterState?.category || "ALL";
  const currentStation = filterState?.stationCode || "ALL";

  // Filter records
  const targetRecords = records.filter(r => {
    if (filterState?.category && filterState.category !== "ALL" && r.category !== filterState.category) return false;
    if (filterState?.stationCode && filterState.stationCode !== "ALL" && r.stationCode !== filterState.stationCode) return false;
    if (filterState?.dateFrom && r.date < filterState.dateFrom) return false;
    if (filterState?.dateTo && r.date > filterState.dateTo) return false;
    return true;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Эко-клуб «Земляне»";
  workbook.lastModifiedBy = "Zemlyane.DataSpace Eco-System";
  workbook.created = new Date();

  // Sheet 1: Comprehensive Journal
  const worksheet = workbook.addWorksheet("Полевой научный журнал", {
    views: [{ showGridLines: true }]
  });

  // 1. Title Banner
  worksheet.mergeCells("A1:AP1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "ПОЛЕВОЙ НАУЧНЫЙ ЖУРНАЛ ДОЛГОВРЕМЕННЫХ ЭКОЛОГИЧЕСКИХ ИССЛЕДОВАНИЙ";
  titleCell.font = { name: "Calibri", size: 15, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F382A" } // Dark emerald
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 32;

  // 2. Subtitle Metadata Bar
  worksheet.mergeCells("A2:AP2");
  const subCell = worksheet.getCell("A2");
  const catLabel = CATEGORY_NAMES_RU[currentCategory] || currentCategory;
  subCell.value = `Эко-клуб «Земляне» | Сформировано: ${new Date().toLocaleString("ru-RU")} | Фильтр категории: ${catLabel} | Станция: ${currentStation} | Всего записей: ${targetRecords.length}`;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF1E293B" } };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" }
  };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // Blank row 3

  // 3. Category Group Headers (Row 4)
  const groupHeaders = [
    { label: "ОБЩИЕ РЕКВИЗИТЫ ЗАМЕРА", start: 1, end: 7, bg: "FF1E3A8A" }, // Blue
    { label: "ГИДРОСФЕРА (ВОДНЫЕ ПОКАЗАТЕЛИ)", start: 8, end: 14, bg: "FF0369A1" }, // Sky/Teal
    { label: "АТМОСФЕРА И МЕТЕОРОЛОГИЯ", start: 15, end: 23, bg: "FF0F766E" }, // Teal
    { label: "ЛИТОСФЕРА (ПОЧВЕННЫЙ ПОКРОВ)", start: 24, end: 30, bg: "FF854D0E" }, // Amber/Brown
    { label: "БИОМОНИТОРИНГ (БИОСФЕРА)", start: 31, end: 35, bg: "FF15803D" }, // Green
    { label: "АНТРОПОГЕННАЯ НАГРУЗКА", start: 36, end: 41, bg: "FFB45309" }, // Orange
    { label: "ГЕОЛОГИЯ И МИНЕРАЛОГИЯ", start: 42, end: 45, bg: "FF475569" }, // Slate
    { label: "ЗАТЕРЯННЫЙ МИР (ПАЛЕОНТОЛОГИЯ)", start: 46, end: 49, bg: "FF6B21A8" }, // Purple
    { label: "ДОПОЛНИТЕЛЬНО И ПРИМЕЧАНИЯ", start: 50, end: 52, bg: "FF334155" } // Dark Slate
  ];

  // 4. Column Definitions
  const columns = [
    // 1-7: General
    { header: "Шифр Станции", key: "stationCode", width: 14 },
    { header: "Название Станции / Поста", key: "stationName", width: 28 },
    { header: "Категория", key: "categoryName", width: 18 },
    { header: "Дата Замера", key: "date", width: 14 },
    { header: "Широта (°N)", key: "lat", width: 13 },
    { header: "Долгота (°E)", key: "lng", width: 13 },
    { header: "Исследователь", key: "researcherName", width: 22 },

    // 8-14: Hydrosphere
    { header: "Т воды (°C)", key: "waterTemp", width: 14 },
    { header: "Прозрачность Секки (см)", key: "transparency", width: 16 },
    { header: "pH воды", key: "waterPh", width: 12 },
    { header: "TDS минерализация (мг/л)", key: "tds", width: 16 },
    { header: "Электропроводность EC (мкСм/см)", key: "ec", width: 16 },
    { header: "Нитраты NO3 (мг/л)", key: "nitrates", width: 14 },
    { header: "Растворенный O2 (мг/л)", key: "dissolvedOxygen", width: 14 },

    // 15-23: Atmosphere
    { header: "Т воздуха (°C)", key: "airTemp", width: 14 },
    { header: "Влажность (%)", key: "humidity", width: 14 },
    { header: "Давление (мм рт.ст.)", key: "pressure", width: 15 },
    { header: "Облачность (%)", key: "cloudiness", width: 14 },
    { header: "Скорость ветра (м/с)", key: "windSpeed", width: 14 },
    { header: "Направление ветра", key: "windDirection", width: 14 },
    { header: "Осадки (мм)", key: "precipitation", width: 13 },
    { header: "CO2 (ppm)", key: "co2Ppm", width: 13 },
    { header: "CO2 (%) [расчетный]", key: "co2Percent", width: 16 },

    // 24-30: Lithosphere
    { header: "pH почвы", key: "soilPh", width: 12 },
    { header: "Мех. состав почвы", key: "texture", width: 18 },
    { header: "Окраска (Манселл)", key: "soilColor", width: 18 },
    { header: "Тяжелые металлы", key: "heavyMetals", width: 16 },
    { header: "Водопрочность (%)", key: "waterStability", width: 14 },
    { header: "Плотность (г/см³)", key: "density", width: 14 },
    { header: "Водопроницаемость (мм/мин)", key: "permeability", width: 16 },

    // 31-35: Biosphere
    { header: "Индекс Шеннона (H')", key: "shannonIndex", width: 15 },
    { header: "Флора (виды)", key: "floraSpecies", width: 25 },
    { header: "Фауна (виды)", key: "faunaSpecies", width: 25 },
    { header: "Следы жизнедеятельности", key: "lifeSigns", width: 22 },
    { header: "Учет особей (кол-во)", key: "speciesCountSum", width: 16 },

    // 36-41: Anthropogenic
    { header: "Замусоренность (1-5)", key: "litterLevel", width: 15 },
    { header: "Шум (дБА)", key: "noiseLevel", width: 13 },
    { header: "Вытаптывание (1-5)", key: "tramplingLevel", width: 15 },
    { header: "Транспорт (авто/ч)", key: "trafficIntensity", width: 15 },
    { header: "Кострища (шт)", key: "firePitsCount", width: 13 },
    { header: "Свалки (да/нет)", key: "illegalDumps", width: 14 },

    // 42-45: Geology
    { header: "Минерал / Порода", key: "mineralName", width: 20 },
    { header: "Твердость по Моосу", key: "mohsHardness", width: 15 },
    { header: "Блеск", key: "luster", width: 16 },
    { header: "Цвет черты", key: "streakColor", width: 15 },

    // 46-49: Fossils
    { header: "Фоссилия (таксон)", key: "organismGroup", width: 20 },
    { header: "Длина (мм)", key: "lengthMm", width: 13 },
    { header: "Ширина (мм)", key: "widthMm", width: 13 },
    { header: "Толщина (мм)", key: "thicknessMm", width: 13 },

    // 50-52: Custom params, Notes & Anomalies
    { header: "Пользовательские параметры", key: "customParams", width: 30 },
    { header: "Полевые примечания", key: "notes", width: 32 },
    { header: "Статус / Аномалия ИИ", key: "aiStatus", width: 25 }
  ];

  // Write Group Row (Row 4)
  const groupRowValues = new Array(columns.length).fill("");
  groupHeaders.forEach(g => {
    groupRowValues[g.start - 1] = g.label;
  });
  const groupRow = worksheet.addRow(groupRowValues);
  groupRow.height = 24;

  groupHeaders.forEach(g => {
    worksheet.mergeCells(4, g.start, 4, g.end);
    const cell = worksheet.getCell(4, g.start);
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: g.bg } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Write Main Column Headers (Row 5)
  const headerRow = worksheet.addRow(columns.map(c => c.header));
  headerRow.height = 36;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF134E4A" } // Deep Teal/Green
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Apply column widths
  columns.forEach((col, idx) => {
    const sheetCol = worksheet.getColumn(idx + 1);
    sheetCol.width = col.width;
  });

  // Populate Data Rows
  targetRecords.forEach((r, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF8FAFC"; // Clean alternate zebra row

    // Calculate CO2 % from ppm
    const co2PpmVal = r.atmosphere?.co2Ppm ?? null;
    let co2PercentFormatted: number | string = "—";
    if (co2PpmVal !== null && !isNaN(Number(co2PpmVal))) {
      const p = calculateCo2Percent(Number(co2PpmVal));
      co2PercentFormatted = p !== null ? `${p}%` : "—";
    } else if (r.atmosphere?.co2Percent !== undefined && r.atmosphere.co2Percent !== null) {
      co2PercentFormatted = `${r.atmosphere.co2Percent}%`;
    }

    // Biosphere species count sum
    let speciesCountSum: string | number = "—";
    if (r.biosphere?.speciesCounts && r.biosphere.speciesCounts.length > 0) {
      const sum = r.biosphere.speciesCounts.reduce((acc, curr) => acc + (Number(curr.count) || 0), 0);
      speciesCountSum = sum > 0 ? sum : "—";
    }

    const rowData = [
      // 1-7: General
      r.stationCode || "—",
      r.stationName || "—",
      CATEGORY_NAMES_RU[r.category] || r.category,
      r.date || "—",
      r.lat !== undefined ? Number(r.lat.toFixed(5)) : "—",
      r.lng !== undefined ? Number(r.lng.toFixed(5)) : "—",
      r.researcherName || "—",

      // 8-14: Hydrosphere
      r.hydrosphere?.waterTemp ?? "—",
      r.hydrosphere?.transparency ?? "—",
      r.hydrosphere?.ph ?? "—",
      r.hydrosphere?.tds ?? "—",
      r.hydrosphere?.ec ?? "—",
      r.hydrosphere?.nitrates ?? "—",
      r.hydrosphere?.dissolvedOxygen ?? "—",

      // 15-23: Atmosphere
      r.atmosphere?.airTemp ?? "—",
      r.atmosphere?.humidity ?? "—",
      r.atmosphere?.pressure ?? "—",
      r.atmosphere?.cloudiness ?? "—",
      r.atmosphere?.windSpeed ?? "—",
      r.atmosphere?.windDirection ?? "—",
      r.atmosphere?.precipitation ?? "—",
      co2PpmVal ?? "—",
      co2PercentFormatted,

      // 24-30: Lithosphere
      r.lithosphere?.soilPh ?? "—",
      r.lithosphere?.texture ?? "—",
      r.lithosphere?.soilColor ?? "—",
      r.lithosphere?.heavyMetals ?? "—",
      r.lithosphere?.waterStability ?? "—",
      r.lithosphere?.density ?? "—",
      r.lithosphere?.permeability ?? "—",

      // 31-35: Biosphere
      r.biosphere?.shannonIndex ?? "—",
      r.biosphere?.floraSpecies ?? "—",
      r.biosphere?.faunaSpecies ?? "—",
      r.biosphere?.lifeSigns ?? "—",
      speciesCountSum,

      // 36-41: Anthropogenic
      r.anthropogenic?.litterLevel ?? "—",
      r.anthropogenic?.noiseLevel ?? "—",
      r.anthropogenic?.tramplingLevel ?? "—",
      r.anthropogenic?.trafficIntensity ?? "—",
      r.anthropogenic?.firePitsCount ?? "—",
      r.anthropogenic?.illegalDumps === true ? "Да" : r.anthropogenic?.illegalDumps === false ? "Нет" : "—",

      // 42-45: Geology
      r.geology?.mineralName ?? "—",
      r.geology?.mohsHardness ?? "—",
      r.geology?.luster ?? "—",
      r.geology?.streakColor ?? "—",

      // 46-49: Fossils
      r.fossils?.organismGroup ?? "—",
      r.fossils?.lengthMm ?? "—",
      r.fossils?.widthMm ?? "—",
      r.fossils?.thicknessMm ?? "—",

      // 50-52: Custom params, Notes & Status
      formatCustomAttributes(r) || "—",
      r.notes || "—",
      r.isAnomaly ? `[ВНИМАНИЕ] ${r.aiAlert || "Аномальный показатель"}` : "Норма"
    ];

    const addedRow = worksheet.addRow(rowData);
    addedRow.height = 24;

    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg }
      };

      // Explicit visible borders on every cell
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      };

      // Alignment with mandatory wrapText
      if (colNumber === 1 || colNumber === 3 || colNumber === 4 || colNumber === 5 || colNumber === 6) {
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      } else if (typeof cell.value === "number") {
        cell.alignment = { vertical: "middle", horizontal: "right", wrapText: false };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      }

      // Highlight anomaly row in light amber if flagged
      if (r.isAnomaly && colNumber === columns.length) {
        cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFB45309" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
      }
    });
  });

  // Generate binary XLSX buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const fileName = `Zemlyane_EcoJournal_${currentCategory}_${new Date().toISOString().split("T")[0]}.xlsx`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Backwards-compatible legacy export for Analytics module with formulas
 */
export async function exportToExcel(
  records: MonitoringRecord[],
  filterState: FilterState,
  activeParamLabel: string,
  activeParamUnit: string
) {
  // Directly trigger the full journal export
  await exportJournalToExcel(records, filterState);
}
