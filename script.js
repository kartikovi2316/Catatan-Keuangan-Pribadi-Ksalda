const ACCOUNTS_LIST = ["Dompet", "Bank BCA 1", "Bank BCA 2", "Bank Jago", "Dana", "GoPay", "ShopeePay", "Saldo RDN", "Reksadana & Obligasi", "Saham"];
const LIQUID_ACCOUNTS = ["Dompet", "Bank BCA 1", "Bank BCA 2", "Bank Jago", "Dana", "GoPay", "ShopeePay", "Saldo RDN"];

const CATEGORIES = {
    income: ["Gaji", "Dividen", "Bonus & THR", "Bisnis & Freelance", "Investasi", "Kenaikan Nilai", "Penyesuaian Nilai", "Lainnya"],
    expense: ["Makanan & Minuman", "Internet & Data", "BPJS & Kesehatan", "Listrik & Utilitas", "Belanja & Sembako", "Gaya Lifestyle & Hobby", "Keluarga & Orang Tua", "Transportasi", "Penurunan Nilai", "Penyesuaian Nilai", "Lainnya"],
    hutang: ["Terima Pinjaman Baru", "Bayar Cicilan Hutang"],
    piutang: ["Beri Pinjaman Ke Orang", "Terima Pelunasan Piutang"]
};

const SEED_DATA = {
    transactions: [
        { id: "tx_1", type: "income", amount: 5000000, account: "Bank BCA 1", category: "Gaji", toAccount: "", date: "2026-02-28", notes: "Gaji Pokok Awal", tenor: 1, bunga: 0 },
        { id: "tx_2", type: "expense", amount: 1200000, account: "Bank BCA 1", category: "Belanja & Sembako", toAccount: "", date: "2026-03-05", notes: "Belanja bulanan", tenor: 1, bunga: 0 },
        { id: "tx_3", type: "income", amount: 6000000, account: "Bank BCA 1", category: "Gaji", toAccount: "", date: "2026-03-27", notes: "Gaji Bulan Kedua", tenor: 1, bunga: 0 },
        { id: "tx_4", type: "hutang", amount: 3000000, account: "Bank Jago", category: "Terima Pinjaman Baru", toAccount: "", date: "2026-04-01", notes: "Pinjaman Modal Bisnis", tenor: 12, bunga: 5 },
        { id: "tx_5", type: "expense", amount: 1500000, account: "Bank BCA 1", category: "Makanan & Minuman", toAccount: "", date: "2026-05-10", notes: "Makan keluarga besar", tenor: 1, bunga: 0 },
        { id: "tx_6", type: "income", amount: 5500000, account: "Bank BCA 2", category: "Bisnis & Freelance", toAccount: "", date: "2026-06-28", notes: "Hasil Freelance Desain", tenor: 1, bunga: 0 }
    ],
    startingBalances: {
        "Dompet": 500000, "Bank BCA 1": 3000000, "Bank BCA 2": 1500000, "Bank Jago": 1000000, "Dana": 300000, "GoPay": 200000, "ShopeePay": 100000, "Saldo RDN": 500000, "Reksadana & Obligasi": 1500000, "Saham": 1000000
    },
    github: { token: '', repo: '', path: 'fintrack_data.json' },
    recurringTransactions: [
        { id: "rec_1", type: "expense", amount: 150000, account: "Bank BCA 1", category: "Internet & Data", day: 2, notes: "Langganan WiFi" }
    ],
    financialMonthStartDay: 27,
    recurringPaidLogs: []
};

let state = { ...SEED_DATA };
let activeYear = 2026;
let activeMonth = new Date().getMonth(); 
let activeAccountFilter = 'all'; 
let activeHistoryTypeTab = 'all'; 
let incomeChartInstance = null; let expenseChartInstance = null; let trendChartInstance = null;

let sessionUndoStack = [];
let sessionRedoStack = [];

const MONTHS_NAMES = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function sanitizeState(data) {
    if (!data) data = {};
    if (!data.transactions) data.transactions = [];
    if (!data.startingBalances) data.startingBalances = { ...SEED_DATA.startingBalances };
    if (!data.github) data.github = { token: '', repo: '', path: 'fintrack_data.json' };
    if (!data.recurringTransactions) data.recurringTransactions = [];
    if (!data.recurringPaidLogs) data.recurringPaidLogs = [];
    if (data.financialMonthStartDay === undefined) data.financialMonthStartDay = 27;
    return data;
}

function showGHStatus(msg, colorClass = "text-slate-500") {
    const el = document.getElementById('ghSyncStatus');
    if (el) { el.className = `text-[10px] font-bold mt-2 italic ${colorClass}`; el.innerText = msg; }
}

function saveGitHubConfig() {
    state.github = {
        token: document.getElementById('ghToken').value.trim(),
        repo: document.getElementById('ghRepo').value.trim(),
        path: document.getElementById('ghPath').value.trim() || 'fintrack_data.json'
    };
    saveState(); showGHStatus("Kredensial disimpan!", "text-emerald-600");
    alert("Kredensial GitHub tersimpan.");
}

