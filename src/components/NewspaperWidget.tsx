import React, { useState } from "react";
import { NewspaperNote } from "../types";
import { Plus, X, Calendar, User, Tag, Edit3, Newspaper, Feather, Trash2, Edit, ChevronLeft, ChevronRight, BookOpen, Layers } from "lucide-react";

interface NewspaperWidgetProps {
  notes: NewspaperNote[];
  onAddNote: (newNote: NewspaperNote) => void;
  onDeleteNote?: (id: string) => void;
  onEditNote?: (updatedNote: NewspaperNote) => void;
  userStatus?: string;
  canEditNewspaper?: boolean;
}

export const NewspaperWidget: React.FC<NewspaperWidgetProps> = ({ 
  notes, 
  onAddNote, 
  onDeleteNote,
  onEditNote,
  userStatus = "active",
  canEditNewspaper = false
}) => {
  const [activeNote, setActiveNote] = useState<NewspaperNote | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NewspaperNote | null>(null);
  const [noteToDeleteId, setNoteToDeleteId] = useState<string | null>(null);

  // Pagination for notes (0 is latest, 1, 2, ... are older editions)
  const [currentIndex, setCurrentIndex] = useState(0);

  // New Note Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [categorySelect, setCategorySelect] = useState("Экспедиционный отчёт");
  const [customCategory, setCustomCategory] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const isPending = userStatus === "pending";

  // Clamp current index if notes list changed
  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, notes.length - 1));
  const currentNote = notes[safeIndex] || null;

  const handleOpenAddModal = () => {
    if (!canEditNewspaper) {
      alert("Создание заметок доступно только для ролей «Корреспондент» и «Руководитель».");
      return;
    }
    if (isPending) {
      alert("Регистрация прошла успешно. Доступ к внесению данных появится после подтверждения администратором.");
      return;
    }
    setEditingNote(null);
    setTitle("");
    setAuthor("");
    setContent("");
    setImageUrl("");
    setCustomCategory("");
    setCategorySelect("Экспедиционный отчёт");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (note: NewspaperNote, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditNewspaper) {
      alert("Редактирование доступно только для ролей «Корреспондент» и «Руководитель».");
      return;
    }
    if (isPending) {
      alert("Регистрация прошла успешно. Доступ к внесению изменений появится после подтверждения администратором.");
      return;
    }
    setEditingNote(note);
    setTitle(note.title);
    setAuthor(note.author);
    setContent(note.content);
    setImageUrl(note.imageUrl || "");
    setCategorySelect(["Экспедиционный отчёт", "Гидрология и Вода", "Биоразнообразие", "Палеонтология", "Летопись клуба", "Инновации"].includes(note.category) ? note.category : "Свой вариант...");
    if (!["Экспедиционный отчёт", "Гидрология и Вода", "Биоразнообразие", "Палеонтология", "Летопись клуба", "Инновации"].includes(note.category)) {
      setCustomCategory(note.category);
    }
    setIsAddModalOpen(true);
  };

  const handleDelete = (noteId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canEditNewspaper) {
      alert("Удаление доступно только для ролей «Корреспондент» и «Руководитель».");
      return;
    }
    setNoteToDeleteId(noteId);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditNewspaper) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImageUrl(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditNewspaper) return;
    if (!title.trim() || !content.trim()) return;

    const finalCategory = categorySelect === "Свой вариант..." 
      ? (customCategory.trim() || "Особая рубрика") 
      : categorySelect;

    if (editingNote && onEditNote) {
      const updated: NewspaperNote = {
        ...editingNote,
        title: title.toUpperCase(),
        content: content.trim(),
        author: author.trim() || "Юный корреспондент",
        category: finalCategory,
        imageUrl: imageUrl || editingNote.imageUrl
      };
      onEditNote(updated);
      if (activeNote?.id === editingNote.id) {
        setActiveNote(updated);
      }
    } else {
      const newNoteObj: NewspaperNote = {
        id: `news-${Date.now()}`,
        title: title.toUpperCase(),
        content: content.trim(),
        author: author.trim() || "Юный корреспондент",
        date: new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }),
        category: finalCategory,
        imageUrl: imageUrl || "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
        isClipping: true
      };
      onAddNote(newNoteObj);
      setCurrentIndex(0); // Show freshly published note
    }

    setIsAddModalOpen(false);
    setEditingNote(null);
    setTitle("");
    setAuthor("");
    setContent("");
    setImageUrl("");
    setCustomCategory("");
    setCategorySelect("Экспедиционный отчёт");
  };

  return (
    <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-3xl p-4 sm:p-8 shadow-2xl relative overflow-hidden font-serif text-[#2b1d0c] h-full flex flex-col justify-between max-w-5xl mx-auto">
      
      {/* Retro Newspaper Editorial Header */}
      <div className="border-b-2 border-t-2 border-[#5c3e1e] py-3 mb-6 text-center relative">
        <div className="flex flex-row items-center justify-between text-[9px] sm:text-[11px] font-mono uppercase tracking-wider text-[#5c3e1e] border-b border-[#8c6b43]/40 pb-1.5 mb-2 whitespace-nowrap gap-1">
          <span>Свежий выпуск</span>
          <span className="font-bold text-[#3b2713] hidden sm:inline">Экологический клуб «Земляне»</span>
          <span>КАЗАХСТАН • АЛЕКСАНДРОВКА</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#2b1d0c] font-serif uppercase my-1 drop-shadow-sm">
          ХРОНИКИ ЗЕМЛЯН
        </h2>
        
        <p className="text-xs sm:text-sm italic text-[#5c3e1e] font-serif max-w-2xl mx-auto">
          «НЕежедневный Пророк: хроники землян и мониторинга окружающей среды»
        </p>

        {/* Action Button & Stats */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {canEditNewspaper && (
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-full text-xs font-sans font-bold shadow-lg transition flex items-center space-x-2 border border-[#8c6b43] active:scale-95 cursor-pointer"
            >
              <Feather className="w-4 h-4 text-amber-200" />
              <span>+ Опубликовать авторскую заметку в номер</span>
            </button>
          )}

          {notes.length > 0 && (
            <div className="flex items-center space-x-2 bg-[#e8debe] px-3.5 py-1.5 rounded-full border border-[#b89f7a] text-xs font-sans text-[#5c3e1e]">
              <Layers className="w-3.5 h-3.5" />
              <span>Всего в архиве: <strong>{notes.length}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* SINGLE NOTE SPREAD WITH PAGINATION BROWSING */}
      {currentNote ? (
        <div className="space-y-6">
          
          {/* Navigation Toolbar between editions */}
          <div className="bg-[#ede1c4] border-2 border-[#b89f7a] rounded-2xl p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center space-x-2">
              <span className="font-sans text-xs font-bold text-[#5c3e1e] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#8c6b43]" />
                {safeIndex === 0 ? "🌟 Свежая новость (Последний выпуск)" : `Архивный материал (№ ${notes.length - safeIndex})`}
              </span>
              <span className="text-xs font-mono bg-[#dfd0af] px-2.5 py-0.5 rounded-full border border-[#a88f67] text-[#422c15] font-bold">
                {safeIndex + 1} из {notes.length}
              </span>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={safeIndex === 0}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center space-x-1 border transition ${
                  safeIndex === 0 
                    ? "bg-[#dfd0af]/50 text-[#8c6b43]/50 border-transparent cursor-not-allowed" 
                    : "bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] border-[#8c6b43] shadow-sm cursor-pointer active:scale-95"
                }`}
                title="Перейти к более свежей новости"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Новее</span>
              </button>

              <button
                type="button"
                disabled={safeIndex >= notes.length - 1}
                onClick={() => setCurrentIndex(prev => Math.min(notes.length - 1, prev + 1))}
                className={`px-3 py-1.5 rounded-xl text-xs font-sans font-bold flex items-center space-x-1 border transition ${
                  safeIndex >= notes.length - 1 
                    ? "bg-[#dfd0af]/50 text-[#8c6b43]/50 border-transparent cursor-not-allowed" 
                    : "bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] border-[#8c6b43] shadow-sm cursor-pointer active:scale-95"
                }`}
                title="Перейти к предыдущей (более старой) новости"
              >
                <span>Листать дальше</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Current Newspaper Article Spread Card */}
          <article className="bg-[#ece2c8]/90 border-2 border-[#b89f7a] rounded-2xl p-6 sm:p-8 shadow-md relative group space-y-5">
            
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#8c6b43]/50 pb-3">
              <span className="font-bold uppercase tracking-wider bg-[#d9c7a5] text-[#422c15] px-3 py-1 rounded-lg border border-[#a88f67] text-xs font-sans">
                {currentNote.category}
              </span>
              <div className="flex items-center space-x-1.5 text-xs text-[#5c3e1e] font-sans">
                <Calendar className="w-3.5 h-3.5" />
                <span>{currentNote.date}</span>
              </div>
            </div>

            {/* Title */}
            <h3 
              onClick={() => setActiveNote(currentNote)}
              className="text-2xl sm:text-3xl font-black text-[#2b1d0c] font-serif leading-tight hover:text-[#5c3e1e] transition cursor-pointer"
            >
              {currentNote.title}
            </h3>

            {/* Layout: Image + Text */}
            <div className={`grid grid-cols-1 ${currentNote.imageUrl ? "md:grid-cols-12 gap-6" : "gap-4"} items-start`}>
              {currentNote.imageUrl && (
                <div className="md:col-span-5 overflow-hidden rounded-xl border-2 border-[#8c6b43]/70 shadow">
                  <img
                    src={currentNote.imageUrl}
                    alt={currentNote.title}
                    className="w-full h-56 sm:h-64 object-cover filter sepia-[0.3] hover:scale-105 transition duration-500 cursor-pointer"
                    onClick={() => setActiveNote(currentNote)}
                  />
                </div>
              )}

              <div className={`${currentNote.imageUrl ? "md:col-span-7" : "w-full"} space-y-4`}>
                <p className="text-sm sm:text-base text-[#3d2b17] font-serif leading-relaxed italic line-clamp-6">
                  «{currentNote.content}»
                </p>

                <button
                  type="button"
                  onClick={() => setActiveNote(currentNote)}
                  className="px-4 py-2 bg-[#d9c7a5] hover:bg-[#cbb691] text-[#2b1d0c] text-xs font-sans font-bold rounded-xl border border-[#a88f67] transition flex items-center space-x-1.5 cursor-pointer"
                >
                  <span>Читать материал полностью</span>
                  <span>→</span>
                </button>
              </div>
            </div>

            {/* Author & Editorial Management Controls */}
            <div className="pt-4 border-t border-[#b89f7a]/80 flex flex-wrap items-center justify-between gap-3 text-xs text-[#5c3e1e] font-sans">
              <div className="flex items-center space-x-1.5">
                <User className="w-4 h-4 text-[#8c6b43]" />
                <span>Корреспондент: <strong>{currentNote.author}</strong></span>
              </div>

              <div className="flex items-center space-x-2">
                {canEditNewspaper && (
                  <>
                    <button
                      onClick={(e) => handleOpenEditModal(currentNote, e)}
                      title="Редактировать статью"
                      className="px-3 py-1.5 bg-[#d9c7a5] hover:bg-[#cbb691] text-[#2b1d0c] rounded-xl transition flex items-center space-x-1 text-xs font-bold border border-[#a88f67] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={(e) => handleDelete(currentNote.id, e)}
                      title="Удалить статью"
                      className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 rounded-xl transition flex items-center space-x-1 text-xs font-bold border border-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </article>

          {/* Quick thumbnails / list for fast switching */}
          {notes.length > 1 && (
            <div className="pt-2 border-t border-dashed border-[#8c6b43]/60">
              <div className="text-[11px] font-sans font-bold text-[#5c3e1e] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <span>Быстрый выбор выпуска:</span>
              </div>
              <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
                {notes.map((note, idx) => (
                  <button
                    key={note.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap transition border ${
                      idx === safeIndex
                        ? "bg-[#5c3e1e] text-[#f4ecd8] font-bold border-[#422c15] shadow-sm"
                        : "bg-[#e8debe] hover:bg-[#d9c7a5] text-[#5c3e1e] border-[#b89f7a]"
                    }`}
                  >
                    {idx === 0 ? "⭐ Свежий" : `№ ${notes.length - idx}`}: {note.title.slice(0, 24)}...
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="text-center py-14 px-4 bg-[#ece2c8] rounded-2xl border-2 border-dashed border-[#8c6b43] my-4">
          <div className="w-14 h-14 bg-[#dfd0af] rounded-full flex items-center justify-center mx-auto mb-3 text-[#5c3e1e] border border-[#b89f7a]">
            <Newspaper className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-bold font-serif text-[#2b1d0c] mb-1">
            В свежем номере газеты пока нет заметок
          </h4>
          <p className="text-[#5c3e1e] text-xs sm:text-sm font-serif max-w-md mx-auto mb-5">
            Здесь будет публиковаться главная последняя новость с удобной возможностью листать архивные выпуски.
          </p>
          {canEditNewspaper && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-2.5 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-xl font-sans font-bold text-xs transition shadow-md border border-[#8c6b43]"
            >
              + Опубликовать первую статью номера
            </button>
          )}
        </div>
      )}

      {/* READ NOTE VINTAGE MODAL */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative font-serif text-[#2b1d0c]">
            <button
              onClick={() => setActiveNote(null)}
              className="absolute top-4 right-4 p-2 text-[#5c3e1e] hover:text-black bg-[#e3d7ba] rounded-xl transition border border-[#a88f67] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-[#8c6b43] pb-2 mb-4">
              <span className="text-xs font-mono font-bold text-[#7a5833] uppercase tracking-widest">
                РУБРИКА: {activeNote.category} • {activeNote.date}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#2b1d0c] font-serif mt-1">
                {activeNote.title}
              </h2>
            </div>

            {activeNote.imageUrl && (
              <img
                src={activeNote.imageUrl}
                alt={activeNote.title}
                className="w-full max-h-80 object-cover rounded-xl border border-[#8c6b43] mb-5 filter sepia-[0.25]"
              />
            )}

            <div className="text-base text-[#2b1d0c] leading-relaxed whitespace-pre-line space-y-4 font-serif">
              {activeNote.content}
            </div>

            <div className="mt-8 pt-4 border-t-2 border-[#5c3e1e] flex flex-wrap items-center justify-between gap-3 text-xs text-[#5c3e1e] font-sans">
              <span>Автор материала: <strong>{activeNote.author}</strong></span>
              <div className="flex items-center space-x-2">
                {canEditNewspaper && (
                  <>
                    <button
                      onClick={() => handleOpenEditModal(activeNote)}
                      className="px-4 py-2 bg-[#d9c7a5] text-[#2b1d0c] hover:bg-[#cbb691] rounded-xl font-bold transition flex items-center space-x-1 border border-[#a88f67] cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => handleDelete(activeNote.id)}
                      className="px-4 py-2 bg-red-800 text-white hover:bg-red-700 rounded-xl font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveNote(null)}
                  className="px-5 py-2 bg-[#5c3e1e] text-[#f4ecd8] hover:bg-[#3d2712] rounded-xl font-bold transition cursor-pointer"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT NOTE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative font-sans text-[#2b1d0c]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#5c3e1e] hover:text-black bg-[#e3d7ba] rounded-xl transition border border-[#a88f67] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold font-serif text-[#2b1d0c] mb-1">
              {editingNote ? "Редактировать публикацию" : "Новая публикация в номер «Хроники Землян»"}
            </h2>
            <p className="text-xs text-[#7a5833] mb-5">
              {editingNote ? "Внесите изменения в вашу ранее опубликованную статью" : "Занесите ваше экспедиционное наблюдение прямо в печать выпуска газеты!"}
            </p>

            <form onSubmit={handleSaveNote} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-[#422c15] font-semibold mb-1">Заголовок статьи:</label>
                <input
                  type="text"
                  required
                  placeholder="Заголовок ЗАГЛАВНЫМИ БУКВАМИ..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-3 rounded-xl focus:ring-2 focus:ring-[#5c3e1e] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#422c15] font-semibold mb-1">Автор / Корреспондент:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ваше имя и класс"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-3 rounded-xl focus:ring-2 focus:ring-[#5c3e1e] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#422c15] font-semibold mb-1">Рубрика:</label>
                  <select
                    value={categorySelect}
                    onChange={(e) => setCategorySelect(e.target.value)}
                    className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-3 rounded-xl focus:ring-2 focus:ring-[#5c3e1e] focus:outline-none"
                  >
                    <option value="Экспедиционный отчёт">Экспедиционный отчёт</option>
                    <option value="Гидрология и Вода">Гидрология и Вода</option>
                    <option value="Биоразнообразие">Биоразнообразие</option>
                    <option value="Палеонтология">Палеонтология</option>
                    <option value="Летопись клуба">Летопись клуба</option>
                    <option value="Инновации">Инновации</option>
                    <option value="Свой вариант...">Свой вариант...</option>
                  </select>
                </div>
              </div>

              {categorySelect === "Свой вариант..." && (
                <div>
                  <label className="block text-[#422c15] font-semibold mb-1 flex items-center">
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Название рубрики:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Название вашей рубрики..."
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-3 rounded-xl focus:ring-2 focus:ring-[#5c3e1e] focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[#422c15] font-semibold mb-1">Текст публикации:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Опишите ваше открытие или результат замера..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-3 rounded-xl font-serif leading-relaxed focus:ring-2 focus:ring-[#5c3e1e] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[#422c15] font-semibold mb-1">Прикрепить фото:</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="w-full bg-[#e8debe] border border-[#a88f67] text-[#2b1d0c] p-2 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-5 py-2.5 bg-[#d9caaa] text-[#422c15] rounded-xl font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-xl font-bold shadow-md transition cursor-pointer"
                >
                  Отправить в печать
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE NOTE CONFIRMATION MODAL */}
      {noteToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
          <div className="bg-[#1c130b] border-2 border-rose-500/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-amber-100">
            <h3 className="text-lg font-bold font-serif text-white mb-3">
              Подтверждение удаления публикации
            </h3>
            <p className="text-xs text-amber-200/90 leading-relaxed mb-6">
              Вы действительно хотите удалить эту статью из школьной газеты «Хроники Землян»? Это действие нельзя отменить.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setNoteToDeleteId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (onDeleteNote) onDeleteNote(noteToDeleteId);
                  if (activeNote?.id === noteToDeleteId) setActiveNote(null);
                  setNoteToDeleteId(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить статью</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

