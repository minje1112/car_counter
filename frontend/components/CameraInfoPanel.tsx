'use client';

import { useState } from 'react';
import { Box, Typography, Paper, Chip, Divider, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Button, Select, FormControl, InputLabel, CircularProgress, SelectChangeEvent } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import AICountStats from './AICountStats';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import { AddAPhoto, DeleteOutline, Edit, MoreVert, CameraAlt, OpenInBrowser } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import EditNoteIcon from '@mui/icons-material/EditNote';
import { useRouter } from 'next/navigation';

interface Camera {
  id: number;
  organization_id: number;
  user_id: number;
  name: string;
  rtspUrl: string;
  rtsp_url: string;
  description: string;
  location: string;
  status: string;
  snapshot_url: string | null;
  last_snapshot_at: string | null;
  recording_enabled: number;
  created_at: string;
  updated_at: string;
  annotation_id?: number | null;
}

interface Annotation {
  id: number;
  name: string;
  // location: string;

}

interface AIStatus {
  isActive: boolean;
  lastCount?: number;
  lastUpdated?: string;
  loading?: boolean;
}

interface CameraInfoPanelProps {
  camera: Camera | null;
  handleSnapshot: any;
  handleCameraDelete: any;
  handleEdit: any;
  handleAdd: any;
  annotations?: Annotation[];
  aiStatus?: AIStatus;
  onAssignAnnotation?: (annotationId: number) => void;
  onStartAI?: () => void;
  onStopAI?: () => void;
  onRestartAI?: () => void;
}

