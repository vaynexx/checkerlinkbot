import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import ResultCard from "./components/ResultCard";
import SearchBar from "./components/SearchBar";
import { translations } from "./data/translations";

export default function App() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [linksRefreshKey, setLinksRefreshKey] = useState(0);
  const [showLinksWindow, setShowLinksWindow] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [creatorName, setCreatorName] = useState(localStorage.getItem("monitor_creator") || "Testing comment");
  const [creatingLink, setCreatingLink] = useState(false);
  const [ownerId, setOwnerId] = useState(localStorage.getItem("owner_id") || "");
  const [isOwner, setIsOwner] = useState(false);
  const [ownerError, setOwnerError] = useState("");
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const [accessKey, setAccessKey] = useState(localStorage.getItem("access_key") || "");
  const [hasAccess, setHasAccess] = useState(false);
  const [accessError, setAccessError] = useState("");
  const [passwords, setPasswords] = useState([]);
  const [passwordInput, setPasswordInput] = useState("");
  const [newPasswordInput, setNewPasswordInput] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [lang] = useState(localStorage.getItem("monitor_lang") || "ru");

  const reviews = [
    { id: 1, author: "Олег", text: "Зручний інструмент для швидкого створення посилань." },
    { id: 2, author: "Марія", text: "Було б корисно додати сортування заявок." },
  ];

  const t = translations[lang];

  const handleSearch = async () => {
    setLoading(true);
    try {
      const headers = {};
      if (accessKey?.trim()) {
        headers['X-Access-Key'] = accessKey.trim();
      }
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }
      const res = await fetch(`${API_BASE}/api/search?q=${username.replace("@", "").trim()}`, {
        headers,
      });
      setData(await res.json());
    } catch (e) {
      alert(t.connError + e.message);
    } finally {
      setLoading(false);
    }
  };

  const highlightText = (text) => {
    if (!text) return text;
    const regex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_]+|\d+\s*(?:т\.р|руб|грн|\$|€|usdt))/gi;
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <span key={i} className="text-cyan-400 font-bold">{part}</span> : part
    );
  };

  const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "http://localhost:5000";

  useEffect(() => {
    if (accessKey) {
      verifyAccess(accessKey);
    }
    if (ownerId) {
      verifyOwner(ownerId);
    }
  }, []);

  const verifyAccess = async (submittedPassword) => {
    const password = (submittedPassword || accessKey || '').trim();
    if (!password) {
      setAccessError('Введите пароль доступа');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Forbidden');
      }

      localStorage.setItem('access_key', password);
      setAccessKey(password);
      setHasAccess(true);
      setAccessError('');
      setPasswordMessage('Доступ получен');
      return true;
    } catch (e) {
      setHasAccess(false);
      setAccessError('Неверный пароль доступа');
      console.error('Access verification failed:', e.message);
      return false;
    }
  };

  const handleAccessLogin = async (event) => {
    event?.preventDefault();
    await verifyAccess(passwordInput);
  };

  const handleAccessLogout = () => {
    localStorage.removeItem('access_key');
    setAccessKey('');
    setHasAccess(false);
    setAccessError('');
    setPasswordMessage('Вы вышли из приложения');
  };

  const fetchPasswords = async (id = ownerId) => {
    try {
      const headers = {};
      const idToUse = String(id || '').trim();
      if (idToUse) {
        headers['X-Owner-Id'] = idToUse;
      }

      const response = await fetch(`${API_BASE}/api/admin/passwords`, {
        headers,
      });
      if (!response.ok) {
        throw new Error('Ошибка загрузки паролей');
      }
      const list = await response.json();
      setPasswords(list);
      setPasswordError('');
    } catch (error) {
      console.error(error);
      setPasswordError('Не удалось загрузить список паролей');
    }
  };

  const handleAddPassword = async (event) => {
    event.preventDefault();
    const password = newPasswordInput.trim();
    if (!password) return;

    setPasswordLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }

      const response = await fetch(`${API_BASE}/api/admin/passwords`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось добавить пароль');
      }
      setNewPasswordInput('');
      setPasswordMessage('Пароль добавлен');
      fetchPasswords();
    } catch (error) {
      console.error(error);
      setPasswordError(error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleRemovePassword = async (id) => {
    try {
      const headers = {};
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }

      const response = await fetch(`${API_BASE}/api/admin/passwords/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Не удалось удалить пароль');
      }
      setPasswordMessage('Пароль удалён');
      fetchPasswords();
    } catch (error) {
      console.error(error);
      setPasswordError(error.message);
    }
  };

  const verifyOwner = async (id) => {
    const ownerIdValue = String(id || ownerId || '').trim();
    if (!ownerIdValue) {
      setOwnerError('Введите Owner ID');
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/api/admin/verify-owner`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Id': ownerIdValue,
        },
        body: JSON.stringify({ ownerId: ownerIdValue }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Forbidden');
      }

      localStorage.setItem('owner_id', ownerIdValue);
      setOwnerId(ownerIdValue);
      setIsOwner(true);
      setHasAccess(true);
      setOwnerError('');
      setAdminMessage('Владелец подтверждён');
      fetchAdminUsers(ownerIdValue);
      fetchPasswords(ownerIdValue);
      return true;
    } catch (e) {
      setIsOwner(false);
      setOwnerError('Не удалось подтвердить владельца');
      console.error('Owner verification failed:', e.message);
      return false;
    }
  };

  const handleOwnerLogin = async (event) => {
    event?.preventDefault();
    await verifyOwner(ownerId);
  };

  const handleOwnerLogout = () => {
    localStorage.removeItem('owner_id');
    setOwnerId('');
    setIsOwner(false);
    setAdminUsers([]);
    setOwnerError('');
    setAdminMessage('Вы вышли из админ-панели');
  };

  const fetchAdminUsers = async (id = ownerId) => {
    try {
      const headers = {};
      const idToUse = String(id || '').trim();
      if (idToUse) {
        headers['X-Owner-Id'] = idToUse;
      }

      const response = await fetch(`${API_BASE}/api/admin/users`, {
        headers,
      });
      if (!response.ok) {
        throw new Error('Ошибка загрузки админов');
      }
      const users = await response.json();
      setAdminUsers(users);
      setAdminError('');
    } catch (error) {
      console.error(error);
      setAdminError('Не удалось загрузить список пользователей');
    }
  };

  const handleAddAdminUser = async (event) => {
    event.preventDefault();
    const username = adminUsername.trim();
    if (!username) return;

    setAdminLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Id': ownerId,
        },
        body: JSON.stringify({ username }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Не удалось добавить пользователя');
      }
      setAdminUsername('');
      setAdminMessage('Пользователь добавлен');
      fetchAdminUsers();
    } catch (error) {
      console.error(error);
      setAdminError(error.message);
    } finally {
      setAdminLoading(false);
    }
  };

  const handleRemoveAdminUser = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/api/admin/users/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'X-Owner-Id': ownerId,
        },
      });
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || 'Не удалось удалить пользователя');
      }
      setAdminMessage('Пользователь удалён');
      fetchAdminUsers();
    } catch (error) {
      console.error(error);
      setAdminError(error.message);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setNewLinkName("");
  };

  const handleCreateLink = async (event) => {
    event.preventDefault();

    const trimmedName = newLinkName.trim();
    if (!trimmedName) return;

    setCreatingLink(true);
    try {
      const headers = { "Content-Type": "application/json" };
      if (ownerId?.trim()) {
        headers['X-Owner-Id'] = ownerId.trim();
      }
      if (accessKey?.trim()) {
        headers['X-Access-Key'] = accessKey.trim();
      }

      const response = await fetch(`${API_BASE}/api/create-link`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: trimmedName,
          creatorName: creatorName.trim() || "Testing comment",
          creatorComment: "Testing comment",
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не удалось создать ссылку");
      }

      setLinksRefreshKey((value) => value + 1);
      localStorage.setItem("monitor_creator", creatorName.trim() || "Testing comment");
      closeCreateModal();
    } catch (error) {
      alert(error.message);
    } finally {
      setCreatingLink(false);
    }
  };

  if (!hasAccess && !isOwner) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
        <div className="mx-auto max-w-md space-y-6 pt-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-inner shadow-cyan-950/10">
            <h1 className="text-center text-2xl font-black text-cyan-400">{t.title}</h1>
            <p className="mt-3 text-sm text-slate-400">Для доступа к приложению введите пароль из списка доступа.</p>
            <form onSubmit={handleAccessLogin} className="mt-6 space-y-4">
              <input
                value={passwordInput}
                onChange={(event) => setPasswordInput(event.target.value)}
                type="password"
                placeholder="Пароль доступа"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
              >
                Войти
              </button>
              {accessError && <p className="text-sm text-red-400">{accessError}</p>}
              {passwordMessage && <p className="text-sm text-cyan-300">{passwordMessage}</p>}
            </form>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-inner shadow-cyan-950/10">
            <h2 className="text-lg font-bold text-slate-100">Вход владельца</h2>
            <p className="mt-2 text-sm text-slate-400">Владелец может войти напрямую, чтобы управлять паролями и пользователями.</p>
            <form onSubmit={handleOwnerLogin} className="mt-6 space-y-4">
              <input
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                placeholder="Owner ID"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-600 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-500 transition"
              >
                Войти как владелец
              </button>
              {ownerError && <p className="text-sm text-red-400">{ownerError}</p>}
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.20),_transparent_34%),linear-gradient(180deg,_#08101e_0%,_#020617_100%)] text-slate-100 p-4">
      <div className="max-w-md mx-auto space-y-6 pt-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-center flex-1 text-2xl font-black text-cyan-400">{t.title}</h1>
          {hasAccess && !isOwner && (
            <button
              onClick={handleAccessLogout}
              className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 transition whitespace-nowrap"
            >
              Выход
            </button>
          )}
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-inner shadow-cyan-950/20">
          {!isOwner ? (
            <form onSubmit={handleOwnerLogin} className="space-y-4">
              <p className="text-sm text-slate-400">Введите ваш Owner ID, чтобы получить доступ к админ-панели.</p>
              <input
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                placeholder="Owner ID"
                className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
              />
              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
              >
                Войти как владелец
              </button>
              {ownerError && <p className="text-sm text-red-400">{ownerError}</p>}
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-400/70">Админ-панель</p>
                  <h2 className="text-2xl font-black text-slate-100">Доступ только владельцу</h2>
                  <p className="mt-1 text-xs text-slate-500">Owner ID: {ownerId}</p>
                </div>
                <button
                  type="button"
                  onClick={handleOwnerLogout}
                  className="rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition"
                >
                  Выйти
                </button>
              </div>
              <form onSubmit={handleAddPassword} className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={newPasswordInput}
                  onChange={(event) => setNewPasswordInput(event.target.value)}
                  placeholder="Введите новый пароль доступа"
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-500"
                />
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition"
                >
                  {passwordLoading ? 'Добавление...' : 'Добавить пароль'}
                </button>
              </form>
              {passwordMessage && <p className="text-sm text-cyan-300">{passwordMessage}</p>}
              {passwordError && <p className="text-sm text-red-400">{passwordError}</p>}
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-3 text-sm text-slate-400">Пароли доступа:</div>
                {passwords.length ? (
                  <div className="space-y-3">
                    {passwords.map((pwd) => (
                      <div key={pwd.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-100 break-all font-mono">{pwd.password}</span>
                          <p className="text-xs text-slate-500 mt-1">Создан: {new Date(pwd.createdAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePassword(pwd.id)}
                          className="rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500 hover:text-slate-950 transition whitespace-nowrap"
                        >
                          Удалить
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-4 py-4 text-sm text-slate-500">
                    Нет активных паролей. Добавьте первый пароль.
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm text-slate-400">Ссылки</div>
                    <div className="text-lg font-semibold text-slate-100">Все закрытые ссылки</div>
                    <p className="mt-1 text-xs text-slate-500">Показаны ссылки, созданные всеми пользователями</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowLinksWindow(true)}
                    className="rounded-2xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition"
                  >
                    Создать ссылку
                  </button>
                </div>
                <Dashboard
                  onCreateLink={() => setShowCreateModal(true)}
                  refreshKey={linksRefreshKey}
                  ownerId={ownerId}
                  accessKey={accessKey}
                />
              </div>
            </div>
          )}
        </div>

        <SearchBar
          username={username}
          setUsername={setUsername}
          onSearch={handleSearch}
          loading={loading}
          t={t}
          onAddLink={() => setShowLinksWindow(true)}
        />

        <ResultCard data={data} t={t} highlightText={highlightText} />

        {data && !data.found && (
          <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-850/50 p-6">
            <h3 className="font-bold">{t.notFoundTitle}</h3>
            <p className="text-xs text-slate-400">{t.notFoundDesc}</p>
          </div>
        )}
      </div>

      {showLinksWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl border border-cyan-500/20 bg-slate-950 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-cyan-400/70">Telegram invites</p>
                <h2 className="mt-1 text-2xl font-black text-slate-100">Список закрытых ссылок</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500 text-xl font-black text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-400"
                  aria-label="Создать ссылку"
                  title="Создать ссылку"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setShowLinksWindow(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800"
                  aria-label="Закрыть окно"
                  title="Закрыть окно"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="space-y-6 px-6 pb-6 pt-5">
              <Dashboard onCreateLink={() => setShowCreateModal(true)} refreshKey={linksRefreshKey} windowMode ownerId={ownerId} accessKey={accessKey} />
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <form onSubmit={handleCreateLink} className="w-full max-w-md rounded-3xl border border-cyan-500/20 bg-slate-950 p-6 shadow-2xl shadow-cyan-950/40">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-400/80">Telegram</p>
                <h2 className="text-xl font-black text-slate-100 mt-1">Новая закрытая ссылка</h2>
              </div>
              <button type="button" onClick={closeCreateModal} className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:bg-slate-800 transition">
                ×
              </button>
            </div>

            <label className="block text-sm text-slate-300 mb-2">Название ссылки</label>
            <input
              value={newLinkName}
              onChange={(event) => setNewLinkName(event.target.value)}
              placeholder="Например: VIP канал"
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
              autoFocus
            />

            <label className="mt-4 block text-sm text-slate-300 mb-2">Creator / test note</label>
            <input
              value={creatorName}
              onChange={(event) => setCreatorName(event.target.value)}
              placeholder="Your name or test comment"
              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500"
            />

            <p className="mt-3 text-xs text-slate-500">
              Система автоматически добавит порядковый номер и создаст ссылку с заявкой на вступление.
            </p>

            <div className="mt-6 flex gap-3">
              <button type="button" onClick={closeCreateModal} className="flex-1 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-200 hover:bg-slate-800 transition">
                Отмена
              </button>
              <button type="submit" disabled={creatingLink} className="flex-1 rounded-2xl bg-cyan-500 px-4 py-3 font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60 transition">
                {creatingLink ? "Создаю..." : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
