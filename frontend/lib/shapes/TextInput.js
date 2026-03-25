import Konva from 'konva';
import { EventEmitter } from 'events';

/**
 * Represents a text input.
 * @class
 * @constructor
 * @param {Object} options - The options for the text input.
 * @param {Konva.Group} options.group - The group object.
 * @param {Konva.Layer} options.layer - The layer object.
 * @param {Konva.Stage} options.stage - The stage object.
 * @param {String} [options.color] - The color of the text.
 * @param {Object} [options.toolRef] - Reference to the current tool.
 * @param {Boolean} [options.autoEdit] - Whether to automatically start editing when created.
 */
export class TextInput {
  constructor({ group, layer, stage, id, color = 'black', toolRef, autoEdit = false }) {
    this.group = group;
    this.layer = layer;
    this.stage = stage;
    this.id = id;
    this.shapeType = 'text';
    this.color = color;
    this.toolRef = toolRef;
    this.currentInput = null;
    this.eventEmitter = new EventEmitter();

    // Check if a label group already exists in this group
    const existingLabelGroup = this.group.findOne((node) => {
      return node.getClassName() === 'Group' && node.findOne('Text') && node.findOne('Rect');
    });
    
    if (existingLabelGroup) {
      this.labelGroup = existingLabelGroup;
      this.text = this.labelGroup.findOne('Text');
      this.background = this.labelGroup.findOne('Rect');
      this.setupEventHandlers();
      return;
    }

    // Check if a standalone text label exists (for backwards compatibility)
    const existingText = this.group.findOne('Text');
    if (existingText) {
      this.text = existingText;
      this.setupEventHandlers();
      return;
    }

    // Calculate position relative to the group's children
    // Get the bounding box of all children in the group
    const children = this.group.getChildren();
    let minX = Infinity;
    let minY = Infinity;

    children.forEach((child) => {
      const box = child.getClientRect({ relativeTo: this.group });
      if (box.x < minX) minX = box.x;
      if (box.y < minY) minY = box.y;
    });

    // If no children or invalid bounds, use default position
    if (!isFinite(minX)) minX = 0;
    if (!isFinite(minY)) minY = 0;


    // Create a label group with background box
    this.labelGroup = new Konva.Group({
      x: minX,
      y: minY - 30,
    });

    // Background box for the label
    this.background = new Konva.Rect({
      x: 0,
      y: 0,
      fill: 'rgba(0, 0, 0, 0.5)',
      cornerRadius: 4,
      stroke: 'white',
      strokeWidth: 1,
    });

    // Text element with static size
    this.text = new Konva.Text({
      text: 'Label',
      x: 6,
      y: 4,
      fontSize: 14,
      fontFamily: 'Arial',
      fill: 'white',
      padding: 2,
    });

    // Size the background to fit the text
    this.background.width(this.text.width() + 12);
    this.background.height(this.text.height() + 8);

    // Add elements to label group
    this.labelGroup.add(this.background);
    this.labelGroup.add(this.text);


    // Keep label size static when parent group scales
    this.group.on('transform', () => {
      const parentScale = this.group.scaleX();
      if (this.labelGroup && parentScale !== 0) {
        // Inverse scale to maintain original size
        this.labelGroup.scaleX(1 / parentScale);
        this.labelGroup.scaleY(1 / parentScale);
      }
    });

    this.setupEventHandlers();

    // Add the label group to the shape group
    this.group.add(this.labelGroup);

    // Auto-edit if requested
    if (autoEdit) {
      setTimeout(() => {
        this.handleEditText();
      }, 100);
    }
  }

