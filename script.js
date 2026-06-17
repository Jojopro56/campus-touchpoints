// --- DOM Engine Elements ---
const viewport = document.getElementById('mapViewport');
const container = document.getElementById('mapContainer');
const mapImage = document.getElementById('mapImage');

const formModal = document.getElementById('formModal');
const viewModal = document.getElementById('viewModal');
const markerForm = document.getElementById('markerForm');

// Hamburger Drawer System DOM Elements
const hamburgerMenuBtn = document.getElementById('hamburgerMenuBtn');
const sideMenuDrawer = document.getElementById('sideMenuDrawer');
const closeDrawerBtn = document.getElementById('closeDrawerBtn');
const exportMarkersBtn = document.getElementById('exportMarkersBtn');
const importMarkersBtn = document.getElementById('importMarkersBtn');
const importFileInput = document.getElementById('importFileInput');
const downloadLatestPinsBtn = document.getElementById('downloadLatestPinsBtn');

// NEW: Timeline DOM System Configuration Elements
const timelineTrack = document.getElementById('timelineTrack');
const timelineCards = document.querySelectorAll('.timeline-card');

// Lightbox System DOM Elements
const lightboxOverlay = document.getElementById('lightboxOverlay');
const lightboxImg = document.getElementById('lightboxImg');
const closeLightboxBtn = document.getElementById('closeLightboxBtn');

// File Upload System DOM Connections
const locImgInput = document.getElementById('locImg');
const solImgInput = document.getElementById('solImg');
const locFeedback = document.getElementById('locFeedback');
const solFeedback = document.getElementById('solFeedback');
const removeLocBtn = document.getElementById('removeLocImg');
const removeSolBtn = document.getElementById('removeSolImg');

// --- Map Transform & State Configuration ---
let scale = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let startX, startY;
let isClickAction = false; 

let clickPercentX = 0;
let clickPercentY = 0;

let markersData = [];
let currentViewingPinId = null;

let loadedLocBase64 = "";
let loadedSolBase64 = "";

// Mobile Touch Specific Tracking States
let initialTouchDist = 0;
let initialTouchScale = 1;
let touchMidX = 0;
let touchMidY = 0;
let isPinching = false;

// Active Timeline state variable tracking
let activeTimelineFilterValue = "all";

// --- High Capacity IndexedDB Storage Engine ---
const DB_NAME = 'InteractiveMapDB';
const DB_VERSION = 1;
const STORE_NAME = 'markers';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (e) => {
            db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function getAllMarkersFromDB() {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
    });
}

function saveMarkerToDB(marker) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(marker);
        request.onsuccess = () => resolve();
    });
}

function deleteMarkerFromDB(id) {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
    });
}

function clearAllMarkersFromDB() {
    return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
    });
}

// --- Initialize App Sequence ---
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB();
        markersData = await getAllMarkersFromDB();
        markersData.forEach(marker => {
            marker.isJumping = true; 
            renderPin(marker);
        });
    } catch (err) {
        console.error("Failed to initialize database engine:", err);
    }
});

// --- Hamburger Side Drawer Utilities ---
hamburgerMenuBtn.addEventListener('click', () => sideMenuDrawer.classList.add('active'));
closeDrawerBtn.addEventListener('click', () => sideMenuDrawer.classList.remove('active'));

document.addEventListener('click', (e) => {
    if (!sideMenuDrawer.contains(e.target) && !hamburgerMenuBtn.contains(e.target) && sideMenuDrawer.classList.contains('active')) {
        sideMenuDrawer.classList.remove('active');
    }
});

// --- NEW: Global Timeline Engine Mechanics ---
function applyActiveFilter(selectedColor) {
    activeTimelineFilterValue = selectedColor;
    const pins = container.querySelectorAll('.pin');
    pins.forEach(pin => {
        const pinColor = pin.getAttribute('data-color');
        if (selectedColor === 'all' || pinColor === selectedColor) {
            pin.classList.remove('hidden-by-filter');
        } else {
            pin.classList.add('hidden-by-filter');
        }
    });
}

