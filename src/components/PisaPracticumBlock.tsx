import React, { useState } from "react";
import { 
  Award, CheckCircle, AlertCircle, HelpCircle, BookOpen, Brain, 
  RefreshCw, Sparkles, Filter, Send, Shuffle, Layers, FileText, 
  Lightbulb, Activity, Scale, Compass, Check
} from "lucide-react";
import { MonitoringStation, MonitoringRecord } from "../types";

export interface PisaQuestion {
  id: number;
  grade: number; // 7, 8, 9, 10, 11
  gradeLabel: string;
  title: string;
  context: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export const PISA_QUESTIONS: PisaQuestion[] = [
  {
    id: 1,
    grade: 7,
    gradeLabel: "7 класс (Базовый уровень)",
    title: "Кейс №1: Первичная органолептика и прозрачность реки",
    context: "Учащиеся 7 класса во время весеннего полевого выхода провели замеры прозрачности реки Тобол с помощью диска Секки. В апреле после обильных талых стоков прозрачность составила всего 18 см, а в июне повысилась до 85 см.",
    questionText: "Какая природная причина наиболее достоверно объясняет сильное падение прозрачности воды в апреле?",
    options: [
      "Смыв верхнего почвенно-грунтового слоя и смыв глинистых взвесей с водосборной площади во время активного снеготаяния.",
      "Мгновенный выброс промышленных стоков всеми заводами региона.",
      "Повышение температуры атмосферного воздуха, вызвавшее испарение воды.",
      "Активное размножение рыб в русле реки во время нереста."
    ],
    correctIndex: 0,
    explanation: "Верно! В 7 классе изучаются физические явления в гидросфере. Поверхностный смыв во время паводка заносит в реку тонкодисперсный ил и глину, резко снижая прозрачность по диску Секки."
  },
  {
    id: 2,
    grade: 8,
    gradeLabel: "8 класс (Гидрохимия и pH)",
    title: "Кейс №2: Гидрохимический ацидоз на станции HYD-01",
    context: "Учащиеся 8 класса провели анализ pH и растворенного кислорода. В мае pH был 7.4 (нейтральная реакция), а в августе упал до 5.8 (закисление воды), при этом наблюдалось цветущее состояние макрофитов.",
    questionText: "Какая гипотеза наиболее обоснованно объясняет сочетанное снижение pH и концентрации кислорода в августе?",
    options: [
      "Интенсивное отмирание и гниение биомассы водорослей с выделением углекислого газа и органических кислот.",
      "Естественное испарение воды при высокой температуре воздуха с выпаданием щелочных солей.",
      "Увеличение растворенного кислорода из-за слишком активного фотосинтеза донных растений.",
      "Выпадение кислых дождей исключительно над руслом реки."
    ],
    correctIndex: 0,
    explanation: "Верно! Разложение органики аэробными бактериями потребляет растворенный кислород и обогащает воду CO2, образующим угольную кислоту (pH < 7)."
  },
  {
    id: 3,
    grade: 9,
    gradeLabel: "9 класс (Педосфера и структуры почв)",
    title: "Кейс №3: Тренды гумусового слоя в педосфере",
    context: "Исследовательский отряд 9 класса сравнил почвенные разрезы станции SOIL-03 (Александровка). В 2020 году плотность почвы составляла 1.1 г/см³. К 2026 году при вытаптывании тропинок плотность возросла до 1.45 г/см³.",
    questionText: "Как уплотнение почвы до 1.45 г/см³ скажется на аэрации и водопроницаемости почвенного горизонта?",
    options: [
      "Водопроницаемость вырастет, так как капилляры почвы стали более узкими.",
      "Уменьшится объем пор, что снизит аэрацию (доступ кислорода к корням) и замедлит впитывание талых и дождевых вод.",
      "Аэрация улучшится из-за вытеснения почвенного воздуха наружу.",
      "Плотность почвы никак не влияет на развитие почвенных микроорганизмов."
    ],
    correctIndex: 1,
    explanation: "Верно! Разрушение макропор при уплотнении препятствует впитыванию влаги и газообмену, стимулируя поверхностный смыв и эрозию."
  },
  {
    id: 4,
    grade: 10,
    gradeLabel: "10 класс (Биоиндикация и экоэкология)",
    title: "Кейс №4: Лихеноиндикация чистоты атмосферного воздуха",
    context: "Учащиеся 10 класса оценили состояние стволов сосен на станции BIO-02. На 80% деревьев зафиксированы слоевища кустистых лишайников (Usnea subfloridana и Evernia prunastri) с пространственным покрытием более 60%.",
    questionText: "О чем свидетельствует преобладание кустистых лишайников в биомониторинге?",
    options: [
      "О высокой чистоте атмосферного воздуха и крайне низкой концентрации диоксида серы (SO2 < 0.02 мг/м³).",
      "О критическом загрязнении воздуха выхлопными газами и тяжелыми металлами.",
      "О недостатке солнечной радиации под пологом леса.",
      "О наличии заражения леса грибковыми паразитами."
    ],
    correctIndex: 0,
    explanation: "Верно! Кустистые лишайники являются наиболее чувствительными биоиндикаторами: они погибают при малейших концентрациях SO2 и кислотных осадках."
  },
  {
    id: 5,
    grade: 11,
    gradeLabel: "11 класс (Статистика и t-критерий Стьюдента)",
    title: "Кейс №5: Статистическая достоверность эко-тренда",
    context: "Старшеклассники 11 класса измерили концентрацию растворенного кислорода (O₂) в двух протоках. Группа A получила M₁ = 8.2 мг/л, Группа B получила M₂ = 6.1 мг/л. Рассчитанное значение t-критерия Стьюдента составило t = 3.42 при критическом t_крит = 2.06 (p < 0.05).",
    questionText: "Какой научный вывод должны сделать исследователи на основе расчета t-критерия?",
    options: [
      "Различия между протоками случайны и не имеют научно-статистического значения.",
      "Различия между средними показателями растворенного кислорода статистически достоверны (p < 0.05), протоки отличаются по гидрохимическому режиму.",
      "Эксперимент следует признать ошибочным, так как t > 2.",
      "Необходимо сложить все значения и не проводить вероятностную проверку."
    ],
    correctIndex: 1,
    explanation: "Отлично! Так как t_расчетное (3.42) > t_критическое (2.06), нулевая гипотеза отвергается с вероятностью ошибки менее 5%."
  }
];

export interface DynamicPisaTask {
  id: string;
  competencyType: "analysis" | "explanation" | "planning";
  competencyName: string;
  badgeColor: string;
  stationCode: string;
  stationName: string;
  timeframe: string;
  title: string;
  context: string;
  question: string;
  keyTerms: string[];
  sampleSolution: string;
  parameterName: string;
  paramValue1: string;
  paramValue2: string;
}

const DEFAULT_STATIONS_DATA = [
  { code: "ALX-01", name: "с. Александровка — речной пост" },
  { code: "TBL-01", name: "р. Тобол — створовый забор" },
  { code: "KST-01", name: "Костанай — городская эко-станция" },
  { code: "SOIL-03", name: "Александровский бор — почвенный профиль" },
  { code: "BIO-02", name: "Березовая роща — биостанция" }
];

export function generateRandomPisaTask(customStations?: MonitoringStation[]): DynamicPisaTask {
  const stationList = (customStations && customStations.length > 0)
    ? customStations.map(s => ({ code: s.code, name: s.name }))
    : DEFAULT_STATIONS_DATA;

  const station = stationList[Math.floor(Math.random() * stationList.length)];
  
  const competencies = [
    {
      type: "analysis" as const,
      name: "Анализ и интерпретация данных",
      badgeColor: "bg-blue-600 text-white border-blue-400"
    },
    {
      type: "explanation" as const,
      name: "Научное объяснение явлений",
      badgeColor: "bg-emerald-600 text-white border-emerald-400"
    },
    {
      type: "planning" as const,
      name: "Планирование научного эксперимента",
      badgeColor: "bg-purple-600 text-white border-purple-400"
    }
  ];

  const competency = competencies[Math.floor(Math.random() * competencies.length)];

  const timeframes = [
    "с мая по август 2025 года",
    "в период весеннего паводка 2026 года",
    "за пятилетний цикл наблюдений (2021–2026 гг.)",
    "во время аномальной летней межени 2025 года"
  ];
  const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];

