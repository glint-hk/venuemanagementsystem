import React from "react";

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg hover:shadow-blue-500/25 focus:ring-blue-500",
    secondary:
      "bg-white/10 hover:bg-white/15 text-white border border-white/20 focus:ring-white/30",
    outline:
      "bg-transparent hover:bg-white/5 text-blue-300 border border-blue-500/30 hover:border-blue-500/50 focus:ring-blue-500",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/25 focus:ring-emerald-500",
    danger:
      "bg-red-600/80 hover:bg-red-600 text-white shadow-lg hover:shadow-red-500/25 focus:ring-red-500",
    ghost:
      "bg-transparent hover:bg-white/5 text-blue-200 hover:text-white focus:ring-white/20",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing…</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
