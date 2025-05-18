import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, List, ListItem, ListItemText, TextField, Button, Drawer, IconButton, Avatar } from '@mui/material';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Circle, Popup, LayersControl, LayerGroup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import FilterListIcon from '@mui/icons-material/FilterList';
import MenuItem from '@mui/material/MenuItem';
// @ts-ignore
import MarkerClusterGroup from 'react-leaflet-cluster';

const API_URL = process.env.REACT_APP_API_URL + '/api/markers';
const RESOURCES_API = process.env.REACT_APP_API_URL + '/api/resources';

// Varsayılan marker ikonunu düzeltmek için
const iconUrl = require('leaflet/dist/images/marker-icon.png');
const iconShadow = require('leaflet/dist/images/marker-shadow.png');

const defaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const center: [number, number] = [39.9208, 32.8541]; // Ankara merkez

const resourceTypeIcons: { [key: string]: string } = {
  sivrisinek: 'https://cdn-icons-png.flaticon.com/512/17275/17275339.png',
  karasinek: 'https://cdn-icons-png.flaticon.com/512/12311/12311394.png',
  cop: 'https://cdn-icons-png.flaticon.com/512/7657/7657533.png',
  logar: 'https://cdn-icons-png.flaticon.com/512/4357/4357706.png',
};

