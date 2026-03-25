import Konva from 'konva';
import { EventEmitter } from 'events';
import { Shape } from './Shape';
import { calcPointsProportion } from '../utils/hooks';
import { TextInput } from './TextInput';

/**
 * Represents a polygon shape.
 * @class
 */
export class Polygon extends Shape {
  /**
   * An array of points that define the polygon.
   * @type {Array<[x: number, y: number]>}
   */
  points = [];

  /**
   * Indicates whether the polygon is currently being edited.
   * @type {boolean}
   */
  isEditing = false;

  /**
   * Creates a new Polygon instance.
   * @constructor
   * @param {Object} options - The options for the polygon.
   * @param {String} options.id - The id of the polygon.
   * @param {Konva.Stage} options.stage - The stage object.
   * @param {Object} options.layer - The layer object.
   * @param {Array<Object>} options.polygons - The polygons array.
   * @param {Array<[number, number]>} options.initialPoints - The initial points array.
   * @param {Object} options.toolRef - The toolRef object.
   * @param {String} [options.color] - The color of the polygon.
   */
  constructor({
    stage,
    layer,
    initialPoints,
    polygons,
    toolRef,
    id,
    color = 'black',
  }) {
    super('polygon');
    this.stage = stage;
    this.color = color;
    this.strokeWidth = 2; // Default border width
    this.layer = layer;
    this.id = id;
    this.points = initialPoints || [];
    this.saveButton = this.makeSaveBtn();
    this.eventEmitter = new EventEmitter();
    this.polygons = polygons;
    this.toolRef = toolRef;
    this.group = new Konva.Group({
      draggable: true,
      id: id,
    });

    this.group.setAttr('shapeType', 'polygon');

    // Helper function to convert color to rgba with opacity
    const getColorWithOpacity = (color, opacity = 0.3) => {
      // If color is already in rgba format, extract rgb and apply new opacity
      if (color.startsWith('rgba')) {
        const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
        if (rgbMatch) {
          const parts = rgbMatch[1].split(',').map(s => s.trim());
          if (parts.length >= 3) {
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
          }
        }
      }
      // If color is in hex format, convert to rgba
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      // For named colors, use a temporary element to get rgb values
      const tempEl = document.createElement('div');
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const computedColor = window.getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
      }
      
      // Fallback: return original color
      return color;
    };

    this.line = new Konva.Line({
      stroke: this.color,
      strokeWidth: this.strokeWidth,
      points: initialPoints.flat(),
      draggable: false,
      fill: getColorWithOpacity(this.color, 0.3),
      closed: true,
      visible: true,
      zIndex: 0,
    });

    this.initHandlers(initialPoints, true);

    this.group.on('click', this.handleEdit);
    this.group.on('dragend', () => {

      let boundingRect = this.group.getClientRect();

      let offset = this.group.getAbsolutePosition();
      this.updateLabelPosition();
      this.eventEmitter.emit('dragmove');
    });
    this.group.on('dragmove', () => {
      this.updateLabelPosition();
    });
    this.group.on('transform', () => {
      this.updateLabelPosition();
    });
    this.group.on('mouseover', this.handleMouseover);
    this.group.on('mouseout', this.handleMouseout);
    this.group.add(this.line);

    this.layer.add(this.group);
    this.layer.add(this.saveButton);

    // Add label with Konva.Label
    this.label = new Konva.Label({
      x: 0,
      y: 0,
    });

    this.label.add(
      new Konva.Tag({
        fill: 'rgba(0, 0, 0, 0.5)',
        cornerRadius: 4,
        stroke: 'white',
        strokeWidth: 1,
      })
    );

    this.labelText = new Konva.Text({
      text: `Polygon ${id}`,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: 'white',
      padding: 5,
    });

    this.label.add(this.labelText);
    this.group.add(this.label);

    // Make label editable on double-click
    this.label.on('dblclick', (e) => {
      e.evt.stopPropagation();
      this.editLabelText();
    });

    // Add cursor pointer on hover
    this.label.on('mouseenter', () => {
      if (!this.isEditing) {
        document.body.style.cursor = 'text';
      }
    });
    this.label.on('mouseleave', () => {
      if (!this.isEditing) {
        document.body.style.cursor = 'default';
      }
    });

    // Initial draw to render the polygon
    this.layer.batchDraw();
    
    // Position label at top-left of polygon
    this.updateLabelPosition();

    this.layer.batchDraw();