// Wire Up Click/Tap Listeners on Timeline Elements
timelineCards.forEach(card => {
    card.addEventListener('click', () => {
        // Strip active visibility styles from all cards
        timelineCards.forEach(c => c.classList.remove('active'));
        
        // Apply active background colors to selected target card node
        card.classList.add('active');
        
        // Apply map layer visibility filter rules instantly
        const targetColor = card.getAttribute('data-filter');
        applyActiveFilter(targetColor);

        // Smoothly center focus over the tapped item horizontally (great for mobile views)
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
});

// Utility to cleanly auto-reset the UI view state back to overview safely
function resetTimelineToOverview() {
    timelineCards.forEach(c => c.classList.remove('active'));
    const overviewCard = timelineTrack.querySelector('[data-filter="all"]');
    if (overviewCard) {
        overviewCard.classList.add('active');
        overviewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    applyActiveFilter('all');
}

// DOWNLOAD LATEST PINS LOGIC (GitHub Pages Subfolder Proof)
downloadLatestPinsBtn.addEventListener('click', () => {
    const fileName = 'custom_map_backup_1781653921851.json';
    let currentPath = window.location.pathname;
    
    if (currentPath.includes('.')) {
        currentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
    }
    if (!currentPath.endsWith('/')) {
        currentPath += '/';
    }
    
    const fileUrl = window.location.origin + currentPath + fileName;

    const downloadLink = document.createElement('a');
    downloadLink.href = fileUrl;
    downloadLink.download = fileName;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    sideMenuDrawer.classList.remove('active');
});

// --- EXPORT MARKERS LOGIC ---
exportMarkersBtn.addEventListener('click', () => {
    if (markersData.length === 0) {
        alert("There are no markers on your map to export!");
        return;
    }

    const backupString = JSON.stringify(markersData, null, 2);
    const blob = new Blob([backupString], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = `custom_map_backup_${Date.now()}.json`;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    URL.revokeObjectURL(blobUrl);
    sideMenuDrawer.classList.remove('active');
});

// --- IMPORT MARKERS LOGIC ---
importMarkersBtn.addEventListener('click', () => importFileInput.click());

importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedMarkers = JSON.parse(event.target.result);

            if (!Array.isArray(importedMarkers)) {
                throw new Error("Invalid structure.");
            }

            const message = `Found ${importedMarkers.length} markers in package. Would you like to import them now?`;
            if (!confirm(message)) {
                importFileInput.value = "";
                return;
            }

            // Force view reset on layout import sequences so newly arrived data is fully visible
            resetTimelineToOverview();

            for (const marker of importedMarkers) {
                if (marker.id && marker.x !== undefined && marker.y !== undefined) {
                    marker.isJumping = true; 

                    const existingIndex = markersData.findIndex(m => m.id === marker.id);
                    if (existingIndex !== -1) {
                        markersData[existingIndex] = marker;
                    } else {
                        markersData.push(marker);
                    }

                    await saveMarkerToDB(marker);

                    const duplicateElement = container.querySelector(`.pin[data-id="${marker.id}"]`);
                    if (duplicateElement) duplicateElement.remove();

                    renderPin(marker);
                }
            }

            alert("🎉 All markers imported successfully!");
            importFileInput.value = "";
            sideMenuDrawer.classList.remove('active');

        } catch (error) {
            alert("Failed to parse file. Ensure it's a valid map backup file.");
            importFileInput.value = "";
        }
    };
    reader.readAsText(file);
});

