import React, { useState } from "react";
import { NewspaperNote } from "../types";
import { Plus, X, Calendar, User, Tag, Edit3, Newspaper, Feather, Trash2, Edit } from "lucide-react";

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

  // New Note Form State
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [categorySelect, setCategorySelect] = useState("Экспедиционный отчёт");
  const [customCategory, setCustomCategory] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const isPending = userStatus === "pending";

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

  // Split notes for 2-column newspaper spread
  const leftColumnNotes = notes.filter((_, idx) => idx % 2 === 0);
  const rightColumnNotes = notes.filter((_, idx) => idx % 2 === 1);

  return (
    <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-2xl p-4 sm:p-8 shadow-2xl relative overflow-hidden font-serif text-[#2b1d0c] h-full flex flex-col justify-between">
      
      {/* Retro Newspaper Editorial Header */}
      <div className="border-b-2 border-t-2 border-[#5c3e1e] py-3 mb-6 text-center relative">
        <div className="flex flex-row items-center justify-between text-[8px] sm:text-[9.5px] md:text-[11px] font-mono uppercase tracking-wider text-[#5c3e1e] border-b border-[#8c6b43]/40 pb-1.5 mb-2 whitespace-nowrap gap-1">
          <span>Выпуск № 013 в Тентуре</span>
          <span className="font-bold text-[#3b2713]">И тут они подумали: а почему бы и нет?</span>
          <span>КАЗАХСТАН • АЛЕКСАНДРОВКА</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#2b1d0c] font-serif uppercase my-1 drop-shadow-sm">
          ХРОНИКИ ЗЕМЛЯН
        </h2>
        
        <p className="text-xs sm:text-sm italic text-[#5c3e1e] font-serif max-w-2xl mx-auto">
          «НЕежедневный Пророк: хроники землян и мониторинга окружающей среды»
        </p>

        {/* Action Button - ONLY for users with canEditNewspaper */}
        {canEditNewspaper && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-full text-xs font-sans font-bold shadow-lg transition flex items-center space-x-2 border border-[#8c6b43]"
            >
              <Feather className="w-4 h-4 text-amber-200" />
              <span>+ Опубликовать авторскую заметку в номер</span>
            </button>
          </div>
        )}
      </div>

      {/* 2-Page Newspaper Spread Grid with Central Dashed Divider */}
      {notes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-dashed divide-[#8c6b43]">
          
          {/* PAGE 1 (LEFT SPREAD) */}
          <div className="space-y-6 pr-0 md:pr-4">
            <div className="border-b-2 border-[#5c3e1e] pb-1 mb-3 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-xs text-[#5c3e1e]">
                СТРАНИЦА 1 • РЕДАКЦИОННАЯ КОЛОНКА
              </span>
              <span className="text-[10px] italic text-[#7a5833]">ПОЛЕВЫЕ ОТЧЕТЫ</span>
            </div>

            {leftColumnNotes.map((note) => (
              <article
                key={note.id}
                onClick={() => setActiveNote(note)}
                className="group cursor-pointer bg-[#ece2c8]/80 hover:bg-[#ede0c1] p-4 rounded-xl border border-[#b89f7a] shadow-sm transition duration-200 space-y-2"
              >
                {note.imageUrl && (
                  <div className="overflow-hidden rounded-lg mb-2 border border-[#8c6b43]/60">
                    <img
                      src={note.imageUrl}
                      alt={note.title}
                      className="w-full h-44 object-cover filter sepia-[0.35] group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[#5c3e1e] font-sans">
                  <span className="font-bold uppercase tracking-wider bg-[#d9c7a5] px-2 py-0.5 rounded border border-[#a88f67]">
                    {note.category}
                  </span>
                  <span>{note.date}</span>
                </div>

                <h3 className="text-lg font-extrabold text-[#2b1d0c] font-serif leading-snug group-hover:underline">
                  {note.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#3d2b17] font-serif line-clamp-4 leading-relaxed italic">
                  «{note.content}»
                </p>

                <div className="pt-2 border-t border-[#b89f7a]/60 flex items-center justify-between text-xs text-[#5c3e1e]">
                  <span className="font-sans italic">Автор: {note.author}</span>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {canEditNewspaper && (
                      <>
                        <button
                          onClick={(e) => handleOpenEditModal(note, e)}
                          title="Редактировать статью"
                          className="p-1 text-[#5c3e1e] hover:text-[#2b1d0c] hover:bg-[#d9c7a5] rounded transition flex items-center space-x-0.5 text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ред.</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(note.id, e)}
                          title="Удалить статью"
                          className="p-1 text-red-700 hover:text-red-900 hover:bg-red-100 rounded transition flex items-center space-x-0.5 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <span 
                      onClick={() => setActiveNote(note)}
                      className="font-bold text-[#422c15] group-hover:translate-x-1 transition cursor-pointer ml-1"
                    >
                      Читать →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* PAGE 2 (RIGHT SPREAD) */}
          <div className="space-y-6 pl-0 md:pl-8 pt-6 md:pt-0">
            <div className="border-b-2 border-[#5c3e1e] pb-1 mb-3 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-xs text-[#5c3e1e]">
                СТРАНИЦА 2 • ХРОНИКА И ЭКО-ОТКРЫТИЯ
              </span>
              <span className="text-[10px] italic text-[#7a5833]">ВЕСТНИК СТАНЦИЙ</span>
            </div>

            {rightColumnNotes.map((note) => (
              <article
                key={note.id}
                onClick={() => setActiveNote(note)}
                className="group cursor-pointer bg-[#ece2c8]/80 hover:bg-[#ede0c1] p-4 rounded-xl border border-[#b89f7a] shadow-sm transition duration-200 space-y-2"
              >
                {note.imageUrl && (
                  <div className="overflow-hidden rounded-lg mb-2 border border-[#8c6b43]/60">
                    <img
                      src={note.imageUrl}
                      alt={note.title}
                      className="w-full h-44 object-cover filter sepia-[0.35] group-hover:scale-105 transition duration-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-[#5c3e1e] font-sans">
                  <span className="font-bold uppercase tracking-wider bg-[#d9c7a5] px-2 py-0.5 rounded border border-[#a88f67]">
                    {note.category}
                  </span>
                  <span>{note.date}</span>
                </div>

                <h3 className="text-lg font-extrabold text-[#2b1d0c] font-serif leading-snug group-hover:underline">
                  {note.title}
                </h3>

                <p className="text-xs sm:text-sm text-[#3d2b17] font-serif line-clamp-4 leading-relaxed italic">
                  «{note.content}»
                </p>

                <div className="pt-2 border-t border-[#b89f7a]/60 flex items-center justify-between text-xs text-[#5c3e1e]">
                  <span className="font-sans italic">Автор: {note.author}</span>
                  <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                    {canEditNewspaper && (
                      <>
                        <button
                          onClick={(e) => handleOpenEditModal(note, e)}
                          title="Редактировать статью"
                          className="p-1 text-[#5c3e1e] hover:text-[#2b1d0c] hover:bg-[#d9c7a5] rounded transition flex items-center space-x-0.5 text-[11px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ред.</span>
                        </button>
                        <button
                          onClick={(e) => handleDelete(note.id, e)}
                          title="Удалить статью"
                          className="p-1 text-red-700 hover:text-red-900 hover:bg-red-100 rounded transition flex items-center space-x-0.5 text-[11px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <span 
                      onClick={() => setActiveNote(note)}
                      className="font-bold text-[#422c15] group-hover:translate-x-1 transition cursor-pointer ml-1"
                    >
                      Читать →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

        </div>
      ) : (
        <div className="text-center py-12 px-4 bg-[#ece2c8] rounded-xl border border-dashed border-[#8c6b43]">
          <p className="text-[#3d2b17] text-sm font-serif mb-3">
            В свежем номере газеты «Хроники Землян» пока нет опубликованных заметок.
          </p>
          {canEditNewspaper && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-xl font-sans font-bold text-xs transition shadow"
            >
              + Стать первым корреспондентом номера
            </button>
          )}
        </div>
      )}

      {/* READ NOTE VINTAGE MODAL */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative font-serif text-[#2b1d0c]">
            <button
              onClick={() => setActiveNote(null)}
              className="absolute top-4 right-4 p-2 text-[#5c3e1e] hover:text-black bg-[#e3d7ba] rounded-xl transition border border-[#a88f67]"
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
                      className="px-4 py-2 bg-[#d9c7a5] text-[#2b1d0c] hover:bg-[#cbb691] rounded-xl font-bold transition flex items-center space-x-1 border border-[#a88f67]"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => handleDelete(activeNote.id)}
                      className="px-4 py-2 bg-red-800 text-white hover:bg-red-700 rounded-xl font-bold transition flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setActiveNote(null)}
                  className="px-5 py-2 bg-[#5c3e1e] text-[#f4ecd8] hover:bg-[#3d2712] rounded-xl font-bold transition"
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
          <div className="bg-[#f4ecd8] border-8 border-double border-[#5c3e1e] rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative font-sans text-[#2b1d0c]">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-[#5c3e1e] hover:text-black bg-[#e3d7ba] rounded-xl transition border border-[#a88f67]"
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
                  className="px-5 py-2.5 bg-[#d9caaa] text-[#422c15] rounded-xl font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5c3e1e] hover:bg-[#422c15] text-[#f4ecd8] rounded-xl font-bold shadow-md transition"
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
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  if (onDeleteNote) onDeleteNote(noteToDeleteId);
                  if (activeNote?.id === noteToDeleteId) setActiveNote(null);
                  setNoteToDeleteId(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg transition flex items-center space-x-1.5"
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
