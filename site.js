class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Circle {
    constructor(center, radius) {
        this.center = center;
        this.radius = radius;
    }
}

let points = [];
let statistics = [];
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    points.push(new Point(x, y));
    drawSinglePoint(new Point(x, y));
});

function drawSinglePoint(point) {
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
    ctx.fill();
}

function generatePoints(numberOfPoints) {
    points = [];
    for (let i = 0; i < numberOfPoints; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        points.push(new Point(x, y));
    }
}

function drawPoints() {
    ctx.fillStyle = 'black';
    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
        ctx.fill();
    }
}

function findCentroid(points) {
    let sumX = 0, sumY = 0;
    for (const point of points) {
        sumX += point.x;
        sumY += point.y;
    }
    return new Point(sumX / points.length, sumY / points.length);
}

function formStarShape(points, n, m) {
    if (points.length < n) return [];

    const center = findCentroid(points);
    
    points.sort((a, b) => {
        const distA = Math.hypot(a.x - center.x, a.y - center.y);
        const distB = Math.hypot(b.x - center.x, b.y - center.y);
        return distA - distB;
    });

    const selectedPoints = points.slice(0, n);

    selectedPoints.sort((a, b) => {
        const angleA = Math.atan2(a.y - center.y, a.x - center.x);
        const angleB = Math.atan2(b.y - center.y, b.x - center.x);
        return angleA - angleB;
    });

    const starShape = [];
    for (let i = 0; i < n; i++) {
        const index = (i * m) % n;
        starShape.push(selectedPoints[index]);
    }

    const orderedStarShape = [];
    const visited = new Array(n).fill(false);
    let currentIndex = 0;
    for (let i = 0; i < n; i++) {
        if (!visited[currentIndex]) {
            orderedStarShape.push(starShape[currentIndex]);
            visited[currentIndex] = true;
            currentIndex = (currentIndex + m) % n;
        }
    }

    return orderedStarShape;
}

function drawStarShape(starShape) {
    if (starShape.length < 3) return;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(starShape[0].x, starShape[0].y);
    
    for (let i = 1; i < starShape.length; i++) {
        ctx.lineTo(starShape[i].x, starShape[i].y);
    }
    ctx.closePath();
    ctx.stroke();
}

function generateVoronoiDiagram(points) {
    const delaunay = d3.Delaunay.from(points.map(p => [p.x, p.y]));
    const voronoi = delaunay.voronoi([0, 0, canvas.width, canvas.height]);
    return { delaunay, voronoi };
}

function drawVoronoiDiagram(voronoi) {
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < voronoi.delaunay.points.length; i += 2) {
        const cell = voronoi.cellPolygon(i / 2);
        if (cell) {
            ctx.beginPath();
            ctx.moveTo(cell[0][0], cell[0][1]);
            for (let j = 1; j < cell.length; j++) {
                ctx.lineTo(cell[j][0], cell[j][1]);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }
}

function findInscribedCircle(starShape) {
    if (starShape.length < 3) return null;

    const { delaunay, voronoi } = generateVoronoiDiagram(starShape);

    let maxCircle = null;
    let maxRadius = -Infinity;

    const circumcenters = voronoi.circumcenters;

    for (let i = 0; i < circumcenters.length; i += 2) {
        const vertex = new Point(circumcenters[i], circumcenters[i + 1]);
        
        if (isPointInPolygon(vertex, starShape)) {
            const radius = distanceToPolygonBoundary(vertex, starShape);
            if (radius > maxRadius) {
                maxRadius = radius;
                maxCircle = new Circle(vertex, radius);
            }
        }
    }

    return maxCircle;
}

function getBounds(points) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }
    
    return { minX, maxX, minY, maxY };
}

function isPointInPolygon(point, polygon) {
    let inside = false;
    const x = point.x, y = point.y;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    
    return inside;
}

function distanceToPolygonBoundary(point, polygon) {
    let minDistance = Infinity;
    
    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const distance = distanceToLineSegment(point, p1, p2);
        minDistance = Math.min(minDistance, distance);
    }
    
    return minDistance;
}

function distanceToLineSegment(point, lineStart, lineEnd) {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) {
        return Math.hypot(A, B);
    }
    
    let param = dot / lenSq;
    
    if (param < 0) {
        return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
    } else if (param > 1) {
        return Math.hypot(point.x - lineEnd.x, point.y - lineEnd.y);
    } else {
        const projX = lineStart.x + param * C;
        const projY = lineStart.y + param * D;
        return Math.hypot(point.x - projX, point.y - projY);
    }
}

function drawCircle(circle) {
    if (!circle) {
        document.getElementById('radiusDisplay').textContent = 
            'Радіус найбільшого вписаного кола: не знайдено';
        document.getElementById('timeDisplay').textContent = 
            'Час: не знайдено';
        return 0;
    }

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, 2 * Math.PI);
    ctx.stroke();
    
    document.getElementById('radiusDisplay').textContent = 
        `Радіус найбільшого вписаного кола: ${circle.radius.toFixed(2)}`;
    
    return circle.radius;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points = [];
    document.getElementById('radiusDisplay').textContent = 
        'Радіус найбільшого вписаного кола: не обчислено';
    document.getElementById('timeDisplay').textContent = 
        'Час: не знайдено';
}

function generateAndDraw() {
    const startTime = performance.now();
    
    const n = parseInt(document.getElementById('nField').value) || 8;
    const m = parseInt(document.getElementById('mField').value) || 3;
    const numPoints = parseInt(document.getElementById('pointsField').value);
    
    if (!numPoints && points.length === 0) {
        alert('Будь ласка, додайте точки вручну або введіть кількість точок для генерації');
        return;
    }
    
    if (numPoints) {
        generatePoints(numPoints);
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPoints();
    
    const starShape = formStarShape([...points], n, m);
    
    if (starShape.length < 3) {
        alert('Недостатньо точок для створення многокутника');
        return;
    }
    
    drawStarShape(starShape);
    
    const { voronoi } = generateVoronoiDiagram(starShape);
    drawVoronoiDiagram(voronoi);
    
    const maxCircle = findInscribedCircle(starShape);
    const maxRadius = drawCircle(maxCircle);
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    statistics.push({
        vertices: n,
        time: executionTime,
        radius: maxRadius
    });
    
    console.log(`Час виконання: ${executionTime.toFixed(2)} мс, Радіус: ${maxRadius.toFixed(2)}`);
    document.getElementById('timeDisplay').textContent = 
        `Час виконання: ${executionTime.toFixed(2)} мс`;
}

clearCanvas();
