"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Suggestion = {
  id: string;
  name: string;
  company: string;
  category: string;
  ownerStaff: string;
  cooperationLevel: string;
  matchedOn: string;
};

type SearchAutocompleteProps = {
  name?: string;
  defaultValue?: string;
  placeholder: string;
  inputClassName?: string;
  panelClassName?: string;
  resultHintClassName?: string;
};

export function SearchAutocomplete({
  name = "q",
  defaultValue = "",
  placeholder,
  inputClassName = "",
  panelClassName = "",
  resultHintClassName = "",
}: SearchAutocompleteProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (!trimmedQuery) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(trimmedQuery)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as { suggestions?: Suggestion[] };
        setSuggestions(payload.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  const showPanel = useMemo(
    () => isOpen && trimmedQuery.length > 0 && suggestions.length > 0,
    [isOpen, trimmedQuery, suggestions.length],
  );

  return (
    <div className={`relative ${panelClassName}`}>
      <input
        type="search"
        name={name}
        value={query}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(event) => {
          const nextValue = event.target.value;
          setQuery(nextValue);

          if (!nextValue.trim()) {
            setSuggestions([]);
          }
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setIsOpen(false), 150);
        }}
        className={inputClassName}
      />

      {trimmedQuery ? (
        <p className={resultHintClassName}>
          정확한 이름이 기억나지 않아도 일부 이름, 기관, 이메일, 행사명으로 찾을 수 있습니다.
        </p>
      ) : null}

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
            자동완성 제안
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => router.push(`/cards/${suggestion.id}`)}
                className="w-full rounded-2xl px-4 py-3 text-left transition hover:bg-cyan-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-950">{suggestion.name}</span>
                  {suggestion.company ? (
                    <span className="text-sm text-slate-600">{suggestion.company}</span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>일치: {suggestion.matchedOn}</span>
                  {suggestion.category ? <span>카테고리 {suggestion.category}</span> : null}
                  {suggestion.ownerStaff ? <span>담당 {suggestion.ownerStaff}</span> : null}
                  {suggestion.cooperationLevel ? (
                    <span>협력 {suggestion.cooperationLevel}</span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
