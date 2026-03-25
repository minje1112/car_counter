'use client';

import React from 'react';
import Konva from 'konva';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Tooltip,
  Popover as MuiPopover,
  Slider,
} from '@mui/material';
import PaletteIcon from '@mui/icons-material/Palette';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import DeleteIcon from '@mui/icons-material/Delete';
import { Shape } from '@/lib/shapes/Shape';
import { Polygon } from '@/lib/shapes/Polygon';
import { Arrow } from '@/lib/shapes/Arrow';
import { TextInput } from '@/lib/shapes/TextInput';
import useAppDispatch from '@/lib/hooks/useAppDispatch';
import {
  fillShapeColor,
  removeShape,
  updateShape,
  saveHistory,
} from '@/lib/redux/slices/canvas';

interface ShapeCardProps {
  shape: any;
  canvasWidth: number;
  canvasHeight: number;
  isSelected: boolean;
  onSelect: () => void;
  shapesRef: React.MutableRefObject<Shape[]>;
  polygonsRef: React.MutableRefObject<Polygon[]>;
  arrowsRef: React.MutableRefObject<Arrow[]>;
  textInputsRef: React.MutableRefObject<TextInput[]>;
  layerRef: React.MutableRefObject<Konva.Layer | null>;
}

const colors = [
  'red',
  'green',
  'blue',
  'black',
  'yellow',
  'purple',
  'orange',
  'pink',
  'brown',
  'gray',
  'white',
];

