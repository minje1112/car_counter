'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Paper, Alert, Snackbar, CircularProgress, Drawer, Select, MenuItem, FormControl, InputLabel, Button, Tooltip } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Canvas from '@/components/Canvas';
import KeyCmd from '@/components/KeyCmd';
import VideoModal from '@/components/VideoModal';
import TopToolbar from '@/components/TopToolbar';
import AnnotationHistoryModal from '@/components/AnnotationHistoryModal';
import Header from '@/components/Header';
import { annotationsApi } from '@/lib/api/annotations';
import axios from '@/lib/utils/axios';
import CameraModal from '@/components/CameraModal';
interface ShapePoint {
  id: string;
  color: string;
  points: number[][];
  strokeWidth?: number;
  labelText?: string;
}

interface TextShape {
  id: string;
  color: string;
  points: number[][];
  text?: string;
}

interface Shapes {
  Line?: ShapePoint[];
  Polygon?: ShapePoint[];
  Rectangle?: ShapePoint[];
  Text?: TextShape[];
}

interface AnnotationData {
  id: number;
  location: string;
  imageUrl: string;
  annotations: {
    shapes: Shapes;
    timestamp: string;
  };
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

interface CanvasData {
  shapes: Shapes;
  timestamp: string;
}

export default function Home() {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | undefined>();
  const [backgroundVideoUrl, setBackgroundVideoUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [exampleData, setExampleData] = useState<any | null>(null);
  const [listData, setListData] = useState<AnnotationData[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [camerasId, setCamerasId] = useState<any | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [annotationName, setAnnotationName] = useState('');
  const [modalVideo, setModalVideo] = useState(false);
  console.log(camerasId)
  const canvasDataRef = useRef<CanvasData | null>(null);

  const handleDataChange = useCallback((data: CanvasData) => {
    canvasDataRef.current = data;
    setHasChanges(true);
  }, []);

  const getData = async () => {
    try {
      setLoading(true);
      const response = await annotationsApi.getAll();
      setListData(response.data || []);
      setLoading(false);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to load annotations');
      setShowError(true);
      setLoading(false);
    }
  };
  const getCameraData = async () => {
    try {
      setLoading(true);
      const res = await axios('/api/rtsp/streams');
      setCameras(res.data)
    } 

      catch (error: any) {
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getData();
    getCameraData()
  }, []);

  useEffect(() => {
    // Only set imageUrl if you have a real image (e.g. from annotation), not for camera stream
    // When a camera is selected, do not set imageUrl to the stream URL
    // The stream is shown as an iframe background, not as a Canvas image
  }, [camerasId, cameras]);

  const handleSelectAnnotation = async (item: AnnotationData) => {
    try {
      setLoadingDetail(true);
      setOpenModal(false);

      const response = await annotationsApi.getById(item.id);
      const fullData = response.data || response;

      const shapesData = fullData.annotations?.shapes || {};

      setExampleData({
        id: fullData.id,
        location: fullData.location,
        imageUrl: fullData.imageUrl,
        shapes: shapesData,
        timestamp: fullData.timestamp,
      });
      setImageUrl(fullData.imageUrl || '');
      setSelectedId(fullData.id);
      setLoadingDetail(false);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to load annotation');
      setShowError(true);
      setLoadingDetail(false);
    }
  };

  const handleOpenFiles = () => {
    setOpenModal(true);
  };

  const handleSelectFile = (file: any) => {
    const fileUrl = file?.file_url || file?.fileUrl || file?.file_path || file?.filePath || file?.filePath;
    if (!fileUrl) return;

    const backendBase = (axios && (axios as any).defaults && (axios as any).defaults.baseURL) ? (axios as any).defaults.baseURL : window.location.origin;
    const fullUrl = fileUrl.startsWith('/') ? backendBase + fileUrl : fileUrl;

    if (file.file_type === 'video' || file.fileType === 'video' || fullUrl.match(/\.(mp4|webm|mov|avi|mpeg)$/i)) {
      setBackgroundVideoUrl(fullUrl);
      setImageUrl('');
    } else {
      // treat as image
      setImageUrl(fullUrl);
      setBackgroundVideoUrl(null);
    }

    setExampleData(null);
    setSelectedId(null);
    setAnnotationName('');
    setOpenModal(false);
  };

  const handleDeleteAnnotation = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this annotation?')) {
      try {
        setLoading(true);
        await annotationsApi.delete(id);
        setShowSuccess(true);
        await getData();
        if (exampleData?.id === id) {
          setExampleData(null);
          setImageUrl('');
          setAnnotationName('');
        }
        setLoading(false);
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || error.message || 'Failed to delete annotation');
        setShowError(true);
        setLoading(false);
      }
    }
  };
  
