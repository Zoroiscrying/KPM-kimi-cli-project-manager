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
      className="w-full rounded-xl border border-white/10 bg-[#292929] px-3 py-2 text-sm text-[#ffffffd6] placeholder-[#ffffff6b] outline-none focus:border-[#a16bff] focus:ring-1 focus:ring-[#a16bff]/50"
    />
  );
}
