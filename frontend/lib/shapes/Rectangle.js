import Konva from 'konva';
import { Shape } from './Shape';
import { calcPointsProportion } from '../utils/hooks';
import EventEmitter from 'events';
import { TextInput } from './TextInput';

/**
 * Creates a new Rectangle instance.
 * @constructor
 * @param {Object} options - The options for the rectangle.
 * @param {String} options.id - The id of the rectangle.
 * @param {Konva.Stage} options.stage - The stage object.
 * @param {Object} options.layer - The layer object.
 * @param {Array<[number, number]>} options.initialPoints - The initial points array.
 * @param {String} [options.color] - The color of the rectangle.
 */
export class Rectangle extends Shape {
  constructor({ layer, stage, id, color = 'black', initialPoints }) {
    super('rectangle');
    this.id = id;
    this.eventEmitter = new EventEmitter();
    this.layer = layer;
    this.stage = stage;
    this.color = color;
    this.strokeWidth = 2; // Default border width
    const x = initialPoints[0][0];
    const y = initialPoints[0][1];
    const width = initialPoints[1][0] - initialPoints[0][0];
    const height = initialPoints[2][1] - initialPoints[0][1];

    // Create a group to hold rectangle and label
    this.group = new Konva.Group({
      draggable: true,
      id: id,
    });
    this.group.setAttr('shapeType', 'rectangle');
    
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
    this.rect = new Konva.Rect({
      x,
      y,
      width,
      height,
      name: 'rect',
      stroke: color,
      strokeWidth: this.strokeWidth,
      fill: getColorWithOpacity(color),
      draggable: false,
    });
    this.group.add(this.rect);

    this.layer.add(this.group);

    // Stylish transformer with custom appearance
    this.tr = new Konva.Transformer({
      anchorSize: 4,
      anchorFill: '#4c60af',
      anchorStroke: '#ffffff',
      anchorStrokeWidth: 2,
      anchorCornerRadius: 3,
      borderStroke: '#4c53af',
      borderStrokeWidth: 2,
      borderDash: [4, 4],
      rotateAnchorOffset: 30,
      enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center'],
    });


    this.layer.add(this.tr);
    this.tr.nodes([this.group]);

    this.label = new TextInput({
      group: this.group,
      layer: this.layer,
      stage: this.stage,
      id: id + '-label',
    });
    
    this.label.eventEmitter.on('update', () => {
      this.eventEmitter.emit('update');
    });
    setTimeout(() => {
      if (this.label && this.label.setText) {
        const current = this.label.getText ? this.label.getText() : '';
        if (!current || current === 'Label') {
          this.label.setText(`Rectangle ${id}`);
        }
      }
      if (this.label && this.label.labelGroup) {
        this.label.labelGroup.visible(true);
        this.label.labelGroup.moveToTop();
      }
      this.layer.batchDraw();
    }, 100);

    // Keep label size constant during transform - use real-time update
    const updateLabelScale = () => {
      if (this.label && this.label.labelGroup) {
        const scaleX = this.group.scaleX();
        const scaleY = this.group.scaleY();
        this.label.labelGroup.scaleX(1 / scaleX);
        this.label.labelGroup.scaleY(1 / scaleY);
      }
    };

    this.tr.on('transform', () => {
      updateLabelScale();
    });

    this.tr.on('transformend', () => {
      updateLabelScale();
      this.eventEmitter.emit('update');
      this.layer.batchDraw();
    });

    this.group.on('dragend', () => {
      this.eventEmitter.emit('update');
    });
    this.group.on('mouseover', this.handleMouseover);
    this.group.on('mouseout', this.handleMouseout);

    this.layer.batchDraw();
  }
   handleMouseout = (e) => {
    document.body.style.cursor = 'default';
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill(this.color);
    });
    this.rect.stroke(this.color);
  };

  handleMouseover = (e) => {
    document.body.style.cursor = 'move';
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill('#EDA325');
    });
    this.rect.stroke('#EDA325');
  };
  destroy() {
    if (this.label) {
      this.label.destroy();
    }
    this.group.destroy();
    this.tr.destroy();
  }

  fillColor(color) {
    this.color = color;
    this.rect.stroke(color);
    
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
    this.rect.fill(getColorWithOpacity(color, 0.3));
    
    this.layer.draw();
  }

  setStrokeWidth(width) {
    this.strokeWidth = width;
    this.rect.strokeWidth(width);
    this.layer.draw();
  }

  getAbsolutePosition() {
    const groupPos = this.group.position();
    const points = [
      [this.rect.x() + groupPos.x, this.rect.y() + groupPos.y],
      [
        this.rect.x() + this.rect.width() + groupPos.x,
        this.rect.y() + groupPos.y,
      ],
      [
        this.rect.x() + this.rect.width() + groupPos.x,
        this.rect.y() + this.rect.height() + groupPos.y,
      ],
      [
        this.rect.x() + groupPos.x,
        this.rect.y() + this.rect.height() + groupPos.y,
      ],
    ];
    return points;
  }

  getPointsProportion() {
    return calcPointsProportion(
      this.getAbsolutePosition(),
      this.stage.width(),
      this.stage.height()
    );
  }

  getLabelText() {
    return this.label ? this.label.getText() : '';
  }

  setLabelText(text) {
    if (this.label && this.label.setText) {
      this.label.setText(text);
      this.layer.batchDraw();
    }
  }
}
