const { Rectangle, Line, Path, Color } = require("scenegraph");
const { confirm } = require("./lib/dialogs.js");
const commands = require("commands");

// needed for exporting rendition
const application = require("application");
const fs = require("uxp").storage.localFileSystem;

// RECTANGLE
function rectangleHandlerFunction(selection) {
  // [3]
  const newElement = new Rectangle();
  // newElement.radiusY = 100;
  // newElement.radiusX = 120;
  newElement.width = 100;
  newElement.height = 200;
  newElement.fill = new Color("blue");

  // [4]
  selection.insertionParent.addChild(newElement);
  // [5]
  newElement.moveInParentCoordinates(40, 300);
}

// MAKING A PANEL
let panel;

function create() {
  // [1]
  const html = `
    <style>
        .break {
            flex-wrap: wrap;
        }
        label.row > span {
            color: grey;
            width: 20px;
            text-align: right;
            font-size: 9px;
        }
        label.row input {
            flex: 1 1 auto;
        }
        form {
            width: 90%;
            margin: -20px;
            padding: 0px;
        }
        .show {
            display: block;
        }
        .hide {
            display: none;
        }
    </style>
    
    <form method="dialog" id="main">
        <div class="row break">
            <label class="row">
                <span>↕︎</span>
                <input type="number" uxp-quiet="true" id="txtV" value="10" placeholder="Height" />
            </label>
            <label class="row">
                <span>↔︎</span>
                <input type="number" uxp-quiet="true" id="txtH" value="10" placeholder="Width" />
            </label>
        </div>
        <footer><button id="ok" type="submit" uxp-variant="cta">Apply</button></footer>
    </form>
    
    <p id="warning">This plugin requires you to select a rectangle in the document. Please select a rectangle.</p>
    `;

  function increaseRectangleSize() {
    // [2]
    const { editDocument } = require("application"); // [3]
    const height = Number(document.querySelector("#txtV").value); // [4]
    const width = Number(document.querySelector("#txtH").value); // [5]

    // [6]
    editDocument(
      { editLabel: "Increase rectangle size" },
      function (selection) {
        const selectedRectangle = selection.items[0]; // [7]
        selectedRectangle.width += width; // [8]
        selectedRectangle.height += height;
      }
    );
  }

  panel = document.createElement("div"); // [9]
  panel.innerHTML = html; // [10]
  panel.querySelector("form").addEventListener("submit", increaseRectangleSize); // [11]

  return panel; // [12]
}

function show(event) {
  // [1]
  if (!panel) event.node.appendChild(create()); // [2]
}

function update(selection) {
  // [1]
  const { Rectangle } = require("scenegraph"); // [2]

  const form = document.querySelector("form"); // [3]
  const warning = document.querySelector("#warning"); // [4]

  if (!selection || !(selection.items[0] instanceof Rectangle)) {
    // [5]
    form.className = "hide";
    warning.className = "show";
  } else {
    form.className = "show";
    warning.className = "hide";
  }
}

// HOW TO ASK USER FOR CONFIRMATION
async function showConfirm() {
  /* we'll display a dialog here */
  const feedback = await confirm(
    "Enable Smart Filters?", //[1]
    "Smart filters are nondestructive and will preserve your original images.", //[2]
    ["Cancel", "Enable"] /*[3]*/
  );

  switch (feedback.which) {
    case 0:
      /* User canceled */
      break;
    case 1:
      /* User clicked Enable */
      break;
  }
}

// HOW TO CREATE PATHS
function createPieChartCommand(selection) {
  createWedge(selection, 100, 0, 90, "red");
  createWedge(selection, 100, 90, 135, "blue");
  createWedge(selection, 100, 135, 225, "yellow");
  createWedge(selection, 100, 225, 360, "purple");
}

function pointOnCircle(radius, angle) {
  const radians = (angle * 2 * Math.PI) / 360;
  const xcoord = radius * Math.cos(radians);
  const ycoord = radius * Math.sin(radians);
  return xcoord + "," + ycoord;
}

