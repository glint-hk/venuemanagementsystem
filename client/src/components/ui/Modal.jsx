import React from "react";

export function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className={`backdrop-blur-xl bg-slate-900/95 border border-white/20 rounded-2xl shadow-2xl w-full ${maxWidth} p-6 overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-blue-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
