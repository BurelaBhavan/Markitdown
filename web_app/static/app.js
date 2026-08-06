document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse');
    const btnSample = document.getElementById('btn-sample');
    
    const uploadSection = document.getElementById('upload-section');
    const loadingSection = document.getElementById('loading-section');
    const outputSection = document.getElementById('output-section');

    const loadingTitle = document.getElementById('loading-title');
    const loadingSubtitle = document.getElementById('loading-subtitle');

    const statSavingsPct = document.getElementById('stat-savings-pct');
    const statMdTokens = document.getElementById('stat-md-tokens');
    const statRawTokens = document.getElementById('stat-raw-tokens');
    const statTime = document.getElementById('stat-time');

    const displayFilename = document.getElementById('display-filename');
    const displayFileStats = document.getElementById('display-file-stats');

    const markdownRendered = document.getElementById('markdown-rendered');
    const markdownRaw = document.getElementById('markdown-raw');

    const btnCopy = document.getElementById('btn-copy');
    const btnDownload = document.getElementById('btn-download');
    const btnReset = document.getElementById('btn-reset');
    const toast = document.getElementById('toast');

    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    let currentMarkdown = '';
    let currentFilename = 'converted.md';

    // Drag and Drop Listeners
    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        }, false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    // Browse Button
    btnBrowse.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Try Demo Sample Button
    btnSample.addEventListener('click', async () => {
        showLoading('Loading Demo Document...', 'Converting sample report using Microsoft MarkItDown');
        
        try {
            const sampleBlob = createSampleDocumentBlob();
            const file = new File([sampleBlob], "MarkItDown_AI_Token_Report.html", { type: "text/html" });
            await uploadFile(file);
        } catch (err) {
            alert('Failed to process sample document: ' + err.message);
            showUpload();
        }
    });

    // Handle File Selection
    function handleFileSelect(file) {
        showLoading(`Processing ${file.name}...`, 'Executing Microsoft MarkItDown layout parsing');
        uploadFile(file);
    }

    // Upload API Request
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.detail || 'Failed to convert document.');
            }

            currentMarkdown = data.markdown;
            currentFilename = file.name.replace(/\.[^/.]+$/, "") + ".md";

            renderResults(data);
        } catch (error) {
            alert('Error converting file: ' + error.message);
            showUpload();
        }
    }

    // Render Results in UI
    function renderResults(data) {
        // Analytics
        statSavingsPct.textContent = `${data.stats.token_savings_percent}%`;
        statMdTokens.textContent = data.stats.markdown_tokens.toLocaleString();
        statRawTokens.textContent = data.stats.raw_estimated_tokens.toLocaleString();
        statTime.textContent = `${data.execution_time_seconds}s`;

        // File Details
        displayFilename.textContent = data.filename;
        const sizeKB = (data.file_size_bytes / 1024).toFixed(1);
        displayFileStats.textContent = `${sizeKB} KB • ${data.stats.line_count} lines • ${data.stats.word_count} words`;

        // Render Markdown HTML
        if (window.marked) {
            markdownRendered.innerHTML = marked.parse(data.markdown);
        } else {
            markdownRendered.textContent = data.markdown;
        }

        // Set Raw Textarea
        markdownRaw.value = data.markdown;

        // Show Output Section
        uploadSection.classList.add('hidden');
        loadingSection.classList.add('hidden');
        outputSection.classList.remove('hidden');
    }

    // Tab Switching
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        });
    });

    // Copy to Clipboard
    btnCopy.addEventListener('click', () => {
        if (!currentMarkdown) return;
        navigator.clipboard.writeText(currentMarkdown).then(() => {
            showToast('Markdown copied to clipboard!');
        }).catch(err => {
            alert('Failed to copy: ' + err);
        });
    });

    // Download .md File
    btnDownload.addEventListener('click', () => {
        if (!currentMarkdown) return;
        const blob = new Blob([currentMarkdown], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast(`Downloaded ${currentFilename}`);
    });

    // Reset / New Upload
    btnReset.addEventListener('click', () => {
        showUpload();
        fileInput.value = '';
    });

    // UI State Switchers
    function showLoading(title, subtitle) {
        loadingTitle.textContent = title;
        loadingSubtitle.textContent = subtitle;
        uploadSection.classList.add('hidden');
        outputSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
    }

    function showUpload() {
        loadingSection.classList.add('hidden');
        outputSection.classList.add('hidden');
        uploadSection.classList.remove('hidden');
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }

    // Helper: Generate Rich Sample Document Blob
    function createSampleDocumentBlob() {
        const sampleHtml = `<!DOCTYPE html>
<html>
<head><title>Executive AI Summary Report</title></head>
<body>
    <h1>Executive Report: Optimizing AI Context Windows with MarkItDown</h1>
    <p>Large Language Models (LLMs) charge per token for prompt context. Unstructured binary PDF layouts and heavy formatting bloat input size. MarkItDown converts documents into minimal, clean Markdown representation.</p>

    <h2>Key Optimization Benefits</h2>
    <ul>
        <li><strong>Drastic Cost Savings:</strong> Reduces input token overhead by 50% to 80%.</li>
        <li><strong>Structural Fidelity:</strong> Preserves headings, tables, code blocks, and bullet points.</li>
        <li><strong>Multi-Format Support:</strong> Handles PDF, Word (.docx), PowerPoint (.pptx), Excel (.xlsx), and Web pages (.html).</li>
    </ul>

    <h2>Token Benchmark Matrix</h2>
    <table border="1">
        <thead>
            <tr>
                <th>Document Type</th>
                <th>Raw Format Size</th>
                <th>MarkItDown Tokens</th>
                <th>Context Reduction</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Annual Financial PDF</td>
                <td>12,400 tokens</td>
                <td>3,100 tokens</td>
                <td>75.0%</td>
            </tr>
            <tr>
                <td>Product Technical Spec (.docx)</td>
                <td>8,200 tokens</td>
                <td>2,450 tokens</td>
                <td>70.1%</td>
            </tr>
            <tr>
                <td>Quarterly Sales Slide Deck (.pptx)</td>
                <td>6,800 tokens</td>
                <td>1,800 tokens</td>
                <td>73.5%</td>
            </tr>
        </tbody>
    </table>

    <blockquote>
        "Converting complex document structures into standard Markdown is the most cost-effective way to ingest knowledge into AI agents."
    </blockquote>
</body>
</html>`;
        return new Blob([sampleHtml], { type: 'text/html' });
    }
});
