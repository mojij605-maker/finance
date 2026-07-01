import { useEffect, useState } from 'react';
import liff from '@line/liff';
import { Home, List, CreditCard, Users, Settings, Download, Sparkles } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip } from 'recharts';

const API_URL = import.meta.env.VITE_WORKER_API_URL;
const LIFF_ID = import.meta.env.VITE_LIFF_ID;

export default function App() {
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await liff.init({ liffId: LIFF_ID });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const p = await liff.getProfile();
        setProfile(p);
        await loadOverview(p.userId);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  async function loadOverview(lineUserId) {
    const res = await fetch(`${API_URL}/api/overview?line_user_id=${encodeURIComponent(lineUserId)}`);
    const json = await res.json();
    setData(json);
  }

  async function loadTransactions() {
    if (!profile) return;
    const res = await fetch(`${API_URL}/api/transactions?line_user_id=${encodeURIComponent(profile.userId)}`);
    const json = await res.json();
    setTransactions(json.rows || []);
  }

  function exportCsv() {
    if (!profile) return;
    window.open(`${API_URL}/api/export.csv?line_user_id=${encodeURIComponent(profile.userId)}`, '_blank');
  }

  useEffect(() => {
    if (page === 'transactions') loadTransactions();
  }, [page, profile]);

  if (loading) {
    return <div className="screen-center"><div className="loading-card">🦝 กำลังเปิดสมุดบัญชี...</div></div>;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="mascot">🦝</div>
          <div>
            <strong>บัญชีง่ายๆ</strong>
            <span>Pastel Finance</span>
          </div>
        </div>
        <Nav page={page} setPage={setPage} />
      </aside>

      <main className="main">
        <header className="hero">
          <div>
            <div className="pill"><Sparkles size={16} /> วันนี้พร้อมจัดการเงินแล้ว</div>
            <h1>{pageTitle(page)}</h1>
            <p>สวัสดี {profile?.displayName || 'เพื่อนของแรคคูน'} ระบบสรุปข้อมูลจาก LINE ให้แล้ว</p>
          </div>
          <div className="profile-card">
            <div className="avatar">{profile?.pictureUrl ? <img src={profile.pictureUrl} /> : '🦝'}</div>
            <button onClick={exportCsv}><Download size={16} /> Export</button>
          </div>
        </header>

        {page === 'dashboard' && <Dashboard data={data} />}
        {page === 'transactions' && <Transactions rows={transactions} />}
        {page === 'payments' && <Payments data={data} />}
        {page === 'shared' && <Shared data={data} />}
        {page === 'settings' && <SettingsPage />}
      </main>

      <nav className="bottom-nav">
        <button onClick={() => setPage('dashboard')}><Home size={20} />หน้าหลัก</button>
        <button onClick={() => setPage('transactions')}><List size={20} />รายการ</button>
        <button onClick={() => setPage('payments')}><CreditCard size={20} />จ่าย</button>
        <button onClick={() => setPage('shared')}><Users size={20} />ค้าง</button>
      </nav>
    </div>
  );
}

function Nav({ page, setPage }) {
  const items = [
    ['dashboard', Home, 'หน้าหลัก'],
    ['transactions', List, 'รายการทั้งหมด'],
    ['payments', CreditCard, 'ต้องจ่าย'],
    ['shared', Users, 'ค้างเงิน'],
    ['settings', Settings, 'ตั้งค่า']
  ];

  return (
    <div className="nav-list">
      {items.map(([id, Icon, label]) => (
        <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>
          <Icon size={18} />{label}
        </button>
      ))}
    </div>
  );
}