  useEffect(() => {
    if (imageUrl) {
      // when an image URL is set, clear any background video
      setBackgroundVideoUrl(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        setBackgroundImage(img);
      };

      img.onerror = () => {
        console.warn('Failed to load image with CORS, trying without crossOrigin');
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setBackgroundImage(fallbackImg);
        };
        fallbackImg.onerror = () => {
          setErrorMessage('Failed to load image. The image URL might be blocked by CORS policy or invalid.');
          setShowError(true);
        };
        fallbackImg.src = imageUrl;
      };

      img.src = imageUrl;
    } else {
      setBackgroundImage(undefined);
    }
  }, [imageUrl]);

  const handleSaveData = async () => {
    const sendingData = canvasDataRef.current;
    if (sendingData) {
      try {
        setLoading(true);

        const deduplicatedShapes: Shapes = {
          Polygon: sendingData.shapes.Polygon
            ? Array.from(new Map(sendingData.shapes.Polygon.map((s) => [s.id, s])).values())
            : [],
          Rectangle: sendingData.shapes.Rectangle
            ? Array.from(new Map(sendingData.shapes.Rectangle.map((s) => [s.id, s])).values())
            : [],
          Line: sendingData.shapes.Line
            ? Array.from(new Map(sendingData.shapes.Line.map((s) => [s.id, s])).values())
            : [],
          Text: sendingData.shapes.Text
            ? Array.from(new Map(sendingData.shapes.Text.map((s) => [s.id, s])).values())
            : [],
        };

        const dataToSend = {
          location: annotationName || exampleData?.location || 'Untitled Drawing',
          imageUrl: imageUrl,
          cameraId: camerasId || null,
          annotations: {
            shapes: deduplicatedShapes,
            timestamp: sendingData.timestamp,
          },
          timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        };

        console.log('Sending deduplicated data:', dataToSend);

        let response;
        if (exampleData?.id) {
          response = await annotationsApi.update(exampleData.id, dataToSend);
          console.log('Updated annotation:', response.data);
        } else {
          response = await annotationsApi.create(dataToSend);
          console.log('Created new annotation:', response.data);
          const newData = response.data || response;
          setExampleData({
            id: newData.id,
            location: newData.location || '',
            imageUrl: newData.imageUrl || imageUrl,
            shapes: deduplicatedShapes,
            timestamp: newData.timestamp,
          });
          setSelectedId(newData.id);
          
          // Assign annotation to camera if camera is selected
          if (camerasId && newData?.id) {
            try {
              await axios.put(`/api/rtsp/streams/${camerasId}/annotation`, { annotationId: newData.id });
              console.log('Annotation assigned to camera');
            } catch (error: any) {
              console.error('Failed to assign annotation to camera:', error);
            }
          }
        }

        setShowSuccess(true);
        setHasChanges(false);
        
        // Assign annotation to camera if camera is selected (for updates)
        if (camerasId && exampleData?.id && !response.data) {
          try {
            await axios.put(`/api/rtsp/streams/${camerasId}/annotation`, { annotationId: exampleData.id });
            console.log('Annotation assigned to camera');
          } catch (error: any) {
            console.error('Failed to assign annotation to camera:', error);
          }
        }
        
        setLoading(false);
        getData();
      } catch (error: any) {
        setErrorMessage(error.response?.data?.message || error.message || 'Failed to save annotations');
        setShowError(true);
        setLoading(false);
      }
    }
  };

  const handleExportJSON = () => {
    const sendingData = canvasDataRef.current;
    if (!sendingData) return;

    const deduplicatedShapes: Shapes = {
      Polygon: sendingData.shapes.Polygon
        ? Array.from(new Map(sendingData.shapes.Polygon.map((s) => [s.id, s])).values())
        : [],
      Rectangle: sendingData.shapes.Rectangle
        ? Array.from(new Map(sendingData.shapes.Rectangle.map((s) => [s.id, s])).values())
        : [],
      Line: sendingData.shapes.Line
        ? Array.from(new Map(sendingData.shapes.Line.map((s) => [s.id, s])).values())
        : [],
      Text: sendingData.shapes.Text
        ? Array.from(new Map(sendingData.shapes.Text.map((s) => [s.id, s])).values())
        : [],
    };

    const mapPolygon = (s: any) => ({
      color: s.color || 'black',
      label: (s.labelText || s.label) || 'polygon',
      text: s.text || s.labelText || '',
      id: s.id,
      shapeType: 'polygon',
      points: s.points || [],
    });

    const mapLine = (s: any) => ({
      color: s.color || 'black',
      label: (s.labelText || s.label) || '',
      id: s.id,
      shapeType: 'arrow',
      points: s.points || [],
    });

    const mapRect = (s: any) => ({
      color: s.color || 'black',
      label: (s.labelText || s.label) || '',
      id: s.id,
      shapeType: 'rectangle',
      points: s.points || [],
    });

    const exportedShapes = {
      Polygon: (deduplicatedShapes.Polygon || []).map(mapPolygon),
      Line: (deduplicatedShapes.Line || []).map(mapLine),
      Rectangle: (deduplicatedShapes.Rectangle || []).map(mapRect),
    };

    const exportObj = {
      name: exampleData?.location || imageUrl || '',
      frameNumber: 1,
      station: '',
      config: {
        NAME: exampleData?.location || imageUrl || '',
        LOCATION_NAME: '',
        RTSP: '',
        FPS: 5,
        shapes: exportedShapes,
      },
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setErrorMessage('Only image and video files are allowed.');
      setShowError(true);
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setLoading(true);
      const res = await axios.post('/api/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploaded = res.data?.data || res.data;
      const fileUrl = uploaded?.fileUrl || uploaded?.file_url || uploaded?.file_url || uploaded?.fileUrl;
      const fullUrl = fileUrl && fileUrl.startsWith('/') ? window.location.origin + fileUrl : fileUrl;

      if (fullUrl) {
        setImageUrl(fullUrl);
        setShowSuccess(true);
      } else {
        setErrorMessage('Upload succeeded but no file URL returned');
        setShowError(true);
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to upload file');
      setShowError(true);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleImageUrlChange = () => {
    const newUrl = prompt('Enter image URL:', imageUrl);
    if (newUrl) {
      setImageUrl(newUrl);
      setExampleData(null);
      setSelectedId(null);
      setAnnotationName('');
    }
  };
  
  return (
    <Box sx={{ width: '100%', display: 'flex', height: 'calc(100vh - 50px)',position:'relative', overflow: 'hidden' }}>
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 2 }}>
        <KeyCmd
          onSave={hasChanges ? handleSaveData : undefined}
          onOpenFiles={handleOpenFiles}
          onExport={canvasDataRef.current ? handleExportJSON : undefined}
          disabled={loading || loadingDetail}
        />

          <TopToolbar
            hasChanges={hasChanges}
            onSave={handleSaveData}
            onOpenFiles={handleOpenFiles}
            onImageUrlChange={handleImageUrlChange}
            onVideoOpen={() => setModalVideo(true)}
            onExport={handleExportJSON}
            disableExport={!canvasDataRef.current?.shapes || Object.values(canvasDataRef.current.shapes).every(shape => !shape || shape.length === 0)}
            cameras={cameras}
            camerasId={camerasId}
            onCameraChange={setCamerasId}
            annotationName={annotationName}
            onAnnotationNameChange={setAnnotationName}
            onUploadClick={handleUploadButtonClick}
            disableUpload={loading || loadingDetail}
          />
            {/* disableExport={!canvasDataRef.current}
            cameras={cameras}
            camerasId={camerasId}
            onCameraChange={setCamerasId}
          /> */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: 'none' }}
            onChange={handleFileSelected}
          />

        <AnnotationHistoryModal
          open={openModal}
          onClose={() => setOpenModal(false)}
          loading={loading}
          listData={listData}
          selectedId={selectedId}
          onSelectAnnotation={handleSelectAnnotation}
          onDeleteAnnotation={handleDeleteAnnotation}
          onSelectFile={handleSelectFile}
        />

        <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <Paper
            elevation={3}
            sx={{
              flex: 1,
              borderRadius: 1,
              bgcolor: '#fafafa',
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {loadingDetail ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <CircularProgress size={60} />
              </Box>
            ) : (
              <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                {/* Camera Stream Background or Uploaded Video/Image Background */}
                {camerasId && cameras.find((cam: any) => cam.id === camerasId)?.rtsp_url ? (
                  <Box sx={{
                    width: '100%',
                    height: '100%',
                  }}>
                    <iframe
                      src={cameras.find((cam: any) => cam.id === camerasId)?.rtsp_url}
                      style={{
                        width: '77%',
                        marginLeft: '23%',
                        height: '100%',
                        border: 'none',
                        display: 'block',
                        background: '#000',
                      }}
                      title="Camera Stream"
                      allow="autoplay"
                    />
                  </Box>
                ) : backgroundVideoUrl ? (
                  <Box sx={{ width: '100%', height: '100%' }}>
                    <video
                      src={backgroundVideoUrl}
                      style={{
                        width: '77%',
                        marginLeft: '23%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                        background: '#000',
                      }}
                      autoPlay
                      loop
                      muted
                      controls
                    />
                  </Box>
                ) : null}
                {/* Canvas Overlay */}
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                  <Canvas
                    key={selectedId || 'new'}
                    backgroundImage={backgroundImage}
                    initialShapes={exampleData?.shapes}
                    onDataChange={handleDataChange}
                  />
                </Box>
              </Box>
            )}
          </Paper>
        </Box>
        <CameraModal
          open={modalVideo}
          onClose={() => setModalVideo(false)}
          loading={loading}
          listData={cameras}
          selectedId={camerasId}
          onSelectAnnotation={(camera)  => {setCamerasId(camera); setModalVideo(false);}}
        />
        <Snackbar
          open={showSuccess}
          autoHideDuration={3000}
          onClose={() => setShowSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" variant="filled" onClose={() => setShowSuccess(false)}>
            Annotations saved successfully!
          </Alert>
        </Snackbar>

        <Snackbar
          open={showError}
          autoHideDuration={5000}
          onClose={() => setShowError(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" variant="filled" onClose={() => setShowError(false)}>
            {errorMessage}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}