  const parameterTemplates = [
    {
      name: "Водородный показатель (pH воды)",
      val1: (7.2 + Math.random() * 0.4).toFixed(1),
      val2: (5.4 + Math.random() * 0.5).toFixed(1),
      unit: "ед. pH",
      category: "гидрохимия",
      terms: ["закисление", "pH", "гумусовые кислоты", "органика", "фотосинтез", "буферность"]
    },
    {
      name: "Прозрачность воды по диску Секки",
      val1: (75 + Math.floor(Math.random() * 20)).toString(),
      val2: (15 + Math.floor(Math.random() * 15)).toString(),
      unit: "см",
      category: "оптическая гидрология",
      terms: ["взвесь", "паводок", "мутность", "диск Секки", "смыв", "коллизия"]
    },
    {
      name: "Плотность почвенного горизонта",
      val1: (1.12 + Math.random() * 0.05).toFixed(2),
      val2: (1.48 + Math.random() * 0.08).toFixed(2),
      unit: "г/см³",
      category: "почвоведение",
      terms: ["уплотнение", "аэрация", "капиллярность", "вытаптывание", "структура", "пористость"]
    },
    {
      name: "Концентрация растворенного углекислого газа (CO₂)",
      val1: (410 + Math.floor(Math.random() * 15)).toString(),
      val2: (530 + Math.floor(Math.random() * 40)).toString(),
      unit: "ppm",
      category: "атмосферная химия",
      terms: ["CO2", "эмиссия", "дыхание почвы", "фотосинтез", "температура", "антропоген"]
    },
    {
      name: "Индекс рекреационной нагрузки (вытаптывание и мусор)",
      val1: "1.5 из 5 (низкая)",
      val2: "4.2 из 5 (высокая)",
      unit: "баллов",
      category: "антропогенный мониторинг",
      terms: ["антропогенная нагрузка", "рекреация", "деградация", "тропы", "мусор", "устойчивость"]
    }
  ];

