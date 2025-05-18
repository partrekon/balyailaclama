import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, CircularProgress, MenuItem } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Switch from '@mui/material/Switch';

const API_URL = 'http://localhost:4000/api';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editFullname, setEditFullname] = useState('');
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addFullname, setAddFullname] = useState('');
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addRole, setAddRole] = useState('user');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [settings, setSettings] = useState<any>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');

  // Giriş yapan kullanıcının admin olup olmadığını kontrol et
  const currentUser = JSON.parse(localStorage.getItem('balya_user') || '{}');
  const currentUserIsAdmin = currentUser && currentUser.role === 'admin';

  // Kullanıcıları çek
  const fetchUsers = () => {
    setLoading(true);
    setError('');
    fetch(API_URL + '/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
          setError('Kullanıcılar alınamadı!');
        }
      })
      .catch(() => {
        setUsers([]);
        setError('Kullanıcılar alınamadı!');
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    fetchUsers();
  }, []);

  // Kullanıcı sil
  const handleDelete = async (id: number) => {
    if (!window.confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setSuccess('Kullanıcı silindi.');
        fetchUsers();
      } else {
        setError(data.error || 'Silme işlemi başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamadı!');
    }
    setActionLoading(false);
  };

  // Kullanıcı adını düzenle
  const handleEdit = (user: any) => {
    setEditUser(user);
    setEditFullname(user.fullname);
  };
  const handleEditSave = async () => {
    if (!editUser) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname: editFullname })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Kullanıcı adı güncellendi.');
        setEditUser(null);
        fetchUsers();
      } else {
        setError(data.error || 'Güncelleme başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamadı!');
    }
    setActionLoading(false);
  };

  // Şifre sıfırla
  const handleReset = (user: any) => {
    setResetUser(user);
    setResetPassword('');
  };
  const handleResetSave = async () => {
    if (!resetUser) return;
    if (!resetPassword) { setError('Şifre boş olamaz!'); return; }
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/users/${resetUser.id}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: resetPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Şifre sıfırlandı.');
        setResetUser(null);
      } else {
        setError(data.error || 'Şifre sıfırlama başarısız!');
      }
    } catch {
      setError('Sunucuya ulaşılamadı!');
    }
    setActionLoading(false);
  };

  // Kullanıcı ekle
  const handleAddUser = async () => {
    if (!addFullname || !addUsername || !addPassword) {
      setError('Tüm alanlar zorunlu!');
      return;
    }
    setAddLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname: addFullname, username: addUsername, password: addPassword, role: addRole })
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Kullanıcı eklendi.');
        setAddOpen(false);
        setAddFullname(''); setAddUsername(''); setAddPassword(''); setAddRole('user');
        fetchUsers();
      } else {
        setError(data.error || 'Kullanıcı eklenemedi!');
      }
    } catch {
      setError('Sunucuya ulaşılamadı!');
    }
    setAddLoading(false);
  };

  const fetchLogs = () => {
    setLogsLoading(true);
    fetch(API_URL + '/logs')
      .then(res => res.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  };
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchSettings = () => {
    setSettingsLoading(true);
    fetch(API_URL + '/settings')
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(() => setSettings({}))
      .finally(() => setSettingsLoading(false));
  };
  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSettingsSave = async () => {
    setSettingsLoading(true);
    setSettingsSuccess('');
    setSettingsError('');
    try {
      const res = await fetch(API_URL + '/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) setSettingsSuccess('Ayarlar kaydedildi!');
      else setSettingsError(data.error || 'Ayarlar kaydedilemedi!');
    } catch {
      setSettingsError('Sunucuya ulaşılamadı!');
    }
    setSettingsLoading(false);
  };

  return (
    <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '60vh' }}>
      <Paper elevation={6} sx={{ p: 5, borderRadius: 4, minWidth: 340, maxWidth: 900, textAlign: 'center', background: 'linear-gradient(90deg, #e0e7ff 0%, #f8fafc 100%)', mb: 4 }}>
        <LockIcon sx={{ fontSize: 48, color: '#1976d2', mb: 2 }} />
        <Typography variant="h4" fontWeight={800} color="#1976d2" gutterBottom>
          Admin Paneli
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          Kullanıcı yönetimi ve site ayarları
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Ara (ad, kullanıcı adı)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            size="small"
            sx={{ minWidth: 200 }}
          />
          <TextField
            label="Rol Filtrele"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            select
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="user">Kullanıcı</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </Box>
        <Button variant="contained" startIcon={<PersonAddIcon />} sx={{ mb: 2 }} onClick={() => setAddOpen(true)}>
          Kullanıcı Ekle
        </Button>
        <Typography variant="body1" color="#333" sx={{ mb: 2 }}>
          Buradan kullanıcıları yönetebilir, şifre sıfırlayabilir ve siteyle ilgili temel ayarları düzenleyebilirsiniz.<br/>
          (Gerçek işlemler için backend endpointleri eklenmiştir.)
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
            <CircularProgress />
          </Box>
        ) : (
        <TableContainer sx={{ mt: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ background: '#f0f4f8' }}>
                <TableCell><b>ID</b></TableCell>
                <TableCell><b>Ad Soyad</b></TableCell>
                <TableCell><b>Kullanıcı Adı</b></TableCell>
                <TableCell><b>Şifre</b></TableCell>
                <TableCell><b>Rol</b></TableCell>
                <TableCell><b>Durum</b></TableCell>
                <TableCell><b>İşlemler</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(users) && users
                .filter(u =>
                  (!search || u.fullname?.toLowerCase().includes(search.toLowerCase()) || u.username?.toLowerCase().includes(search.toLowerCase())) &&
                  (!roleFilter || u.role === roleFilter)
                )
                .map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.fullname}</TableCell>
                    <TableCell>{u.username}</TableCell>
                    <TableCell>{u.password}</TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Switch
                        checked={!!u.active}
                        onChange={async (e) => {
                          const newActive = e.target.checked ? 1 : 0;
                          setActionLoading(true);
                          setError('');
                          try {
                            const res = await fetch(`${API_URL}/users/${u.id}/active`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ active: newActive })
                            });
                            const data = await res.json();
                            if (data.success) {
                              fetchUsers();
                            } else {
                              setError(data.error || 'Durum güncellenemedi!');
                            }
                          } catch {
                            setError('Sunucuya ulaşılamadı!');
                          }
                          setActionLoading(false);
                        }}
                        color="success"
                        disabled={actionLoading}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton color="primary" onClick={() => handleEdit(u)} disabled={actionLoading || !currentUserIsAdmin}><EditIcon /></IconButton>
                      <IconButton color="secondary" onClick={() => handleReset(u)} disabled={actionLoading || !currentUserIsAdmin}><RestartAltIcon /></IconButton>
                      <IconButton color="error" onClick={() => handleDelete(u.id)} disabled={actionLoading || !currentUserIsAdmin}><DeleteIcon /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {(!Array.isArray(users) || users.length === 0) && (
                <TableRow><TableCell colSpan={7} align="center">Kullanıcı yok</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, maxWidth: 900, width: '100%', mt: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} color="#1976d2" gutterBottom>Site Ayarları</Typography>
        {settingsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 500 }}>
            <TextField label="Site Başlığı" value={settings.title || ''} onChange={e => setSettings((s: any) => ({ ...s, title: e.target.value }))} fullWidth />
            <TextField label="Logo URL" value={settings.logo || ''} onChange={e => setSettings((s: any) => ({ ...s, logo: e.target.value }))} fullWidth />
            <TextField label="Ana Renk (hex)" value={settings.mainColor || ''} onChange={e => setSettings((s: any) => ({ ...s, mainColor: e.target.value }))} fullWidth />
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button variant="contained" onClick={handleSettingsSave} disabled={settingsLoading}>Kaydet</Button>
              {settingsSuccess && <Alert severity="success">{settingsSuccess}</Alert>}
              {settingsError && <Alert severity="error">{settingsError}</Alert>}
            </Box>
          </Box>
        )}
      </Paper>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, maxWidth: 900, width: '100%', mt: 2 }}>
        <Typography variant="h6" fontWeight={700} color="#1976d2" gutterBottom>İşlem Geçmişi</Typography>
        {logsLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 80 }}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ background: '#f0f4f8' }}>
                  <TableCell><b>Kullanıcı</b></TableCell>
                  <TableCell><b>Aksiyon</b></TableCell>
                  <TableCell><b>Detay</b></TableCell>
                  <TableCell><b>Tarih</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id}>
                    <TableCell>{log.username || log.user_id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.detail}</TableCell>
                    <TableCell>{log.created_at?.replace('T', ' ').slice(0, 19)}</TableCell>
                  </TableRow>
                ))}
                {logs.length === 0 && (
                  <TableRow><TableCell colSpan={4} align="center">Kayıt yok</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Kullanıcı adını düzenle modal */}
      <Dialog open={!!editUser} onClose={() => setEditUser(null)}>
        <DialogTitle>Kullanıcı Adı Düzenle</DialogTitle>
        <DialogContent>
          <TextField label="Ad Soyad" value={editFullname} onChange={e => setEditFullname(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)} disabled={actionLoading}>Vazgeç</Button>
          <Button variant="contained" onClick={handleEditSave} disabled={actionLoading}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Şifre sıfırla modal */}
      <Dialog open={!!resetUser} onClose={() => setResetUser(null)}>
        <DialogTitle>Şifre Sıfırla</DialogTitle>
        <DialogContent>
          <TextField label="Yeni Şifre" value={resetPassword} onChange={e => setResetPassword(e.target.value)} fullWidth sx={{ mt: 1 }} type="password" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetUser(null)} disabled={actionLoading}>Vazgeç</Button>
          <Button variant="contained" onClick={handleResetSave} disabled={actionLoading}>Kaydet</Button>
        </DialogActions>
      </Dialog>

      {/* Kullanıcı ekle modal */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 320 }}>
          <TextField label="Ad Soyad" value={addFullname} onChange={e => setAddFullname(e.target.value)} fullWidth />
          <TextField label="Kullanıcı Adı" value={addUsername} onChange={e => setAddUsername(e.target.value)} fullWidth />
          <TextField label="Şifre" value={addPassword} onChange={e => setAddPassword(e.target.value)} fullWidth type="password" />
          <TextField label="Rol" value={addRole} onChange={e => setAddRole(e.target.value)} select fullWidth>
            <MenuItem value="user">Kullanıcı</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={addLoading}>Vazgeç</Button>
          <Button variant="contained" onClick={handleAddUser} disabled={addLoading}>Ekle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel; 