import { useEffect, useMemo, useState } from 'react';
import liff from '@line/liff';

const API_BASE = (import.meta.env.VITE_WORKER_API_URL || '').replace(/\/+$/, '');
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '';
const DEV_LINE_USER_ID = import.meta.env.VITE_DEV_LINE_USER_ID || '';

const topNavItems = [
  ['dashboard', '🏠', 'หน้าหลัก'],
  ['timeline', '🗓️', 'ไทม์ไลน์'],
  ['transactions', '🧾', 'รายการ'],
  ['debts', '💳', 'หนี้'],
  ['calendar', '📅', 'ปฏิทิน'],
  ['cashflow', '📈', 'Cashflow'],
  ['budgets', '💌', 'งบ'],
  ['goals', '🎯', 'เป้าหมาย'],
  ['accounts', '👛', 'กระเป๋า'],
  ['networth', '🏦', 'Net worth'],
  ['categories', '🏷️', 'หมวด/ร้านค้า'],
  ['receipts', '🧾', 'ใบเสร็จ'],
  ['notifications', '🔔', 'แจ้งเตือน'],
  ['insights', '🧠', 'อินไซต์'],
  ['rules', '⚙️', 'กฎ'],
  ['commands', '📖', 'คำสั่ง'],
  ['settings', '🌙', 'ตั้งค่า']
];

const bottomItems = [
  ['dashboard', '🏠', 'หน้าหลัก'],
  ['transactions', '🧾', 'รายการ'],
  ['debts', '💳', 'หนี้'],
  ['cashflow', '📈', 'เงินล่วงหน้า'],
  ['more', '✨', 'เพิ่มเติม']
];