  const param = parameterTemplates[Math.floor(Math.random() * parameterTemplates.length)];

  let title = "";
  let context = "";
  let question = "";
  let sampleSolution = "";

  if (competency.type === "analysis") {
    title = `Анализ тренда: ${param.name} на посту ${station.code}`;
    context = `Экспедиционная группа школьного клуба «Земляне» провела серию измерений на эко-посту ${station.name} (${station.code}) ${timeframe}. На начальном этапе показатель «${param.name}» составлял ${param.val1} ${param.val2.includes("из") ? "" : param.unit}, а к концу наблюдаемого периода изменился до ${param.val2} ${param.val2.includes("из") ? "" : param.unit}.`;
    question = `Сформулируйте математическую/экологическую закономерность изменения показателя «${param.name}». Является ли наблюдаемый динамический скачок опасным отклонением от нормы для локальной экосистемы? Обоснуйте ответ.`;
    sampleSolution = `В ходе исследований на станции ${station.code} зафиксировано существенное изменение показателя ${param.name} с ${param.val1} до ${param.val2}. Данное отклонение указывает на интенсификацию экологических процессов (${param.terms.join(", ")}). Изменение носит аномальный характер и требует сопоставления с метеоданными и уровнем антропогенного воздействия.`;
  } else if (competency.type === "explanation") {
    title = `Научное объяснение: Динамика феномена на ${station.code}`;
    context = `При мониторинге поста ${station.name} (${station.code}) зафиксирован явный феномен: ${timeframe} значение «${param.name}» изменилось от первоначальных ${param.val1} до аномальных ${param.val2} ${param.val2.includes("из") ? "" : param.unit}. Исследователи отметили изменения в состоянии биоты и гидрохимического режима.`;
    question = `Предложите развернутое научное объяснение естественных или антропогенных причин, приводящих к такому резкому изменению «${param.name}». Какие природные факторы сыграли определяющую роль?`;
    sampleSolution = `Основной причиной снижения/роста показателя ${param.name} на станции ${station.name} является воздействие совокупности факторов: ${param.terms.slice(0, 4).join(", ")}. При повышении температуры или вытаптывании происходит смещение физико-химического равновесия, что прямо сказывается на параметре.`;
  } else {
    title = `Планирование эксперимента: Пост ${station.code}`;
    context = `На исследовательской локации ${station.name} (${station.code}) обнаружен тренд: ${timeframe} зафиксировано смещение параметра «${param.name}» с ${param.val1} до ${param.val2} ${param.val2.includes("из") ? "" : param.unit}. Для выявления первопричины требуется запустить доказательный эксперимент.`;
    question = `Разработайте план полевого эксперимента или повторного мониторинга. Укажите: 1) контрольные точки; 2) приборы и реактивы; 3) измеряемые сопутствующие параметры; 4) формулировку проверяемой гипотезы.`;
    sampleSolution = `Гипотеза: Смещение ${param.name} вызвано антропогенным стоком / поверхностным смывом. План эксперимента: 1) Обустроить 3 контрольных створа выше и ниже по течению / профилю; 2) Измерять ${param.terms.slice(0, 3).join(", ")}; 3) Периодичность — 2 раза в неделю с использованием сертифицированных приборов.`;
  }

