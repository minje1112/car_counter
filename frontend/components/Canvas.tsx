'use client';

import React, { useEffect, useRef } from 'react';
import Konva from 'konva';
import { Box } from '@mui/material';
import { Arrow } from '@/lib/shapes/Arrow';
import { TextInput } from '@/lib/shapes/TextInput';
import { Polygon } from '@/lib/shapes/Polygon';
import { Rectangle } from '@/lib/shapes/Rectangle';
import { Shape } from '@/lib/shapes/Shape';
import { calcPointsInPixels } from '@/lib/utils/hooks';
import useAppSelector from '@/lib/hooks/useAppSelector';
import useAppDispatch from '@/lib/hooks/useAppDispatch';
import {
  addShape,
  removeShape,
  reset,
  selectColor,
  selectShapes,
  selectTool,
  updateShape,
  saveHistory,
  setTool,
  setSize,
  fillShapeColor,
  undo,
  redo,
} from '@/lib/redux/slices/canvas';
import ToolButtons from './ToolButtons';
import ShapeInfoSidebar from './ShapeInfoSidebar';

type ConfigShapes = {
  Polygon?: Array<{ 
    points: [number, number][];
    color?: string;
    strokeWidth?: number;
      labelText?: string;
    id?: string;
  }>;
  
  Rectangle?: Array<{ 
    points: [number, number][];
    color?: string;
    strokeWidth?: number;
    id?: string;
    labelText?: string;
  }>;
  Line?: Array<{ 
    points: [number, number][];
    color?: string;
    strokeWidth?: number;
      labelText?: string;
    id?: string;
  }>;
  Text?: Array<{ 
    points: [number, number][];
    color?: string;
    text?: string;
    id?: string;
  }>;
};

type Props = {
  backgroundImage?: HTMLImageElement;
  initialShapes?: ConfigShapes;
  onDataChange?: (data: any) => void;
};

