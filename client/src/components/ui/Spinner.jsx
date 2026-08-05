import React from "react";

export function Spinner({ size = "md", label, className = "" }) {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      <div
        className={`${sizes[size] || sizes.md} border-blue-400 border-t-transparent rounded-full animate-spin`}
      />
      {label && <p className="text-blue-200/60 text-sm mt-3">{label}</p>}
    </div>
  );
}
