// merge-pdf.js
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('pdf-files');
    const mergeBtn = document.getElementById('merge-btn');
    const progressBar = document.getElementById('progress');
    const downloadBtn = document.getElementById('download-btn');
    const statusText = document.getElementById('status');
    
    let pdfFiles = [];
    
    fileInput.addEventListener('change', function(e) {
        pdfFiles = Array.from(e.target.files);
        statusText.textContent = `${pdfFiles.length} PDF files selected`;
    });
    
    mergeBtn.addEventListener('click', async function() {
        if (pdfFiles.length < 2) {
            alert('Please select at least 2 PDF files to merge');
            return;
        }
        
        try {
            mergeBtn.disabled = true;
            statusText.textContent = 'Processing...';
            
            // Load PDF-lib library dynamically
            const { PDFDocument } = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.16.0/pdf-lib.min.js');
            
            const mergedPdf = await PDFDocument.create();
            
            for (let i = 0; i < pdfFiles.length; i++) {
                const file = pdfFiles[i];
                const arrayBuffer = await file.arrayBuffer();
                const pdfDoc = await PDFDocument.load(arrayBuffer);
                
                const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                pages.forEach(page => mergedPdf.addPage(page));
                
                // Update progress
                progressBar.value = (i + 1) / pdfFiles.length * 100;
                statusText.textContent = `Processing file ${i + 1} of ${pdfFiles.length}`;
            }
            
            const mergedPdfBytes = await mergedPdf.save();
            
            // Create download link
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            downloadBtn.href = url;
            downloadBtn.download = 'merged-document.pdf';
            downloadBtn.style.display = 'inline-block';
            
            statusText.textContent = 'Merge complete!';
        } catch (error) {
            console.error('Error merging PDFs:', error);
            statusText.textContent = 'Error merging PDFs. Please try again.';
        } finally {
            mergeBtn.disabled = false;
        }
    });
});
