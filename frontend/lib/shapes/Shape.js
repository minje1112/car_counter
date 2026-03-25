export class Shape {
  id = '';
  constructor(shapeType = '') {
    this.shapeType = shapeType;
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  fillColor(color) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
  setStrokeWidth(width) {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getAbsolutePosition() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  getPointsProportion() {}
}
