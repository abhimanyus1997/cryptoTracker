function takeScreenshot() {
    html2canvas(document.body).then(function (canvas) {
        // Convert the canvas to an image
        const screenshot = canvas.toDataURL('image/png');

        // Create a link element to download the screenshot
        const downloadLink = document.getElementById('downloadLink');
        downloadLink.href = screenshot;
        downloadLink.download = 'screenshot.png';
        downloadLink.click();
    });
}


// CSV reader not working now
// document.addEventListener("DOMContentLoaded", function () {
//     const myForm = document.getElementById("myForm");
//     const tableContainer = document.getElementById("tableContainer");

//     myForm.addEventListener("submit", function (e) {
//         e.preventDefault();
//         const csvFile = document.getElementById("csvFile");
//         const input = csvFile.files[0];

//         if (input) {
//             const reader = new FileReader();
//             reader.onload = function (e) {
//                 const text = e.target.result;
//                 const rows = text.split("\n");
//                 const table = document.createElement("table");
//                 table.classList.add("table", "table-striped");

//                 rows.forEach(row => {
//                     const rowData = row.split(",");
//                     const tr = document.createElement("tr");
//                     rowData.forEach(cellData => {
//                         const td = document.createElement("td");
//                         td.textContent = cellData;
//                         tr.appendChild(td);
//                     });
//                     table.appendChild(tr);
//                 });

//                 tableContainer.innerHTML = ""; // Clear previous content
//                 tableContainer.appendChild(table);
//             };
//             reader.readAsText(input);
//         } else {
//             console.error("No file selected.");
//         }
//     });
// });