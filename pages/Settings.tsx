import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { CheckCircle2, Store, Award, Palette, Receipt, AlertTriangle, Loader2 } from 'lucide-react';
import { useData } from '../context/DataContext';
import { Settings } from '../types';

const THEMES = [ {id:'indigo',n:'نيلي',c:'bg-indigo-600'}, {id:'emerald',n:'زمردي',c:'bg-emerald-600'}, {id:'rose',n:'وردي',c:'bg-rose-600'}, {id:'amber',n:'عنبري',c:'bg-amber-600'}, {id:'violet',n:'بنفسجي',c:'bg-violet-600'}, {id:'sky',n:'سماوي',c:'bg-sky-600'} ];
const DEFAULT_SETTINGS: Settings = { storeName: 'متجري المميز', storeAddress: '', storePhone: '', receiptFooter: '', currency: 'د.ج', themeColor: 'indigo', posShowImages: true, posShowStock: true, loyaltyEnabled: false, spendPerPoint: 100, pointValue: 10, minPointsToRedeem: 50 };

export default function SettingsPage() {
  const { settings, refetch } = useData();
  const [msg, setMsg] = useState<{t:'success'|'error',tx:string}|null>(null);
  const [fd, setFd] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFd(settings);
    }
  }, [settings]);

  const save = async (e: React.FormEvent) => { 
      e.preventDefault();
      setIsSaving(true);
      setMsg(null);
      try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fd)
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save settings');
        }
        await response.json();
        setMsg({t:'success',tx:'تم حفظ الإعدادات بنجاح.'}); 
        refetch.settings();
      } catch (error: any) {
        setMsg({t:'error', tx: `فشل حفظ الإعدادات: ${error.message}`});
      } finally {
        setIsSaving(false);
        setTimeout(()=>setMsg(null),4000); 
      }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFd(prev => ({...prev, [name]: type === 'checkbox' ? checked : value}));
  }

  return (
    <div className="p-6 h-full overflow-y-auto bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
            <p className="text-gray-500 mt-1">تخصيص المتجر ونقطة البيع</p>
        </header>

        {msg && <div className={`p-4 rounded-2xl mb-8 flex items-center gap-3 font-medium animate-in slide-in-from-top-2 ${msg.t === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {msg.t === 'success' ? <CheckCircle2 size={20}/> : <AlertTriangle size={20} />}
            {msg.tx}
        </div>}

        <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Section title="بيانات المتجر" icon={Store}><div className="grid sm:grid-cols-2 gap-4">
                    <Input name="storeName" label="اسم المتجر" required value={fd.storeName} onChange={handleInputChange}/>
                    <Input name="currency" label="عملة المتجر" required value={fd.currency} onChange={handleInputChange}/>
                    <Input name="storePhone" label="رقم الهاتف" value={fd.storePhone} onChange={handleInputChange} className="num-l"/>
                    <Input name="storeAddress" label="العنوان" value={fd.storeAddress} onChange={handleInputChange}/>
                </div></Section>

                 <Section title="نظام الولاء والنقاط" icon={Award}>
                    <Toggle label="تفعيل نظام نقاط الولاء" checked={fd.loyaltyEnabled} onChange={(c:boolean)=>setFd({...fd,loyaltyEnabled:c})}/>
                </Section>
                
                 <Section title="تخصيص الوصل" icon={Receipt}>
                    <Input name="receiptFooter" label="تذييل الوصل (رسالة الشكر)" value={fd.receiptFooter} onChange={handleInputChange}/>
                </Section>
            </div>

            <div className="space-y-6">
                <Section title="تخصيص المظهر ونقطة البيع" icon={Palette}>
                    <div className="mb-4"><label className="block text-sm font-medium mb-2">لون النظام الرئيسي</label><div className="flex gap-3 flex-wrap">{THEMES.map(t=>(<button key={t.id} type="button" onClick={()=>setFd({...fd,themeColor:t.id})} className={`w-10 h-10 rounded-full ${t.c} flex items-center justify-center transition-all active:scale-95 ${fd.themeColor===t.id?'ring-4 ring-gray-200 scale-110':''}`}>{fd.themeColor===t.id && <CheckCircle2 className="text-white" size={18}/>}</button>))}</div></div>
                    <div className="space-y-2 pt-4 border-t">
                        <Toggle label="عرض صور المنتجات في شبكة البيع" checked={fd.posShowImages} onChange={(c:boolean)=>setFd({...fd,posShowImages:c})}/>
                        <Toggle label="عرض كمية المخزون المتبقية" checked={fd.posShowStock} onChange={(c:boolean)=>setFd({...fd,posShowStock:c})}/>
                    </div>
                </Section>
            </div>
            <div className="lg:col-span-2 sticky bottom-6 z-10"><Button type="submit" size="lg" className="w-full h-14 text-lg shadow-lg" disabled={isSaving}>
                {isSaving ? <><Loader2 className="animate-spin mr-2"/> جاري الحفظ...</> : 'حفظ كافة الإعدادات'}
            </Button></div>
        </form>
      </div>
    </div>
  );
}

const Section = ({ title, icon: Icon, children }: any) => (<div className="bg-white rounded-2xl p-6 shadow-sm border"><h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-gray-800"><div className="p-2 bg-primary/10 text-primary rounded-lg"><Icon size={20}/></div> {title}</h2>{children}</div>);
const Input = ({ label, required, className='', icon: Icon, ...props }: any) => (<div>{label && <label className="block text-sm font-medium mb-1.5 text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>}<div className="relative">{Icon && <Icon size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>}<input className={`w-full p-2.5 border border-gray-200 bg-gray-50 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none ${Icon ? 'pr-10' : 'px-4'} ${className}`} required={required} {...props}/></div></div>);
const Toggle = ({ label, checked, onChange, icon:Icon }: any) => (<label className="flex items-center justify-between p-3 bg-gray-50 border rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"><span className="font-medium text-gray-700 flex items-center gap-2">{Icon && <Icon size={18} className={checked ? 'text-primary' : 'text-gray-400'}/>}{label}</span><div className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${checked ? 'bg-primary' : 'bg-gray-300'}`} onClick={(e)=>{e.preventDefault();onChange(!checked)}}><div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${checked ? 'translate-x-6' : ''}`}></div></div></label>);
