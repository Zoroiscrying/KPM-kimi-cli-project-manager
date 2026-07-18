interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBox({ value, onChange, placeholder = 'Search projects...' }: SearchBoxProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-xl border border-white/10 bg-[#1e1e1e] px-3 py-2 text-sm text-[#ffffff] placeholder-[#ffffff66] outline-none focus:border-[#1783ff] focus:ring-1 focus:ring-[#1783ff]/50"
    />
  );
}