export default function ShapeCard({
  shape,
  canvasWidth,
  canvasHeight,
  isSelected,
  onSelect,
  shapesRef,
  polygonsRef,
  arrowsRef,
  textInputsRef,
  layerRef,
}: ShapeCardProps) {
  const dispatch = useAppDispatch();
  const [colorAnchor, setColorAnchor] = React.useState<null | HTMLElement>(null);
  const [borderAnchor, setBorderAnchor] = React.useState<null | HTMLElement>(null);
  const [borderWidth, setBorderWidth] = React.useState(shape.strokeWidth || 2);
  const originalColorRef = React.useRef<string | null>(null);
  const selectedShapeId = `${shape.shapeType}-${shape.id}`;

  React.useEffect(() => {
    const isShapeSelected = isSelected && selectedShapeId === `${shape.shapeType}-${shape.id}`;

    const shapeInstance = shapesRef.current.find(
      (s) => s.id === shape.id && s.shapeType === shape.shapeType
    );

    if (!shapeInstance) return;

    if (isShapeSelected) {
      const konvaNode = layerRef.current?.findOne(`#${shape.id}`) as any;

      if (konvaNode) {
        let targetShape = konvaNode;

        if (konvaNode.getClassName() === 'Group') {
          const children = konvaNode.getChildren();

          if (shape.type === 'Arrow') {
            targetShape = children.find((child: any) => child.getClassName() === 'Line') || konvaNode;
            const circles = konvaNode.find('Circle');
            circles.forEach((circle: any) => {
              originalColorRef.current = circle.fill();
              circle.fill('#2521f3');
            });

            const labelGroup = layerRef.current?.findOne(`#${shape.id}-label`) as any;
            if (labelGroup && labelGroup.getClassName() === 'Group') {
              const labelChildren = labelGroup.getChildren();
              const bgRect = labelChildren.find((child: any) => child.getClassName() === 'Rect');
              if (bgRect) {
                bgRect.stroke('#2521f3');
                bgRect.strokeWidth(2);
              }
            }
          } else if (shape.type === 'Text') {
            const labelGroup = children.find((child: any) => child.getClassName() === 'Group');
            if (labelGroup) {
              const bgRect = labelGroup.findOne('Rect');
              if (bgRect) {
                originalColorRef.current = bgRect.stroke();
                bgRect.stroke('#2521f3');
                bgRect.strokeWidth(2);
              }
            }
            layerRef.current?.batchDraw();
            return;
          } else {
            targetShape = children.find((child: any) => typeof child.stroke === 'function') || konvaNode;

            const labelGroup = children.find((child: any) => child.getClassName() === 'Label');
            if (labelGroup) {
              const labelBg = labelGroup.findOne('Tag');
              if (labelBg) {
                labelBg.stroke('#2521f3');
                labelBg.strokeWidth(2);
              }
            }
          }
        }

        if (typeof targetShape.stroke === 'function') {
          originalColorRef.current = targetShape.stroke();
          targetShape.stroke('#2521f3');
          targetShape.strokeWidth(shape.type === 'Arrow' ? 4 : 2);
          layerRef.current?.batchDraw();
        }
      }
    } else {
      const konvaNode = layerRef.current?.findOne(`#${shape.id}`) as any;
      if (konvaNode) {
        let targetShape = konvaNode;

        if (konvaNode.getClassName() === 'Group') {
          const children = konvaNode.getChildren();

          if (shape.type === 'Arrow') {
            targetShape = children.find((child: any) => child.getClassName() === 'Line') || konvaNode;
            const circles = konvaNode.find('Circle');
            circles.forEach((circle: any) => {
              if (originalColorRef.current) {
                circle.fill(originalColorRef.current);
              }
            });

            const labelGroup = layerRef.current?.findOne(`#${shape.id}-label`) as any;
            if (labelGroup && labelGroup.getClassName() === 'Group') {
              const labelChildren = labelGroup.getChildren();
              const bgRect = labelChildren.find((child: any) => child.getClassName() === 'Rect');
              if (bgRect) {
                bgRect.stroke(originalColorRef.current || 'white');
                bgRect.strokeWidth(1);
              }
            }
          } else if (shape.type === 'Text') {
            const labelGroup = children.find((child: any) => child.getClassName() === 'Group');
            if (labelGroup) {
              const bgRect = labelGroup.findOne('Rect');
              if (bgRect) {
                bgRect.stroke(originalColorRef.current || 'white');
                bgRect.strokeWidth(1);
              }
            }
            layerRef.current?.batchDraw();
            return;
          } else {
            targetShape = children.find((child: any) => typeof child.stroke === 'function') || konvaNode;

            const labelGroup = children.find((child: any) => child.getClassName() === 'Label');
            if (labelGroup) {
              const labelBg = labelGroup.findOne('Tag');
              if (labelBg) {
                labelBg.stroke('white');
                labelBg.strokeWidth(1);
              }
            }
          }
        }

        if (typeof targetShape.stroke === 'function' && originalColorRef.current) {
          targetShape.stroke(originalColorRef.current);
          targetShape.strokeWidth(shape.strokeWidth || 2);
          layerRef.current?.batchDraw();
        }
      }
    }
  }, [isSelected, selectedShapeId, shape.id, shape.shapeType, shape.type, shapesRef, layerRef, shape.strokeWidth]);

  const calculateShapeSize = (points: [number, number][]) => {
    if (!points || points.length === 0) return { width: 0, height: 0 };

    const pixelPoints = points.map(([x, y]) => [x * canvasWidth, y * canvasHeight]);
    const xCoords = pixelPoints.map((p) => p[0]);
    const yCoords = pixelPoints.map((p) => p[1]);

    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    return {
      width: Math.round(maxX - minX),
      height: Math.round(maxY - minY),
    };
  };

  const size = calculateShapeSize(shape.points);

  const handleColorClick = (event: React.MouseEvent<HTMLElement>) => {
    setColorAnchor(event.currentTarget);
  };

  const handleColorClose = () => {
    setColorAnchor(null);
  };

  const handleBorderClick = (event: React.MouseEvent<HTMLElement>) => {
    setBorderAnchor(event.currentTarget);
  };

  const handleBorderClose = () => {
    setBorderAnchor(null);
  };

  const handleColorChange = (color: string) => {
    dispatch(saveHistory());
    dispatch(
      fillShapeColor({
        shapeType: shape.shapeType,
        shapeId: shape.id,
        color: color,
      })
    );
    handleColorClose();
  };

  const handleBorderWidthChange = (event: Event, newValue: number | number[]) => {
    const width = newValue as number;
    setBorderWidth(width);

    const shapeInstance = shapesRef.current.find(
      (s) => s.id === shape.id && s.shapeType === shape.shapeType
    );
    if (shapeInstance && shapeInstance.setStrokeWidth) {
      shapeInstance.setStrokeWidth(width);
      layerRef.current?.batchDraw();
    }

    dispatch(saveHistory());
    dispatch(
      updateShape({
        shapeType: shape.shapeType,
        id: shape.id,
        points: shape.points,
        color: shape.color,
        strokeWidth: width,
      })
    );
  };

  const handleDelete = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();

    const shapeInstance = shapesRef.current.find(
      (s) => s.id === shape.id && s.shapeType === shape.shapeType
    );
    if (shapeInstance) {
      shapeInstance.destroy();

      const shapeIndex = shapesRef.current.findIndex(
        (s) => s.id === shape.id && s.shapeType === shape.shapeType
      );
      if (shapeIndex !== -1) {
        shapesRef.current.splice(shapeIndex, 1);
      }

      const shapeType = shape.shapeType;
      if (shapeType === 'polygon') {
        const polyIndex = polygonsRef.current.findIndex((p) => p.id === shape.id);
        if (polyIndex !== -1) {
          polygonsRef.current.splice(polyIndex, 1);
        }
      } else if (shapeType === 'arrow') {
        const arrowIndex = arrowsRef.current.findIndex((a) => a.id === shape.id);
        if (arrowIndex !== -1) {
          arrowsRef.current.splice(arrowIndex, 1);
        }
      } else if (shapeType === 'text') {
        const textIndex = textInputsRef.current.findIndex((ti) => ti.id === shape.id);
        if (textIndex !== -1) {
          textInputsRef.current.splice(textIndex, 1);
        }
      }

      layerRef.current?.batchDraw();
    }

    dispatch(saveHistory());
    dispatch(
      removeShape({
        id: shape.id,
        shapeType: shape.shapeType,
      })
    );
  };

  return (
    <Card
      variant="outlined"
      onClick={onSelect}
      sx={{
        border: isSelected ? '2px solid' : '1px solid',
        my: 1,
        borderColor: isSelected ? 'primary.main' : 'grey.300',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: 2,
        },
        transition: 'all 0.2s',
      }}
    >
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
            {shape.shapeType === 'text' ? shape.text : shape.labelText}
          </Typography>

          <Box>
            {shape.shapeType !== 'text' && (
              <>
                <Tooltip title="Change Color">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleColorClick(e);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <PaletteIcon fontSize="small" sx={{ color: shape.color || 'default' }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Border Width">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBorderClick(e);
                    }}
                    sx={{ p: 0.5 }}
                  >
                    <BorderColorIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Delete Shape">
              <IconButton size="small" onClick={handleDelete} sx={{ p: 0.5, color: 'error.main' }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography variant="caption" display="block" color="text.secondary">
          Size: {size.width}px × {size.height}px
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Color:
          </Typography>
          <Box
            sx={{
              width: 16,
              height: 16,
              backgroundColor: shape.color || 'gray',
              border: '1px solid #ccc',
              borderRadius: 0.5,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {shape.color || 'default'}
          </Typography>
        </Box>

        {shape.shapeType && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
            Shape: {shape.shapeType}
          </Typography>
        )}

        {shape.points && shape.type !== 'Text' && (
          <Typography variant="caption" display="block" color="text.secondary">
            Points: {shape.points.length}
          </Typography>
        )}
      </CardContent>

      {/* Color Picker Popover */}
      <MuiPopover
        open={Boolean(colorAnchor)}
        anchorEl={colorAnchor}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
            Choose Color
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1 }}>
            {colors.map((c) => (
              <Box
                key={c}
                onClick={() => handleColorChange(c)}
                sx={{
                  backgroundColor: c,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  borderRadius: 1,
                  border: shape.color === c ? '3px solid #1976d2' : '1px solid #ccc',
                  '&:hover': {
                    transform: 'scale(1.1)',
                    boxShadow: 2,
                  },
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </Box>
        </Box>
      </MuiPopover>

      {/* Border Width Popover */}
      <MuiPopover
        open={Boolean(borderAnchor)}
        anchorEl={borderAnchor}
        onClose={handleBorderClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, width: 200 }}>
          <Typography variant="caption" sx={{ fontWeight: 'bold', mb: 1, display: 'block' }}>
            Border Width
          </Typography>
          <Slider
            value={borderWidth}
            onChange={handleBorderWidthChange}
            min={1}
            max={10}
            step={0.5}
            marks
            valueLabelDisplay="auto"
            sx={{ mt: 2 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block', textAlign: 'center' }}
          >
            Current: {borderWidth}px
          </Typography>
        </Box>
      </MuiPopover>
    </Card>
  );
}
