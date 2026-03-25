export const calcPointsInPixels = (
  points: [x: number, y: number][],
  width: number,
  height: number,
): [number, number][] => {
  // calculate in pixels
  const newPoints = points.map((point) => {
    return [point[0] * width, point[1] * height] as [number, number];
  });
  return newPoints;
};

export const calcPointsProportion = (
  points: [x: number, y: number][],
  width: number,
  height: number,
) => {
  //calculate in 6 digit precision
  const newPoints = points.map((point) => {
    return [point[0] / width, point[1] / height];
  });
  return newPoints;
};
