import React from "react";
import { X } from "lucide-react";
import { PisaPracticumBlock } from "./PisaPracticumBlock";

interface PisaPracticumModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export const PisaPracticumModal: React.FC<PisaPracticumModalProps> = ({
  isOpen,
  onClose,
  isDark = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className={`rounded-3xl max-w-4xl w-full shadow-2xl relative border-2 max-h-[92vh] overflow-y-auto ${
        isDark ? "bg-[#0c1813] border-indigo-500/80 text-slate-100" : "bg-white border-indigo-400 text-slate-900"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 p-2.5 rounded-2xl transition border ${
            isDark ? "bg-[#13261f] text-indigo-300 hover:text-white border-indigo-700" : "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-300"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-2 sm:p-4">
          <PisaPracticumBlock isDark={isDark} />
        </div>
      </div>
    </div>
  );
};