async function pushToGitHub() {
    const token = (state.github.token || '').trim();
    const repo = (state.github.repo || '').trim();
    const path = (state.github.path || 'fintrack_data.json').trim();
    if (!token || !repo) { alert("Harap isi Token dan Nama Repo!"); return; }
    showGHStatus("Mengunggah data...", "text-emerald-600");
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    let sha = null;
    try {
        const res = await fetch(url, { headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" } });
        if (res.ok) { const data = await res.json(); sha = data.sha; }
    } catch (err) {}
    try {
        const cleanState = { ...state }; cleanState.github = { token: '', repo: '', path: '' }; 
        const base64Content = btoa(unescape(encodeURIComponent(JSON.stringify(cleanState, null, 2))));
        const bodyPayload = { message: `Update: ${new Date().toISOString().slice(0,10)}`, content: base64Content };
        if (sha) bodyPayload.sha = sha;
        const putRes = await fetch(url, { method: "PUT", headers: { "Authorization": `token ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(bodyPayload) });
        if (putRes.ok) { showGHStatus("Upload Berhasil!", "text-emerald-600"); alert("Data Berhasil Diupload!"); }
        else { throw new Error(`Status ${putRes.status}`); }
    } catch (error) { showGHStatus("Gagal mengunggah data.", "text-rose-600"); alert("Error saat melakukan upload."); }
}

async function pullFromGitHub() {
    const token = (state.github.token || '').trim();
    const repo = (state.github.repo || '').trim();
    const path = (state.github.path || 'fintrack_data.json').trim();
    if (!token || !repo) { alert("Harap isi Kredensial Token dan Repo Anda!"); return; }
    if (!confirm("Tarik data dari GitHub? Data lokal saat ini akan tertimpa.")) return;
    showGHStatus("Mengunduh data...", "text-emerald-600");
    const url = `https://api.github.com/repos/${repo}/contents/${path}`;
    try {
        const res = await fetch(url, { headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        let parsedState = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\s/g, '')))));
        state = sanitizeState(parsedState);
        sessionUndoStack = []; sessionRedoStack = [];
        saveState(); refreshApp(); showGHStatus("Sinkronisasi Selesai!", "text-emerald-600");
        alert("🎉 Sinkronisasi Berhasil!"); switchTab('dashboard');
    } catch (err) { showGHStatus(`Gagal menarik data: ${err.message}`, "text-rose-600"); alert(`Gagal menarik data.`); }
}

window.addEventListener('DOMContentLoaded', () => {
    // 🔒 KUNCI UTAMA: Langsung matikan fungsi scroll saat struktur web siap
    document.body.classList.add('overflow-hidden');

    initYearDropdown(); initModalMonthGrid(); loadState(); initFormDropdowns(); initModalAccountGrid(); setCurrentDateInForm(); updateRecurringCategories();
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
        document.getElementById('darkModeIcon').className = "fa-solid fa-sun";
    }
    refreshApp(); initScrollDetection();
});

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('darkModeIcon').className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
}

function saveFinancialDayConfig() {
    const val = parseInt(document.getElementById('cfgMonthStartDay').value);
    if (val >= 1 && val <= 28) { state.financialMonthStartDay = val; saveState(); refreshApp(); alert(`Buku disetel tanggal ${val}.`); }
    else { alert("Masukkan rentang hari valid (1-28)!"); }
}

function getFinancialPeriodBounds(year, monthIndex) {
    const startDay = state.financialMonthStartDay || 27;
    let startYear = year; let startMonth = monthIndex - 1;
    if (startMonth < 0) { startMonth = 11; startYear--; }
    const startDate = new Date(startYear, startMonth, startDay);
    const endDate = new Date(year, monthIndex, startDay - 1, 23, 59, 59);
    return { startDate, endDate };
}

function formatInputNumber(input) {
    let value = input.value.replace(/\D/g, "");
    if (value === "") { input.value = ""; return; }
    input.value = new Intl.NumberFormat('id-ID').format(value);
}

function initScrollDetection() {
    window.addEventListener('scroll', () => {
        const btn = document.getElementById('scrollUpBtn');
        if (window.scrollY > 300) btn.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
        else btn.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
    });
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function openMonthModal() { document.getElementById('monthModal').classList.remove('hidden'); }
function closeMonthModal() { document.getElementById('monthModal').classList.add('hidden'); }
function openAccountModal() { document.getElementById('accountModal').classList.remove('hidden'); }
function closeAccountModal() { document.getElementById('accountModal').classList.add('hidden'); }
function openAllTxModal() { document.getElementById('allTxModal').classList.remove('hidden'); renderHistoryTable(true); }
function closeAllTxModal() { document.getElementById('allTxModal').classList.add('hidden'); }

function initModalMonthGrid() {
    const container = document.getElementById('modalMonthGrid');
    MONTHS_NAMES.forEach((mName, index) => {
        const btn = document.createElement('button'); btn.id = `btn-modal-month-${index}`; btn.onclick = () => setMonthFilter(index);
        btn.className = "w-full py-2 px-2 text-[11px] font-bold rounded-xl text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border border-slate-200/60 text-center";
        btn.innerText = mName; container.appendChild(btn);
    });
}

function setMonthFilter(m) {
    activeMonth = m; document.getElementById('lblCurrentMonth').innerText = m === -1 ? "Semua Bulan" : `${MONTHS_NAMES[m]}`;
    refreshApp(); closeMonthModal();
}

function initModalAccountGrid() {
    const container = document.getElementById('modalAccountGrid');
    ACCOUNTS_LIST.forEach(acc => {
        const btn = document.createElement('button'); btn.id = `btn-modal-account-${acc.replace(/\s+/g, '-')}`; btn.onclick = () => setAccountFilter(acc);
        btn.className = "w-full py-2 px-2 text-[11px] font-bold rounded-xl text-slate-600 dark:text-slate-200 bg-slate-50 dark:bg-slate-700 border border-slate-200/60 text-center";
        btn.innerText = acc; container.appendChild(btn);
    });
}

function setAccountFilter(acc) {
    activeAccountFilter = acc; document.getElementById('lblCurrentAccount').innerText = acc === 'all' ? "Semua Akun" : acc;
    closeAccountModal(); renderHistoryTable();
}

function setHistoryTypeTab(type) {
    activeHistoryTypeTab = type; const tabs = ['all', 'income', 'expense', 'transfer', 'hutang', 'piutang'];
    tabs.forEach(t => {
        const btn = document.getElementById(`btn-hist-type-${t}`);
        if(btn) {
            btn.className = t === type ? 
                "shrink-0 py-1 px-3 text-[11px] font-bold rounded-lg bg-white dark:bg-slate-600 text-emerald-700 dark:text-emerald-400 shadow-sm" : 
                "shrink-0 py-1 px-3 text-[11px] font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200";
        }
    });
    renderHistoryTable();
}

function loadState() {
    const localData = localStorage.getItem('fintrack_10y_state');
    if (localData) { try { state = sanitizeState(JSON.parse(localData)); } catch (e) { state = sanitizeState({}); } } 
    else { state = sanitizeState({}); }
    document.getElementById('cfgMonthStartDay').value = state.financialMonthStartDay || 27;
    updateUndoRedoButtonsVisibility();
}

function saveState() { localStorage.setItem('fintrack_10y_state', JSON.stringify(state)); updateUndoRedoButtonsVisibility(); }
function updateUndoRedoButtonsVisibility() {
    const btnUndo = document.getElementById('btnUndo'); const btnRedo = document.getElementById('btnRedo');
    if (sessionUndoStack.length > 0) btnUndo.classList.remove('hidden'); else btnUndo.classList.add('hidden');
    if (sessionRedoStack.length > 0) btnRedo.classList.remove('hidden'); else btnRedo.classList.add('hidden');
}

function executeUndo() {
    if (sessionUndoStack.length === 0) return;
    const action = sessionUndoStack.pop();
    if (action.type === 'ADD') { state.transactions = state.transactions.filter(t => t.id !== action.data.id); sessionRedoStack.push(action); } 
    else if (action.type === 'DELETE') { state.transactions.push(action.data); sessionRedoStack.push(action); }
    saveState(); refreshApp();
}

function executeRedo() {
    if (sessionRedoStack.length === 0) return;
    const action = sessionRedoStack.pop();
    if (action.type === 'ADD') { state.transactions.push(action.data); sessionUndoStack.push(action); } 
    else if (action.type === 'DELETE') { state.transactions = state.transactions.filter(t => t.id !== action.data.id); sessionUndoStack.push(action); }
    saveState(); refreshApp();
}

function resetToZero() {
    if (confirm("Apakah Anda yakin ingin mengosongkan sistem? Semua saldo disetel ke Rp 0.")) {
        state = {
            transactions: [],
            startingBalances: { "Dompet": 0, "Bank BCA 1": 0, "Bank BCA 2": 0, "Bank Jago": 0, "Dana": 0, "GoPay": 0, "ShopeePay": 0, "Saldo RDN": 0, "Reksadana & Obligasi": 0, "Saham": 0 },
            github: { token: '', repo: '', path: 'fintrack_data.json' }, recurringTransactions: [], financialMonthStartDay: 27, recurringPaidLogs: []
        };
        sessionUndoStack = []; sessionRedoStack = []; saveState(); refreshApp(); alert("🎉 Sukses dikosongkan!");
    }
}

function refreshApp() { 
    calculateKPIs(); renderAccountList(); updateHistoryCategoryFilterOptions(); renderHistoryTable(); 
    renderCharts(); renderRecurringDashboard(); renderCalendar(); renderInsightsAndForecast(); renderInvestmentTable();
}

function handleFilterChange() { activeYear = parseInt(document.getElementById('globalYear').value); refreshApp(); }

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`content-${tabId}`).classList.add('active');
    const tabs = ['dashboard', 'analysis', 'recurring', 'investment', 'input', 'history', 'settings'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            btn.className = t === tabId ? 
                "py-2 px-4 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 flex items-center space-x-2" : 
                "py-2 px-4 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 flex items-center space-x-2";
        }
    });
}

