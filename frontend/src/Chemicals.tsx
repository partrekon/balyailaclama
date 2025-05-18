import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, LinearProgress, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ScienceIcon from '@mui/icons-material/Science';

const API_URL = process.env.REACT_APP_API_URL + '/api/chemicals';

// Başlangıçta eğer veritabanı boşsa eklenebilecek örnek ilaçlar
const defaultChemicals = [
  { name: 'Biyocyper', stock: 100, used: 0 },
  { name: 'Alfavek', stock: 80, used: 0 },
  { name: 'Protoks', stock: 60, used: 0 },
];

type Chemical = {
  id?: number;
  name: string;
  stock: number;
  used: number;
};

const Chemicals: React.FC = () => {
  const [chemicals, setChemicals] = useState<Chemical[]>([]);
  const [inputs, setInputs] = useState<{ [key: string]: string }>({});
  const [addInputs, setAddInputs] = useState<{ [key: string]: string }>({});
  const [removeInputs, setRemoveInputs] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Giriş yapan kullanıcının admin olup olmadığını kontrol et
  const currentUser = JSON.parse(localStorage.getItem('balya_user') || '{}');
  const isAdmin = currentUser && currentUser.role === 'admin';

  // Açılışta ilaçları çek
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        // Aynı isimli ilaçları sadece bir kez göster
        const unique: { [name: string]: Chemical } = {};
        data.forEach((chem: Chemical) => {
          if (!unique[chem.name]) unique[chem.name] = chem;
        });
        const uniqueList = Object.values(unique);
        if (uniqueList.length === 0) {
          // Eğer hiç ilaç yoksa, default ilaçları ekle
          defaultChemicals.forEach(async (chem) => {
            await fetch(API_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(chem)
            });
          });
          setTimeout(() => {
            fetch(API_URL)
              .then(res => res.json())
              .then(data2 => {
                const unique2: { [name: string]: Chemical } = {};
                data2.forEach((chem: Chemical) => {
                  if (!unique2[chem.name]) unique2[chem.name] = chem;
                });
                setChemicals(Object.values(unique2));
              });
          }, 500);
        } else {
          setChemicals(uniqueList);
        }
      })
      .catch(() => setError('İlaçlar alınamadı!'));
  }, []);

  // Kullanım miktarını güncelle
  const handleUse = async (name: string, id?: number) => {
    const value = Number(inputs[name]);
    if (isNaN(value) || value <= 0) {
      setError('Geçerli bir kullanım miktarı giriniz!');
      return;
    }
    setError('');
    setLoading(true);
    const chem = chemicals.find(c => c.name === name);
    if (!chem) return;
    if (chem.stock - chem.used < value) {
      setError('Yeterli stok yok!');
      setLoading(false);
      return;
    }
    // Backend'de güncelleme için PATCH isteği
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ used: chem.used + value })
      });
      if (res.ok) {
        setChemicals(prev => prev.map(c => c.id === id ? { ...c, used: c.used + value } : c));
        setInputs({ ...inputs, [name]: '' });
      } else {
        setError('Güncelleme başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamıyor!');
    }
    setLoading(false);
  };

  // Stok ekleme
  const handleAddStock = async (name: string, id?: number) => {
    const value = Number(addInputs[name]);
    if (isNaN(value) || value <= 0) {
      setError('Geçerli bir stok miktarı giriniz!');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    const chem = chemicals.find(c => c.name === name);
    if (!chem) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: chem.stock + value })
      });
      if (res.ok) {
        setChemicals(prev => prev.map(c => c.id === id ? { ...c, stock: c.stock + value } : c));
        setAddInputs({ ...addInputs, [name]: '' });
        setSuccess('Stok başarıyla eklendi!');
      } else {
        setError('Stok ekleme başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamıyor!');
    }
    setLoading(false);
  };

  // Stok çıkarma
  const handleRemoveStock = async (name: string, id?: number) => {
    const value = Number(removeInputs[name]);
    if (isNaN(value) || value <= 0) {
      setError('Geçerli bir stok çıkarma miktarı giriniz!');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    const chem = chemicals.find(c => c.name === name);
    if (!chem) return;
    if (chem.stock - value < chem.used) {
      setError('Bu kadar stok çıkarılamaz!');
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: chem.stock - value })
      });
      if (res.ok) {
        setChemicals(prev => prev.map(c => c.id === id ? { ...c, stock: c.stock - value } : c));
        setRemoveInputs({ ...removeInputs, [name]: '' });
        setSuccess('Stok başarıyla çıkarıldı!');
      } else {
        setError('Stok çıkarma başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamıyor!');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Alert severity="info" sx={{
        mb: 4,
        px: 4,
        py: 3,
        fontSize: 18,
        fontWeight: 500,
        background: 'linear-gradient(90deg, #e0e7ff 0%, #f8fafc 100%)',
        color: '#1976d2',
        border: '2px solid #90caf9',
        borderRadius: 3,
        boxShadow: 4,
        lineHeight: 2
      }}>
        <span style={{fontSize:22, fontWeight:800, color:'#1976d2'}}>💡 İlaç Kullanım Rehberi</span><br/>
        <b>Biyocyper:</b> Uçkun ilacı için <b>100 litre tanka 150 cc</b> ekleyin. Sırt atomizörüyle uygulama için <b>1'e 1.5 ölçek</b> kullanın.<br/>
        <b>Alfavek:</b> <b>200 litrelik tanka 50 cc</b> ekleyin. Elektrikli sırt pompası ile <b>25 cc</b> kullanılır (sadece <b>gübrelik</b> ve <b>kapalı alan</b> uygulamaları için).<br/>
        <b>Protoks (Larvasit):</b> <b>200 litrelik tanka 100 cc</b> ekleyin. <b>Durgun su</b> ve <b>sivrisinek kaynakları</b> için uygundur.<br/>
        <span style={{color:'#388e3c', fontWeight:600}}>Doğru dozaj ve uygulama yöntemi için yukarıdaki talimatları dikkate alın. Detaylı bilgi için teknik ekibe danışabilirsiniz.</span>
      </Alert>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
        {chemicals.map((chem) => {
          const remaining = chem.stock - chem.used;
          const percent = (chem.used / chem.stock) * 100;
          return (
            <Paper key={chem.id || chem.name} elevation={6} sx={{ p: 4, textAlign: 'center', minWidth: 270, maxWidth: 340, flex: '1 1 270px', borderRadius: 4, boxShadow: 8, background: '#f8fafc' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                <ScienceIcon sx={{ fontSize: 40, color: '#1976d2', mr: 1 }} />
                <Typography variant="h5" fontWeight={700}>{chem.name}</Typography>
              </Box>
              <Typography color="primary" fontWeight={600}>Toplam: {chem.stock} L</Typography>
              <Typography color="success.main" fontWeight={600}>Kalan: {remaining} L</Typography>
              <Typography color="warning.main" fontWeight={600}>Kullanılan: {chem.used} L</Typography>
              <LinearProgress variant="determinate" value={percent} sx={{ height: 12, borderRadius: 6, my: 2, background: '#e0e7ff' }} />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1, mt: 2 }}>
                <TextField
                  label="Kullanım (L)"
                  value={inputs[chem.name] || ''}
                  onChange={e => setInputs({ ...inputs, [chem.name]: e.target.value })}
                  size="small"
                  fullWidth
                  disabled={!isAdmin}
                />
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => handleUse(chem.name, chem.id)}
                  disabled={remaining === 0 || loading || !isAdmin}
                >
                  Kullan
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <TextField
                  label="Stok Ekle (L)"
                  value={addInputs[chem.name] || ''}
                  onChange={e => setAddInputs({ ...addInputs, [chem.name]: e.target.value })}
                  size="small"
                  fullWidth
                  disabled={!isAdmin}
                />
                <Button
                  variant="outlined"
                  color="success"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddStock(chem.name, chem.id)}
                  disabled={loading || !isAdmin}
                >
                  Stok Ekle
                </Button>
              </Box>
              {isAdmin && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <TextField
                    label="Stok Çıkar (L)"
                    value={removeInputs[chem.name] || ''}
                    onChange={e => setRemoveInputs({ ...removeInputs, [chem.name]: e.target.value })}
                    size="small"
                    fullWidth
                  />
                  <Button
                    variant="outlined"
                    color="warning"
                    onClick={() => handleRemoveStock(chem.name, chem.id)}
                    disabled={loading}
                  >
                    Stok Çıkar
                  </Button>
                </Box>
              )}
              {remaining === 0 && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Stok Bitti!
                </Alert>
              )}
              {remaining > 0 && remaining < chem.stock * 0.2 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Stok azaldı! Lütfen yeni stok ekleyin.
                </Alert>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
};

export default Chemicals; 