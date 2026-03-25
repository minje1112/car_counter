'use client';

import React from 'react';
import {
  Card,
  Box,
  CardActionArea,
  CardMedia,
  Typography,
  IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from '@/lib/utils/axios';

interface AnnotationData {
  id: number;
  location: string;
  imageUrl: string;
  timestamp: string;
}

interface AnnotationCardProps {
  item: AnnotationData;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (event: React.MouseEvent) => void | undefined;
}

export default function AnnotationCard({
  item,
  index,
  isSelected,
  onSelect,
  onDelete,
}: AnnotationCardProps) {
  return (
    <Card
      sx={{
        border: isSelected ? '2px solid #2196F3' : '1px solid #e0e0e0',
        transition: 'all 0.2s',
        '&:hover': { boxShadow: 3, borderColor: '#2196F3' },
      }}
    >
      <Box sx={{ display: 'flex', gap: 2, p: 1.5, alignItems: 'center' }}>
        <CardActionArea
          onClick={onSelect}
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'flex-start',
            borderRadius: 1,
          }}
        >
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', width: '100%' }}>
            {item.imageUrl ? (
              <>
                <CardMedia
                  component="img"
                  sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
                  image={
                    (() => {
                      const raw = item.imageUrl || '';
                      const backendBase = (axios && axios.defaults && axios.defaults.baseURL) ? axios.defaults.baseURL : window.location.origin;
                      return (raw && raw.startsWith('/')) ? backendBase + raw : raw || '/placeholder.png';
                    })()
                  }
                  alt={`Annotation ${index + 1}`}
                />
              </>
            ) : (<>{}</>)}
            {/* <CardMedia
              component="img"
              sx={{ width: 60, height: 60, borderRadius: 1, objectFit: 'cover' }}
              image={item.imageUrl || '/placeholder.png'}
              alt={`Annotation ${index + 1}`}
            /> */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="500" noWrap>
                {item.location || 'No location'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(item.timestamp).toLocaleDateString()} •{' '}
                {new Date(item.timestamp).toLocaleTimeString()}
              </Typography>
            </Box>
          </Box>
        </CardActionArea>
        {onDelete && <IconButton
          size="small"
          color="error"
          onClick={onDelete}
          sx={{
            '&:hover': {
              bgcolor: 'error.light',
              color: 'white',
            },
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>}
      </Box>
    </Card>
  );
}
