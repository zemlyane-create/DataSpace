import ExcelJS from "exceljs";
import { MonitoringRecord, FilterState, ResearchCategory } from "../types";

export async function exportToExcel(
  records: MonitoringRecord[],
  filterState: FilterState,
  activeParamLabel: string,
  activeParamUnit: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Zemlyane.DataSpace";
  workbook.lastModifiedBy = "Zemlyane.DataSpace Eco-System";
  workbook.created = new Date();

  // Sheet 1: Main Records
  const worksheet = workbook.addWorksheet("Журнал Наблюдений", {
    views: [{ showGridLines: true }]
  });

  // Sheet Title Header
  worksheet.mergeCells("A1:I1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "Zemlyane.DataSpace — Полевой экологический отчет";
  titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF103B2B" }
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(1).height = 36;

  // Metadata block
  worksheet.mergeCells("A2:I2");
  const subCell = worksheet.getCell("A2");
  subCell.value = `Дата формирования: ${new Date().toLocaleString("ru-RU")} | Категория: ${filterState.category} | Пост: ${filterState.stationCode}`;
  subCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF334155" } };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" }
  };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  worksheet.getRow(2).height = 22;

  worksheet.addRow([]); // Blank row 3

  // Table Headers
  const headers = [
    "Шифр Станции",
    "Название Поста",
    "Категория",
    "Дата Замера",
    "Координаты",
    "Исследователь",
    `Значение (${activeParamLabel})`,
    "Ед. Изм.",
    "Примечания & Аномалии"
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF15803D" }
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "medium", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } }
    };
  });

  // Filter records
  const targetRecords = records.filter(r => {
    if (filterState.category !== "ALL" && r.category !== filterState.category) return false;
    if (filterState.stationCode !== "ALL" && r.stationCode !== filterState.stationCode) return false;
    if (filterState.dateFrom && r.date < filterState.dateFrom) return false;
    if (filterState.dateTo && r.date > filterState.dateTo) return false;
    return true;
  });

  let startDataRowIndex = 5;
  let endDataRowIndex = startDataRowIndex;

  targetRecords.forEach((r, idx) => {
    // Extract numerical value for primary parameter
    let numVal: number | string = "—";
    const catData = r[r.category as keyof MonitoringRecord] as any;
    if (catData && catData[filterState.parameterKey] !== undefined) {
      const parsed = Number(catData[filterState.parameterKey]);
      if (!isNaN(parsed)) numVal = parsed;
    } else {
      // Fallback search
      for (const key of ["waterTemp", "airTemp", "soilPh", "shannonIndex", "litterLevel"]) {
        if (catData && catData[key] !== undefined) {
          const parsed = Number(catData[key]);
          if (!isNaN(parsed)) {
            numVal = parsed;
            break;
          }
        }
      }
    }

    const rowValues = [
      r.stationCode,
      r.stationName,
      r.category,
      r.date,
      `${r.lat.toFixed(4)}°, ${r.lng.toFixed(4)}°`,
      r.researcherName,
      numVal,
      activeParamUnit,
      r.isAnomaly ? `[АНОМАЛИЯ] ${r.aiAlert || ""} | ${r.notes || ""}` : (r.notes || "Норма")
    ];

    const addedRow = worksheet.addRow(rowValues);
    addedRow.height = 20;

    // Alternate row zebra shading
    const isEven = idx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFF0FDF4";

    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: "Arial", size: 10, color: { argb: "FF0F172A" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg }
      };

      // Border for every cell
      cell.border = {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } }
      };

      // Alignment
      if (colNumber === 1 || colNumber === 4 || colNumber === 5) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (colNumber === 7) {
        cell.alignment = { vertical: "middle", horizontal: "right" };
        if (typeof cell.value === "number") {
          cell.numFmt = "0.00";
        }
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }
    });

    endDataRowIndex = startDataRowIndex + idx;
  });

  // Add Statistical Formulas Row
  if (targetRecords.length > 0) {
    worksheet.addRow([]); // Blank row

    const summaryRowHeader = worksheet.addRow(["РАСЧЕТНЫЕ СТАТИСТИЧЕСКИЕ ПОКАЗАТЕЛИ (ФОРМУЛЫ EXCEL)"]);
    summaryRowHeader.getCell(1).font = { bold: true, size: 11, color: { argb: "FF166534" } };
    worksheet.mergeCells(`A${summaryRowHeader.number}:I${summaryRowHeader.number}`);

    // Formula Rows
    const avgRow = worksheet.addRow([
      "Среднее значение (X̄)", "", "", "", "", "",
      { formula: `AVERAGE(G${startDataRowIndex}:G${endDataRowIndex})` },
      activeParamUnit,
      "Формула: AVERAGE()"
    ]);

    const minRow = worksheet.addRow([
      "Минимальное значение (Min)", "", "", "", "", "",
      { formula: `MIN(G${startDataRowIndex}:G${endDataRowIndex})` },
      activeParamUnit,
      "Формула: MIN()"
    ]);

    const maxRow = worksheet.addRow([
      "Максимальное значение (Max)", "", "", "", "", "",
      { formula: `MAX(G${startDataRowIndex}:G${endDataRowIndex})` },
      activeParamUnit,
      "Формула: MAX()"
    ]);

    const stdRow = worksheet.addRow([
      "Стандартное отклонение (s)", "", "", "", "", "",
      { formula: `STDEV.P(G${startDataRowIndex}:G${endDataRowIndex})` },
      activeParamUnit,
      "Формула: STDEV.P()"
    ]);

    const countRow = worksheet.addRow([
      "Число замеров (n)", "", "", "", "", "",
      { formula: `COUNT(G${startDataRowIndex}:G${endDataRowIndex})` },
      "замеров",
      "Формула: COUNT()"
    ]);

    [avgRow, minRow, maxRow, stdRow, countRow].forEach(r => {
      r.height = 20;
      r.eachCell((cell, colNumber) => {
        cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF064E3B" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECFDF5" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF86EFAC" } },
          left: { style: "thin", color: { argb: "FF86EFAC" } },
          bottom: { style: "thin", color: { argb: "FF86EFAC" } },
          right: { style: "thin", color: { argb: "FF86EFAC" } }
        };
        if (colNumber === 7) {
          cell.numFmt = "0.00";
          cell.alignment = { horizontal: "right" };
        }
      });
    });
  }

  // Auto-fit Column Widths cleanly so text never gets truncated
  worksheet.columns.forEach((column) => {
    let maxLength = 12;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const cellVal = cell.value;
      let valStr = "";
      if (typeof cellVal === "object" && cellVal !== null && "formula" in cellVal) {
        valStr = "123.45"; // placeholder length for formulas
      } else {
        valStr = cellVal ? String(cellVal) : "";
      }
      if (valStr.length > maxLength) {
        maxLength = Math.min(valStr.length + 4, 50); // cap max column width at 50
      }
    });
    column.width = maxLength;
  });

  // Generate Buffer and trigger browser file save
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const fileName = `Zemlyane_EcoReport_${filterState.category}_${new Date().toISOString().split("T")[0]}.xlsx`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