export default function Canvas({ backgroundImage, initialShapes, onDataChange }: Props) {
  const tool = useAppSelector(selectTool);
  const color = useAppSelector(selectColor);
  const shapes = useAppSelector(selectShapes);
  const dispatch = useAppDispatch();
  const stageRef = useRef<Konva.Stage | null>(null);
  const layerRef = useRef<Konva.Layer | null>(null);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const polygonsRef = useRef<Polygon[]>([]);
  const arrowsRef = useRef<Arrow[]>([]);
  const textInputsRef = useRef<TextInput[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const shapesRef = useRef<Shape[]>([]);
  const incrementalIdRef = useRef(0);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
  const [canvasHeight, setCanvasHeight] = React.useState<number>(600);

  const getAutoId = () => {
    incrementalIdRef.current += 1;
    return incrementalIdRef.current.toString();
  };
  
  const trackMaxId = (id: string) => {
    const numId = parseInt(id, 10);
    if (!isNaN(numId) && numId > incrementalIdRef.current) {
      incrementalIdRef.current = numId;
    }
  };
  console.log("shapesRef", shapesRef.current)
  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    toolRef.current = tool;
  }, [tool]);
  
  useEffect(() => {
    if (!stageRef.current || !layerRef.current) return;
    
    const allShapes = [
      ...shapes.Polygon.map((s: any) => ({ ...s, shapeType: 'polygon' })),
      ...shapes.Rectangle.map((s: any) => ({ ...s, shapeType: 'rectangle' })),
      ...shapes.Line.map((s: any) => ({ ...s, shapeType: 'arrow' })),
      ...shapes.Text.map((s: any) => ({ ...s, shapeType: 'text' })),
    ];
    
    // Remove shapes that are no longer in Redux state
    const shapesToRemove = shapesRef.current.filter((shapeInstance) => {
      const existsInRedux = allShapes.some(
        (reduxShape: any) => 
          reduxShape.id === shapeInstance.id && 
          reduxShape.shapeType === shapeInstance.shapeType
      );
      return !existsInRedux;
    });
    
    shapesToRemove.forEach((shapeInstance) => {
      shapeInstance.destroy();
      const index = shapesRef.current.indexOf(shapeInstance);
      if (index > -1) {
        shapesRef.current.splice(index, 1);
      }
      
      if (shapeInstance.shapeType === 'polygon') {
        const polyIndex = polygonsRef.current.findIndex((p) => p.id === shapeInstance.id);
        if (polyIndex > -1) polygonsRef.current.splice(polyIndex, 1);
      } else if (shapeInstance.shapeType === 'arrow') {
        const arrowIndex = arrowsRef.current.findIndex((a) => a.id === shapeInstance.id);
        if (arrowIndex > -1) arrowsRef.current.splice(arrowIndex, 1);
      } else if (shapeInstance.shapeType === 'text') {
        const textIndex = textInputsRef.current.findIndex((t) => t.id === shapeInstance.id);
        if (textIndex > -1) textInputsRef.current.splice(textIndex, 1);
      }
    });
    
    allShapes.forEach((reduxShape: any) => {
      const shapeInstance = shapesRef.current.find(
        (s) => s.id === reduxShape.id && s.shapeType === reduxShape.shapeType
      );
      
      if (shapeInstance) {
        // Check if points have changed (for undo/redo position changes)
        const currentPoints = JSON.stringify((shapeInstance as any).getPointsProportion?.() || []);
        const newPoints = JSON.stringify(reduxShape.points || []);
        const pointsChanged = currentPoints !== newPoints;
        
        // If points changed significantly, recreate the shape
        if (pointsChanged && reduxShape.points && reduxShape.points.length > 0) {
          // Destroy the old shape
          shapeInstance.destroy();
          const index = shapesRef.current.indexOf(shapeInstance);
          if (index > -1) {
            shapesRef.current.splice(index, 1);
          }
          
          // Remove from type-specific refs
          if (reduxShape.shapeType === 'polygon') {
            const polyIndex = polygonsRef.current.findIndex((p) => p.id === reduxShape.id);
            if (polyIndex > -1) polygonsRef.current.splice(polyIndex, 1);
          } else if (reduxShape.shapeType === 'arrow') {
            const arrowIndex = arrowsRef.current.findIndex((a) => a.id === reduxShape.id);
            if (arrowIndex > -1) arrowsRef.current.splice(arrowIndex, 1);
          } else if (reduxShape.shapeType === 'text') {
            const textIndex = textInputsRef.current.findIndex((t) => t.id === reduxShape.id);
            if (textIndex > -1) textInputsRef.current.splice(textIndex, 1);
          }
          
          // Will be recreated in the "else" block below by setting shapeInstance to null
          // But we need to continue to the creation logic
        } else {
          // Just update color and stroke width if points haven't changed
          if (shapeInstance.fillColor && reduxShape.color) {
            shapeInstance.fillColor(reduxShape.color);
          }
          if (shapeInstance.setStrokeWidth && reduxShape.strokeWidth) {
            shapeInstance.setStrokeWidth(reduxShape.strokeWidth);
          }
          return; // Skip recreation
        }
      }
      
      // Create new shape (either doesn't exist or was just destroyed for position update)
      if (!shapesRef.current.find((s) => s.id === reduxShape.id && s.shapeType === reduxShape.shapeType)) {
        const pixelPoints = calcPointsInPixels(reduxShape.points, stageRef.current!.width(), stageRef.current!.height());
        
        if (reduxShape.shapeType === 'polygon') {
          const polygon = new Polygon({
            stage: stageRef.current!,
            layer: layerRef.current!,
            id: reduxShape.id,
            polygons: polygonsRef.current,
            initialPoints: pixelPoints,
            toolRef: toolRef,
            color: reduxShape.color || 'black',
          });
          
          if (reduxShape.labelText) {
            polygon.setLabelText(reduxShape.labelText);
          }
          if (reduxShape.strokeWidth) {
            polygon.setStrokeWidth(reduxShape.strokeWidth);
          }
          
          polygon.group.on('dragstart', () => {
            dispatch(saveHistory());
          });
          
          polygon.subscribeOnDragMove(() => {
            dispatch(
              updateShape({
                color: reduxShape.color || 'black',
                label: 'polygon',
                shapeType: polygon.shapeType,
                id: polygon.id,
                points: polygon.getPointsProportion(),
                labelText: polygon.getLabelText(),
              }),
            );
          });
          
          shapesRef.current.push(polygon);
        } else if (reduxShape.shapeType === 'rectangle') {
          const rect = new Rectangle({
            stage: stageRef.current!,
            layer: layerRef.current!,
            id: reduxShape.id,
            initialPoints: pixelPoints,
            color: reduxShape.color || 'black',
          });
          
          if (reduxShape.labelText) {
            rect.setLabelText(reduxShape.labelText);
          }
          if (reduxShape.strokeWidth) {
            rect.setStrokeWidth(reduxShape.strokeWidth);
          }
          
          rect.group.on('dragstart', () => {
            dispatch(saveHistory());
          });
          
          rect.eventEmitter.on('update', () => {
            dispatch(
              updateShape({
                color: reduxShape.color || 'black',
                label: 'rectangle',
                shapeType: rect.shapeType,
                id: rect.id,
                points: rect.getPointsProportion(),
                labelText: rect.getLabelText(),
              }),
            );
          });
          
          shapesRef.current.push(rect);
        } else if (reduxShape.shapeType === 'arrow') {
          const arrow = new Arrow({
            stage: stageRef.current!,
            layer: layerRef.current!,
            id: reduxShape.id,
            arrows: arrowsRef.current,
            initialPoints: pixelPoints,
            toolRef: toolRef,
            color: reduxShape.color || 'black',
            labelText: reduxShape.labelText,
          });
          
          if (reduxShape.strokeWidth) {
            (arrow as any).setStrokeWidth?.(reduxShape.strokeWidth);
          }
          
          arrow.group.on('dragstart', () => {
            dispatch(saveHistory());
          });
          
          arrow.eventEmitter.on('update', () => {
            dispatch(
              updateShape({
                color: reduxShape.color || 'black',
                label: 'arrow',
                shapeType: arrow.shapeType,
                id: arrow.id,
                points: arrow.getPointsProportion(),
                labelText: (arrow as any).getLabelText(),
              }),
            );
          });
          
          shapesRef.current.push(arrow);
        } else if (reduxShape.shapeType === 'text') {
          const group = new Konva.Group({
            x: pixelPoints[0][0],
            y: pixelPoints[0][1],
            draggable: true,
            id: reduxShape.id,
          });
          group.setAttr('shapeType', 'text');
          layerRef.current?.add(group);
          
          const textInput = new TextInput({
            group: group,
            layer: layerRef.current!,
            stage: stageRef.current!,
            id: reduxShape.id,
            color: reduxShape.color || 'black',
            toolRef: toolRef,
            autoEdit: false,
          });
          
          if (reduxShape.text) {
            textInput.setText(reduxShape.text);
          }
          
          textInput.eventEmitter.on('update', () => {
            dispatch(
              updateShape({
                color: reduxShape.color || 'black',
                label: textInput.getText() || 'text',
                shapeType: 'text',
                id: textInput.id,
                points: textInput.getPositionProportion(),
                text: textInput.getText(),
              }),
            );
          });
          
          group.on('dragstart', () => {
            dispatch(saveHistory());
          });
          
          group.on('dragend', () => {
            dispatch(
              updateShape({
                color: reduxShape.color || 'black',
                label: textInput.getText() || 'text',
                shapeType: 'text',
                id: textInput.id,
                points: textInput.getPositionProportion(),
                text: textInput.getText(),
              }),
            );
          });
          
          textInputsRef.current.push(textInput);
          shapesRef.current.push(textInput as unknown as Shape);
        }
      }
    });
    
    layerRef.current?.batchDraw();
  }, [shapes]);

  useEffect(() => {
    if (onDataChange) {
      const exportData = {
        shapes: {
          Polygon: shapes.Polygon.map((s: any) => ({
            id: s.id,
            points: s.points,
            color: s.color,
            strokeWidth: s.strokeWidth || 2,
            labelText: s.labelText || `Polygon ${s.id}`,
          })),
          Rectangle: shapes.Rectangle.map((s: any) => ({
            id: s.id,
            points: s.points,
            color: s.color,
            strokeWidth: s.strokeWidth || 2,
            labelText: s.labelText || `Rectangle ${s.id}`,
          })),
          Line: shapes.Line.map((s: any) => ({
            id: s.id,
            points: s.points,
            color: s.color,
            strokeWidth: s.strokeWidth || 3,
            labelText: s.labelText || `Arrow ${s.id}`,
          })),
          Text: shapes.Text.map((s: any) => ({
            id: s.id,
            points: s.points,
            color: s.color,
            text: s.text || '',
          })),
        },
        timestamp: new Date().toISOString(),
      };
      onDataChange(exportData);
    }
  }, [shapes, onDataChange]);

  const addDefaultShapes = (
    shapes: ConfigShapes,
    width: number,
    height: number,
  ) => {
    if (shapes.Polygon) {
      shapes.Polygon.forEach((pol) => {
      // Track existing ID to prevent duplicates
      if (pol.id) trackMaxId(pol.id);
      const polygonId = pol.id || getAutoId();
      const polygon = new Polygon({
        stage: stageRef.current!,
        layer: layerRef.current!,
        id: polygonId,
        polygons: polygonsRef.current,
        initialPoints: calcPointsInPixels(pol.points, width, height),
        toolRef: toolRef,
        color: pol.color || 'black',
      });

      // set labelText from backend if provided
      if (pol.labelText) {
        polygon.setLabelText(pol.labelText);
      }

      polygon.subscribeOnSave(() => {
        dispatch(setTool(null));
          dispatch(saveHistory());

        setTimeout(() => {
          stageRef.current?.on('click', handleStageClick);
        }, 500);
      });
      polygon.group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      polygon.subscribeOnDragMove(() => {
        dispatch(
          updateShape({
            color: pol.color || 'black',
            label: 'polygon',
            shapeType: polygon.shapeType,
            id: polygon.id,
            points: polygon.getPointsProportion(),
            labelText: polygon.getLabelText(),
          }),
        );
      });
      shapesRef.current.push(polygon);
      dispatch(
        addShape({
          color: pol.color || 'black',
          label: 'polygon',
          id: polygonId,
          shapeType: polygon.shapeType,
          points: polygon.getPointsProportion(),
          labelText: pol.labelText || `Polygon ${polygonId}`,
        }),
      );
    });
    }
    if (shapes.Rectangle) {
    shapes.Rectangle.forEach((rect) => {
      // Track existing ID to prevent duplicates
      if (rect.id) trackMaxId(rect.id);
      const rectangleId = rect.id || getAutoId();
      const rectangle = new Rectangle({
        stage: stageRef.current,
        layer: layerRef.current,
        id: rectangleId,
        initialPoints: calcPointsInPixels(rect.points, width, height),
        color: rect.color || 'black',
      });
      
      // Set label text if provided
      if (rect.labelText) {
        rectangle.setLabelText(rect.labelText);
      }
      
      rectangle.group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      rectangle.eventEmitter.on('update', () => {
        dispatch(
          updateShape({
            color: rect.color || 'black',
            label: 'rectangle',
            shapeType: rectangle.shapeType,
            id: rectangle.id,
            points: rectangle.getPointsProportion(),
            labelText: rectangle.getLabelText(),
          }),
        );
      });
      shapesRef.current.push(rectangle);
      dispatch(
        addShape({
          color: rect.color || 'black',
          label: 'rectangle',
          id: rectangleId,
          shapeType: rectangle.shapeType,
          points: rectangle.getPointsProportion(),
          labelText: rectangle.getLabelText(),
        }),
      );
    });
    }
    if (shapes.Line) {
    shapes.Line.forEach((line) => {
      // Track existing ID to prevent duplicates
      if (line.id) trackMaxId(line.id);
      const arrowId = line.id || getAutoId();
      const arrow = new Arrow({
        stage: stageRef.current,
        id: arrowId,
        layer: layerRef.current,
        arrows: arrowsRef.current,
        initialPoints: calcPointsInPixels(line.points, width, height),
        toolRef: toolRef,
        color: line.color || 'black',
        labelText: line.labelText, // Pass labelText to constructor
      });

      arrow.group.on('dragstart', () => {
        dispatch(saveHistory());
      });

      arrow.eventEmitter.on('update', () => {
        dispatch(
          updateShape({
            color: line.color || 'black',
            label: 'arrow',
            shapeType: arrow.shapeType,
            id: arrow.id,
            points: arrow.getPointsProportion(),
            labelText: (arrow as any).getLabelText(),
          }),
        );
      });
      shapesRef.current.push(arrow);
      dispatch(
        addShape({
          color: line.color || 'black',
          label: 'arrow',
          id: arrowId,
          shapeType: arrow.shapeType,
          points: arrow.getPointsProportion(),
          labelText: line.labelText || `Arrow ${arrowId}`,
        }),
      );
    });
    }
    if (shapes.Text) {
      shapes.Text.forEach((txt) => {
        const pixelPoints = calcPointsInPixels(txt.points, width, height);
        const pos = pixelPoints[0]; // Text only has one position point
        
        // Track existing ID to prevent duplicates
        if (txt.id) trackMaxId(txt.id);
        
        // Use the provided ID or generate a new unique one
        const newTextId = txt.id || getAutoId();
        
        // Check if this ID already exists and generate a new one if needed
        const existingText = textInputsRef.current.find(t => t.id === newTextId);
        const finalTextId = existingText ? getAutoId() : newTextId;
        
        const group = new Konva.Group({
          x: pos[0],
          y: pos[1],
          draggable: true,
          id: finalTextId,
        });
        group.setAttr('shapeType', 'text');
        layerRef.current?.add(group);
        
        const textInput = new TextInput({
          group: group,
          layer: layerRef.current!,
          stage: stageRef.current!,
          id: finalTextId,
          color: txt.color || 'black',
          toolRef: toolRef,
          autoEdit: false,
        });
        
        // Set the text content from saved data
        if (txt.text) {
          textInput.setText(txt.text);
        }
        
        // Subscribe to update events
        textInput.eventEmitter.on('update', () => {
          dispatch(
            updateShape({
              color: textInput.color || 'black',
              label: textInput.getText() || 'Label',
              shapeType: 'text',
              id: textInput.id,
              points: textInput.getPositionProportion(),
              text: textInput.getText(),
            }),
          );
        });
        
        // Subscribe to group dragstart
        group.on('dragstart', () => {
          dispatch(saveHistory());
        });
        
        // Subscribe to group dragend
        group.on('dragend', () => {
          dispatch(
            updateShape({
              color: textInput.color || 'black',
              label: textInput.getText() || 'Label',
              shapeType: 'text',
              id: textInput.id,
              points: textInput.getPositionProportion(),
              text: textInput.getText(),
            }),
          );
        });
        
        textInputsRef.current.push(textInput);
        shapesRef.current.push(textInput as unknown as Shape);
        
        dispatch(
          addShape({
            id: finalTextId,
            color: txt.color || 'black',
            label: txt.text || 'Label',
            shapeType: 'text',
            points: txt.points,
            text: txt.text || 'Label',
          }),
        );
      });
    }
  };

  function handleStageClick() {
    const pos = stageRef.current?.getPointerPosition();
    if (!pos) return;
    
    if (toolRef.current == 'polygon') {
      setIsDrawing(true);
      const polygon = new Polygon({
        stage: stageRef.current!,
        layer: layerRef.current!,
        id: getAutoId(),
        polygons: polygonsRef.current,
        initialPoints: [    
          [pos.x, pos.y],
          [pos.x + 20, pos.y + 20],
        ],
        toolRef: toolRef,
        color: colorRef.current || 'black',
      });

      polygon.edit();
      polygon.subscribeOnSave(() => {
        setIsDrawing(false);
        dispatch(setTool(null));
        // Trigger update after save
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: 'polygon',
            shapeType: polygon.shapeType,
            id: polygon.id,
            points: polygon.getPointsProportion(),
            labelText: polygon.getLabelText(),
          }),
        );
        layerRef.current?.batchDraw();
        setTimeout(() => {
          stageRef.current?.on('click', handleStageClick);
        }, 500);
      });

      polygon.group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      polygon.subscribeOnDragMove(() => {
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: 'polygon',
            shapeType: polygon.shapeType,
            id: polygon.id,
            points: polygon.getPointsProportion(),
            labelText: polygon.getLabelText(),
          }),
        );
      });
      shapesRef.current.push(polygon);
      // dispatch(saveHistory());
      dispatch(
        addShape({
          id: polygon.id,
          color: colorRef.current || 'black',
          label: 'polygon',
          shapeType: polygon.shapeType,
          points: polygon.getPointsProportion(),
        }),
      );
    } else if (toolRef.current == 'rectangle') {
      const rect = new Rectangle({
        stage: stageRef.current,
        layer: layerRef.current,
        initialPoints: [
          [pos.x, pos.y],
          [pos.x + 50, pos.y],
          [pos.x, pos.y + 50],
          [pos.x + 50, pos.y + 50],
        ],
        id: getAutoId(),
        color: colorRef.current || 'black',
      });
      rect.group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      rect.eventEmitter.on('update', () => {
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: 'rectangle',
            shapeType: rect.shapeType,
            id: rect.id,
            points: rect.getPointsProportion(),
            labelText: rect.getLabelText(),
          }),
        );
      });
      shapesRef.current.push(rect);
      console.log(rect.getLabelText())
      dispatch(saveHistory());
      dispatch(
        addShape({
          id: rect.id,
          color: colorRef.current || 'black',
          label: 'rectangle',
          shapeType: rect.shapeType,
          points: rect.getPointsProportion(),
          labelText: rect.getLabelText(),
        }),
      );
      
      // Auto turn off rectangle tool after drawing
      dispatch(setTool(null));
    } else if (toolRef.current == 'arrow') {
      const arrowId = getAutoId();
      const arrow = new Arrow({
        stage: stageRef.current,
        id: arrowId,
        layer: layerRef.current,
        arrows: arrowsRef.current,
        initialPoints: [
          [pos.x, pos.y],
          [pos.x + 20, pos.y + 20],
        ],
        toolRef: toolRef,
        color: colorRef.current || 'black',
        labelText: `Arrow ${arrowId}`, // Add labelText for new arrows
      });
      arrow.group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      arrow.eventEmitter.on('update', () => {
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: 'arrow',
            shapeType: arrow.shapeType,
            id: arrow.id,
            points: arrow.getPointsProportion(),
            labelText: (arrow as any).getLabelText(),
          }),
        );
      });
      shapesRef.current.push(arrow);
      dispatch(saveHistory());
      dispatch(
        addShape({
          id: arrowId,
          color: colorRef.current || 'black',
          label: 'arrow',
          shapeType: arrow.shapeType,
          points: arrow.getPointsProportion(),
          labelText: (arrow as any).getLabelText(),
        }),
      );
      
      // Auto turn off arrow tool after drawing
      dispatch(setTool(null));
    } else if (toolRef.current == 'eraser') {
      const shape = stageRef.current?.getIntersection(pos);
      if (!shape) return;
      
      // Check if clicked on a Text node (text label or standalone text)
      let parent = shape.getParent();
      let type: string | undefined;
      let id: string | undefined;
      
      if (shape.getType() === 'Text') {
        let current = parent;
        while (current) {
          const shapeType = current.getAttr('shapeType');
          if (shapeType) {
            type = shapeType;
            id = current.id();
            break;
          }
          current = current.getParent();
        }
        if (!type && parent) {
          type = parent.getAttr('shapeType');
          id = parent.id();
        }
      } else {
        type = parent?.getAttr('shapeType') || shape.getAttr('shapeType');
        id = parent?.id() || shape.id();
      }
      
      if (!id) return;
      
      if (id.endsWith('-label')) {
        id = id.replace('-label', '');
      }
      
      const sh = shapesRef.current.find((s) => s.id === id);
      if (sh) {
        sh.destroy();
        
        const shapeIndex = shapesRef.current.findIndex((s) => s.id === id);
        if (shapeIndex !== -1) {
          shapesRef.current.splice(shapeIndex, 1);
        }
        
        if (type === 'polygon') {
          const polyIndex = polygonsRef.current.findIndex((p) => p.id === id);
          if (polyIndex !== -1) {
            polygonsRef.current.splice(polyIndex, 1);
          }
        } else if (type === 'arrow') {
          const arrowIndex = arrowsRef.current.findIndex((a) => a.id === id);
          if (arrowIndex !== -1) {
            arrowsRef.current.splice(arrowIndex, 1);
          }
        } else if (type === 'text') {
          const textIndex = textInputsRef.current.findIndex((ti) => ti.id === id);
          if (textIndex !== -1) {
            textInputsRef.current.splice(textIndex, 1);
          }
        }
        
        dispatch(saveHistory());
        dispatch(removeShape({ id, shapeType: type || sh.shapeType }));
        layerRef.current?.batchDraw();
        
        dispatch(setTool(null));
      }
    } else if (toolRef.current == 'colorFiller') {
      const shape = stageRef.current?.getIntersection(pos);
      const parent = shape?.getParent();
      const type = parent?.getAttr('shapeType') || shape?.getAttr('shapeType');
      const id = parent?.id() || shape?.id();

      // Find and update the actual shape instance
      const shapeInstance = shapesRef.current.find((s) => s.id === id);
      if (shapeInstance && shapeInstance.fillColor) {
        shapeInstance.fillColor(colorRef.current);
        layerRef.current?.batchDraw();
      }

      dispatch(saveHistory());
      dispatch(
        fillShapeColor({
          shapeType: type,
          shapeId: id,
          color: colorRef.current,
        }),
      );
      
      dispatch(setTool(null));
    } else if (toolRef.current == 'text') {
      // Check if clicking on existing text
      const shape = stageRef.current?.getIntersection(pos);
      const parent = shape?.getParent();
      const type = parent?.getAttr('shapeType') || shape?.getAttr('shapeType');
      const existingId = parent?.id() || shape?.id();

      if (type === 'text') {
        // Find and edit existing text
        const existingTextInput = textInputsRef.current.find((ti) => ti.id === existingId);
        if (existingTextInput) {
          existingTextInput.handleEditText();
        }
        return;
      }

      // Create a group for the text input
      const newTextId = getAutoId();
      const group = new Konva.Group({
        x: pos.x,
        y: pos.y,
        draggable: true,
        id: newTextId,
      });
      group.setAttr('shapeType', 'text');
      layerRef.current?.add(group);
      
      const textInput = new TextInput({
        group: group,
        layer: layerRef.current!,
        stage: stageRef.current!,
        id: newTextId,
        color: colorRef.current || 'black',
        toolRef: toolRef,
        autoEdit: true,
      });
      
      // Subscribe to update events to save text changes
      textInput.eventEmitter.on('update', () => {
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: textInput.getText() || 'text',
            shapeType: 'text',
            id: textInput.id,
            points: textInput.getPositionProportion(),
            text: textInput.getText(),
          }),
        );
      });
      
      // Subscribe to group dragstart to update position
      group.on('dragstart', () => {
        dispatch(saveHistory());
      });
      
      // Subscribe to group dragend to update position
      group.on('dragend', () => {
        dispatch(
          updateShape({
            color: colorRef.current || 'black',
            label: textInput.getText() || 'text',
            shapeType: 'text',
            id: textInput.id,
            points: textInput.getPositionProportion(),
            text: textInput.getText(),
          }),
        );
      });
      
      textInputsRef.current.push(textInput);
      shapesRef.current.push(textInput as unknown as Shape);
      
      dispatch(saveHistory());
      dispatch(
        addShape({
          id: newTextId,
          color: colorRef.current || 'black',
          label: 'text',
          shapeType: 'text',
          points: [[pos.x / stageRef.current!.width(), pos.y / stageRef.current!.height()]],
          text: 'Label',
        }),
      );
      
      layerRef.current?.batchDraw();
      
      // Auto turn off text tool after creating text
      setTimeout(() => {
        dispatch(setTool(null));
      }, 100);
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    
    const updateCanvasSize = () => {
      // Use full available width from parent
      const maxWidth = container.parentElement?.clientWidth || window.innerWidth;
      const maxHeight = container.parentElement?.clientHeight || window.innerHeight - 150;
      
      let width = maxWidth;
      let height = maxHeight;
      
      if (!!backgroundImage) {
        const ratio = backgroundImage.width / backgroundImage.height;
        
        // Always use full width, calculate height based on ratio
        width = maxWidth;
        height = maxWidth / ratio;
        
        // If calculated height exceeds max height, scale down
        if (height > maxHeight) {
          height = maxHeight;
          width = maxHeight * ratio;
        }
        
        dispatch(setSize({ width, height, ratio }));
        container.style.height = `${height}px`;
        container.style.width = `${width}px`;
        setCanvasHeight(height);
      } else {
        // Default size if no image - use full available space
        width = maxWidth;
        height = maxHeight;
        container.style.height = `${height}px`;
        container.style.width = `${width}px`;
        setCanvasHeight(height);
      }

      // Update stage size if it exists
      if (stageRef.current) {
        stageRef.current.width(width);
        stageRef.current.height(height);
        
        // Update background image size if it exists
        if (backgroundImage) {
          const imageNode = layerRef.current?.findOne('Image');
          if (imageNode) {
            imageNode.width(width);
            imageNode.height(height);
          }
        }
        
        layerRef.current?.batchDraw();
        return; // Don't recreate stage if just resizing
      }

      // Initial stage creation
      stageRef.current = new Konva.Stage({
        container: container,
        width: width,
        height: height,
      });
      const shapesLayer = new Konva.Layer();
      layerRef.current = shapesLayer;

      if (backgroundImage) {
        const image = new Konva.Image({
          image: backgroundImage,
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
        layerRef.current?.add(image);
      }

      stageRef.current.add(shapesLayer);

      stageRef.current.on('click', handleStageClick);
      
      // Add mousemove handler to change cursor
      stageRef.current.on('mousemove', (e) => {
        const stage = e.target.getStage();
        if (!stage) return;
        
        const container = stage.container();
        const pos = stage.getPointerPosition();
        if (!pos) return;
        
        const shape = stage.getIntersection(pos);
        const parent = shape?.getParent();
        const shapeId = parent?.id() || shape?.id();
        const shapeType = (parent as any)?.getAttr('shapeType') || (shape as any)?.getAttr('shapeType');
        
        // Show pointer cursor only when hovering over an actual shape (not labels, etc.)
        if (shapeId && shapeType && !shapeId.endsWith('-label')) {
          container.style.cursor = 'pointer';
        } 
        // Default cursor otherwise
        else {
          container.style.cursor = 'default';
        }
      });
      
      // Add click handler to select shapes
      shapesLayer.on('click', (e) => {
        const shape = e.target as any;
        const parent = shape.getParent();
        const shapeId = parent?.id() || shape.id();
        const shapeType = (parent as any)?.getAttr('shapeType') || (shape as any).getAttr('shapeType');
        
        // Don't select if it's a label
        if (shapeId && !shapeId.endsWith('-label') && shapeType) {
          setSelectedShapeId(`${shapeType}-${shapeId}`);
        }
      });

      if (!!initialShapes) addDefaultShapes(initialShapes, width, height);
    };
    
    // Initial size calculation
    updateCanvasSize();
    
    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });
    
    if (container.parentElement) {
      resizeObserver.observe(container.parentElement);
    }
    
    // Also listen to window resize as fallback
    window.addEventListener('resize', updateCanvasSize);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
      stageRef.current?.off('click');
      stageRef.current?.destroy();
      stageRef.current = null;
      layerRef.current = null;
      toolRef.current = null;
      polygonsRef.current = [];
      arrowsRef.current = [];
      textInputsRef.current = [];
      shapesRef.current = [];
      dispatch(reset());
    };
  }, [backgroundImage, containerRef.current, initialShapes]);

  const handleClearAll = () => {
    // Destroy all shapes
    shapesRef.current.forEach((shape) => {
      shape.destroy();
    });
    
    // Clear all ref arrays
    shapesRef.current = [];
    polygonsRef.current = [];
    arrowsRef.current = [];
    textInputsRef.current = [];
    
    // Reset Redux state
    dispatch(reset());
    
    // Redraw the layer
    layerRef.current?.batchDraw();
  };

  // Keyboard shortcuts for drawing tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC key to cancel tool selection
      if (e.key === 'Escape') {
        e.preventDefault();
        dispatch(setTool(null));
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        // Undo/Redo shortcuts
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          dispatch(undo());
          return;
        }
        if (e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          dispatch(redo());
          return;
        }
        if (e.key === 'y') {
          e.preventDefault();
          dispatch(redo());
          return;
        }
        
        // Tool shortcuts
        switch (e.key) {
          case '1':
            e.preventDefault();
            dispatch(setTool('polygon'));
            break;
          case '2':
            e.preventDefault();
            dispatch(setTool('rectangle'));
            break;
          case '3':
            e.preventDefault();
            dispatch(setTool('arrow'));
            break;
          case '4':
            e.preventDefault();
            dispatch(setTool('eraser'));
            break;
          case '5':
            e.preventDefault();
            dispatch(setTool('text'));
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>
        <Box sx={{ gap: 10 }}>
          <Box sx={{ mb: 2 }}>
            <ToolButtons onClearAll={handleClearAll} isDrawing={isDrawing} />
          </Box>

          <ShapeInfoSidebar
            selectedShapeId={selectedShapeId}
            setSelectedShapeId={setSelectedShapeId}
            canvasHeight={canvasHeight}
            shapesRef={shapesRef}
            polygonsRef={polygonsRef}
            arrowsRef={arrowsRef}
            textInputsRef={textInputsRef}
            layerRef={layerRef}
          />
        </Box>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            id="container"
            ref={containerRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