  return {
    id: `dyn-pisa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    competencyType: competency.type,
    competencyName: competency.name,
    badgeColor: competency.badgeColor,
    stationCode: station.code,
    stationName: station.name,
    timeframe,
    title,
    context,
    question,
    keyTerms: param.terms,
    sampleSolution,
    parameterName: param.name,
    paramValue1: param.val1,
    paramValue2: param.val2
  };
}

interface PisaPracticumBlockProps {
  isDark?: boolean;
  stations?: MonitoringStation[];
  records?: MonitoringRecord[];
}

export const PisaPracticumBlock: React.FC<PisaPracticumBlockProps> = ({ 
  isDark = true,
  stations,
  records
}) => {
  const [activeTabMode, setActiveTabMode] = useState<"generator" | "classic">("generator");
  
  // Dynamic Generator State
  const [currentDynamicTask, setCurrentDynamicTask] = useState<DynamicPisaTask>(() => generateRandomPisaTask(stations));
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluationResult, setEvaluationResult] = useState<{
    score: number;
    level: string;
    foundTerms: string[];
    feedback: string;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Classic Quiz State
  const [selectedGrade, setSelectedGrade] = useState<number | "all">("all");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

  const handleGenerateNewTask = () => {
    setCurrentDynamicTask(generateRandomPisaTask(stations));
    setStudentAnswer("");
    setEvaluationResult(null);
  };

  const handleEvaluateStudentAnswer = () => {
    if (!studentAnswer.trim()) return;
    setIsEvaluating(true);

    setTimeout(() => {
      const text = studentAnswer.toLowerCase();
      const terms = currentDynamicTask.keyTerms;
      const foundTerms = terms.filter(t => text.includes(t.toLowerCase()));

      let score = 0;
      if (text.length > 30) score += 2;
      if (text.length > 80) score += 2;
      if (text.length > 180) score += 2;
      score += foundTerms.length * 2;

      let level = "Уровень 1-2 (Базовое понимание)";
      if (score >= 10) level = "Уровень 5-6 (Продвинутый исследователь PISA)";
      else if (score >= 6) level = "Уровень 3-4 (Уверенное научное аргументирование)";

      let feedback = "";
      if (foundTerms.length >= 3) {
        feedback = `Отличный научный ответ! Вы верно задействовали ключевые понятия: ${foundTerms.join(", ")}. Ваша гипотеза структурирована и соответствует международным критериям PISA.`;
      } else if (foundTerms.length >= 1) {
        feedback = `Хорошая попытка! Замечены термины (${foundTerms.join(", ")}). Для получения высшего балла PISA дополните ответ причинно-следственными связями и терминами: ${terms.filter(t => !foundTerms.includes(t)).join(", ")}.`;
      } else {
        feedback = `Ваш ответ принят. Чтобы усилить аргументацию, рекомендуем использовать академические понятия: ${terms.slice(0, 4).join(", ")}.`;
      }

      setEvaluationResult({
        score: Math.min(score, 12),
        level,
        foundTerms,
        feedback
      });
      setIsEvaluating(false);
    }, 600);
  };

  const filteredQuestions = selectedGrade === "all"
    ? PISA_QUESTIONS
    : PISA_QUESTIONS.filter(q => q.grade === selectedGrade);

  const currentQ = filteredQuestions[currentIdx] || filteredQuestions[0];
  const isAnswered = currentQ ? selectedAnswers[currentQ.id] !== undefined : false;

  const handleSelectOption = (optionIndex: number) => {
    if (!currentQ) return;
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: optionIndex }));
  };

  const calculateClassicScore = () => {
    let score = 0;
    filteredQuestions.forEach(q => {
      if (selectedAnswers[q.id] === q.correctIndex) score++;
    });
    return score;
  };

  return (
    <div id="pisa-block-5" className={`p-6 sm:p-8 rounded-3xl border shadow-2xl transition font-sans relative overflow-hidden ${
      isDark 
        ? "bg-gradient-to-br from-[#0c1724] via-[#0d1c16] to-[#07110d] border-indigo-500/70 text-slate-100" 
        : "bg-gradient-to-br from-indigo-50/90 via-sky-50 to-emerald-50 border-indigo-300 text-slate-900"
    }`}>
      {/* Background glow decorative */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Block Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 border-b pb-5 border-indigo-800/40">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shrink-0">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black font-mono px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 uppercase tracking-widest shadow">
                Блок №5
              </span>
              <span className="text-xs text-indigo-400 font-bold uppercase tracking-wider">
                Международный стандарт PISA
              </span>
            </div>
            <h2 className={`text-xl sm:text-2xl font-bold font-serif ${isDark ? "text-indigo-200" : "text-indigo-950"}`}>
              PISA-практикум и ИИ-генератор гипотез
            </h2>
          </div>
        </div>

        {/* Dynamic Mode Switcher Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900/60 p-1.5 rounded-2xl border border-indigo-500/30">
          <button
            onClick={() => setActiveTabMode("generator")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTabMode === "generator"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Shuffle className="w-4 h-4 text-amber-300" />
            <span>🎲 Генератор PISA</span>
          </button>

          <button
            onClick={() => setActiveTabMode("classic")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              activeTabMode === "classic"
                ? "bg-indigo-600 text-white shadow-lg"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 text-emerald-300" />
            <span>📚 Кейсы 7–11 кл.</span>
          </button>
        </div>
      </div>

      {/* DYNAMIC GENERATOR MODE */}
      {activeTabMode === "generator" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Action Header Banner */}
          <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isDark ? "bg-[#0b1824] border-indigo-700/60" : "bg-white border-indigo-200"
          }`}>
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase font-mono tracking-widest text-amber-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Автоматический конструктор задач
              </span>
              <h3 className="text-base sm:text-lg font-bold font-serif">
                Генератор практических заданий по базе данных станций
              </h3>
              <p className="text-xs text-slate-400">
                Создает уникальные исследовательские кейсы PISA с живой подстановкой параметров и локаций
              </p>
            </div>

