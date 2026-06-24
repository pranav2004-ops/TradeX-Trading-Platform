const variantClasses = {
  gain: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  loss: "bg-red-500/10 text-red-400 border border-red-500/20",
  neutral: "bg-[#1e2530] text-[#8a93a3] border border-[#2a3344]",
  accent: "bg-[#2f6fed]/10 text-[#2f6fed] border border-[#2f6fed]/20",
  buy: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  sell: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const Badge = ({ children, variant = "neutral", className = "" }) => {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;