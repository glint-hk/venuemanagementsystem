import React from "react";

export function Card({ children, className = "", hover = true, ...props }) {
  return (
    <div
      className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 ${
        hover ? "hover:bg-white/[0.08] hover:border-white/20 transition-all duration-200" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
