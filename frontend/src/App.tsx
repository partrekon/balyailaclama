import React, { useState, useEffect } from 'react';
import './App.css';
import { TextField, Button, Box, Typography, Paper, AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemText, InputAdornment, Avatar, Fade } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import BadgeIcon from '@mui/icons-material/Badge';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './Home';
import Resources from './Resources';
import Chemicals from './Chemicals';
import MapPage from './MapPage';
import HomeIcon from '@mui/icons-material/Home';
import InventoryIcon from '@mui/icons-material/Inventory';
import ScienceIcon from '@mui/icons-material/Science';
import MapIcon from '@mui/icons-material/Map';
import ListItemButton from '@mui/material/ListItemButton';
import AdminPanel from './AdminPanel';

const LOGIN_API = 'http://localhost:4000/api/login';
const REGISTER_API = 'http://localhost:4000/api/register';

type User = { id: number; username: string; fullname?: string };

function stringToColor(string: string) {
  let hash = 0;
  let i;
  for (i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Otomatik giriş için localStorage kontrolü
  useEffect(() => {
    const userStr = localStorage.getItem('balya_user');
    if (userStr) {
      setIsLoggedIn(true);
      setUser(JSON.parse(userStr));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(LOGIN_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsLoggedIn(true);
        setUser(data.user);
        setFullname('');
        setError('');
        localStorage.setItem('balya_user', JSON.stringify(data.user));
      } else {
        setError(data.error || 'Giriş başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamıyor!');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    localStorage.removeItem('balya_user');
    setFullname('');
    setUsername('');
    setPassword('');
  };

  const isAdmin = user && (user.username === 'mustafa' || user.username === 'seyma');

  const menuItems = [
    { text: 'Anasayfa', path: '/', icon: <HomeIcon /> },
    { text: 'Kaynaklar', path: '/kaynaklar', icon: <InventoryIcon /> },
    { text: 'İlaçlar', path: '/ilaclar', icon: <ScienceIcon /> },
    { text: 'Harita', path: '/harita', icon: <MapIcon /> },
    ...(isAdmin ? [{ text: 'Admin Paneli', path: '/admin', icon: <LockIcon /> }] : []),
  ];

  if (!isLoggedIn) {
    return (
      <Box sx={{ minHeight: '100vh', minWidth: '100vw', bgcolor: 'background.default',
        background: 'linear-gradient(135deg, #e0e7ff 0%, #f8fafc 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Fade in timeout={700}>
          <Paper elevation={6} sx={{ p: 5, width: 370, borderRadius: 4, boxShadow: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: '#1976d2', width: 64, height: 64, mb: 1 }}>
              <BadgeIcon fontSize="large" />
            </Avatar>
            <Typography variant="h4" fontWeight={700} color="#1976d2" align="center" gutterBottom letterSpacing={1}>
              Balya İlaçlama Ekibi
            </Typography>
            <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 1 }}>
              Giriş Yap
            </Typography>
            <form onSubmit={handleLogin} style={{ width: '100%' }}>
              <TextField
                label="Kullanıcı Adı"
                variant="outlined"
                fullWidth
                margin="normal"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BadgeIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                label="Şifre"
                type="password"
                variant="outlined"
                fullWidth
                margin="normal"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                }}
              />
              {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
              <Button type="submit" variant="contained" color="primary" fullWidth sx={{ mt: 2, py: 1.2, fontWeight: 600, fontSize: 17 }} disabled={loading}>
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </form>
          </Paper>
        </Fade>
      </Box>
    );
  }

  return (
    <>
      <AppBar position="static" sx={{ background: 'linear-gradient(90deg, #1976d2 60%, #60a5fa 100%)', boxShadow: 6 }}>
        <Toolbar sx={{ minHeight: 72, px: { xs: 1, sm: 3 } }}>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ mr: 2, p: 1.2, bgcolor: '#fff', color: '#1976d2', boxShadow: 2, '&:hover': { bgcolor: '#e3f2fd' } }}>
            <MenuIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            <Avatar sx={{ bgcolor: '#fff', color: '#1976d2', width: 46, height: 46, fontWeight: 900, fontSize: 28, boxShadow: 3, border: '2px solid #1976d2', mr: 1 }}>
              <span role="img" aria-label="ekip">👥</span>
            </Avatar>
            <Typography variant="h5" noWrap sx={{ fontWeight: 900, letterSpacing: 1, color: '#fff', textShadow: '0 2px 8px #1976d2aa', fontSize: { xs: 20, sm: 28 }, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Balya İlaçlama Ekibi
            </Typography>
          </Box>
          {user && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: { xs: 0, sm: 2 }, ml: 1 }}>
              <Avatar sx={{ bgcolor: stringToColor(user.fullname || user.username), width: 40, height: 40, fontWeight: 700, fontSize: 22, mr: 1, border: '2px solid #fff', boxShadow: 2 }}>
                {(user.fullname || user.username).charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: { xs: 'center', sm: 'flex-start' }, minWidth: 0 }}>
                <Typography fontWeight={700} fontSize={16} color="#fff" noWrap sx={{ textShadow: '0 1px 6px #1976d2aa', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Hoş geldiniz,
                </Typography>
                <Typography fontWeight={800} fontSize={17} color="#fff" noWrap sx={{ textShadow: '0 1px 6px #1976d2aa', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullname || user.username}
                </Typography>
              </Box>
            </Box>
          )}
          <Button color="inherit" onClick={handleLogout} sx={{ ml: 2, fontWeight: 700, fontSize: 17, px: 2.5, py: 1.1, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.12)', boxShadow: 2, transition: 'all 0.2s', '&:hover': { bgcolor: '#fff', color: '#1976d2', boxShadow: 4 } }}>
            Çıkış Yap
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100vw', sm: 320 },
            maxWidth: '100vw',
            height: { xs: '100vh', sm: 'auto' },
            borderRadius: { xs: 0, sm: 3 },
            boxShadow: 8,
            p: 0,
            transition: 'all 0.3s',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: '#fff',
          }
        }}
      >
        <Box sx={{ width: '100%', p: 0, pt: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', py: 2, px: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#fff', position: 'sticky', top: 0, zIndex: 10 }}>
            <Avatar sx={{ width: 44, height: 44, bgcolor: '#1976d2', mr: 2 }} src="https://cdn-icons-png.flaticon.com/512/684/684908.png" />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: 20, color: '#1976d2' }}>Balyalı İlaçlama</Typography>
            <IconButton sx={{ ml: 'auto', fontSize: 28 }} onClick={() => setDrawerOpen(false)}>
              ×
            </IconButton>
          </Box>
          <List sx={{ flex: 1, py: 2 }}>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem disablePadding key={item.text}>
                  <ListItemButton
                    selected={isActive}
                    onClick={() => { setDrawerOpen(false); navigate(item.path); }}
                    sx={{
                      py: 2.2,
                      px: 3,
                      gap: 2,
                      bgcolor: isActive ? '#1976d2' : 'transparent',
                      color: isActive ? '#222' : '#222',
                      borderLeft: isActive ? '5px solid #43ea6d' : '5px solid transparent',
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isActive ? '#1976d2' : '#e3e8f0',
                        color: isActive ? '#222' : '#1976d2',
                      },
                      fontWeight: 600,
                      fontSize: 19,
                      minHeight: 56,
                    }}
                  >
                    {item.icon}
                    <ListItemText primary={item.text} sx={{ fontWeight: 600, fontSize: 19, color: '#222' }} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
          <Box sx={{ py: 2, px: 2, borderTop: '1px solid #e0e0e0', textAlign: 'center', fontSize: 14, color: '#888' }}>
            v1.0.0
          </Box>
        </Box>
      </Drawer>
      <Box sx={{ p: 2 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kaynaklar" element={<Resources />} />
          <Route path="/ilaclar" element={<Chemicals />} />
          <Route path="/harita" element={<MapPage />} />
          <Route path="/admin" element={<AdminPanelGuard user={user}><AdminPanel /></AdminPanelGuard>} />
        </Routes>
      </Box>
    </>
  );
}

function AdminPanelGuard({ user, children }: { user: any, children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (!user || (user.username !== 'mustafa' && user.username !== 'seyma')) {
      navigate('/');
    }
  }, [user, navigate]);
  return <>{user && (user.username === 'mustafa' || user.username === 'seyma') ? children : null}</>;
}

export default App;
