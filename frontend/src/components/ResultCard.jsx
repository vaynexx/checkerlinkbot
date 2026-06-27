import React from 'react';

export default function ResultCard({ data, t, highlightText }) {
  if (!data?.found) return null;

  return (
    <div className="space-y-4 animate-[fadeIn_0.5s_ease-out]">
      {/* Верхня картка з даними користувача */}
      <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800">
        <h2 className="text-cyan-400 font-bold mb-2">{t.objFound}</h2>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-slate-800 flex items-center justify-center text-xl">👤</div>
          <div>
            <h3 className="font-bold">{data.firstName} {data.lastName}</h3>
            <p className="text-sm text-slate-400">@{data.username}</p>
            <p className="text-xs text-slate-500">ID: {data.userId}</p>
          </div>
        </div>
        
        {/* Матриця даних */}
        <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
           <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
             <span className="block text-slate-500">📅 {t.regDate}</span>
             <span className="font-semibold">{data.regYear || "—"}</span>
           </div>
           <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
             <span className="block text-slate-500">📸 {t.photoChange}</span>
             <span className="font-semibold">{data.photoDate || "—"}</span>
           </div>
           <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
             <span className="block text-slate-500">{t.firstSeen}</span>
             <span className="font-semibold">{data.firstSeen || "—"}</span>
           </div>
           <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
             <span className="block text-slate-500">{t.intercepted}</span>
             <span className="text-cyan-400 font-bold">{data.messages?.length} {t.msgCount}</span>
           </div>
        </div>
      </div>

      {/* Заголовок активності */}
      <h3 className="font-bold flex items-center gap-2 text-slate-300">
        📁 {t.activity} ({data.messages?.length})
      </h3>

      {/* Список повідомлень */}
      {data.messages?.map((msg, i) => (
        <div key={msg.id || i} className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
           <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
               {/* Аватарка чату */}
               <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-[10px] font-bold">
                 {msg.chatName ? msg.chatName[0] : 'C'}
               </div>
               {/* НАЗВА ЧАТУ ТУТ */}
               <span className="text-sm font-bold text-slate-200">
                 {msg.chatName || t.groupChat}
               </span>
             </div>
             {/* Час повідомлення */}
             <span className="text-[10px] text-slate-500">{msg.date}</span>
           </div>
           <p className="text-sm text-slate-300 leading-relaxed">
             {highlightText(msg.text)}
           </p>
        </div>
      ))}
    </div>
  );
}