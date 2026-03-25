'use client';

import { Box, Typography, Card, CardContent, Chip, IconButton, Tooltip } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

interface Camera {
  id: number;
  organization_id: number;
  user_id: number;
  name: string;
  rtsp_url: string;
  description: string;
  location: string;
  status: string;
  snapshot_url: string | null;
  last_snapshot_at: string | null;
  recording_enabled: number;
  created_at: string;
  updated_at: string;
}

interface CameraSidebarProps {
  cameras: Camera[];
  onCameraSelect?: (camera: Camera) => void;
}

export default function CameraSidebar({ cameras, onCameraSelect }: CameraSidebarProps) {
  return (
    <Box
      sx={{
        width: 320,
        height: '100vh',
        backgroundColor: '#f5f5f5',
        borderRight: '1px solid #e0e0e0',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <VideocamIcon color="primary" />
          Cameras ({cameras.length})
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cameras.map((camera) => (
          <Card
            key={camera.id}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4,
              },
            }}
            onClick={() => onCameraSelect?.(camera)}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
                  {camera.name}
                </Typography>
                <Chip
                  icon={<FiberManualRecordIcon sx={{ fontSize: 12 }} />}
                  label={camera.status}
                  size="small"
                  color={camera.status === 'active' ? 'success' : 'default'}
                  sx={{ height: 24 }}
                />
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {camera.location}
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {camera.description}
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {camera.recording_enabled === 1 && (
                    <Chip
                      label="Recording"
                      size="small"
                      color="error"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                  {camera.snapshot_url && (
                    <Chip
                      label="Snapshot"
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
                <Tooltip title="View Details">
                  <IconButton size="small">
                    <InfoOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>

      {cameras.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <VideocamIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
          <Typography color="text.secondary">No cameras available</Typography>
        </Box>
      )}
    </Box>
  );
}