function formatRupiah(num) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
}

function toggleTxType(type) { updateCategoryOptions(); }

function initYearDropdown() {
    const select = document.getElementById('globalYear'); select.innerHTML = '';
    for (let year = 2026; year <= 2036; year++) {
        const opt = document.createElement('option'); opt.value = year; opt.innerText = `Tahun ${year}`; select.appendChild(opt);
    }
    activeYear = 2026; select.value = activeYear;
}

function initFormDropdowns() {
    const accountSelect = document.getElementById('txAccount'); const toAccountSelect = document.getElementById('txToAccount'); const recAccountSelect = document.getElementById('recAccount');
    if (accountSelect) {
        accountSelect.innerHTML = ''; toAccountSelect.innerHTML = ''; recAccountSelect.innerHTML = '';
        ACCOUNTS_LIST.forEach(acc => {
            const opt1 = document.createElement('option'); opt1.value = acc; opt1.innerText = acc; accountSelect.appendChild(opt1);
            const opt2 = document.createElement('option'); opt2.value = acc; opt2.innerText = acc; toAccountSelect.appendChild(opt2);
            const opt3 = document.createElement('option'); opt3.value = acc; opt3.innerText = acc; recAccountSelect.appendChild(opt3);
        });
    }
    updateCategoryOptions();
}

function setCurrentDateInForm() {
    const today = new Date(); const yyyy = today.getFullYear(); const mm = String(today.getMonth() + 1).padStart(2, '0'); const dd = String(today.getDate()).padStart(2, '0');
    const el = document.getElementById('txDate'); if (el) el.value = `${yyyy}-${mm}-${dd}`;
}

function updateCategoryOptions() {
    const typeEl = document.getElementById('txType'); const catSelect = document.getElementById('txCategory');
    const divToAcc = document.getElementById('divToAccount'); const divTenor = document.getElementById('divTenorHutang'); const divBunga = document.getElementById('divBungaHutang');
    if (!typeEl || !catSelect) return;
    const type = typeEl.value; catSelect.innerHTML = '';
    if (divTenor) divTenor.classList.add('hidden');
    if (divBunga) divBunga.classList.add('hidden');
    
    if (type === 'transfer') {
        if (divToAcc) divToAcc.classList.remove('hidden');
        const opt = document.createElement('option'); opt.value = 'Transfer Dana'; opt.innerText = 'Transfer Dana'; catSelect.appendChild(opt);
    } else {
        if (divToAcc) divToAcc.classList.add('hidden');
        if (type === 'hutang') { if (divTenor) divTenor.classList.remove('hidden'); if (divBunga) divBunga.classList.remove('hidden'); }
        let targetCat = CATEGORIES[type] || ['Lainnya'];
        targetCat.forEach(cat => {
            const opt = document.createElement('option'); opt.value = cat; opt.innerText = cat; catSelect.appendChild(opt);
        });
    }
}

function updateRecurringCategories() {
    const typeEl = document.getElementById('recType'); const catSelect = document.getElementById('recCategory');
    if (!typeEl || !catSelect) return;
    catSelect.innerHTML = '';
    (CATEGORIES[typeEl.value] || ['Lainnya']).forEach(cat => {
        const opt = document.createElement('option'); opt.value = cat; opt.innerText = cat; catSelect.appendChild(opt);
    });
}

function getFilteredTransactions() {
    return state.transactions.filter(t => {
        if (activeMonth === -1) return new Date(t.date).getFullYear() === activeYear;
        const tDate = new Date(t.date); const { startDate, endDate } = getFinancialPeriodBounds(activeYear, activeMonth);
        return tDate >= startDate && tDate <= endDate;
    });
}

function getLiveBalances() {
    let balances = { ...state.startingBalances };
    state.transactions.forEach(t => {
        if (balances[t.account] !== undefined) {
            if (t.type === 'income') balances[t.account] += t.amount;
            else if (t.type === 'expense') balances[t.account] -= t.amount;
            else if (t.type === 'transfer') {
                balances[t.account] -= t.amount;
                if (t.toAccount && balances[t.toAccount] !== undefined) balances[t.toAccount] += t.amount;
            } else if (t.type === 'hutang') {
                if (t.category === "Terima Pinjaman Baru") balances[t.account] += t.amount;
                else if (t.category === "Bayar Cicilan Hutang") balances[t.account] -= t.amount;
            } else if (t.type === 'piutang') {
                if (t.category === "Beri Pinjaman Ke Orang") balances[t.account] -= t.amount;
                else if (t.category === "Terima Pelunasan Piutang") balances[t.account] += t.amount;
            }
        }
    });
    return balances;
}

// FUNGSI PEMBANTU UNTUK MENGHITUNG SALDO NET WORTH HISTORIS PADA TANGGAL TERTENTU
function getNetWorthAtDate(targetDate) {
    let balances = { ...state.startingBalances };
    state.transactions.forEach(t => {
        if (new Date(t.date) <= targetDate && balances[t.account] !== undefined) {
            if (t.type === 'income') balances[t.account] += t.amount;
            else if (t.type === 'expense') balances[t.account] -= t.amount;
            else if (t.type === 'transfer') {
                balances[t.account] -= t.amount;
                if (t.toAccount && balances[t.toAccount] !== undefined) balances[t.toAccount] += t.amount;
            } else if (t.type === 'hutang') {
                if (t.category === "Terima Pinjaman Baru") balances[t.account] += t.amount;
                else if (t.category === "Bayar Cicilan Hutang") balances[t.account] -= t.amount;
            } else if (t.type === 'piutang') {
                if (t.category === "Beri Pinjaman Ke Orang") balances[t.account] -= t.amount;
                else if (t.category === "Terima Pelunasan Piutang") balances[t.account] += t.amount;
            }
        }
    });
    return Object.values(balances).reduce((a, b) => a + b, 0);
}

