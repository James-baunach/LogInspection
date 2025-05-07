function runSupervisorApp() {
    // --- Configuration ---
    const SUPABASE_URL = 'https://ryatmuqskwbhnaurfjnx.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5YXRtdXFza3diaG5hdXJmam54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1NzkzMDYsImV4cCI6MjA2MjE1NTMwNn0.VAocVFJTOmmI7ILplopLo0xnqAYLUHru2jlXUwgPJPg';
    const MAP_IMAGE_BUCKET = 'inspection-maps';

    // --- Initialize Supabase Client ---
    let supabase;
    if (typeof Supabase !== 'undefined' && Supabase.createClient) {
        supabase = Supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Supabase object not available for supervisor app init.");
        alert("Critical error: Failed to initialize backend connection for supervisor app.");
        return;
    }

    // --- DOM Elements ---
    // supervisorAuthSection related elements are no longer needed.
    const supervisorMainContent = document.getElementById('supervisorMainContent'); // Still needed
    const refreshBtn = document.getElementById('refreshBtn');
    const loadingStatus = document.getElementById('loadingStatus');
    const inspectionsTableBody = document.getElementById('inspectionsTableBody');

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
    const supervisorAuthStatus = document.getElementById('supervisorAuthStatus'); // For general status messages now

    // --- Utility Functions (keep them) ---
    function setSupervisorStatus(element, message, type = 'info') {
        if (!element) return;
        element.textContent = message;
        element.className = type;
        element.hidden = !message;
        if (message) element.classList.remove('hidden'); else element.classList.add('hidden');
    }
    function formatDateTime(isoString) { /* ... same as before ... */
        if (!isoString) return 'N/A'; try { const date = new Date(isoString); return date.toLocaleString(); } catch (e) { return 'Invalid Date'; }
    }
    function formatDateTimeForInput(isoString) { /* ... same as before ... */
        if (!isoString) return ''; try { const date = new Date(isoString); const tzoffset = (new Date()).getTimezoneOffset() * 60000; const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16); return localISOTime; } catch (e) { return ''; }
    }

    // --- Authentication related functions REMOVED ---
    // checkSupervisorSession, handleSupervisorAuthStateChange, supervisorLoginBtn, supervisorLogoutBtn, isCurrentUserSupervisor

    // --- Load Inspection Data ---
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadInspections);
    }

    async function loadInspections() {
        if (loadingStatus) loadingStatus.classList.remove('hidden');
        if (inspectionsTableBody) inspectionsTableBody.innerHTML = '';
        if (supervisorAuthStatus) setSupervisorStatus(supervisorAuthStatus, ''); // Clear old auth statuses

        try {
            const { data: inspections, error } = await supabase
                .from('inspections')
                .select(`*, projects (id, project_number, county_code, latitude, longitude)`)
                .order('created_at', { ascending: false });

            if (error) { throw error; } // RLS will handle access with anon key

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
                        <td>${project.latitude?.toFixed(4) || 'N/A'} / ${project.longitude?.toFixed(4) || 'N/A'}</td>
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
            if (supervisorAuthStatus) setSupervisorStatus(supervisorAuthStatus, `Error loading data: ${error.message}`, 'error');
            if (inspectionsTableBody) inspectionsTableBody.innerHTML = `<tr><td colspan="10">Error: ${error.message}</td></tr>`;
        } finally {
            if (loadingStatus) loadingStatus.classList.add('hidden');
        }
    }

    // --- Event delegation, openMapImage, openEditModal, form submit logic (mostly same, just remove auth checks) ---
    // Ensure these functions are robust if supabase client isn't ready, though the outer wrapper should prevent that.
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

    async function openMapImage(path) { /* ... same as before, ensure supabase is defined ... */
        if (!path || !supabase) return;
        setSupervisorStatus(supervisorAuthStatus, 'Generating map link...', 'info');
        try { /* ... */ } catch (error) { /* ... */ }
    }
    function openEditModal(inspectionWithProject) { /* ... same as before, but no auth context ... */
        // ... (code for populating modal fields remains largely the same)
        const inspection = inspectionWithProject;
        const project = inspectionWithProject.projects || {};

        setSupervisorStatus(editStatus,'');
        if (editInspectionIdInput) editInspectionIdInput.value = inspection.id;
        if (editProjectIdInput) editProjectIdInput.value = project.id;

        if (editProjectNumberInput) editProjectNumberInput.value = project.project_number || '';
        if (editLatitudeInput) editLatitudeInput.value = project.latitude !== null && project.latitude !== undefined ? project.latitude : '';
        if (editLongitudeInput) editLongitudeInput.value = project.longitude !== null && project.longitude !== undefined ? project.longitude : '';
        // ... rest of the fields
        const bmpsRadio = editForm.elements['editBmpsMet'];
        if (bmpsRadio) bmpsRadio.value = inspection.bmps_met ? 'true' : 'false';
        if (editNotesInput) editNotesInput.value = inspection.notes || '';


        if (inspection.map_image_path) {
            if (editMapLink) {
                editMapLink.dataset.path = inspection.map_image_path;
                editMapLink.classList.remove('hidden');
                editMapLink.onclick = (e) => { e.preventDefault(); openMapImage(e.target.dataset.path); };
            }
            if (noMapText) noMapText.classList.add('hidden');
        } else {
            if (editMapLink) { editMapLink.classList.add('hidden'); editMapLink.onclick = null; }
            if (noMapText) noMapText.classList.remove('hidden');
        }
        if (editModal) editModal.showModal();
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => { if (editModal) editModal.close(); });
    }

    if (editForm) {
        editForm.addEventListener('submit', async (event) => { /* ... same as before, ensure supabase is defined ... */
            event.preventDefault();
            if (!supabase) { console.error("Supabase client not available for edit submit."); return; }
            // ... rest of the submit logic
            if (saveEditBtn) saveEditBtn.disabled = true;
            setSupervisorStatus(editStatus, 'Saving changes...', 'info');

            const inspectionId = editInspectionIdInput.value;
            const projectIdVal = editProjectIdInput.value; // renamed
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
                if (projectIdVal) {
                    const { error: pError } = await supabase.from('projects').update(projectUpdates).eq('id', projectIdVal);
                    if (pError) throw new Error(`Project update failed: ${pError.message}`);
                } else { throw new Error("Project ID missing for update."); }
                setSupervisorStatus(editStatus, 'Project details saved. Saving inspection...', 'info');
                const { error: iError } = await supabase.from('inspections').update(inspectionUpdates).eq('id', inspectionId);
                if (iError) throw new Error(`Inspection update failed: ${iError.message}`);
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
    if (supervisorMainContent) supervisorMainContent.classList.remove('hidden'); // Show content immediately
    loadInspections(); // Load data immediately
}
window.runSupervisorApp = runSupervisorApp; // Make it globally available
