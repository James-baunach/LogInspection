// --- Configuration ---
const SUPABASE_URL = 'https://ryatmuqskwbhnaurfjnx.supabase.co'; // Replace with your Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXRtdXFza3diaG5hdXJmam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzkzMDYsImV4cCI6MjA2MjE1NTMwNn0.VAocVFJTOmmI7ILplopLo0xnqAYLUHru2jlXUwgPJPg'; // Replace with your Supabase Anon Key
const PROJECT_NUMBER_FUNCTION_NAME = 'generate-project-number';
const MAP_IMAGE_BUCKET = 'inspection-maps';

// County data (Name and Code)
const COUNTIES = [
    { name: 'Barren', code: '009' },
    { name: 'Warren', code: '227' },
    { name: 'Simpson', code: '213' },
    { name: 'Allen', code: '003' },
    { name: 'Edmonson', code: '061' },
    { name: 'Hart', code: '099' }
];

// Kentucky bounding box for simple GPS validation
const KY_MIN_LAT = 36.49;
const KY_MAX_LAT = 39.15;
const KY_MIN_LON = -89.57;
const KY_MAX_LON = -81.96;

// --- Initialize Supabase Client ---
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const authSection = document.getElementById('authSection');
const mainContent = document.getElementById('mainContent');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authStatus = document.getElementById('authStatus');
const userEmailSpan = document.getElementById('userEmail');
const logoutBtn = document.getElementById('logoutBtn');

const passwordChangeSection = document.getElementById('passwordChangeSection');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const updatePasswordBtn = document.getElementById('updatePasswordBtn');
const cancelPasswordChangeBtn = document.getElementById('cancelPasswordChangeBtn');
const passwordChangeStatus = document.getElementById('passwordChangeStatus');
const showPasswordChangeBtn = document.getElementById('showPasswordChangeBtn');

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
    element.textContent = message;
    element.className = type; // 'info', 'success', 'error'
    if (message) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

function resetRequestUI() {
    setStatus(gpsStatus, '');
    setStatus(requestStatus, '');
    setStatus(requestResult, '');
    countySelect.value = "";
    latitudeInput.value = "";
    longitudeInput.value = "";
    requestProjectBtn.disabled = false;
    getGpsBtn.disabled = false;
    requestSection.classList.remove('hidden');
    inspectionSection.classList.add('hidden');
    startNewRequestBtn.classList.add('hidden');
}

function resetInspectionUI() {
    inspectionForm.reset();
    setStatus(uploadStatus, '');
    imagePreview.classList.add('hidden');
    imagePreview.src = '#';
    projectNumberDisplay.value = '';
    projectIdInput.value = '';
    submitInspectionBtn.disabled = false;
    inspectionSection.classList.add('hidden');
    startNewRequestBtn.classList.add('hidden');
}

function populateCountyDropdown() {
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
  navigator.serviceWorker.register('/sw.js')
    .then(reg => console.log('Service Worker registered!', reg))
    .catch(err => console.error('Service Worker registration failed:', err));
}

// --- Authentication ---
async function checkUserSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting session:", error);
        return;
    }
    handleAuthStateChange(session);
}

function handleAuthStateChange(session) {
     const user = session?.user;
     if (user) {
        authSection.classList.add('hidden');
        passwordChangeSection.classList.add('hidden');
        mainContent.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
        resetRequestUI();
        resetInspectionUI();
        requestSection.classList.remove('hidden'); // Show request section first
     } else {
        authSection.classList.remove('hidden');
        mainContent.classList.add('hidden');
        passwordChangeSection.classList.add('hidden');
        userEmailSpan.textContent = '';
        resetRequestUI();
        resetInspectionUI();
     }
}

supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange(session);
});

loginBtn.addEventListener('click', async () => {
    setStatus(authStatus, 'Logging in...', 'info');
    const email = emailInput.value;
    const password = passwordInput.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        setStatus(authStatus, `Login failed: ${error.message}`, 'error');
    } else {
        setStatus(authStatus, '');
        emailInput.value = '';
        passwordInput.value = '';
    }
});

