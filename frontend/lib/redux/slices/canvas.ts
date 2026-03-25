import { createSlice } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Define the initial state and reducer

type CanvasState = {
  selectedTool: string | null;
  selectedColor: string | null;
  shapes: {
    Polygon: any[];
    Line: any[];
    Rectangle: any[];
    Text: any[];
  };
  width: number;
  height: number;
  ratio: number;
  history: {
    past: any[];
    future: any[];
  };
};

const initialState: CanvasState = {
  selectedTool: null,
  selectedColor: null,
  width: 0,
  height: 0,
  ratio: 0,
  shapes: {
    Polygon: [],
    Line: [],
    Rectangle: [],
    Text: [],
  },
  history: {
    past: [],
    future: [],
  },
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    reset: (state) => {
      state.selectedTool = null;
      state.selectedColor = null;
      state.shapes.Polygon = [];
      state.shapes.Line = [];
      state.shapes.Rectangle = [];
      state.shapes.Text = [];
      state.width = 0;
      state.height = 0;
      state.ratio = 0;
      state.history.past = [];
      state.history.future = [];
    },
    setSize: (state, action) => {
      state.width = action.payload.width;
      state.height = action.payload.height;
      state.ratio = action.payload.ratio;
    },
    setTool: (state, action) => {
      state.selectedTool = action.payload;
    },
    setColor: (state, action) => {
      state.selectedColor = action.payload;
    },
    saveHistory: (state) => {
      // Save current state to history
      const currentState = JSON.parse(JSON.stringify(state.shapes));
      state.history.past.push(currentState);
      state.history.future = []; // Clear future when new action is made
      
      // Limit history to 50 states to prevent memory issues
      if (state.history.past.length > 50) {
        state.history.past.shift();
      }
    },
    undo: (state) => {
      if (state.history.past.length === 0) return;
      
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, state.history.past.length - 1);
      
      state.history.future.unshift(JSON.parse(JSON.stringify(state.shapes)));
      state.history.past = newPast;
      state.shapes = previous;
    },
    redo: (state) => {
      if (state.history.future.length === 0) return;
      
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      
      state.history.past.push(JSON.parse(JSON.stringify(state.shapes)));
      state.history.future = newFuture;
      state.shapes = next;
    },
    addShape: (state, action) => {
      const shape = action.payload;
      const shapeType = shape.shapeType;

      if (shapeType === 'polygon') {
        state.shapes.Polygon.push(shape);
      } else if (shapeType === 'arrow') {
        state.shapes.Line.push(shape);
      } else if (shapeType === 'rectangle') {
        state.shapes.Rectangle.push(shape);
      } else if (shapeType === 'text') {
        state.shapes.Text.push(shape);
      }
    },
    updateShape: (state, action) => {
      const { shapeType, id, points, strokeWidth, labelText, text } = action.payload;
      if (shapeType === 'polygon') {
        const polygon = state.shapes.Polygon.find(
          (polygon) => polygon.id === id,
        );
        if (polygon) {
          polygon.points = points;
          if (strokeWidth !== undefined) {
            polygon.strokeWidth = strokeWidth;
          }
          if (labelText !== undefined) {
            polygon.labelText = labelText;
          }
        }
      } else if (shapeType === 'arrow') {
        const arrow = state.shapes.Line.find((arrow) => arrow.id === id);
        if (arrow) {
          arrow.points = points;
          if (strokeWidth !== undefined) {
            arrow.strokeWidth = strokeWidth;
          }
          if (labelText !== undefined) {
            arrow.labelText = labelText;
          }
        }
      } else if (shapeType === 'rectangle') {
        const rectangle = state.shapes.Rectangle.find(
          (rectangle) => rectangle.id === id,
        );
        if (rectangle) {
          rectangle.points = points;
          if (strokeWidth !== undefined) {
            rectangle.strokeWidth = strokeWidth;
          }
          if (labelText !== undefined) {
            rectangle.labelText = labelText;
          }
        }
      } else if (shapeType === 'text') {
        const textShape = state.shapes.Text.find((textShape) => textShape.id === id);
        if (textShape) {
          textShape.points = points;
          if (text !== undefined) {
            textShape.text = text;
          }
        }
      }
    },
    fillShapeColor: (state, action) => {
      const { shapeType, shapeId, color } = action.payload;
      if (shapeType === 'polygon') {
        const polygon = state.shapes.Polygon.find(
          (polygon) => polygon.id === shapeId,
        );
        if (polygon) {
          polygon.color = color;
        }
      } else if (shapeType === 'arrow') {
        const arrow = state.shapes.Line.find((arrow) => arrow.id === shapeId);
        if (arrow) {
          arrow.color = color;
        }
      } else if (shapeType === 'rectangle') {
        const rectangle = state.shapes.Rectangle.find(
          (rectangle) => rectangle.id === shapeId,
        );
        if (rectangle) {
          rectangle.color = color;
        }
      } else if (shapeType === 'text') {
        const text = state.shapes.Text.find((text) => text.id === shapeId);
        if (text) {
          text.color = color;
        }
      }
    },
    removeShape: (state, action) => {
      const { shapeType, id } = action.payload;
      if (shapeType === 'polygon') {
        state.shapes.Polygon = state.shapes.Polygon.filter(
          (polygon) => polygon.id !== id,
        );
      } else if (shapeType === 'arrow') {
        state.shapes.Line = state.shapes.Line.filter(
          (arrow) => arrow.id !== id,
        );
      } else if (shapeType === 'rectangle') {
        state.shapes.Rectangle = state.shapes.Rectangle.filter(
          (rectangle) => rectangle.id !== id,
        );
      } else if (shapeType === 'text') {
        state.shapes.Text = state.shapes.Text.filter(
          (text) => text.id !== id,
        );
      }
    },
  },
});

export const {
  setTool,
  setColor,
  addShape,
  updateShape,
  removeShape,
  reset,
  fillShapeColor,
  setSize,
  saveHistory,
  undo,
  redo,
} = canvasSlice.actions;

export const selectTool = (state: RootState) => state.canvas.selectedTool;
export const selectColor = (state: RootState) => state.canvas.selectedColor;
export const selectShapes = (state: RootState) => state.canvas.shapes;
export const selectCanvasSize = (state: RootState) => ({
  width: state.canvas.width,
  height: state.canvas.height,
});
export const selectCanUndo = (state: RootState) => state.canvas.history.past.length > 0;
export const selectCanRedo = (state: RootState) => state.canvas.history.future.length > 0;

export default canvasSlice.reducer;