function calculateKPIs() {
    const filtered = getFilteredTransactions();
    let incSum = 0; let expSum = 0; let totalHutang = 0; let totalPiutang = 0;

    state.transactions.forEach(t => {
        if (t.type === 'hutang') {
            if (t.category === "Terima Pinjaman Baru") totalHutang += t.amount;
            else if (t.category === "Bayar Cicilan Hutang") totalHutang -= t.amount;
        } else if (t.type === 'piutang') {
            if (t.category === "Beri Pinjaman Ke Orang") totalPiutang += t.amount;
            else if (t.category === "Terima Pelunasan Piutang") totalPiutang -= t.amount;
        }
    });

    filtered.forEach(t => {
        if (t.type === 'income') incSum += t.amount;
        else if (t.type === 'expense') expSum += t.amount;
        else if (t.type === 'hutang' && t.category === "Terima Pinjaman Baru") incSum += t.amount;
        else if (t.type === 'hutang' && t.category === "Bayar Cicilan Hutang") expSum += t.amount;
        else if (t.type === 'piutang' && t.category === "Terima Pelunasan Piutang") incSum += t.amount;
        else if (t.type === 'piutang' && t.category === "Beri Pinjaman Ke Orang") expSum += t.amount;
    });

    document.getElementById('kpiIncome').innerText = formatRupiah(incSum);
    document.getElementById('kpiExpense').innerText = formatRupiah(expSum);
    const scopeText = activeMonth === -1 ? `Tahun ${activeYear}` : `Bulan ${MONTHS_NAMES[activeMonth]}`;
    document.getElementById('kpiIncomeSub').innerText = scopeText;
    document.getElementById('kpiExpenseSub').innerText = scopeText;

    const balances = getLiveBalances();
    let totalNetWorth = 0; let liquidAssets = 0;
    Object.keys(balances).forEach(acc => {
        totalNetWorth += balances[acc];
        if(LIQUID_ACCOUNTS.includes(acc)) liquidAssets += balances[acc];
    });

    document.getElementById('kpiLiquid').innerText = formatRupiah(liquidAssets);
    document.getElementById('kpiNetWorth').innerText = formatRupiah(totalNetWorth);
    document.getElementById('dashTotalHutang').innerText = formatRupiah(totalHutang);
    document.getElementById('dashTotalPiutang').innerText = formatRupiah(totalPiutang);

    document.getElementById('lblLiveSahamBalance').innerText = formatRupiah(balances["Saham"] || 0);
    document.getElementById('lblLiveInvBalance').innerText = formatRupiah(balances["Reksadana & Obligasi"] || 0);
    document.getElementById('lblTotalInvProfitLoss').innerText = formatRupiah(totalNetWorth);

    const landTarget = 35000000; const houseTarget = 100000000;
    const landPct = Math.min(100, Math.round((totalNetWorth / landTarget) * 100));
    const housePct = Math.min(100, Math.round((totalNetWorth / houseTarget) * 100));
    document.getElementById('goalLandPercent').innerText = `${landPct}%`;
    document.getElementById('goalLandBar').style.width = `${landPct}%`;
    document.getElementById('goalHousePercent').innerText = `${housePct}%`;
    document.getElementById('goalHouseBar').style.width = `${housePct}%`;

    // ==========================================
    // 🛡️ REVISI: BENTENG DANA DARURAT DARI REKSADANA & OBLIGASI
    // ==========================================
    // Mengambil nominal khusus dari akun Reksadana & Obligasi
    let emergencyFundAmt = balances["Reksadana & Obligasi"] || 0;
    document.getElementById('lblEmergencyFund').innerText = formatRupiah(emergencyFundAmt);
    
    // Hitung status ketahanan bulan secara dinamis dari dana cadangan ini
    if (expSum > 0) {
        let runwayBulan = (emergencyFundAmt / expSum).toFixed(1);
        document.getElementById('lblEmergencyStatus').innerText = `Mencukupi ${runwayBulan} bulan pengeluaran (Bersumber dari Reksadana & Obligasi).`;
    } else {
        document.getElementById('lblEmergencyStatus').innerText = `Aman, cadangan utuh & belum terdeteksi pengeluaran bulan ini.`;
    }
    
    // KALKULASI RASIO SEKTOR ASET RIIL
    let pctLiquid = totalNetWorth > 0 ? Math.round((liquidAssets / totalNetWorth) * 100) : 0;
    let pctInv = totalNetWorth > 0 ? Math.round(((balances["Reksadana & Obligasi"] || 0) / totalNetWorth) * 100) : 0;
    let pctSaham = totalNetWorth > 0 ? Math.round(((balances["Saham"] || 0) / totalNetWorth) * 100) : 0;
    
    document.getElementById('ratioLiquidBar').style.width = `${pctLiquid}%`;
    document.getElementById('ratioInvBar').style.width = `${pctInv}%`;
    document.getElementById('ratioSahamBar').style.width = `${pctSaham}%`;
    
    document.getElementById('lblRatioLiquid').innerText = `Lancar: ${pctLiquid}%`;
    document.getElementById('lblRatioInv').innerText = `Inv: ${pctInv}%`;
    document.getElementById('lblRatioSaham').innerText = `Saham: ${pctSaham}%`;
}

function renderAccountList() {
    const container = document.getElementById('accountListContainer'); container.innerHTML = '';
    const balances = getLiveBalances();
    ACCOUNTS_LIST.forEach(acc => {
        container.innerHTML += `
            <div class="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
                <span class="text-xs font-bold text-slate-700 dark:text-slate-200">${acc}</span>
                <span class="text-xs font-extrabold">${formatRupiah(balances[acc] || 0)}</span>
            </div>
        `;
    });
}

function saveTransaction(e) {
    e.preventDefault();
    const type = document.getElementById('txType').value;
    const amount = parseInt(document.getElementById('txAmount').value.replace(/\./g, ""));
    const account = document.getElementById('txAccount').value;
    const category = document.getElementById('txCategory').value;
    const toAccount = document.getElementById('txToAccount').value;
    const date = document.getElementById('txDate').value;
    const notes = document.getElementById('txNotes').value || "-";
    const tenor = document.getElementById('txTenor') ? parseInt(document.getElementById('txTenor').value) || 12 : 12;
    const bunga = document.getElementById('txBunga') ? parseFloat(document.getElementById('txBunga').value) || 0 : 0;
    
    const newTx = { id: 'tx_' + Date.now(), type, amount, account, category, toAccount, date, notes, tenor, bunga };
    state.transactions.push(newTx);
    sessionUndoStack.push({ type: 'ADD', data: newTx }); sessionRedoStack = [];
    saveState(); refreshApp(); alert("Transaksi Berhasil Dicatat!");
    e.target.reset(); setCurrentDateInForm(); updateCategoryOptions();
}

