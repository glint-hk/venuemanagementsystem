import React from "react";

const STATUS_VARIANTS = {
  DRAFT: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  PENDING: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  REJECTED: "bg-red-500/20 text-red-300 border-red-500/30",
  MODIFIED: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  COMPLETED: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  CANCELLED: "bg-gray-500/20 text-gray-400 border-gray-500/30",

  ADMIN: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  APPROVER: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  BOOKER: "bg-blue-500/20 text-blue-300 border-blue-500/30",
};

export function Badge({ children, status, variant = "blue", className = "" }) {
  const variantClass =
    STATUS_VARIANTS[status] ||
    STATUS_VARIANTS[variant] ||
    "bg-blue-500/20 text-blue-300 border-blue-500/30";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full border ${variantClass} ${className}`}
    >
      {children || status}
    </span>
  );
}