// --- Dynamic Transforms ---
function updateTransform() {
    container.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

function zoom(amount, centerX, centerY) {
    const minScale = 0.5;
    const maxScale = 4;
    const oldScale = scale;
    scale = Math.min(Math.max(scale + amount, minScale), maxScale);

    if (centerX !== undefined && centerY !== undefined) {
        const xs = (centerX - panX) / oldScale;
        const ys = (centerY - panY) / oldScale;
        panX = centerX - xs * scale;
        panY = centerY - ys * scale;
    }
    updateTransform();
}

document.getElementById('zoomIn').addEventListener('click', () => zoom(0.3));
document.getElementById('zoomOut').addEventListener('click', () => zoom(-0.3));

viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = viewport.getBoundingClientRect();
    zoom(e.deltaY < 0 ? 0.2 : -0.2, e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

// --- DESKTOP ONLY Panning Setup ---
viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return; 
    if (e.target.classList.contains('pin') || 
        e.target.closest('.zoom-controls') || 
        e.target.closest('#sideMenuDrawer') || 
        e.target.closest('#hamburgerMenuBtn') ||
        e.target.closest('.timeline-viewport')) return; // Ignore click dragging if user intercepts timeline panel

    isDragging = true;
    isClickAction = true;
    viewport.classList.add('is-dragging');
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewport.setPointerCapture(e.pointerId);
});

viewport.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !isDragging) return;
    isClickAction = false;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
});

viewport.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse' || !isDragging) return;
    isDragging = false;
    viewport.classList.remove('is-dragging');
    viewport.releasePointerCapture(e.pointerId);
    if (isClickAction) handleMapClick(e);
});


// --- HIGH PERFORMANCE MOBILE TOUCH & GESTURE ENGINE ---
viewport.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('pin') || 
        e.target.closest('.zoom-controls') || 
        e.target.closest('#sideMenuDrawer') || 
        e.target.closest('#hamburgerMenuBtn') ||
        e.target.closest('.timeline-viewport')) return;

    viewport.classList.add('is-dragging'); 
    isClickAction = true;

    if (e.touches.length === 1) {
        isDragging = true;
        isPinching = false;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
    } else if (e.touches.length === 2) {
        isDragging = false;
        isPinching = true;
        isClickAction = false; 
        
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        initialTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        initialTouchScale = scale;

        const rect = viewport.getBoundingClientRect();
        touchMidX = ((t1.clientX + t2.clientX) / 2) - rect.left;
        touchMidY = ((t1.clientY + t2.clientY) / 2) - rect.top;
    }
}, { passive: false });

viewport.addEventListener('touchmove', (e) => {
    if (!isDragging && !isPinching) return;
    e.preventDefault(); 

    isClickAction = false;

    if (e.touches.length === 1 && isDragging) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
    } else if (e.touches.length === 2 && isPinching) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        
        if (initialTouchDist > 0) {
            const factor = currentDist / initialTouchDist;
            const minScale = 0.5;
            const maxScale = 4;
            const oldScale = scale;
            
            scale = Math.min(Math.max(initialTouchScale * factor, minScale), maxScale);

            const xs = (touchMidX - panX) / oldScale;
            const ys = (touchMidY - panY) / oldScale;
            panX = touchMidX - xs * scale;
            panY = touchMidY - ys * scale;
            
            updateTransform();
        }
    }
}, { passive: false });

viewport.addEventListener('touchend', (e) => {
    viewport.classList.remove('is-dragging');
    
    if (isClickAction && e.touches.length === 0 && e.changedTouches.length > 0) {
        const fakePointerEvent = {
            clientX: e.changedTouches[0].clientX,
            clientY: e.changedTouches[0].clientY
        };
        handleMapClick(fakePointerEvent);
    }

    isDragging = false;
    isPinching = false;
    initialTouchDist = 0;

    if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
    }
});


function handleMapClick(e) {
    const rect = container.getBoundingClientRect();
    clickPercentX = ((e.clientX - rect.left) / rect.width) * 100;
    clickPercentY = ((e.clientY - rect.top) / rect.height) * 100;
    openModal(formModal);
}