    this.layer.batchDraw();
  }
  handleMouseout = (e) => {
    document.body.style.cursor = 'default';

    if (this.isEditing) return;
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill(this.color);
    });
    this.line.stroke(this.color);
  };

  updateLabelPosition() {
    if (!this.label || !this.line) return;
    const box = this.line.getClientRect();
    this.label.position({
      x: box.x - this.group.x(),
      y: box.y - this.group.y() - 40,
    });
    this.layer.batchDraw();
  }

  editLabelText() {
    // Hide the label while editing
    this.label.visible(false);
    
    // Get the absolute position of the label
    const labelAbsPos = this.label.getAbsolutePosition();
    
    // Create a temporary HTML input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = this.labelText.text();
    input.style.position = 'absolute';
    input.style.left = `${labelAbsPos.x}px`;
    input.style.top = `${labelAbsPos.y}px`;
    input.style.fontSize = '14px';
    input.style.fontFamily = 'Arial';
    input.style.padding = '5px';
    input.style.zIndex = '1000';
    input.style.border = '2px solid #333';
    input.style.borderRadius = '4px';
    input.style.backgroundColor = 'white';
    
    document.body.appendChild(input);
    input.focus();
    input.select();
    
    let isFinished = false; // Flag to prevent multiple finishEdit calls
    
    const finishEdit = () => {
      // Check if already finished
      if (isFinished) {
        return;
      }
      isFinished = true;
      
      // Check if input is still in the document before removing
      if (document.body.contains(input)) {
        const newText = input.value || `Polygon ${this.id}`;
        this.labelText.text(newText);
        this.label.visible(true);
        
        // Remove event listeners before removing element
        input.removeEventListener('keydown', handleKeydown);
        input.removeEventListener('blur', finishEdit);
        
        document.body.removeChild(input);
        this.layer.batchDraw();
        // Emit update events to save the change
        this.eventEmitter.emit('dragmove');
        this.eventEmitter.emit('update');
      }
    };
    
    const handleKeydown = (e) => {
      if (e.key === 'Enter') {
        finishEdit();
      } else if (e.key === 'Escape') {
        isFinished = true;
        this.label.visible(true);
        if (document.body.contains(input)) {
          input.removeEventListener('keydown', handleKeydown);
          input.removeEventListener('blur', finishEdit);
          document.body.removeChild(input);
        }
        this.layer.batchDraw();
      }
    };
    
    input.addEventListener('keydown', handleKeydown);
    input.addEventListener('blur', finishEdit);
  }

  getLabelText() {
    return this.labelText ? this.labelText.text() : '';
  }

  setLabelText(text) {
    if (this.labelText) {
      this.labelText.text(text);
      this.layer.batchDraw();
    }
  }

  destroy() {
    if (this.label) {
      this.label.destroy();
    }
    this.group.destroy();
    this.saveButton.destroy();
    this.layer.batchDraw();
  }

  handleMouseover = (e) => {
    if(!this.saveButton.visible()){  
    document.body.style.cursor = 'move';
    }
    if (this.isEditing) return;
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill('#EDA325');
    });
    this.line.stroke('#EDA325');
  };
  
  getAbsolutePosition() {
    const handlerPositions = this.group
      .find('Circle')
      .map((c) => [
        c.getAbsolutePosition(this.stage).x,
        c.getAbsolutePosition(this.stage).y,
      ]);
    return handlerPositions;
  }

  fillColor(color) {
    this.color = color;
    this.line.stroke(color);
    
    // Helper function to convert color to rgba with opacity
    const getColorWithOpacity = (color, opacity = 0.3) => {
      if (color.startsWith('rgba')) {
        const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
        if (rgbMatch) {
          const parts = rgbMatch[1].split(',').map(s => s.trim());
          if (parts.length >= 3) {
            return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${opacity})`;
          }
        }
      }
      if (color.startsWith('#')) {
        const hex = color.slice(1);
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      const tempEl = document.createElement('div');
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const computedColor = window.getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (rgbMatch) {
        return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
      }
      
      return color;
    };
    
    // Update fill color with opacity
    this.line.fill(getColorWithOpacity(color, 0.3));
    
    this.group.find('Circle').forEach((c) => {
      c.fill(color);
    });
    this.draw();
  }

  setStrokeWidth(width) {
    this.strokeWidth = width;
    this.line.strokeWidth(width);
    this.draw();
  }

  /**
   * Adds a handle at the specified position.
   * @param pos @type {{x: number, y: number}}
   */
  addHandle(pos, isAbsolute = false) {
    const { x, y } = pos;
    const handler = new Konva.Circle({
        x: pos.x,
        y: pos.y,
        radius: 5,                                   
        fill: this.isEditing ? 'red' : this.color,   // Change colors
        // stroke: 'white',                              // Add white border
        // strokeWidth: 2,                               // Border thickness
        opacity: 0.5,                                 // Make semi-transparent
        draggable: this.isEditing,
    });
    const closeLbl = new Konva.Label({
      id: 'closeLbl',
      x: x + 8,
      y: y - 15,
      visible: this.isEditing,
    });
    if (isAbsolute) {
      handler.x(pos.x - this.group.x());
      handler.y(pos.y - this.group.y());
      closeLbl.x(pos.x + 8 - this.group.x());
      closeLbl.y(pos.y - 15 - this.group.y());
    }
    closeLbl.add(
      new Konva.Text({
        text: 'x',
        fontSize: 16,
        fill: this.color,
      })
    );
    closeLbl.on('click', (e) => {
      e.evt.stopPropagation();
      handler.destroy();
      closeLbl.destroy();
      this.eventEmitter.emit('dragmove');
      this.draw();
    });

    handler.on('dragmove', (e) => {
      const pos = e.target.position();
      closeLbl.x(pos.x + 8);
      closeLbl.y(pos.y - 15);
      this.draw();
      this.updateLabelPosition();
      this.eventEmitter.emit('dragmove');
    });
    handler.on('click', (e) => {
      e.evt.stopPropagation();
    });
    this.group.add(handler);
    this.group.add(closeLbl);
  }

  initHandlers(initialPoints) {
    for (const point of initialPoints) {
      this.addHandle({ x: point[0], y: point[1] }, true);
    }
  }

  draw() {
    this.line.points(this.getPoints().flat());
    this.line.setZIndex(0);
    // Update label position and keep it on top
    this.updateLabelPosition();
    if (this.label) {
      this.label.moveToTop();
    }
    this.layer.batchDraw();
  }

  handleEdit = (e) => {
    if (this.toolRef.current !== 'polygon' && this.toolRef.current !== null)
      return;
    e.evt.stopPropagation();
    if (this.isEditing) {
      return;
    }
    if (this.polygons.find((p) => p.isEditing) !== undefined) {
      return;
    }
    this.edit();
  };

  getPoints() {
    const handlerPositions = this.group
      .find('Circle')
      .map((c) => [c.position().x, c.position().y]);
    return handlerPositions;
  }

  /**
   * Enters the editing mode for the polygon.
   */
  edit() {
    this.isEditing = true;
    this.stage.off('click');

    // Add keyboard shortcut for save (Ctrl+S)
    this.handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.save();
      }
    };
    window.addEventListener('keydown', this.handleKeyDown);

    this.line.stroke('red');
    this.group.draggable(false);
    
    // Show and configure editing circles
    this.group.find('Circle').forEach((c) => {
      c.fill('red');
      c.draggable(true);
      c.visible(true);
    });
    
    this.group.find('#closeLbl').forEach((c) => {
      c.visible(true);
    });

    // Keep label visible and on top
    if (this.label) {
      this.label.visible(true);
      this.label.moveToTop();
    }

    setTimeout(() => {
      this.stage.on('click', (e) => this.handleAddHandler(e));
    }, 100);

    this.saveButton.visible(true);
    this.draw();
  }

  makeSaveBtn() {
    const saveButton = new Konva.Label({
      x: 10,
      y: 10,
      visible: false,
    });

    saveButton.add(
      new Konva.Tag({
        fill: 'white',
        lineJoin: 'round',
        shadowColor: 'black',
        shadowBlur: 10,
        shadowOffsetX: 10,
        shadowOffsetY: 10,
        shadowOpacity: 0.2,
      })
    );

    saveButton.add(
      new Konva.Text({
        text: 'Done',
        fontSize: 18,
        lineHeight: 1.2,
        padding: 5,
        fill: 'black',
      })
    );

    saveButton.on('click', (e) => {
      e.evt.stopPropagation();
      this.save();
    });
    return saveButton;
  }

  save() {
    this.isEditing = false;
    
    // Remove keyboard listener
    if (this.handleKeyDown) {
      window.removeEventListener('keydown', this.handleKeyDown);
      this.handleKeyDown = null;
    }
    
    this.line.stroke(this.color);
    
    // Hide editing circles
    this.group.find('Circle').forEach((c) => {
      c.fill(this.color);
      c.draggable(false);
      c.visible(false);
      c.listening(false);
    });
    
    this.group.find('#closeLbl').forEach((c) => {
      c.visible(false);
    });
    this.group.draggable(true);
    this.stage.off('click');
    this.saveButton.visible(false);
    
    // Keep label visible and on top
    if (this.label) {
      this.label.visible(true);
      this.label.moveToTop();
    }
    
    this.layer.batchDraw();
    
    this.eventEmitter.emit('save');
  }

  subscribeOnDragMove(callback) {
    this.eventEmitter.on('dragmove', callback);
  }

  getPointsProportion() {
    return calcPointsProportion(
      this.getAbsolutePosition(),
      this.stage.width(),
      this.stage.height()
    );
  }

  subscribeOnSave(callback) {
    this.eventEmitter.on('save', callback);
  }

  /**
   * Handles the click event to add a new point to the polygon.
   * @param {Object} e - The click event object.
   */
  handleAddHandler(e) {
    const pointerPos = e.target.getStage().getPointerPosition();
    let groupPos = this.group.getAbsolutePosition();
    let relativePos = {
      x: pointerPos.x - groupPos.x,
      y: pointerPos.y - groupPos.y,
    };
    this.addHandle(relativePos);
    this.eventEmitter.emit('dragmove');
    this.draw();
  }
}
