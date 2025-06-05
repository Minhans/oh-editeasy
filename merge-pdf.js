// merge-pdf.js
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('pdf-files');
    const mergeBtn = document.getElementById('merge-btn');
    const clearBtn = document.getElementById('clear-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const downloadBtn = document.getElementById('download-btn');
    const statusText = document.getElementById('status-text');
    const fileList = document.getElementById('file-list');
    const dropArea = document.getElementById('drop-area');
    
    let pdfFiles = [];
    
    // Handle file selection
    fileInput.addEventListener('change', function(e) {
        handleFiles(e.target.files);
    });
    
    // Handle drag and drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });
    
    function highlight() {
        dropArea.classList.add('highlight');
    }
    
    function unhighlight() {
        dropArea.classList.remove('highlight');
    }
    
    dropArea.addEventListener('drop', function(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });
    
    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        
        if (newFiles.length === 0) {
            statusText.textContent = 'Please select PDF files only.';
            return;
        }
        
        pdfFiles = [...pdfFiles, ...newFiles];
        updateFileList();
        statusText.textContent = `${pdfFiles.length} PDF files ready to merge`;
    }
    
    function updateFileList() {
        fileList.innerHTML = '';
        
        pdfFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.draggable = true;
            fileItem.dataset.index = index;
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <span class="file-icon">📄</span>
                    <span>${file.name} (${formatFileSize(file.size)})</span>
                </div>
                <span class="remove-file" data-index="${index}">×</span>
            `;
            
            fileList.appendChild(fileItem);
        });
        
        // Add drag and drop sorting
        setupDragAndDrop();
        
        // Add remove file functionality
        document.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                pdfFiles.splice(index, 1);
                updateFileList();
                
                if (pdfFiles.length === 0) {
                    statusText.textContent = 'Select PDF files to merge';
                } else {
                    statusText.textContent = `${pdfFiles.length} PDF files ready to merge`;
                }
            });
        });
    }
    
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    function setupDragAndDrop() {
        const items = document.querySelectorAll('.file-item');
        
        items.forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragover', handleDragOver);
            item.addEventListener('drop', handleDrop);
            item.addEventListener('dragend', handleDragEnd);
        });
    }
    
    let draggedItem = null;
    
    function handleDragStart(e) {
        draggedItem = this;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', this.innerHTML);
        this.classList.add('dragging');
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        if (draggedItem !== this) {
            const fromIndex = parseInt(draggedItem.dataset.index);
            const toIndex = parseInt(this.dataset.index);
            
            // Swap files in array
            [pdfFiles[fromIndex], pdfFiles[toIndex]] = [pdfFiles[toIndex], pdfFiles[fromIndex]];
            
            // Update UI
            updateFileList();
        }
    }
    
    function handleDragEnd() {
        this.classList.remove('dragging');
    }
    
    // Clear all files
    clearBtn.addEventListener('click', function() {
        pdfFiles = [];
        fileList.innerHTML = '';
        statusText.textContent = 'Select PDF files to merge';
        progressContainer.style.display = 'none';
        downloadBtn.style.display = 'none';
        fileInput.value = '';
    });
    
    // Merge PDFs
    mergeBtn.addEventListener('click', async function() {
        if (pdfFiles.length < 2) {
            statusText.textContent = 'Please select at least 2 PDF files to merge';
            return;
        }
        
        try {
            mergeBtn.disabled = true;
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
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
                const progress = ((i + 1) / pdfFiles.length) * 100;
                progressBar.style.width = `${progress}%`;
                statusText.textContent = `Processing file ${i + 1} of ${pdfFiles.length} (${file.name})`;
            }
            
            const mergedPdfBytes = await mergedPdf.save();
            
            // Create download link
            const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            
            downloadBtn.href = url;
            downloadBtn.download = 'merged-document.pdf';
            downloadBtn.style.display = 'inline-block';
            
            statusText.textContent = 'Merge complete! Ready to download.';
            
            // Track successful merge
            gtag('event', 'pdf_merge', {
                'file_count': pdfFiles.length,
                'event_category': 'tool_usage'
            });
        } catch (error) {
            console.error('Error merging PDFs:', error);
            statusText.textContent = 'Error merging PDFs. Please try again.';
            
            // Track error
            gtag('event', 'merge_error', {
                'error': error.message,
                'event_category': 'errors'
            });
        } finally {
            mergeBtn.disabled = false;
        }
    });
    
    // Initialize AdSense ads
    (adsbygoogle = window.adsbygoogle || []).push({});
});