            <button
              onClick={handleGenerateNewTask}
              className="px-5 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white rounded-xl font-extrabold text-xs shadow-xl transition flex items-center space-x-2 shrink-0 hover:scale-105 active:scale-95 border border-indigo-300/40"
            >
              <Shuffle className="w-4 h-4 text-amber-300 animate-spin-slow" />
              <span>Сгенерировать новое задание</span>
            </button>
          </div>

          {/* Generated Task Card */}
          <div className={`p-6 rounded-2xl border shadow-xl space-y-5 relative ${
            isDark ? "bg-[#0a1722] border-indigo-800" : "bg-white border-indigo-200"
          }`}>
            
            {/* Task Competency Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-900/50 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow ${currentDynamicTask.badgeColor}`}>
                  {currentDynamicTask.competencyName}
                </span>
                <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-mono font-bold">
                  {currentDynamicTask.stationCode}
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {currentDynamicTask.timeframe}
              </span>
            </div>

            {/* Title & Context */}
            <div className="space-y-3">
              <h4 className="text-lg font-bold font-serif text-amber-300 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-amber-400 shrink-0" />
                <span>{currentDynamicTask.title}</span>
              </h4>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-200 bg-slate-900/60 p-4 rounded-xl border border-indigo-900/40">
                {currentDynamicTask.context}
              </p>
            </div>

