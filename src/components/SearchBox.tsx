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
      className="w-full rounded-xl border border-white/10 bg-[#151222] px-3 py-2 text-sm text-[#e8e2f0] placeholder-[#7d7196] outline-none focus:border-[#7c3aed] focus:ring-1 focus:ring-[#7c3aed]/50"
    />
  );
}
