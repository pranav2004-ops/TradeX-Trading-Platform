 function Button({
  children,
  type = "button",
  onClick,
  disabled = false,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="
        w-full
        rounded-lg
        bg-blue-600
        px-4
        py-3
        text-sm
        font-semibold
        text-white
        transition
        duration-200
        hover:bg-blue-700
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        disabled:cursor-not-allowed
        disabled:bg-slate-700
        disabled:text-slate-400
      "
    >
      {children}
    </button>
  );
}

export default Button;