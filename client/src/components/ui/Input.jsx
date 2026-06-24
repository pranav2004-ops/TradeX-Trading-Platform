 function Input({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  name,
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={name}
        className="text-sm font-medium text-slate-300"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="
          w-full
          rounded-lg
          border
          border-slate-700
          bg-slate-800
          px-4
          py-3
          text-white
          placeholder:text-slate-500
          outline-none
          transition
          duration-200
          focus:border-blue-500
          focus:ring-2
          focus:ring-blue-500/30
        "
      />
    </div>
  );
}

export default Input;