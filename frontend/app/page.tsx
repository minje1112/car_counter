'use client';

import { useEffect, useState } from 'react';
import { Box, Paper, Alert, Snackbar, CircularProgress, Typography, Card, CardContent, Chip, IconButton, Modal, Fade, TextField, Button } from '@mui/material';
import CameraInfoPanel from '@/components/CameraInfoPanel';
import { useAISocket } from '@/lib/useAISocket';
import axiosInstance from '@/lib/utils/axios';
import { rtspApi, aiApi, annotationsApi } from '@/lib/api/camera';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import VideocamIcon from '@mui/icons-material/Videocam';
import { AddCircleOutline, AddToPhotos } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';

export interface Camera {
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
  annotation_id: number | null;
}

interface Annotation {
  id: number;
  name: string;
}

interface AIStatus {
  isActive: boolean;
  lastCount?: number;
  lastUpdated?: string;
  loading?: boolean;
}


export default function Home() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rtspUrl: '',
    description: '',
    location: '',
    status: 'active',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  
  // AI State
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [aiStatuses, setAiStatuses] = useState<Record<number, AIStatus>>({});
  
  const handleOpenAdd = () => {
    setModalMode('add');
    setFormData({ name: '', rtspUrl: '', description: '', location: '', status: 'active' });
    setModalOpen(true);
  };

  const handleOpenEdit = (camera: Camera) => {
    setModalMode('edit');
    setEditingCamera(camera);
    setFormData({
      name: camera.name,
      rtspUrl: camera.rtspUrl,
      description: camera.description,
      location: camera.location,
      status: camera.status,
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCamera(null);
    setFormData({ name: '', rtspUrl: '', description: '', location: '', status: 'active' });
    setError('');
  };

  useEffect(() => { getData() }, []); 

  useEffect(() => {
    loadAnnotations();
  }, []);

  // AI Socket.IO integration (replaces polling)
  const { isConnected, latestStatus, latestError } = useAISocket();

  // Update AI status when socket receives new data (no polling needed)
  useEffect(() => {
    if (latestStatus && typeof latestStatus.streamId === 'number') {
      const streamId: number = latestStatus.streamId;
      setAiStatuses(prev => ({
        ...prev,
        [streamId]: {
          isActive: true,
          lastCount: latestStatus.carCount,
          lastUpdated: latestStatus.timestamp,
          loading: false,
        }
      }));
    }
  }, [latestStatus]);

  // Handle socket errors
  useEffect(() => {
    if (latestError && typeof latestError.streamId === 'number') {
      const streamId: number = latestError.streamId;
      setAiStatuses(prev => ({
        ...prev,
        [streamId]: {
          isActive: false,
          lastCount: 0,
          loading: false,
        }
      }));
    }
  }, [latestError]);

  const loadAnnotations = async () => {
    try {
      const response = await annotationsApi.getAll();
      let tmp:any[] = []
      response.data.map((item:any)=>{
        tmp.push({
          id: item.id,
          name: item.location,
        })
      })
      setAnnotations(tmp);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    }
  };

  const getData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/rtsp/streams'); 
      setCameras(response.data);
      setSelectedCamera(response.data[0]);
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.rtspUrl) {
      setError('Name and RTSP URL are required');
      return;
    }

    try {
      setSubmitLoading(true);
      if (modalMode === 'add') {
        await axiosInstance.post('/api/rtsp/streams', formData);
      } else {
        await axiosInstance.put(`/api/rtsp/streams/${editingCamera?.id}`, formData);
      }
      handleCloseModal();
      getData();
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${modalMode} camera`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSnapshot = async (cameraId: number) => {
    try {
      await axiosInstance.post(`/api/rtsp/streams/${cameraId}/snapshot`); 
      getData();
    } catch (error) { } 
    finally{  }
  };

  const handleCameraDelete = async (cameraId: number) => {
    try {
      await axiosInstance.delete(`/api/rtsp/streams/${cameraId}`); 
      setSelectedCamera(null);
      getData();
    } catch (error) {   }     finally{  }
  };

  // AI Handlers
  const handleAssignAnnotation = async (annotationId: number) => {
    if (!selectedCamera) return;
    try {
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { ...prev[selectedCamera.id], loading: true }
      }));
      await rtspApi.assignAnnotation(selectedCamera.id, annotationId);
      getData();
    } catch (error) {
      console.error('Failed to assign annotation:', error);
    } finally {
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { ...prev[selectedCamera.id], loading: false }
      }));
    }
  };

  const handleStartAI = async () => {
    if (!selectedCamera) return;
    try {
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { ...prev[selectedCamera.id], loading: true }
      }));
      
      const response = await aiApi.startCounting(selectedCamera.id, 60);
      
      // Update status to active on success
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { 
          isActive: true, 
          lastCount: 0,
          loading: false 
        }
      }));
      console.log('✅ AI started successfully');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '';
      console.error('❌ Failed to start AI:', errorMsg);
      
      // If job already running, stop it and restart
      if (errorMsg.includes('already running')) {
        try {
          console.log('⚠️ Job already running, stopping first...');
          await aiApi.stopCounting(selectedCamera.id);
          // Wait a moment
          await new Promise(resolve => setTimeout(resolve, 1000));
          // Try to start again
          const restartResponse = await aiApi.startCounting(selectedCamera.id, 60);
          setAiStatuses(prev => ({
            ...prev,
            [selectedCamera.id]: { 
              isActive: true,
              lastCount: 0,
              loading: false 
            }
          }));
          console.log('✅ AI restarted successfully');
        } catch (restartError: any) {
          console.error('❌ Failed to restart AI:', restartError);
          setAiStatuses(prev => ({
            ...prev,
            [selectedCamera.id]: { 
              isActive: false,
              loading: false 
            }
          }));
        }
      } else {
        setAiStatuses(prev => ({
          ...prev,
          [selectedCamera.id]: { 
            isActive: false,
            loading: false 
          }
        }));
      }
    }
  };

  const handleStopAI = async () => {
    if (!selectedCamera) return;
    try {
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { ...prev[selectedCamera.id], loading: true }
      }));
      
      const response = await aiApi.stopCounting(selectedCamera.id);
      
      // Update status to inactive on success
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { 
          isActive: false, 
          loading: false 
        }
      }));
      console.log('✅ AI stopped successfully');
    } catch (error: any) {
      console.error('❌ Failed to stop AI:', error.response?.data?.message || error.message);
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { 
          ...prev[selectedCamera.id],
          loading: false 
        }
      }));
    }
  };

  const handleRestartAI = async () => {
    if (!selectedCamera) return;
    try {
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { ...prev[selectedCamera.id], loading: true }
      }));
      
      const response = await aiApi.restartCounting(selectedCamera.id, 60);
      
      // Update status to active on success
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { 
          isActive: true,
          lastCount: 0,
          loading: false 
        }
      }));
      console.log('✅ AI restarted successfully');
    } catch (error: any) {
      console.error('❌ Failed to restart AI:', error.response?.data?.message || error.message);
      setAiStatuses(prev => ({
        ...prev,
        [selectedCamera.id]: { 
          ...prev[selectedCamera.id],
          loading: false 
        }
      }));
    }
  };

  return (
    <Box sx={{ width: '100%', display: 'flex', height: 'calc(100vh - 50px)',position:'relative', overflow: 'hidden' }}>
      <Box sx={{ flex: 1, p: 2, backgroundColor: '#707070', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : cameras.length > 0 ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gridTemplateRows: 'repeat(2, 1fr)',
              gap: 2,
              height: '100%',
            }}
          >
            {cameras.slice(0, 4).map((camera) => (
              <Card
                key={camera.id}
                sx={{
                  backgroundColor: '#2a2a2a',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  border: selectedCamera?.id === camera.id ? '2px solid #1976d2' : '2px solid transparent',
                  '&:hover': {
                    transform: 'scale(1.02)',
                    border: '2px solid #1976d2',
                  },
                }}
                onClick={() => handleCameraSelect(camera)}
              >
                <CardContent sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VideocamIcon sx={{ color: '#fff', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 600 }}>
                        {camera.name}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      flex: 1,
                      backgroundColor: '#000',
                      borderRadius: 1,
                      overflow: 'hidden',
                      // position: 'relative',
                    }}
                  >
                    {camera.rtsp_url ? (
                      <iframe
                        src={camera.rtsp_url}
                        width="100%"
                        height="100%"
                        frameBorder="0"
                        title={camera.name}
                        // style={{ position: 'absolute', top: 0, left: 0 }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: '#666',
                        }}
                      >
                        <Typography variant="body2">No Stream Available</Typography>
                      </Box>
                    )}
                  </Box>
{/* 
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      {aiStatuses[camera.id]?.isActive 
                        ? `count ${aiStatuses[camera.id]?.lastCount || 0}` 
                        : 'count 0'}
                    </Typography>
                    {camera.recording_enabled === 1 && (
                      <Chip
                        label="REC"
                        size="small"
                        color="error"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                    )}
                  </Box> */}
                </CardContent>
              </Card>
            ))}
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <VideocamIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No cameras available
              </Typography>
            </Paper>
          </Box>
        )}
      </Box>
      <Box className='flex-col bg-[#f5f5f5] '>
        <CameraInfoPanel 
          handleSnapshot={handleSnapshot} 
          handleCameraDelete={handleCameraDelete} 
          handleEdit={handleOpenEdit} 
          handleAdd={handleOpenAdd}
          camera={selectedCamera}
          annotations={annotations}
          aiStatus={selectedCamera ? aiStatuses[selectedCamera.id] : undefined}
          onAssignAnnotation={handleAssignAnnotation}
          onStartAI={handleStartAI}
          onStopAI={handleStopAI}
          onRestartAI={handleRestartAI}
        />
      </Box>
      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        closeAfterTransition
        slotProps={{
          backdrop: {
            timeout: 500,
          },
        }}
      >
        <Fade in={modalOpen}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 500,
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                {modalMode === 'add' ? 'Add New Camera' : 'Edit Camera'}
              </Typography>
              <IconButton onClick={handleCloseModal} size="small">
                <CloseIcon />
              </IconButton>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Camera Name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                sx={{ mb: 2 }}
                placeholder="Front Door Camera"
              />

              <TextField
                fullWidth
                label="Stream URL"
                name="rtspUrl"
                value={formData.rtspUrl}
                onChange={handleInputChange}
                required
                sx={{ mb: 0.5 }}
                placeholder="rtsp://192.168.1.100:554/stream or https://example.com/stream.m3u8"
                helperText="Supports RTSP, HTTP, HTTPS, HLS (.m3u8), and .ts streams"
              />

              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                multiline
                rows={3}
                sx={{ mb: 2 }}
                placeholder="Main entrance camera"
              />

              <TextField
                fullWidth
                label="Location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                sx={{ mb: 3 }}
                placeholder="Front entrance"
              />

              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button 
                  onClick={handleCloseModal} 
                  variant="outlined"
                  disabled={submitLoading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained"
                  disabled={submitLoading}
                  sx={{
                    minWidth: 120,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  {submitLoading ? <CircularProgress size={24} /> : (modalMode === 'add' ? 'Add Camera' : 'Update Camera')}
                </Button>
              </Box>
            </form>
          </Box>
        </Fade>
      </Modal>
    </Box>
  );
}
