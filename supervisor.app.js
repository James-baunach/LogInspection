// --- Configuration ---
const SUPABASE_URL = 'https://ryatmuqskwbhnaurfjnx.supabase.co'; // Replace
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXRtdXFza3diaG5hdXJmam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzkzMDYsImV4cCI6MjA2MjE1NTMwNn0.VAocVFJTOmmI7ILplopLo0xnqAYLUHru2jlXUwgPJPg'; // Replace
const MAP_IMAGE_BUCKET = 'inspection-maps';

// --- Initialize Supabase Client ---
const supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- DOM Elements ---
const supervisorAuthSection = document.getElementById('supervisorAuthSection');
const supervisorMainContent = document.getElementById('supervisorMainContent');
const supervisorLoginBtn = document.getElementById('supervisorLoginBtn');
const supervisorEmailInput = document.getElementById('supervisorEmail');
const supervisorPasswordInput = document.getElementById('supervisorPassword');
const supervisorAuthStatus = document.getElementById('supervisorAuthStatus');
const supervisorUserEmailSpan = document.getElementById('supervisorUserEmail');
const supervisorLogoutBtn = document.getElementById('supervisorLogoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const loadingStatus = document.getElementById('loadingStatus');
const inspectionsTableBody = document.getElementById('inspectionsTableBody');

// Edit Modal Elements
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editInspectionIdInput = document.getElementById('editInspectionId');
const editProjectIdInput = document.getElementById('editProjectId');

const editProjectNumberInput = document.getElementById('editProjectNumber');
const editLatitudeInput = document.getElementById('editLatitude');
const editLongitudeInput = document.getElementById('editLongitude');

const editLoggerNameInput = document.getElementById('editLoggerName');
const editAcreageInput = document.getElementById('editAcreage');
const editInspectionDateInput = document.getElementById('editInspectionDate');
const editNotesInput = document.getElementById('editNotes');
const editMapLink = document.getElementById('editMapLink');
const noMapText = document.getElementById('noMapText');
const saveEditBtn = document.getElementById('saveEditBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editStatus = document.getElementById('editStatus');

// --- Utility Functions ---
function setSupervisorStatus(element, message, type = 'info') {
    element.textContent = message;
    element.className = type; // 'info', 'success', 'error'
    element.hidden = !message;
    if (message) element.classList.remove('hidden'); else element.classList.add('hidden');
}

function formatDateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        return date.toLocaleString(); // Simpler local format
    } catch (e) { return 'Invalid Date'; }
}

function formatDateTimeForInput(isoString) {
     if (!isoString) return '';
     try {
         const date = new Date(isoString);
         const tzoffset = (new Date()).getTimezoneOffset() * 60000;
         const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
         return localISOTime;
     } catch (e) { return ''; }
}

// --- Authentication (Supervisor) ---
async function checkSupervisorSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
        console.error("Error getting supervisor session:", error);
        return;
    }
    handleSupervisorAuthStateChange(session);
}

// This function checks if the logged-in user's email matches the designated supervisor email.
// The actual RLS policies on the backend enforce true supervisor access.
async function isCurrentUserSupervisor(user) {
    if (!user) return false;
    // The RLS function `is_supervisor()` uses the email from the JWT.
    // We can't directly call that from client-side JS for a pre-check.
    // Instead, we rely on RLS to block non-supervisors.
    // For UI purposes, we assume if login is successful with supervisor creds, they are supervisor.
    // A more robust client-side check would involve fetching a protected resource only supervisors can access.
    // For this app, `admin@yourcompany.com` (or whatever is in RLS `is_supervisor()`) is the key.
    // We'll assume the login attempt itself verifies this.
    return true; // Simplified client-side assumption after login
}


async function handleSupervisorAuthStateChange(session) {
     const user = session?.user;
     const isSupervisor = await isCurrentUserSupervisor(user); // Simplified check

     if (user && isSupervisor) {
        supervisorAuthSection.classList.add('hidden');
        supervisorMainContent.classList.remove('hidden');
        supervisorUserEmailSpan.textContent = user.email;
        loadInspections();
     } else {
        supervisorAuthSection.classList.remove('hidden');
        supervisorMainContent.classList.add('hidden');
        supervisorUserEmailSpan.textContent = '';
        inspectionsTableBody.innerHTML = '';
        if (user && !isSupervisor) { // Should not happen if login targets admin user
            setSupervisorStatus(supervisorAuthStatus, 'Access Denied. Not a supervisor account.', 'error');
            supabase.auth.signOut();
        }
     }
}

