import { MonitoringRecord, ResearchCategory } from "../types";

/**
 * Calculates Shannon Diversity Index (H')
 * H' = - SUM ( (ni / N) * ln(ni / N) )
 */
export function calculateShannonIndex(counts: { speciesName: string; count: number }[]): number {
  const validCounts = counts.filter(c => c.count > 0 && c.speciesName.trim() !== "");
  if (validCounts.length === 0) return 0;

  const totalN = validCounts.reduce((acc, item) => acc + item.count, 0);
  if (totalN <= 0) return 0;

  let hIndex = 0;
  for (const item of validCounts) {
    const p = item.count / totalN;
    if (p > 0) {
      hIndex -= p * Math.log(p);
    }
  }

  return Math.round(hIndex * 100) / 100;
}

/**
 * Converts CO2 in PPM to percentage (%)
 * 10,000 ppm = 1%
 * 400 ppm = 0.04%
 */
export function convertPpmToPercent(ppm: number): number {
  if (isNaN(ppm) || ppm < 0) return 0;
  return Math.round((ppm / 10000) * 10000) / 10000;
}

/**
 * Generates academic station code
 * Standard: [Location]-[Category]-[Number]
 * Example: KAZ-HYD-01
 */
export function generateStationCode(
  locationPrefix: string = "KAZ",
  category: ResearchCategory,
  existingRecordsCount: number = 0
): string {
  const categoryPrefixes: Record<ResearchCategory, string> = {
    atmosphere: "ATM",
    hydrosphere: "HYD",
    lithosphere: "SOIL",
    biosphere: "BIO",
    anthropogenic: "ANT",
    geology: "MIN",
    fossils: "FOS"
  };

  const catPrefix = categoryPrefixes[category] || "GEN";
  const seqNumber = String(existingRecordsCount + 1).padStart(2, "0");
  return `${locationPrefix.toUpperCase()}-${catPrefix}-${seqNumber}`;
}

/**
 * Interface for Descriptive Statistical Summary
 */
export interface StatSummary {
  n: number;
  mean: number;
  variance: number;
  stdDev: number;
  min: number;
  max: number;
}

/**
 * Calculates Arithmetic Mean and Standard Deviation for a sample
 */
