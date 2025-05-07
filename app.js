function runWorkerApp() {
    // --- Configuration ---
    const SUPABASE_URL = 'https://ryatmuqskwbhnaurfjnx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXRtdXFza3diaG5hdXJmam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzkzMDYsImV4cCI6MjA2MjE1NTMwNn0.VAocVFJTOmmI7ILplopLo0xnqAYLUHru2jlXUwgPJPg';
    const PROJECT_NUMBER_FUNCTION_NAME = 'generate-project-number';
    const MAP_IMAGE_BUCKET = 'inspection-maps';

    const COUNTIES = [
        { name: 'Barren', code: '009' }, { name: 'Warren', code: '227' },
        { name: 'Simpson', code: '213' }, { name: 'Allen', code: '003' },
        { name: 'Edmonson', code: '061' }, { name: 'Hart', code: '099' }
    ];
    const KY_MIN_LAT = 36.49, KY_MAX_LAT = 39.15, KY_MIN_LON = -89.57, KY_MAX_LON = -81.96;

    // --- Initialize Supabase Client ---
    let supabase;
    if (typeof Supabase !== 'undefined' && Supabase.createClient) {
        supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase object not available for worker app init.");
        alert("Critical error: Failed to initialize backend connection.");
        return;
    }

    // --- DOM Elements ---
    // Auth related DOM elements are no longer needed from here.
    // const authSection = document.getElementById('authSection');
    // ... and other auth related ones

    const mainContent = document.getElementById('mainContent'); // Still need this
    const requestSection = document.getElementById('requestSection');
    const countySelect = document.getElementById('countySelect');
    const latitudeInput = document.getElementById('latitude');
    const longitudeInput = document.getElementById('longitude');
    const getGpsBtn = document.getElementById('getGpsBtn');
    const gpsStatus = document.getElementById('gpsStatus');
    const requestProjectBtn = document.getElementById('requestProjectBtn');
    const requestStatus = document.getElementById('requestStatus');
    const requestResult = document.getElementById('requestResult');

    const inspectionSection = document.getElementById('inspectionSection');
    const inspectionForm = document.getElementById('inspectionForm');
    const projectIdInput = document.getElementById('projectId');
    const projectNumberDisplay = document.getElementById('projectNumberDisplay');
    const acreageInput = document.getElementById('acreage');
    const loggerNameInput = document.getElementById('loggerName');
    const inspectionDateInput = document.getElementById('inspectionDate');
    const mapImageInput = document.getElementById('mapImage');
    const imagePreview = document.getElementById('imagePreview');
    const notesInput = document.getElementById('notes');
    const submitInspectionBtn = document.getElementById('submitInspectionBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    const startNewRequestBtn = document.getElementById('startNewRequestBtn');

    // --- Utility Functions ---
    function setStatus(element, message, type = 'info') {
        if (!element) return;
        element.textContent = message;
        element.className = type;
        element.hidden = !message;
        if (message) element.classList.remove('hidden'); else element.classList.add('hidden');

    }

    function resetRequestUI() {
        setStatus(gpsStatus, '');
        setStatus(requestStatus, '');
        setStatus(requestResult, '');
        if (countySelect) countySelect.value = "";
        if (latitudeInput) latitudeInput.value = "";
        if (longitudeInput) longitudeInput.value = "";
        if (requestProjectBtn) requestProjectBtn.disabled = false;
        if (getGpsBtn) getGpsBtn.disabled = false;
        if (requestSection) requestSection.classList.remove('hidden');
        if (inspectionSection) inspectionSection.classList.add('hidden');
        if (startNewRequestBtn) startNewRequestBtn.classList.add('hidden');
    }

    function resetInspectionUI() {
        if (inspectionForm) inspectionForm.reset();
        setStatus(uploadStatus, '');
        if (imagePreview) {
            imagePreview.classList.add('hidden');
            imagePreview.src = '#';
        }
        if (projectNumberDisplay) projectNumberDisplay.value = '';
        if (projectIdInput) projectIdInput.value = '';
        if (submitInspectionBtn) submitInspectionBtn.disabled = false;
        if (inspectionSection) inspectionSection.classList.add('hidden');
        if (startNewRequestBtn) startNewRequestBtn.classList.add('hidden');
    }

    function populateCountyDropdown() {
        if (!countySelect) return;
        COUNTIES.forEach(county => {
            const option = document.createElement('option');
            option.value = county.code;
            option.textContent = `${county.name} (${county.code})`;
            countySelect.appendChild(option);
        });
    }

    function isValidKentuckyCoordinates(latitude, longitude) {
      return latitude >= KY_MIN_LAT && latitude <= KY_MAX_LAT &&
             longitude >= KY_MIN_LON && longitude <= KY_MAX_LON;
    }

    // --- PWA Service Worker ---
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js') // Relative path
        .then(reg => console.log('Service Worker registered!', reg))
        .catch(err => console.error('Service Worker registration failed:', err));
    }

    // --- Authentication related functions REMOVED ---
    // checkUserSession, handleAuthStateChange, loginBtn, signupBtn, logoutBtn, password change logic

    // --- Geolocation ---
    if (getGpsBtn) {
        getGpsBtn.addEventListener('click', () => {
            setStatus(gpsStatus, 'Getting GPS coordinates...', 'info');
            getGpsBtn.disabled = true;
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    if (isValidKentuckyCoordinates(latitude, longitude)) {
                        latitudeInput.value = latitude.toFixed(6);
                        longitudeInput.value = longitude.toFixed(6);
                        setStatus(gpsStatus, `Coordinates found: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, 'success');
                    } else {
                        latitudeInput.value = latitude.toFixed(6);
                        longitudeInput.value = longitude.toFixed(6);
                        setStatus(gpsStatus, `Warning: Coordinates (${latitude.toFixed(5)}, ${longitude.toFixed(5)}) may be outside Kentucky. Please verify.`, 'info');
                    }
                    getGpsBtn.disabled = false;
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    setStatus(gpsStatus, `Error getting location: ${error.message}. Please enter manually.`, 'error');
                    getGpsBtn.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        });
    }

    // --- Project Number Request ---
    if (requestProjectBtn) {
        requestProjectBtn.addEventListener('click', async () => {
            const selectedCountyCode = countySelect.value;
            const lat = parseFloat(latitudeInput.value);
            const lon = parseFloat(longitudeInput.value);

            if (!selectedCountyCode) { setStatus(requestStatus, 'Please select a county.', 'error'); return; }
            if (isNaN(lat) || isNaN(lon)) { setStatus(requestStatus, 'Please enter valid GPS coordinates or use "Get Current GPS".', 'error'); return; }
            // Warning for out of KY is fine, proceed.

            setStatus(requestStatus, 'Requesting project number...', 'info');
            requestProjectBtn.disabled = true;
            if (getGpsBtn) getGpsBtn.disabled = true;

            try {
                // No user needed for function invocation now
                const { data, error } = await supabase.functions.invoke(PROJECT_NUMBER_FUNCTION_NAME, {
                    body: { county_code: selectedCountyCode, latitude: lat, longitude: lon },
                });

                if (error) {
                    const errorMessage = error.context?.json?.error || error.message || `Function Error (${error.context?.status || 'Unknown'})`;
                    throw new Error(errorMessage);
                }
                if (!data || !data.projectNumber || !data.projectId) { throw new Error('Received invalid response from server.'); }

                setStatus(requestStatus, 'Project number received!', 'success');
                setStatus(requestResult, `New Project Number: ${data.projectNumber}`, 'success');
                projectIdInput.value = data.projectId;
                projectNumberDisplay.value = data.projectNumber;

                if(inspectionDateInput) inspectionDateInput.value = new Date().toISOString().slice(0, 16);
                if(requestSection) requestSection.classList.add('hidden');
                if(inspectionSection) inspectionSection.classList.remove('hidden');
                if(startNewRequestBtn) startNewRequestBtn.classList.remove('hidden');

            } catch (error) {
                console.error('Error requesting project number:', error);
                setStatus(requestStatus, `Error: ${error.message}`, 'error');
            } finally {
                 if (requestProjectBtn) requestProjectBtn.disabled = false;
                 if (getGpsBtn) getGpsBtn.disabled = false;
            }
        });
    }

    // --- Inspection Data Upload ---
    if (mapImageInput) {
        mapImageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && imagePreview) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imagePreview.src = e.target.result;
                    imagePreview.classList.remove('hidden');
                }
                reader.readAsDataURL(file);
            } else if (imagePreview) {
                imagePreview.classList.add('hidden');
                imagePreview.src = '#';
            }
        });
    }

    if (inspectionForm) {
        inspectionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (submitInspectionBtn) submitInspectionBtn.disabled = true;
            setStatus(uploadStatus, 'Uploading inspection data...', 'info');

            const currentProjectId = projectIdInput.value; // Renamed to avoid conflict
            const imageFile = mapImageInput.files[0];
            const bmpsMetRadio = document.querySelector('input[name="bmpsMet"]:checked');

            if (!currentProjectId) { setStatus(uploadStatus, 'Error: Project ID is missing.', 'error'); if(submitInspectionBtn) submitInspectionBtn.disabled = false; return; }
            if (!acreageInput.value || parseFloat(acreageInput.value) <= 0) { setStatus(uploadStatus, 'Error: Acreage is required and must be > 0.', 'error'); if(submitInspectionBtn) submitInspectionBtn.disabled = false; return; }
            if (!loggerNameInput.value.trim()) { setStatus(uploadStatus, 'Error: Logger Name is required.', 'error'); if(submitInspectionBtn) submitInspectionBtn.disabled = false; return; }
            if (!inspectionDateInput.value) { setStatus(uploadStatus, 'Error: Inspection Date/Time is required.', 'error'); if(submitInspectionBtn) submitInspectionBtn.disabled = false; return; }
            if (!bmpsMetRadio) { setStatus(uploadStatus, 'Error: Please select if BMPs were met.', 'error'); if(submitInspectionBtn) submitInspectionBtn.disabled = false; return; }

            let imagePath = null;
            try {
                // No user needed for image path if policies are open or service role is used by function (not here)
                if (imageFile) {
                    setStatus(uploadStatus, 'Uploading map image...', 'info');
                    const fileExt = imageFile.name.split('.').pop();
                    const uniqueFileName = `${currentProjectId}-${Date.now()}.${fileExt}`;
                    // Simpler path for anon uploads if storage policies allow directly to bucket root or a generic folder
                    // Or a path based on projectId if policies are set up for that without user_id
                    const filePath = `public_uploads/${uniqueFileName}`; // Example generic path

                    const { data: uploadData, error: uploadError } = await supabase
                        .storage
                        .from(MAP_IMAGE_BUCKET)
                        .upload(filePath, imageFile, { upsert: false });

                    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
                    imagePath = uploadData.path;
                    setStatus(uploadStatus, 'Image uploaded. Saving data...', 'info');
                } else {
                    setStatus(uploadStatus, 'No image. Saving data...', 'info');
                }

                const inspectionData = {
                    project_id: currentProjectId,
                    acreage: parseFloat(acreageInput.value),
                    logger_name: loggerNameInput.value.trim(),
                    inspection_date: new Date(inspectionDateInput.value).toISOString(),
                    bmps_met: bmpsMetRadio.value === 'true',
                    map_image_path: imagePath,
                    notes: notesInput.value.trim() || null,
                };

                const { error: insertError } = await supabase.from('inspections').insert(inspectionData);
                if (insertError) throw new Error(`Database save failed: ${insertError.message}`);

                setStatus(uploadStatus, 'Inspection data uploaded successfully!', 'success');
            } catch (error) {
                console.error('Error submitting inspection:', error);
                setStatus(uploadStatus, `Upload failed: ${error.message}`, 'error');
            } finally {
                if (submitInspectionBtn) submitInspectionBtn.disabled = false;
            }
        });
    }

    // --- Start New Request Button ---
    if (startNewRequestBtn) {
        startNewRequestBtn.addEventListener('click', () => {
            resetInspectionUI();
            resetRequestUI();
            if (requestSection) requestSection.classList.remove('hidden');
        });
    }

    // --- Initial Load ---
    populateCountyDropdown();
    resetRequestUI(); // Show the request UI by default
    if (mainContent) mainContent.classList.remove('hidden'); // Show main content immediately
    if (requestSection) requestSection.classList.remove('hidden');
}
window.runWorkerApp = runWorkerApp; // Make it globally available