signupBtn.addEventListener('click', async () => {
    setStatus(authStatus, 'Signing up...', 'info');
    const email = emailInput.value;
    const password = passwordInput.value;
     if (password.length < 6) {
        setStatus(authStatus, 'Password must be at least 6 characters long.', 'error');
        return;
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        setStatus(authStatus, `Sign up failed: ${error.message}`, 'error');
    } else {
        setStatus(authStatus, 'Sign up successful! Check your email for verification (if enabled).', 'success');
         emailInput.value = '';
         passwordInput.value = '';
    }
});

logoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Logout failed:", error.message);
        alert(`Logout failed: ${error.message}`);
    }
});

// --- Password Change ---
showPasswordChangeBtn.addEventListener('click', () => {
    mainContent.classList.add('hidden'); // Hide main content
    passwordChangeSection.classList.remove('hidden');
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    setStatus(passwordChangeStatus, '');
});

cancelPasswordChangeBtn.addEventListener('click', () => {
    passwordChangeSection.classList.add('hidden');
    mainContent.classList.remove('hidden'); // Show main content again
});

updatePasswordBtn.addEventListener('click', async () => {
    const currentPassword = currentPasswordInput.value; // Supabase update doesn't require old pass
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (newPassword.length < 6) {
        setStatus(passwordChangeStatus, 'New password must be at least 6 characters.', 'error');
        return;
    }
    if (newPassword !== confirmNewPassword) {
        setStatus(passwordChangeStatus, 'New passwords do not match.', 'error');
        return;
    }

    setStatus(passwordChangeStatus, 'Updating password...', 'info');
    // Note: Supabase `updateUser` with password only needs the new password when user is authenticated.
    // If you wanted to verify old password, you'd signInWithPassword first (but that's extra).
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
        setStatus(passwordChangeStatus, `Error updating password: ${error.message}`, 'error');
    } else {
        setStatus(passwordChangeStatus, 'Password updated successfully!', 'success');
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        setTimeout(() => {
            passwordChangeSection.classList.add('hidden');
            mainContent.classList.remove('hidden');
        }, 2000);
    }
});


// --- Geolocation ---
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

// --- Project Number Request ---
requestProjectBtn.addEventListener('click', async () => {
    const selectedCountyCode = countySelect.value;
    const lat = parseFloat(latitudeInput.value);
    const lon = parseFloat(longitudeInput.value);

    if (!selectedCountyCode) {
        setStatus(requestStatus, 'Please select a county.', 'error');
        return;
    }
    if (isNaN(lat) || isNaN(lon)) {
        setStatus(requestStatus, 'Please enter valid GPS coordinates or use "Get Current GPS".', 'error');
        return;
    }
    if (!isValidKentuckyCoordinates(lat, lon)) {
         setStatus(requestStatus, 'Warning: GPS coordinates appear to be outside Kentucky. Please verify before proceeding.', 'error');
         // Allow proceeding but with warning. Could make this a hard stop.
    }


    setStatus(requestStatus, 'Requesting project number...', 'info');
    requestProjectBtn.disabled = true;
    getGpsBtn.disabled = true;

    try {
        const { data, error } = await supabase.functions.invoke(PROJECT_NUMBER_FUNCTION_NAME, {
            body: { county_code: selectedCountyCode, latitude: lat, longitude: lon },
        });

        if (error) {
            const errorMessage = error.context?.json?.error || error.message || `Function Error (${error.context?.status || 'Unknown'})`;
            console.error('Function invocation error:', error);
            throw new Error(errorMessage);
        }

        if (!data || !data.projectNumber || !data.projectId) {
             console.error('Invalid data received from function:', data);
             throw new Error('Received invalid response from server.');
        }

        setStatus(requestStatus, 'Project number received!', 'success');
        setStatus(requestResult, `New Project Number: ${data.projectNumber}`, 'success');
        projectIdInput.value = data.projectId;
        projectNumberDisplay.value = data.projectNumber;

        inspectionDateInput.value = new Date().toISOString().slice(0, 16);
        requestSection.classList.add('hidden');
        inspectionSection.classList.remove('hidden');
        startNewRequestBtn.classList.remove('hidden');

    } catch (error) {
        console.error('Error requesting project number:', error);
        setStatus(requestStatus, `Error: ${error.message}`, 'error');
        requestProjectBtn.disabled = false;
        getGpsBtn.disabled = false;
    }
});