export function calculateStats(values: number[]): StatSummary {
  const valid = values.filter(v => typeof v === "number" && !isNaN(v) && isFinite(v));
  if (valid.length === 0) {
    return { n: 0, mean: 0, variance: 0, stdDev: 0, min: 0, max: 0 };
  }
  const n = valid.length;
  const mean = valid.reduce((a, b) => a + b, 0) / n;
  const variance = n > 1 
    ? valid.reduce((acc, x) => acc + Math.pow(x - mean, 2), 0) / (n - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...valid);
  const max = Math.max(...valid);

  return {
    n,
    mean: Math.round(mean * 100) / 100,
    variance: Math.round(variance * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(min * 100) / 100,
    max: Math.round(max * 100) / 100,
  };
}

/**
 * Student's t-test for two independent sample groups
 */
export function calculateStudentTTest(group1: number[], group2: number[]) {
  const stats1 = calculateStats(group1);
  const stats2 = calculateStats(group2);

  if (stats1.n < 2 || stats2.n < 2) {
    return {
      tStat: 0,
      df: 0,
      pValue: 1,
      isSignificant: false,
      message: "Для расчета t-критерия Стьюдента требуется минимум по 2 измерения в каждой из двух сравниваемых групп.",
      stats1,
      stats2
    };
  }

  const n1 = stats1.n;
  const n2 = stats2.n;
  const m1 = stats1.mean;
  const m2 = stats2.mean;
  const v1 = stats1.variance;
  const v2 = stats2.variance;

  const seDiff = Math.sqrt((v1 / n1) + (v2 / n2));
  if (seDiff === 0) {
    return {
      tStat: 0,
      df: n1 + n2 - 2,
      pValue: 1,
      isSignificant: false,
      message: "Различия между группами равны нулю (отсутствует дисперсия данных).",
      stats1,
      stats2
    };
  }

  const tStat = (m1 - m2) / seDiff;
  const absT = Math.abs(tStat);

  // Welch degrees of freedom
  const num = Math.pow((v1 / n1) + (v2 / n2), 2);
  const den = (Math.pow(v1 / n1, 2) / (n1 - 1)) + (Math.pow(v2 / n2, 2) / (n2 - 1));
  const df = den > 0 ? num / den : n1 + n2 - 2;

  // Approximate two-tailed p-value calculation
  const z = absT * Math.sqrt((df + 1) / (df + Math.pow(absT, 2)));
  const pValue = Math.min(1, Math.max(0.0001, 2 * (1 - normalCdf(z))));

  const isSignificant = pValue < 0.05;
  const message = isSignificant
    ? `Различия статистически достоверны (p < 0.05, p = ${pValue.toFixed(4)})`
    : `Различия случайны (недостоверны, p ≥ 0.05, p = ${pValue.toFixed(4)})`;

  return {
    tStat: Math.round(tStat * 1000) / 1000,
    absT: Math.round(absT * 1000) / 1000,
    df: Math.round(df * 10) / 10,
    pValue: Math.round(pValue * 10000) / 10000,
    isSignificant,
    message,
    stats1,
    stats2
  };
}

function normalCdf(z: number): number {
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (z < 0) return 1 - normalCdf(-z);
  const t = 1.0 / (1.0 + p * z);
  return 1.0 - c * Math.exp(-z * z / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
}

/**
 * Analyzes a record for critical parameter spikes & generates instant alerts
 */
export function checkRecordAnomalies(record: Partial<MonitoringRecord>): {
  isAnomaly: boolean;
  alerts: string[];
  guidingQuestions: string[];
} {
  const alerts: string[] = [];
  let guidingQuestions: string[] = [];

  // Hydrosphere checks
  if (record.hydrosphere) {
    const { ph, transparency, dissolvedOxygen, nitrates, tds } = record.hydrosphere;
    if (ph !== undefined && (ph < 6.5 || ph > 8.5)) {
      alerts.push(`Критический рН воды (${ph}). Норма для пресных водоемов: 6.5–8.5.`);
    }
    if (transparency !== undefined && transparency < 20) {
      alerts.push(`Низкая прозрачность воды (${transparency} см). Сильное замутнение или взвесь.`);
    }
    if (dissolvedOxygen !== undefined && dissolvedOxygen < 5.0) {
      alerts.push(`Опасный дефицит кислорода (${dissolvedOxygen} мг/л). Риск заморных явлений гидробионтов!`);
    }
    if (nitrates !== undefined && nitrates > 10) {
      alerts.push(`Повышенная концентрация нитратов (${nitrates} мг/л). Возможен поверхностный смыв удобрений.`);
    }
    if (tds !== undefined && tds > 500) {
      alerts.push(`Высокая общая минерализация TDS (${tds} мг/л). Повышенная антропогенная или минеральная нагрузка.`);
    }
  }

  // Atmosphere checks
  if (record.atmosphere) {
    const { co2Ppm, airTemp } = record.atmosphere;
    if (co2Ppm !== undefined && co2Ppm > 800) {
      alerts.push(`Повышенное содержание CO2 (${co2Ppm} ppm / ${convertPpmToPercent(co2Ppm)}%). Фоновая норма: ~420 ppm.`);
    }
    if (airTemp !== undefined && airTemp > 35) {
      alerts.push(`Аномально высокая температура воздуха (+${airTemp}°C).`);
    }
  }

  // Anthropogenic checks
  if (record.anthropogenic) {
    const { litterLevel, noiseLevel, illegalDumps } = record.anthropogenic;
    if (litterLevel !== undefined && litterLevel >= 4) {
      alerts.push(`Высокий индекс захламления бытовыми отходами (${litterLevel}/5).`);
    }
    if (noiseLevel !== undefined && noiseLevel > 70) {
      alerts.push(`Шумовое загрязнение (${noiseLevel} дБА) превышает комфортную зону для фауны.`);
    }
    if (illegalDumps) {
      alerts.push(`Зафиксирована стихийная свалка или локальный сброс отходов.`);
    }
  }

  const isAnomaly = alerts.length > 0;

  if (isAnomaly) {
    guidingQuestions = [
      "Какие вероятные источники поступления веществ или факторов вызвали эти отклонения?",
      "Как данные показатели соотносятся с прошлыми сезонами наблюдения на этой станции?",
      "Сформулируйте научную гипотезу: какова связь между внешними условиями и зафиксированной аномалией?"
    ];
  } else {
    guidingQuestions = [
      "Находятся ли зафиксированные показатели в границах сезонной климатической нормы?",
      "Какую роль играют эти параметры в устойчивости изучаемой экосистемы?",
      "Какую гипотезу о динамике этого участка можно предложить для следующего сезона?"
    ];
  }

  return { isAnomaly, alerts, guidingQuestions };
}
