import Konva from 'konva';
import { Shape } from './Shape';
import { calcPointsProportion } from '../utils/hooks';
import EventEmitter from 'events';
import { TextInput } from './TextInput';

export class Arrow extends Shape {
  constructor({
    stage,
    layer,
    initialPoints,
    arrows,
    toolRef,
    id,
    color = 'black',
    labelText,
  }) {
    super('arrow');
    this.arrows = arrows;
    this.toolRef = toolRef;
    this.stage = stage;
    this.eventEmitter = new EventEmitter();
    this.layer = layer;
    this.color = color;
    this.strokeWidth = 3; // Default border width
    this.initialPoints = initialPoints;
    this.labelText = labelText; // Store labelText
    this.group = new Konva.Group({
      draggable: true,
      id: id,
    });
    this.group.setAttr('shapeType', 'arrow');
    this.id = id;
    this.group.setZIndex(10);
    this.group.on('dragend', () => {
      this.eventEmitter.emit('update');
    });
    this.group.on('dragmove', () => {
      // Trigger dragmove for label repositioning
      // this.group.fire('dragmove');
    });
    this.group.on('mouseover', this.handleMouseover);
    this.group.on('mouseout', this.handleMouseout);

    this.arrow = new Konva.Arrow({
      points: initialPoints.flat(),
      stroke: this.color,
      strokeWidth: this.strokeWidth,
      draggable: false,
      fill: this.color,
      visible: true,
    });
    this.addHandle(initialPoints[0]);
    this.addHandle(initialPoints[1]);
    this.group.add(this.arrow);

    this.layer.add(this.group);

    // Add label after all shape elements are added with default tag
    this.label = new TextInput({
      group: this.group,
      layer: this.layer,
      stage: this.stage,
      id: id + '-label',
      toolRef: toolRef,
    });
    // Forward label updates to this arrow's eventEmitter
    if (this.label && this.label.eventEmitter) {
      this.label.eventEmitter.on('update', () => {
        this.eventEmitter.emit('update');
      });
    }
    
    // Set default text to identify this arrow using setText method
    setTimeout(() => {
      if (this.label && this.label.setText) {
        // Use labelText if provided, otherwise use default Arrow id
        const textToSet = this.labelText || `Arrow ${id}`;
        this.label.setText(textToSet);
      }
      // Ensure label is visible
      if (this.label && this.label.labelGroup) {
        this.label.labelGroup.visible(true);
        this.label.labelGroup.moveToTop();
      }
      this.layer.batchDraw();
    }, 100);

    this.layer.batchDraw();
  }

  getLabelText() {
    return this.label && this.label.getText ? this.label.getText() : '';
  }

  setLabelText(text) {
    if (this.label && this.label.setText) {
      this.label.setText(text);
      this.layer.batchDraw();
    }
  }

  fillColor(color) {
    this.color = color;
    this.arrow.stroke(color);
    this.group.find('Circle').forEach((c) => {
      c.fill(color);
    });
    this.layer.batchDraw();
  }

  setStrokeWidth(width) {
    this.strokeWidth = width;
    this.arrow.strokeWidth(width);
    // this .draw();
    this.layer.batchDraw();
  }

  destroy() {
    if (this.label) {
      this.label.destroy();
    }
    this.group.destroy();
    this.group.remove();
    this.layer.batchDraw();
  }

  getPointsProportion() {
    return calcPointsProportion(
      this.getAbsolutePosition(),
      this.stage.width(),
      this.stage.height()
    );
  }

  handleMouseout = (e) => {
    document.body.style.cursor = 'default';
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill(this.color);
    });
    this.arrow.stroke(this.color);
  };

  handleMouseover = (e) => {
    document.body.style.cursor = 'move';
    if (!this.group) return;
    e.evt.stopPropagation();
    this.group.find('Circle').forEach((c) => {
      c.fill('#EDA325');
    });
    this.arrow.stroke('#EDA325');
  };

  addHandle(pos) {
    const handler = new Konva.Circle({
      x: pos[0],
      y: pos[1],
      opacity: 0.5,
      radius: 5,
      fill: this.color,
      draggable: true,
    });
    handler.on('dragmove', () => {
      this.draw();
      this.eventEmitter.emit('update');
      // Trigger transform for label updates when handles move
      this.group.fire('transform');
    });
    handler.on('click', (e) => {
      e.evt.stopPropagation();
    });
    this.group.add(handler);
  }

  draw() {
    this.arrow.points(this.getPoints().flat());
    this.arrow.setZIndex(-10);
    this.layer.batchDraw();
  }

  getPoints() {
    const handlerPositions = this.group
      .find('Circle')
      .map((c) => [c.position().x, c.position().y]);
    return handlerPositions;
  }

  getAbsolutePosition() {
    const handlerPositions = this.group
      .find('Circle')
      .map((c) => [
        c.getAbsolutePosition(this.stage).x,
        c.getAbsolutePosition(this.stage).y,
      ]);
    return handlerPositions;
  }

  edit() {
    this.isEditing = true;
    this.stage.off('click');

    this.drawHandlers();

    this.line.stroke('red');

    setTimeout(() => {
      this.stage.on('click', (e) => this.handleAddHandler(e));
    }, 100);

    this.layer.draw();
    this.saveButton.visible(true);
  }
}
