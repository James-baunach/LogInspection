// This function will be called from index-supervisor.html after this script is loaded
function runSupervisorApp() {
    console.log('runSupervisorApp function called.');
    console.log('Is Supabase defined here?', typeof Supabase); // DEBUGGING

    // --- Configuration ---
    const SUPABASE_URL = 'https://ryatmuqskwbhnaurfjnx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXRtdXFza3diaG5hdXJmam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzkzMDYsImV4cCI6MjA2MjE1NTMwNn0.VAocVFJTOmmI7ILplopLo0xnqAYLUHru2jlXUwgPJPg';
    const MAP_IMAGE_BUCKET = 'inspection-maps';

    // --- Initialize Supabase Client ---
    // This is the line that was causing the error
    let supabase; // Declare supabase variable
    try {
        if (typeof Supabase !== 'undefined' && typeof Supabase.createClient === 'function') {
            supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase client initialized successfully.');
        } else {
            console.error('Supabase object or createClient method is not available at the point of initialization.');
            alert('Critical error: Supabase library not loaded correctly. Please check console and contact support.');
            return; // Stop execution if Supabase can't be initialized
        }
    } catch (e) {
        console.error('Error during Supabase client initialization:', e);
        alert('Critical error during Supabase initialization. Please check console.');
        return; // Stop execution
    }


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
        if (!element) {
            console.warn('setSupervisorStatus called with null element for message:', message);
            return;
        }
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
        if (!supabase) { console.error("Supabase client not initialized in checkSupervisorSession."); return; }
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting supervisor session:", error);
            return;
        }
        handleSupervisorAuthStateChange(session);
    }

    async function isCurrentUserSupervisor(user) {
        if (!user) return false;
        return true; // Simplified client-side assumption after login
    }

    async function handleSupervisorAuthStateChange(session) {
        const user = session?.user;
        const isSupervisor = await isCurrentUserSupervisor(user);

        if (user && isSupervisor) {
            supervisorAuthSection.classList.add('hidden');
            supervisorMainContent.classList.remove('hidden');
            supervisorUserEmailSpan.textContent = user.email;
            loadInspections();
        } else {
            supervisorAuthSection.classList.remove('hidden');
            supervisorMainContent.classList.add('hidden');
            supervisorUserEmailSpan.textContent = '';
            if (inspectionsTableBody) inspectionsTableBody.innerHTML = ''; // Clear table if not logged in
            if (user && !isSupervisor) {
                setSupervisorStatus(supervisorAuthStatus, 'Access Denied. Not a supervisor account.', 'error');
                if (supabase) supabase.auth.signOut();
            }
        }
    }

    if (supabase) { // Only set up listeners if supabase client is valid
        supabase.auth.onAuthStateChange((_event, session) => {
            handleSupervisorAuthStateChange(session);
        });
    }


    if (supervisorLoginBtn) {
        supervisorLoginBtn.addEventListener('click', async () => {
            if (!supabase) { console.error("Supabase client not initialized for login."); setSupervisorStatus(supervisorAuthStatus, 'Initialization error. Cannot log in.', 'error'); return; }
            setSupervisorStatus(supervisorAuthStatus, 'Logging in...', 'info');
            const email = supervisorEmailInput.value;
            const password = supervisorPasswordInput.value;

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) {
                setSupervisorStatus(supervisorAuthStatus, `Login failed: ${error.message}`, 'error');
            } else {
                setSupervisorStatus(supervisorAuthStatus, '');
                supervisorEmailInput.value = '';
                supervisorPasswordInput.value = '';
            }
        });
    } else {
        console.error("supervisorLoginBtn not found in the DOM");
    }


    if (supervisorLogoutBtn) {
        supervisorLogoutBtn.addEventListener('click', async () => {
            if (!supabase) { console.error("Supabase client not initialized for logout."); return; }
            const { error } = await supabase.auth.signOut();
            if (error) alert(`Logout failed: ${error.message}`);
        });
    }

    // --- Load Inspection Data ---
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadInspections);
    }

    async function loadInspections() {
        if (!supabase) { console.error("Supabase client not initialized in loadInspections."); return; }
        if (loadingStatus) loadingStatus.classList.remove('hidden');
        if (inspectionsTableBody) inspectionsTableBody.innerHTML = '';
        setSupervisorStatus(supervisorAuthStatus, '');

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
                if (inspectionsTableBody) inspectionsTableBody.innerHTML = '<tr><td colspan="10">No inspections found.</td></tr>';
            } else {
                inspections.forEach(insp => {
                    const row = inspectionsTableBody.insertRow();
                    const project = insp.projects || {};
                    row.innerHTML = `
                        <td>${project.project_number || 'N/A'}</td>
                        <td>${formatDateTime(insp.inspection_date)}</td>
                        <td>${project.county_code || 'N/A'}</td>
                        <td>${project.latitude !== null && project.latitude !== undefined ? project.latitude.toFixed(4) : 'N/A'} / ${project.longitude !== null && project.longitude !== undefined ? project.longitude.toFixed(4) : 'N/A'}</td>
                        <td>${insp.logger_name || ''}</td>
                        <td>${insp.acreage || ''}</td>
                        <td>${insp.bmps_met ? 'Yes' : 'No'}</td>
                        <td>${insp.map_image_path ? `<a href="#" data-path="${insp.map_image_path}" class="map-link">View</a>` : 'No'}</td>
                        <td title="${insp.notes || ''}">${(insp.notes || '').substring(0, 30)}${(insp.notes || '').length > 30 ? '...' : ''}</td>
                        <td><button class="action-btn edit-btn" data-inspection-id="${insp.id}">Edit</button></td>
                    `;
                    const editButton = row.querySelector('.edit-btn');
                    if (editButton) editButton.dataset.inspectionFull = JSON.stringify(insp);
                });
            }
        } catch (error) {
            console.error('Error loading inspections:', error);
            setSupervisorStatus(supervisorAuthStatus, `Error loading data: ${error.message}`, 'error');
            if (inspectionsTableBody) inspectionsTableBody.innerHTML = `<tr><td colspan="10">Error: ${error.message}</td></tr>`;
        } finally {
            if (loadingStatus) loadingStatus.classList.add('hidden');
        }
    }

    if (inspectionsTableBody) {
        inspectionsTableBody.addEventListener('click', async (event) => {
            if (event.target.classList.contains('edit-btn')) {
                const inspectionData = JSON.parse(event.target.dataset.inspectionFull);
                openEditModal(inspectionData);
            } else if (event.target.classList.contains('map-link')) {
                event.preventDefault();
                await openMapImage(event.target.dataset.path);
            }
        });
    }


    async function openMapImage(path) {
        if (!path) return;
        if (!supabase) { console.error("Supabase client not initialized in openMapImage."); return; }
        setSupervisorStatus(supervisorAuthStatus, 'Generating map link...', 'info');
        try {
            const { data, error } = await supabase
                .storage
                .from(MAP_IMAGE_BUCKET)
                .createSignedUrl(path, 300);

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

    function openEditModal(inspectionWithProject) {
        const inspection = inspectionWithProject;
        const project = inspectionWithProject.projects || {};

        setSupervisorStatus(editStatus, '');
        if (editInspectionIdInput) editInspectionIdInput.value = inspection.id;
        if (editProjectIdInput) editProjectIdInput.value = project.id;

        if (editProjectNumberInput) editProjectNumberInput.value = project.project_number || '';
        if (editLatitudeInput) editLatitudeInput.value = project.latitude !== null && project.latitude !== undefined ? project.latitude : '';
        if (editLongitudeInput) editLongitudeInput.value = project.longitude !== null && project.longitude !== undefined ? project.longitude : '';

        if (editLoggerNameInput) editLoggerNameInput.value = inspection.logger_name || '';
        if (editAcreageInput) editAcreageInput.value = inspection.acreage || '';
        if (editInspectionDateInput) editInspectionDateInput.value = formatDateTimeForInput(inspection.inspection_date);
        if (editNotesInput) editNotesInput.value = inspection.notes || '';

        const bmpsRadio = editForm.elements['editBmpsMet'];
        if (bmpsRadio) bmpsRadio.value = inspection.bmps_met ? 'true' : 'false';

        if (inspection.map_image_path) {
            if (editMapLink) {
                editMapLink.dataset.path = inspection.map_image_path;
                editMapLink.classList.remove('hidden');
                editMapLink.onclick = (e) => {
                    e.preventDefault();
                    openMapImage(e.target.dataset.path);
                };
            }
            if (noMapText) noMapText.classList.add('hidden');
        } else {
            if (editMapLink) {
                editMapLink.classList.add('hidden');
                editMapLink.onclick = null;
            }
            if (noMapText) noMapText.classList.remove('hidden');
        }
        if (editModal) editModal.showModal();
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            if (editModal) editModal.close();
        });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!supabase) { console.error("Supabase client not initialized for form submit."); return; }
            if (saveEditBtn) saveEditBtn.disabled = true;
            setSupervisorStatus(editStatus, 'Saving changes...', 'info');

            const inspectionId = editInspectionIdInput.value;
            const projectId = editProjectIdInput.value;
            const bmpsMetRadio = document.querySelector('input[name="editBmpsMet"]:checked');

            const projectUpdates = {
                project_number: editProjectNumberInput.value.trim(),
                latitude: editLatitudeInput.value ? parseFloat(editLatitudeInput.value) : null,
                longitude: editLongitudeInput.value ? parseFloat(editLongitudeInput.value) : null,
            };

            const inspectionUpdates = {
                logger_name: editLoggerNameInput.value.trim() || null,
                acreage: editAcreageInput.value ? parseFloat(editAcreageInput.value) : null,
                inspection_date: editInspectionDateInput.value ? new Date(editInspectionDateInput.value).toISOString() : null,
                bmps_met: bmpsMetRadio ? bmpsMetRadio.value === 'true' : null,
                notes: editNotesInput.value.trim() || null,
            };

            try {
                let projectError, inspectionError;

                if (projectId) {
                    const { error: pError } = await supabase
                        .from('projects')
                        .update(projectUpdates)
                        .eq('id', projectId);
                    projectError = pError;
                } else {
                    projectError = { message: "Project ID missing for update." };
                }

                if (projectError) {
                    throw new Error(`Project update failed: ${projectError.message}`);
                }
                setSupervisorStatus(editStatus, 'Project details saved. Saving inspection...', 'info');

                const { error: iError } = await supabase
                    .from('inspections')
                    .update(inspectionUpdates)
                    .eq('id', inspectionId);
                inspectionError = iError;

                if (inspectionError) {
                    throw new Error(`Inspection update failed: ${inspectionError.message}`);
                }

                setSupervisorStatus(editStatus, 'All changes saved successfully!', 'success');
                await loadInspections();
                setTimeout(() => { if (editModal) editModal.close(); }, 1500);

            } catch (error) {
                console.error('Error saving changes:', error);
                setSupervisorStatus(editStatus, `Save failed: ${error.message}`, 'error');
            } finally {
                if (saveEditBtn) saveEditBtn.disabled = false;
            }
        });
    }

    // --- Initial Load ---
    // Check if Supabase client was initialized before trying to use it
    if (supabase) {
        checkSupervisorSession();
    } else {
        console.error("Supabase client failed to initialize. App cannot start correctly.");
        // Optionally display an error to the user in the UI
        if (supervisorAuthStatus) setSupervisorStatus(supervisorAuthStatus, 'Critical Error: App cannot connect to backend. Please refresh or contact support.', 'error');
    }

    console.log('End of runSupervisorApp function.');
} // End of runSupervisorApp function

// Make the initialization function available globally
window.runSupervisorApp = runSupervisorApp;