const MapPage: React.FC = () => {
  const [markers, setMarkers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [myPosition, setMyPosition] = useState<[number, number] | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterIlce, setFilterIlce] = useState('');
  const [filterMahalle, setFilterMahalle] = useState('');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [searchText] = useState('');
  const [searchMatchedId, setSearchMatchedId] = useState<string | null>(null);
  const [rotaKaynakIds, setRotaKaynakIds] = useState<string[]>([]);
  const [rotaType, setRotaType] = useState('');
  const [rotaIlce, setRotaIlce] = useState('');
  const [rotaMahalle, setRotaMahalle] = useState('');
  const [rotaPolyline, setRotaPolyline] = useState<[number, number][]>([]);
  const [rotaLoading, setRotaLoading] = useState(false);
  const [rotaOzet, setRotaOzet] = useState<{ mesafe: number; sure: number } | null>(null);
  const mapRef = useRef<any>(null);

  // İlçe ve mahalleler (örnek, gerekirse dışarıdan alınabilir)
  const ilceler = [
    'Altıeylül', 'Ayvalık', 'Balya', 'Bandırma', 'Bigadiç', 'Burhaniye', 'Dursunbey',
    'Edremit', 'Erdek', 'Gömeç', 'Gönen', 'Havran', 'İvrindi', 'Karesi', 'Kepsut',
    'Manyas', 'Marmara', 'Savaştepe', 'Sındırgı', 'Susurluk'
  ];
  const mahalleler = [
    'KADİKÖY', 'KAVAK ALANI', 'GÖKMUSA', 'SÖBÜCEALAN', 'KARLIK', 'ILICA', 'YENİKAVAK', 'YARIŞALALANI', 'KARACAHİSAR', 'KAYALAR',
    'SEMİZKÖY', 'ÖREN', 'DANIŞMENT', 'GÖLOBA', 'KOYUNERİ', 'ORHANLAR', 'DEĞİRMENDERE', 'MANCILIK', 'DEREKÖY', 'KARAMUSTAFALAR',
    'ÇALOVA', 'YAZLIK', 'ÇUKURCAK', 'KAYAPINAR',
    'MÜSTECAP', 'BENGİLER', 'ÇİĞDEM', 'ÇAMAVŞAR', 'ÇAMUCU', 'FARSAK', 'ÇARMIK', 'YAYLACIK', 'HAVUTBAŞI', 'DOĞANLAR',
    'ÇAKALLAR', 'YUKARI ÇAKALLAR', 'KAŞIKÇI', 'HABİPLER', 'GÖKTEPE', 'AKBAŞ', 'KOCABÜK', 'MEDRESE', 'HACIHÜSEYİN', 'NARLI',
    'ALİDEMİRCİ', 'AKÇAL', 'PATLAK',
    'KOCACAMİ', 'ENVERPAŞA'
  ].sort((a, b) => a.localeCompare(b, 'tr'));

  // Filtreye uyan kaynaklar
  const filteredResources = resources.filter(res => {
    if (filterType && res.type !== filterType) return false;
    if (filterIlce && res.ilce !== filterIlce) return false;
    if (filterMahalle && res.mahalle !== filterMahalle) return false;
    return true;
  });

  // Rota için filtrelenmiş kaynaklar
  const rotaFilteredResources = resources.filter(res => {
    if (rotaType && res.type !== rotaType) return false;
    if (rotaIlce && res.ilce !== rotaIlce) return false;
    if (rotaMahalle && res.mahalle !== rotaMahalle) return false;
    return true;
  });

  // Arama işlemi
  useEffect(() => {
    if (!searchText) {
      setSearchMatchedId(null);
      return;
    }
    const found = filteredResources.find(res =>
      (res.type && res.type.toLowerCase().includes(searchText.toLowerCase())) ||
      (res.mahalle && res.mahalle.toLowerCase().includes(searchText.toLowerCase())) ||
      (res.adres && res.adres.toLowerCase().includes(searchText.toLowerCase()))
    );
    if (found && mapRef.current) {
      setSearchMatchedId(found.id);
      mapRef.current.setView([parseFloat(found.lat), parseFloat(found.lng)], 15);
    } else {
      setSearchMatchedId(null);
    }
  }, [searchText, filteredResources]);

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

  // Hem işaretleri hem kaynakları çek
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => setMarkers(data))
      .catch(() => console.error('İşaretler alınamadı!'));
    fetch(RESOURCES_API)
      .then(res => res.json())
      .then(data => setResources(data))
      .catch(() => console.error('Kaynaklar alınamadı!'));
  }, []);

  // localStorage'dan ilaçlanma sürelerini oku
  const defaultSureler = { sivrisinek: { gun: 15, saat: 0, dakika: 0 }, karasinek: { gun: 15, saat: 0, dakika: 0 }, cop: { gun: 20, saat: 0, dakika: 0 }, logar: { gun: 10, saat: 0, dakika: 0 } };
  let ilaclanmaSureleri: Record<string, { gun: number; saat: number; dakika: number }> = defaultSureler;
  try {
    const stored = localStorage.getItem('ilaclamaSureleri');
    if (stored) ilaclanmaSureleri = JSON.parse(stored);
  } catch {}

  // Kalan süre hesaplama fonksiyonu (örnek: 15 gün)
  function kalanSure(res: any) {
    if (!res.ilaclandiMi || !res.ilaclamaZamani) return '-';
    const sure = ilaclanmaSureleri[res.type] || { gun: 15, saat: 0, dakika: 0 };
    const gun = Number(sure.gun) || 0;
    const saat = Number(sure.saat) || 0;
    const dakika = Number(sure.dakika) || 0;
    const ILACLAMA_SURESI = (gun * 24 * 60 * 60) + (saat * 60 * 60) + (dakika * 60);
    const start = new Date(res.ilaclamaZamani).getTime();
    const now = Date.now();
    const diff = Math.floor((now - start) / 1000);
    let kalanSn = ILACLAMA_SURESI - diff;
    if (!isFinite(kalanSn) || isNaN(kalanSn) || kalanSn <= 0) return 'Süresi Doldu';
    const kalanGun = Math.floor(kalanSn / (24 * 60 * 60));
    const kalanSaat = Math.floor((kalanSn % (24 * 60 * 60)) / 3600);
    const kalanDk = Math.floor((kalanSn % 3600) / 60);
    return `Kalan Süre: ${kalanGun}g ${kalanSaat}s ${kalanDk}dk`;
  }

  // Konumuma git butonu
  function GoToMyLocation({ position }: { position: [number, number] | null }) {
    const map = useMap();
    return (
      <Box
        sx={{
          position: 'absolute',
          bottom: { xs: 16, md: 24 },
          right: { xs: 16, md: 24 },
          zIndex: 1200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
        }}
      >
        <IconButton
          color="primary"
          size="large"
          sx={{
            bgcolor: 'white',
            boxShadow: 3,
            width: { xs: 64, sm: 56 },
            height: { xs: 64, sm: 56 },
            borderRadius: '50%',
            border: '2px solid #1976d2',
            '&:hover': { bgcolor: '#e3f2fd' },
            opacity: position ? 1 : 0.5,
            pointerEvents: position ? 'auto' : 'none',
          }}
          onClick={() => {
            if (position) map.setView(position, 15);
          }}
          disabled={!position}
        >
          <MyLocationIcon sx={{ fontSize: { xs: 38, sm: 32 }, color: '#1976d2' }} />
        </IconButton>
      </Box>
    );
  }

  // Hızlı ilaçla fonksiyonu
  const handleIlacla = async (res: any) => {
    if (!res.id) return;
    const now = new Date().toISOString();
    try {
      await fetch(`${RESOURCES_API}/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ilaclamaZamani: now, ilaclandiMi: true })
      });
      // Kaynakları güncelle
      fetch(RESOURCES_API)
        .then(res => res.json())
        .then(data => setResources(data));
    } catch {}
  };

  // Marker seçme/çıkarma
  const handleSelectResource = (id: string) => {
    setSelectedResourceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // Toplu ilaçla
  const handleBulkIlacla = async () => {
    const now = new Date().toISOString();
    await Promise.all(selectedResourceIds.map(async id => {
      await fetch(`${RESOURCES_API}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ilaclamaZamani: now, ilaclandiMi: true })
      });
    }));
    // Kaynakları güncelle
    fetch(RESOURCES_API)
      .then(res => res.json())
      .then(data => setResources(data));
    setSelectedResourceIds([]);
  };

  // Seçimi temizle
  const handleClearSelection = () => setSelectedResourceIds([]);

  // İstatistikler
  const toplamKaynak = resources.length;
  let aktifKaynak = 0, kritikKaynak = 0, dolanKaynak = 0;
  resources.forEach(res => {
    if (res.ilaclandiMi && res.ilaclamaZamani) {
      const sure = ilaclanmaSureleri[res.type] || { gun: 15, saat: 0, dakika: 0 };
      const gun = Number(sure.gun) || 0;
      const saat = Number(sure.saat) || 0;
      const dakika = Number(sure.dakika) || 0;
      const ILACLAMA_SURESI = (gun * 24 * 60 * 60) + (saat * 60 * 60) + (dakika * 60);
      const start = new Date(res.ilaclamaZamani).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const kalanSn = ILACLAMA_SURESI - diff;
      if (!isFinite(kalanSn) || isNaN(kalanSn) || kalanSn <= 0) dolanKaynak++;
      else if (kalanSn < 3 * 24 * 60 * 60) kritikKaynak++;
      else aktifKaynak++;
    } else {
      aktifKaynak++;
    }
  });

  // Rota oluştur
  const handleRotaOlustur = async () => {
    if (!myPosition) {
      alert('Anlık konum alınamadı! Lütfen konum izni verin veya konumunuzu açın.');
      return;
    }
    if (rotaKaynakIds.length < 1) {
      alert('En az 1 kaynak seçmelisiniz!');
      return;
    }
    setRotaLoading(true);
    // id eşleşmesini hem string hem number olarak yap
    const selected = rotaFilteredResources.filter(r => rotaKaynakIds.includes(r.id) || rotaKaynakIds.includes(String(r.id)));
    if (selected.length < 1) {
      alert('Seçili kaynaklar bulunamadı!');
      setRotaLoading(false);
      return;
    }
    // Başlangıç noktası olarak anlık konum ekle
    const coords = [[myPosition[1], myPosition[0]], ...selected.map(r => [parseFloat(r.lng), parseFloat(r.lat)])];
    if (coords.some(c => isNaN(c[0]) || isNaN(c[1]))) {
      alert('Seçili kaynaklardan birinin koordinatı eksik veya hatalı!');
      setRotaLoading(false);
      return;
    }
    const coordStr = coords.map(c => c.join(',')).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes[0]) {
        const routeCoords = data.routes[0].geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
        );
        setRotaPolyline(routeCoords);
        // Mesafe ve süreyi state'e yaz
        setRotaOzet({
          mesafe: data.routes[0].distance,
          sure: data.routes[0].duration
        });
      } else {
        setRotaPolyline([]);
        setRotaOzet(null);
        alert('Rota bulunamadı!');
      }
    } catch {
      setRotaPolyline([]);
      setRotaOzet(null);
      alert('Rota oluşturulurken hata oluştu!');
    }
    setRotaLoading(false);
  };

  // Rota temizle
  const handleRotaTemizle = () => {
    setRotaPolyline([]);
    setRotaKaynakIds([]);
    setRotaOzet(null);
  };

  // En kısa rota (optimize) fonksiyonu
  const handleEnKisaRota = async () => {
    if (!myPosition) {
      alert('Anlık konum alınamadı!');
      return;
    }
    if (rotaKaynakIds.length < 2) {
      alert('En az 2 kaynak seçmelisiniz!');
      return;
    }
    // id eşleşmesini hem string hem number olarak yap
    const selected = rotaFilteredResources.filter(r => rotaKaynakIds.includes(r.id) || rotaKaynakIds.includes(String(r.id)));
    if (selected.length < 2) {
      alert('Seçili kaynaklar bulunamadı!');
      return;
    }
    // Başlangıç noktası olarak anlık konum ekle
    const coords = [[myPosition[1], myPosition[0]], ...selected.map(r => [parseFloat(r.lng), parseFloat(r.lat)])];
    if (coords.some(c => isNaN(c[0]) || isNaN(c[1]))) {
      alert('Seçili kaynaklardan birinin koordinatı eksik veya hatalı!');
      return;
    }
    const coordStr = coords.map(c => c.join(',')).join(';');
    const url = `https://router.project-osrm.org/trip/v1/driving/${coordStr}?source=first&roundtrip=false&overview=full&geometries=geojson`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.trips && data.trips[0] && data.waypoints) {
        // Yeni sıralamayı bul
        // İlk nokta (anlık konum) sabit, diğerleri optimize edilmiş
        const newOrder = data.waypoints.slice(1).sort(
          (a: any, b: any) => a.waypoint_index - b.waypoint_index
        );
        const newIds = newOrder.map((wp: any) => {
          // Koordinat eşleşmesi ile id bul
          const [lng, lat] = wp.location;
          const found = selected.find(r => Math.abs(parseFloat(r.lat) - lat) < 1e-5 && Math.abs(parseFloat(r.lng) - lng) < 1e-5);
          return found ? found.id : null;
        }).filter(Boolean);
        setRotaKaynakIds(newIds);
        // Rota çizgisi ve özet
        const routeCoords = data.trips[0].geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon] as [number, number]
        );
        setRotaPolyline(routeCoords);
        setRotaOzet({
          mesafe: data.trips[0].distance,
          sure: data.trips[0].duration
        });
      } else {
        alert('En kısa rota bulunamadı!');
      }
    } catch {
      alert('En kısa rota oluşturulurken hata oluştu!');
    }
  };

  // Ana return bloğunu ve içerikleri tek bir kapsayıcı ile sarıyorum, eksik kapanışları tamamlıyorum
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f4f6fa', pb: 4 }}>
      <Box sx={{ maxWidth: 900, mx: 'auto', mt: 4, mb: 2, p: { xs: 1, sm: 2 }, background: '#fff', borderRadius: 3, boxShadow: 3 }}>
        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="outlined" startIcon={<FilterListIcon />} onClick={() => setFilterOpen(true)}>
            Filtrele
          </Button>
        </Box>
        <Drawer
          anchor="left"
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: '100vw', sm: 380 },
              maxWidth: '100vw',
              height: { xs: '100vh', sm: 'auto' },
              borderRadius: { xs: 0, sm: 3 },
              boxShadow: 8,
              p: 0,
              transition: 'all 0.3s',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: '#f8fafc',
            }
          }}
        >
          <Box sx={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', p: 0, pt: 0 }}>
            {/* Sabit başlık ve kapatma butonu */}
            <Box sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
              <FilterListIcon color="primary" sx={{ mr: 1, fontSize: 30 }} />
              <Typography variant="h6" fontWeight={700} sx={{ fontSize: 22 }}>Filtrele</Typography>
              <IconButton sx={{ ml: 'auto', fontSize: 30 }} onClick={() => setFilterOpen(false)}>
                ×
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, pt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                select
                label="Kaynak Adı"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                fullWidth
                sx={{ fontSize: 18 }}
                size="medium"
                InputLabelProps={{ style: { fontSize: 18 } }}
                InputProps={{ style: { fontSize: 18 } }}
              >
                <MenuItem value="">Tümü</MenuItem>
                <MenuItem value="sivrisinek">Sivrisinek</MenuItem>
                <MenuItem value="karasinek">Karasinek</MenuItem>
                <MenuItem value="cop">Çöp Konteynırı</MenuItem>
                <MenuItem value="logar">Logar</MenuItem>
              </TextField>
              <TextField
                select
                label="İlçe"
                value={filterIlce}
                onChange={e => setFilterIlce(e.target.value)}
                fullWidth
                sx={{ fontSize: 18 }}
                size="medium"
                InputLabelProps={{ style: { fontSize: 18 } }}
                InputProps={{ style: { fontSize: 18 } }}
              >
                <MenuItem value="">Tümü</MenuItem>
                {ilceler.map(ilce => (
                  <MenuItem key={ilce} value={ilce}>{ilce}</MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Mahalle"
                value={filterMahalle}
                onChange={e => setFilterMahalle(e.target.value)}
                fullWidth
                sx={{ fontSize: 18 }}
                size="medium"
                InputLabelProps={{ style: { fontSize: 18 } }}
                InputProps={{ style: { fontSize: 18 } }}
              >
                <MenuItem value="">Tümü</MenuItem>
                {mahalleler.map(mahalle => (
                  <MenuItem key={mahalle} value={mahalle}>{mahalle}</MenuItem>
                ))}
              </TextField>
            </Box>
            {/* Alt kısımda sabit butonlar */}
            <Box sx={{ px: 2, pb: 2, pt: 1, borderTop: '1px solid #e0e0e0', bgcolor: '#fff', position: 'sticky', bottom: 0, zIndex: 10, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                fullWidth
                sx={{ py: 1.3, fontSize: 17, fontWeight: 600, borderRadius: 2 }}
                onClick={() => {
                  setFilterType('');
                  setFilterIlce('');
                  setFilterMahalle('');
                }}
              >
                Sıfırla
              </Button>
              <Button
                variant="contained"
                color="primary"
                fullWidth
                sx={{ py: 1.3, fontSize: 17, fontWeight: 700, borderRadius: 2 }}
                onClick={() => setFilterOpen(false)}
              >
                Uygula
              </Button>
            </Box>
          </Box>
        </Drawer>
        <Paper elevation={3} sx={{ p: { xs: 1, sm: 2 }, maxWidth: 800, mx: 'auto', mb: 4 }}>
          {/* Toplu seçim barı */}
          {selectedResourceIds.length > 0 && (
            <Box sx={{
              display: 'flex', justifyContent: 'flex-end', mb: 1, gap: 2,
              flexDirection: { xs: 'column', sm: 'row' },
              alignItems: { xs: 'stretch', sm: 'center' },
            }}>
              <Typography color="primary" fontWeight={700} sx={{ fontSize: { xs: 16, sm: 18 } }}>
                {selectedResourceIds.length} kaynak seçildi
              </Typography>
              <Button variant="contained" color="success" size="large" sx={{ fontSize: { xs: 16, sm: 14 }, py: { xs: 1.2, sm: 0.5 } }} onClick={handleBulkIlacla}>
                Toplu İlaçla
              </Button>
              <Button variant="outlined" color="error" size="large" sx={{ fontSize: { xs: 16, sm: 14 }, py: { xs: 1.2, sm: 0.5 } }} onClick={handleClearSelection}>
                Seçimi Temizle
              </Button>
            </Box>
          )}
          <Box sx={{ width: '100%', height: { xs: 'calc(100vh - 56px)', sm: 500 }, borderRadius: { xs: 0, sm: 2 }, overflow: 'hidden', mb: 1, mt: 1, position: 'relative', boxShadow: 3 }}>
            <MapContainer center={center} zoom={8} style={{ width: '100%', height: '100%' }} ref={mapRef}>
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Sokak Haritası (OSM)">
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Uydu (Esri)">
                  <TileLayer
                    attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Topoğrafya (OpenTopoMap)">
                  <TileLayer
                    attribution='Map data: &copy; OpenTopoMap (CC-BY-SA)'
                    url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                  />
                </LayersControl.BaseLayer>
                <LayersControl.Overlay checked name="İşaretler">
                  <LayerGroup>
                    {markers.map((marker, idx) => (
                      <Marker key={marker.id || idx} position={[marker.lat, marker.lng]} />
                    ))}
                  </LayerGroup>
                </LayersControl.Overlay>
                <LayersControl.Overlay checked name="Kaynaklar">
                  <LayerGroup>
                    <MarkerClusterGroup>
                      {/* Rota planlayıcıda seçili kaynaklar için özel marker */}
                      {rotaFilteredResources.map((res: any, idx: number) => {
                        const isRotaSelected = rotaKaynakIds.includes(res.id);
                        if (!isRotaSelected) return null;
                        // Sıra numarasını bul
                        const order = rotaKaynakIds.indexOf(res.id);
                        return (
                          <Marker
                            key={`rota-${res.id}`}
                            position={[parseFloat(res.lat), parseFloat(res.lng)]}
                            icon={L.divIcon({
                              html: `<div style='position:relative;display:flex;align-items:center;justify-content:center;'>
                                <img src='https://cdn-icons-png.flaticon.com/512/684/684908.png' style='width:36px;height:36px;'/>
                                <div style='position:absolute;top:-8px;right:-8px;background:#1976d2;color:white;font-size:14px;font-weight:bold;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border:2px solid #fff;'>${order+1}</div>
                              </div>`
                            })}
                          >
                            <Tooltip>Rota Noktası #{order+1}</Tooltip>
                          </Marker>
                        );
                      })}
                      {/* Diğer kaynak markerları */}
                      {filteredResources.map((res: any, idx: number) => {
                        // Kalan süreyi hesapla (saniye cinsinden)
                        // let kalanSn = null; // SİL
                        // if (res.ilaclandiMi && res.ilaclamaZamani) {
                        //   ...
                        //   kalanSn = ...
                        // } // SİL
                        // Her zaman kendi iconu gösterilecek
                        let iconUrl = resourceTypeIcons[res.type] || resourceTypeIcons['sivrisinek'];
                        let tooltipText = res.type;
                        const isSelected = selectedResourceIds.includes(res.id);
                        const isSearched = searchMatchedId === res.id;
                        return (
                          <Marker
                            key={res.id || idx}
                            position={[parseFloat(res.lat), parseFloat(res.lng)]}
                            icon={L.icon({
                              iconUrl,
                              iconSize: isSearched ? [44, 44] : isSelected ? [38, 38] : [28, 28],
                              iconAnchor: [isSearched ? 22 : isSelected ? 19 : 14, isSearched ? 44 : isSelected ? 38 : 28],
                              popupAnchor: [0, -28],
                              className: isSearched ? 'searched-marker' : isSelected ? 'selected-marker' : '',
                            })}
                            eventHandlers={{
                              click: () => handleSelectResource(res.id)
                            }}
                          >
                            <Popup minWidth={260} maxWidth={420}>
                              <Box sx={{
                                p: { xs: 1.5, sm: 2 },
                                minWidth: { xs: '90vw', sm: 260 },
                                maxWidth: { xs: '98vw', sm: 420 },
                                borderRadius: 3,
                                boxShadow: 6,
                                bgcolor: '#fff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1.2,
                                '@media (max-width:600px)': {
                                  minWidth: '98vw',
                                  maxWidth: '99vw',
                                  px: 2,
                                  py: 2,
                                  borderRadius: 0,
                                }
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Avatar src={resourceTypeIcons[res.type] || ''} sx={{ width: 38, height: 38, bgcolor: '#e3f2fd' }} />
                                  <Typography variant="h6" color="primary" fontWeight={700} sx={{ fontSize: { xs: 18, sm: 20 } }}>
                                    {res.type?.charAt(0).toUpperCase() + res.type?.slice(1)}
                                  </Typography>
                                </Box>
                                {res.adres && <Typography variant="body2"><b>Adres:</b> {res.adres}</Typography>}
                                {res.ilce && <Typography variant="body2"><b>İlçe:</b> {res.ilce}</Typography>}
                                {res.mahalle && <Typography variant="body2"><b>Mahalle:</b> {res.mahalle}</Typography>}
                                {res.aciklama && <Typography variant="body2"><b>Açıklama:</b> {res.aciklama}</Typography>}
                                {res.tarih && <Typography variant="body2"><b>Tarih:</b> {res.tarih}</Typography>}
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                  <b>Son İlaçlama:</b> {res.ilaclamaZamani ? new Date(res.ilaclamaZamani).toLocaleString('tr-TR') : '-'}
                                </Typography>
                                <Typography variant="body2">
                                  <b>Kalan Süre:</b> {kalanSure(res)}
                                </Typography>
                                {res.resim && (
                                  <Box sx={{ mt: 1, mb: 1, textAlign: 'center' }}>
                                    <img src={res.resim} alt="Kaynak" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: '1px solid #eee' }} />
                                  </Box>
                                )}
                                <Button variant="contained" color="success" size="large" fullWidth sx={{ mt: 1, fontSize: { xs: 17, sm: 15 }, py: { xs: 1.3, sm: 0.7 }, borderRadius: 2 }} onClick={() => handleIlacla(res)}>
                                  İlaçlandı Olarak İşaretle
                                </Button>
                              </Box>
                            </Popup>
                            <Tooltip>{tooltipText}</Tooltip>
                          </Marker>
                        );
                      })}
                    </MarkerClusterGroup>
                  </LayerGroup>
                </LayersControl.Overlay>
                {rotaPolyline.length > 1 && (
                  <Polyline
                    positions={rotaPolyline}
                    pathOptions={{ color: 'blue', weight: 5, opacity: 0.8 }}
                  />
                )}
                {myPosition && (
                  <LayersControl.Overlay checked name="Kendi Konumunuz">
                    <LayerGroup>
                      <Circle center={myPosition} radius={15} pathOptions={{ color: '#1976d2', fillColor: '#1976d2', fillOpacity: 0.2 }}>
                        <Tooltip>Kendi Konumunuz</Tooltip>
                      </Circle>
                    </LayerGroup>
                  </LayersControl.Overlay>
                )}
              </LayersControl>
              <GoToMyLocation position={myPosition} />
            </MapContainer>
          </Box>
        </Paper>
        {/* Mini istatistik paneli haritadan tamamen bağımsız */}
        <Box sx={{
          maxWidth: 800,
          mx: 'auto',
          mb: 2,
          mt: 1,
          px: { xs: 1, sm: 0 },
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <Box sx={{
            bgcolor: 'rgba(255,255,255,0.92)',
            boxShadow: 3,
            borderRadius: 2,
            px: 2,
            py: 1,
            minWidth: 160,
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            '@media (max-width:600px)': {
              minWidth: 0,
              px: 1,
              py: 0.5,
              fontSize: 13,
            }
          }}>
            <Typography fontWeight={700} color="primary" sx={{ fontSize: { xs: 15, sm: 16 } }}>İstatistikler</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Toplam:</span>
              <b>{toplamKaynak}</b>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#43ea6d' }}>
              <span>Aktif:</span>
              <b>{aktifKaynak}</b>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#ff9800' }}>
              <span>Kritik:</span>
              <b>{kritikKaynak}</b>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#ff5e5e' }}>
              <span>Süresi Dolan:</span>
              <b>{dolanKaynak}</b>
            </Box>
          </Box>
        </Box>
        {/* Kaynak Rota Planlayıcı */}
        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 2, mt: 2, p: 2, background: '#f8fafc', borderRadius: 2, border: '1px solid #e0e0e0',
          boxShadow: 2,
          '@media (max-width:600px)': {
            p: 1,
            borderRadius: 1,
          }
        }}>
          <Typography variant="h6" color="primary" fontWeight={700} sx={{ mb: 2, fontSize: { xs: 18, sm: 22 } }}>Kaynak Rota Planlayıcı</Typography>
          {/* Seçili kaynakların sıralı listesi ve ok tuşları */}
          {rotaKaynakIds.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={600} sx={{ mb: 1, fontSize: { xs: 15, sm: 16 } }}>Rota Sırası:</Typography>
              <List dense sx={{ bgcolor: '#fff', borderRadius: 1, boxShadow: 1, p: 0 }}>
                {rotaKaynakIds.map((id, idx) => {
                  const r = rotaFilteredResources.find(x => x.id === id);
                  if (!r) return null;
                  return (
                    <ListItem key={id} secondaryAction={
                      <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
                        <IconButton size="medium" disabled={idx === 0} onClick={() => {
                          if (idx === 0) return;
                          const newIds = [...rotaKaynakIds];
                          [newIds[idx - 1], newIds[idx]] = [newIds[idx], newIds[idx - 1]];
                          setRotaKaynakIds(newIds);
                        }} sx={{ fontSize: { xs: 22, sm: 18 } }}>
                          <span style={{fontSize:22}}>↑</span>
                        </IconButton>
                        <IconButton size="medium" disabled={idx === rotaKaynakIds.length - 1} onClick={() => {
                          if (idx === rotaKaynakIds.length - 1) return;
                          const newIds = [...rotaKaynakIds];
                          [newIds[idx + 1], newIds[idx]] = [newIds[idx], newIds[idx + 1]];
                          setRotaKaynakIds(newIds);
                        }} sx={{ fontSize: { xs: 22, sm: 18 } }}>
                          <span style={{fontSize:22}}>↓</span>
                        </IconButton>
                        {/* Haritada göster butonu */}
                        <IconButton size="medium" onClick={() => {
                          if (mapRef.current && r.lat && r.lng) {
                            mapRef.current.setView([parseFloat(r.lat), parseFloat(r.lng)], 16);
                          }
                        }} title="Haritada Göster" sx={{ fontSize: { xs: 22, sm: 18 } }}>
                          <span style={{fontSize:22}}>📍</span>
                        </IconButton>
                        {/* Listeden çıkar butonu */}
                        <IconButton size="medium" color="error" onClick={() => {
                          setRotaKaynakIds(rotaKaynakIds.filter(x => x !== id));
                        }} title="Listeden Çıkar" sx={{ fontSize: { xs: 22, sm: 18 } }}>
                          <span style={{fontSize:22}}>✕</span>
                        </IconButton>
                      </Box>
                    }>
                      <ListItemText primary={`${idx + 1}. ${r.type} - ${r.ilce} / ${r.mahalle}`} sx={{ fontSize: { xs: 15, sm: 16 } }} />
                    </ListItem>
                  );
                })}
              </List>
              {/* Rota özeti */}
              {rotaOzet && (
                <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1, display: 'flex', gap: 3, fontWeight: 600, fontSize: { xs: 14, sm: 15 }, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <span>Toplam Mesafe: {(rotaOzet.mesafe / 1000).toFixed(2)} km</span>
                  <span>Tahmini Süre: {(rotaOzet.sure / 60).toFixed(0)} dk</span>
                </Box>
              )}
            </Box>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField
              select
              label="Kaynak Türü"
              value={rotaType}
              onChange={e => setRotaType(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="sivrisinek">Sivrisinek</MenuItem>
              <MenuItem value="karasinek">Karasinek</MenuItem>
              <MenuItem value="cop">Çöp Konteynırı</MenuItem>
              <MenuItem value="logar">Logar</MenuItem>
            </TextField>
            <TextField
              select
              label="İlçe"
              value={rotaIlce}
              onChange={e => setRotaIlce(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {ilceler.map(ilce => (
                <MenuItem key={ilce} value={ilce}>{ilce}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Mahalle"
              value={rotaMahalle}
              onChange={e => setRotaMahalle(e.target.value)}
              size="small"
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="">Tümü</MenuItem>
              {mahalleler.map(mahalle => (
                <MenuItem key={mahalle} value={mahalle}>{mahalle}</MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Kaynak Adı"
              value={rotaKaynakIds}
              onChange={e => setRotaKaynakIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              size="small"
              sx={{ minWidth: 200, flex: 1 }}
              SelectProps={{ multiple: true, renderValue: (selected) => (selected as string[]).map(id => {
                const r = rotaFilteredResources.find(x => x.id === id);
                return r ? `${r.type} - ${r.ilce} / ${r.mahalle}` : id;
              }).join(', ') }}
            >
              {rotaFilteredResources.map(r => (
                <MenuItem key={r.id} value={r.id}>{r.type} - {r.ilce} / {r.mahalle}</MenuItem>
              ))}
            </TextField>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button variant="contained" color="primary" disabled={rotaKaynakIds.length < 2 || rotaLoading} onClick={handleRotaOlustur} sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: 16, sm: 15 }, py: { xs: 1.2, sm: 0.5 } }}>
              {rotaLoading ? 'Rota Oluşturuluyor...' : 'Rota Oluştur'}
            </Button>
            <Button variant="outlined" color="secondary" onClick={handleRotaTemizle} disabled={rotaPolyline.length === 0 && rotaKaynakIds.length === 0} sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: 16, sm: 15 }, py: { xs: 1.2, sm: 0.5 } }}>
              Temizle
            </Button>
            <Button variant="contained" color="success" disabled={rotaKaynakIds.length < 2} onClick={handleEnKisaRota} sx={{ width: { xs: '100%', sm: 'auto' }, fontSize: { xs: 16, sm: 15 }, py: { xs: 1.2, sm: 0.5 } }}>
              En Kısa Rota
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MapPage; 