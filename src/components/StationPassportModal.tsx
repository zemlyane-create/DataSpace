import React, { useRef } from "react";
import { MonitoringStation, MonitoringRecord } from "../types";
import { X, FileText, Download, QrCode as QrIcon, MapPin, Calendar, CheckCircle2, Table, Printer } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";

interface StationPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  station: MonitoringStation | null;
  records: MonitoringRecord[];
  isDark?: boolean;
}

export const StationPassportModal: React.FC<StationPassportModalProps> = ({
  isOpen,
  onClose,
  station,
  records,
  isDark = true
}) => {
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !station) return null;

  const stationRecords = records.filter(r => r.stationCode === station.code);
  const stationUrl = `${window.location.origin}/#station-${station.code}`;

  const handleExportPdf = () => {
    try {
      const doc = new jsPDF();
      
      // Title Banner
      doc.setFontSize(18);
      doc.text(`ЭКОЛОГИЧЕСКИЙ ПАСПОРТ СТАНЦИИ: ${station.code}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Название: ${station.name}`, 14, 30);
      doc.text(`Категория: ${station.category.toUpperCase()}`, 14, 38);
      doc.text(`Координаты: N ${station.lat.toFixed(5)}°, E ${station.lng.toFixed(5)}°`, 14, 46);
      doc.text(`Описание: ${station.description}`, 14, 54);
      doc.text(`Дата создания паспорта: ${new Date().toLocaleDateString("ru-RU")}`, 14, 62);

      // Section line
      doc.setLineWidth(0.5);
      doc.line(14, 68, 196, 68);

      // Records Summary Table
      doc.setFontSize(14);
      doc.text("Журнал полевых и лабораторных замеров:", 14, 78);

      let yPos = 88;
      doc.setFontSize(10);
      doc.text("Дата | Автор | Парметр | Значение | Статус", 14, yPos);
      yPos += 6;

      stationRecords.slice(0, 15).forEach((rec, idx) => {
        const textRow = `${rec.date} | ${rec.researcher} | ${rec.parameterName}: ${rec.value} ${rec.unit}`;
        doc.text(textRow, 14, yPos);
        yPos += 6;
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
      });

      if (stationRecords.length === 0) {
        doc.text("Архивных замеров по этой точке пока не зафиксировано.", 14, yPos);
        yPos += 10;
      }

      // Footer
      doc.setFontSize(9);
      doc.text("Официальный документ лаборатории Zemlyane.DataSpace", 14, 285);

      doc.save(`Паспорт_эко-точки_${station.code}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Ошибка генерации PDF. Используйте печать паспорта.");
    }
  };

  const handlePrintQr = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className={`rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative border-2 max-h-[90vh] overflow-y-auto ${
        isDark ? "bg-[#0d1c16] border-emerald-500/80 text-slate-100" : "bg-white border-emerald-400 text-slate-900"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 rounded-2xl transition border ${
            isDark ? "bg-[#13261f] text-emerald-300 hover:text-white border-emerald-700" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-300"
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-800 text-amber-300 border border-emerald-600">
                {station.code}
              </span>
              <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                Официальный документ
              </span>
            </div>
            <h2 className={`text-2xl font-bold font-serif ${isDark ? "text-emerald-200" : "text-emerald-950"}`}>
              Паспорт эко-точки: {station.name}
            </h2>
          </div>
        </div>

        {/* Passport Content Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          {/* QR Code Container for Physical Tab */}
          <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center space-y-3 ${
            isDark ? "bg-[#13261f] border-emerald-800" : "bg-emerald-50 border-emerald-200"
          }`}>
            <div ref={qrRef} className="p-3 bg-white rounded-xl shadow border border-slate-300">
              <QRCodeSVG value={stationUrl} size={120} level="M" />
            </div>
            <span className="text-[10px] font-bold font-mono text-center text-emerald-400 uppercase">
              QR-код экспоната
            </span>
            <button
              onClick={handlePrintQr}
              className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Печать QR</span>
            </button>
          </div>

          {/* Station Details */}
          <div className="sm:col-span-2 space-y-3 text-xs sm:text-sm">
            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#11241c] border-emerald-900" : "bg-slate-50 border-emerald-100"}`}>
              <span className="text-amber-400 font-bold block mb-0.5">Географические координаты:</span>
              <div className="flex items-center space-x-2 font-mono">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>N {station.lat.toFixed(5)}°, E {station.lng.toFixed(5)}°</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? "bg-[#11241c] border-emerald-900" : "bg-slate-50 border-emerald-100"}`}>
              <span className="text-amber-400 font-bold block mb-0.5">Характеристика участка:</span>
              <p className="opacity-90 leading-relaxed">{station.description}</p>
            </div>

            <div className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? "bg-[#11241c] border-emerald-900" : "bg-slate-50 border-emerald-100"}`}>
              <span>Всего архивированных замеров:</span>
              <span className="font-bold text-amber-300 font-mono text-base">{stationRecords.length}</span>
            </div>
          </div>
        </div>

        {/* Station Field Records Table */}
        <div className="space-y-2 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
            <Table className="w-4 h-4" />
            <span>Архив замеров станции:</span>
          </h4>

          <div className={`overflow-x-auto rounded-2xl border max-h-48 overflow-y-auto ${
            isDark ? "bg-[#08120e] border-emerald-800" : "bg-white border-emerald-200"
          }`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={isDark ? "bg-[#13261f] text-emerald-300 border-b border-emerald-800" : "bg-emerald-100 text-emerald-900 border-b border-emerald-200"}>
                  <th className="p-2.5 font-bold">Дата</th>
                  <th className="p-2.5 font-bold">Исследователь</th>
                  <th className="p-2.5 font-bold">Параметр</th>
                  <th className="p-2.5 font-bold text-right">Значение</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? "divide-emerald-900/60" : "divide-emerald-100"}`}>
                {stationRecords.map((rec, i) => (
                  <tr key={i} className={isDark ? "hover:bg-[#13261f]/40" : "hover:bg-emerald-50/50"}>
                    <td className="p-2.5 font-mono text-emerald-400">{rec.date}</td>
                    <td className="p-2.5">{rec.researcher}</td>
                    <td className="p-2.5 font-medium">{rec.parameterName}</td>
                    <td className="p-2.5 font-mono font-bold text-right text-amber-300">{rec.value} {rec.unit}</td>
                  </tr>
                ))}
                {stationRecords.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">
                      Замеров по данной станции еще не зарегистрировано.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-emerald-800/40">
          <span className="text-xs text-slate-400">
            Соответствует формату эко-паспортов
          </span>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportPdf}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg transition flex items-center space-x-2 text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Скачать PDF Паспорт</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