function deleteTransaction(id) {
    if (confirm("Hapus transaksi ini?")) {
        const targetTx = state.transactions.find(t => t.id === id);
        if (targetTx) { sessionUndoStack.push({ type: 'DELETE', data: targetTx }); sessionRedoStack = []; }
        state.transactions = state.transactions.filter(t => t.id !== id);
        saveState(); refreshApp();
    }
}

function saveRecurringTemplate(e) {
    e.preventDefault();
    const notes = document.getElementById('recNotes').value; const type = document.getElementById('recType').value; const day = parseInt(document.getElementById('recDay').value);
    const account = document.getElementById('recAccount').value; const category = document.getElementById('recCategory').value;
    const amount = parseInt(document.getElementById('recAmount').value.replace(/\./g, ""));
    state.recurringTransactions.push({ id: 'rec_' + Date.now(), type, amount, account, category, day, notes });
    saveState(); refreshApp(); alert("Template Disimpan!"); e.target.reset(); updateRecurringCategories();
}

function triggerPayRecurring(recId) {
    const template = state.recurringTransactions.find(r => r.id === recId); if (!template) return;
    const targetMonth = activeMonth === -1 ? new Date().getMonth() : activeMonth;
    const logKey = `${recId}_${activeYear}-${String(targetMonth+1).padStart(2,'0')}`; state.recurringPaidLogs.push(logKey);
    const dateStr = `${activeYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(template.day).padStart(2, '0')}`;
    const newTx = { id: 'tx_rec_' + Date.now(), type: template.type, amount: template.amount, account: template.account, category: template.category, toAccount: "", date: dateStr, notes: `[Rutin] ${template.notes}`, tenor: 1, bunga: 0 };
    state.transactions.push(newTx);
    sessionUndoStack.push({ type: 'ADD', data: newTx }); sessionRedoStack = [];
    saveState(); refreshApp(); alert(`Tagihan "${template.notes}" Dibayar!`);
}

function removeRecurringTemplate(id) {
    if(confirm("Hapus template tagihan rutin ini?")) { state.recurringTransactions = state.recurringTransactions.filter(r => r.id !== id); saveState(); refreshApp(); }
}

