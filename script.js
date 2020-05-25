const rowNumbers = document.getElementById("rowNumbers");
const rowNumbersContainer = document.getElementById("rowNumbersContainer");
const topContainer = document.getElementById("top");
const program = document.getElementById("program");
const output = document.getElementById("output");
const outputContainer = document.getElementById("outputContainer");
const ide = document.getElementById("ide");

const buttonIncrease = document.getElementById("buttonIncrease");
const buttonDecrease = document.getElementById("buttonDecrease");
const buttonToggle = document.getElementById("buttonToggle");
const buttonFontUp = document.getElementById("buttonFontUp");
const buttonFontDown = document.getElementById("buttonFontDown");

buttonIncrease.addEventListener("click", ratioIncrease, false)
buttonDecrease.addEventListener("click", ratioDecrease, false)
buttonToggle.addEventListener("click", outputToggle, false)

buttonFontUp.addEventListener("click", fontIncrease, false)
buttonFontDown.addEventListener("click", outputDecrease, false)

var ratio = 0.8;
var outputContainerHidden = 0;
ide.style.fontSize = "12px";

function ratioIncrease() {
    ratio = Math.max(ratio - 0.1, 0.1)
    updateRatio(ratio);
}

function ratioDecrease() {
    ratio = Math.min(ratio + 0.1, 0.9)
    updateRatio(ratio);
}

function outputToggle() {
    if(outputContainerHidden == 0) {
        outputContainerHidden = 1;

        this.innerHTML = "⌃";
        outputContainer.style.borderTop = "none";
        updateRatio(1);
    } else {
        outputContainerHidden = 0;

        this.innerHTML = "⌄";
        outputContainer.style.borderTop = "1px solid #434343";
        updateRatio(ratio);
    }
}

function updateRatio(ratio) {
    topContainer.style.height = (100 * ratio) + "%";
    outputContainer.style.height = (100 - (100 * ratio)) + "%";  
}


function fontIncrease() {
    ide.style.fontSize = (parseInt(ide.style.fontSize.replace("px", "")) + 1) + "px";
}

function outputDecrease() {
    ide.style.fontSize = (parseInt(ide.style.fontSize.replace("px", "")) - 1) + "px";
}


program.focus({preventScroll: true});

program.addEventListener("scroll", OnScroll, false);

program.addEventListener("input", OnInput, false);

window.addEventListener("resize", OnResize, false);

function OnResize() {
    ide.style.height = (window.innerHeight - 22) + "px";
}

function OnInput() {
    var rows = [];
    for (let rowNumber = 1; rowNumber <= program.value.split(/\r|\r\n|\n/).length; rowNumber++) {
        rows[rowNumber-1] = rowNumber
    };

    rowNumbers.innerHTML = rows.join("\n");
}

function OnScroll() {
    rowNumbersContainer.scrollTop = program.scrollTop;
}


// run these once to update everything, idk how to get the row numbers to update tho
OnResize()