export default function CameraInfoPanel({ handleSnapshot, handleCameraDelete, handleEdit, handleAdd, camera, annotations = [], aiStatus, onAssignAnnotation, onStartAI, onStopAI, onRestartAI }: CameraInfoPanelProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    handleEdit(camera);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    handleCameraDelete(camera?.id);
    handleMenuClose();
  };

  const handleAddClick = () => {
    handleAdd();
    handleMenuClose();
  };

  const handleSnapshotClick = () => {
    handleSnapshot(camera?.id);
    handleMenuClose();
  };

  if (!camera) {
    return (
      <Box
        sx={{
          width: 320,
          height: 'calc(100vh - 50px)',
          backgroundColor: '#f5f5f5',
          borderLeft: '1px solid #e0e0e0',
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">Select a camera to view details</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: 320,
        height: 'calc(100vh - 50px)',
        backgroundColor: '#f5f5f5',
        borderLeft: '1px solid #e0e0e0',
        overflowY: 'auto',
        position:'relative',
        p: 2,
      }}
    >
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VideocamIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.1rem' }}>
              Camera Details
            </Typography>
          </Box>
          <IconButton 
            onClick={handleMenuClick}
            size="small"
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1)',
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Box>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleAddClick}>
            <ListItemIcon>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Add Camera</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleSnapshotClick}>
            <ListItemIcon>
              <CameraAlt fontSize="small" />
            </ListItemIcon>
            <ListItemText>Capture Snapshot</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Camera</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => router.push('/editor')}>
            <ListItemIcon>
              <OpenInBrowser fontSize="small"  />
            </ListItemIcon>
            <ListItemText>Edit Zone</ListItemText>
          </MenuItem>
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <DeleteOutline fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Camera</ListItemText>
          </MenuItem>
          
        </Menu>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Name
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {camera.name}
          </Typography>
        </Box>

        {/* <Box sx={{ mb: 2 }}> */}
          {/* <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Status
          </Typography> */}
          {/* <Chip
            icon={
              <FiberManualRecordIcon 
                sx={{ 
                  fontSize: 14,
                  animation: camera.status === 'active' ? 'pulse 2s infinite' : 'none',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.4 },
                    '100%': { opacity: 1 },
                  },
                }} 
              />
            }
            label={camera.status}
            size="small"
            color={camera.status === 'active' ? 'success' : 'default'}
            sx={{
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.05)',
                boxShadow: 2,
              },
            }}
          /> */}
        {/* </Box> */}

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <LocationOnIcon sx={{ fontSize: 16 }} />
            Location
          </Typography>
          <Typography variant="body2">{camera.location}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Description
          </Typography>
          <Typography variant="body2">{camera.description}</Typography>
        </Box>

        {/* <Divider sx={{ my: 2 }} /> */}

        {/* <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <BusinessIcon sx={{ fontSize: 16 }} />
            Organization ID
          </Typography>
          <Typography variant="body2">{camera.organization_id}</Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ fontSize: 16 }} />
            User ID
          </Typography>
          <Typography variant="body2">{camera.user_id}</Typography>
        </Box> */}

        {/* <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            Recording
          </Typography>
          <Chip
            label={camera.recording_enabled === 1 ? 'Enabled' : 'Disabled'}
            size="small"
            color={camera.recording_enabled === 1 ? 'error' : 'default'}
          />
        </Box> */}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
            RTSP URL
          </Typography>
          <Typography variant="body2" className='truncate' sx={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>
            {camera.rtsp_url}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTimeIcon sx={{ fontSize: 16 }} />
            Created At
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
            {new Date(camera.created_at).toLocaleString()}
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ mb: 2 }}>

          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Counting Zone</InputLabel>
            <Select
              value={camera.annotation_id || ''}
              label="Counting Zone"
              onChange={(e: SelectChangeEvent<number>) => {
                if (onAssignAnnotation && e.target.value) {
                  onAssignAnnotation(Number(e.target.value));
                }
              }}
            >
              {/* <MenuItem value="">
                <em>No zone assigned</em>
              </MenuItem> */}
              {annotations.map((ann) => (
                <MenuItem key={ann.id} value={ann.id}>
                  {ann.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* AI Status Display */}
          {aiStatus && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                AI Status
              </Typography>
              <Chip
                icon={
                  aiStatus.loading ? (
                    <CircularProgress size={14} />
                  ) : (
                    <FiberManualRecordIcon 
                      sx={{ 
                        fontSize: 14,
                        animation: aiStatus.isActive ? 'pulse 2s infinite' : 'none',
                        '@keyframes pulse': {
                          '0%': { opacity: 1 },
                          '50%': { opacity: 0.4 },
                          '100%': { opacity: 1 },
                        },
                      }} 
                    />
                  )
                }
                label={aiStatus.isActive ? 'Active' : 'Inactive'}
                size="small"
                color={aiStatus.isActive ? 'success' : 'default'}
              />
              {/* {aiStatus.lastCount !== undefined && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Last Count: <strong>{aiStatus.lastCount}</strong>
                  {aiStatus.lastUpdated && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      Updated: {new Date(aiStatus.lastUpdated).toLocaleTimeString()}
                    </Typography>
                  )}
                </Typography>
              )} */}

              {/* Count Statistics */}
              <Divider sx={{ my: 1.5 }} />
              <AICountStats streamId={camera.id} />
            </Box>
          )}

          {/* AI Control Buttons */}
          <Box sx={{ display: 'flex',  gap: 1 }}>
            <Button
              variant="contained"
              color="success"
              // startIcon={}
              fullWidth
              onClick={onStartAI}
              disabled={!camera.annotation_id || aiStatus?.isActive || aiStatus?.loading}
            ><PlayArrowIcon />
            </Button>
            <Button
              variant="contained"
              color="error"
              // startIcon={}
              fullWidth
              onClick={onStopAI}
              disabled={!aiStatus?.isActive || aiStatus?.loading}
            ><StopIcon />
            </Button>
            <Button
              variant="outlined"
              // startIcon={}
              fullWidth
              onClick={onRestartAI}
              disabled={!camera.annotation_id || aiStatus?.loading}
            ><RestartAltIcon />
            </Button>
            {/* <Button
              variant="outlined"
              // startIcon={}
              fullWidth
              onClick={() => router.push('/editor')}
            ><EditNoteIcon />
            </Button> */}
          </Box>
        </Box>

        
      </Paper>
    </Box>
  );
}
