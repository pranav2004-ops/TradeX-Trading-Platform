const StockSearchDropdown = ({ results, loading, onSelect }) => {
  if (loading) {
    return (
      <div className="absolute top-full mt-2 w-full bg-[#11161f] border border-[#1e2530] rounded-md p-3 text-sm text-[#8a93a3]">
        Searching...
      </div>
    );
  }

  if (!results.length) return null;

  return (
    <div className="absolute top-full mt-2 w-full bg-[#11161f] border border-[#1e2530] rounded-md overflow-hidden shadow-xl z-50">
      {results.map((stock, index) => (
        <button
          key={index}
          onClick={() => onSelect(stock)}
          className="w-full text-left px-4 py-3 hover:bg-[#1e2530] border-b border-[#1e2530] last:border-0"
        >
          <p className="text-[#f5f7fa] text-sm font-medium">
            {stock["1. symbol"]}
          </p>

          <p className="text-[#8a93a3] text-xs truncate">
            {stock["2. name"]}
          </p>
        </button>
      ))}
    </div>
  );
};

export default StockSearchDropdown;