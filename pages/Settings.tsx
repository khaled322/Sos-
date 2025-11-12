import React, { useRef, useState, useEffect } from 'react';
import 'dexie-export-import';
import { db } from '../db';
import { Button } from '../components/ui/Button';
import { Download, Upload, AlertTriangle, CheckCircle2, Store, Coins, Award, Palette, Monitor, Receipt, Database } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

const THEMES = [ {id:'indigo',n:'نيلي',c:'bg-indigo-600'}, {id:'emerald',n:'زمردي',c:'bg-emerald-600'}, {id:'rose',n:'وردي',c:'bg-rose-600'}, {id:'amber',n:'عنبري',c:'bg-amber-600'}, {id:'violet',n:'بنفسجي',c:'bg-violet-600'}, {id:'sky',n:'سماوي',c:'bg-sky-600'} ];

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{t:'success'|'error',tx:string}|null>(null);
  const settings = useLiveQuery(() => db.settings.toArray())?.[0];
  const [fd, setFd] = useState({ storeName: '', storeAddress: '', storePhone: '', receiptFooter: '', currency: '', themeColor: 'indigo', posShowImages: true, posShowStock: true, loyaltyEnabled: false, spendPerPoint: 100, pointValue: 10, minPointsToRedeem: 50, liveSyncEnabled: false });

  useEffect(() => { if (settings) setFd({ storeName: settings.storeName||'', storeAddress: settings.storeAddress||'', storePhone: settings.storePhone||'', receiptFooter: settings.receiptFooter||'شكراً لزيارتكم!', currency: settings.currency, themeColor: settings.themeColor||'indigo', posShowImages: settings.posShowImages??true, posShowStock: settings.posShowStock??true, loyaltyEnabled: settings.loyaltyEnabled??false, spendPerPoint: settings.spendPerPoint??100, pointValue: settings.pointValue??10, minPointsToRedeem: settings.minPointsToRedeem??50, liveSyncEnabled: settings.liveSyncEnabled??false }); }, [settings]);
  
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { if(settings?.id) await db.settings.update(settings.id, fd); else await db.settings.add({...fd, language:'ar'} as any); setMsg({t:'success',tx:'تم حفظ الإعدادات بنجاح'}); setTimeout(()=>setMsg(null),3000); } catch { setMsg({t:'error',tx:'فشل حفظ الإعدادات'}); } };
  const exp = async () => { try { const b = await (db as any).export(); const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href=u; a.download=`OmniPOS-Backup-${new Date().toISOString().split('T')[0]}.json`; a.click(); setMsg({t:'success',tx:'تم تصدير قاعدة البيانات بنجاح'}); } catch { setMsg({t:'error',tx:'فشل التصدير'}); } };
  const imp = async (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if(!f || !confirm('تحذير: سيتم مسح جميع البيانات الحالية واستبدالها بالنسخة الاحتياطية. هل أنت متأكد؟')) return; try { await (db as any).delete(); await (db as any).open(); await (db as any).import(f, { overwriteValues: true, clearTablesBeforeImport: true }); window.location.reload(); } catch { setMsg({t:'error',tx:'فشل استيراد قاعدة البيانات. تأكد من صحة الملف.'}); } };

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
            <p className="text-gray-500 mt-1">تخصيص المتجر ونقطة البيع</p>
        </header>

        {msg && <div className={`p-4 rounded-2xl mb-8 flex items-center gap-3 font-medium animate-in slide-in-from-top-2 ${msg.t==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-100':'bg-red-50 text-red-700 border border-red-100'}`}>{msg.t==='success'?<CheckCircle2 size={20}/>:<AlertTriangle size={20}/>}{msg.tx}</div>}

        <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Section title="بيانات المتجر" icon={Store}><div className="grid sm:grid-cols-2 gap-4">
                    <Input label="اسم المتجر" required value={fd.storeName} onChange={e=>setFd({...fd,storeName:e.target.value})}/>
                    <Input label="عملة المتجر" required value={fd.currency} onChange={e=>setFd({...fd,currency:e.target.value})}/>
                    <Input label="رقم الهاتف" value={fd.storePhone} onChange={e=>setFd({...fd,storePhone:e.target.value})} className="num-l"/>
                    <Input label="العنوان" value={fd.storeAddress} onChange={e=>setFd({...fd,storeAddress:e.target.value})}/>
                </div></Section>

                 <Section title="نظام الولاء والنقاط" icon={Award}>
                    <Toggle label="تفعيل نظام نقاط الولاء" checked={fd.loyaltyEnabled} onChange={c=>setFd({...fd,loyaltyEnabled:c})}/>
                    {fd.loyaltyEnabled && <div className="mt-4 grid sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border">
                        <div><label className="text-xs text-gray-500 mb-1 block">مبلغ الشراء لكل 1 نقطة</label><div className="relative"><input type="number" className="w-full p-2 pl-8 border rounded-lg num-l font-bold" value={fd.spendPerPoint} onChange={e=>setFd({...fd,spendPerPoint:parseInt(e.target.value)||1})}/><span className="absolute left-2 top-2.5 text-xs text-gray-400">{fd.currency}</span></div></div>
                        <div><label className="text-xs text-gray-500 mb-1 block">قيمة الخصم لكل 1 نقطة</label><div className="relative"><input type="number" className="w-full p-2 pl-8 border rounded-lg num-l font-bold" value={fd.pointValue} onChange={e=>setFd({...fd,pointValue:parseInt(e.target.value)||1})}/><span className="absolute left-2 top-2.5 text-xs text-gray-400">{fd.currency}</span></div></div>
                         <div><label className="text-xs text-gray-500 mb-1 block">أقل حد لاستبدال النقاط</label><input type="number" className="w-full p-2 border rounded-lg num-l font-bold" value={fd.minPointsToRedeem} onChange={e=>setFd({...fd,minPointsToRedeem:parseInt(e.target.value)||0})}/></div>
                         <div className="sm:col-span-3 text-xs text-gray-500 flex gap-1 items-center"><Coins size={14}/> مثال: العميل يشتري بـ {fd.spendPerPoint * 10} {fd.currency} يحصل على 10 نقاط. يمكنه استبدالها بخصم {10 * fd.pointValue} {fd.currency}.</div>
                    </div>}
                </Section>
                
                 <Section title="تخصيص الوصل" icon={Receipt}>
                    <Input label="تذييل الوصل (رسالة الشكر)" value={fd.receiptFooter} onChange={(e:React.ChangeEvent<HTMLInputElement>)=>setFd({...fd,receiptFooter:e.target.value})}/>
                </Section>
            </div>

            <div className="space-y-6">
                <Section title="المظهر والألوان" icon={Palette}>
                    <div className="mb-4"><label className="block text-sm font-medium mb-2">لون النظام الرئيسي</label><div className="flex gap-3 flex-wrap">{THEMES.map(t=>(<button key={t.id} type="button" onClick={()=>setFd({...fd,themeColor:t.id})} className={`w-10 h-10 rounded-full ${t.c} flex items-center justify-center transition-all active:scale-95 ${fd.themeColor===t.id?'ring-4 ring-gray-200 scale-110':''}`}>{fd.themeColor===t.id && <CheckCircle2 className="text-white" size={18}/>}</button>))}</div></div>
                </Section>

                <Section title="إعدادات نقطة البيع" icon={Monitor}>
                     <div className="space-y-2">
                        <Toggle label="عرض صور المنتجات في شبكة البيع" checked={fd.posShowImages} onChange={c=>setFd({...fd,posShowImages:c})}/>
                        <Toggle label="عرض كمية المخزون المتبقية" checked={fd.posShowStock} onChange={c=>setFd({...fd,posShowStock:c})}/>
                     </div>
                </Section>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-orange-700"><Database size={20}/> النسخ الاحتياطي المحلي</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <Button type="button" variant="secondary" onClick={exp} className="gap-2 h-auto py-3 flex-col sm:flex-row bg-white"><Download size={18}/> تصدير نسخة احتياطية</Button>
                        <Button type="button" variant="secondary" onClick={()=>fileRef.current?.click()} className="gap-2 h-auto py-3 text-orange-600 border-orange-100 hover:bg-orange-50 hover:border-orange-200 flex-col sm:flex-row"><Upload size={18}/> استيراد نسخة</Button>
                    </div>
                    <input type="file" ref={fileRef} onChange={imp} className="hidden" accept=".json"/>
                    <p className="text-xs text-gray-400 mt-4 text-center">احتفظ بنسخ احتياطية دورية لتجنب فقدان البيانات.</p>
                </div>
            </div>
            <div className="lg:col-span-2 sticky bottom-6 z-10"><Button type="submit" size="lg" className="w-full h-14 text-lg shadow-lg">حفظ كافة الإعدادات</Button></div>
        </form>
      </div>
    </div>
  );
}

const Section = ({ title, icon: Icon, children }: any) => (<div className="bg-white rounded-2xl p-6 shadow-sm border"><h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-gray-800"><div className="p-2 bg-primary/10 text-primary rounded-lg"><Icon size={20}/></div> {title}</h2>{children}</div>);
const Input = ({ label, required, className='', icon: Icon, ...props }: any) => (<div>{label && <label className="block text-sm font-medium mb-1.5 text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>}<div className="relative">{Icon && <Icon size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}<input className={`w-full p-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none ${Icon ? 'pr-10' : 'px-4'} ${className}`} required={required} {...props}/></div></div>);
const Toggle = ({ label, checked, onChange, icon:Icon }: any) => (<label className="flex items-center justify-between p-3 bg-gray-50 border rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"><span className="font-medium text-gray-700 flex items-center gap-2">{Icon && <Icon size={18} className={checked ? 'text-primary' : 'text-gray-400'}/>}{label}</span><div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-primary' : 'bg-gray-300'}`} onClick={(e)=>{e.preventDefault();onChange(!checked)}}><div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-6' : ''}`}></div></div></label>);