function createWedge(selection, radius, startAngle, endAngle, color) {
  // [1]
  const startPt = pointOnCircle(radius, startAngle);
  const endPt = pointOnCircle(radius, endAngle);
  const pathData = `M0,0 L${startPt} A${radius},${radius},0,0,1,${endPt} L0,0`; // [2]
  const wedge = new Path(); // [3]
  wedge.pathData = pathData; // [4]
  wedge.fill = new Color(color); // [5]
  wedge.translation = { x: radius, y: radius }; // [6]
  selection.insertionParent.addChild(wedge); // [7]
}

// HOW TO DRAW LINES
function randomColor() {
  const hexValues = ["00", "33", "66", "99", "CC", "FF"];
  const color =
    "#" +
    Array.from(
      { length: 3 },
      (_) => hexValues[Math.floor(Math.random() * hexValues.length)]
    ).join("");
  return color;
}

const lineData = [
  { startX: 100, startY: 110, endX: 210, endY: 233 },
  { startX: 210, startY: 233, endX: 320, endY: 156 },
  { startX: 320, startY: 156, endX: 400, endY: 300 },
  { startX: 400, startY: 300, endX: 500, endY: 120 },
];

function createLinesCommand(selection) {
  // [1]

  let lines = []; // [2]

  lineData.forEach((data) => {
    // [3]
    const line = new Line(); // [4.i]

    line.setStartEnd(
      // [4.ii]
      data.startX,
      data.startY,
      data.endX,
      data.endY
    );

    line.strokeEnabled = true; // [4.iii]
    line.stroke = new Color(randomColor()); // [4.iv]
    line.strokeWidth = 3; // [4.v]

    lines.push(line); // [4.vi]

    selection.editContext.addChild(line); // [4.vii]
  });

  selection.items = lines; // [5]
  commands.group(); // [6]
}

// HOW TO EXPORT A RENDITION
async function exportRendition(selection) {
  if (selection.items.length === 0) {
    return console.log("No selection. Guide the user on what to do.");
  }

  const folder = await fs.getFolder();
  // Exit if user doesn't select a folder
  if (!folder) return console.log("User canceled folder picker.");
  const file = await folder.createFile("rendition.png", { overwrite: true });

  // Create options for rendering a PNG.
  // Other file formats have different required options.
  // See `application#createRenditions` docs for details.
  let renditionSettings = [
    {
      node: selection.items[0], // [1]
      outputFile: file, // [2]
      type: application.RenditionType.PNG, // [3]
      scale: 2, // [4]
    },
  ];

  try {
    // Create the rendition(s)
    const results = await application.createRenditions(renditionSettings);
    console.log("results", results);

    // Create and show a modal dialog displaying info about the results
    const dialog = createDialog(results[0].outputFile.nativePath);
    return dialog.showModal();
  } catch (err) {
    // Exit if there's an error rendering.
    return console.log(err);
  }
}

function createDialog(filepath) {
  // Add your HTML to the DOM
  document.body.innerHTML = `
    <style>
    form {
        width: 400px;
    }
    </style>
    <dialog id="dialog">
        <form method="dialog">
            <h1>Redition saved</h1>
            <p>Your rendition was saved at:</p>
            <input type="text" uxp-quiet="true" value="${filepath}" readonly />
            <footer>
            <button type="submit" uxp-variant="cta" id="ok-button">OK</button>
            </footer>
        </form>
    </dialog>
  `;

  // Remove the dialog from the DOM every time it closes.
  // Note that this isn't your only option for DOM cleanup.
  // You can also leave the dialog in the DOM and reuse it.
  // See the `ui-html` sample for an example.
  const dialog = document.querySelector("#dialog");
  dialog.addEventListener("close", e => dialog.remove());

  return dialog;
}

module.exports = {
  commands: {
    createRectangle: rectangleHandlerFunction,
    showConfirm,
    createPieChartCommand,
    createLinesCommand,
    exportRendition,
  },
  panels: {
    enlargeRectangle: {
      show,
      update,
    },
  },
};

// function showLayerNames() {
//     const app = window.require("photoshop").app;
//     const allLayers = app.activeDocument.layers;
//     const allLayerNames = allLayers.map(layer => layer.name);
//     const sortedNames = allLayerNames.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
//     document.getElementById("layers").innerHTML = `
//       <ul>${
//         sortedNames.map(name => `<li>${name}</li>`).join("")
//       }</ul>`;
// }

// document.getElementById("btnPopulate").addEventListener("click", showLayerNames);