            {/* Key Variables Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/60 space-y-1">
                <span className="text-indigo-400 font-bold block">Пост наблюдения:</span>
                <span className="text-slate-100 font-bold text-sm">{currentDynamicTask.stationName}</span>
              </div>
              <div className="p-3 bg-indigo-950/60 rounded-xl border border-indigo-800/60 space-y-1">
                <span className="text-amber-400 font-bold block">Изучаемый параметр:</span>
                <span className="text-slate-100 font-bold text-sm">{currentDynamicTask.parameterName}</span>
              </div>
            </div>

            {/* PISA Question Prompt */}
            <div className="p-4 bg-indigo-900/30 rounded-2xl border border-indigo-500/40 space-y-2">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Задание PISA для исследователя:</span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-white leading-relaxed">
                {currentDynamicTask.question}
              </p>
            </div>

            {/* Student Response Input Area */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-indigo-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span>Ваше решение / научная гипотеза:</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Мин. 30 символов для оценки</span>
              </label>

              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Сформулируйте ваш научный вывод, укажите возможные причины изменений или предложите план исследования..."
                rows={4}
                className="w-full p-4 rounded-xl bg-slate-900/90 border border-indigo-700/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed shadow-inner"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <span>Рекомендуемые ключевые термины:</span>
                  <span className="font-mono text-amber-300">{currentDynamicTask.keyTerms.slice(0, 4).join(", ")}</span>
                </div>

                <button
                  onClick={handleEvaluateStudentAnswer}
                  disabled={!studentAnswer.trim() || isEvaluating}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center space-x-2"
                >
                  {isEvaluating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Проверить решение (ИИ-Оценка)</span>
                </button>
              </div>
            </div>

            {/* Evaluation Result Feedback */}
            {evaluationResult && (
              <div className="p-5 rounded-2xl bg-emerald-950/80 border border-emerald-500/80 space-y-3 animate-fade-in shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-800 pb-2">
                  <span className="text-xs font-bold text-amber-300 font-mono flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    <span>Оценка естественнонаучной грамотности:</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-emerald-800 text-emerald-100 font-extrabold text-xs">
                    {evaluationResult.level}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                  {evaluationResult.feedback}
                </p>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-emerald-800/60 space-y-1 text-xs">
                  <span className="font-bold text-amber-400 block">Эталонный вариант рассуждения от методиста:</span>
                  <p className="text-slate-300 italic font-serif leading-relaxed">
                    "{currentDynamicTask.sampleSolution}"
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CLASSIC QUIZ MODE */}
      {activeTabMode === "classic" && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Grade Selector */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 border-b border-indigo-900/40 pb-4">
            <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Класс:
            </span>
            <button
              onClick={() => { setSelectedGrade("all"); setCurrentIdx(0); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                selectedGrade === "all"
                  ? "bg-indigo-600 text-white shadow"
                  : isDark ? "bg-[#132433] text-slate-300 hover:bg-indigo-900/60" : "bg-white text-slate-700 hover:bg-indigo-100"
              }`}
            >
              Все (7–11)
            </button>
            {[7, 8, 9, 10, 11].map(g => (
              <button
                key={g}
                onClick={() => { setSelectedGrade(g); setCurrentIdx(0); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  selectedGrade === g
                    ? "bg-indigo-600 text-white shadow"
                    : isDark ? "bg-[#132433] text-slate-300 hover:bg-indigo-900/60" : "bg-white text-slate-700 hover:bg-indigo-100"
                }`}
              >
                {g} кл.
              </button>
            ))}
          </div>

          {showResults ? (
            <div className="text-center py-8 space-y-6">
              <div className="inline-flex p-4 rounded-full bg-emerald-500/20 text-emerald-400 mb-2 border border-emerald-500/40">
                <Award className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-bold font-serif">Результаты Блока №5</h3>
              <p className="text-lg">
                Вы успешно справились с <span className="font-bold text-amber-400">{calculateClassicScore()}</span> из <span className="font-bold">{filteredQuestions.length}</span> исследовательских кейсов!
              </p>

              <div className={`p-4 rounded-2xl border text-left text-xs sm:text-sm space-y-2 max-w-xl mx-auto ${
                isDark ? "bg-[#0a1824] border-indigo-800" : "bg-white border-indigo-200"
              }`}>
                <p className="font-bold text-indigo-300">Сформированные естественнонаучные компетенции:</p>
                <ul className="list-disc list-inside space-y-1 opacity-90">
                  <li>Научное объяснение явлений в гидросфере и педосфере</li>
                  <li>Применение статистических критериев (t-критерий Стьюдента)</li>
                  <li>Биоиндикационный анализ экосистемных трансформаций</li>
                </ul>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => { setSelectedAnswers({}); setCurrentIdx(0); setShowResults(false); }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow flex items-center space-x-2 text-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Пройти практикум заново</span>
                </button>
              </div>
            </div>
          ) : (
            currentQ && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold font-mono">
                  <span className="px-3 py-1 rounded-lg bg-indigo-900/80 text-amber-300 border border-indigo-600">
                    {currentQ.gradeLabel}
                  </span>
                  <span className="text-indigo-300">
                    Кейс {currentIdx + 1} из {filteredQuestions.length}
                  </span>
                </div>

                <div className="w-full h-2 bg-slate-800/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-400 transition-all duration-300"
                    style={{ width: `${((currentIdx + 1) / filteredQuestions.length) * 100}%` }}
                  />
                </div>

                <div className={`p-5 rounded-2xl border space-y-2 shadow-inner ${
                  isDark ? "bg-[#0b1822] border-indigo-800/80 text-slate-100" : "bg-white border-indigo-200 text-slate-900"
                }`}>
                  <h4 className="font-bold text-sm text-amber-300 flex items-center space-x-2">
                    <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{currentQ.title}</span>
                  </h4>
                  <p className="text-xs sm:text-sm leading-relaxed opacity-95">
                    {currentQ.context}
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm sm:text-base font-bold flex items-start space-x-2">
                    <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{currentQ.questionText}</span>
                  </p>

                  <div className="space-y-2.5">
                    {currentQ.options.map((option, optIdx) => {
                      const isSelected = selectedAnswers[currentQ.id] === optIdx;
                      const isCorrect = currentQ.correctIndex === optIdx;
                      
                      let btnStyle = isDark 
                        ? "bg-[#0c1822] border-indigo-900/80 hover:border-indigo-500 text-slate-200" 
                        : "bg-white border-slate-200 hover:border-indigo-400 text-slate-800";

                      if (isAnswered) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-900/90 border-emerald-500 text-emerald-100 font-bold shadow-lg";
                        } else if (isSelected) {
                          btnStyle = "bg-rose-950/90 border-rose-500 text-rose-200";
                        }
                      }

                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleSelectOption(optIdx)}
                          className={`w-full p-3.5 rounded-2xl border text-left text-xs sm:text-sm transition flex items-center justify-between space-x-3 ${btnStyle}`}
                        >
                          <span className="flex-1">{option}</span>
                          {isAnswered && isCorrect && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />}
                          {isAnswered && isSelected && !isCorrect && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isAnswered && (
                  <div className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed animate-fade-in ${
                    selectedAnswers[currentQ.id] === currentQ.correctIndex
                      ? "bg-emerald-950/90 border-emerald-500 text-emerald-200"
                      : "bg-amber-950/90 border-amber-500 text-amber-200"
                  }`}>
                    <p className="font-bold mb-1 flex items-center space-x-1">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Методический разбор задания PISA:</span>
                    </p>
                    <p>{currentQ.explanation}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-indigo-800/40">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 rounded-xl text-xs font-bold transition"
                  >
                    ← Предыдущий кейс
                  </button>

                  {currentIdx < filteredQuestions.length - 1 ? (
                    <button
                      disabled={!isAnswered}
                      onClick={() => setCurrentIdx(prev => prev + 1)}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 rounded-xl text-xs font-bold shadow-lg transition"
                    >
                      Следующий кейс →
                    </button>
                  ) : (
                    <button
                      disabled={!isAnswered}
                      onClick={() => setShowResults(true)}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 rounded-xl text-xs font-bold shadow-lg transition"
                    >
                      Завершить практикум 🎉
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};
