import React from 'react';

export default function SearchBar({ username, setUsername, onSearch, loading, t, onAddLink, onOpenReviews }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        placeholder={t.placeholder}
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        className="w-full bg-slate-950/50 text-slate-200 p-3 rounded-xl border border-slate-850 focus:border-cyan-500/80 outline-none"
      />
      <button onClick={onSearch} disabled={loading} className="px-5 bg-cyan-600 rounded-xl font-bold hover:bg-cyan-500 transition">
        {loading ? "..." : t.searchBtn}
      </button>
      {onOpenReviews && (
        <button
          type="button"
          onClick={onOpenReviews}
          className="rounded-xl border border-slate-700 bg-slate-900/80 px-4 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          aria-label="Выплаты"
          title="Выплаты"
        >
          Выплаты
        </button>
      )}
      {onAddLink && (
        <button
          onClick={onAddLink}
          className="w-12 shrink-0 rounded-xl border border-cyan-500/40 bg-slate-900/80 text-cyan-300 text-xl font-black hover:bg-cyan-500 hover:text-slate-950 transition"
          aria-label="Створити закрите посилання"
          title="Створити закрите посилання"
        >
          +
        </button>
      )}
    </div>
  );
}