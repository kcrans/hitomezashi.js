const w = document.documentElement.clientWidth;
const h = document.documentElement.clientHeight;

function randBinary(alpha) {
    // Returns 0 with probability alpha
    // and 1 with probability 1 - alpha
    x = Math.random();
    if (x < alpha) {
        return 0;
    }
    else {
        return 1;
    }
}

/*
The canvas will be divided into a matrix of cells.
The sides of a given cell will be drawn depending
on the Hitomezashi pattern that intersects each side.
I.e.:
[ ] [ ] [ ]
[ ] [ ] [ ]
[ ] [ ] [ ]
[ ] [ ] [ ]
There are 4 rows and three columns. This means there
will be 3 horizontal Hitomezashi patterns and 2
vertical Hitomezashi patterns between the cell.
*/

const cellSize = 10; // Height & width of a cell in pixels
const numYCells = ~~(h / cellSize) + 1;
const numXCells = ~~(w / cellSize) + 1;

function createCell() {
    return {u: false, d: false, l: false, r: false,}
}
const cells = Array.from({length:numYCells}, () => 
                         Array.from({length:numXCells},
                                    createCell));
function clearCells(cells) {
    for (let i = 0; i < numYCells; i++) {
        for (let j = 0; j < numXCells; j++) {
            let cell = cells[i][j];
            cell.u = false;
            cell.d = false;
            cell.l = false;
            cell.r = false;
            cell.color = undefined;
    }
  }
}
// Generate the Hitomezashi pattern and then for each
// dash in a line of dashes, mark the bordering c
function addPatternInfo(cells, alphax, alphay) {
    for (let i = 0; i < numYCells; i++) {
        // If offset == 0: dash pattern starts at first index
        // If offset == 1: dash pattern starts at second index
        const offset = randBinary(alphax);

        for (let j = offset; j < numXCells; j += 2) {
            cells[i][j].d = true;
            if (i < numYCells - 1) {
                cells[i+1][j].u = true;
            }
        }
    }
    
    for (let j = 0; j < numXCells; j++) { 
        const offset = randBinary(alphay);
        
        for (let i = offset; i < numYCells; i += 2) {
            cells[i][j].r = true;
            if (j < numXCells - 1) {
                cells[i][j+1].l = true;
            }
        } 
    }
}


function colorCells(cells) {
    const colored = new Set();
    const getSize = (x, y) => {
    if (x < 0 || y < 0 || 
        y >= numYCells || x >= numXCells ||
        colored.has(`${x} ${y}`)) {
      return 0;
    }
    
    let size = 0;
    colored.add(`${x} ${y}`);

    if (!cells[y][x].u) {
      size = max(size, getSize(x, y - 1));
    }
    if (!cells[y][x].d) {
      size = max(size, getSize(x, y + 1));
    }
    if (!cells[y][x].l) {
      size = max(size, getSize(x - 1, y));
    }
    if (!cells[y][x].r) {
      size = max(size, getSize(x + 1, y));
    }

    return size + 1;
  };

  const floodFill = (x, y, color) => {
    if (x < 0 || y < 0 ||
        y >= numYCells || x >= numXCells ||
        cells[y][x].color !== undefined) {
      return 0;
    }

    cells[y][x].color = color;

    if (!cells[y][x].u) {
      floodFill(x, y - 1, color);
    }
    if (!cells[y][x].d) {
      floodFill(x, y + 1, color);
    }
    if (!cells[y][x].l) {
      floodFill(x - 1, y, color);
    }
    if (!cells[y][x].r) {
      floodFill(x + 1, y, color);
    }
  };

  for (let i = 0; i < numYCells; i++) {
    for (let j = 0; j < numXCells; j++) {
      const color = 180 - getSize(j, i);
      floodFill(j, i, color);
    }
  }
}

function setup() {
    createCanvas(w, h);
    noLoop();

    // Starting values for probabilities
    let alphax = 0.5;
    let alphay = 0.5;
    horizontalSlider = createSlider(0, 1, alphax, 0.05);
    horizontalSlider.position(10, 10);
    horizontalSlider.size(80);
    horizontalSlider.input(onSliderMove)
    verticalSlider = createSlider(0, 1, alphay, 0.05)
    verticalSlider.position(10-40, 10+40);
    verticalSlider.size(80);
    verticalSlider.style('transform', 'rotate(270deg)');
    verticalSlider.input(onSliderMove)

    let toggleSwitch = select('#themeToggle');
    toggleSwitch.changed(toggleMode);

    addPatternInfo(cells, alphax, alphay);
    colorCells(cells);
}

let addColor = true;

function draw() {
    for (let i = 0; i < numYCells; i++) {
        for (let j = 0; j < numXCells; j++) {
            const y = i * cellSize + 0.5;
            const x = j * cellSize + 0.5;
            if (addColor) {
                fill(cells[i][j].color);
                noStroke();
                rect(x, y, cellSize + 1, cellSize + 1);
                stroke(0);
            }
            if (cells[i][j].u) {
                line(x, y, x + cellSize, y);
            }
            if (cells[i][j].d) {
                line(x, y + cellSize, x + cellSize, y + cellSize);
            }
            if (cells[i][j].l) {
                line(x, y, x, y + cellSize);
            }
            if (cells[i][j].r) {
                line(x + cellSize, y, x + cellSize, y + cellSize);
            }
        }
    }
}
function onSliderMove() {
    alphax = horizontalSlider.value();
    alphay = verticalSlider.value()
    clearCells(cells);
    addPatternInfo(cells, alphax, alphay);
    colorCells(cells);
    clear();
    redraw();
}

function toggleMode() {
    addColor = !addColor;
    clear();
    redraw();
}
