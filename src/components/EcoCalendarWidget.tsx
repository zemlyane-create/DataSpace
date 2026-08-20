import React, { useState, useEffect } from "react";
import { ECO_CALENDAR_EVENTS, EcoDateEvent } from "../data/ecoCalendarData";
import { 
  Plus, 
  X, 
  Loader2, 
  Check, 
  Database,
  CalendarDays,
  Trash2,
  List,
  AlertCircle,
  AlertTriangle
} from "lucide-react";
import { 
  fetchCalendarEvents, 
  saveCalendarEventToSupabase, 
  deleteCalendarEventFromSupabase,
  SupabaseEvent 
} from "../lib/supabase";

interface EcoCalendarWidgetProps {
  isDark?: boolean;
  canEditCalendar?: boolean;
}

export function formatSupabaseEventToEcoDateEvent(evt: SupabaseEvent): EcoDateEvent {
  const parts = evt.event_date.split('-');
  const year = parseInt(parts[0], 10) || new Date().getFullYear();
  const month = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
  const day = parseInt(parts[2], 10) || new Date().getDate();

  const monthNames = [
    "января", "февраля", "марта", "апреля", "мая", "июня",
    "июля", "августа", "сентября", "октября", "ноября", "декабря"
  ];

  return {
    id: evt.id,
    day,
    month,
    year,
    monthName: monthNames[month - 1] || "месяца",
    title: evt.title,
    description: evt.description || "Полевое экспедиционное мероприятие / эко-событие",
    isCustom: true
  };
}

const MONTH_NAMES_RU = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];

const WEEKDAY_NAMES_RU = [
  "Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"
];

const WEEKDAY_HEADERS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

// Dynamic Seasonal Paper Color Mapping
function getSeasonData(month: number) {
  // Winter (12, 1, 2) - rgb(236, 242, 246)
  if (month === 12 || month === 1 || month === 2) {
    return {
      season: "winter",
      name: "Зима",
      bgRgb: "rgb(236, 242, 246)",
      borderColor: "#b6cad8",
      dotColor: "#cbdce6",
      innerBg: "rgba(221, 233, 240, 0.75)",
      gridBg: "rgba(221, 233, 240, 0.95)",
      tearLineColor: "#a3bdd0"
    };
  }
  // Spring (3, 4, 5) - rgb(250, 238, 242)
  if (month >= 3 && month <= 5) {
    return {
      season: "spring",
      name: "Весна",
      bgRgb: "rgb(250, 238, 242)",
      borderColor: "#dec0ca",
      dotColor: "#edd4dc",
      innerBg: "rgba(242, 225, 231, 0.75)",
      gridBg: "rgba(242, 225, 231, 0.95)",
      tearLineColor: "#cca7b3"
    };
  }
  // Summer (6, 7, 8) - rgb(236, 245, 239)
  if (month >= 6 && month <= 8) {
    return {
      season: "summer",
      name: "Лето",
      bgRgb: "rgb(236, 245, 239)",
      borderColor: "#b5cebd",
      dotColor: "#cbe0d2",
      innerBg: "rgba(221, 237, 227, 0.75)",
      gridBg: "rgba(221, 237, 227, 0.95)",
      tearLineColor: "#9ebfa9"
    };
  }
  // Autumn (9, 10, 11) - rgb(250, 242, 233)
  return {
    season: "autumn",
    name: "Осень",
    bgRgb: "rgb(250, 242, 233)",
    borderColor: "#d9c4ab",
    dotColor: "#eadbcc",
    innerBg: "rgba(240, 229, 216, 0.75)",
    gridBg: "rgba(240, 229, 216, 0.95)",
    tearLineColor: "#c4ab8e"
  };
}

