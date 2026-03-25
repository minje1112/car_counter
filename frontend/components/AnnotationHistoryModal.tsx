'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Card,
  CardMedia,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AnnotationCard from './AnnotationCard';
import axios from '@/lib/utils/axios';

interface AnnotationData {
  id: number;
  location: string;
  imageUrl: string;
  annotations: {
    shapes: any;
    timestamp: string;
  };
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

interface AnnotationHistoryModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  listData: AnnotationData[];
  selectedId: number | null;
  onSelectAnnotation: (item: AnnotationData) => void;
  onDeleteAnnotation: (id: number, event: React.MouseEvent) => void;
  onSelectFile?: (file: any) => void;
}

export default function AnnotationHistoryModal({
  open,
  onClose,
  loading,
  listData,
  selectedId,
  onSelectAnnotation,
  onDeleteAnnotation,
  onSelectFile,
}: AnnotationHistoryModalProps) {
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoadingFiles(true);
      const res = await axios.get('/api/files');
      const data = res.data?.data || res.data || [];
      setFiles(data);
    } catch (err) {
      console.error('Failed to load files', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (open) fetchFiles();
  }, [open]);

  const handleDeleteFile = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;
    try {
      await axios.delete(`/api/files/${id}`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to delete file', err);
    }
  };
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
          <Typography variant="h6">Saved Annotations ({listData.length})</Typography>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : listData.length > 0 ? (
          <Stack spacing={1.5}>
            {listData.map((item: AnnotationData, index: number) => (
              <AnnotationCard
                key={item.id || index}
                item={item}
                index={index}
                isSelected={selectedId === item.id}
                onSelect={() => onSelectAnnotation(item)}
                onDelete={(e) => onDeleteAnnotation(item.id, e)}
              />
            ))}
          </Stack>
        ) : (
          <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
            No saved annotations yet
          </Typography>
        )}

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Uploaded Files ({files.length})</Typography>

          {loadingFiles ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          ) : files.length > 0 ? (
            <Stack spacing={1}>
                {files.map((f) => {
                  const rawUrl = f.file_url || f.fileUrl || f.filePath || f.file_path || '';
                  const backendBase = (axios && axios.defaults && axios.defaults.baseURL) ? axios.defaults.baseURL : window.location.origin;
                  const resolvedUrl = rawUrl && rawUrl.startsWith('/') ? backendBase + rawUrl : rawUrl;
                  return (
                  <Card key={f.id} sx={{ display: 'flex', alignItems: 'center', p: 1 }} onClick={() => onSelectFile?.(f)}>
                    <CardMedia
                      component={f.file_type === 'video' ? 'video' : 'img'}
                      src={resolvedUrl}
                      sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                      controls={f.file_type === 'video'}
                    />
                  <Box sx={{ flex: 1, ml: 1 }}>
                    <Typography variant="body2" noWrap>{f.original_name || f.originalName || f.file_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{f.file_type}</Typography>
                  </Box>
                  <IconButton size="small" color="error" onClick={(e) => handleDeleteFile(f.id, e)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Card>
              )})}
            </Stack>
          ) : (
            <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
              No uploaded files
            </Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
}