  setupEventHandlers = () => {
    // Double-click to edit label text
    this.text.on('dblclick dbltap', (e) => {
      // Allow eraser to work
      if (this.toolRef && this.toolRef.current === 'eraser') {
        return;
      }
      e.evt.stopPropagation();
      e.cancelBubble = true;
      e.evt.stopImmediatePropagation();
      this.handleEditText();
    });

    // Single click behavior
    this.text.on('click', (e) => {
      // If eraser tool is selected, allow the event to propagate so eraser can delete
      if (this.toolRef && this.toolRef.current === 'eraser') {
        // Don't stop propagation - let eraser handle it
        return;
      }
      
      // If text tool is selected, edit on single click
      if (this.toolRef && this.toolRef.current === 'text') {
        e.evt.stopPropagation();
        e.cancelBubble = true;
        e.evt.stopImmediatePropagation();
        this.handleEditText();
      } else {
        // Otherwise, stop propagation but don't edit
        e.evt.stopPropagation();
        e.cancelBubble = true;
        e.evt.stopImmediatePropagation();
      }
    });
  }
  
  handleEditText = () => {
    // If already editing, don't create another input
    if (this.currentInput && document.body.contains(this.currentInput)) {
      return;
    }

    const textNode = this.text;

    var textPosition = textNode.getAbsolutePosition();

    // then lets find position of stage container on the page:
    var stageBox = this.stage.container().getBoundingClientRect();

    // so position of textarea will be the sum of positions above:
    var areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    // create input and style it
    var input = document.createElement('input');
    input.value = textNode.text();
    input.style.position = 'absolute';
    input.style.top = areaPosition.y + 'px';
    input.style.left = areaPosition.x + 'px';
    input.style.width = Math.max(textNode.width() + 4, 100) + 'px';
    input.style.fontSize = textNode.fontSize() + 'px';
    input.style.fontFamily = textNode.fontFamily();
    input.style.border = '2px solid #3498db';
    input.style.borderRadius = '5px';
    input.style.padding = '2px';
    input.style.margin = '0px';
    input.style.backgroundColor = 'gray';
    input.style.outline = 'none';
    
    input.style.color = this.color;
    
    document.body.appendChild(input);
    this.currentInput = input;
    input.focus();
    input.select();

    const finishEditing = (save = true) => {
      if (save && input.value.trim() !== '') {
        textNode.text(input.value);
        // Update background box size to fit new text
        if (this.background) {
          this.background.width(this.text.width() + 12);
          this.background.height(this.text.height() + 8);
        }
        // Emit update event to trigger save
        this.eventEmitter.emit('update');
      }
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      this.currentInput = null;
      this.layer.batchDraw();
    };

    input.addEventListener('keydown', (e) => {
      // hide on enter
      if (e.keyCode === 13) {
        e.preventDefault();
        finishEditing(true);
      }
      // cancel on escape
      if (e.keyCode === 27) {
        e.preventDefault();
        finishEditing(false);
      }
    });

    // Finish editing when input loses focus
    input.addEventListener('blur', () => {
      setTimeout(() => {
        finishEditing(true);
      }, 200);
    });
  };

  setColor(color) {
    this.color = color;
    if (this.background) {
      this.background.stroke(color);
    }
    if (this.text) {
      this.text.fill('white'); // Keep text white for visibility
      this.layer.batchDraw();
    }
  }

  setText(newText) {
    if (this.text) {
      this.text.text(newText);
      // Update background box size to fit new text
      if (this.background) {
        this.background.width(this.text.width() + 12);
        this.background.height(this.text.height() + 8);
      }
      this.layer.batchDraw();
    }
  }

  getText() {
    return this.text ? this.text.text() : '';
  }

  getPosition() {
    if (this.group) {
      const pos = this.group.getAbsolutePosition();
      return [pos.x, pos.y];
    }
    return [0, 0];
  }

  getPositionProportion() {
    const [x, y] = this.getPosition();
    return [[x / this.stage.width(), y / this.stage.height()]];
  }

  show() {
    if (this.labelGroup) {
      this.labelGroup.show();
    } else if (this.text) {
      this.text.show();
    }
    this.layer.batchDraw();
  }

  hide() {
    if (this.labelGroup) {
      this.labelGroup.hide();
    } else if (this.text) {
      this.text.hide();
    }
    this.layer.batchDraw();
  }

  destroy() {
    if (this.group) {
      this.group.destroy();
    }
    if (this.labelGroup) {
      this.labelGroup.destroy();
    } else if (this.text) {
      this.text.destroy();
    }
  }
}