// --- Inspection Data Upload ---
mapImageInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.remove('hidden');
        }
        reader.readAsDataURL(file);
    } else {
        imagePreview.classList.add('hidden');
        imagePreview.src = '#';
    }
});

inspectionForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitInspectionBtn.disabled = true;
    setStatus(uploadStatus, 'Uploading inspection data...', 'info');

    const projectId = projectIdInput.value;
    const imageFile = mapImageInput.files[0];
    const bmpsMetRadio = document.querySelector('input[name="bmpsMet"]:checked');

    if (!projectId) {
        setStatus(uploadStatus, 'Error: Project ID is missing.', 'error');
        submitInspectionBtn.disabled = false;
        return;
    }
    if (!acreageInput.value || parseFloat(acreageInput.value) <= 0) {
        setStatus(uploadStatus, 'Error: Acreage is required and must be greater than 0.', 'error');
        submitInspectionBtn.disabled = false;
        return;
    }
    if (!loggerNameInput.value.trim()) {
        setStatus(uploadStatus, 'Error: Logger Name is required.', 'error');
        submitInspectionBtn.disabled = false;
        return;
    }
    if (!inspectionDateInput.value) {
        setStatus(uploadStatus, 'Error: Inspection Date/Time is required.', 'error');
        submitInspectionBtn.disabled = false;
        return;
    }
    if (!bmpsMetRadio) {
        setStatus(uploadStatus, 'Error: Please select if BMPs were met.', 'error');
        submitInspectionBtn.disabled = false;
        return;
    }

    let imagePath = null;
    try {
        const user = (await supabase.auth.getUser())?.data?.user;
        if (!user) throw new Error("User not logged in for upload.");

        if (imageFile) {
            setStatus(uploadStatus, 'Uploading map image...', 'info');
            const fileExt = imageFile.name.split('.').pop();
            const uniqueFileName = `${projectId}-${Date.now()}.${fileExt}`;
            // Store under user_id/project_id/filename for easier RLS and organization
            const filePath = `${user.id}/${projectId}/${uniqueFileName}`;

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
            project_id: projectId,
            acreage: parseFloat(acreageInput.value),
            logger_name: loggerNameInput.value.trim(),
            inspection_date: new Date(inspectionDateInput.value).toISOString(),
            bmps_met: bmpsMetRadio.value === 'true',
            map_image_path: imagePath,
            notes: notesInput.value.trim() || null,
        };

        const { error: insertError } = await supabase
            .from('inspections')
            .insert(inspectionData);

        if (insertError) throw new Error(`Database save failed: ${insertError.message}`);

        setStatus(uploadStatus, 'Inspection data uploaded successfully!', 'success');
        // Do not automatically reset here, let user click "Start New Project Request"
        // inspectionForm.reset();
        // imagePreview.classList.add('hidden');

    } catch (error) {
        console.error('Error submitting inspection:', error);
        setStatus(uploadStatus, `Upload failed: ${error.message}`, 'error');
        submitInspectionBtn.disabled = false;
    }
});

// --- Start New Request Button ---
startNewRequestBtn.addEventListener('click', () => {
    resetInspectionUI();
    resetRequestUI();
    requestSection.classList.remove('hidden');
});


// --- Initial Load ---
populateCountyDropdown();
checkUserSession();