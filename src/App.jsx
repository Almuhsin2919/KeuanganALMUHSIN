import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  PlusCircle, 
  Calendar, 
  Tag, 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  PieChart,
  Layers,
  ArrowUpDown
} from 'lucide-react';

// URL Database Spreadsheet dan URL Google Form Anda
const CSV_URL =
  'https://docs.google.com/spreadsheets/d/1bCWuXLCDP49SWBEPYnpnNVsVnxyimzuRZrdT0KqyLSY/export?format=csv';

const FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSfF_e3tF7HSwTfZLRRTL58Ki9fkq9wEnTG6ioWxFEVTl-nL3w/formResponse';

export default function App() {
  // State manajemen data
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // State pencarian & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('Semua'); 
  const [filterCategory, setFilterCategory] = useState('Semua'); 
  const [sortBy, setSortBy] = useState('timestamp-desc'); 

  // State Formulir Input Baru (Disesuaikan dengan pilihan Google Form Anda)
  const [formData, setFormData] = useState({
    Transaksi: 'Kas Masuk', // Default 'Kas Masuk' sesuai opsi Google Form Anda
    Nominal: '',
    Uraian: '',
    Jenis: 'SPP' 
  });

  // State untuk Tab Aktif (Dashboard / Riwayat / Tambah)
  const [activeTab, setActiveTab] = useState('dashboard');

  // Load data saat komponen pertama kali dimuat
  useEffect(() => {
    fetchData();
  }, []);

  // Fungsi Fetch Data diperbarui sesuai dengan instruksi Anda
  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(CSV_URL);
      const csv = await response.text();

      // Membagi baris dan kolom CSV
      const rows = csv.split('\n').map(row => row.split(','));

      if (rows.length < 2) {
        setTransactions([]);
        return;
      }

      const data = rows.slice(1).map((row, index) => ({
        id: index,
        Timestamp: row[0] || '',
        Transaksi: (row[1] || '').trim(),
        Nominal: parseFloat(row[2]) || 0,
        Uraian: row[3] || '',
        // Membersihkan potensi carriage return (\r) di akhir kolom terakhir agar pencocokan string akurat
        Jenis: (row[4] || '').replace(/[\r\n]/g, '').trim()
      }));

      // Filter baris kosong agar tidak merusak kalkulasi
      const validData = data.filter(item => item.Timestamp !== '');
      setTransactions(validData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tampilkan Notifikasi Sementara
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Fungsi handleSubmit yang diperbarui agar sesuai instruksi & menggunakan kode unik entry Google Form Anda
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      const body = new URLSearchParams();

      // Memasukkan data ke kode entry unik Google Form Anda
      body.append('entry.794940589', formData.Transaksi); // Nilainya "Kas Masuk" atau "Kas Keluar"
      body.append('entry.326027743', formData.Jenis);     // Nilainya kategori pilihan
      body.append('entry.299753751', formData.Nominal);   // Nilainya angka nominal
      body.append('entry.539762996', formData.Uraian);    // Nilainya teks uraian

      await fetch(FORM_URL, {
        method: 'POST',
        mode: 'no-cors', // Mode no-cors agar lolos dari proteksi CORS browser
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      showNotification('Data berhasil disimpan');

      // Mengembalikan formulir ke keadaan awal
      setFormData({
        Transaksi: 'Kas Masuk',
        Nominal: '',
        Uraian: '',
        Jenis: 'SPP',
      });

      // Tunggu 3 detik sebelum memperbarui data agar Google Sheet sempat menulis baris baru
      setTimeout(() => {
        fetchData();
        setActiveTab('dashboard');
      }, 3000);
    } catch (err) {
      showNotification('Gagal menyimpan data', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Format Angka ke Rupiah Indonesia
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(number);
  };

  // --- LOGIKA RINGKASAN ARUS KAS ---
  // Mendukung pembacaan "Kas Masuk" atau format "Pemasukan" lama secara fleksibel
  const totalPemasukan = transactions
    .filter(t => {
      const val = t.Transaksi.toLowerCase();
      return val === 'kas masuk' || val === 'pemasukan' || val === 'masuk';
    })
    .reduce((sum, t) => sum + t.Nominal, 0);

  const totalPengeluaran = transactions
    .filter(t => {
      const val = t.Transaksi.toLowerCase();
      return val === 'kas keluar' || val === 'pengeluaran' || val === 'keluar';
    })
    .reduce((sum, t) => sum + t.Nominal, 0);

  const totalSaldo = totalPemasukan - totalPengeluaran;

  // Daftar Kategori Utama
  const categoriesList = ['Pengembangan', 'Kegiatan', 'SPP', 'Infaq', 'Lain-lain'];
  
  // Kalkulasi saldo masing-masing jenis kategori
  const categoryBalances = categoriesList.reduce((acc, category) => {
    const masuk = transactions
      .filter(t => {
        const isCat = t.Jenis.toLowerCase() === category.toLowerCase();
        const isInc = t.Transaksi.toLowerCase() === 'kas masuk' || t.Transaksi.toLowerCase() === 'pemasukan' || t.Transaksi.toLowerCase() === 'masuk';
        return isCat && isInc;
      })
      .reduce((sum, t) => sum + t.Nominal, 0);

    const keluar = transactions
      .filter(t => {
        const isCat = t.Jenis.toLowerCase() === category.toLowerCase();
        const isExp = t.Transaksi.toLowerCase() === 'kas keluar' || t.Transaksi.toLowerCase() === 'pengeluaran' || t.Transaksi.toLowerCase() === 'keluar';
        return isCat && isExp;
      })
      .reduce((sum, t) => sum + t.Nominal, 0);

    acc[category] = {
      pemasukan: masuk,
      pengeluaran: keluar,
      saldo: masuk - keluar
    };
    return acc;
  }, {});

  // Kelompokkan kategori kustom di luar list bawaan ke dalam 'Lain-lain'
  transactions.forEach(t => {
    const matched = categoriesList.some(cat => cat.toLowerCase() === t.Jenis.toLowerCase());
    if (!matched && t.Jenis) {
      const isInc = t.Transaksi.toLowerCase() === 'kas masuk' || t.Transaksi.toLowerCase() === 'pemasukan' || t.Transaksi.toLowerCase() === 'masuk';
      if (categoryBalances['Lain-lain']) {
        if (isInc) {
          categoryBalances['Lain-lain'].pemasukan += t.Nominal;
          categoryBalances['Lain-lain'].saldo += t.Nominal;
        } else {
          categoryBalances['Lain-lain'].pengeluaran += t.Nominal;
          categoryBalances['Lain-lain'].saldo -= t.Nominal;
        }
      }
    }
  });

  // Filter & Pengurutan data transaksi di tabel
  const filteredTransactions = transactions
    .filter(t => {
      const matchesSearch = t.Uraian.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            t.Jenis.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isInc = t.Transaksi.toLowerCase() === 'kas masuk' || t.Transaksi.toLowerCase() === 'pemasukan' || t.Transaksi.toLowerCase() === 'masuk';
      const isExp = t.Transaksi.toLowerCase() === 'kas keluar' || t.Transaksi.toLowerCase() === 'pengeluaran' || t.Transaksi.toLowerCase() === 'keluar';

      const matchesType = filterType === 'Semua' || 
                          (filterType === 'Pemasukan' && isInc) ||
                          (filterType === 'Pengeluaran' && isExp);

      const matchesCategory = filterCategory === 'Semua' || t.Jenis.toLowerCase() === filterCategory.toLowerCase();

      return matchesSearch && matchesType && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'timestamp-desc') {
        return new Date(b.Timestamp) - new Date(a.Timestamp);
      } else if (sortBy === 'timestamp-asc') {
        return new Date(a.Timestamp) - new Date(b.Timestamp);
      } else if (sortBy === 'nominal-desc') {
        return b.Nominal - a.Nominal;
      } else if (sortBy === 'nominal-asc') {
        return a.Nominal - b.Nominal;
      }
      return 0;
    });

  // Download Laporan Lokal CSV
  const handleExportData = () => {
    if (transactions.length === 0) {
      showNotification('Tidak ada data transaksi yang dapat diunduh', 'error');
      return;
    }
    const headers = ['Timestamp', 'Transaksi', 'Nominal', 'Uraian', 'Jenis'];
    const csvRows = [
      headers.join(','),
      ...transactions.map(t => [
        `"${t.Timestamp}"`,
        `"${t.Transaksi}"`,
        t.Nominal,
        `"${t.Uraian.replace(/"/g, '""')}"`,
        `"${t.Jenis}"`
      ].join(','))
    ];
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Backup_Arus_Kas_${new Date().toLocaleDateString('id-ID')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Pencadangan file CSV berhasil diunduh!');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* HEADER NAVIGASI */}
      <header className="bg-indigo-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Brand */}
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-500 p-2 rounded-lg text-white">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-bold text-lg sm:text-xl tracking-tight">Financely</h1>
                <p className="text-[10px] text-emerald-300">Serverless Google Database</p>
              </div>
            </div>

            {/* Desktop Tabs */}
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                  activeTab === 'dashboard' ? 'bg-indigo-800 text-white shadow-inner' : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
              >
                Dashboard Utama
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                  activeTab === 'transactions' ? 'bg-indigo-800 text-white shadow-inner' : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
              >
                Riwayat Transaksi
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`flex items-center space-x-1 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                  activeTab === 'add' ? 'bg-emerald-600 text-white shadow-inner' : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Transaksi Baru</span>
              </button>
            </nav>

            {/* Tombol Sinkronisasi */}
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-full text-indigo-200 hover:text-white hover:bg-indigo-800 transition-colors focus:outline-none"
                title="Refresh Data dari Spreadsheet"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="hidden sm:inline-block px-2.5 py-1 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 font-bold uppercase tracking-wider">
                Google Form
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* MOBILE NAVIGATION */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around py-2 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center space-y-1 text-xs font-semibold ${
            activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span>Dashboard</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex flex-col items-center space-y-1 text-xs font-semibold ${
            activeTab === 'transactions' ? 'text-indigo-600' : 'text-slate-400'
          }`}
        >
          <ArrowUpDown className="h-5 w-5" />
          <span>Riwayat</span>
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`flex flex-col items-center space-y-1 text-xs font-semibold ${
            activeTab === 'add' ? 'text-emerald-600' : 'text-slate-400'
          }`}
        >
          <PlusCircle className="h-5 w-5" />
          <span>Tambah</span>
        </button>
      </div>

      {/* ISI MATRIKS DASHBOARD */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-12">
        
        {/* TOAST NOTIFIKASI */}
        {notification && (
          <div className={`fixed top-20 right-4 z-50 flex items-center space-x-2 p-4 rounded-xl shadow-lg border text-sm max-w-md animate-bounce ${
            notification.type === 'error' 
              ? 'bg-rose-50 border-rose-200 text-rose-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            {notification.type === 'error' ? <AlertCircle className="h-5 w-5 shrink-0" /> : <CheckCircle2 className="h-5 w-5 shrink-0" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* LOADING ANIMATION */}
        {loading && transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <Wallet className="h-6 w-6 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-lg text-slate-700">Membaca Spreadsheet Keuangan...</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1 mx-auto">Membaca langsung basis data CSV hasil ekspor Google Sheets Anda</p>
            </div>
          </div>
        )}

        {/* ERROR DISPLAY */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl p-6 text-center max-w-2xl mx-auto my-10 shadow-sm">
            <AlertCircle className="h-12 w-12 text-rose-600 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Gagal Memuat Database Spreadsheet</h3>
            <p className="text-xs text-rose-600 mb-4 bg-white p-3 rounded-lg border border-rose-100">{error}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <button 
                onClick={fetchData}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition"
              >
                Coba Sinkron Ulang
              </button>
            </div>
          </div>
        )}

        {/* CONTENT INTERFACE */}
        {!loading || transactions.length > 0 ? (
          <div>

            {/* TAB 1: DISPLAY PANEL DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div className="space-y-8 animate-fade-in">
                
                {/* RINGKASAN SALDO DAN KAS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* KARTU SALDO TOTAL */}
                  <div className="bg-gradient-to-br from-indigo-700 to-indigo-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10">
                      <Wallet className="h-44 w-44" />
                    </div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">Total Saldo Keuangan</span>
                      <span className="px-2.5 py-1 bg-indigo-500/30 backdrop-blur-sm text-[10px] font-bold rounded-full border border-indigo-400/20">Aktif</span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">
                      {formatRupiah(totalSaldo)}
                    </h2>
                    <div className="flex items-center space-x-2 text-indigo-200 text-xs mt-4">
                      <span>Dari total gabungan pemasukan & pengeluaran</span>
                    </div>
                  </div>

                  {/* KARTU PEMASUKAN */}
                  <div className="bg-white rounded-3xl p-6 shadow-md border border-emerald-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-emerald-50 p-3 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Total Pemasukan</span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-emerald-600 tracking-tight">
                        {formatRupiah(totalPemasukan)}
                      </h2>
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center text-slate-500 text-xs justify-between">
                      <span>Seluruh kas masuk</span>
                      <span className="font-bold text-emerald-600 text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full">
                        {transactions.filter(t => t.Transaksi.toLowerCase() === 'kas masuk' || t.Transaksi.toLowerCase() === 'pemasukan' || t.Transaksi.toLowerCase() === 'masuk').length} Transaksi
                      </span>
                    </div>
                  </div>

                  {/* KARTU PENGELUARAN */}
                  <div className="bg-white rounded-3xl p-6 shadow-md border border-rose-100 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute right-4 top-4 bg-rose-50 p-3 rounded-2xl text-rose-600 group-hover:scale-110 transition-transform">
                      <TrendingDown className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">Total Pengeluaran</span>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-rose-600 tracking-tight">
                        {formatRupiah(totalPengeluaran)}
                      </h2>
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-4 flex items-center text-slate-500 text-xs justify-between">
                      <span>Seluruh pengeluaran dana</span>
                      <span className="font-bold text-rose-600 text-[10px] bg-rose-50 px-2 py-0.5 rounded-full">
                        {transactions.filter(t => t.Transaksi.toLowerCase() === 'kas keluar' || t.Transaksi.toLowerCase() === 'pengeluaran' || t.Transaksi.toLowerCase() === 'keluar').length} Transaksi
                      </span>
                    </div>
                  </div>

                </div>

                {/* GRAPH PERSENTASE */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-indigo-600" /> Rasio Kas Keuangan
                      </h3>
                      <p className="text-xs text-slate-500">Persentase pengeluaran terhadap total pemasukan keseluruhan</p>
                    </div>
                    <div className="mt-2 sm:mt-0 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                      Beban Penggunaan: {totalPemasukan > 0 ? ((totalPengeluaran / totalPemasukan) * 100).toFixed(1) : 0}%
                    </div>
                  </div>

                  {/* Visualisasi Bar */}
                  <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden flex">
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold" 
                      style={{ width: `${totalPemasukan + totalPengeluaran > 0 ? (totalPemasukan / (totalPemasukan + totalPengeluaran)) * 100 : 50}%` }}
                    >
                      Pemasukan
                    </div>
                    <div 
                      className="bg-rose-500 h-full transition-all duration-500 flex items-center justify-center text-[10px] text-white font-bold" 
                      style={{ width: `${totalPemasukan + totalPengeluaran > 0 ? (totalPengeluaran / (totalPemasukan + totalPengeluaran)) * 100 : 50}%` }}
                    >
                      Pengeluaran
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 text-center">
                    <div className="p-3 bg-emerald-50/50 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-emerald-700">Sisa Saldo Efektif</span>
                      <p className="text-lg font-extrabold text-emerald-800">
                        {totalPemasukan > 0 ? ((totalSaldo / totalPemasukan) * 100).toFixed(1) : 0}% Tersisa
                      </p>
                    </div>
                    <div className="p-3 bg-rose-50/50 rounded-2xl">
                      <span className="text-[10px] uppercase font-bold text-rose-700">Porsi Pengeluaran</span>
                      <p className="text-lg font-extrabold text-rose-800">
                        {totalPemasukan > 0 ? ((totalPengeluaran / totalPemasukan) * 100).toFixed(1) : 0}% Terpakai
                      </p>
                    </div>
                  </div>
                </div>

                {/* SALDO BAGI KATEGORI */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Layers className="h-5 w-5 text-indigo-600" /> Saldo Per Jenis Dana
                      </h3>
                      <p className="text-xs text-slate-500">Akumulasi sisa dana dari tiap klasifikasi transaksi</p>
                    </div>
                    <span className="text-xs text-slate-400 italic font-medium">Berdasarkan data input</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {categoriesList.map((category) => {
                      const detail = categoryBalances[category] || { pemasukan: 0, pengeluaran: 0, saldo: 0 };
                      const isNegative = detail.saldo < 0;
                      
                      let catColor = "bg-blue-500 text-blue-600 border-blue-100";
                      if (category === "Pengembangan") catColor = "from-amber-500 to-orange-600";
                      else if (category === "Kegiatan") catColor = "from-sky-500 to-indigo-600";
                      else if (category === "SPP") catColor = "from-emerald-500 to-teal-600";
                      else if (category === "Infaq") catColor = "from-purple-500 to-pink-600";
                      else catColor = "from-slate-500 to-slate-700";

                      return (
                        <div 
                          key={category}
                          className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative overflow-hidden"
                        >
                          <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${catColor}`}></div>
                          
                          <div className="mb-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Kategori</span>
                            <h4 className="font-bold text-slate-800 text-lg">{category}</h4>
                          </div>

                          <div className="space-y-2">
                            <div className="text-[11px] text-slate-500">
                              <div className="flex justify-between">
                                <span>Masuk:</span>
                                <span className="font-semibold text-emerald-600">{formatRupiah(detail.pemasukan)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Keluar:</span>
                                <span className="font-semibold text-rose-600">{formatRupiah(detail.pengeluaran)}</span>
                              </div>
                            </div>

                            <div className="border-t border-dashed border-slate-100 pt-2">
                              <span className="text-[10px] text-slate-400 block">Sisa Saldo</span>
                              <p className={`text-sm font-extrabold tracking-tight ${isNegative ? 'text-rose-600' : 'text-slate-800'}`}>
                                {formatRupiah(detail.saldo)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* FORM INPUT RINGKAS & TABEL TERKINI */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  
                  {/* INPUT CEPAT TRANSAKSI */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-fit lg:col-span-1">
                    <div className="mb-4">
                      <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <PlusCircle className="h-5 w-5 text-indigo-600" /> Transaksi Baru
                      </h3>
                      <p className="text-xs text-slate-500">Kirim data transaksi langsung ke formulir Google Form</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      
                      {/* Transaksi (Kas Masuk / Kas Keluar) */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Jenis Transaksi</label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, Transaksi: 'Kas Masuk' })}
                            className={`py-2 px-4 rounded-xl text-xs font-bold border transition ${
                              formData.Transaksi === 'Kas Masuk'
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Kas Masuk
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, Transaksi: 'Kas Keluar' })}
                            className={`py-2 px-4 rounded-xl text-xs font-bold border transition ${
                              formData.Transaksi === 'Kas Keluar'
                                ? 'bg-rose-50 border-rose-500 text-rose-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            Kas Keluar
                          </button>
                        </div>
                      </div>

                      {/* Nominal */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Nominal (Rupiah)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">Rp</span>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="Contoh: 500000"
                            value={formData.Nominal}
                            onChange={(e) => setFormData({ ...formData, Nominal: e.target.value })}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Jenis Kategori */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Kategori (Jenis)</label>
                        <select
                          value={formData.Jenis}
                          onChange={(e) => setFormData({ ...formData, Jenis: e.target.value })}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-medium text-slate-700 bg-white"
                        >
                          {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>

                      {/* Uraian */}
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Uraian / Deskripsi</label>
                        <textarea
                          required
                          rows="3"
                          placeholder="Keterangan transaksi..."
                          value={formData.Uraian}
                          onChange={(e) => setFormData({ ...formData, Uraian: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-700"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Mengirim ke Form...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="h-4 w-4" />
                            <span>Kirim Transaksi</span>
                          </>
                        )}
                      </button>

                    </form>
                  </div>

                  {/* TRANSAKSI TERBARU */}
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 lg:col-span-2">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-indigo-600" /> Transaksi Terbaru
                        </h3>
                        <p className="text-xs text-slate-500">Aktivitas keuangan terakhir yang tercatat di Google Sheet Anda</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('transactions')}
                        className="text-xs text-indigo-600 font-bold hover:underline"
                      >
                        Lihat Semua
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {transactions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <FileText className="h-10 w-10 mx-auto mb-2 opacity-55" />
                          <p className="text-sm font-medium">Belum ada data transaksi di spreadsheet Anda.</p>
                        </div>
                      ) : (
                        transactions.slice(0, 5).map((t, idx) => {
                          const isExpense = t.Transaksi.toLowerCase() === 'kas keluar' || t.Transaksi.toLowerCase() === 'pengeluaran' || t.Transaksi.toLowerCase() === 'keluar';
                          return (
                            <div 
                              key={t.id || idx}
                              className="flex justify-between items-center p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <div className={`p-2.5 rounded-xl shrink-0 ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {isExpense ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-sm text-slate-800 truncate">{t.Uraian}</h4>
                                  <div className="flex items-center space-x-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">{t.Timestamp}</span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.2 rounded-full font-bold">
                                      {t.Jenis}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-4">
                                <p className={`font-extrabold text-sm ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isExpense ? '-' : '+'}{formatRupiah(t.Nominal)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 2: RIWAYAT DAN TABEL TRANSAKSI LENGKAP */}
            {activeTab === 'transactions' && (
              <div className="space-y-6 animate-fade-in">
                
                {/* PANEL SEARCH & FILTER */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800">Manajemen Transaksi</h3>
                      <p className="text-xs text-slate-500">Telusuri riwayat penuh database keuangan Anda secara rinci</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      
                    </div>
                  </div>

                  <hr className="my-4 border-slate-100" />

                  {/* KONTROL FILTER */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Pencarian */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari uraian..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-700"
                      />
                    </div>

                    {/* Filter Jenis */}
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-700 bg-white"
                      >
                        <option value="Semua">Semua Arus Kas</option>
                        <option value="Pemasukan">Hanya Pemasukan</option>
                        <option value="Pengeluaran">Hanya Pengeluaran</option>
                      </select>
                    </div>

                    {/* Filter Kategori */}
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-slate-400 shrink-0" />
                      <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-700 bg-white"
                      >
                        <option value="Semua">Semua Jenis Dana</option>
                        {categoriesList.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Pengurutan */}
                    <div className="flex items-center space-x-2">
                      <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-700 bg-white"
                      >
                        <option value="timestamp-desc">{"Terbaru → Terlama"}</option>
                        <option value="timestamp-asc">{"Terlama → Terbaru"}</option>
                        <option value="nominal-desc">Nominal Terbesar</option>
                        <option value="nominal-asc">Nominal Terkecil</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* TABEL DATABASE */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/75 text-slate-400 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                          <th className="py-4 px-6">Timestamp</th>
                          <th className="py-4 px-6">Transaksi</th>
                          <th className="py-4 px-6">Uraian</th>
                          <th className="py-4 px-6">Jenis</th>
                          <th className="py-4 px-6 text-right">Nominal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                        {filteredTransactions.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-12 text-center text-slate-400 font-medium">
                              <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                              Tidak ada transaksi yang cocok dengan kriteria filter Anda.
                            </td>
                          </tr>
                        ) : (
                          filteredTransactions.map((t, idx) => {
                            const isExpense = t.Transaksi.toLowerCase() === 'kas keluar' || t.Transaksi.toLowerCase() === 'pengeluaran' || t.Transaksi.toLowerCase() === 'keluar';
                            return (
                              <tr key={t.id || idx} className="hover:bg-slate-50/50 transition">
                                <td className="py-4 px-6 font-medium text-slate-500 whitespace-nowrap">
                                  {t.Timestamp}
                                </td>
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                    isExpense 
                                      ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  }`}>
                                    {isExpense ? 'Kas Keluar' : 'Kas Masuk'}
                                  </span>
                                </td>
                                <td className="py-4 px-6 font-bold text-slate-800">
                                  {t.Uraian}
                                </td>
                                <td className="py-4 px-6">
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold text-[10px]">
                                    {t.Jenis}
                                  </span>
                                </td>
                                <td className={`py-4 px-6 text-right font-extrabold text-sm ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {isExpense ? '-' : '+'}{formatRupiah(t.Nominal)}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Ringkasan Jumlah di Tabel */}
                  <div className="bg-slate-50/50 p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
                    <div>
                      Menampilkan <span className="font-bold text-slate-700">{filteredTransactions.length}</span> dari <span className="font-bold text-slate-700">{transactions.length}</span> transaksi terdaftar.
                    </div>
                    <div className="flex space-x-2 font-semibold">
                      <span className="text-emerald-600">Pemasukan: {formatRupiah(totalPemasukan)}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-rose-600">Pengeluaran: {formatRupiah(totalPengeluaran)}</span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: FORMULIR INPUT TRANSAKSI LENGKAP */}
            {activeTab === 'add' && (
              <div className="max-w-xl mx-auto animate-fade-in">
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100">
                  <div className="mb-6 text-center">
                    <PlusCircle className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
                    <h3 className="font-extrabold text-xl text-slate-800">Input Transaksi Baru</h3>
                    <p className="text-xs text-slate-500 mt-1">Isi data di bawah ini untuk menambahkan data secara langsung ke Google Form</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* Mode Transaksi */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Jenis Transaksi</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, Transaksi: 'Kas Masuk' })}
                          className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all ${
                            formData.Transaksi === 'Kas Masuk'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/10'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Kas Masuk
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, Transaksi: 'Kas Keluar' })}
                          className={`py-3 px-4 rounded-2xl text-xs font-bold border transition-all ${
                            formData.Transaksi === 'Kas Keluar'
                              ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/10'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Kas Keluar
                        </button>
                      </div>
                    </div>

                    {/* Nominal */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Nominal (Rupiah)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">Rp</span>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Contoh: 100000"
                          value={formData.Nominal}
                          onChange={(e) => setFormData({ ...formData, Nominal: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-bold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Kategori */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Kategori (Jenis)</label>
                      <select
                        value={formData.Jenis}
                        onChange={(e) => setFormData({ ...formData, Jenis: e.target.value })}
                        className="w-full px-3 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold text-slate-700 bg-white"
                      >
                        {categoriesList.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Uraian */}
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Uraian / Deskripsi Kegiatan</label>
                      <textarea
                        required
                        rows="4"
                        placeholder="Keterangan lengkap mengenai transaksi kas..."
                        value={formData.Uraian}
                        onChange={(e) => setFormData({ ...formData, Uraian: e.target.value })}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm text-slate-700"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/10"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Menyimpan ke Google Form...</span>
                        </>
                      ) : (
                        <>
                          <PlusCircle className="h-4 w-4" />
                          <span>Kirim Transaksi</span>
                        </>
                      )}
                    </button>

                  </form>
                </div>
              </div>
            )}

          </div>
        ) : null}

      </main>

      {/* FOOTER */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Financely Dashboard. Terhubung aman via Google Form & Google Sheet secara gratis.</p>
        </div>
      </footer>

    </div>
  );
}