// --- Upload Processing Engine ---
function processFile(file, type) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        if (type === 'location') {
            loadedLocBase64 = e.target.result;
            locFeedback.querySelector('.file-name').textContent = file.name;
            locFeedback.classList.add('active');
            document.getElementById('locLabel').style.display = 'none';
        } else {
            loadedSolBase64 = e.target.result;
            solFeedback.querySelector('.file-name').textContent = file.name;
            solFeedback.classList.add('active');
            document.getElementById('solLabel').style.display = 'none';
        }
    };
    reader.readAsDataURL(file);
}

locImgInput.addEventListener('change', (e) => processFile(e.target.files[0], 'location'));
solImgInput.addEventListener('change', (e) => processFile(e.target.files[0], 'solution'));

function clearFileInput(type) {
    if (type === 'location') {
        locImgInput.value = "";
        loadedLocBase64 = "";
        locFeedback.classList.remove('active');
        document.getElementById('locLabel').style.display = 'block';
    } else {
        solImgInput.value = "";
        loadedSolBase64 = "";
        solFeedback.classList.remove('active');
        document.getElementById('solLabel').style.display = 'block';
    }
}

removeLocBtn.addEventListener('click', () => clearFileInput('location'));
removeSolBtn.addEventListener('click', () => clearFileInput('solution'));

// --- Modal Visibility Controls ---
function openModal(modal) { modal.classList.add('active'); }
function closeModal(modal) {
    modal.classList.remove('active');
    if(modal === formModal) {
        markerForm.reset();
        clearFileInput('location');
        clearFileInput('solution');
    }
}

[formModal, viewModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) closeModal(modal);
    });
});

// Lightbox Event Close Utilities
function closeLightbox() {
    lightboxOverlay.classList.remove('active');
    setTimeout(() => { lightboxImg.src = ""; }, 300); 
}
lightboxOverlay.addEventListener('click', (e) => {
    if (e.target === lightboxOverlay || e.target.id === 'closeLightboxBtn') closeLightbox();
});

// --- Save Action Form Interception ---
markerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const selectedColor = document.querySelector('input[name="markerColor"]:checked').value;

    const newMarker = {
        id: Date.now(),
        x: clickPercentX,
        y: clickPercentY,
        color: selectedColor,
        locTitle: document.getElementById('locTitle').value,
        locDesc: document.getElementById('locDesc').value,
        locImgUrl: loadedLocBase64, 
        solTitle: document.getElementById('solTitle').value,
        solDesc: document.getElementById('solDesc').value,
        solImgUrl: loadedSolBase64
    };

    markersData.push(newMarker);
    await saveMarkerToDB(newMarker);
    
    newMarker.isJumping = true; 
    renderPin(newMarker);

    // Forces timeline reset back to overview when adding new markers so they don't look hidden
    resetTimelineToOverview();

    closeModal(formModal);
});

// --- Visual Pin Generator Rendering ---
function renderPin(markerObj) {
    const pin = document.createElement('div');
    pin.classList.add('pin');
    
    pin.style.left = `${markerObj.x}%`;
    pin.style.top = `${markerObj.y}%`;
    pin.style.backgroundColor = markerObj.color;
    pin.setAttribute('data-id', markerObj.id);
    pin.setAttribute('data-color', markerObj.color); 

    if (markerObj.isJumping) {
        pin.classList.add('jumping');
    }

    // Evaluates dynamic placement filters to hide/show pins according to active timeline step
    if (activeTimelineFilterValue !== 'all' && markerObj.color !== activeTimelineFilterValue) {
        pin.classList.add('hidden-by-filter');
    }

    pin.addEventListener('click', (e) => {
        e.stopPropagation();
        
        pin.classList.remove('jumping');
        
        const localMatch = markersData.find(m => m.id === markerObj.id);
        if(localMatch) localMatch.isJumping = false;
        
        showPinDetails(markerObj.id);
    });

    container.appendChild(pin);
}

