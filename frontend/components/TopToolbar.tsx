'use client';

import React from 'react';
import {
  Paper,
  Stack,
  Button,
  Tooltip,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ImageIcon from '@mui/icons-material/Image';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import DownloadIcon from '@mui/icons-material/Download';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface TopToolbarProps {
  hasChanges: boolean;
  onSave: () => void;
  onOpenFiles: () => void;
  onImageUrlChange: () => void;
  onVideoOpen: () => void;
  onExport: () => void;
  disableExport: boolean;
  onUploadClick?: () => void;
  disableUpload?: boolean;
  cameras?: any[];
  camerasId?: any;
  onCameraChange?: (value: any) => void;
  annotationName?: string;
  onAnnotationNameChange?: (value: string) => void;
}

export default function TopToolbar({
  hasChanges,
  onSave,
  onOpenFiles,
  onImageUrlChange,
  onVideoOpen,
  onExport,
  disableExport,
  onUploadClick,
  disableUpload,
  cameras = [],
  camerasId,
  onCameraChange,
  annotationName = '',
  onAnnotationNameChange,
}: TopToolbarProps) {
  return (
    <Paper elevation={2} sx={{ mb: 1, p: 1, borderRadius: 1 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
          <Tooltip title="Save (Ctrl+S)" arrow>
              <Button
                variant="contained"
                // startIcon={}
                onClick={onSave}
                disabled={!hasChanges}
              >
                {/* Save */}<SaveIcon />
              </Button>
          </Tooltip>

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Camera</InputLabel>
            <Select
              value={camerasId || ''}
              label="Select Camera"
              onChange={(e) => onCameraChange?.(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {cameras.map((camera: any) => (
                <MenuItem key={camera.id} value={camera.id}>
                  {camera.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            placeholder="Counting Zone Name"
            value={annotationName}
            onChange={(e) => onAnnotationNameChange?.(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          <Tooltip title="Open Files (Ctrl+O)" arrow>
            <Button
              variant="outlined"
              // startIcon={}
              onClick={onOpenFiles}
              size="small"
            >
              {/* History */}
              <FolderOpenIcon />
            </Button>
          </Tooltip>

          <Button
            variant="outlined"
            // startIcon={}
            onClick={onImageUrlChange}
            size="small"
          >
            {/* Image */}
            <ImageIcon />
          </Button>

          <Button
            variant="outlined"
            // startIcon={}
            onClick={onVideoOpen}
            size="small"
          >
            {/* Video */}<VideoLibraryIcon />
          </Button>

          <Tooltip title="Export JSON (Ctrl+E)" arrow>
              <Button
                variant="outlined"
                // startIcon={}
                onClick={onExport}
                disabled={disableExport}
              >
                {/* Export */}<DownloadIcon />
              </Button>
          </Tooltip>

          <Tooltip title="Upload image or video" arrow>
            <Button
              variant="outlined"
              // color=""
              onClick={onUploadClick}
              disabled={disableUpload}
              size="small"
              startIcon={<UploadFileIcon />}
            >
              File
            </Button>
          </Tooltip>
        </Stack>

        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 'fit-content' }}>
          {hasChanges ? 'Unsaved changes' : 'No changes'}
        </Typography>
      </Stack>
    </Paper>
  );
}
