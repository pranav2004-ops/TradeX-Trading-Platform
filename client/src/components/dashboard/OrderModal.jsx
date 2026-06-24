import TradeForm from "./TradeForm";

const OrderModal = ({ isOpen, stock, ...props }) => {
  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-lg border border-[#1e2530] bg-[#11161f] shadow-2xl overflow-hidden">
        <TradeForm stock={stock} {...props} />
      </div>
    </div>
  );
};

export default OrderModal;
