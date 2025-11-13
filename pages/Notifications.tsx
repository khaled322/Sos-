import React from 'react';
import { Bell, Trash2, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function NotificationsPage() {
  const notifs: any[] = [];

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-3xl mx-auto">
          <header className="mb-8 flex justify-between items-center"><div><h1 className="text-3xl font-bold">الإشعارات</h1><p className="text-gray-500">التنبيهات الهامة.</p></div><div className="flex gap-2"></div></header>
          <div className="text-center py-16 bg-white rounded-3xl shadow-sm border">
            <Bell size={32} className="mx-auto mb-4 text-gray-300"/>
            <h2 className="text-xl font-bold text-gray-700">لا توجد إشعارات</h2>
            <p className="text-gray-500 mt-1">تم تعطيل نظام الإشعارات حالياً.</p>
          </div>
      </div>
    </div>
  );
}