'use client';

import { Box, Button, Typography, AppBar, Toolbar } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '@/lib/context/AuthContext';
import { usePathname } from 'next/navigation';

const menuItems = [
  { label: 'Home', href: '/' },
  // { label: 'Profile', href: '/profile' },
  { label: 'Editor', href: '/editor' },
  { label: 'Settings', href: '/settings' },
];
export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (pathname === '/login') return null;

  return (
    <AppBar position="static" sx={{ mb: 0, height: 50, backgroundColor: '#1976d2', boxShadow: 'rgba(0, 0, 0, 0.35) 0px 5px 15px', }}>
      <Toolbar sx={{mt: -1 }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {menuItems.map((item) => (
              <Button
                key={item.href} href={item.href} sx={{color:'white'}}>{item.label}</Button> ))}
        </Typography>
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, }}>
            <Typography variant="body2">{user.email}</Typography>
            <Button
              color="inherit"
              startIcon={<LogoutIcon/>}
              onClick={logout}
              size='small'
              sx={{ textTransform: 'none' }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
