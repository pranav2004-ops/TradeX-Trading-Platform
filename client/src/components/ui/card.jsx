const Card = ({ children, className = "" }) => {
  return (
    <div className={`rounded-lg border bg-[#11161f] border-[#1e2530] ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "" }) => (
  <div className={`px-4 py-3 border-b border-[#1e2530] ${className}`}>
    {children}
  </div>
);

export const CardContent = ({ children, className = "" }) => (
  <div className={`px-4 py-3 ${className}`}>{children}</div>
);

export const CardTitle = ({ children, className = "" }) => (
  <h3 className={`text-sm font-medium text-[#8a93a3] uppercase tracking-wider ${className}`}>
    {children}
  </h3>
);

export default Card;