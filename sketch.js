const toolbarPopup = document.getElementById('toolbar-popup');
const toolbarToggle = document.getElementById('toolbar-toggle');

// Toggle toolbar visibility
toolbarToggle.addEventListener('click', () => {
  toolbarPopup.classList.toggle('hidden');
  
  // Optionally, change the button text/icon to indicate the state
  if (toolbarPopup.classList.contains('hidden')) {
    toolbarToggle.textContent = '≡'; // Show toolbar icon
  } else {
    toolbarToggle.textContent = '✖'; // Hide toolbar icon
  }
});

function getAvailableHeight() {
  const toolBar = document.querySelectorAll('.toolbar');
  let toolBarHeight = 0;

  toolBar.forEach(element => {
    toolBarHeight += element.offsetHeight;
  });

  return window.innerHeight - toolBarHeight;
}

const w = document.documentElement.clientWidth;
const h = document.documentElement.clientHeight;//getAvailableHeight();
console.log(h, w, window.innerHeight)

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
            cell.region = undefined;
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

// The regions we need to color are determined by the areas formed by the dashes.
// But how do we assign colors to different regions?
// One way is to create a mapping between region sizes (number of cells in same region)
// and colors. In this case for each cell we will store its region size in the
// "region" field. Later on we will map each of these sizes to a brightness value
// such that smaller regions will be colored lighter than larger regions. 
let maxRank;
function assignRegionSizes(cells) {
  const visited = new Set();
  
  const getSize = (x, y) => {
    // If the coordinates are outside the bounds of the matrix,
    // or if the cell has already been visited.
    if (x < 0 || y < 0 || 
        y >= numYCells || x >= numXCells ||
        visited.has(`${x} ${y}`)) {
      return 0;
    }
    
    let size = 0;
    const stack = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      if (visited.has(`${cx} ${cy}`)) continue;

      visited.add(`${cx} ${cy}`);
      size++;
      
      if (cy > 0 && !cells[cy][cx].u) {
        stack.push([cx, cy - 1]);
      }
      if (cy < numYCells - 1 && !cells[cy][cx].d) {
        stack.push([cx, cy + 1]);
      }
      if (cx > 0 && !cells[cy][cx].l) {
        stack.push([cx - 1, cy]);
      }
      if (cx < numXCells - 1 && !cells[cy][cx].r) {
        stack.push([cx + 1, cy]);
      }
    }

    return size;
  };

  const floodFill = (x, y, regionSize) => {
    if (x < 0 || y < 0 ||
        y >= numYCells || x >= numXCells ||
        cells[y][x].region !== undefined) {
      return 0;
    }

    const stack = [[x, y]];
    while (stack.length > 0) {
      const [cx, cy] = stack.pop();
      // If we've already colored the cell, skip it
      if (cells[cy][cx].region !== undefined) continue;
      
      cells[cy][cx].region = regionSize;
      
      if (cy > 0 && !cells[cy][cx].u) {
        stack.push([cx, cy - 1]);
      }
      if (cy < numYCells - 1 && !cells[cy][cx].d) {
        stack.push([cx, cy + 1]);
      }
      if (cx > 0 && !cells[cy][cx].l) {
        stack.push([cx - 1, cy]);
      }
      if (cx < numXCells - 1 && !cells[cy][cx].r) {
        stack.push([cx + 1, cy]);
      }
    }
  };
  // Let's keep track of all of the different region sizes
  // while we floodfill the grid.
  let uniqueRegionSizes = new Set();
  for (let i = 0; i < numYCells; i++) {
    for (let j = 0; j < numXCells; j++) {
      const regionSize = getSize(j, i);
      if (regionSize !== 0) {
        uniqueRegionSizes.add(regionSize);
      }
      floodFill(j, i, regionSize);
    }
  }
  // Let's now create a mapping from the region size of a cell's
  // region to the ranking of the region size out of all the sizes
  // we've seen. Smaller sizes correspond to lower ranks.
  let sortedSizes = Array.from(uniqueRegionSizes).sort((a, b) => a - b);
  let regionSizeToRank = new Map();
  for (let i = 0; i < sortedSizes.length; i++) {
    regionSizeToRank.set(sortedSizes[i], i + 1);
  } 
  // Finally let's overwrite the region size field for each cell 
  // and replace it with the rank of its region.
  for (let i = 0; i < numYCells; i++) {
    for (let j = 0; j < numXCells; j++) {
      cells[i][j].region = regionSizeToRank.get(cells[i][j].region); 
    }
  }
  maxRank = regionSizeToRank.size;
}

let horizontalSlider;
let horizontalProbDisplay; 
let verticalSlider;
let verticalProbDisplay;
let lineColorPicker;
let fillColorPicker;
let fillSaturationPicker;
// Starting values for probabilities
let alphax = 0.5;
let alphay = 0.5;


function setup() {
    createCanvas(w, h);
    colorMode(HSB, 255);
    noLoop();

    // Sliders that change randomness
    horizontalSlider = select("#horizontal-prob");
    horizontalSlider.input(onSliderMove);
    horizontalProbDisplay = select('#horizontal-prob-value');
    verticalSlider = select("#vertical-prob");
    verticalSlider.input(onSliderMove)
    verticalProbDisplay = select('#vertical-prob-value');

    let toggleSwitch = select('#themeToggle');
    toggleSwitch.changed(toggleMode);

    lineColorPicker = select('#line-color')
    lineColorPicker.changed(updateLColor);

    let refreshSwitch = select('#refresh');
    refreshSwitch.mousePressed(onRefresh);

    fillColorPicker = select('#hue')
    fillColorPicker.changed(updateFColor);

    fillSaturationPicker = select('#saturation');
    fillSaturationPicker.changed(updateFSaturation);

    addPatternInfo(cells, alphax, alphay);
    assignRegionSizes(cells);
    draw();
}

let fillCells = true;
let grayscale = false;
let lineColor = '#000000';
let fillHue = 220; // Default hue to start with
let fillSaturation = 255;

function draw() {
    for (let i = 0; i < numYCells; i++) {
        for (let j = 0; j < numXCells; j++) {
            const y = i * cellSize + 0.5;
            const x = j * cellSize + 0.5;
            if (fillCells) {
              let rank = cells[i][j].region;  
              let brightness = map(rank, 1, maxRank, 255, 100);
              fill(fillHue, fillSaturation, brightness);
              noStroke();
              rect(x, y, cellSize + 1, cellSize + 1);
             }
            console.log(lineColor);
            stroke(lineColor);
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
function onRefresh() {
  clearCells(cells);
  addPatternInfo(cells, alphax, alphay);
  assignRegionSizes(cells);
  clear();
  redraw();
}

function onSliderMove() {
    alphax = parseFloat(horizontalSlider.value());
    alphay = parseFloat(verticalSlider.value());
    horizontalProbDisplay.html(alphax.toFixed(2));
    verticalProbDisplay.html(alphay.toFixed(2));
    clearCells(cells);
    addPatternInfo(cells, alphax, alphay);
    assignRegionSizes(cells);
    clear();
    redraw();
}

function toggleMode() {
  fillCells = !fillCells;
  clear();
  redraw();
}

function updateLColor() {
  lineColor = lineColorPicker.value();
  clear();
  redraw();
}

function updateFColor() {
  //let chosenColor = parseFloat(fillColorPicker.value());
  //fillHue = hue(chosenColor);
  fillHue = parseFloat(fillColorPicker.value()); 
  clear();
  redraw();
}

function updateFSaturation() {
  fillSaturation = parseFloat(fillSaturationPicker.value());
  clear();
  redraw();
}