// --- Detail Context Inspector View ---
function showPinDetails(id) {
    const marker = markersData.find(m => m.id === id);
    if (!marker) return;

    currentViewingPinId = id;

    document.getElementById('viewLocTitle').textContent = marker.locTitle;
    
    const viewLocDescEl = document.getElementById('viewLocDesc');
    if (marker.locDesc.trim() !== "") {
        viewLocDescEl.textContent = marker.locDesc;
        viewLocDescEl.style.display = "block";
    } else {
        viewLocDescEl.style.display = "none";
    }

    const viewLocImgEl = document.getElementById('viewLocImg');
    if (marker.locImgUrl) {
        viewLocImgEl.src = marker.locImgUrl;
        viewLocImgEl.style.display = "block";
        viewLocImgEl.style.cursor = "zoom-in";
    } else {
        viewLocImgEl.removeAttribute('src'); 
    }

    const hasSolutionData = (marker.solTitle.trim() !== "" || marker.solDesc.trim() !== "" || marker.solImgUrl);
    const dividerEl = document.querySelector('.divider');
    const viewSolBlockEl = document.getElementById('viewSolBlock');

    if (hasSolutionData) {
        if (dividerEl) dividerEl.style.display = "block";
        viewSolBlockEl.style.display = "block";

        const viewSolTitleEl = document.getElementById('viewSolTitle');
        if (marker.solTitle.trim() !== "") {
            viewSolTitleEl.textContent = marker.solTitle;
            viewSolTitleEl.style.display = "block";
        } else {
            viewSolTitleEl.style.display = "none";
        }

        const viewSolDescEl = document.getElementById('viewSolDesc');
        if (marker.solDesc.trim() !== "") {
            viewSolDescEl.textContent = marker.solDesc;
            viewSolDescEl.style.display = "block";
        } else {
            viewSolDescEl.style.display = "none";
        }

        const viewSolImgEl = document.getElementById('viewSolImg');
        if (marker.solImgUrl) {
            viewSolImgEl.src = marker.solImgUrl;
            viewSolImgEl.style.display = "block";
            viewSolImgEl.style.cursor = "zoom-in";
        } else {
            viewSolImgEl.removeAttribute('src');
        }
    } else {
        if (dividerEl) dividerEl.style.display = "none";
        viewSolBlockEl.style.display = "none";
    }

    openModal(viewModal);
}

// Wire Up Click Action Hooks on display images to engage Fullscreen Lightbox Mode
[document.getElementById('viewLocImg'), document.getElementById('viewSolImg')].forEach(imgElement => {
    imgElement.addEventListener('click', function() {
        if (this.src && this.getAttribute('src') !== "") {
            lightboxImg.src = this.src;
            lightboxOverlay.classList.add('active');
        }
    });
});

// --- Delete Removal Pipeline ---
document.getElementById('deletePinBtn').addEventListener('click', async () => {
    if (!currentViewingPinId) return;

    markersData = markersData.filter(m => m.id !== currentViewingPinId);
    await deleteMarkerFromDB(currentViewingPinId);

    const pinElement = container.querySelector(`.pin[data-id="${currentViewingPinId}"]`);
    if(pinElement) pinElement.remove();

    closeModal(viewModal);
    currentViewingPinId = null;
});

// Global Clear Action Click Event Listener Inside Drawer
document.getElementById('removeAllPins').addEventListener('click', async () => {
    if (markersData.length === 0) {
        alert("There are no pins on the map to remove!");
        return;
    }

    const confirmWipe = confirm("⚠️ Are you completely sure you want to permanently delete ALL markers from this map? This action cannot be undone.");
    
    if (confirmWipe) {
        await clearAllMarkersFromDB();
        markersData = [];
        const activePins = container.querySelectorAll('.pin');
        activePins.forEach(pin => pin.remove());
        
        resetTimelineToOverview();
        sideMenuDrawer.classList.remove('active');
    }
});

// Map View Auto-Centering Alignment Setup
const centerMap = () => {
    panX = (viewport.clientWidth - mapImage.clientWidth) / 2;
    panY = (viewport.clientHeight - mapImage.clientHeight) / 2;
    updateTransform();
};
mapImage.addEventListener('load', centerMap);
if(mapImage.complete) centerMap();