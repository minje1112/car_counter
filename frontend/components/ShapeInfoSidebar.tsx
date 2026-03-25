'use client';

import React from 'react';
import Konva from 'konva';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Chip,
  Stack,
} from '@mui/material';
import ShapeCard from './ShapeCard';
import { Shape } from '@/lib/shapes/Shape';
import { Polygon } from '@/lib/shapes/Polygon';
import { Arrow } from '@/lib/shapes/Arrow';
import { TextInput } from '@/lib/shapes/TextInput';
import useAppSelector from '@/lib/hooks/useAppSelector';

interface ShapeInfoSidebarProps {
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  canvasHeight: number;
  shapesRef: React.MutableRefObject<Shape[]>;
  polygonsRef: React.MutableRefObject<Polygon[]>;
  arrowsRef: React.MutableRefObject<Arrow[]>;
  textInputsRef: React.MutableRefObject<TextInput[]>;
  layerRef: React.MutableRefObject<Konva.Layer | null>;
}

export default function ShapeInfoSidebar({
  selectedShapeId,
  setSelectedShapeId,
  canvasHeight,
  shapesRef,
  polygonsRef,
  arrowsRef,
  textInputsRef,
  layerRef,
}: ShapeInfoSidebarProps) {
  const canvasState = useAppSelector((state) => state.canvas);
  const shapes = canvasState.shapes;
  const canvasWidth = canvasState.width;

  const allShapes = [
    ...shapes.Polygon.map((s: any) => ({ ...s, type: 'Polygon' })),
    ...shapes.Rectangle.map((s: any) => ({ ...s, type: 'Rectangle' })),
    ...shapes.Line.map((s: any) => ({ ...s, type: 'Arrow' })),
    ...shapes.Text.map((s: any) => ({ ...s, type: 'Text' })),
  ];

  const totalShapes = allShapes.length;

  return (
    <Box
      sx={{
        width: 330,
        minWidth: 330,
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        bgcolor: 'background.paper',
        borderRadius: 1,
        boxShadow: 2,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'grey.100',
          borderRadius: 1,
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'grey.400',
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'grey.600',
          },
        },
      }}
    >
      <Card variant="outlined" sx={{ border: 'none' }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Shape Information
          </Typography>
          <Divider sx={{ my: 1 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Total Shapes
            </Typography>
            <Chip label={totalShapes} color="primary" size="small" />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              By Type
            </Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Polygons:</Typography>
                <Chip label={shapes.Polygon.length} size="small" variant="outlined" color="success" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Rectangles:</Typography>
                <Chip label={shapes.Rectangle.length} size="small" variant="outlined" color="info" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Arrows:</Typography>
                <Chip label={shapes.Line.length} size="small" variant="outlined" color="warning" />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Texts:</Typography>
                <Chip label={shapes.Text.length} size="small" variant="outlined" color="secondary" />
              </Box>
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
            All Shapes
          </Typography>
          <Box sx={{ mt: 1, maxHeight: 400, overflowY: 'auto' }}>
            {allShapes.map((shape: any, index: number) => (
              <ShapeCard
                key={`${shape.type}-${shape.id}-${index}`}
                shape={shape}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
                isSelected={selectedShapeId === `${shape.shapeType}-${shape.id}`}
                onSelect={() => setSelectedShapeId(`${shape.shapeType}-${shape.id}`)}
                shapesRef={shapesRef}
                polygonsRef={polygonsRef}
                arrowsRef={arrowsRef}
                textInputsRef={textInputsRef}
                layerRef={layerRef}
              />
            ))}

            {allShapes.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                No shapes added yet
              </Typography>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
