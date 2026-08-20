import React from "react";
import logoSrc from "../assets/images/logotip.gif";
import { 
  ArrowLeft, 
  Compass, 
  Sparkles, 
  Heart, 
  Globe, 
  Trees, 
  ShieldCheck, 
  Layers, 
  Activity, 
  Sun, 
  BookOpen, 
  Award,
  Users
} from "lucide-react";

interface ClubSymbolismViewProps {
  onBackToMain: () => void;
  isDark?: boolean;
}

export const ClubSymbolismView: React.FC<ClubSymbolismViewProps> = ({
  onBackToMain,
  isDark = true,
}) => {
  const elements = [
    {
      id: "human",
      title: "ЧЕЛОВЕК",
      subtitle: "Центр осознанности и действия",
      desc: "Человек как неотъемлемая часть природы. Личная ответственность каждого исследователя за сохранение окружающей среды, чистоту рек и берегов.",
      icon: <Users className="w-6 h-6 text-amber-400" />,
      color: "from-amber-500/20 to-amber-600/10 border-amber-500/50 text-amber-300"
    },
    {
      id: "planet",
      title: "ГОЛОВА (НАША ПЛАНЕТА)",
      subtitle: "Планетарное мышление и наш общий дом",
      desc: "Дом, в котором мы живем. Формирование экологического мышления, бережное отношение к ресурсам Земли и понимание хрупкости природных экосистем.",
      icon: <Globe className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-teal-600/10 border-emerald-500/50 text-emerald-300"
    },
    {
      id: "spiral",
      title: "СПИРАЛЬ",
      subtitle: "Символ жизни и непрерывного развития",
      desc: "Одна из самых древних сакральных форм в природе. Символизирует непрерывный цикл жизни, эволюцию, постоянное обучение, научный поиск и рост нашего сообщества.",
      icon: <Activity className="w-6 h-6 text-teal-400" />,
      color: "from-teal-500/20 to-cyan-600/10 border-teal-500/50 text-teal-300"
    },
    {
      id: "seven-rays",
      title: "СЕМЬ ЛУЧЕЙ",
      subtitle: "Универсальный код гармонии",
      desc: "Универсальный код Вселенной — символ процветания, мудрости, преемственности поколений и вечности природного бытия.",
      icon: <Sun className="w-6 h-6 text-amber-400" />,
      color: "from-amber-400/20 to-orange-500/10 border-amber-400/50 text-amber-300"
    },
    {
      id: "tree-of-life",
      title: "ГЛАВНЫЙ ЛУЧ «ДРЕВО ЖИЗНИ»",
      subtitle: "Школьное научное сообщество",
      desc: "Символ команды «Землян» — живое школьное сообщество юных исследователей и педагогов-наставников, которое растет, обновляется и развивается из года в год.",
      icon: <Trees className="w-6 h-6 text-emerald-400" />,
      color: "from-emerald-500/20 to-green-600/10 border-emerald-400/50 text-emerald-300"
    },
    {
      id: "hands-up",
      title: "РУКИ ПОДНЯТЫ ВВЕРХ",
      subtitle: "Открытость миру и готовность к действию",
      desc: "Мы открыты к новым знаниям, полевым открытиям, готовы действовать, сохранять природу родного края и делиться опытом с исследователями всего Казахстана.",
      icon: <Sparkles className="w-6 h-6 text-sky-400" />,
      color: "from-sky-500/20 to-blue-600/10 border-sky-500/50 text-sky-300"
    }
  ];

  const adalAzamatDirections = [
    { 
      num: 1, 
      name: "Независимость и патриотизм", 
      desc: "Забота о природе родного края как основа любви к Казахстану, изучение и сохранение уникальных экосистем нашей страны." 
    },
    { 
      num: 2, 
      name: "Единство и солидарность", 
      desc: "Сплоченная командная работа, взаимопомощь и ответственность участников за общий результат экологических инициатив." 
    },
    { 
      num: 3, 
      name: "Справедливость и ответственность", 
      desc: "Объективность и честность перед фактами при экомониторинге, бережное и разумное использование природных ресурсов на благо общества." 
    },
    { 
      num: 4, 
      name: "Закон и порядок", 
      desc: "Строгое соблюдение правил безопасности в полевых условиях, следование природоохранным нормам, экологической этике; честность научных данных и академическая добропорядочность замеров." 
    },
    { 
      num: 5, 
      name: "Трудолюбие и профессионализм", 
      desc: "Культура созидательного труда через практические эко-проекты, дисциплина и качество при сборе полевых данных и исследовательской работе." 
    },
    { 
      num: 6, 
      name: "Созидание и новаторство", 
      desc: "Применение научного подхода, современных цифровых инструментов и датчиков для изучения окружающей среды, генерация и реализация экологических идей." 
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Action Header Bar */}
      <div className={`p-4 sm:p-6 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-md ${
        isDark ? "bg-[#0f1d18]/90 border-emerald-800/60" : "bg-white border-emerald-300"
      }`}>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={onBackToMain}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-lg transition flex items-center space-x-2 border border-emerald-400/40 shrink-0 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>На главную</span>
          </button>
          <div>
            <h2 className={`text-lg sm:text-xl font-bold font-serif ${isDark ? "text-white" : "text-emerald-950"}`}>
              Символика и философия эко-клуба «Земляне»
            </h2>
            <p className={`text-xs ${isDark ? "text-emerald-300/80" : "text-emerald-800"}`}>
              Эмблема долговременных экологических исследований школьного сообщества
            </p>
          </div>
        </div>

        <button
          onClick={onBackToMain}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
            isDark 
              ? "bg-[#13261f] border-emerald-700 text-emerald-300 hover:bg-emerald-900" 
              : "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
          }`}
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Перейти к разделам исследований</span>
        </button>
      </div>

      {/* Main Emblem Hero Presentation */}
      <div className={`p-6 sm:p-10 rounded-3xl border shadow-2xl relative overflow-hidden ${
        isDark 
          ? "bg-gradient-to-br from-[#0c1813] via-[#10251c] to-[#0a1510] border-emerald-700/60 text-slate-100" 
          : "bg-gradient-to-br from-emerald-50 via-white to-teal-50 border-emerald-300 text-slate-900"
      }`}>
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 lg:gap-12">
          
          {/* Animated Emblem Representation */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative p-3">
              <img
                src={logoSrc}
                alt="Эмблема эко-клуба Земляне"
                referrerPolicy="no-referrer"
                className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-[0_15px_35px_rgba(16,185,129,0.3)] transition-transform duration-300 hover:scale-105"
              />
            </div>
            <span className="mt-2 px-3 py-1 bg-emerald-900/80 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold rounded-full">
              Эмблема эко-клуба «Земляне»
            </span>
          </div>

          {/* Core Description Text */}
          <div className="space-y-4 max-w-2xl text-center md:text-left">
            <h3 className={`text-2xl sm:text-3xl lg:text-4xl font-extrabold font-serif leading-tight ${
              isDark ? "text-white" : "text-emerald-950"
            }`}>
              Смысловой код и ценности команды «Земляне»
            </h3>

            <p className={`text-sm sm:text-base leading-relaxed ${
              isDark ? "text-emerald-100/90" : "text-slate-700"
            }`}>
              Эмблема клуба «Земляне» объединяет в себе образы Человека, Планеты и Древа Жизни. Это наглядное воплощение нашей главной идеи: каждый школьник — это осознанный гражданин, ответственный за сохранение чистой воды, плодородной почвы и биоразнообразия родного края.
            </p>

            <div className="pt-2 flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={onBackToMain}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center space-x-2 border border-emerald-400/50 hover:scale-105"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Вернуться на главную страницу</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Six Semantic Elements Grid */}
      <div className="space-y-4">
        <h3 className={`text-xl font-bold font-serif flex items-center space-x-2 ${
          isDark ? "text-white" : "text-emerald-950"
        }`}>
          <Layers className="w-5 h-5 text-emerald-400" />
          <span>Ключевые элементы эмблемы</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {elements.map((el) => (
            <div
              key={el.id}
              className={`p-5 rounded-3xl border transition duration-200 flex flex-col justify-between space-y-3 bg-gradient-to-br ${el.color} ${
                isDark ? "bg-[#0e1e17]/90" : "bg-white"
              } shadow-lg hover:shadow-xl hover:scale-[1.02]`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-2xl border ${
                  isDark ? "bg-[#132820] border-emerald-700" : "bg-emerald-50 border-emerald-200"
                }`}>
                  {el.icon}
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base font-serif tracking-wide">
                    {el.title}
                  </h4>
                  <p className="text-[11px] font-mono opacity-80">
                    {el.subtitle}
                  </p>
                </div>
              </div>

              <p className={`text-xs sm:text-sm leading-relaxed ${
                isDark ? "text-slate-200" : "text-slate-700"
              }`}>
                {el.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Six Rays & «Адал азамат» Section */}
      <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
        isDark ? "bg-[#0e1c17] border-emerald-800/70" : "bg-white border-emerald-200"
      }`}>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-2xl text-amber-400">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <h3 className={`text-xl font-bold font-serif ${isDark ? "text-white" : "text-emerald-950"}`}>
              Шесть лучей и концепция «Адал азамат»
            </h3>
            <p className={`text-xs mt-0.5 ${isDark ? "text-emerald-300/80" : "text-emerald-700"}`}>
              Шесть лучей эмблемы созвучны с базовыми ценностями воспитания и исследовательской этикой
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {adalAzamatDirections.map((dir) => (
            <div
              key={dir.num}
              className={`p-4 rounded-2xl border flex items-start space-x-3.5 ${
                isDark 
                  ? "bg-[#13261f] border-emerald-800/60 text-slate-200" 
                  : "bg-emerald-50/70 border-emerald-200 text-slate-800"
              }`}
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow">
                {dir.num}
              </div>
              <div className="space-y-1">
                <h5 className="font-bold text-xs sm:text-sm text-emerald-400 dark:text-emerald-300 font-serif">
                  {dir.name}
                </h5>
                <p className="text-[11px] sm:text-xs opacity-90 leading-relaxed">
                  {dir.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action Footer with «На главную» */}
      <div className={`p-6 rounded-3xl border shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
        isDark ? "bg-[#0b1612] border-emerald-800/60" : "bg-emerald-100/60 border-emerald-300"
      }`}>
        <div>
          <h4 className={`text-base font-bold font-serif ${isDark ? "text-white" : "text-emerald-950"}`}>
            Готовы исследовать данные эко-мониторинга?
          </h4>
          <p className={`text-xs mt-0.5 ${isDark ? "text-emerald-200/80" : "text-emerald-800"}`}>
            Перейдите к интерактивным картам, полевому журналу замеров и аналитическому модулю.
          </p>
        </div>

        <button
          onClick={onBackToMain}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-sm shadow-xl transition flex items-center space-x-2 border border-emerald-400/40 hover:scale-105 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>На главную</span>
        </button>
      </div>

    </div>
  );
};
