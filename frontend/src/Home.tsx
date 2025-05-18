import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, CircularProgress, Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Alert } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import ScienceIcon from '@mui/icons-material/Science';
import MapIcon from '@mui/icons-material/Map';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
const CARD_ICONS = [<ScienceIcon fontSize="large" />, <MapIcon fontSize="large" />, <AssessmentIcon fontSize="large" />, <LocationOnIcon fontSize="large" />];
const CARD_COLORS = ['#1976d2', '#059669', '#f59e42', '#e11d48'];

const GUIDE = [
  'Sol menüden Kaynaklar, İlaçlar ve Harita bölümlerine ulaşabilirsiniz.',
  'Kaynaklar bölümünden yeni kaynak ekleyebilir, toplu ilaçlama yapabilirsiniz.',
  'İlaçlar bölümünde stok takibi ve ekleme işlemleri yapabilirsiniz.',
  'Harita bölümünde tüm kaynakları ve işaretleri görebilirsiniz.',
];

const Home: React.FC = () => {
  const [resources, setResources] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [markers, setMarkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      fetch('http://localhost:4000/api/resources').then(r => r.json()),
      fetch('http://localhost:4000/api/chemicals').then(r => r.json()),
      fetch('http://localhost:4000/api/markers').then(r => r.json()),
    ]).then(([res, chems, marks]) => {
      setResources(res);
      setChemicals(chems);
      setMarkers(marks);
      setLoading(false);
    });
  }, []);

  // Kaynak türlerine göre dağılım
  const resourceTypeData = [
    { name: 'Sivrisinek', value: resources.filter(r => r.type === 'sivrisinek').length },
    { name: 'Karasinek', value: resources.filter(r => r.type === 'karasinek').length },
    { name: 'Çöp Konteynırı', value: resources.filter(r => r.type === 'cop').length },
  ];

  // Aynı isimli ilaçları tekilleştir
  const uniqueChemicals: { [name: string]: any } = {};
  chemicals.forEach((c: any) => {
    if (!uniqueChemicals[c.name]) uniqueChemicals[c.name] = c;
  });
  const chemicalStockData = Object.values(uniqueChemicals).map((c: any) => ({ name: c.name, value: c.stock - c.used }));

  // Özetler
  const summary = [
    { label: 'Toplam Kaynak', value: resources.length },
    { label: 'Toplam Yapılan İlaçlama', value: resources.filter(r => r.ilaclandiMi).length },
    { label: 'Toplam İlaç Kullanımı (L)', value: chemicals.reduce((a: number, c: any) => a + c.used, 0) },
    { label: 'Toplam Kalan İlaç (L)', value: chemicals.reduce((a: number, c: any) => a + (c.stock - c.used), 0) },
  ];

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><CircularProgress /></Box>;
  }

  // Son eklenen kaynaklar (en yeni 5)
  const lastResources = [...resources].reverse().slice(0, 5);
  // Son ilaçlamalar (en yeni 5, ilaclandiMi true ve ilaclamaZamani dolu)
  const lastIlaclamalar = [...resources].filter(r => r.ilaclandiMi && r.ilaclamaZamani).sort((a, b) => new Date(b.ilaclamaZamani).getTime() - new Date(a.ilaclamaZamani).getTime()).slice(0, 5);
  // Kritik stok uyarısı (kalanı 10'dan az olanlar)
  const kritikStoklar = Object.values(uniqueChemicals).filter((c: any) => (c.stock - c.used) < 10);

  // Aylık bazlı yapılan ilaçlamalar (son 12 ay)
  const monthlyIlaclama: { [key: string]: number } = {};
  resources.forEach(r => {
    if (r.ilaclandiMi && r.ilaclamaZamani) {
      const d = new Date(r.ilaclamaZamani);
      const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
      monthlyIlaclama[key] = (monthlyIlaclama[key] || 0) + 1;
    }
  });
  // Son 6 ayı oluştur ve sıralı şekilde göster
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${('0' + (d.getMonth() + 1)).slice(-2)}`;
    const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    months.push({
      ay: `${aylar[d.getMonth()]} ${d.getFullYear()}`,
      value: monthlyIlaclama[key] || 0,
      order: d.getFullYear() * 100 + d.getMonth() + 1
    });
  }
  months.sort((a, b) => a.order - b.order);

  // localStorage'dan ilaçlanma sürelerini oku
  const defaultSureler = { sivrisinek: { gun: 15, saat: 0, dakika: 0 }, karasinek: { gun: 15, saat: 0, dakika: 0 }, cop: { gun: 20, saat: 0, dakika: 0 }, logar: { gun: 10, saat: 0, dakika: 0 } };
  let ilaclamaSureleri: Record<string, { gun: number; saat: number; dakika: number }> = defaultSureler;
  try {
    const stored = localStorage.getItem('ilaclamaSureleri');
    if (stored) ilaclamaSureleri = JSON.parse(stored);
  } catch {}

  // Yaklaşan ilaçlamalar (3 gün veya daha az süresi kalanlar ve süresi dolanlar)
  const upcomingIlaclamalar = resources.filter(r => {
    if (!r.ilaclandiMi || !r.ilaclamaZamani) return false;
    const sure = ilaclamaSureleri[r.type] || { gun: 15, saat: 0, dakika: 0 };
    const gun = Number(sure.gun) || 0;
    const saat = Number(sure.saat) || 0;
    const dakika = Number(sure.dakika) || 0;
    const ILACLAMA_SURESI = (gun * 24 * 60 * 60) + (saat * 60 * 60) + (dakika * 60);
    const start = new Date(r.ilaclamaZamani).getTime();
    const nowVal = Date.now();
    const diff = Math.floor((nowVal - start) / 1000);
    const kalanSn = ILACLAMA_SURESI - diff;
    // 3 gün veya daha az kalanlar ve süresi dolanlar (kalanSn <= 0)
    return kalanSn <= 3 * 24 * 60 * 60;
  }).map(r => {
    const sure = ilaclamaSureleri[r.type] || { gun: 15, saat: 0, dakika: 0 };
    const gun = Number(sure.gun) || 0;
    const saat = Number(sure.saat) || 0;
    const dakika = Number(sure.dakika) || 0;
    const ILACLAMA_SURESI = (gun * 24 * 60 * 60) + (saat * 60 * 60) + (dakika * 60);
    const start = new Date(r.ilaclamaZamani).getTime();
    const nowVal = Date.now();
    const diff = Math.floor((nowVal - start) / 1000);
    const kalanSn = ILACLAMA_SURESI - diff;
    const sign = kalanSn < 0 ? '-' : '';
    const absSn = Math.abs(kalanSn);
    const kalanGun = Math.floor(absSn / (24 * 60 * 60));
    const kalanSaat = Math.floor((absSn % (24 * 60 * 60)) / 3600);
    const kalanDk = Math.floor((absSn % 3600) / 60);
    return { ...r, kalanGun, kalanSaat, kalanDk, kalanSn, kalanStr: `${sign}${kalanGun}g ${kalanSaat}s ${kalanDk}dk` };
  });

  return (
    <Box sx={{ mt: 0, minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)', py: 4 }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto', mb: 4, p: 3, background: '#fff', borderRadius: 4, boxShadow: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <span style={{ fontSize: 38, color: '#1976d2' }}>👋</span>
          <Typography variant="h4" fontWeight={900} color="#1976d2" align="center" letterSpacing={1}>
            Hoşgeldiniz!
          </Typography>
        </Box>
        <Typography variant="h6" color="#388e3c" align="center" sx={{ mb: 1, fontWeight: 700, letterSpacing: 0.5 }}>
          Balya Belediyesi İlaçlama Takip ve Yönetim Sistemi
        </Typography>
        <Box sx={{
          background: 'linear-gradient(90deg, #e0f7fa 0%, #f8fafc 100%)',
          border: '2px solid #b6e0fe',
          borderRadius: 3,
          px: 4,
          py: 2,
          boxShadow: 2,
          maxWidth: 700,
          mb: 1
        }}>
          <Typography variant="body1" color="#1976d2" align="center" sx={{ fontSize: 18, fontWeight: 500, lineHeight: 1.7 }}>
            Bu panel üzerinden <b>tüm kaynaklarınızı</b>, <b>ilaç stoklarınızı</b> ve <b>harita üzerindeki işaretlemeleri</b> kolayca yönetebilirsiniz.<br/>
            Aşağıda özet bilgiler, güncel istatistikler ve sistem kullanımıyla ilgili pratik bir rehber bulabilirsiniz.
          </Typography>
        </Box>
      </Box>
      {kritikStoklar.length > 0 && (
        <Box sx={{ maxWidth: 900, mx: 'auto', mb: 2 }}>
          <Alert severity="warning" variant="filled">
            Kritik stok uyarısı: {kritikStoklar.map((c: any) => `${c.name} (${(c.stock - c.used).toFixed(1)} L)`).join(', ')}
          </Alert>
        </Box>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', mb: 4, mt: 2 }}>
        {summary.map((item, idx) => (
          <Paper key={item.label} elevation={6} sx={{ p: 3, textAlign: 'center', borderRadius: 4, boxShadow: 6, minWidth: 220, maxWidth: 300, flex: '1 1 220px', position: 'relative', transition: 'transform 0.2s', ':hover': { transform: 'scale(1.04)', boxShadow: 12 } }}>
            <Avatar sx={{ bgcolor: CARD_COLORS[idx % CARD_COLORS.length], width: 56, height: 56, mx: 'auto', mb: 1 }}>
              {CARD_ICONS[idx % CARD_ICONS.length]}
            </Avatar>
            <Typography variant="h6" fontWeight={600} color={CARD_COLORS[idx % CARD_COLORS.length]}>
              {item.label}
            </Typography>
            <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ mt: 1 }}>
              {item.value}
            </Typography>
          </Paper>
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignItems: 'stretch', mb: 4 }}>
        <Paper elevation={5} sx={{ p: 3, borderRadius: 4, height: '100%', minWidth: 320, maxWidth: 500, flex: '1 1 320px', boxShadow: 6, transition: 'box-shadow 0.2s', ':hover': { boxShadow: 12 } }}>
          <Typography variant="h6" fontWeight={700} align="center" color="#1976d2" gutterBottom>
            Kaynak Türlerine Göre Dağılım
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={resourceTypeData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#0088FE">
                {resourceTypeData.map((entry, index) => (
                  <Cell key={`cell-bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
        <Paper elevation={5} sx={{ p: 3, borderRadius: 4, height: '100%', minWidth: 320, maxWidth: 500, flex: '1 1 320px', boxShadow: 6, transition: 'box-shadow 0.2s', ':hover': { boxShadow: 12 } }}>
          <Typography variant="h6" fontWeight={700} align="center" color="#059669" gutterBottom>
            Kalan İlaç Stok Dağılımı
          </Typography>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={chemicalStockData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value}L (%${(percent * 100).toFixed(0)})`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={false}
              >
                {chemicalStockData.map((entry, index) => (
                  <Cell key={`cell-pie-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
      <Box sx={{ maxWidth: 1100, mx: 'auto', display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', alignItems: 'flex-start', mb: 4 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4, minWidth: 320, maxWidth: 500, flex: '1 1 320px', boxShadow: 4 }}>
          <Typography variant="h6" fontWeight={700} color="#1976d2" gutterBottom>Son Eklenen Kaynaklar</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f0f4f8' }}>
                  <TableCell><b>Adı</b></TableCell>
                  <TableCell><b>Türü</b></TableCell>
                  <TableCell><b>İlçe</b></TableCell>
                  <TableCell><b>Mahalle</b></TableCell>
                  <TableCell><b>Tarih</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lastResources.map((r, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{ cursor: 'pointer', transition: 'background 0.2s', '&:hover': { background: '#e3f2fd' } }}
                    onClick={() => navigate(`/kaynaklar?id=${r.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}>{r.type}</TableCell>
                    <TableCell>{r.adres || '-'}</TableCell>
                    <TableCell>{r.ilce || '-'}</TableCell>
                    <TableCell>{r.mahalle || '-'}</TableCell>
                    <TableCell sx={{ color: '#666' }}>{r.tarih || '-'}</TableCell>
                  </TableRow>
                ))}
                {lastResources.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Kayıt yok</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 4, minWidth: 320, maxWidth: 500, flex: '1 1 320px', boxShadow: 4 }}>
          <Typography variant="h6" fontWeight={700} color="#059669" gutterBottom>Son İlaçlamalar</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f0f4f8' }}>
                  <TableCell><b>Adı</b></TableCell>
                  <TableCell><b>Türü</b></TableCell>
                  <TableCell><b>İlçe</b></TableCell>
                  <TableCell><b>Mahalle</b></TableCell>
                  <TableCell><b>Tarih</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lastIlaclamalar.map((r, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{ cursor: 'pointer', transition: 'background 0.2s', '&:hover': { background: '#e0f7fa' } }}
                    onClick={() => navigate(`/kaynaklar?id=${r.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#059669' }}>{r.type}</TableCell>
                    <TableCell>{r.adres || '-'}</TableCell>
                    <TableCell>{r.ilce || '-'}</TableCell>
                    <TableCell>{r.mahalle || '-'}</TableCell>
                    <TableCell sx={{ color: '#666' }}>{r.ilaclamaZamani ? new Date(r.ilaclamaZamani).toLocaleString('tr-TR') : '-'}</TableCell>
                  </TableRow>
                ))}
                {lastIlaclamalar.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Kayıt yok</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
      {/* Yeni: Aylık bazlı yapılan ilaçlamalar grafiği */}
      <Box sx={{ maxWidth: 900, mx: 'auto', mb: 4 }}>
        <Paper elevation={5} sx={{ p: 3, borderRadius: 4, boxShadow: 6 }}>
          <Typography variant="h6" fontWeight={700} color="#1976d2" gutterBottom>Aylık Yapılan İlaçlamalar</Typography>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={months} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ay" tick={{ fontWeight: 600, fontSize: 14 }} />
              <YAxis allowDecimals={false} label={{ value: 'İlaçlama Sayısı', angle: -90, position: 'insideLeft', fontWeight: 700, fontSize: 15 }} />
              <Tooltip formatter={(value) => `${value} ilaçlama`} />
              <Bar dataKey="value" fill="#1976d2" radius={[6, 6, 0, 0]}>
                {months.map((entry, index) => (
                  <Cell key={`cell-bar-aylik-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      </Box>
      {/* Yeni: Yaklaşan ilaçlamalar tablosu */}
      <Box sx={{ maxWidth: 900, mx: 'auto', mb: 4 }}>
        <Paper elevation={5} sx={{ p: 3, borderRadius: 4, boxShadow: 6 }}>
          <Typography variant="h6" fontWeight={700} color="#e11d48" gutterBottom>Yaklaşan İlaçlamalar (3 Gün veya Daha Az)</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f0f4f8' }}>
                  <TableCell><b>Adı</b></TableCell>
                  <TableCell><b>Türü</b></TableCell>
                  <TableCell><b>İlçe</b></TableCell>
                  <TableCell><b>Mahalle</b></TableCell>
                  <TableCell><b>Kalan Süre</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {upcomingIlaclamalar.map((r, i) => (
                  <TableRow
                    key={i}
                    hover
                    sx={{ cursor: 'pointer', transition: 'background 0.2s', '&:hover': { background: '#e3f2fd' }, ...(r.kalanSn < 0 ? { background: '#ffebee' } : {}) }}
                    onClick={() => navigate(`/kaynaklar?id=${r.id}`)}
                  >
                    <TableCell sx={{ fontWeight: 600, color: '#1976d2' }}>{r.type}</TableCell>
                    <TableCell>{r.adres || '-'}</TableCell>
                    <TableCell>{r.ilce || '-'}</TableCell>
                    <TableCell>{r.mahalle || '-'}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: r.kalanSn < 0 ? '#d32f2f' : r.kalanSn < 24*60*60 ? '#f59e42' : '#388e3c' }}>{r.kalanStr}</TableCell>
                  </TableRow>
                ))}
                {upcomingIlaclamalar.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">Yaklaşan ilaçlama yok</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>
      {/* Kısa Kullanım Rehberi en alta taşındı ve geliştirildi */}
      <Box sx={{ maxWidth: 900, mx: 'auto', mb: 4 }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 4, background: 'linear-gradient(90deg, #e0e7ff 0%, #f8fafc 100%)', boxShadow: 6 }}>
          <Typography variant="h5" fontWeight={800} color="#f59e42" gutterBottom>Kısa Kullanım Rehberi</Typography>
          <Box component="ul" sx={{ pl: 3, mb: 0, fontSize: 17, color: '#333', lineHeight: 1.8 }}>
            <li><b>Anasayfa:</b> Genel özet, aylık ve yaklaşan ilaçlamalar ile sistemdeki son hareketleri görebilirsiniz.</li>
            <li><b>Kaynaklar:</b> Yeni kaynak ekleyebilir, mevcut kaynakları düzenleyebilir, toplu veya tekil ilaçlama işlemleri yapabilirsiniz. Kaynakların konumunu harita üzerinden seçebilirsiniz.</li>
            <li><b>İlaçlar:</b> Stok takibi yapabilir, yeni ilaç ekleyebilir, mevcut stokları ve kullanım miktarlarını görebilirsiniz. Kritik stok uyarılarını takip edin.</li>
            <li><b>Harita:</b> Tüm kaynakları ve işaretleri harita üzerinde görebilir, filtreleme ve rota planlama işlemleri yapabilirsiniz.</li>
            <li><b>Toplu İşlemler:</b> Kaynakları topluca seçip hızlıca ilaçlama veya pasif yapma işlemleri gerçekleştirebilirsiniz.</li>
            <li><b>Görsel ve Raporlar:</b> Grafikler ve tablolar ile aylık, yıllık ve anlık durumları kolayca analiz edebilirsiniz.</li>
            <li><b>Kullanıcı Girişi:</b> Güvenli giriş ve çıkış işlemleri ile kişisel verileriniz korunur. Oturumunuz açıkken tüm özelliklere erişebilirsiniz.</li>
            <li><b>Yardım ve Destek:</b> Herhangi bir sorun veya öneriniz için sistem yöneticisine ulaşabilirsiniz.</li>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Home; 