import React, { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useNavigate } from 'react-router-dom';
import { Bell, PackageX, CalendarClock, CheckCircle2, Trash2, Check, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/Button';

const ICONS = { 'stock': { i: PackageX, c: 'text-orange-500', b: 'bg-orange-100' }, 'debt_customer': { i: CalendarClock, c: 'text-red-500', b: 'bg-red-100' }, 'debt_supplier': { i: CalendarClock, c: 'text-purple-500', b: 'bg-purple-100' }, 'system': { i: Bell, c: 'text-blue-500', b: 'bg-blue-100' } };

export default function NotificationsPage() {
  const navigate = useNavigate();
  const notifs = useLiveQuery(() => db.notifications.orderBy('date').reverse().toArray()) || [];
  const grouped = useMemo(() => {
      const t = new Date().toDateString(); const y = new Date(); y.setDate(y.getDate()-1); const ys = y.toDateString();
      const g = { t: [], y: [], o: [] } as any;
      notifs.forEach(n => { const d = new Date(n.date).toDateString(); if(d===t) g.t.push(n); else if(d===ys) g.y.push(n); else g.o.push(n); });
      return g;
  }, [notifs]);
  const markAll = async () => { await (db as any).transaction('rw', db.notifications, async () => { for (const n of notifs.filter(x=>!x.read)) await db.notifications.update(n.id!, { read: true }); }); };
  const renderG = (t: string, items: any[]) => {
      if (items.length === 0) return null;
      return (<div className="mb-8"><h3 className="text-sm font-bold text-gray-500 mb-3 px-1">{t}</h3><div className="bg-white rounded-2xl shadow-sm border overflow-hidden divide-y divide-gray-100">{items.map(n => { const s = ICONS[n.type as keyof typeof ICONS] || ICONS.system; const Icon = s.i; return (<div key={n.id} className={`p-4 flex gap-4 ${n.read ? 'bg-white opacity-75' : 'bg-blue-50/30'}`}><div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${s.b} ${s.c}`}><Icon size={22} /></div><div className="flex-1 min-w-0"><div className="flex justify-between"><h4 className={`font-bold ${!n.read && 'text-primary'}`}>{n.title}</h4><span className="text-xs text-gray-400 num-l">{new Date(n.date).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})}</span></div><p className="text-gray-600 mt-1">{n.message}</p>{n.link && <Button variant="ghost" size="sm" className="mt-2 text-primary bg-primary/5" onClick={() => { if(!n.read) db.notifications.update(n.id!, { read: true }); navigate(n.link); }}><ExternalLink size={14} className="ml-1"/> مراجعة</Button>}</div>{!n.read && <button onClick={() => db.notifications.update(n.id!, { read: true })} className="self-center text-gray-400 hover:text-primary"><CheckCircle2/></button>}</div>); })}</div></div>);
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto">
          <header className="mb-8 flex justify-between items-center"><div><h1 className="text-3xl font-bold">الإشعارات</h1><p className="text-gray-500">التنبيهات الهامة.</p></div><div className="flex gap-2">{notifs.some(n=>!n.read) && <Button variant="secondary" onClick={markAll}><Check size={18}/> الكل مقروء</Button>}{notifs.length>0 && <Button variant="secondary" onClick={()=>db.notifications.clear()} className="text-red-600"><Trash2 size={18}/> مسح</Button>}</div></header>
          {notifs.length === 0 ? <div className="text-center py-16 bg-white rounded-3xl shadow-sm border"><Bell size={32} className="mx-auto mb-4 text-gray-300"/><h2 className="text-xl font-bold text-gray-700">لا توجد إشعارات</h2></div> : <>{renderG('اليوم', grouped.t)}{renderG('أمس', grouped.y)}{renderG('أقدم', grouped.o)}</>}
      </div>
    </div>
  );
}