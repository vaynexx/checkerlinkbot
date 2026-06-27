import React, { useState, useEffect } from 'react';

export default function Dashboard({ onCreateLink, refreshKey, windowMode = false, ownerId = '', accessKey = '' }) {
  const [links, setLinks] = useState([]);
  const [selectedLink, setSelectedLink] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [notification, setNotification] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:5000";

  const fetchLinks = async () => {
    try {
      const headers = {};
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }
      if (accessKey?.trim()) {
        headers['X-Access-Key'] = accessKey.trim();
      }

      const response = await fetch(`${API_BASE}/api/admin/links`, {
        headers,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        console.error('Помилка завантаження:', response.status, payload.error || response.statusText);
        setLinks([]);
        return;
      }

      const data = await response.json();
      const normalized = Array.isArray(data) ? data : Array.isArray(data?.links) ? data.links : [];
      setLinks(normalized);
    } catch (err) {
      console.error('Помилка завантаження:', err);
      setLinks([]);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [refreshKey, ownerId, accessKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLinks();
    }, 2000);

    return () => clearInterval(interval);
  }, [ownerId, accessKey]);

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotification('Ссылка успешно скопирована');
    } catch (error) {
      console.error('Не удалось скопировать ссылку:', error);
      setNotification('Не удалось скопировать ссылку');
    }
  };

  const handleDeleteLink = (link) => {
    setDeleteCandidate(link);
  };

  const confirmDelete = async () => {
    if (!deleteCandidate) return;

    try {
      const headers = {};
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }
      if (accessKey?.trim()) {
        headers['X-Access-Key'] = accessKey.trim();
      }

      const response = await fetch(`${API_BASE}/api/admin/links/${deleteCandidate.id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to delete link');
      }

      setNotification('Ссылка удалена');
      setDeleteCandidate(null);
      setSelectedLink(null);
      fetchLinks();
    } catch (error) {
      console.error('Ошибка удаления ссылки:', error);
      setNotification('Ошибка удаления ссылки');
    }
  };

  const cancelDelete = () => {
    setDeleteCandidate(null);
  };

  if (selectedLink) {
    return (
      <div className={windowMode ? 'px-6 pb-6 pt-5 text-white animate-[fadeIn_0.5s_ease-out]' : 'p-4 text-white animate-[fadeIn_0.5s_ease-out] max-w-4xl mx-auto'}>
        <button onClick={() => setSelectedLink(null)} className="mb-4 font-semibold text-cyan-400">← Назад до списку</button>
        <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/70">Закрытая ссылка #{selectedLink.sequence}</p>
              <h2 className="text-2xl font-black mt-2">{selectedLink.displayName || selectedLink.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{selectedLink.createdAtText}</p>
              <p className="mt-2 text-xs text-cyan-300">Created by: {selectedLink.createdBy || 'Testing comment'}</p>
              {selectedLink.createdByComment && (
                <p className="mt-1 text-xs text-slate-500">Note: {selectedLink.createdByComment}</p>
              )}
            </div>
            <button
              onClick={() => copyToClipboard(selectedLink.url)}
              className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition"
            >
              Скопировать ссылку
            </button>
            <button
              onClick={() => handleDeleteLink(selectedLink)}
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500 hover:text-slate-950 transition"
            >
              Удалить
            </button>
          </div>

          <p className="mt-4 break-all rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-cyan-300">
            {selectedLink.url}
          </p>

          <div className="grid gap-3 md:grid-cols-3 mt-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Заявок</p>
              <p className="mt-1 text-2xl font-black text-cyan-400">{selectedLink.requestCount || 0}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Статус</p>
              <p className="mt-1 text-lg font-bold text-emerald-400">{selectedLink.status || 'active'}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Название</p>
              <p className="mt-1 text-lg font-bold text-slate-100">{selectedLink.name}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Создатель</p>
              <p className="mt-1 text-lg font-bold text-slate-100">{selectedLink.createdBy || 'Testing comment'}</p>
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-bold text-slate-200 mb-4">Список заявок</h3>
            <div className="space-y-3">
              {(selectedLink.requests || []).length ? selectedLink.requests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-bold text-slate-100">{request.username || 'Без username'}</p>
                    <p className="text-xs text-slate-500">{[request.firstName, request.lastName].filter(Boolean).join(' ') || 'Пустое имя'}</p>
                    <p className="text-xs text-cyan-300">
                      {request.verifiedInBase ? `Проверен в базе (${request.matchedBy || 'match'})` : 'Не найден в базе'}
                      {request.joinDecision ? ` · ${request.joinDecision}` : ''}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">{request.requestedAt ? new Date(request.requestedAt).toLocaleString() : ''}</span>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-500">
                  Пока заявок нет.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={windowMode ? 'px-6 pb-6 pt-5 text-white' : 'p-4 text-white max-w-5xl mx-auto'}>
      {notification && (
        <div className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-200">
          {notification}
        </div>
      )}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-slate-950/40">
            <h3 className="text-lg font-bold text-white">Подтвердить удаление</h3>
            <p className="mt-3 text-sm text-slate-300">Вы действительно хотите удалить ссылку <span className="font-semibold text-cyan-200">{deleteCandidate.displayName}</span>?</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={cancelDelete}
                className="rounded-2xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 transition"
              >
                Отменить
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-2xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 transition"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:bg-slate-900"
          >
            <div
              onClick={() => setSelectedLink(link)}
              className="flex flex-col flex-1"
            >
              <span className="font-bold">{link.sequence}. {link.displayName || link.name}</span>
              <span className="text-[11px] text-slate-400">{link.createdAtText}</span>
              <span className="text-[11px] text-cyan-400">{link.requestCount || 0} заявок</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-300">{link.status}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteLink(link);
                }}
                className="text-[10px] bg-red-900/20 px-3 py-1 rounded-full border border-red-700/50 text-red-400 hover:bg-red-500/30 transition"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {!links.length && (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-sm text-slate-500">
            Пока нет созданных ссылок.
          </div>
        )}
      </div>
    </div>
  );
}