function Dashboard({ data }) {
  const s = data?.summary || {};
  const category = data?.category || [];
  const recent = data?.recent || [];
  const due = data?.due || [];
  const shared = data?.shared || [];

  const income = Number(s.total_income || 0);
  const expense = Number(s.real_expense || 0);
  const pay = due.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const sharedTotal = shared.reduce((sum, r) => sum + Number(r.remaining_amount || 0), 0);

  return (
    <div className="dashboard-grid">
      <section className="metric-grid">
        <Metric emoji="💰" title="รายรับเดือนนี้" tone="mint" value={income} />
        <Metric emoji="🛒" title="รายจ่ายจริง" tone="strawberry" value={expense} />
        <Metric emoji="💳" title="ต้องจ่าย" tone="lavender" value={pay} />
        <Metric emoji="👥" title="รอรับคืน" tone="honey" value={sharedTotal} />
      </section>

      <section className="panel chart-panel">
        <div className="panel-title">
          <h2>🍰 รายจ่ายตามหมวด</h2>
          <span>เดือน {data?.month || '-'}</span>
        </div>
        <div className="chart-box">
          <ResponsiveContainer height={280} width="100%">
            <BarChart data={category}>
              <XAxis dataKey="category" />
              <Tooltip />
              <Bar dataKey="amount" fill="#ffb6b9" radius={[14, 14, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><h2>🧾 รายการล่าสุด</h2></div>
        <ListRows rows={recent.map(r => ({ title: r.item_name, sub: `${r.category || '-'} · ${r.purchase_date || ''}`, amount: r.type === 'income' ? r.amount : r.my_amount }))} />
      </section>

      <section className="panel">
        <div className="panel-title"><h2>🌙 ต้องจ่ายเร็ว ๆ นี้</h2></div>
        <ListRows rows={due.map(r => ({ title: r.item_name, sub: r.provider || 'รายการต้องจ่าย', amount: r.amount }))} />
      </section>

      <section className="panel">
        <div className="panel-title"><h2>🐾 คนค้างเงิน</h2></div>
        <ListRows rows={shared.map(r => ({ title: r.person_name, sub: 'รอรับคืน', amount: r.remaining_amount }))} />
      </section>
    </div>
  );
}

function Metric({ emoji, title, value, tone }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="metric-emoji">{emoji}</div>
      <p>{title}</p>
      <h3>{money(value)}</h3>
      <span>บาท</span>
    </div>
  );
}

function Transactions({ rows }) {
  return (
    <section className="panel full">
      <div className="panel-title"><h2>📒 รายการทั้งหมด</h2></div>
      <div className="table-list">
        {rows.length === 0 ? <p className="empty">ยังไม่มีรายการ</p> : rows.map(r => (
          <div className="table-row" key={r.id}>
            <div>
              <strong>{r.item_name}</strong>
              <small>{r.purchase_date} · {r.category || '-'} · {r.type}</small>
            </div>
            <b>{money(r.type === 'income' ? r.amount : r.my_amount)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}

function Payments({ data }) {
  const rows = data?.due || [];
  return (
    <section className="panel full">
      <div className="panel-title"><h2>💳 รายการต้องจ่าย</h2></div>
      <ListRows rows={rows.map(r => ({ title: r.item_name, sub: r.provider || 'ต้องจ่าย', amount: r.amount }))} />
    </section>
  );
}

function Shared({ data }) {
  const rows = data?.shared || [];
  return (
    <section className="panel full">
      <div className="panel-title"><h2>👥 คนค้างเงิน</h2></div>
      <ListRows rows={rows.map(r => ({ title: r.person_name, sub: 'รอรับคืน', amount: r.remaining_amount }))} />
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="panel full">
      <div className="panel-title"><h2>⚙️ ตั้งค่า</h2></div>
      <p className="empty">ตั้งค่าผ่าน LINE ได้ เช่น เมนู, เพิ่มบัญชี, เพิ่มบัตร, สรุปวันนี้</p>
    </section>
  );
}

function ListRows({ rows }) {
  if (!rows || rows.length === 0) return <p className="empty">ยังไม่มีข้อมูล</p>;
  return (
    <div className="list-rows">
      {rows.map((r, i) => (
        <div className="cute-row" key={i}>
          <div>
            <strong>{r.title}</strong>
            <small>{r.sub || '-'}</small>
          </div>
          <b>{money(r.amount)}</b>
        </div>
      ))}
    </div>
  );
}

function pageTitle(page) {
  return { dashboard: 'สมุดบัญชีของฉัน', transactions: 'รายการทั้งหมด', payments: 'รายการต้องจ่าย', shared: 'คนค้างเงิน', settings: 'ตั้งค่า' }[page] || 'สมุดบัญชีของฉัน';
}

function money(n) {
  return Number(n || 0).toLocaleString('th-TH');
}