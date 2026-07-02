import { useEffect, useMemo, useState } from 'react';
import liff from '@line/liff';

const API_BASE = (import.meta.env.VITE_WORKER_API_URL || '').replace(/\/+$/, '');
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const DEV_LINE_USER_ID = import.meta.env.VITE_DEV_LINE_USER_ID || '';

const navItems = [
  ['dashboard', '🏠', 'หน้าหลัก'],
  ['timeline', '🗓️', 'ไทม์ไลน์'],
  ['transactions', '🧾', 'รายการ'],
  ['budgets', '💌', 'งบ'],
  ['goals', '🎯', 'เป้าหมาย'],
  ['debts', '💳', 'หนี้'],
  ['insights', '🧠', 'อินไซต์'],
  ['rules', '⚙️', 'กฎ'],
  ['settings', '🌙', 'ตั้งค่า']
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('finny_token') || '');
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const api = useMemo(() => makeApi(token, setError), [token]);

  useEffect(() => { init(); }, []);
  useEffect(() => { if (token) loadAll(); }, [token, page]);

  async function init() {
    try {
      if (!API_BASE) throw new Error('VITE_WORKER_API_URL ยังไม่ได้ตั้งค่า');
      if (DEV_LINE_USER_ID) {
        setProfile({ userId: DEV_LINE_USER_ID, displayName: 'Dev User', pictureUrl: '' });
        setToken('dev-query-mode');
        return;
      }
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) { liff.login(); return; }
      const p = await liff.getProfile();
      const idToken = liff.getIDToken();
      setProfile(p);
      const res = await fetch(`${API_BASE}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'เข้าสู่ระบบ Dashboard ไม่สำเร็จ');
      sessionStorage.setItem('finny_token', json.token);
      setToken(json.token);
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    } finally {
      setReady(true);
    }
  }

  async function loadAll() {
    try {
      setError('');
      const month = currentMonth();
      if (page === 'dashboard') setData(await api.get(`/api/overview?month=${month}`));
      if (page === 'timeline' || page === 'transactions') setData(await api.get(`/api/transactions?month=${month}`));
      if (page === 'budgets') setData(await api.get(`/api/budgets?month=${month}`));
      if (page === 'goals') setData(await api.get('/api/goals'));
      if (page === 'debts') setData(await api.get('/api/debts'));
      if (page === 'insights') setData(await api.get(`/api/insights?month=${month}`));
      if (page === 'rules') setData(await api.get('/api/rules'));
      if (page === 'settings') setData(await api.get('/api/settings'));
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  }

  async function mutate(message, fn) {
    try { await fn(); setToast(message); setTimeout(() => setToast(''), 2400); await loadAll(); }
    catch (err) { setError(String(err.message || err)); }
  }

  if (!ready) return <Splash text="Finny กำลังเตรียมสมุดบัญชีให้ค่ะ..." />;

  return <div className="app-shell">
    <aside className="side">
      <div className="brand"><div className="mascot">🦝</div><div><b>Finny</b><span>Pastel Finance</span></div></div>
      <nav>{navItems.map(([id, icon, label]) => <button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><span>{icon}</span>{label}</button>)}</nav>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><h1>{pageTitle(page)}</h1><p>{todayThai()} · {profile?.displayName || 'LINE User'}</p></div>
        <div className="avatar">{profile?.pictureUrl ? <img src={profile.pictureUrl} /> : '🦝'}</div>
      </header>

      {error && <div className="alert"><b>โหลดข้อมูลไม่สำเร็จ</b><pre>{error}</pre></div>}
      {toast && <div className="toast">{toast}</div>}

      {page === 'dashboard' && <Dashboard data={data} api={api} mutate={mutate} />}
      {page === 'timeline' && <Timeline data={data} />}
      {page === 'transactions' && <Transactions data={data} api={api} mutate={mutate} />}
      {page === 'budgets' && <Budgets data={data} api={api} mutate={mutate} />}
      {page === 'goals' && <Goals data={data} api={api} mutate={mutate} />}
      {page === 'debts' && <Debts data={data} api={api} mutate={mutate} />}
      {page === 'insights' && <Insights data={data} api={api} />}
      {page === 'rules' && <Rules data={data} api={api} mutate={mutate} />}
      {page === 'settings' && <Settings data={data} api={api} mutate={mutate} />}
    </main>

   <nav className="bottom">
  {navItems.map(([id, icon, label]) => (
    <button
      key={id}
      className={page === id ? 'active' : ''}
      onClick={() => setPage(id)}
    >
      <span>{icon}</span>
      <small>{label}</small>
    </button>
  ))}
</nav>
  </div>;
}

function makeApi(token, setError) {
  async function call(path, options = {}) {
    const useDev = token === 'dev-query-mode' && DEV_LINE_USER_ID;
    const url = `${API_BASE}${path}${useDev ? (path.includes('?') ? '&' : '?') + 'line_user_id=' + encodeURIComponent(DEV_LINE_USER_ID) : ''}`;
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(token && token !== 'dev-query-mode' ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const contentType = res.headers.get('Content-Type') || '';
    const json = contentType.includes('json') ? await res.json() : await res.text();
    if (!res.ok || json?.ok === false) throw new Error(json?.error || `API error ${res.status}`);
    return json;
  }
  return {
    get: (p) => call(p),
    post: (p, body) => call(p, { method:'POST', body: JSON.stringify(body) }),
    patch: (p, body) => call(p, { method:'PATCH', body: JSON.stringify(body) }),
    del: (p) => call(p, { method:'DELETE' })
  };
}

function Dashboard({ data, api, mutate }) {
  const d = data || {};
  const s = d.summary || {};
  const recent = d.recent || [];
  const due = d.due || [];
  const category = d.category || [];
  const insights = d.insights || {};
  const income = Number(s.total_income || 0);
  const expense = Number(s.real_expense || 0);
  const remaining = income - expense;
  return <div className="grid-page">
    <section className="hero-card full">
      <div><p>สุขภาพการเงินเดือนนี้</p><h2>{insights.healthScore ?? 0}/100</h2><span>{insights.personality || 'เริ่มบันทึกเพื่อให้ Finny วิเคราะห์ได้นะคะ'}</span></div><div className="big-raccoon">🦝✨</div>
    </section>
    <section className="cards full">
      <Metric title="รายรับ" value={income} tone="green" />
      <Metric title="รายจ่าย" value={expense} tone="pink" />
      <Metric title="คงเหลือ" value={remaining} tone="yellow" />
      <Metric title="ต้องจ่าย" value={(due||[]).reduce((a,b)=>a+Number(b.amount||0),0)} tone="purple" />
    </section>
    <Panel title="Mini Widgets"><div className="chip-row"><Chip>วันนี้ใช้ไปแล้ว {money(expense)} บาท</Chip><Chip>คาดการณ์สิ้นเดือน {money(insights.projectedRemaining || 0)} บาท</Chip><Chip>{insights.topCategory?.category || 'ยังไม่มีหมวดเด่น'}</Chip></div></Panel>
    <Panel title="รายจ่ายตามหมวด"><Bars rows={category.map(x => ({ label:x.category, value:Number(x.amount||0) }))} /></Panel>
    <Panel title="รายการล่าสุด"><Rows rows={recent.map(r => ({ title:r.item_name, sub:r.category, amount:r.type==='income'?r.amount:r.my_amount }))} /></Panel>
    <Panel title="ต้องจ่าย"><Rows rows={due.map(r => ({ title:r.item_name, sub:r.provider || 'ครบกำหนด', amount:r.amount }))} /></Panel>
  </div>;
}

function Timeline({ data }) {
  const rows = groupByDate(data?.rows || []);
  return <div className="panel full"><h2>🗓️ Timeline รายวัน</h2>{Object.entries(rows).map(([date, items]) => <div key={date} className="day-block"><h3>{date}</h3>{items.map(r => <div className="chat-row" key={r.id}><span>{icon(r.type)}</span><div><b>{r.item_name}</b><small>{r.category}</small></div><strong>{money(r.type==='income'?r.amount:r.my_amount)}</strong></div>)}</div>)}</div>;
}

function Transactions({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [editing, setEditing] = useState(null);
  return <div className="panel full"><div className="panel-head"><h2>🧾 รายการทั้งหมด</h2><button onClick={()=>setEditing({})}>+ เพิ่ม</button></div>
    <div className="filter-chips"><Chip>วันนี้</Chip><Chip>7 วัน</Chip><Chip>เดือนนี้</Chip><Chip>บัตร</Chip><Chip>กาแฟ</Chip></div>
    {editing && <TransactionForm row={editing} onCancel={()=>setEditing(null)} onSave={(body)=>mutate('บันทึกแล้ว ✅', async()=>{ if(editing.id) await api.patch(`/api/transactions?id=${editing.id}`, body); else await api.post('/api/transactions', body); setEditing(null); })} />}
    <div className="table">{rows.map(r => <div className="tr" key={r.id}><div><b>{r.item_name}</b><small>{r.purchase_date} · {r.category} · {r.type}</small></div><strong>{money(r.type==='income'?r.amount:r.my_amount)}</strong><button onClick={()=>setEditing(r)}>แก้ไข</button><button className="danger" onClick={()=>mutate('ลบแล้ว กู้คืนได้จาก Audit Log', ()=>api.del(`/api/transactions?id=${r.id}`))}>ลบ</button></div>)}</div>
  </div>;
}

function TransactionForm({ row, onSave, onCancel }) {
  const [form, setForm] = useState({ type: row.type || 'expense', item_name: row.item_name || '', category: row.category || 'ทั่วไป', amount: row.amount || '', my_amount: row.my_amount || row.amount || '', purchase_date: row.purchase_date || currentDate(), payment_method: row.payment_method || '', note: row.note || '' });
  const set = (k,v)=>setForm(f=>({...f,[k]:v}));
  return <div className="form-card"><select value={form.type} onChange={e=>set('type',e.target.value)}><option value="income">รายรับ</option><option value="expense">รายจ่าย</option><option value="credit_card_expense">บัตรเครดิต</option><option value="paylater_expense">PayLater</option></select><input placeholder="รายการ" value={form.item_name} onChange={e=>set('item_name',e.target.value)} /><input placeholder="หมวด" value={form.category} onChange={e=>set('category',e.target.value)} /><input type="number" placeholder="จำนวน" value={form.amount} onChange={e=>{set('amount',e.target.value); set('my_amount',e.target.value)}} /><input type="date" value={form.purchase_date} onChange={e=>set('purchase_date',e.target.value)} /><input placeholder="ช่องทาง" value={form.payment_method} onChange={e=>set('payment_method',e.target.value)} /><div><button onClick={()=>onSave(form)}>บันทึก</button><button onClick={onCancel}>ยกเลิก</button></div></div>;
}

function Budgets({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [category,setCategory]=useState('อาหาร/เครื่องดื่ม'); const [amount,setAmount]=useState('');
  return <Panel title="💌 Envelope Budget"><div className="inline-form"><input value={category} onChange={e=>setCategory(e.target.value)} /><input type="number" placeholder="งบ" value={amount} onChange={e=>setAmount(e.target.value)} /><button onClick={()=>mutate('เพิ่มงบแล้ว',()=>api.post('/api/budgets',{category,budget_amount:Number(amount)}))}>เพิ่ม/แก้</button></div><Bars rows={rows.map(r=>({label:r.category,value:Number(r.used_amount||0), max:Number(r.budget_amount||0)}))} showMax /></Panel>;
}

function Goals({ data, api, mutate }) {
  const rows = data?.rows || []; const [name,setName]=useState(''); const [target,setTarget]=useState('');
  return <Panel title="🎯 Goal Saving"><div className="inline-form"><input placeholder="ชื่อเป้าหมาย" value={name} onChange={e=>setName(e.target.value)} /><input type="number" placeholder="ยอดเป้าหมาย" value={target} onChange={e=>setTarget(e.target.value)} /><button onClick={()=>mutate('เพิ่มเป้าหมายแล้ว',()=>api.post('/api/goals',{name,target_amount:Number(target)}))}>เพิ่ม</button></div><Rows rows={rows.map(r=>({title:r.name,sub:`${money(r.current_amount)} / ${money(r.target_amount)}`,amount:r.current_amount}))} /></Panel>;
}

function Debts({ data, api, mutate }) {
  const payments = data?.payments || []; const shared = data?.shared || [];
  return <div className="grid-page"><Panel title="💳 บัตร / PayLater"><Rows rows={payments.map(r=>({title:r.item_name,sub:r.provider || r.due_date,amount:r.amount}))} /></Panel><Panel title="👥 คนค้างเงิน"><Rows rows={shared.map(r=>({title:r.person_name,sub:r.status,amount:r.remaining_amount}))} /></Panel><Panel title="คำแนะนำปิดหนี้"><p>{data?.advice}</p></Panel></div>;
}

function Insights({ data, api }) {
  const x = data || {};
  const [q,setQ]=useState('เดือนนี้กินกาแฟไปเท่าไร'); const [answer,setAnswer]=useState('');
  async function ask(){ const r = await api.get(`/api/nlq?q=${encodeURIComponent(q)}`); setAnswer(r.answer); }
  return <div className="grid-page"><section className="hero-card full"><div><p>AI Financial Coach</p><h2>{x.healthScore || 0}/100</h2><span>{x.text || 'ยังไม่มีอินไซต์'}</span></div><div className="big-raccoon">🦝💡</div></section><Panel title="ถาม Finny"><div className="inline-form"><input value={q} onChange={e=>setQ(e.target.value)} /><button onClick={ask}>ถาม</button></div>{answer && <div className="answer">{answer}</div>}</Panel><Panel title="รายการแปลก"><Rows rows={(x.unusual||[]).map(r=>({title:r.item_name,sub:r.category,amount:r.my_amount||r.amount}))} /></Panel></div>;
}

function Rules({ data, api, mutate }) {
  const rows = data?.rows || []; const [keyword,setKeyword]=useState('กาแฟ'); const [category,setCategory]=useState('อาหาร/เครื่องดื่ม');
  return <Panel title="⚙️ Rule Engine"><div className="inline-form"><input value={keyword} onChange={e=>setKeyword(e.target.value)} /><input value={category} onChange={e=>setCategory(e.target.value)} /><button onClick={()=>mutate('เพิ่มกฎแล้ว',()=>api.post('/api/rules',{keyword,category,intent:'expense'}))}>เพิ่มกฎ</button></div><Rows rows={rows.map(r=>({title:r.keyword,sub:`${r.category} · ${r.match_type}`,amount:r.hit_count}))} /></Panel>;
}

function Settings({ data, api, mutate }) {
  const s = data?.settings || {};
  return <div className="grid-page"><Panel title="🌙 ตั้งค่า"><p>ธีม: {s.theme || 'pastel_raccoon'}</p><p>แจ้งเตือนรายวัน: {s.daily_summary_enabled===false?'ปิด':'เปิด'} เวลา {s.daily_summary_time || '21:30'}</p><button onClick={()=>mutate('บันทึกตั้งค่าแล้ว',()=>api.patch('/api/settings',{daily_summary_enabled:!(s.daily_summary_enabled!==false)}))}>สลับแจ้งเตือนรายวัน</button></Panel><Panel title="Export"><a className="button-link" href={`${API_BASE}/api/export.csv`} target="_blank">Export CSV</a><a className="button-link" href={`${API_BASE}/api/export.xls`} target="_blank">Export Excel</a></Panel></div>;
}

function Metric({ title, value, tone }) { return <div className={`metric ${tone}`}><p>{title}</p><h3>{money(value)}</h3><span>บาท</span></div>; }
function Panel({ title, children }) { return <section className="panel"><h2>{title}</h2>{children}</section>; }
function Chip({ children }) { return <span className="chip">{children}</span>; }
function Rows({ rows }) { if (!rows || !rows.length) return <div className="empty">🦝 ยังไม่มีข้อมูล</div>; return <div className="rows">{rows.map((r,i)=><div className="row" key={i}><div><b>{r.title}</b><small>{r.sub || '-'}</small></div><strong>{money(r.amount)}</strong></div>)}</div>; }
function Bars({ rows, showMax=false }) { if(!rows || !rows.length) return <div className="empty">ยังไม่มีข้อมูลสำหรับกราฟ</div>; const max = Math.max(...rows.map(r=>Number(r.max||r.value||0)),1); return <div className="bars">{rows.map((r,i)=><div key={i} className="bar-line"><span>{r.label}</span><div><i style={{width:`${Math.min(100, Number(r.value||0)/max*100)}%`}} /></div><b>{money(r.value)}{showMax?` / ${money(r.max)}`:''}</b></div>)}</div>; }
function Splash({ text }) { return <div className="splash"><div className="mascot big">🦝</div><b>{text}</b></div>; }

function groupByDate(rows){ return rows.reduce((m,r)=>{ const d=r.purchase_date||'ไม่ระบุวันที่'; (m[d] ||= []).push(r); return m; },{}); }
function pageTitle(p){ return {dashboard:'Dashboard',timeline:'Timeline',transactions:'รายการทั้งหมด',budgets:'งบประมาณ',goals:'เป้าหมาย',debts:'หนี้/ต้องจ่าย',insights:'Insight',rules:'Rule Engine',settings:'ตั้งค่า'}[p]||'Dashboard'; }
function money(n){ return Number(n||0).toLocaleString('th-TH'); }
function icon(type){ return {income:'💰',expense:'🛒',credit_card_expense:'💳',paylater_expense:'🧾',shared_expense:'👥'}[type]||'📝'; }
function currentDate(){ return new Date().toISOString().slice(0,10); }
function currentMonth(){ return currentDate().slice(0,7); }
function todayThai(){ return new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
