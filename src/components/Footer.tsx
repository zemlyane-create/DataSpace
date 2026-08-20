import React from "react";
import { Instagram, Award } from "lucide-react";
import logoSrc from "../assets/images/logotip.gif";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 pt-10 pb-8 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-4">
            <img
              src={logoSrc}
              alt="Эко-клуб Земляне"
              referrerPolicy="no-referrer"
              className="h-16 w-16 object-contain shrink-0"
            />
            <div>
              <div className="flex items-center space-x-2 text-white font-extrabold text-xl font-serif mb-1">
                <span>Zemlyane.DataSpace</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                Интерактивная система эко-мониторинга и долговременных исследований школьного эко-клуба «Земляне».
              </p>
            </div>
          </div>

          {/* Social Instagram Link Button */}
          <div className="flex flex-col items-center md:items-end">
            <a
              href="https://www.instagram.com/zemlyane_alxschool/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-pink-600 via-purple-600 to-amber-600 hover:from-pink-500 hover:to-amber-500 text-white font-bold rounded-2xl text-sm transition shadow-xl flex items-center space-x-2.5 group transform hover:-translate-y-0.5 border border-pink-400/30"
            >
              <Instagram className="w-5 h-5 text-white group-hover:scale-110 transition" />
              <span>Instagram @zemlyane_alxschool</span>
            </a>
          </div>

        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
          <p>© {new Date().getFullYear()} Zemlyane.DataSpace. Все права защищены.</p>
          <p className="flex items-center space-x-1 mt-2 sm:mt-0">
            <span>Создано для школьников и преподавателей эко-клуба «Земляне»</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
