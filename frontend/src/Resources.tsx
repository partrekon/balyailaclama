import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import { Box, Typography, Paper, TextField, Button, MenuItem, List, ListItem, ListItemText, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import AddIcon from '@mui/icons-material/Add';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import { useMap } from 'react-leaflet';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import FilterListIcon from '@mui/icons-material/FilterList';
import LinearProgress from '@mui/material/LinearProgress';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import SettingsIcon from '@mui/icons-material/Settings';
import Switch from '@mui/material/Switch';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Checkbox from '@mui/material/Checkbox';

const API_URL = process.env.REACT_APP_API_URL + '/api/resources';

const resourceTypes = [
  { value: 'sivrisinek', label: 'Sivrisinek' },
  { value: 'karasinek', label: 'Karasinek' },
  { value: 'cop', label: 'Çöp Konteynırı' },
  { value: 'logar', label: 'Logar' },
];

const ilceler = [
  'Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye', 'Dursunbey',
  'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran', 'İvrindi', 'Karesi', 'Kepsut',
  'Manyas', 'Marmara', 'Savaştepe', 'Sındırgı', 'Susurluk'
];

// Türk alfabesine göre sıralama fonksiyonu
function turkceSirala(a: string, b: string) {
  const alfabe = 'AÂBCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ';
  const duzelt = (s: string) => s.replace(/İ/g, 'I').replace(/I/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/Â/g, 'A');
  a = duzelt(a.toUpperCase());
  b = duzelt(b.toUpperCase());
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ai = alfabe.indexOf(a[i] || 'A');
    const bi = alfabe.indexOf(b[i] || 'A');
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

const mahalleler = [
  'KADİKÖY', 'KAVAK ALANI', 'GÖKMUSA', 'SÖBÜCEALAN', 'KARLIK', 'ILICA', 'YENİKAVAK', 'YARIŞALALANI', 'KARACAHİSAR', 'KAYALAR',
  'SEMİZKÖY', 'ÖREN', 'DANIŞMENT', 'GÖLOBA', 'KOYUNERİ', 'ORHANLAR', 'DEĞİRMENDERE', 'MANCILIK', 'DEREKÖY', 'KARAMUSTAFALAR',
  'ÇALOVA', 'YAZLIK', 'ÇUKURCAK', 'KAYAPINAR',
  'MÜSTECAP', 'BENGİLER', 'ÇİĞDEM', 'ÇAMAVŞAR', 'ÇAMUCU', 'FARSAK', 'ÇARMIK', 'YAYLACIK', 'HAVUTBAŞI', 'DOĞANLAR',
  'ÇAKALLAR', 'YUKARI ÇAKALLAR', 'KAŞIKÇI', 'HABİPLER', 'GÖKTEPE', 'AKBAŞ', 'KOCABÜK', 'MEDRESE', 'HACIHÜSEYİN', 'NARLI',
  'ALİDEMİRCİ', 'AKÇAL', 'PATLAK',
  'KOCACAMİ', 'ENVERPAŞA'
].sort(turkceSirala);

type Resource = {
  id?: number;
  type: string;
  lat: string;
  lng: string;
  ilce?: string;
  mahalle?: string;
  adres?: string;
  tarih?: string;
  resim?: string;
  aciklama?: string;
  ilaclamaZamani?: string; // Son ilaçlama zamanı (ISO string)
  ilaclandiMi?: boolean;   // İlaçlandı olarak işaretlendi mi
};

const today = () => new Date().toISOString().slice(0, 10);

// Varsayılan marker ikonunu düzeltmek için
const iconUrl = require('leaflet/dist/images/marker-icon.png');
const iconShadow = require('leaflet/dist/images/marker-shadow.png');
const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const mapCenter: [number, number] = [39.9208, 32.8541]; // Türkiye merkez

function GoToMyLocationBtn({ position }: { position: [number, number] | null }) {
  const map = useMap();
  return (
    <Button
      variant="contained"
      color="info"
      startIcon={<MyLocationIcon />}
      sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}
      onClick={() => {
        if (position) map.setView(position, 15);
      }}
      disabled={!position}
    >
      Konumuma Git
    </Button>
  );
}

const resourceTypeIcons: { [key: string]: string } = {
  sivrisinek: 'https://cdn-icons-png.flaticon.com/512/17275/17275339.png',
  karasinek: 'https://cdn-icons-png.flaticon.com/512/12311/12311394.png',
  cop: 'https://cdn-icons-png.flaticon.com/512/7657/7657533.png',
  logar: 'https://cdn-icons-png.flaticon.com/512/4357/4357706.png',
};

function SelectableMap({ lat, lng, setLat, setLng, myPosition, resources, center }: { lat: string; lng: string; setLat: (v: string) => void; setLng: (v: string) => void; myPosition: [number, number] | null; resources: any[]; center?: [number, number] }) {
  function LocationMarker() {
    useMapEvents({
      click(e) {
        setLat(e.latlng.lat.toFixed(5));
        setLng(e.latlng.lng.toFixed(5));
      },
    });
    return lat && lng ? <Marker position={[parseFloat(lat), parseFloat(lng)]} /> : null;
  }
  const mapDefaultCenter = center || mapCenter;
  const mapDefaultZoom = center ? 15 : 7;
  return (
    <MapContainer center={mapDefaultCenter} zoom={mapDefaultZoom} style={{ height: 220, width: '100%', marginBottom: 12, position: 'relative' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker />
      {myPosition && (
        <Circle center={myPosition} radius={15} pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.2 }} />
      )}
      {resources && resources.map((res, idx) => (
        <Marker
          key={res.id || idx}
          position={[parseFloat(res.lat), parseFloat(res.lng)]}
          icon={L.icon({
            iconUrl: resourceTypeIcons[res.type] || resourceTypeIcons['sivrisinek'],
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            popupAnchor: [0, -28],
          })}
        />
      ))}
      <GoToMyLocationBtn position={myPosition} />
    </MapContainer>
  );
}

const Resources: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [type, setType] = useState('sivrisinek');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [ilce, setIlce] = useState('Balya');
  const [mahalle, setMahalle] = useState('Balya');
  const [adres, setAdres] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [tarih, setTarih] = useState(today());
  const [resim, setResim] = useState<string>('');
  const [resimPreview, setResimPreview] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editResource, setEditResource] = useState<Resource | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterAdres, setFilterAdres] = useState('');
  const [filterIlce, setFilterIlce] = useState('Balya');
  const [filterMahalle, setFilterMahalle] = useState('');
  const [filterIlaclamaSure, setFilterIlaclamaSure] = useState('');
  const [filterAppliedIlaclamaSure, setFilterAppliedIlaclamaSure] = useState('');
  const [filterApplied, setFilterApplied] = useState({
    type: '',
    adres: '',
    ilce: 'Balya',
    mahalle: ''
  });
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [aktiflik, setAktiflik] = useState<{ [id: number]: boolean }>({});
  const [sureAyarOpen, setSureAyarOpen] = useState(false);
  const [pasifTurler, setPasifTurler] = useState<{ [key: string]: boolean }>(() => {
    const fromStorage = localStorage.getItem('pasifTurler');
    if (fromStorage) return JSON.parse(fromStorage);
    return {};
  });
  const [topluPanelOpen, setTopluPanelOpen] = useState(false);
  const [topluFilterType, setTopluFilterType] = useState('');
  const [topluFilterAdres, setTopluFilterAdres] = useState('');
  const [topluFilterIlce, setTopluFilterIlce] = useState('Balya');
  const [topluFilterMahalle, setTopluFilterMahalle] = useState('');
  const [topluSelectedIds, setTopluSelectedIds] = useState<number[]>([]);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // Kaynak türüne göre alt türler
  const kaynakTuruSecenekleri: { [key: string]: string[] } = {
    sivrisinek: ['Çeşme', 'Kanal', 'Dere', 'Sazlık', 'Bataklık', 'Durgun Su'],
    karasinek: ['Gübrelik', 'Gübrelik Kanalı', 'Çöplük'],
    cop: [],
    logar: [],
  };

  // Varsayılan ilaçlanma süreleri (gün)
  const defaultIlaclamaSureleri: { [key: string]: number } = {
    sivrisinek: 15,
    karasinek: 15,
    cop: 20,
    logar: 10,
  };

  // İlaçlanma süreleri ayarı
  const [ilaclamaSureleri, setIlaclamaSureleri] = useState<{ [key: string]: { gun: number; saat: number; dakika: number } }>(() => {
    const fromStorage = localStorage.getItem('ilaclamaSureleri');
    if (fromStorage) return JSON.parse(fromStorage);
    return { ...defaultIlaclamaSureleri };
  });
  // Geçici draft state
  const [ilaclamaSureleriDraft, setIlaclamaSureleriDraft] = useState<{ [key: string]: { gun: number; saat: number; dakika: number } }>(() => ({ ...ilaclamaSureleri }));

  // Input değişiminde sadece draft güncellenir
  const handleSureChange = (type: string, field: 'gun' | 'saat' | 'dakika', val: string) => {
    setIlaclamaSureleriDraft(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: Math.max(0, Number(val))
      }
    }));
  };
  // Kaydet butonunda asıl state ve localStorage güncellenir
  const handleSureSave = () => {
    setIlaclamaSureleri({ ...ilaclamaSureleriDraft });
    localStorage.setItem('ilaclamaSureleri', JSON.stringify(ilaclamaSureleriDraft));
  };
  // ilaclamaSureleri değişince draft'ı da güncel tut (ör: sayfa yenileme sonrası)
  useEffect(() => {
    setIlaclamaSureleriDraft({ ...ilaclamaSureleri });
  }, [sureAyarOpen, ilaclamaSureleri]);

  const handleTurPasifChange = (type: string, val: boolean) => {
    setPasifTurler(prev => {
      const updated = { ...prev, [type]: val };
      localStorage.setItem('pasifTurler', JSON.stringify(updated));
      return updated;
    });
  };

  // Kayıtları çek
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        // Eksik alanlar varsa varsayılan ekle
        const fixed = data.map((r: any) => ({
          ...r,
          ilaclamaZamani: r.ilaclamaZamani || '',
          ilaclandiMi: typeof r.ilaclandiMi === 'boolean' ? r.ilaclandiMi : !!r.ilaclandiMi
        }));
        setResources(fixed);
      })
      .catch(() => setError('Kayıtlar alınamadı!'));
  }, []);

  // Canlı konumu al
  useEffect(() => {
    let watchId: number | null = null;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        pos => setMyPosition([pos.coords.latitude, pos.coords.longitude]),
        undefined,
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
      );
    }
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Resim dosyasını base64'e çevir
  const handleResimChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setResim(reader.result as string);
      setResimPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lat || !lng || isNaN(Number(lat)) || isNaN(Number(lng))) {
      setError('Geçerli bir enlem ve boylam giriniz!');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lat: Number(lat), lng: Number(lng), ilce, mahalle, adres, aciklama, tarih, resim, ilaclamaZamani: '', ilaclandiMi: false })
      });
      const data = await res.json();
      if (res.ok) {
        setResources(prev => [...prev, data]);
        setLat('');
        setLng('');
        setIlce('Balya');
        setMahalle('');
        setAdres('');
        setAciklama('');
        setTarih(today());
        setResim('');
        setResimPreview('');
      } else {
        setError(data.error || 'Kayıt eklenemedi!');
      }
    } catch {
      setError('Sunucuya ulaşılamıyor!');
    }
    setLoading(false);
  };

  // Kaynak sil
  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setResources(prev => prev.filter(r => r.id !== id));
      }
    } catch {
      setError('Silme işlemi başarısız!');
    }
  };

  // Kaynak güncelleme fonksiyonu
  const handleEditSave = async () => {
    if (!editResource || !editResource.id) return;
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API_URL}/${editResource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editResource)
      });
      if (res.ok) {
        setResources(prev => prev.map(r => r.id === editResource.id ? { ...editResource } : r));
        setEditOpen(false);
      } else {
        setEditError('Güncelleme başarısız!');
      }
    } catch {
      setEditError('Sunucuya ulaşılamıyor!');
    }
    setEditLoading(false);
  };

  // İlaçlama işlemi
  const handleIlacla = async (res: Resource) => {
    if (!res.id) return;
    const now = new Date().toISOString();
    try {
      const response = await fetch(`${API_URL}/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ilaclamaZamani: now, ilaclandiMi: true })
      });
      if (response.ok) {
        setResources(prev => prev.map(r => r.id === res.id ? { ...r, ilaclamaZamani: now, ilaclandiMi: true } : r));
      }
    } catch {}
  };

  // Filtrelenmiş kaynaklar
  const filteredResources = resources.filter(res => {
    if (filterApplied.type && res.type !== filterApplied.type) return false;
    if (filterApplied.adres && res.adres !== filterApplied.adres) return false;
    if (filterApplied.ilce && res.ilce !== filterApplied.ilce) return false;
    if (filterApplied.mahalle && res.mahalle !== filterApplied.mahalle) return false;
    // Kaynak türüne göre ilaçlanma süresi (saniye)
    let ilaclamaSuresi = (ilaclamaSureleri[res.type]?.gun || 0) * 24 * 60 * 60 +
                         (ilaclamaSureleri[res.type]?.saat || 0) * 60 * 60 +
                         (ilaclamaSureleri[res.type]?.dakika || 0) * 60;
    let kalanSn = ilaclamaSuresi;
    if (res.ilaclandiMi && res.ilaclamaZamani) {
      const start = new Date(res.ilaclamaZamani).getTime();
      const nowVal = Date.now();
      const diff = Math.floor((nowVal - start) / 1000);
      kalanSn = ilaclamaSuresi - diff;
    }
    // İlaçlanma süresi filtresi (sadece Uygula ile aktif olur)
    if (filterAppliedIlaclamaSure === 'dolmus' && kalanSn >= 0) return false;
    if (['1','2','3','4','5','6','7'].includes(filterAppliedIlaclamaSure)) {
      const kalanGun = Math.floor(kalanSn / (24 * 60 * 60));
      if (kalanGun > Number(filterAppliedIlaclamaSure)) return false;
    }
    return true;
  });

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    setAktiflik(resources.reduce((acc, r) => ({ ...acc, [r.id!]: true }), {}));
  }, [resources]);

  // Filtreye uyan kaynaklar
  const topluFilteredResources = resources.filter(res => {
    if (topluFilterType && res.type !== topluFilterType) return false;
    if (topluFilterAdres && res.adres !== topluFilterAdres) return false;
    if (topluFilterIlce && res.ilce !== topluFilterIlce) return false;
    if (topluFilterMahalle && res.mahalle !== topluFilterMahalle) return false;
    return true;
  });

  // Toplu ilaçlama işlemi
  const handleTopluIlaclamaUygula = () => {
    const now = new Date().toISOString();
    topluFilteredResources.forEach(res => {
      if (topluSelectedIds.includes(res.id!)) {
        handleIlacla({ ...res, ilaclandiMi: true, ilaclamaZamani: now });
      }
    });
    setTopluSelectedIds([]);
    setTopluPanelOpen(false);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ maxWidth: 800, mx: 'auto', mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<SettingsIcon />}
          onClick={() => setSureAyarOpen(o => !o)}
        >
          Süre Ayarları
        </Button>
        <Button
          variant="contained"
          size="small"
          color={topluPanelOpen ? 'secondary' : 'primary'}
          onClick={() => setTopluPanelOpen(o => !o)}
          sx={{ ml: 2 }}
        >
          Toplu İlaçlama
        </Button>
      </Box>
      {sureAyarOpen && (
        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 3, p: 2, background: '#f8fafc', borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>İlaçlanma Süreleri ve Tür Durumu</Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            {resourceTypes.map(rt => (
              <Box key={rt.value} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 140, p: 1, border: '1px solid #eee', borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>{rt.label}</Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="Gün"
                    type="number"
                    value={ilaclamaSureleriDraft[rt.value]?.gun ?? ''}
                    onChange={e => handleSureChange(rt.value, 'gun', e.target.value)}
                    size="small"
                    sx={{ width: 60 }}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    label="Saat"
                    type="number"
                    value={ilaclamaSureleriDraft[rt.value]?.saat ?? ''}
                    onChange={e => handleSureChange(rt.value, 'saat', e.target.value)}
                    size="small"
                    sx={{ width: 60 }}
                    inputProps={{ min: 0, max: 23 }}
                  />
                  <TextField
                    label="Dakika"
                    type="number"
                    value={ilaclamaSureleriDraft[rt.value]?.dakika ?? ''}
                    onChange={e => handleSureChange(rt.value, 'dakika', e.target.value)}
                    size="small"
                    sx={{ width: 70 }}
                    inputProps={{ min: 0, max: 59 }}
                  />
                </Box>
                <Switch
                  checked={pasifTurler[rt.value] !== true}
                  onChange={e => handleTurPasifChange(rt.value, !e.target.checked)}
                  color="primary"
                  size="small"
                />
                <Typography variant="caption" color={pasifTurler[rt.value] ? 'error' : 'success'}>
                  {pasifTurler[rt.value] ? 'Pasif' : 'Aktif'}
                </Typography>
              </Box>
            ))}
            <Button variant="contained" color="primary" onClick={handleSureSave}>Kaydet</Button>
          </Box>
        </Box>
      )}
      {topluPanelOpen && (
        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 3, p: 2, background: '#f8fafc', borderRadius: 2, border: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="h6" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>Toplu İlaçlama</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Seçtiğiniz filtrelere göre kaynakları listeler ve seçtiklerinize tek tıkla ilaçlama işlemi başlatabilirsiniz.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
            <TextField
              select
              label="Kaynak Adı"
              value={topluFilterType}
              onChange={e => { setTopluFilterType(e.target.value); setTopluFilterAdres(''); }}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {resourceTypes.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kaynak Türü"
              value={topluFilterAdres}
              onChange={e => setTopluFilterAdres(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
              disabled={!topluFilterType || !kaynakTuruSecenekleri[topluFilterType]?.length}
            >
              <MenuItem value="">Tümü</MenuItem>
              {(kaynakTuruSecenekleri[topluFilterType] || []).map(secenek => (
                <MenuItem key={secenek} value={secenek}>{secenek}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="İlçe"
              value={topluFilterIlce}
              onChange={e => setTopluFilterIlce(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {ilceler.map(ilceAdı => (
                <MenuItem key={ilceAdı} value={ilceAdı}>{ilceAdı}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Mahalle"
              value={topluFilterMahalle}
              onChange={e => setTopluFilterMahalle(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {mahalleler.map(mahalleAdı => (
                <MenuItem key={mahalleAdı} value={mahalleAdı}>{mahalleAdı}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ maxHeight: 260, overflow: 'auto', border: '1px solid #eee', borderRadius: 1, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ background: '#f0f4f8' }}>
                  <th style={{ padding: 10, fontSize: 16, fontWeight: 700, textAlign: 'center' }}><Checkbox
                    checked={topluFilteredResources.length > 0 && topluFilteredResources.every(r => topluSelectedIds.includes(r.id!))}
                    indeterminate={topluSelectedIds.length > 0 && topluSelectedIds.length < topluFilteredResources.length}
                    onChange={e => {
                      if (e.target.checked) setTopluSelectedIds(topluFilteredResources.map(r => r.id!));
                      else setTopluSelectedIds([]);
                    }}
                  /></th>
                  <th style={{ padding: 10, fontSize: 16, fontWeight: 700 }}>Kaynak Adı</th>
                  <th style={{ padding: 10, fontSize: 16, fontWeight: 700 }}>Kaynak Türü</th>
                  <th style={{ padding: 10, fontSize: 16, fontWeight: 700 }}>İlçe</th>
                  <th style={{ padding: 10, fontSize: 16, fontWeight: 700 }}>Mahalle</th>
                </tr>
              </thead>
              <tbody>
                {topluFilteredResources.map(res => (
                  <tr key={res.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s', height: 48, cursor: 'pointer' , ...(topluSelectedIds.includes(res.id!) ? { background: '#e3f2fd' } : {}), }}
                    onClick={() => {
                      if (topluSelectedIds.includes(res.id!)) setTopluSelectedIds(ids => ids.filter(id => id !== res.id));
                      else setTopluSelectedIds(ids => [...ids, res.id!]);
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <Checkbox
                        checked={topluSelectedIds.includes(res.id!)}
                        onChange={e => {
                          e.stopPropagation();
                          if (e.target.checked) setTopluSelectedIds(ids => [...ids, res.id!]);
                          else setTopluSelectedIds(ids => ids.filter(id => id !== res.id));
                        }}
                      />
                    </td>
                    <td style={{ padding: 10 }}>{resourceTypes.find(r => r.value === res.type)?.label || res.type}</td>
                    <td style={{ padding: 10 }}>{res.adres || '-'}</td>
                    <td style={{ padding: 10 }}>{res.ilce || '-'}</td>
                    <td style={{ padding: 10 }}>{res.mahalle || '-'}</td>
                  </tr>
                ))}
                {topluFilteredResources.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888', padding: 16 }}>Filtreye uygun kaynak bulunamadı.</td></tr>
                )}
              </tbody>
            </table>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 2 }}>
            <Button variant="contained" color="primary" size="large" sx={{ px: 4, fontWeight: 700 }} disabled={topluSelectedIds.length === 0} onClick={handleTopluIlaclamaUygula}>
              İlaçlama Yapıldı
            </Button>
            <Button variant="outlined" color="secondary" size="large" sx={{ px: 4, fontWeight: 700 }} disabled={topluSelectedIds.length === 0}
              onClick={() => {
                setAktiflik(prev => {
                  const updated = { ...prev };
                  topluSelectedIds.forEach(id => { updated[id] = false; });
                  return updated;
                });
                setTopluSelectedIds([]);
                setTopluPanelOpen(false);
              }}
            >
              Pasif Yap
            </Button>
          </Box>
        </Box>
      )}
      <Box sx={{ maxWidth: 800, mx: 'auto', mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          color={formOpen ? 'secondary' : 'primary'}
          startIcon={<AddIcon />}
          endIcon={formOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          onClick={() => setFormOpen(o => !o)}
          sx={{ minWidth: 180 }}
        >
          {formOpen ? 'Formu Kapat' : 'Yeni Kaynak Ekle'}
        </Button>
      </Box>
      {formOpen && (
        <Paper elevation={2} sx={{ p: 2, mb: 3, maxWidth: 800, mx: 'auto', background: '#f8fafc' }}>
          <Typography variant="h6" gutterBottom>Yeni Kaynak Ekle</Typography>
          <form onSubmit={handleAdd}>
            <TextField
              select
              label="Kaynak Adı"
              value={type}
              onChange={e => setType(e.target.value)}
              fullWidth
              margin="normal"
            >
              {resourceTypes.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kaynak Türü"
              value={adres}
              onChange={e => setAdres(e.target.value)}
              fullWidth
              margin="normal"
            >
              {kaynakTuruSecenekleri[type].map((secenek) => (
                <MenuItem key={secenek} value={secenek}>{secenek}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="İlçe Adı"
              value={ilce}
              onChange={e => setIlce(e.target.value)}
              fullWidth
              margin="normal"
            >
              {ilceler.map((ilceAdı) => (
                <MenuItem key={ilceAdı} value={ilceAdı}>{ilceAdı}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Mahalle Adı"
              value={mahalle}
              onChange={e => setMahalle(e.target.value)}
              fullWidth
              margin="normal"
            >
              {mahalleler.map((mahalleAdı) => (
                <MenuItem key={mahalleAdı} value={mahalleAdı}>{mahalleAdı}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Açıklama"
              value={aciklama}
              onChange={e => setAciklama(e.target.value)}
              fullWidth
              margin="normal"
              multiline
              minRows={2}
            />
            <TextField
              label="Tarih"
              type="date"
              value={tarih}
              onChange={e => setTarih(e.target.value)}
              fullWidth
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
                Resim Yükle
                <input type="file" accept="image/*" hidden onChange={handleResimChange} />
              </Button>
              {resimPreview && (
                <img src={resimPreview} alt="Önizleme" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
              )}
            </Box>
            <SelectableMap lat={lat} lng={lng} setLat={setLat} setLng={setLng} myPosition={myPosition} resources={resources} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Enlem (Lat)"
                value={lat}
                onChange={e => setLat(e.target.value)}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Boylam (Lng)"
                value={lng}
                onChange={e => setLng(e.target.value)}
                fullWidth
                margin="normal"
              />
            </Box>
            {error && <Typography color="error" variant="body2">{error}</Typography>}
            <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2 }} disabled={loading}>
              {loading ? 'Ekleniyor...' : 'Kaynak Ekle'}
            </Button>
          </form>
        </Paper>
      )}
      <Paper elevation={3} sx={{ p: 3, maxWidth: 800, mx: 'auto', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" fontWeight={700} color="primary.main">Kaynaklar</Typography>
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setFilterOpen(f => !f)}>
            {filterOpen ? 'Filtreyi Kapat' : 'Filtrele'}
          </Button>
        </Box>
        {filterOpen && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, alignItems: 'center' }}>
            <TextField
              select
              label="Kaynak Adı"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {resourceTypes.map(option => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kaynak Türü"
              value={filterAdres}
              onChange={e => setFilterAdres(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
              disabled={!filterType || !kaynakTuruSecenekleri[filterType]?.length}
            >
              <MenuItem value="">Tümü</MenuItem>
              {(kaynakTuruSecenekleri[filterType] || []).map(secenek => (
                <MenuItem key={secenek} value={secenek}>{secenek}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="İlçe"
              value={filterIlce}
              onChange={e => setFilterIlce(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {ilceler.map(ilceAdı => (
                <MenuItem key={ilceAdı} value={ilceAdı}>{ilceAdı}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Mahalle"
              value={filterMahalle}
              onChange={e => setFilterMahalle(e.target.value)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {mahalleler.map(mahalleAdı => (
                <MenuItem key={mahalleAdı} value={mahalleAdı}>{mahalleAdı}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="İlaçlanma Süresi"
              value={filterIlaclamaSure}
              onChange={e => setFilterIlaclamaSure(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="dolmus">Süresi Dolanlar</MenuItem>
              <MenuItem value="1">1 Gün</MenuItem>
              <MenuItem value="2">2 Gün</MenuItem>
              <MenuItem value="3">3 Gün</MenuItem>
              <MenuItem value="4">4 Gün</MenuItem>
              <MenuItem value="5">5 Gün</MenuItem>
              <MenuItem value="6">6 Gün</MenuItem>
              <MenuItem value="7">7 Gün</MenuItem>
            </TextField>
            <Button variant="contained" color="primary" onClick={() => {
              setFilterApplied({ type: filterType, adres: filterAdres, ilce: filterIlce, mahalle: filterMahalle });
              setFilterAppliedIlaclamaSure(filterIlaclamaSure);
            }}>
              Uygula
            </Button>
            <Button variant="outlined" color="secondary" onClick={() => {
              setFilterType(''); setFilterAdres(''); setFilterIlce('Balya'); setFilterMahalle(''); setFilterIlaclamaSure(''); setFilterAppliedIlaclamaSure(''); setFilterApplied({ type: '', adres: '', ilce: 'Balya', mahalle: '' });
            }}>Temizle</Button>
          </Box>
        )}
        <List>
          {filteredResources.length === 0 && (
            <ListItem>
              <ListItemText primary="Filtreye uygun kaynak bulunamadı." />
            </ListItem>
          )}
          {[...filteredResources].reverse().map((res, idx) => {
            const ilaclandi = !!res.ilaclandiMi;
            // Kaynak türü pasifse bar ve sayaç çalışmasın
            const turPasif = pasifTurler[res.type] === true;
            let ilaclamaSuresi = (ilaclamaSureleri[res.type]?.gun || 0) * 24 * 60 * 60 +
                                 (ilaclamaSureleri[res.type]?.saat || 0) * 60 * 60 +
                                 (ilaclamaSureleri[res.type]?.dakika || 0) * 60;

            // Zaman ve aktiflik hesaplama
            let kalanSn = ilaclamaSuresi;
            let barRenk: 'error' | 'warning' | 'success' | 'inherit' = 'success';
            let barYuzde = 0;
            let kalanStr = '';
            const isAktif = aktiflik[res.id!] !== false && !turPasif;
            if (ilaclandi && res.ilaclamaZamani && isAktif && ilaclamaSuresi > 0) {
              const start = new Date(res.ilaclamaZamani).getTime();
              const diff = Math.floor((now - start) / 1000);
              kalanSn = ilaclamaSuresi - diff;
              barYuzde = kalanSn > 0 ? Math.max(0, (kalanSn / ilaclamaSuresi) * 100) : 0;
              // Bar rengi: kalanSn > 2/3 yeşil, >1/3 sarı, <=1/3 kırmızı
              if (kalanSn > ilaclamaSuresi * 2 / 3) barRenk = 'success';
              else if (kalanSn > ilaclamaSuresi / 3) barRenk = 'warning';
              else barRenk = 'error';
              const absSn = Math.abs(kalanSn);
              const sign = kalanSn < 0 ? '-' : '';
              const gun = Math.floor(absSn / (24 * 60 * 60));
              const saat = Math.floor((absSn % (24 * 60 * 60)) / 3600);
              const dk = Math.floor((absSn % 3600) / 60);
              const sn = absSn % 60;
              kalanStr = `${sign}${gun > 0 ? gun + 'g ' : ''}${saat > 0 ? saat + 's ' : ''}${dk > 0 ? dk + 'dk ' : ''}${sn}sn`;
            } else if ((!isAktif || turPasif) && ilaclandi) {
              barRenk = 'inherit';
              barYuzde = 100;
              kalanStr = 'Pasif';
            }
            return (
              <ListItem key={res.id || idx} divider
                sx={{ alignItems: 'flex-start', cursor: 'pointer', ...(turPasif ? { opacity: 0.5, filter: 'grayscale(0.7)' } : {}) }}
                onClick={e => {
                  if ((e.target as HTMLElement).closest('.ilacla-btn')) return;
                  setEditResource(res); setEditOpen(true);
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%', position: 'relative' }}>
                  {/* Süre dolduysa yanıp sönen uyarı ikonu */}
                  {ilaclandi && kalanSn <= 0 && isAktif && (
                    <WarningAmberIcon sx={{
                      color: 'error.main',
                      position: 'absolute',
                      top: -28,
                      left: 0,
                      fontSize: 32,
                      animation: 'blinker 1s linear infinite',
                      '@keyframes blinker': {
                        '50%': { opacity: 0 }
                      }
                    }} />
                  )}
                  {/* Logo */}
                  <img src={resourceTypeIcons[res.type]} alt={res.type} style={{ width: 32, height: 32, verticalAlign: 'middle', marginRight: 8 }} />
                  {/* Bilgiler */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700} color="primary.main">
                      {resourceTypes.find(r => r.value === res.type)?.label || res.type}
                    </Typography>
                    {res.adres && (
                      <Typography variant="body2" color="text.secondary">
                        <b>Kaynak Türü:</b> {res.adres}
                      </Typography>
                    )}
                    {res.ilce && (
                      <Typography variant="body2" color="text.secondary">
                        <b>İlçe:</b> {res.ilce}
                      </Typography>
                    )}
                    {res.mahalle && (
                      <Typography variant="body2" color="text.secondary">
                        <b>Mahalle:</b> {res.mahalle}
                      </Typography>
                    )}
                    {res.aciklama && (
                      <Typography variant="body2" color="text.secondary">
                        <b>Açıklama:</b> {res.aciklama}
                      </Typography>
                    )}
                    {res.tarih && (
                      <Typography variant="body2" color="text.secondary">
                        <b>Tarih:</b> {res.tarih}
                      </Typography>
                    )}
                    {/* İlaçlama zamanı ve barı */}
                    <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }} onClick={e => e.stopPropagation()}>
                      {ilaclandi && res.ilaclamaZamani && (
                        <Typography variant="caption" sx={{ mb: 0.5, color: barRenk === 'success' ? 'success.main' : barRenk === 'warning' ? 'warning.main' : barRenk === 'error' ? 'error.main' : '#888', fontWeight: 700 }}>
                          {isAktif ? `Kalan Süre: ${kalanStr}` : 'Pasif'}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title={ilaclandi ? `İlaçlandı: ${res.ilaclamaZamani ? new Date(res.ilaclamaZamani).toLocaleString('tr-TR') : ''}` : 'Henüz ilaçlanmadı'}>
                          <IconButton className="ilacla-btn" size="small" color={ilaclandi ? barRenk : 'default'} onClick={() => handleIlacla(res)} type="button" tabIndex={0}>
                            {ilaclandi ? <CheckCircleIcon /> : <RadioButtonUncheckedIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isAktif ? 'Pasif Yap' : 'Aktif Yap'}>
                          <IconButton size="small" color={isAktif ? 'primary' : 'inherit'} onClick={() => setAktiflik(a => ({ ...a, [res.id!]: !isAktif }))} type="button" tabIndex={0}>
                            {isAktif ? <PauseCircleIcon /> : <PlayCircleIcon />}
                          </IconButton>
                        </Tooltip>
                        <Box sx={{ flex: 1, minWidth: 80 }}>
                          <LinearProgress
                            variant="determinate"
                            value={ilaclandi ? barYuzde : 0}
                            sx={{
                              height: 10,
                              borderRadius: 5,
                              background: isAktif ? '#eee' : '#ccc',
                              position: 'relative',
                              ...(isAktif ? {
                                '& .MuiLinearProgress-bar': {
                                  backgroundColor:
                                    barRenk === 'success' ? '#43ea6d' :
                                    barRenk === 'warning' ? '#ffe066' :
                                    barRenk === 'error' ? '#ff5e5e' : '#bbb',
                                  transition: 'background 0.3s',
                                }
                              } : { '& .MuiLinearProgress-bar': { backgroundColor: '#bbb' } }),
                            }}
                            color={isAktif ? barRenk : 'inherit'}
                          />
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                  {/* Resim */}
                  {res.resim && (
                    <img
                      src={res.resim}
                      alt="Kaynak"
                      style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8, marginLeft: 12, border: '1px solid #eee', cursor: 'pointer' }}
                      onClick={e => {
                        e.stopPropagation();
                        setPreviewImageUrl(res.resim || null);
                        setImagePreviewOpen(true);
                      }}
                    />
                  )}
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Kaynak düzenleme ve detay modalı */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Kaynak Bilgileri
          <IconButton onClick={() => setEditOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {editResource && (
            <>
              <Box sx={{ mb: 2 }}>
                <SelectableMap
                  lat={editResource.lat}
                  lng={editResource.lng}
                  setLat={lat => setEditResource(r => r ? { ...r, lat } : r)}
                  setLng={lng => setEditResource(r => r ? { ...r, lng } : r)}
                  myPosition={myPosition}
                  resources={resources}
                  center={editResource.lat && editResource.lng ? [parseFloat(editResource.lat), parseFloat(editResource.lng)] : undefined}
                />
              </Box>
              <TextField
                select
                label="Kaynak Adı"
                value={editResource.type}
                onChange={e => setEditResource(r => r ? { ...r, type: e.target.value } : r)}
                fullWidth
                margin="normal"
              >
                {resourceTypes.map(option => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Kaynak Türü"
                value={editResource.adres || ''}
                onChange={e => setEditResource(r => r ? { ...r, adres: e.target.value } : r)}
                fullWidth
                margin="normal"
                disabled={!(editResource.type === 'sivrisinek' || editResource.type === 'karasinek')}
              >
                {(kaynakTuruSecenekleri[editResource.type] || []).map((secenek) => (
                  <MenuItem key={secenek} value={secenek}>{secenek}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="İlçe Adı"
                value={editResource.ilce || ''}
                onChange={e => setEditResource(r => r ? { ...r, ilce: e.target.value } : r)}
                fullWidth
                margin="normal"
              >
                {ilceler.map((ilceAdı) => (
                  <MenuItem key={ilceAdı} value={ilceAdı}>{ilceAdı}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Mahalle Adı"
                value={editResource.mahalle || ''}
                onChange={e => setEditResource(r => r ? { ...r, mahalle: e.target.value } : r)}
                fullWidth
                margin="normal"
              >
                {mahalleler.map((mahalleAdı) => (
                  <MenuItem key={mahalleAdı} value={mahalleAdı}>{mahalleAdı}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Açıklama"
                value={editResource.aciklama || ''}
                onChange={e => setEditResource(r => r ? { ...r, aciklama: e.target.value } : r)}
                fullWidth
                margin="normal"
                multiline
                minRows={2}
              />
              <TextField
                label="Tarih"
                type="date"
                value={editResource.tarih || ''}
                onChange={e => setEditResource(r => r ? { ...r, tarih: e.target.value } : r)}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                <Button variant="outlined" component="label" startIcon={<PhotoCamera />}>
                  Resim Yükle
                  <input type="file" accept="image/*" hidden onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setEditResource(r => r ? { ...r, resim: reader.result as string } : r);
                    };
                    reader.readAsDataURL(file);
                  }} />
                </Button>
                {editResource.resim && (
                  <img src={editResource.resim} alt="Önizleme" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Enlem (Lat)"
                  value={editResource.lat}
                  onChange={e => setEditResource(r => r ? { ...r, lat: e.target.value } : r)}
                  fullWidth
                  margin="normal"
                />
                <TextField
                  label="Boylam (Lng)"
                  value={editResource.lng}
                  onChange={e => setEditResource(r => r ? { ...r, lng: e.target.value } : r)}
                  fullWidth
                  margin="normal"
                />
              </Box>
              {editError && <Typography color="error" variant="body2">{editError}</Typography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={async () => {
            await handleDelete(editResource?.id);
            setEditOpen(false);
          }}>Kaynağı Sil</Button>
          <Button onClick={() => setEditOpen(false)} color="secondary">Vazgeç</Button>
          <Button onClick={handleEditSave} color="primary" variant="contained" disabled={editLoading}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Resim önizleme modalı */}
      <Dialog open={imagePreviewOpen} onClose={() => setImagePreviewOpen(false)} maxWidth="md">
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={previewImageUrl || ''} alt="Büyük Önizleme" style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 8, border: '1px solid #eee' }} />
          <Button sx={{ mt: 2 }} variant="contained" onClick={() => setImagePreviewOpen(false)}>Kapat</Button>
        </Box>
      </Dialog>
    </Box>
  );
};

export default Resources; 