supabase.auth.onAuthStateChange((_event, session) => {
    handleSupervisorAuthStateChange(session);
});

supervisorLoginBtn.addEventListener('click', async () => {
    setSupervisorStatus(supervisorAuthStatus, 'Logging in...', 'info');
    const email = supervisorEmailInput.value;
    const password = supervisorPasswordInput.value;

    // IMPORTANT: Ensure `email` is the one defined in the `is_supervisor()` RLS function.
    // e.g., 'admin@yourcompany.com'
    if (!email.toLowerCase().includes('admin@')) { // Basic check, replace with your actual supervisor email
        // setSupervisorStatus(supervisorAuthStatus, 'Use the designated supervisor email.', 'error');
        // return;
        // No, we let Supabase Auth try. RLS will be the ultimate gatekeeper.
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        setSupervisorStatus(supervisorAuthStatus, `Login failed: ${error.message}`, 'error');
    } else {
        setSupervisorStatus(supervisorAuthStatus, '');
        supervisorEmailInput.value = '';
        supervisorPasswordInput.value = '';
    }
});

supervisorLogoutBtn.addEventListener('click', async () => {
    const { error } = await supabase.auth.signOut();
    if (error) alert(`Logout failed: ${error.message}`);
});

// --- Load Inspection Data ---
refreshBtn.addEventListener('click', loadInspections);

