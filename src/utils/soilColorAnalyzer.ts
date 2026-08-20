/**
 * ============================================================================
 * SOIL COLOR COLORIMETRY ANALYZER (CANVAS API)
 * ============================================================================
 * 
 * Performs client-side image processing on soil sample photos using HTML5 Canvas.
 * Analyzes dominant RGB, detects Hue/Saturation/Lightness, and maps to the
 * standard Russian Academic Soil Color Scale (Zakharov & Munsell Soil Color charts).
 */

export interface SoilColorResult {
  rgb: { r: number; g: number; b: number };
  hex: string;
  colorName: string;
  classification: string;
  humusEstimate: string;
  brightnessPercent: number;
  saturationPercent: number;
}

interface SoilReferenceColor {
  name: string;
  classification: string;
  humus: string;
  rgb: [number, number, number];
}

// Reference Soil Color Database (Zakharov Russian System & Standard Munsell Soil Equivalents)
const SOIL_REFERENCE_PALETTE: SoilReferenceColor[] = [
  {
    name: "Черный глубокогумусированный",
    classification: "Чернозем типичный / тучный",
    humus: "Очень высокое (8 – 12% и более)",
    rgb: [38, 33, 28]
  },
  {
    name: "Темно-серый черноземный",
    classification: "Чернозем обыкновенный / южный",
    humus: "Высокое (5 – 7.5%)",
    rgb: [58, 51, 45]
  },
  {
    name: "Темно-каштановый",
    classification: "Каштановая темно-гумусовая почва",
    humus: "Умеренно-высокое (3.5 – 5.0%)",
    rgb: [75, 58, 48]
  },
  {
    name: "Каштановый степной",
    classification: "Каштановая целинная / пахотная почва",
    humus: "Среднее (2.5 – 3.5%)",
    rgb: [105, 82, 65]
  },
  {
    name: "Светло-каштановый",
    classification: "Светло-каштановая сухостепная",
    humus: "Низкое (1.5 – 2.2%)",
    rgb: [142, 118, 96]
  },
  {
    name: "Серый лесной",
    classification: "Серая лесная почва",
    humus: "Среднее (2.5 – 4.0%)",
    rgb: [112, 107, 100]
  },
  {
    name: "Светло-серый оподзоленный",
    classification: "Дерново-подзолистая / Элювиальный горизонт",
    humus: "Очень низкое (1.0 – 1.8%)",
    rgb: [165, 158, 148]
  },
  {
    name: "Красновато-бурый ожелезненный",
    classification: "Ферраллитизированная / Ожелезненный горизонт B",
    humus: "Низкое (1.0 – 2.0%), обогащена Fe₂O₃",
    rgb: [139, 69, 42]
  },
  {
    name: "Желто-бурый суглинистый",
    classification: "Суглинистая почва / Лёссовидный суглинок",
    humus: "Низкое (1.2 – 2.0%), преобладают гидроксиды железа",
    rgb: [175, 135, 85]
  },
  {
    name: "Бурый полупустынный",
    classification: "Бурая полупустынная почва",
    humus: "Очень низкое (0.8 – 1.4%)",
    rgb: [130, 102, 75]
  },
  {
    name: "Оливково-сизый оглеенный",
    classification: "Глеевый горизонт G (переувлажнение / болота)",
    humus: "Застойный анаэробиоз, Fe²⁺ соединения",
    rgb: [107, 118, 98]
  },
  {
    name: "Торфяно-болотный темно-коричневый",
    classification: "Органогенный торфяной горизонт T",
    humus: "Торфянистая органика (>20% органического углерода)",
    rgb: [54, 40, 30]
  },
  {
    name: "Белесоватый солончаковый",
    classification: "Солончак / Карбонатный горизонт",
    humus: "Низкое (<1%), высокое содержание солей (NaCl, CaCO₃)",
    rgb: [210, 202, 188]
  },
  {
    name: "Ржаво-охристый аллювиальный",
    classification: "Аллювиальная пойменная почва",
    humus: "Слоисто-гумусовое (1.5 – 3.0%)",
    rgb: [168, 105, 52]
  }
];

/**
 * Calculates Euclidean distance in RGB color space
 */
function rgbDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) * 1.2 +
    Math.pow(g1 - g2, 2) * 1.0 +
    Math.pow(b1 - b2, 2) * 0.8
  );
}

/**
 * Converts RGB numbers to HEX string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Analyzes an image (File or Data URL) and calculates soil color characteristics using Canvas API
 */
export async function analyzeSoilImage(imageSource: File | string): Promise<SoilColorResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      try {
        // Create an offscreen canvas
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          throw new Error("Canvas 2D context unavailable");
        }

        // Limit size for snappy analysis (max 200x200)
        const maxDim = 200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // Get image pixel data (focusing on central 70% region to avoid table / paper borders)
        const startX = Math.floor(width * 0.15);
        const startY = Math.floor(height * 0.15);
        const sampleW = Math.max(10, Math.floor(width * 0.7));
        const sampleH = Math.max(10, Math.floor(height * 0.7));

        const imageData = ctx.getImageData(startX, startY, sampleW, sampleH);
        const data = imageData.data;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let validPixels = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Ignore transparent or pure white/glare pixels (>245 in all channels)
          if (a < 128) continue;
          if (r > 248 && g > 248 && b > 248) continue;

          totalR += r;
          totalG += g;
          totalB += b;
          validPixels++;
        }

        if (validPixels === 0) {
          totalR = 90;
          totalG = 75;
          totalB = 60;
          validPixels = 1;
        }

        const avgR = Math.round(totalR / validPixels);
        const avgG = Math.round(totalG / validPixels);
        const avgB = Math.round(totalB / validPixels);

        // Find closest match in scientific soil palette
        let closestSoil = SOIL_REFERENCE_PALETTE[0];
        let minDistance = Infinity;

        for (const ref of SOIL_REFERENCE_PALETTE) {
          const dist = rgbDistance(avgR, avgG, avgB, ref.rgb[0], ref.rgb[1], ref.rgb[2]);
          if (dist < minDistance) {
            minDistance = dist;
            closestSoil = ref;
          }
        }

        const hex = rgbToHex(avgR, avgG, avgB);
        const brightness = Math.round(((avgR * 299 + avgG * 587 + avgB * 114) / 1000 / 255) * 100);
        const maxC = Math.max(avgR, avgG, avgB);
        const minC = Math.min(avgR, avgG, avgB);
        const saturation = maxC === 0 ? 0 : Math.round(((maxC - minC) / maxC) * 100);

        resolve({
          rgb: { r: avgR, g: avgG, b: avgB },
          hex,
          colorName: closestSoil.name,
          classification: closestSoil.classification,
          humusEstimate: closestSoil.humus,
          brightnessPercent: brightness,
          saturationPercent: saturation
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => reject(new Error("Не удалось загрузить изображение для спектрального анализа"));

    if (typeof imageSource === "string") {
      img.src = imageSource;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error("Ошибка чтения файла пробы почвы"));
      reader.readAsDataURL(imageSource);
    }
  });
}
