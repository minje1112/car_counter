'use client';

import { Modal, Box } from '@mui/material';

interface VideoModalProps {
  open: boolean;
  onClose: () => void;
  videoUrl?: string;
}

export default function VideoModal({ open, onClose, videoUrl = "https://rtsp.me/embed/KPbwo57M/" }: VideoModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="video-modal"
    >
      <Box sx={{
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
          }
        }
      }}>
        <iframe 
          width="100%" 
          height="480" 
          src={videoUrl}
          style={{ border: 'none', borderRadius: '8px' }}
          allowFullScreen
        />
      </Box>
    </Modal>
  );
}