async function loadInspections() {
    loadingStatus.classList.remove('hidden');
    inspectionsTableBody.innerHTML = '';
    setSupervisorStatus(supervisorAuthStatus,'');

    try {
        const { data: inspections, error } = await supabase
            .from('inspections')
            .select(`
                *,
                projects (
                    id,
                    project_number,
                    county_code,
                    latitude,
                    longitude
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
             if (error.message.includes('permission denied')) {
                 throw new Error("Access Denied: You may not have permission to view all inspections. Contact Admin if you are a supervisor.");
             }
            throw error;
        }

        if (!inspections || inspections.length === 0) {
            inspectionsTableBody.innerHTML = '<tr><td colspan="10">No inspections found.</td></tr>';
        } else {
            inspections.forEach(insp => {
                const row = inspectionsTableBody.insertRow();
                const project = insp.projects || {}; // Handle if project data is missing (should not happen with RLS)
                row.innerHTML = `
                    <td>${project.project_number || 'N/A'}</td>
                    <td>${formatDateTime(insp.inspection_date)}</td>
                    <td>${project.county_code || 'N/A'}</td>
                    <td>${project.latitude !== null ? project.latitude.toFixed(4) : 'N/A'} / ${project.longitude !== null ? project.longitude.toFixed(4) : 'N/A'}</td>
                    <td>${insp.logger_name || ''}</td>
                    <td>${insp.acreage || ''}</td>
                    <td>${insp.bmps_met ? 'Yes' : 'No'}</td>
                    <td>${insp.map_image_path ? `<a href="#" data-path="${insp.map_image_path}" class="map-link">View</a>` : 'No'}</td>
                    <td title="${insp.notes || ''}">${(insp.notes || '').substring(0,30)}${(insp.notes || '').length > 30 ? '...' : ''}</td>
                    <td><button class="action-btn edit-btn" data-inspection-id="${insp.id}">Edit</button></td>
                `;
                // Store full data on the button for easy access in the event listener
                const editButton = row.querySelector('.edit-btn');
                editButton.dataset.inspectionFull = JSON.stringify(insp); // Store full data
            });
        }
    } catch (error) {
        console.error('Error loading inspections:', error);
        setSupervisorStatus(supervisorAuthStatus, `Error loading data: ${error.message}`, 'error');
        inspectionsTableBody.innerHTML = `<tr><td colspan="10">Error: ${error.message}</td></tr>`;
    } finally {
        loadingStatus.classList.add('hidden');
    }
}

// Event delegation for table actions
inspectionsTableBody.addEventListener('click', async (event) => {
    if (event.target.classList.contains('edit-btn')) {
        const inspectionData = JSON.parse(event.target.dataset.inspectionFull);
        openEditModal(inspectionData);
    } else if (event.target.classList.contains('map-link')) {
        event.preventDefault();
        await openMapImage(event.target.dataset.path);
    }
});


async function openMapImage(path) {
    if (!path) return;
    setSupervisorStatus(supervisorAuthStatus, 'Generating map link...', 'info');
    try {
        const { data, error } = await supabase
            .storage
            .from(MAP_IMAGE_BUCKET)
            .createSignedUrl(path, 300); // URL valid for 5 minutes

        if (error) throw error;
        if (data?.signedUrl) {
             window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
             setSupervisorStatus(supervisorAuthStatus, '');
        } else {
            throw new Error("Could not generate signed URL for map.");
        }
    } catch (error) {
        console.error("Error getting map image URL:", error);
        setSupervisorStatus(supervisorAuthStatus, `Error opening map: ${error.message}`, 'error');
    }
}

// --- Edit Modal Logic ---
function openEditModal(inspectionWithProject) {
    const inspection = inspectionWithProject;
    const project = inspectionWithProject.projects || {};

    setSupervisorStatus(editStatus,'');
    editInspectionIdInput.value = inspection.id;
    editProjectIdInput.value = project.id; // Store project ID

    // Project Details
    editProjectNumberInput.value = project.project_number || '';
    editLatitudeInput.value = project.latitude || '';
    editLongitudeInput.value = project.longitude || '';

    // Inspection Details
    editLoggerNameInput.value = inspection.logger_name || '';
    editAcreageInput.value = inspection.acreage || '';
    editInspectionDateInput.value = formatDateTimeForInput(inspection.inspection_date);
    editNotesInput.value = inspection.notes || '';

    const bmpsRadio = editForm.elements['editBmpsMet'];
    bmpsRadio.value = inspection.bmps_met ? 'true' : 'false';

    if (inspection.map_image_path) {
        editMapLink.dataset.path = inspection.map_image_path;
        editMapLink.classList.remove('hidden');
        noMapText.classList.add('hidden');
        editMapLink.onclick = (e) => { // Re-assign onclick for this specific map
             e.preventDefault();
             openMapImage(e.target.dataset.path);
        };
    } else {
        editMapLink.classList.add('hidden');
        noMapText.classList.remove('hidden');
        editMapLink.onclick = null;
    }
    editModal.showModal();
}

cancelEditBtn.addEventListener('click', () => {
    editModal.close();
});

editForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveEditBtn.disabled = true;
    setSupervisorStatus(editStatus, 'Saving changes...', 'info');

    const inspectionId = editInspectionIdInput.value;
    const projectId = editProjectIdInput.value;
    const bmpsMetRadio = document.querySelector('input[name="editBmpsMet"]:checked');

    // Data for 'projects' table
    const projectUpdates = {
        project_number: editProjectNumberInput.value.trim(),
        latitude: parseFloat(editLatitudeInput.value) || null,
        longitude: parseFloat(editLongitudeInput.value) || null,
    };

    // Data for 'inspections' table
    const inspectionUpdates = {
        logger_name: editLoggerNameInput.value.trim() || null,
        acreage: editAcreageInput.value ? parseFloat(editAcreageInput.value) : null,
        inspection_date: editInspectionDateInput.value ? new Date(editInspectionDateInput.value).toISOString() : null,
        bmps_met: bmpsMetRadio ? bmpsMetRadio.value === 'true' : null,
        notes: editNotesInput.value.trim() || null,
    };

    try {
        let projectError, inspectionError;

        // 1. Update Project Details
        if (projectId) { // Ensure we have a project ID to update
            const { error: pError } = await supabase
                .from('projects')
                .update(projectUpdates)
                .eq('id', projectId);
            projectError = pError;
        } else {
            projectError = { message: "Project ID missing for update."};
        }


        if (projectError) {
            throw new Error(`Project update failed: ${projectError.message}`);
        }
         setSupervisorStatus(editStatus, 'Project details saved. Saving inspection...', 'info');

        // 2. Update Inspection Details
        const { error: iError } = await supabase
            .from('inspections')
            .update(inspectionUpdates)
            .eq('id', inspectionId);
        inspectionError = iError;

        if (inspectionError) {
            throw new Error(`Inspection update failed: ${inspectionError.message}`);
        }

        setSupervisorStatus(editStatus, 'All changes saved successfully!', 'success');
        await loadInspections(); // Refresh the table
        setTimeout(() => { editModal.close(); }, 1500);

    } catch (error) {
        console.error('Error saving changes:', error);
        setSupervisorStatus(editStatus, `Save failed: ${error.message}`, 'error');
    } finally {
        saveEditBtn.disabled = false;
    }
});

// --- Initial Load ---
checkSupervisorSession();