function renderRecurringDashboard() {
    const tbody = document.getElementById('recurringTableBody'); tbody.innerHTML = '';
    if (!state.recurringTransactions || state.recurringTransactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 italic">Belum ada tagihan rutin.</td></tr>`; return;
    }
    const currentMonthIdx = activeMonth === -1 ? new Date().getMonth() : activeMonth;
    const currentPeriodKey = `${activeYear}-${String(currentMonthIdx+1).padStart(2,'0')}`;
    state.recurringTransactions.forEach(rec => {
        const isPaid = state.recurringPaidLogs.includes(`${rec.id}_${currentPeriodKey}`);
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 text-xs border-b dark:border-slate-700">
                <td class="p-2 font-bold whitespace-nowrap">Tgl ${rec.day}</td> <td class="p-2 font-medium">${rec.notes}</td>
                <td class="p-2 text-right font-bold whitespace-nowrap">${formatRupiah(rec.amount)}</td>
                <td class="p-2 text-center whitespace-nowrap"><span class="px-2 py-0.5 rounded text-[9px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">${isPaid ? 'Sudah' : 'Belum'}</span></td>
                <td class="p-2 text-center space-x-1 whitespace-nowrap">${!isPaid ? `<button onclick="triggerPayRecurring('${rec.id}')" class="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">Bayar</button>` : ''}<button onclick="removeRecurringTemplate('${rec.id}')" class="text-rose-500"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `;
    });
}

function renderCalendar() {
    const container = document.getElementById('calendarGridContainer'); container.innerHTML = '';
    const viewMonth = activeMonth === -1 ? new Date().getMonth() : activeMonth;
    const firstDayIndex = new Date(activeYear, viewMonth, 1).getDay(); const totalDays = new Date(activeYear, viewMonth + 1, 0).getDate();
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div'); emptyCell.className = "p-1.5 bg-slate-100/40 dark:bg-slate-800/20 rounded-xl"; container.appendChild(emptyCell);
    }
    for (let day = 1; day <= totalDays; day++) {
        const currentDayStr = `${activeYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dailyTxs = state.transactions.filter(t => t.date === currentDayStr); const cell = document.createElement('div');
        cell.className = "p-1.5 bg-slate-50 dark:bg-slate-700 border dark:border-slate-600 rounded-xl min-h-[42px] flex flex-col justify-between items-center text-xs";
        cell.innerHTML = `<span class="font-bold text-slate-400 text-[10px]">${day}</span>`;
        if (dailyTxs.length > 0) {
            cell.innerHTML += `<div class="flex space-x-1 mt-0.5"><span class="w-1 h-1 bg-emerald-500 rounded-full"></span></div>`;
            cell.className += " cursor-pointer bg-emerald-50/60 dark:bg-emerald-900/40"; cell.onclick = () => openCalendarTxModal(currentDayStr, dailyTxs);
        }
        container.appendChild(cell);
    }
}

function openCalendarTxModal(dateStr, transactions) {
    document.getElementById('lblCalendarModalDate').innerText = dateStr; const contentContainer = document.getElementById('calendarModalContent'); contentContainer.innerHTML = '';
    transactions.forEach(t => {
        const isTransfer = t.type === 'transfer'; const isInc = !isTransfer && (t.type === 'income' || (t.type === 'hutang' && t.category === "Terima Pinjaman Baru") || (t.type === 'piutang' && t.category === "Terima Pelunasan Piutang"));
        contentContainer.innerHTML += `
            <div class="p-3 bg-slate-50 dark:bg-slate-700/40 border border-slate-150 dark:border-slate-600 rounded-xl flex justify-between items-center text-xs">
                <div class="space-y-0.5">
                    <span class="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-600 w-max block">${isTransfer ? 'Transfer' : t.category}</span>
                    <p class="font-bold text-slate-800 dark:text-slate-100">${isTransfer ? `${t.notes} (${t.account} ➔ ${t.toAccount})` : t.notes}</p>
                </div>
                <span class="font-extrabold text-right whitespace-nowrap ${isTransfer ? 'text-blue-500' : (isInc ? 'text-emerald-600' : 'text-rose-600')}">
                    ${isTransfer ? '⇄ ' : (isInc ? '+' : '-')}${formatRupiah(t.amount)}
                </span>
            </div>
        `;
    });
    document.getElementById('calendarTxModal').classList.remove('hidden');
}
function closeCalendarTxModal() { document.getElementById('calendarTxModal').classList.add('hidden'); }

// ==========================================
// 🔴 PEMBARUAN DASHBOARD INSIGHT BUKU BESAR
// ==========================================
function renderInsightsAndForecast() {
    const currentMonthIdx = activeMonth === -1 ? new Date().getMonth() : activeMonth;
    const currentPeriodKey = `${activeYear}-${String(currentMonthIdx+1).padStart(2,'0')}`;
    const currentTxs = getFilteredTransactions();
    
    const expenses = currentTxs.filter(t => t.type === 'expense');
    const incomes = currentTxs.filter(t => t.type === 'income');
    
    let totalExpAmt = expenses.reduce((a, b) => a + b.amount, 0);
    let totalIncAmt = incomes.reduce((a, b) => a + b.amount, 0);

    let catMap = {}; expenses.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
    let topCat = "-"; let maxCatAmt = 0; Object.keys(catMap).forEach(k => { if(catMap[k] > maxCatAmt) { maxCatAmt = catMap[k]; topCat = k; } });
    document.getElementById('lblTopExpenseCategory').innerText = topCat;

    let dayMap = {}; expenses.forEach(e => { dayMap[e.date] = (dayMap[e.date] || 0) + e.amount; });
    let topDay = "-"; let maxDayAmt = 0; Object.keys(dayMap).forEach(d => { if(dayMap[d] > maxDayAmt) { maxDayAmt = dayMap[d]; topDay = d; } });
    document.getElementById('lblMostExpensiveDay').innerText = topDay;

    document.getElementById('lblAvgDailyExpense').innerText = formatRupiah(totalExpAmt / 30);
    document.getElementById('lblAvgMonthlyIncome').innerText = formatRupiah(totalIncAmt);

    let balances = getLiveBalances();
    let currentNetWorth = Object.values(balances).reduce((a,b)=>a+b, 0);
    let liquidAssets = 0; LIQUID_ACCOUNTS.forEach(acc => liquidAssets += (balances[acc] || 0));

    let unexecutedRecurringAmt = 0;
    if(state.recurringTransactions) {
        state.recurringTransactions.forEach(rec => {
            if (!state.recurringPaidLogs.includes(`${rec.id}_${currentPeriodKey}`)) {
                if(rec.type === 'income') unexecutedRecurringAmt += rec.amount;
                else if(rec.type === 'expense') unexecutedRecurringAmt -= rec.amount;
            }
        });
    }

    let totalBebanCicilanHutang = 0;
    let totalUtangAktif = 0;
    state.transactions.forEach(t => {
        if (t.type === 'hutang') {
            if (t.category === "Terima Pinjaman Baru") {
                totalUtangAktif += t.amount;
                let tenorBulan = t.tenor || 12; let persenBunga = t.bunga || 0;
                let totalPembiayaan = t.amount + (t.amount * (persenBunga / 100));
                totalBebanCicilanHutang += (totalPembiayaan / tenorBulan);
            } else if (t.category === "Bayar Cicilan Hutang") {
                totalUtangAktif -= t.amount;
            }
        }
    });

    let hasilForecast = currentNetWorth + unexecutedRecurringAmt - totalBebanCicilanHutang;
    document.getElementById('lblForecastBalance').innerText = formatRupiah(hasilForecast);

    // KODE GENERASI INSIGHT KUNCI SECARA REALTIME & BERMAKNA
    const insightContainer = document.getElementById('insightContainer'); insightContainer.innerHTML = '';
    
    // 1. Savings Rate
    let savingsRate = totalIncAmt > 0 ? Math.round(((totalIncAmt - totalExpAmt) / totalIncAmt) * 100) : 0;
    let savingsColor = savingsRate >= 20 ? 'text-emerald-400' : (savingsRate > 0 ? 'text-amber-400' : 'text-rose-400');
    insightContainer.innerHTML += `
        <div class="bg-white/5 dark:bg-slate-800/60 p-3 rounded-xl border border-white/10">
            <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Savings Rate</span>
            <span class="text-xs font-extrabold block mt-0.5 ${savingsColor}">${savingsRate}% Simpanan</span>
            <p class="text-[9px] text-slate-400 mt-1">${savingsRate > 0 ? 'Kondisi surplus dana' : 'Buku besar defisit'}</p>
        </div>
    `;

    // 2. Debt-to-Asset Ratio
    let debtToAsset = currentNetWorth > 0 ? Math.round((totalUtangAktif / currentNetWorth) * 100) : 0;
    let debtColor = debtToAsset > 50 ? 'text-rose-400' : (debtToAsset > 30 ? 'text-amber-400' : 'text-emerald-400');
    insightContainer.innerHTML += `
        <div class="bg-white/5 dark:bg-slate-800/60 p-3 rounded-xl border border-white/10">
            <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Debt-to-Asset Ratio</span>
            <span class="text-xs font-extrabold block mt-0.5 ${debtColor}">${debtToAsset}% Leverage</span>
            <p class="text-[9px] text-slate-400 mt-1">${debtToAsset > 50 ? '⚠️ Risiko beban tinggi' : 'Rasio batas aman'}</p>
        </div>
    `;

    // 3. Runway Kas Likuid (Bulan)
    let runwayBulan = totalExpAmt > 0 ? (liquidAssets / totalExpAmt).toFixed(1) : '∞';
    let runwayColor = runwayBulan < 3 ? 'text-rose-400' : (runwayBulan < 6 ? 'text-amber-400' : 'text-emerald-400');
    insightContainer.innerHTML += `
        <div class="bg-white/5 dark:bg-slate-800/60 p-3 rounded-xl border border-white/10">
            <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Runway Kas Likuid</span>
            <span class="text-xs font-extrabold block mt-0.5 ${runwayColor}">${runwayBulan} Bulan</span>
            <p class="text-[9px] text-slate-400 mt-1">Ketahanan daya beli kas</p>
        </div>
    `;

    // 4. Beban Kewajiban Cicilan
    insightContainer.innerHTML += `
        <div class="bg-white/5 dark:bg-slate-800/60 p-3 rounded-xl border border-white/10">
            <span class="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Cicilan Hutang Aktif</span>
            <span class="text-xs font-extrabold text-orange-400 block mt-0.5">${formatRupiah(totalBebanCicilanHutang)}/bln</span>
            <p class="text-[9px] text-slate-400 mt-1">Total pokok + porsi bunga</p>
        </div>
    `;
}

function renderHistoryTable(renderInPopup = false) {
    const tbody = renderInPopup ? document.getElementById('popupTableBody') : document.getElementById('historyTableBody'); if(!tbody) return;
    tbody.innerHTML = '';
    const periodType = document.getElementById('histPeriodFilter').value;
    document.getElementById('customRangeFields').className = periodType === 'custom' ? "grid grid-cols-2 gap-2 max-w-xs mb-4 text-xs" : "hidden";
    
    let filtered = state.transactions; const today = new Date();
    if (periodType === 'month-filter') filtered = getFilteredTransactions();
    else if (periodType === 'today') filtered = state.transactions.filter(t => t.date === today.toISOString().slice(0, 10));
    else if (periodType === 'week') {
        let past = new Date(); past.setDate(today.getDate() - 7); filtered = state.transactions.filter(t => new Date(t.date) >= past && new Date(t.date) <= today);
    } else if (periodType === 'month') {
        filtered = state.transactions.filter(t => new Date(t.date).getMonth() === today.getMonth() && new Date(t.date).getFullYear() === today.getFullYear());
    } else if (periodType === 'year') {
        filtered = state.transactions.filter(t => new Date(t.date).getFullYear() === today.getFullYear());
    } else if (periodType === 'custom') {
        const s = document.getElementById('customStart').value; const e = document.getElementById('customEnd').value;
        if(s && e) filtered = state.transactions.filter(t => t.date >= s && t.date <= e);
    }

    const searchQ = document.getElementById('txSearch').value.toLowerCase();
    const itemsToShow = filtered.filter(t => {
        const matchSearch = t.notes.toLowerCase().includes(searchQ) || t.category.toLowerCase().includes(searchQ) || t.amount.toString().includes(searchQ);
        const matchAccount = activeAccountFilter === 'all' || t.account === activeAccountFilter || t.toAccount === activeAccountFilter;
        const matchCat = document.getElementById('histCategoryFilter').value === 'all' || t.category === document.getElementById('histCategoryFilter').value;
        const matchTabType = activeHistoryTypeTab === 'all' || t.type === activeHistoryTypeTab;
        return matchSearch && matchAccount && matchCat && matchTabType;
    });

    itemsToShow.sort((a, b) => new Date(b.date) - new Date(a.date));
    const finalSlice = renderInPopup ? itemsToShow : itemsToShow.slice(0, 10);
    if(document.getElementById('lblPopupCount')) document.getElementById('lblPopupCount').innerText = itemsToShow.length;
    document.getElementById('divExpandHistory').className = (!renderInPopup && itemsToShow.length > 10) ? "text-center pt-3 border-t border-slate-100 dark:border-slate-700 mt-3" : "hidden";

    if(finalSlice.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center italic text-slate-400">Jurnal kosong.</td></tr>`; return; }
    finalSlice.forEach(t => {
        const isTransfer = t.type === 'transfer';
        const isInc = !isTransfer && (t.type === 'income' || (t.type === 'hutang' && t.category === "Terima Pinjaman Baru") || (t.type === 'piutang' && t.category === "Terima Pelunasan Piutang"));
        
        let labelKategori = isTransfer ? 'Mutasi Rekening' : t.category;
        let deskripsiMemo = isTransfer ? `${t.notes} (Asal: ${t.account} ➔ Tujuan: ${t.toAccount})` : t.notes;
        if(t.type === 'hutang' && t.category === 'Terima Pinjaman Baru') deskripsiMemo += ` [Tenor: ${t.tenor} Bln, Bunga: ${t.bunga}%]`;
        
        let warnaNominal = isTransfer ? 'text-blue-500 dark:text-blue-400' : (isInc ? 'text-emerald-600' : 'text-rose-600');
        let simbolNominal = isTransfer ? '⇄ ' : (isInc ? '+' : '-');

        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 text-xs border-b dark:border-slate-700 group">
                <td class="p-3 font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">${t.account}</td>
                <td class="p-3 whitespace-nowrap text-slate-400">${t.date}</td>
                <td class="p-3 whitespace-nowrap"><span class="px-2 py-0.5 rounded font-bold bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200">${labelKategori}</span></td>
                <td class="p-3 text-slate-500 dark:text-slate-300 max-w-[220px] truncate font-medium">${deskripsiMemo}</td>
                <td class="p-3 text-right font-extrabold whitespace-nowrap ${warnaNominal}">${simbolNominal}${formatRupiah(t.amount)}</td>
                <td class="p-3 text-center whitespace-nowrap"><button onclick="deleteTransaction('${t.id}')" class="text-rose-400 hover:text-rose-600"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
        `;
    });
}

function updateHistoryCategoryFilterOptions() {
    const filterDropdown = document.getElementById('histCategoryFilter'); if(!filterDropdown) return;
    filterDropdown.innerHTML = '<option value="all">Semua Kategori</option>';
    let cats = new Set(); state.transactions.forEach(t => cats.add(t.category)); cats.forEach(c => filterDropdown.innerHTML += `<option value="${c}">${c}</option>`);
}

// ==========================================
// 🔴 PEMBARUAN GRAFIK PERTUMBUHAN NET WORTH RIIL
// ==========================================
function renderCharts() {
    const filtered = getFilteredTransactions();
    let incData = {}; let expData = {};
    CATEGORIES.income.forEach(c => incData[c] = 0); CATEGORIES.expense.forEach(c => expData[c] = 0);
    
    filtered.forEach(t => {
        if (t.type === 'income') incData[t.category] = (incData[t.category] || 0) + t.amount;
        if (t.type === 'expense') expData[t.category] = (expData[t.category] || 0) + t.amount;
        if (t.type === 'hutang' && t.category === "Terima Pinjaman Baru") incData['Lainnya'] = (incData['Lainnya'] || 0) + t.amount;
        if (t.type === 'hutang' && t.category === "Bayar Cicilan Hutang") expData['Lainnya'] = (expData['Lainnya'] || 0) + t.amount;
    });

    const incWrapper = document.getElementById('chartIncomeWrapper');
    if (incWrapper) {
        incWrapper.innerHTML = `<canvas id="chartIncome"></canvas>`; if (incomeChartInstance) incomeChartInstance.destroy();
        incomeChartInstance = new Chart(document.getElementById('chartIncome').getContext('2d'), {
            type: 'doughnut', data: { labels: Object.keys(incData), datasets: [{ data: Object.values(incData), backgroundColor: ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const expWrapper = document.getElementById('chartExpenseWrapper');
    if (expWrapper) {
        expWrapper.innerHTML = `<canvas id="chartExpense"></canvas>`; if (expenseChartInstance) expenseChartInstance.destroy();
        expenseChartInstance = new Chart(document.getElementById('chartExpense').getContext('2d'), {
            type: 'doughnut', data: { labels: Object.keys(expData), datasets: [{ data: Object.values(expData), backgroundColor: ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#ffedd5'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    const incList = document.getElementById('incomeChartList');
    if (incList) {
        incList.innerHTML = '<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Peringkat Sumber Pendapatan:</p>';
        let sortedInc = Object.entries(incData).filter(item => item[1] > 0).sort((a,b) => b[1] - a[1]);
        if(sortedInc.length === 0) incList.innerHTML += `<p class="text-[11px] italic text-slate-400">Belum ada dana masuk.</p>`;
        else {
            sortedInc.forEach(([cat, val], idx) => {
                let isTop = idx === 0; incList.innerHTML += `<div class="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700/60 ${isTop ? 'font-bold text-emerald-600 dark:text-emerald-400 text-xs' : 'text-slate-600 dark:text-slate-400 text-[11px]'}"><span>${isTop ? '🏆 ' : `${idx + 1}. `}${cat}</span><span>${formatRupiah(val)}</span></div>`;
            });
        }
    }

    const expList = document.getElementById('expenseChartList');
    if (expList) {
        expList.innerHTML = '<p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Peringkat Alokasi Pengeluaran:</p>';
        let sortedExp = Object.entries(expData).filter(item => item[1] > 0).sort((a,b) => b[1] - a[1]);
        if(sortedExp.length === 0) expList.innerHTML += `<p class="text-[11px] italic text-slate-400">Belum ada dana keluar.</p>`;
        else {
            sortedExp.forEach(([cat, val], idx) => {
                let isTop = idx === 0; expList.innerHTML += `<div class="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700/60 ${isTop ? 'font-bold text-orange-600 dark:text-orange-400 text-xs' : 'text-slate-600 dark:text-slate-400 text-[11px]'}"><span>${isTop ? '🔥 ' : `${idx + 1}. `}${cat}</span><span>${formatRupiah(val)}</span></div>`;
            });
        }
    }

    // LOGIKA PERBAIKAN GRAFIK TREN NET WORTH RIIL BERDASARKAN ALUR TANGGAL LEDGER
    const trendCtx = document.getElementById('chartNetWorthTrend');
    if (trendCtx) {
        if (trendChartInstance) trendChartInstance.destroy();
        
        let labelBulan = [];
        let dataNetWorthRiil = [];
        
        // Buat 6 bulan ke belakang dari bulan aktif sekarang
        let targetMonth = activeMonth === -1 ? new Date().getMonth() : activeMonth;
        for (let i = 5; i >= 0; i--) {
            let mIdx = targetMonth - i; let yOffset = activeYear;
            if (mIdx < 0) { mIdx += 12; yOffset -= 1; }
            
            // Dapatkan tanggal batas akhir bulan finansial terkait
            const { endDate } = getFinancialPeriodBounds(yOffset, mIdx);
            
            labelBulan.push(`${MONTHS_NAMES[mIdx].slice(0, 3)} ${String(yOffset).slice(2)}`);
            dataNetWorthRiil.push(getNetWorthAtDate(endDate));
        }

        trendChartInstance = new Chart(trendCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: labelBulan,
                datasets: [{
                    label: 'Net Worth Riil', data: dataNetWorthRiil, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2.5, fill: true, tension: 0.25, pointBackgroundColor: '#10b981', pointRadius: 4, pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
                scales: {
                    y: {
                        ticks: { callback: function(value) { return value >= 1000000 ? (value / 1000000) + 'M' : formatRupiah(value); } },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }
}

function submitStockReturn(e) {
    e.preventDefault(); const pct = parseFloat(document.getElementById('inputStockReturn').value);
    if (isNaN(pct) || pct === 0) { alert("Masukkan angka valid!"); return; }
    const balances = getLiveBalances(); const currentSaham = balances["Saham"] || 0;
    if (currentSaham === 0) { alert("Saldo Saham Rp 0."); return; }
    
    const changeAmount = Math.round(Math.abs(currentSaham * (pct / 100))); const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const type = pct > 0 ? 'income' : 'expense'; const category = pct > 0 ? 'Kenaikan Nilai' : 'Penurunan Nilai';
    
    const newTx = { id: 'tx_stock_' + Date.now(), type, amount: changeAmount, account: 'Saham', category, toAccount: '', date: dateStr, notes: `[Investasi] Saham ${pct > 0 ? 'Naik' : 'Turun'} ${Math.abs(pct)}%`, tenor: 1, bunga: 0 };
    state.transactions.push(newTx); sessionUndoStack.push({ type: 'ADD', data: newTx }); sessionRedoStack = [];
    saveState(); refreshApp(); alert(`Berhasil menyesuaikan nilai saham: ${pct}%`); document.getElementById('inputStockReturn').value = "0";
}

function renderInvestmentTable() {
    const tbody = document.getElementById('investmentTableBody'); if (!tbody) return;
    tbody.innerHTML = '';
    const stockTxs = state.transactions.filter(t => t.account === 'Saham' && (t.category === 'Kenaikan Nilai' || t.category === 'Penurunan Nilai'));
    if (stockTxs.length === 0) { tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center italic text-slate-400">Belum ada histori penyesuaian.</td></tr>`; return; }
    stockTxs.sort((a, b) => new Date(b.date) - new Date(a.date));
    stockTxs.forEach(t => {
        const isGain = t.category === 'Kenaikan Nilai';
        tbody.innerHTML += `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700 text-xs border-b dark:border-slate-700">
                <td class="p-2.5 text-slate-400 font-medium">${t.date}</td> <td class="p-2.5 font-semibold">${t.notes}</td>
                <td class="p-2.5 text-right font-extrabold ${isGain ? 'text-emerald-600' : 'text-rose-600'}">${isGain ? '+' : '-'}${formatRupiah(t.amount)}</td>
                <td class="p-2.5 text-center"><button onclick="deleteTransaction('${t.id}')" class="text-rose-400"><i class="fa-solid fa-trash-can"></i></button></td>
            </tr>
        `;
    });
}

function toggleMobileMenu() { document.getElementById('mobileDropdownContainer').classList.toggle('hidden'); }
function selectMobileTab(id) { switchTab(id); toggleMobileMenu(); }
function resetToSeed() { if(confirm("Muat data simulasi bawaan?")) { state = sanitizeState(JSON.parse(JSON.stringify(SEED_DATA))); saveState(); refreshApp(); } }
function clearAllData() { if(confirm("Kosongkan local storage browser?")) { localStorage.clear(); state = sanitizeState({}); saveState(); refreshApp(); } }

// ==========================================
// 🎬 LOGIKA OTOMATIS PENUTUP INTRO VIDEO (STUCK 1 DETIK & SMOOTH FADE OUT)
// ==========================================
window.addEventListener('load', () => {
    const splash = document.getElementById('splash-screen');
    const video = document.getElementById('intro-video');
    
    if (splash && video) {
        video.play().catch(err => console.log("Pemutaran otomatis dicegah:", err));

        // Deteksi ketika video animasi selesai berputar
        video.addEventListener('ended', () => {
            
            // 1. EFEK STUCK: Tahan frame terakhir logo selama 1 detik
            setTimeout(() => {
                
                // 2. LOGIKA TRANSISI: Tukar kelas opacity untuk memicu efek pudar lembut 1 detik
                splash.classList.remove('opacity-100');
                splash.classList.add('opacity-0', 'pointer-events-none');
                
                // Buka kembali fungsi gulir (scroll) pada website KSaku
                document.body.classList.remove('overflow-hidden');
                
                // 3. PEMBERSIHAN DOM: Dihapus pas setelah 1000ms transisi pudar CSS selesai
                setTimeout(() => {
                    splash.remove();
                }, 1000); // Disinkronkan dengan duration-1000 pada HTML

            }, 1000); // Durasi stuck (1 detik)
        });
    }
});