export const EcoCalendarWidget: React.FC<EcoCalendarWidgetProps> = ({ 
  isDark = true,
  canEditCalendar = false 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [customEvents, setCustomEvents] = useState<EcoDateEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState<boolean>(false);

  // Modal State for adding new event
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isListModalOpen, setIsListModalOpen] = useState<boolean>(false);
  const [eventToDelete, setEventToDelete] = useState<EcoDateEvent | null>(null);
  const [newEventTitle, setNewEventTitle] = useState<string>("");
  const [newEventDate, setNewEventDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [newEventDesc, setNewEventDesc] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saveStatusMsg, setSaveStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Load events from Supabase / LocalStorage
  useEffect(() => {
    async function loadEvents() {
      setIsLoadingEvents(true);
      try {
        const events = await fetchCalendarEvents();
        const formatted = events.map(formatSupabaseEventToEcoDateEvent);
        setCustomEvents(formatted);
      } catch (e) {
        console.warn("Could not load events:", e);
      } finally {
        setIsLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  const allEvents = [...customEvents, ...ECO_CALENDAR_EVENTS];

  const currentDay = selectedDate.getDate();
  const currentMonth = selectedDate.getMonth() + 1; // 1-12
  const currentYear = selectedDate.getFullYear();

  // Dynamic Seasonal Styling
  const seasonData = getSeasonData(currentMonth);

  // Find event for selectedDate
  const todayEvent = allEvents.find(e => {
    if (e.year) {
      return e.day === currentDay && e.month === currentMonth && e.year === currentYear;
    }
    return e.day === currentDay && e.month === currentMonth;
  }) || null;

  // Day of week capitalized (e.g. "Пятница")
  const dayOfWeekIndex = selectedDate.getDay(); // 0 is Sunday
  const dayOfWeekName = WEEKDAY_NAMES_RU[dayOfWeekIndex] || "Пятница";

  // Formatted date string in "14.08.2026" format
  const padZero = (n: number) => n.toString().padStart(2, '0');
  const formattedDateDigits = `${padZero(currentDay)}.${padZero(currentMonth)}.${currentYear}`;

  // Mini calendar grid generation for selectedDate's month and year
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1);
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  
  // Starting day index for Monday-first week (0 = Monday, 6 = Sunday)
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  // Build array of days with flags for event presence
  const calendarCells = [];
  for (let i = 0; i < startOffset; i++) {
    calendarCells.push(null);
  }
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const hasEvent = allEvents.some(e => {
      if (e.year) {
        return e.day === dayNum && e.month === currentMonth && e.year === currentYear;
      }
      return e.day === dayNum && e.month === currentMonth;
    });
    calendarCells.push({ dayNum, hasEvent, isSelected: dayNum === currentDay });
  }

  // Handle Save Event
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCalendar) return;
    if (!newEventTitle.trim() || !newEventDate) return;

    setIsSubmitting(true);
    setSaveStatusMsg(null);

    try {
      const result = await saveCalendarEventToSupabase(
        newEventTitle.trim(),
        newEventDate,
        newEventDesc.trim()
      );

      const formattedNewEvt = formatSupabaseEventToEcoDateEvent(result.event);
      setCustomEvents(prev => [formattedNewEvt, ...prev]);

      const eventDateObj = new Date(newEventDate + "T00:00:00");
      setSelectedDate(eventDateObj);

      setNewEventTitle("");
      setNewEventDesc("");
      setIsAddModalOpen(false);

      setSaveStatusMsg({
        text: result.source === "supabase" 
          ? "Событие сохранено в базе данных Supabase!" 
          : "Событие сохранено в календаре!"
      });
      setTimeout(() => setSaveStatusMsg(null), 4000);
    } catch (err) {
      console.error("Save event error:", err);
      setSaveStatusMsg({ text: "Ошибка при сохранении события", isError: true });
      setTimeout(() => setSaveStatusMsg(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestDelete = (evt: EcoDateEvent) => {
    if (!canEditCalendar) return;
    setEventToDelete(evt);
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    const targetId = eventToDelete.id;
    const targetTitle = eventToDelete.title;
    const targetDateStr = eventToDelete.year && eventToDelete.month && eventToDelete.day
      ? `${eventToDelete.year}-${String(eventToDelete.month).padStart(2, '0')}-${String(eventToDelete.day).padStart(2, '0')}`
      : undefined;

    setDeletingId(targetId || targetTitle);
    try {
      const res = await deleteCalendarEventFromSupabase(targetId || '', {
        title: targetTitle,
        event_date: targetDateStr
      });

      setCustomEvents(prev => prev.filter(e => {
        if (targetId && e.id && e.id === targetId) return false;
        if (e.title === targetTitle && e.day === eventToDelete.day && e.month === eventToDelete.month && e.year === eventToDelete.year) return false;
        return true;
      }));

      setEventToDelete(null);

      if (res.success) {
        setSaveStatusMsg({ text: "Событие успешно удалено из календаря и Supabase!" });
      } else {
        setSaveStatusMsg({ 
          text: `Событие удалено локально. (Ответ базы: ${res.error || 'проверьте права RLS DELETE в Supabase'})`,
          isError: true 
        });
      }
      setTimeout(() => setSaveStatusMsg(null), 4500);
    } catch (err: any) {
      console.error("Delete event error:", err);
      setSaveStatusMsg({ text: "Ошибка при удалении события", isError: true });
      setTimeout(() => setSaveStatusMsg(null), 4000);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="w-full font-sans my-0 h-full flex flex-col">
      
      {/* Outer Vintage Tear-off Calendar Frame */}
      <div className="relative mx-auto max-w-5xl w-full h-full flex flex-col justify-between">
        
        {/* Realistic Top Spiral Binding / Пружинное крепление настенного календаря */}
        <div className="relative z-20 flex justify-between items-center px-6 sm:px-12 -mb-3 sm:-mb-4 pointer-events-none shrink-0">
          {[...Array(14)].map((_, idx) => (
            <div key={idx} className="flex flex-col items-center">
              {/* Spiral Wire Ring / Металлическая спираль с градиентом и отблеском */}
              <div className="w-3 sm:w-4 h-7 sm:h-9 rounded-full bg-gradient-to-r from-stone-500 via-stone-200 to-stone-700 shadow-md border border-stone-800/60 transform -rotate-6" />
              {/* Perforation Punch Hole in Paper / Круглое отверстие перфорации */}
              <div className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 rounded-full bg-[#1b1510] shadow-inner -mt-2 border border-black/40" />
            </div>
          ))}
        </div>

        {/* Vintage Paper Sheet with Dynamic Seasonal Background */}
        <div 
          className="relative z-10 rounded-2xl sm:rounded-3xl border-2 pt-7 sm:pt-9 pb-5 sm:pb-6 px-5 sm:px-8 text-[#2b241d] shadow-[0_15px_35px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-500 flex-1 flex flex-col justify-between"
          style={{
            backgroundColor: seasonData.bgRgb,
            borderColor: seasonData.borderColor,
            backgroundImage: `
              radial-gradient(${seasonData.dotColor} 1.2px, transparent 1.2px)
            `,
            backgroundSize: "22px 22px",
          }}
        >
          {/* Perforated Top Tear-line Texture / Имитация линии отрыва */}
          <div 
            className="absolute top-5 left-4 right-4 border-b border-dashed pointer-events-none" 
            style={{ borderColor: seasonData.tearLineColor }}
          />

          {/* Top Row: Left (Day of Week + Date in RED) | Right (Add Event Button) */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4 shrink-0"
            style={{ borderColor: seasonData.borderColor }}
          >
            
            {/* Upper-Left Corner: Day of week & current date in RED */}
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold font-serif text-[#382d22] tracking-tight capitalize">
                {dayOfWeekName}
              </h2>
              <div className="flex items-center space-x-2 mt-0.5">
                <span 
                  className="text-base sm:text-lg font-bold font-mono"
                  style={{ color: "#b71018" }}
                >
                  {formattedDateDigits}
                </span>
                {isLoadingEvents && (
                  <Loader2 className="w-3.5 h-3.5 text-[#8c745b] animate-spin" />
                )}
                {saveStatusMsg && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 animate-fadeIn ${
                    saveStatusMsg.isError 
                      ? 'text-red-800 bg-red-100/90 border border-red-200' 
                      : 'text-emerald-800 bg-emerald-100/90 border border-emerald-200'
                  }`}>
                    {saveStatusMsg.isError ? (
                      <AlertCircle className="w-3 h-3 text-red-600 shrink-0" />
                    ) : (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    )}
                    <span>{saveStatusMsg.text}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Upper-Right Corner: Action Buttons for Editing & Managing */}
            {canEditCalendar && (
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsListModalOpen(true)}
                  className="px-3 py-1.5 bg-[#e6dac2] hover:bg-[#d8c8ad] text-[#524131] text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 border border-[#cbbb9f] active:scale-95 cursor-pointer"
                  title="Посмотреть список всех добавленных экспедиций и управлять ими"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>События ({customEvents.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewEventDate(selectedDate.toISOString().split("T")[0]);
                    setIsAddModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-[#4f6f52] hover:bg-[#3d593f] text-[#fbf8f2] text-xs font-bold rounded-xl shadow-sm hover:shadow transition flex items-center space-x-1.5 border border-[#3d593f] active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Добавить событие</span>
                </button>
              </div>
            )}
          </div>

          {/* Main Body: Left (Quote in Black / Event Card) & Right (Large Calendar Grid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-stretch flex-1">
            
            {/* Left Area (lg:col-span-6): Compact Quote (in Black) or Event Card */}
            <div 
              className="lg:col-span-6 flex flex-col justify-center min-h-[140px] p-3.5 sm:p-4 rounded-2xl border-0 shadow-inner relative"
              style={{ backgroundColor: seasonData.innerBg }}
            >
              
              {todayEvent ? (
                <div className="space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span 
                        className="px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider text-white shadow-sm"
                        style={{ backgroundColor: "#d07e8d" }}
                      >
                        {todayEvent.isCustom ? "Экспедиционное событие" : "Экологическая дата"}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#6c5944]">
                        {todayEvent.day} {todayEvent.monthName} {todayEvent.year || ""}
                      </span>
                    </div>

                    {todayEvent.isCustom && canEditCalendar && (
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(todayEvent)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/80 rounded-xl transition text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title="Удалить это экспедиционное событие"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        <span className="text-[11px]">Удалить</span>
                      </button>
                    )}
                  </div>

                  <h3 
                    className="text-base sm:text-lg font-bold font-serif leading-snug"
                    style={{ color: "#b71018" }}
                  >
                    {todayEvent.title}
                  </h3>

                  <p className="text-xs text-[#2b241d] leading-relaxed">
                    {todayEvent.description}
                  </p>

                  {todayEvent.isCustom && (
                    <div className="pt-1 text-[10px] text-[#6c5944] font-medium flex items-center space-x-1">
                      <Database className="w-3 h-3 text-[#4f6f52]" />
                      <span>Зафиксировано в исследовательской базе (Supabase)</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty state: Vintage Einstein Quote strictly in Black color */
                <div className="flex flex-col justify-center items-center text-center p-2 sm:p-3 my-auto w-full">
                  <p 
                    className="italic font-serif leading-relaxed text-center"
                    style={{ color: "#000000", fontSize: "16.125px" }}
                  >
                    „Наблюдай внимательно за природой, и ты будешь все понимать намного лучше.“
                  </p>
                  <div className="w-full flex justify-end mt-2">
                    <p 
                      className="font-bold tracking-wide text-right"
                      style={{ color: "#000000", fontSize: "11px", lineHeight: "15.7143px" }}
                    >
                      — А. Эйнштейн
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Right Area (lg:col-span-6): Expanded Large Calendar Grid (Mon to Sun) */}
            <div 
              className="lg:col-span-6 flex flex-col justify-between p-4 sm:p-5 rounded-2xl shadow-sm min-w-0"
              style={{ 
                backgroundColor: seasonData.gridBg,
                border: `1px solid ${seasonData.borderColor}`
              }}
            >
              
              {/* Month Name in RED (without year) */}
              <div 
                className="flex items-center justify-between border-b pb-2 mb-2.5"
                style={{ borderColor: seasonData.borderColor }}
              >
                <span 
                  className="font-serif font-extrabold text-base sm:text-lg uppercase tracking-wider"
                  style={{ color: "#b71018" }}
                >
                  {MONTH_NAMES_RU[currentMonth - 1]}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date())}
                  className="text-[11px] font-bold text-[#6c5944] hover:text-[#382d22] underline cursor-pointer"
                >
                  Сегодня
                </button>
              </div>

              {/* Day Headers: 7 columns (Пн, Вт, Ср, Чт, Пт, Сб, Вс) */}
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-[#705e49] mb-1.5">
                {WEEKDAY_HEADERS.map((h, i) => (
                  <div key={i} className={`py-0.5 ${i >= 5 ? "text-[#b25768]" : ""}`}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Day Cells 7-Column Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center">
                {calendarCells.map((cell, idx) => {
                  if (!cell) {
                    return <div key={`empty-${idx}`} className="h-7 sm:h-8 w-full" />;
                  }

                  const { dayNum, hasEvent, isSelected } = cell;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      type="button"
                      onClick={() => {
                        setSelectedDate(new Date(currentYear, currentMonth - 1, dayNum));
                      }}
                      className={`h-7 sm:h-8 w-full max-w-[36px] mx-auto rounded-lg flex items-center justify-center font-mono text-xs sm:text-sm font-bold transition-all relative ${
                        isSelected 
                          ? "text-white shadow-md ring-2 ring-[#b71018]"
                          : "hover:bg-black/10 text-[#3d3226]"
                      }`}
                      style={{
                        backgroundColor: isSelected ? "#b71018" : (hasEvent ? "#d07e8d" : undefined),
                        color: isSelected || hasEvent ? "#ffffff" : undefined,
                      }}
                      title={`${dayNum} ${MONTH_NAMES_RU[currentMonth - 1]} ${hasEvent ? "(Есть событие)" : ""}`}
                    >
                      <span>{dayNum}</span>
                      {hasEvent && isSelected && (
                        <span 
                          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border border-white"
                          style={{ backgroundColor: "#d07e8d" }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

          </div>

        </div>

      </div>

      {/* Modal for Adding Custom Eco-Event */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="w-full max-w-md p-6 rounded-3xl border shadow-2xl relative bg-[#f7f1e5] border-[#d6c7af] text-[#2b241d]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dfcfb5]">
              <div className="flex items-center space-x-2 text-[#4f6f52]">
                <CalendarDays className="w-5 h-5" />
                <h3 className="text-lg font-bold font-serif text-[#382d22]">
                  Новое событие в календаре
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#e6dac2] text-[#6c5944] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-[#524131]">
                  Дата события *
                </label>
                <input
                  type="date"
                  required
                  value={newEventDate}
                  onChange={e => setNewEventDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbbb9f] bg-[#fffcf5] text-[#2b241d] font-mono focus:outline-none focus:ring-2 focus:ring-[#4f6f52]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-[#524131]">
                  Название события / мероприятия *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Экспедиция на р. Тобол [TBL-01]"
                  value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbbb9f] bg-[#fffcf5] text-[#2b241d] focus:outline-none focus:ring-2 focus:ring-[#4f6f52] placeholder-[#a69680]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-[#524131]">
                  Описание или задачи замеров
                </label>
                <textarea
                  rows={3}
                  placeholder="Укажите детали исследования, состав группы или цели..."
                  value={newEventDesc}
                  onChange={e => setNewEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#cbbb9f] bg-[#fffcf5] text-[#2b241d] resize-none focus:outline-none focus:ring-2 focus:ring-[#4f6f52] placeholder-[#a69680]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end space-x-3 border-t border-[#dfcfb5]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-[#e6dac2] hover:bg-[#d8c8ad] text-[#524131] transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newEventTitle.trim()}
                  className="px-5 py-2.5 text-xs font-bold bg-[#4f6f52] hover:bg-[#3d593f] text-[#fbf8f2] rounded-xl shadow transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Сохранить</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Managing Custom Expedition Events / Удаление и просмотр списка */}
      {isListModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsListModalOpen(false)}
        >
          <div 
            className="w-full max-w-xl max-h-[85vh] flex flex-col p-6 rounded-3xl border shadow-2xl relative bg-[#f7f1e5] border-[#d6c7af] text-[#2b241d]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#dfcfb5] shrink-0">
              <div className="flex items-center space-x-2 text-[#4f6f52]">
                <List className="w-5 h-5" />
                <div>
                  <h3 className="text-lg font-bold font-serif text-[#382d22]">
                    Экспедиционные события календаря
                  </h3>
                  <p className="text-[11px] text-[#6c5944]">
                    Управление и модерация записей календаря ({customEvents.length})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsListModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-[#e6dac2] text-[#6c5944] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List Body */}
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {customEvents.length === 0 ? (
                <div className="text-center py-10 px-4 text-[#6c5944]">
                  <CalendarDays className="w-10 h-10 mx-auto mb-2 opacity-40 text-[#4f6f52]" />
                  <p className="font-bold text-sm">Пока нет созданных экспедиционных событий</p>
                  <p className="text-xs mt-1 opacity-80">
                    Нажмите «Добавить событие», чтобы зафиксировать экспедицию или дату замеров.
                  </p>
                </div>
              ) : (
                customEvents.map((evt) => {
                  const isDel = deletingId === evt.id;
                  return (
                    <div 
                      key={evt.id || `${evt.day}-${evt.month}-${evt.title}`}
                      className="p-3.5 rounded-2xl bg-[#fffcf5] border border-[#dfcfb5] hover:border-[#4f6f52]/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white bg-[#d07e8d]">
                            {evt.day} {evt.monthName} {evt.year || ""}
                          </span>
                          <span className="text-[10px] text-[#6c5944] flex items-center gap-1 font-mono">
                            <Database className="w-2.5 h-2.5 text-[#4f6f52]" />
                            <span>Supabase</span>
                          </span>
                        </div>
                        <h4 className="font-bold text-sm text-[#382d22] truncate">
                          {evt.title}
                        </h4>
                        {evt.description && (
                          <p className="text-xs text-[#5a4836] line-clamp-2 leading-relaxed">
                            {evt.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (evt.year && evt.month && evt.day) {
                              setSelectedDate(new Date(evt.year, evt.month - 1, evt.day));
                            }
                            setIsListModalOpen(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-[#e6dac2] hover:bg-[#d8c8ad] text-[#382d22] text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                        >
                          <CalendarDays className="w-3.5 h-3.5" />
                          <span>Перейти</span>
                        </button>

                        {canEditCalendar && (
                          <button
                            type="button"
                            disabled={isDel}
                            onClick={() => handleRequestDelete(evt)}
                            className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50 active:scale-95"
                            title="Удалить событие из базы данных"
                          >
                            {isDel ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            )}
                            <span>Удалить</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-[#dfcfb5] flex justify-between items-center shrink-0">
              <span className="text-xs text-[#6c5944]">
                Всего событий: <b>{customEvents.length}</b>
              </span>
              <button
                type="button"
                onClick={() => setIsListModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#4f6f52] hover:bg-[#3d593f] text-white transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Events (100% reliable inside iframe, no window.confirm) */}
      {eventToDelete && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => !deletingId && setEventToDelete(null)}
        >
          <div 
            className="w-full max-w-md p-6 rounded-3xl border shadow-2xl relative bg-[#fffcf5] border-[#d6c7af] text-[#2b241d] animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 mb-4 text-red-600">
              <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 border border-red-200">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-[#382d22]">
                  Удалить событие из календаря?
                </h3>
                <p className="text-xs text-[#6c5944]">
                  Подтверждение действия модератора
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#f7f1e5] border border-[#dfcfb5] mb-4 space-y-1.5">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white bg-[#d07e8d]">
                  {eventToDelete.day} {eventToDelete.monthName} {eventToDelete.year || ""}
                </span>
                <span className="text-[10px] text-[#6c5944] font-medium flex items-center gap-1">
                  <Database className="w-2.5 h-2.5 text-[#4f6f52]" />
                  <span>Supabase / Календарь</span>
                </span>
              </div>
              <h4 className="font-bold text-sm text-[#2b241d] leading-snug">
                {eventToDelete.title}
              </h4>
              {eventToDelete.description && (
                <p className="text-xs text-[#6c5944] leading-relaxed line-clamp-2">
                  {eventToDelete.description}
                </p>
              )}
            </div>

            <p className="text-xs text-[#5a4836] mb-6 leading-relaxed">
              Запись будет навсегда удалена из базы данных Supabase и календаря на всех устройствах.
            </p>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setEventToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-[#cbbb9f] bg-[#e6dac2] hover:bg-[#d8c8ad] text-[#382d22] text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={!!deletingId}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md hover:shadow transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Удаление...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Да, удалить</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
