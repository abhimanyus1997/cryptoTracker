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