const moreItems = [
  ['timeline', '🗓️', 'ไทม์ไลน์'],
  ['calendar', '📅', 'ปฏิทินครบกำหนด'],
  ['budgets', '💌', 'งบประมาณ'],
  ['goals', '🎯', 'เป้าหมาย'],
  ['accounts', '👛', 'หลายกระเป๋า'],
  ['networth', '🏦', 'Net worth'],
  ['categories', '🏷️', 'หมวด/ร้านค้า'],
  ['receipts', '🧾', 'ใบเสร็จ/OCR'],
  ['notifications', '🔔', 'แจ้งเตือน'],
  ['insights', '🧠', 'อินไซต์'],
  ['rules', '⚙️', 'กฎอัตโนมัติ'],
  ['commands', '📖', 'เมนูคำสั่ง'],
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

  const api = useMemo(() => makeApi(token), [token]);

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
      const routes = {
        dashboard: `/api/overview?month=${month}`,
        timeline: `/api/transactions?month=${month}`,
        transactions: `/api/transactions?month=${month}`,
        debts: '/api/debts',
        calendar: '/api/calendar?months=6',
        cashflow: '/api/cashflow?months=6',
        budgets: `/api/budgets?month=${month}`,
        goals: '/api/goals',
        accounts: '/api/accounts',
        networth: '/api/net-worth',
        categories: '/api/categories',
        receipts: '/api/attachments',
        notifications: '/api/notifications',
        insights: `/api/insights?month=${month}`,
        rules: '/api/rules',
        commands: '/api/command-menu',
        settings: '/api/settings'
      };
      if (routes[page]) setData(await api.get(routes[page]));
      else setData(null);
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  }

  async function mutate(message, fn) {
    try {
      await fn();
      setToast(message);
      setTimeout(() => setToast(''), 2400);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError(String(err.message || err));
    }
  }

  if (!ready) return <Splash text="Finny กำลังเตรียมสมุดบัญชีให้ค่ะ..." />;

  return <div className="app-shell">
    <aside className="side">
      <div className="brand"><div className="mascot">🦝</div><div><b>Finny</b><span>Complete Finance</span></div></div>
      <nav>{topNavItems.map(([id, icon, label]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><span>{icon}</span>{label}</button>)}</nav>
    </aside>

    <main className="main">
      <header className="topbar">
        <div><h1>{pageTitle(page)}</h1><p>{todayThai()} · {profile?.displayName || 'LINE User'}</p></div>
        <div className="avatar">{profile?.pictureUrl ? <img src={profile.pictureUrl} alt="profile" /> : '🦝'}</div>
      </header>

      {error && <div className="alert"><b>โหลดข้อมูลไม่สำเร็จ</b><pre>{error}</pre></div>}
      {toast && <div className="toast">{toast}</div>}

      {page === 'more' && <MorePage setPage={setPage} />}
      {page === 'dashboard' && <Dashboard data={data} setPage={setPage} />}
      {page === 'timeline' && <Timeline data={data} />}
      {page === 'transactions' && <Transactions data={data} api={api} mutate={mutate} />}
      {page === 'debts' && <Debts data={data} api={api} mutate={mutate} />}
      {page === 'calendar' && <Calendar data={data} />}
      {page === 'cashflow' && <Cashflow data={data} />}
      {page === 'budgets' && <Budgets data={data} api={api} mutate={mutate} />}
      {page === 'goals' && <Goals data={data} api={api} mutate={mutate} />}
      {page === 'accounts' && <Accounts data={data} api={api} mutate={mutate} />}
      {page === 'networth' && <NetWorth data={data} api={api} mutate={mutate} />}
      {page === 'categories' && <CategoriesMerchants data={data} api={api} mutate={mutate} />}
      {page === 'receipts' && <Receipts data={data} />}
      {page === 'notifications' && <Notifications data={data} api={api} mutate={mutate} />}
      {page === 'insights' && <Insights data={data} api={api} />}
      {page === 'rules' && <Rules data={data} api={api} mutate={mutate} />}
      {page === 'commands' && <Commands data={data} />}
      {page === 'settings' && <Settings data={data} api={api} mutate={mutate} />}
    </main>

    <nav className="bottom">
      {bottomItems.map(([id, icon, label]) => {
        const morePages = ['more', ...moreItems.map(x => x[0])];
        const isActive = id === 'more' ? morePages.includes(page) : page === id;
        return <button key={id} className={isActive ? 'active' : ''} onClick={() => setPage(id)} aria-label={label}><span>{icon}</span><small>{label}</small></button>;
      })}
    </nav>
  </div>;
}

