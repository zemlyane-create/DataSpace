import React from "react";
import { CategoryInfo, ResearchCategory } from "../types";
import { X, BookOpen, Table, PenTool, FilePlus } from "lucide-react";

interface CategoryInfoModalProps {
  category: CategoryInfo | null;
  onClose: () => void;
  onOpenDataEntry?: (categoryId: ResearchCategory) => void;
  isDark?: boolean;
  canCreateRecords?: boolean;
}

export const CategoryInfoModal: React.FC<CategoryInfoModalProps> = ({
  category,
  onClose,
  onOpenDataEntry,
  isDark = true,
  canCreateRecords = false
}) => {
  if (!category) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className={`rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border-2 transition-colors ${
        isDark 
          ? "bg-[#0d1a15] border-emerald-500/80 text-slate-100" 
          : "bg-white border-emerald-400 text-slate-800"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-2xl transition border ${
            isDark 
              ? "bg-[#13261f] text-emerald-300 hover:text-white border-emerald-700" 
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-lg">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-800 text-amber-300 border border-emerald-600">
                {category.prefix}
              </span>
              <span className="text-xs uppercase font-bold text-emerald-500 tracking-wider">
                Научная энциклопедия
              </span>
            </div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold font-serif ${isDark ? "text-emerald-300" : "text-emerald-950"}`}>
              {category.name}
            </h2>
          </div>
        </div>

        {/* Scientific Definition */}
        <div className={`p-4 sm:p-5 rounded-2xl border mb-5 leading-relaxed ${
          isDark 
            ? "bg-[#13261f]/80 border-emerald-800/80 text-emerald-100/90" 
            : "bg-emerald-50/80 border-emerald-200 text-emerald-900"
        }`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-1.5 flex items-center space-x-1.5">
            <span>Академическое определение:</span>
          </h3>
          <p className="text-sm font-serif sm:text-base leading-relaxed">
            {category.definition || category.description}
          </p>
        </div>

        {/* Atmosphere Composition Table */}
        {category.airCompositionTable && category.airCompositionTable.length > 0 && (
          <div className="space-y-3 mb-5">
            <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center space-x-2 ${
              isDark ? "text-amber-300" : "text-emerald-900"
            }`}>
              <Table className="w-4 h-4 text-emerald-400" />
              <span>Таблица «Состав сухого воздуха»:</span>
            </h4>

            <div className={`overflow-hidden rounded-2xl border shadow-inner ${
              isDark ? "bg-[#08120e] border-emerald-800" : "bg-white border-emerald-200"
            }`}>
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className={isDark ? "bg-[#13261f] text-emerald-300 border-b border-emerald-800" : "bg-emerald-100 text-emerald-900 border-b border-emerald-200"}>
                    <th className="p-3 font-bold">Компонент (Газ)</th>
                    <th className="p-3 font-bold text-right">Объемная доля (%)</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? "divide-emerald-900/60" : "divide-emerald-100"}`}>
                  {category.airCompositionTable.map((row, idx) => (
                    <tr key={idx} className={isDark ? "hover:bg-[#13261f]/40" : "hover:bg-emerald-50/50"}>
                      <td className="p-3 font-medium">{row.gas}</td>
                      <td className="p-3 font-mono font-bold text-right text-emerald-400">{row.percent}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Prominent Action Callout: Go to Field Journal Data Entry - ONLY for users with canCreateRecords */}
        {canCreateRecords && (
          <div className={`p-4 sm:p-5 rounded-2xl border mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg ${
            isDark 
              ? "bg-gradient-to-r from-[#122e23] via-[#102b21] to-[#0a1e16] border-emerald-500/70" 
              : "bg-gradient-to-r from-emerald-100 via-teal-50 to-emerald-50 border-emerald-300"
          }`}>
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-amber-400">
                <FilePlus className="w-4 h-4" />
                <span className="text-[11px] font-bold uppercase font-mono tracking-wider">
                  Полевой дневник наблюдений
                </span>
              </div>
              <h4 className={`text-sm font-bold font-serif ${isDark ? "text-emerald-100" : "text-emerald-950"}`}>
                Внести замеры по разделу «{category.name}»
              </h4>
              <p className={`text-xs ${isDark ? "text-emerald-300/80" : "text-emerald-800"}`}>
                Открыть форму ввода данных с автовыбором данного раздела
              </p>
            </div>

            <button
              onClick={() => {
                if (onOpenDataEntry) {
                  onOpenDataEntry(category.id as ResearchCategory);
                }
                onClose();
              }}
              className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs shadow-xl transition flex items-center justify-center space-x-2 shrink-0 border border-emerald-300/50 hover:scale-105 active:scale-95"
            >
              <PenTool className="w-4 h-4 text-amber-300" />
              <span>Внести данные в дневник ({category.prefix})</span>
            </button>
          </div>
        )}

        {/* Additional Category Notes & Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-emerald-800/40 text-xs">
          <span className={isDark ? "text-emerald-400/80" : "text-emerald-700"}>
            💡 Раздел используется для академического экологического мониторинга
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition border border-slate-700"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
