'use client';

import React from 'react';
import {
  Modal,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Card,
  IconButton,
  CardMedia,
  CardActionArea,
} from '@mui/material';
import AnnotationCard from './AnnotationCard';

interface Camera {
  id: number;
  name: string;
  url?: string;
  rtsp_url?: string;
  description?: string;
  location?: string;
}

interface AnnotationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  listData: Camera[];
  selectedId: number | null;
  onSelectAnnotation: (item: Camera) => void;
}

export default function CameraModal({
  open,
  onClose,
  loading,
  listData,
  selectedId,
  onSelectAnnotation,
}: AnnotationHistoryModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="saved-files-modal"
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            transition: 'all 0.3s ease-in-out',
          },
        },
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: '70%', md: '60%' },
          maxHeight: '80vh',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          overflow: 'auto',
          transition: 'all 0.3s ease-in-out',
          animation: 'slideIn 0.3s ease-out',
          '@keyframes slideIn': {
            from: {
              opacity: 0,
              transform: 'translate(-50%, -45%)',
            },
            to: {
              opacity: 1,
              transform: 'translate(-50%, -50%)',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Cameras ({listData.length})</Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
              ) : listData.length > 0 ? (
                <Stack spacing={1.5}>
          {listData.map((item: Camera, index: number) => (
                    <Card key={item.id}
            sx={{
              border: selectedId === item.id ? '2px solid #2196F3' : '1px solid #e0e0e0',
              transition: 'all 0.2s',
              '&:hover': { boxShadow: 3, borderColor: '#2196F3' },
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, p: 1.5, alignItems: 'center' }}>
              <CardActionArea
                onClick={() => onSelectAnnotation(item)}
                sx={{
                  flex: 1,
                  display: 'flex',
                  justifyContent: 'flex-start',
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
                  <CardMedia
                    component="img"
                    sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                    image={item.url}
                    alt={`Camera ${index + 1}`}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" fontWeight="500" noWrap>
                      {item.location || 'No location'}
                    </Typography>
                    {/* <Typography variant="caption" color="text.secondary">
                      {new Date(item.created_at || '').toLocaleDateString()} •{' '}
                      {new Date(item.last_snapshot_at || '').toLocaleTimeString()}
                    </Typography> */}
                  </Box>
                </Box>
              </CardActionArea>
              
            </Box>
          </Card>
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No saved annotations yet
          </Typography>
        )}
      </Box>
    </Modal>
  );
}
