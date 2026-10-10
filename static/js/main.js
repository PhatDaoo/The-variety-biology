document.addEventListener('DOMContentLoaded', () => {
    const btnUpload = document.getElementById('btn-upload');
    const btnCamera = document.getElementById('btn-camera');
    const btnScan = document.getElementById('btn-scan');
    const imageUpload = document.getElementById('image-upload');
    const targetImage = document.getElementById('target-image');
    const cameraFeed = document.getElementById('camera-feed');
    const captureCanvas = document.getElementById('capture-canvas');
    const uploadPrompt = document.getElementById('upload-prompt');
    const imageContainer = document.getElementById('image-container');
    const scanOverlay = document.getElementById('scan-overlay');
    const targetBox = document.querySelector('.target-box');
    const dataStream = document.getElementById('data-stream');
    const resultsContainer = document.getElementById('results-container');
    
    const resName = document.getElementById('res-name');
    const resScientific = document.getElementById('res-scientific');
    const resConfidence = document.getElementById('res-confidence');
    const wikiInfo = document.getElementById('wiki-info');

    let selectedFile = null;
    let stream = null;
    let isCameraMode = false;

    function addLog(message, isHighlight = false) {
        const div = document.createElement('div');
        div.className = `log-entry ${isHighlight ? 'highlight' : ''}`;
        
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
        
        div.textContent = `[${timeStr}] > ${message}`;
        dataStream.prepend(div);
        
        if (dataStream.children.length > 20) {
            dataStream.removeChild(dataStream.lastChild);
        }
    }

    addLog("SYSTEM READY. USING LOCAL AI.", true);

    btnUpload.addEventListener('click', () => { imageUpload.click(); });
    
    btnCamera.addEventListener('click', async () => {
        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                addLog('INITIALIZING OPTICS...');
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                cameraFeed.srcObject = stream;
                cameraFeed.style.display = 'block';
                targetImage.style.display = 'none';
                uploadPrompt.style.display = 'none';
                btnScan.disabled = false;
                isCameraMode = true;
                selectedFile = null;
                addLog('CAMERA UPLINK ESTABLISHED.', true);
                resultsContainer.style.display = 'none';
            } else {
                alert('Camera not supported. Use Upload button.');
            }
        } catch (err) {
            alert('Cannot access camera.');
        }
    });

    imageContainer.addEventListener('click', () => {
        if (!selectedFile && !isCameraMode && !scanOverlay.style.display.includes('flex')) {
            imageUpload.click();
        }
    });

    imageUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                cameraFeed.style.display = 'none';
            }
            
            isCameraMode = false;
            selectedFile = file;
            
            targetImage.src = URL.createObjectURL(file);
            targetImage.style.display = 'block';
            uploadPrompt.style.display = 'none';
            btnScan.disabled = false;
            
            addLog(`TARGET AQUIRED: ${file.name}`);
            resultsContainer.style.display = 'none';
        }
    });

    async function compressImage(fileOrBlob) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // GIẢM ĐỘ PHÂN GIẢI XUỐNG 400 ĐỂ AI XỬ LÝ ẢNH NHANH GẤP 4 LẦN
                const MAX_SIZE = 400;
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                } else {
                    if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(fileOrBlob);
        });
    }

    async function callLocalBackend(base64DataUrl) {
        // Now sending JSON with base64 instead of FormData to ensure compression applies properly
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64DataUrl })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    btnScan.addEventListener('click', async () => {
        if (!selectedFile && !isCameraMode) return;

        btnScan.disabled = true;
        btnUpload.disabled = true;
        btnCamera.disabled = true;
        scanOverlay.style.display = 'flex';
        targetBox.classList.add('scanning');
        resultsContainer.style.display = 'none';
        wikiInfo.innerHTML = "Querying databases...";
        
        addLog('INITIATING BIOSCAN...', true);

        try {
            let resultData = null;

            if (isCameraMode) {
                addLog('CAPTURING FRAME...');
                captureCanvas.width = cameraFeed.videoWidth;
                captureCanvas.height = cameraFeed.videoHeight;
                captureCanvas.getContext('2d').drawImage(cameraFeed, 0, 0);
                
                const blob = await new Promise(resolve => captureCanvas.toBlob(resolve, 'image/jpeg', 0.9));
                addLog('COMPRESSING & TRANSMITTING TO LOCAL AI...');
                const base64 = await compressImage(blob);
                resultData = await callLocalBackend(base64);
            } else {
                addLog('COMPRESSING & TRANSMITTING TO LOCAL AI...');
                const base64 = await compressImage(selectedFile);
                resultData = await callLocalBackend(base64);
            }

            if (resultData.error) throw new Error(resultData.error);

            addLog(`ANALYSIS COMPLETE. MATCH FOUND.`, true);
            
            resName.textContent = (resultData.name || 'UNKNOWN').toUpperCase();
            resScientific.textContent = resultData.scientific_name || '---';
            resConfidence.textContent = resultData.confidence ? `${(resultData.confidence * 100).toFixed(1)}%` : '---';
            
            document.getElementById('res-origin').textContent = resultData.origin || 'UNKNOWN';
            document.getElementById('res-diet').textContent = resultData.diet || 'UNKNOWN';
            document.getElementById('res-status').textContent = resultData.status || 'UNKNOWN';
            
            resultsContainer.style.display = 'block';
            
            fetchWikiData(resultData.name || resultData.scientific_name);
            renderGlobe(resultData.habitat_query);

        } catch (error) {
            console.error("Scan Error:", error);
            addLog(`ERROR: ${error.message}`, true);
            scanOverlay.style.display = 'none';
            targetBox.classList.remove('scanning');
            btnScan.disabled = false;
            btnUpload.disabled = false;
            btnCamera.disabled = false;
            alert('Scan failed: ' + error.message);
        }
    });

    async function fetchWikiData(searchTerm) {
        addLog(`QUERYING WIKI DATABASE FOR: ${searchTerm}...`);
        try {
            const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
            const response = await fetch(url);
            const data = await response.json();
            
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            
            scanOverlay.style.display = 'none';
            targetBox.classList.remove('scanning');
            btnScan.disabled = false;
            btnUpload.disabled = false;
            btnCamera.disabled = false;

            if (pageId === "-1") {
                addLog('WIKI DB: NO ENTRY FOUND.');
                wikiInfo.innerHTML = "<i>No data found in biological database.</i>";
            } else {
                addLog('WIKI DB: DATA RETRIEVED.', true);
                let extract = pages[pageId].extract;
                const sentences = extract.match(/[^.!?]+[.!?]+/g) || [extract];
                const shortExtract = sentences.slice(0, 2).join(' ');
                wikiInfo.innerHTML = `<p>${shortExtract}</p>`;
            }
        } catch (error) {
            addLog('WIKI DB: CONNECTION ERROR.');
            wikiInfo.innerHTML = "<i>Error accessing biological database.</i>";
            scanOverlay.style.display = 'none';
            targetBox.classList.remove('scanning');
            btnScan.disabled = false;
            btnUpload.disabled = false;
            btnCamera.disabled = false;
        }
    }
    
    // --- 3D GLOBE RENDERING ---
    let myGlobe = null;
    let worldGeoJson = null;

    // Load country boundaries in the background
    fetch('https://unpkg.com/globe.gl/example/datasets/ne_110m_admin_0_countries.geojson')
        .then(res => res.json())
        .then(data => { worldGeoJson = data; })
        .catch(e => console.error("Failed to load geojson", e));

    async function renderGlobe(habitatName) {
        const globeContainer = document.getElementById('globe-container');
        if (!habitatName || habitatName.toLowerCase().includes('unknown')) {
            globeContainer.style.display = 'none';
            return;
        }
        
        globeContainer.style.display = 'block';
        globeContainer.innerHTML = ''; // Clear previous globe
        
        addLog(`ANALYZING BIO-REGIONS: ${habitatName.toUpperCase()}...`);
        
        if (!worldGeoJson) {
            addLog('GEO-DATA STILL LOADING. PLEASE WAIT...');
            return;
        }
        
        try {
            const locations = habitatName.split(',').map(s => s.trim().toLowerCase());
            
            // Find matching country polygons
            const highlightPolygons = worldGeoJson.features.filter(f => {
                if (!f.properties) return false;
                const countryName = f.properties.ADMIN ? f.properties.ADMIN.toLowerCase() : '';
                const isoA3 = f.properties.ISO_A3 ? f.properties.ISO_A3.toLowerCase() : '';
                if (!countryName) return false;
                return locations.some(loc => countryName.includes(loc) || loc.includes(countryName) || (isoA3 && loc === isoA3));
            });
            
            if (highlightPolygons.length > 0) {
                addLog(`LOCKED ${highlightPolygons.length} GLOBAL REGIONS.`, true);
                
                globeContainer.style.display = 'flex';
                globeContainer.style.justifyContent = 'center';
                globeContainer.style.alignItems = 'center';
                
                // Wait for DOM to paint so clientWidth is correct
                await new Promise(r => setTimeout(r, 50));
                
                const globeWidth = globeContainer.clientWidth > 0 ? globeContainer.clientWidth : 500;
                
                myGlobe = Globe()
                    (globeContainer)
                    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
                    .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
                    .backgroundColor('rgba(0,0,0,0)')
                    .width(globeWidth)
                    .height(450)
                    .polygonsData(worldGeoJson.features)
                    .polygonCapColor(d => {
                        if (!d.properties || !d.properties.ADMIN) return 'rgba(0, 30, 40, 0.1)';
                        const countryName = d.properties.ADMIN.toLowerCase();
                        const isMatch = locations.some(loc => countryName.includes(loc) || loc.includes(countryName));
                        return isMatch ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 30, 40, 0.1)'; 
                    })
                    .polygonSideColor(() => 'rgba(0, 0, 0, 0.1)')
                    .polygonStrokeColor(() => '#00ffff')
                    .polygonLabel(({ properties: d }) => {
                        if (!d || !d.ADMIN) return '';
                        const countryName = d.ADMIN.toLowerCase();
                        const isMatch = locations.some(loc => countryName.includes(loc) || loc.includes(countryName));
                        if (isMatch) {
                            return `
                            <div style="color: #ff0000; font-family: 'Share Tech Mono'; font-weight: bold; background: rgba(20,0,0,0.8); padding: 4px 8px; border: 1px solid #ff0000; box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);">
                                HABITAT: ${d.ADMIN.toUpperCase()}
                            </div>`;
                        }
                        return '';
                    });
                    
                myGlobe.controls().autoRotate = true;
                myGlobe.controls().autoRotateSpeed = 0.3; 
                myGlobe.controls().enableZoom = true;
                
                myGlobe.pointOfView({ altitude: 1.8 }); 
                
                // Swap UI to focus on Globe (fixes CSS animation lag)
                document.getElementById('main-target-box').classList.add('minimized-target');
                document.getElementById('main-controls').style.display = 'none';
                document.getElementById('btn-new-scan').style.display = 'block';

            } else {
                addLog('REGION SCAN FAILED: NO MATCHING COUNTRIES.');
                globeContainer.innerHTML = '<div style="color:#00ffff; text-align:center; padding-top: 200px; font-family: \'Share Tech Mono\'">REGION NOT FOUND</div>';
            }
            
        } catch (e) {
            console.error(e);
            addLog('BIO-REGION MAPPING ERROR.');
        }
    }
    
    document.getElementById('btn-new-scan').addEventListener('click', () => {
        document.getElementById('globe-container').style.display = 'none';
        document.getElementById('btn-new-scan').style.display = 'none';
        
        const targetBox = document.getElementById('main-target-box');
        targetBox.classList.remove('minimized-target');
        
        document.getElementById('main-controls').style.display = 'flex';
        document.getElementById('results-container').style.display = 'none';
        document.getElementById('target-image').style.display = 'none';
        document.getElementById('upload-prompt').style.display = 'flex';
        document.getElementById('btn-scan').disabled = true;
        
        if (myGlobe) {
            myGlobe.controls().autoRotate = false; // Save resources
        }
        addLog("SYSTEM RESET. AWAITING NEW TARGET.");
    });
});
