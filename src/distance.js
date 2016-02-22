export default function distance (pointA, pointB) {
  const distanceVector = {
    x: Math.abs(pointA.x - pointB.x),
    y: Math.abs(pointA.y - pointB.y)
  };

  return Math.sqrt(
    Math.pow(distanceVector.x, 2) +
    Math.pow(distanceVector.y, 2)
  );
}