function makeApi(token) {
  async function call(path, options = {}) {
    const useDev = token === 'dev-query-mode' && DEV_LINE_USER_ID;
    const url = `${API_BASE}${path}${useDev ? (path.includes('?') ? '&' : '?') + 'line_user_id=' + encodeURIComponent(DEV_LINE_USER_ID) : ''}`;
    const res = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(token && token !== 'dev-query-mode' ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
    const contentType = res.headers.get('Content-Type') || '';
    const payload = contentType.includes('json') ? await res.json() : await res.text();
    if (!res.ok || payload?.ok === false) throw new Error(payload?.error || `API error ${res.status}`);
    return payload;
  }
  return { get: p => call(p), post: (p, body) => call(p, { method: 'POST', body: JSON.stringify(body) }), patch: (p, body) => call(p, { method: 'PATCH', body: JSON.stringify(body) }), del: p => call(p, { method: 'DELETE' }) };
}

function MorePage({ setPage }) {
  return <div className="more-page">{moreItems.map(([id, icon, label]) => <button key={id} onClick={() => setPage(id)}><span>{icon}</span><b>{label}</b></button>)}</div>;
}

function Dashboard({ data, setPage }) {
  const d = data || {};
  const s = d.summary || {};
  const due = d.due || [];
  const category = d.category || [];
  const recent = d.recent || [];
  const insights = d.insights || {};
  const income = Number(s.total_income || 0);
  const expense = Number(s.real_expense || 0);
  const dueTotal = due.reduce((a, b) => a + Number(b.amount || 0), 0);
  return <div className="grid-page">
    <section className="hero-card full"><div><p>สุขภาพการเงินเดือนนี้</p><h2>{insights.healthScore ?? 0}/100</h2><span>{insights.personality || 'เริ่มบันทึกเพื่อให้ Finny วิเคราะห์ได้นะคะ'}</span></div><div className="big-raccoon">🦝✨</div></section>
    <section className="cards full"><Metric title="รายรับ" value={income} tone="green" /><Metric title="รายจ่าย" value={expense} tone="pink" /><Metric title="คงเหลือ" value={income - expense} tone="yellow" /><Metric title="ต้องจ่าย" value={dueTotal} tone="purple" /></section>
    <Panel title="ทางลัด"><div className="quick-grid"><button onClick={() => setPage('debts')}>💳 เพิ่ม/จ่ายภาระ</button><button onClick={() => setPage('calendar')}>📅 ปฏิทินจ่ายเงิน</button><button onClick={() => setPage('cashflow')}>📈 เงินล่วงหน้า</button><button onClick={() => setPage('commands')}>📖 ดูคำสั่ง LINE</button></div></Panel>
    <Panel title="รายจ่ายตามหมวด"><Bars rows={category.map(x => ({ label: x.category, value: Number(x.amount || 0) }))} /></Panel>
    <Panel title="รายการล่าสุด"><Rows rows={recent.map(r => ({ title: r.item_name, sub: `${r.purchase_date || ''} · ${r.category || ''}`, amount: r.type === 'income' ? r.amount : r.my_amount }))} /></Panel>
    <Panel title="ต้องจ่ายเดือนนี้"><Rows rows={due.map(r => ({ title: r.item_name || r.provider, sub: `${r.due_date || 'ไม่ระบุวัน'} · ${r.source || ''}`, amount: r.amount }))} /></Panel>
  </div>;
}

function Timeline({ data }) {
  const rows = groupByDate(data?.rows || []);
  return <Panel title="🗓️ Timeline รายวัน" wide>{Object.entries(rows).map(([date, items]) => <div key={date} className="day-block"><h3>{date}</h3>{items.map(r => <div className="chat-row" key={r.id}><span>{icon(r.type)}</span><div><b>{r.item_name}</b><small>{r.category}</small></div><strong>{money(r.type === 'income' ? r.amount : r.my_amount)}</strong></div>)}</div>)}</Panel>;
}

function Transactions({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [editing, setEditing] = useState(null);
  return <Panel title="🧾 รายการทั้งหมด" wide action={<button onClick={() => setEditing({})}>+ เพิ่ม</button>}>
    {editing && <TransactionForm row={editing} onCancel={() => setEditing(null)} onSave={body => mutate('บันทึกรายการแล้ว ✅', async () => { if (editing.id) await api.patch(`/api/transactions?id=${editing.id}`, body); else await api.post('/api/transactions', body); setEditing(null); })} />}
    <div className="table">{rows.map(r => <div className="tr" key={r.id}><div><b>{r.item_name}</b><small>{r.purchase_date} · {r.category} · {r.type}</small></div><strong>{money(r.type === 'income' ? r.amount : r.my_amount)}</strong><button onClick={() => setEditing(r)}>แก้ไข</button><button className="danger" onClick={() => mutate('ลบแล้ว', () => api.del(`/api/transactions?id=${r.id}`))}>ลบ</button></div>)}</div>
  </Panel>;
}

function TransactionForm({ row, onSave, onCancel }) {
  const [form, setForm] = useState({ type: row.type || 'expense', item_name: row.item_name || '', category: row.category || 'ทั่วไป', amount: row.amount || '', my_amount: row.my_amount || row.amount || '', purchase_date: row.purchase_date || currentDate(), payment_method: row.payment_method || '', account_id: row.account_id || '', note: row.note || '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <div className="form-card"><select value={form.type} onChange={e => set('type', e.target.value)}><option value="income">รายรับ</option><option value="expense">รายจ่าย</option><option value="credit_card_expense">บัตรเครดิต</option><option value="paylater_expense">PayLater</option><option value="debt_payment">ชำระหนี้</option></select><input placeholder="รายการ" value={form.item_name} onChange={e => set('item_name', e.target.value)} /><input placeholder="หมวด" value={form.category} onChange={e => set('category', e.target.value)} /><input type="number" placeholder="จำนวน" value={form.amount} onChange={e => { set('amount', e.target.value); set('my_amount', e.target.value); }} /><input type="date" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} /><input placeholder="ช่องทาง/บัญชี" value={form.payment_method} onChange={e => set('payment_method', e.target.value)} /><input placeholder="หมายเหตุ" value={form.note} onChange={e => set('note', e.target.value)} /><div><button onClick={() => onSave(form)}>บันทึก</button><button onClick={onCancel}>ยกเลิก</button></div></div>;
}

function Debts({ data, api, mutate }) {
  const obligations = data?.obligations || [];
  const schedules = data?.schedules || [];
  const payments = data?.payments || [];
  const shared = data?.shared || [];
  const [form, setForm] = useState({ provider: 'Shopee PayLater', rowsText: `${currentMonth()} 5500\n${nextMonthText(currentMonth())} 5200` });
  const [pay, setPay] = useState({ schedule_id: '', amount: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function addObligation() {
    const schedulesInput = form.rowsText.split(/\n+/).map(line => line.trim()).filter(Boolean).map(line => { const m = line.match(/(\d{4}-\d{2})\s+(\d[\d,]*)/); return m ? { billing_month: m[1], due_date: `${m[1]}-10`, amount: Number(m[2].replaceAll(',', '')) } : null; }).filter(Boolean);
    await api.post('/api/obligations', { provider: form.provider, name: form.provider, schedules: schedulesInput });
  }

  return <div className="grid-page debts-page">
    <Panel title="➕ เพิ่มภาระ / PayLater / บัตร"><div className="form-card"><input value={form.provider} onChange={e => set('provider', e.target.value)} placeholder="ชื่อ เช่น Shopee PayLater, KBank" /><textarea value={form.rowsText} onChange={e => set('rowsText', e.target.value)} placeholder="2026-07 5500\n2026-08 5200" /><button onClick={() => mutate('เพิ่มภาระแล้ว ✅', addObligation)}>เพิ่มภาระ</button></div></Panel>
    <Panel title="💳 ภาระทั้งหมด"><Rows rows={obligations.map(r => ({ title: r.provider || r.name, sub: `${r.obligation_type || 'other'} · ${r.status || 'active'}`, amount: r.remaining_amount ?? r.total_amount }))} /></Panel>
    <Panel title="🗓️ ตารางงวด / จ่ายงวด"><div className="inline-form"><select value={pay.schedule_id} onChange={e => setPay(p => ({ ...p, schedule_id: e.target.value }))}><option value="">เลือกงวด</option>{schedules.map(s => <option key={s.id} value={s.id}>{s.provider || s.billing_month} · {s.billing_month} · {money(s.remaining_amount || s.amount)}</option>)}</select><input type="number" placeholder="ยอดที่จ่าย" value={pay.amount} onChange={e => setPay(p => ({ ...p, amount: e.target.value }))} /><button onClick={() => mutate('บันทึกจ่ายงวดแล้ว ✅', () => api.patch(`/api/obligation-schedules?id=${pay.schedule_id}`, { action: 'pay', amount: Number(pay.amount) }))}>จ่ายงวด</button></div><Rows rows={schedules.map(r => ({ title: r.provider || r.billing_month, sub: `${r.billing_month}${r.due_date ? ` · ครบ ${r.due_date}` : ''} · ${r.status}`, amount: r.remaining_amount ?? r.amount }))} /></Panel>
    <Panel title="🧾 บัตร / PayLater เดิม"><Rows rows={payments.map(r => ({ title: r.item_name || r.provider, sub: r.provider || r.due_date || r.payment_type, amount: r.amount }))} /></Panel>
    <Panel title="👥 คนค้างเงิน"><Rows rows={shared.map(r => ({ title: r.person_name || 'ไม่ระบุชื่อ', sub: r.status, amount: r.remaining_amount }))} /></Panel>
  </div>;
}

function Calendar({ data }) {
  const events = data?.events || [];
  const byDate = events.reduce((m, e) => { (m[e.date || 'ไม่ระบุวันที่'] ||= []).push(e); return m; }, {});
  return <Panel title="📅 ปฏิทินวันครบกำหนด" wide>{Object.entries(byDate).map(([date, rows]) => <div className="day-block" key={date}><h3>{date}</h3><Rows rows={rows.map(e => ({ title: e.title, sub: `${e.kind} · ${e.status}`, amount: e.amount }))} /></div>)}</Panel>;
}

function Cashflow({ data }) {
  return <Panel title="📈 Cashflow ล่วงหน้า 6 เดือน" wide><div className="table">{(data?.rows || []).map(r => <div className="tr cash-row" key={r.month}><div><b>{r.month}</b><small>รายรับ {money(r.expected_income)} · รายจ่าย {money(r.normal_expense)} · ภาระ {money(r.due_amount)} · ประจำ {money(r.recurring_expense)}</small></div><strong className={Number(r.projected_remaining) < 0 ? 'negative' : 'positive'}>{money(r.projected_remaining)}</strong></div>)}</div></Panel>;
}

function Budgets({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [category, setCategory] = useState('อาหาร/เครื่องดื่ม');
  const [amount, setAmount] = useState('');
  return <Panel title="💌 Envelope Budget" wide><div className="inline-form"><input value={category} onChange={e => setCategory(e.target.value)} /><input type="number" placeholder="งบ" value={amount} onChange={e => setAmount(e.target.value)} /><button onClick={() => mutate('เพิ่มงบแล้ว', () => api.post('/api/budgets', { category, budget_amount: Number(amount) }))}>เพิ่ม/แก้</button></div><Bars rows={rows.map(r => ({ label: r.category, value: Number(r.used_amount || 0), max: Number(r.budget_amount || 0) }))} showMax /></Panel>;
}

function Goals({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  return <Panel title="🎯 Goal Saving" wide><div className="inline-form"><input placeholder="ชื่อเป้าหมาย" value={name} onChange={e => setName(e.target.value)} /><input type="number" placeholder="ยอดเป้าหมาย" value={target} onChange={e => setTarget(e.target.value)} /><button onClick={() => mutate('เพิ่มเป้าหมายแล้ว', () => api.post('/api/goals', { name, target_amount: Number(target) }))}>เพิ่ม</button></div><Rows rows={rows.map(r => ({ title: r.name, sub: `${money(r.current_amount)} / ${money(r.target_amount)}`, amount: r.current_amount }))} /></Panel>;
}

function Accounts({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [form, setForm] = useState({ name: 'KBank', type: 'bank', current_balance: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <Panel title="👛 บัญชีหลายกระเป๋า" wide><div className="inline-form"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="ชื่อบัญชี" /><select value={form.type} onChange={e => set('type', e.target.value)}><option value="cash">เงินสด</option><option value="bank">ธนาคาร</option><option value="wallet">Wallet</option><option value="investment">ลงทุน</option></select><input type="number" value={form.current_balance} onChange={e => set('current_balance', e.target.value)} placeholder="ยอดปัจจุบัน" /><button onClick={() => mutate('เพิ่มบัญชีแล้ว', () => api.post('/api/accounts', form))}>เพิ่มบัญชี</button></div><Rows rows={rows.map(r => ({ title: r.name, sub: r.type, amount: r.current_balance }))} /></Panel>;
}

function NetWorth({ data, api, mutate }) {
  const [form, setForm] = useState({ type: 'asset', name: '', amount: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return <div className="grid-page"><section className="cards full"><Metric title="บัญชี" value={data?.account_total || 0} tone="green" /><Metric title="ทรัพย์สิน" value={data?.asset_total || 0} tone="yellow" /><Metric title="หนี้สิน" value={data?.liability_total || 0} tone="pink" /><Metric title="Net worth" value={data?.net_worth || 0} tone="purple" /></section><Panel title="เพิ่มทรัพย์สิน/หนี้สิน"><div className="inline-form"><select value={form.type} onChange={e => set('type', e.target.value)}><option value="asset">ทรัพย์สิน</option><option value="liability">หนี้สิน</option></select><input placeholder="ชื่อ" value={form.name} onChange={e => set('name', e.target.value)} /><input type="number" placeholder="ยอด" value={form.amount} onChange={e => set('amount', e.target.value)} /><button onClick={() => mutate('บันทึกแล้ว', () => api.post('/api/net-worth', form))}>เพิ่ม</button></div></Panel><Panel title="ทรัพย์สิน"><Rows rows={(data?.assets || []).map(r => ({ title: r.name, sub: r.note, amount: r.amount }))} /></Panel><Panel title="หนี้สิน"><Rows rows={(data?.liabilities || []).map(r => ({ title: r.name, sub: r.note, amount: r.amount }))} /></Panel></div>;
}

function CategoriesMerchants({ data, api, mutate }) {
  const [tab, setTab] = useState('categories');
  const [cat, setCat] = useState('อาหาร/เครื่องดื่ม');
  const [merchant, setMerchant] = useState({ merchant_key: 'Amazon', category: 'อาหาร/เครื่องดื่ม' });
  const rows = data?.rows || [];
  return <Panel title="🏷️ หมวดหมู่และร้านค้าที่จำได้" wide><div className="chip-row"><button onClick={() => setTab('categories')}>หมวดหมู่</button><button onClick={() => setTab('merchants')}>ร้านค้า/AI Learning</button></div>{tab === 'categories' ? <><div className="inline-form"><input value={cat} onChange={e => setCat(e.target.value)} /><button onClick={() => mutate('เพิ่มหมวดแล้ว', () => api.post('/api/categories', { name: cat }))}>เพิ่มหมวด</button></div><Rows rows={rows.map(r => ({ title: r.name, sub: r.is_active === false ? 'ปิดใช้งาน' : 'ใช้งาน', amount: 0 }))} /></> : <MerchantManager api={api} mutate={mutate} merchant={merchant} setMerchant={setMerchant} />}</Panel>;
}

function MerchantManager({ api, mutate, merchant, setMerchant }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get('/api/merchants').then(r => setRows(r.rows || [])).catch(() => {}); }, []);
  const set = (k, v) => setMerchant(f => ({ ...f, [k]: v }));
  return <><div className="inline-form"><input value={merchant.merchant_key} onChange={e => set('merchant_key', e.target.value)} placeholder="ร้านค้า" /><input value={merchant.category} onChange={e => set('category', e.target.value)} placeholder="หมวด" /><button onClick={() => mutate('เพิ่มร้านค้าแล้ว', () => api.post('/api/merchants', merchant))}>จำร้านนี้</button></div><Rows rows={rows.map(r => ({ title: r.merchant_key, sub: `${r.category} · ใช้ ${r.hit_count || 0} ครั้ง`, amount: 0 }))} /></>;
}

function Receipts({ data }) {
  return <Panel title="🧾 ใบเสร็จ / OCR" wide><p className="muted">ส่งรูปสลิปหรือใบเสร็จใน LINE ได้เลย ระบบจะอ่านด้วย OCR แล้วสร้างรายการรอยืนยัน พร้อมเก็บประวัติในหน้านี้</p><Rows rows={(data?.rows || []).map(r => ({ title: r.ocr_text || r.line_message_id || 'รูปภาพ', sub: `${r.file_type || 'image'} · confidence ${r.confidence || 0}`, amount: r.parsed_json?.amount || 0 }))} /></Panel>;
}

function Notifications({ data, api, mutate }) {
  const settings = data?.settings || {};
  return <Panel title="🔔 ระบบแจ้งเตือน" wide><div className="quick-grid"><button onClick={() => mutate('เปิด/ปิดสรุปรายวันแล้ว', () => api.patch('/api/notifications', { daily_summary_enabled: !(settings.daily_summary_enabled !== false) }))}>สรุปรายวัน: {settings.daily_summary_enabled === false ? 'ปิด' : 'เปิด'}</button><button onClick={() => mutate('เปิด/ปิดเตือนครบกำหนดแล้ว', () => api.patch('/api/notifications', { due_reminder_enabled: !(settings.due_reminder_enabled !== false), due_reminder_days: 3 }))}>เตือนครบกำหนด: {settings.due_reminder_enabled === false ? 'ปิด' : 'เปิด'}</button><button onClick={() => mutate('เปิด/ปิดเตือนงบแล้ว', () => api.patch('/api/notifications', { budget_alert_enabled: !(settings.budget_alert_enabled !== false) }))}>เตือนงบใกล้เต็ม: {settings.budget_alert_enabled === false ? 'ปิด' : 'เปิด'}</button></div><h3>ประวัติแจ้งเตือน</h3><Rows rows={(data?.logs || []).map(r => ({ title: r.type, sub: r.sent_at || r.created_at, amount: 0 }))} /></Panel>;
}

function Insights({ data, api }) {
  const x = data || {};
  const [q, setQ] = useState('เดือนนี้กินกาแฟไปเท่าไร');
  const [answer, setAnswer] = useState('');
  async function ask() { const r = await api.get(`/api/nlq?q=${encodeURIComponent(q)}`); setAnswer(r.answer); }
  return <div className="grid-page"><section className="hero-card full"><div><p>AI Financial Coach</p><h2>{x.healthScore || 0}/100</h2><span>{x.text || 'ยังไม่มีอินไซต์'}</span></div><div className="big-raccoon">🦝💡</div></section><Panel title="ถาม Finny"><div className="inline-form"><input value={q} onChange={e => setQ(e.target.value)} /><button onClick={ask}>ถาม</button></div>{answer && <div className="answer">{answer}</div>}</Panel><Panel title="รายการแปลก"><Rows rows={(x.unusual || []).map(r => ({ title: r.item_name, sub: r.category, amount: r.my_amount || r.amount }))} /></Panel></div>;
}

function Rules({ data, api, mutate }) {
  const rows = data?.rows || [];
  const [keyword, setKeyword] = useState('กาแฟ');
  const [category, setCategory] = useState('อาหาร/เครื่องดื่ม');
  return <Panel title="⚙️ Rule Engine" wide><div className="inline-form"><input value={keyword} onChange={e => setKeyword(e.target.value)} /><input value={category} onChange={e => setCategory(e.target.value)} /><button onClick={() => mutate('เพิ่มกฎแล้ว', () => api.post('/api/rules', { keyword, category, intent: 'expense' }))}>เพิ่มกฎ</button></div><Rows rows={rows.map(r => ({ title: r.keyword, sub: `${r.category} · ${r.match_type}`, amount: r.hit_count }))} /></Panel>;
}

function Commands({ data }) {
  const groups = data?.commands || [];
  return <Panel title="📖 เมนูคำสั่งทั้งหมด" wide>{groups.map(g => <section className="command-group" key={g.title}><h3>{g.title}</h3>{g.items.map(item => <code key={item}>{item}</code>)}</section>)}</Panel>;
}

function Settings({ data, api, mutate }) {
  const s = data?.settings || {};
  return <div className="grid-page"><Panel title="🌙 ตั้งค่า"><p>ธีม: {s.theme || 'pastel_raccoon'}</p><p>แจ้งเตือนรายวัน: {s.daily_summary_enabled === false ? 'ปิด' : 'เปิด'} เวลา {s.daily_summary_time || '21:30'}</p><button onClick={() => mutate('บันทึกตั้งค่าแล้ว', () => api.patch('/api/settings', { daily_summary_enabled: !(s.daily_summary_enabled !== false) }))}>สลับแจ้งเตือนรายวัน</button></Panel><Panel title="Export"><a className="button-link" href={`${API_BASE}/api/export.csv`} target="_blank">Export CSV</a><a className="button-link" href={`${API_BASE}/api/export.xls`} target="_blank">Export Excel</a></Panel></div>;
}

function Metric({ title, value, tone }) { return <div className={`metric ${tone}`}><p>{title}</p><h3>{money(value)}</h3><span>บาท</span></div>; }
function Panel({ title, children, wide = false, action = null }) { return <section className={`panel ${wide ? 'full' : ''}`}><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>; }
function Chip({ children }) { return <span className="chip">{children}</span>; }
function Rows({ rows }) { if (!rows || !rows.length) return <div className="empty">🦝 ยังไม่มีข้อมูล</div>; return <div className="rows">{rows.map((r, i) => <div className="row" key={i}><div><b>{r.title}</b><small>{r.sub || '-'}</small></div><strong>{r.amount ? money(r.amount) : ''}</strong></div>)}</div>; }
function Bars({ rows, showMax = false }) { if (!rows || !rows.length) return <div className="empty">ยังไม่มีข้อมูลสำหรับกราฟ</div>; const max = Math.max(...rows.map(r => Number(r.max || r.value || 0)), 1); return <div className="bars">{rows.map((r, i) => <div key={i} className="bar-line"><span>{r.label}</span><div><i style={{ width: `${Math.min(100, Number(r.value || 0) / max * 100)}%` }} /></div><b>{money(r.value)}{showMax ? ` / ${money(r.max)}` : ''}</b></div>)}</div>; }
function Splash({ text }) { return <div className="splash"><div className="mascot big">🦝</div><b>{text}</b></div>; }

function groupByDate(rows) { return rows.reduce((m, r) => { const d = r.purchase_date || 'ไม่ระบุวันที่'; (m[d] ||= []).push(r); return m; }, {}); }
function pageTitle(p) { return { dashboard: 'Dashboard', timeline: 'Timeline', transactions: 'รายการทั้งหมด', debts: 'หนี้/ต้องจ่าย', calendar: 'ปฏิทิน', cashflow: 'Cashflow', budgets: 'งบประมาณ', goals: 'เป้าหมาย', accounts: 'กระเป๋าเงิน', networth: 'Net worth', categories: 'หมวด/ร้านค้า', receipts: 'ใบเสร็จ/OCR', notifications: 'แจ้งเตือน', insights: 'Insight', rules: 'Rule Engine', commands: 'คำสั่งทั้งหมด', settings: 'ตั้งค่า', more: 'เพิ่มเติม' }[p] || 'Dashboard'; }
function money(n) { return Number(n || 0).toLocaleString('th-TH'); }
function icon(type) { return { income: '💰', expense: '🛒', credit_card_expense: '💳', paylater_expense: '🧾', shared_expense: '👥', debt_payment: '✅' }[type] || '📝'; }
function currentDate() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return currentDate().slice(0, 7); }
function nextMonthText(month) { const y = Number(month.slice(0, 4)); const m = Number(month.slice(5, 7)); return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7); }
function todayThai() { return new Date().toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
