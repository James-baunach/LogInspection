document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded, script.js main function running."); // Log at start of main function

    // --- CONFIGURATION ---
    const PASSWORD = "Smokey123";
    // IMPORTANT: This URL should be your deployed Google Apps Script URL
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby2FN4treb14pu4X4LsDWPWipEf9Hqfz9Si3nrn1OIIJU6L0RD2-GlKM0_h8tviJVjbfw/exec"; 

    // --- DOM ELEMENTS ---
    const pages = {
        page1: document.getElementById('page1'),
        page2: document.getElementById('page2'),
        page3: document.getElementById('page3'),
    };

    // Page 1
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('loginButton');
    const loginError = document.getElementById('loginError');

    // Page 2
    const countySelect = document.getElementById('countySelect');
    const gpsCoordinatesInput = document.getElementById('gpsCoordinates');
    const getGPSButton = document.getElementById('getGPSButton');
    const submitCountyGPSButton = document.getElementById('submitCountyGPSButton');
    const page2Error = document.getElementById('page2Error');

    // Page 3
    const formSiteCode = document.getElementById('formSiteCode');
    const formLat = document.getElementById('formLat');
    const formLong = document.getElementById('formLong');
    const formDisMethod = document.getElementById('formDisMethod');
    const saveHeaderInfoButton = document.getElementById('saveHeaderInfoButton');
    const headerInfoMsg = document.getElementById('headerInfoMsg');
    const submitFormButton = document.getElementById('submitFormButton');
    const page3Error = document.getElementById('page3Error');
    
    // Static Header Fields (Page 3)
    const formBranch = document.getElementById('formBranch');
    const formBranchAddress = document.getElementById('formBranchAddress');
    const formBranchCityStateZip = document.getElementById('formBranchCityStateZip');
    const formContactBranchOffice = document.getElementById('formContactBranchOffice');


    // --- STATE ---
    let currentSiteCode = null;
    let currentCountyCode = null;
    let currentLatitude = null;
    let currentLongitude = null;

    // --- COUNTY DATA (Cleaned from CSV) ---
    const countyData = [
        { name: "Adair", code: "001" }, { name: "Allen", code: "002" },
        { name: "Anderson", code: "003" }, { name: "Ballard", code: "004" },
        { name: "Barren", code: "005" }, { name: "Bath", code: "006" },
        { name: "Bell", code: "007" }, { name: "Boone", code: "008" },
        { name: "Bourbon", code: "009" }, { name: "Boyd", code: "010" },
        { name: "Boyle", code: "011" }, { name: "Bracken", code: "012" },
        { name: "Breathitt", code: "013" }, { name: "Breckinridge", code: "014" },
        { name: "Bullitt", code: "015" }, { name: "Butler", code: "016" },
        { name: "Caldwell", code: "017" }, { name: "Calloway", code: "018" },
        { name: "Campbell", code: "019" }, { name: "Carlisle", code: "020" },
        { name: "Carroll", code: "021" }, { name: "Carter", code: "022" },
        { name: "Casey", code: "023" }, { name: "Christian", code: "024" },
        { name: "Clark", code: "025" }, { name: "Clay", code: "026" },
        { name: "Clinton", code: "027" }, { name: "Crittenden", code: "028" },
        { name: "Cumberland", code: "029" }, { name: "Daviess", code: "030" },
        { name: "Edmonson", code: "031" }, { name: "Elliott", code: "032" },
        { name: "Estill", code: "033" }, { name: "Fayette", code: "034" },
        { name: "Fleming", code: "035" }, { name: "Floyd", code: "036" },
        { name: "Franklin", code: "037" }, { name: "Fulton", code: "038" },
        { name: "Gallatin", code: "039" }, { name: "Garrard", code: "040" },
        { name: "Grant", code: "041" }, { name: "Graves", code: "042" },
        { name: "Grayson", code: "043" }, { name: "Green", code: "044" },
        { name: "Greenup", code: "045" }, { name: "Hancock", code: "046" },
        { name: "Hardin", code: "047" }, { name: "Harlan", code: "048" },
        { name: "Harrison", code: "049" }, { name: "Hart", code: "050" },
        { name: "Henderson", code: "051" }, { name: "Henry", code: "052" },
        { name: "Hickman", code: "053" }, { name: "Hopkins", code: "054" },
        { name: "Jackson", code: "055" }, { name: "Jefferson", code: "056" },
        { name: "Jessamine", code: "057" }, { name: "Johnson", code: "058" },
        { name: "Kenton", code: "059" }, { name: "Knott", code: "060" },
        { name: "Knox", code: "061" }, { name: "LaRue", code: "062" },
        { name: "Laurel", code: "063" }, { name: "Lawrence", code: "064" },
        { name: "Lee", code: "065" }, { name: "Leslie", code: "066" },
        { name: "Letcher", code: "067" }, { name: "Lewis", code: "068" },
        { name: "Lincoln", code: "069" }, { name: "Livingston", code: "070" },
        { name: "Logan", code: "071" }, { name: "Lyon", code: "072" },
        { name: "Madison", code: "073" }, { name: "Magoffin", code: "074" },
        { name: "Marion", code: "075" }, { name: "Marshall", code: "076" },
        { name: "Martin", code: "077" }, { name: "Mason", code: "078" },
        { name: "McCracken", code: "079" }, { name: "McCreary", code: "080" },
        { name: "McLean", code: "081" }, { name: "Meade", code: "082" },
        { name: "Menifee", code: "083" }, { name: "Mercer", code: "084" },
        { name: "Metcalfe", code: "085" }, { name: "Monroe", code: "086" },
        { name: "Montgomery", code: "087" }, { name: "Morgan", code: "088" },
        { name: "Muhlenberg", code: "089" }, { name: "Nelson", code: "090" },
        { name: "Nicholas", code: "091" }, { name: "Ohio", code: "092" },
        { name: "Oldham", code: "093" }, { name: "Owen", code: "094" },
        { name: "Owsley", code: "095" }, { name: "Pendleton", code: "096" },
        { name: "Perry", code: "097" }, { name: "Pike", code: "098" },
        { name: "Powell", code: "099" }, { name: "Pulaski", code: "100" },
        { name: "Robertson", code: "101" }, { name: "Rockcastle", code: "102" },
        { name: "Rowan", code: "103" }, { name: "Russell", code: "104" },
        { name: "Scott", code: "105" }, { name: "Shelby", code: "106" },
        { name: "Simpson", code: "107" }, { name: "Spencer", code: "108" },
        { name: "Taylor", code: "109" }, { name: "Todd", code: "110" },
        { name: "Trigg", code: "111" }, { name: "Trimble", code: "112" },
        { name: "Union", code: "113" }, { name: "Warren", code: "114" },
        { name: "Washington", code: "115" }, { name: "Wayne", code: "116" },
        { name: "Webster", code: "117" }, { name: "Whitley", code: "118" },
        { name: "Wolfe", code: "119" }, { name: "Woodford", code: "120" }
    ];


    // --- HELPER FUNCTIONS ---
    function showPage(pageId) {
        console.log(`showPage called with pageId: ${pageId}`); 
        Object.values(pages).forEach(page => {
            page.classList.remove('active');
        });
        if (pages[pageId]) { 
            console.log(`Adding 'active' to page: ${pages[pageId].id}`); 
            pages[pageId].classList.add('active');
        } else {
            console.error(`Error in showPage: Element for pageId '${pageId}' not found in 'pages' object.`);
        }
    }

    function getCurrentYearYY() {
        return new Date().getFullYear().toString().slice(-2);
    }

    function populateCountyDropdown() {
        console.log("populateCountyDropdown function called"); 
        countyData.forEach(county => {
            const option = document.createElement('option');
            option.value = county.code;
            option.textContent = county.name;
            countySelect.appendChild(option);
        });
    }

    function loadHeaderInfo() {
        formBranch.value = localStorage.getItem('headerBranch') || '';
        formBranchAddress.value = localStorage.getItem('headerBranchAddress') || '';
        formBranchCityStateZip.value = localStorage.getItem('headerBranchCityStateZip') || '';
        formContactBranchOffice.value = localStorage.getItem('headerContactBranchOffice') || '';
    }

    function saveHeaderInfo() {
        localStorage.setItem('headerBranch', formBranch.value);
        localStorage.setItem('headerBranchAddress', formBranchAddress.value);
        localStorage.setItem('headerBranchCityStateZip', formBranchCityStateZip.value);
        localStorage.setItem('headerContactBranchOffice', formContactBranchOffice.value);
        headerInfoMsg.textContent = "Header info saved!";
        setTimeout(() => headerInfoMsg.textContent = "", 3000);
    }
    
    function getRadioValue(name) {
        const radio = document.querySelector(`input[name="${name}"]:checked`);
        return radio ? radio.value : "";
    }


    // --- EVENT LISTENERS ---
    // Page 1: Login
    loginButton.addEventListener('click', () => {
        console.log("Login button clicked."); 
        loginError.textContent = "";
        if (passwordInput.value === PASSWORD) {
            console.log("Password correct."); 
            passwordInput.value = ""; 
            showPage('page2');
            console.log("Called showPage('page2')."); 
        } else {
            console.log("Password incorrect."); 
            loginError.textContent = "Incorrect password.";
        }
    });

    // Page 2: County & GPS
    getGPSButton.addEventListener('click', () => {
        page2Error.textContent = "";
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                currentLatitude = position.coords.latitude.toFixed(5);
                currentLongitude = position.coords.longitude.toFixed(5);
                gpsCoordinatesInput.value = `${currentLatitude}, ${currentLongitude}`;
            }, () => {
                page2Error.textContent = "Unable to retrieve location. Please enter manually.";
            });
        } else {
            page2Error.textContent = "Geolocation is not supported by this browser.";
        }
    });

    submitCountyGPSButton.addEventListener('click', async () => {
        page2Error.textContent = "";
        const selectedCountyValue = countySelect.value;
        const gpsText = gpsCoordinatesInput.value.trim();

        if (!selectedCountyValue) {
            page2Error.textContent = "Please select a county.";
            return;
        }
        if (!gpsText) {
            page2Error.textContent = "Please enter or get GPS coordinates.";
            return;
        }

        const gpsParts = gpsText.split(',').map(s => s.trim());
        if (gpsParts.length !== 2 || isNaN(parseFloat(gpsParts[0])) || isNaN(parseFloat(gpsParts[1]))) {
            page2Error.textContent = "Invalid GPS format. Use Latitude, Longitude (e.g., 38.123, -84.123).";
            return;
        }
        
        currentLatitude = gpsParts[0];
        currentLongitude = gpsParts[1];
        currentCountyCode = selectedCountyValue;
        const yearYY = getCurrentYearYY();

        submitCountyGPSButton.disabled = true;
        submitCountyGPSButton.textContent = "Generating Site Code...";
        try {
            if (SCRIPT_URL === "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") { // This check should ideally be more robust or removed if URL is always set
                throw new Error("Google Apps Script URL not configured in script.js");
            }
            const response = await fetch(`${SCRIPT_URL}?countyCode=${currentCountyCode}&year=${yearYY}`);
            
            const data = await response.json(); 
            // Log the entire data object received from Apps Script, which includes the 'debug' field
            console.log("Data received from Apps Script:", JSON.stringify(data, null, 2)); 

            if (!response.ok) { 
                const errorMessage = data.error || `Server error: ${response.status}. Review debug info in console.`;
                console.error("Server returned an error status:", response.status, data);
                throw new Error(errorMessage);
            }
            
            if (data.error) {
                console.error("Apps Script returned an error in JSON:", data.error, data.debug || "No debug info.");
                throw new Error(data.error); // This will be displayed on page2Error
            }

            const jobCode = data.jobCode; 
            if (!jobCode) { // Added check for jobCode presence
                console.error("JobCode missing in successful response from Apps Script", data);
                throw new Error("Received success from server but jobCode is missing.");
            }
            currentSiteCode = `${currentCountyCode}-${yearYY}-${jobCode}`;

            formSiteCode.value = currentSiteCode;
            formLat.value = currentLatitude;
            formLong.value = currentLongitude;
            formDisMethod.value = ""; 
            page3Error.textContent = ""; 
            loadHeaderInfo(); 
            showPage('page3');

        } catch (error) {
            console.error("Error fetching job code (in catch block):", error); // Log the actual error object
            page2Error.textContent = `Could not generate Site Code: ${error.message}. Check connection and try again. See console for more details.`;
        } finally {
            submitCountyGPSButton.disabled = false;
            submitCountyGPSButton.textContent = "Submit to Continue";
        }
    });

    // Page 3: Form Submission & PDF Generation
    saveHeaderInfoButton.addEventListener('click', saveHeaderInfo);

    submitFormButton.addEventListener('click', () => {
        page3Error.textContent = "";
        if (!currentSiteCode) {
            page3Error.textContent = "Error: Site Code is missing. Please go back.";
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let yPos = 15;
        const xMargin = 15;
        const lineSpacing = 7;
        const sectionSpacing = 10;

        doc.setFontSize(10);
        doc.text("COMMONWEALTH OF KENTUCKY", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" }); yPos += 5;
        doc.text("ENERGY AND ENVIRONMENT CABINET", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" }); yPos += 5;
        doc.text("DEPARTMENT FOR NATURAL RESOURCES", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" }); yPos += 5;
        doc.text("DIVISION OF FORESTRY", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" }); yPos += sectionSpacing;

        doc.setFontSize(12);
        doc.text("TIMBER HARVESTING INSPECTION REPORT", doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" }); yPos += sectionSpacing;
        
        doc.setFontSize(10);
        doc.text(`BRANCH: ${formBranch.value}`, xMargin, yPos); yPos += lineSpacing;
        doc.text(`Address: ${formBranchAddress.value}`, xMargin, yPos); yPos += lineSpacing;
        doc.text(`City, State, Zip Code: ${formBranchCityStateZip.value}`, xMargin, yPos); yPos += lineSpacing;
        doc.text(`Contact Branch Office at: ${formContactBranchOffice.value}`, xMargin, yPos); yPos += sectionSpacing;

        const topRightX = 130;
        let tempY = yPos - (lineSpacing * 4) - sectionSpacing; 
        if (tempY < 15) tempY = 15; 

        doc.text(`Lat: ${formLat.value}`, topRightX, tempY); tempY += lineSpacing;
        doc.text(`Long: ${formLong.value}`, topRightX, tempY); tempY += lineSpacing;
        doc.text(`Dis. Method: ${formDisMethod.value}`, topRightX, tempY);
        
        doc.text(`SITE CODE: ${formSiteCode.value}`, xMargin, yPos); yPos += lineSpacing;
        
        const inspectionType = getRadioValue('inspectionType');
        doc.text(`INSPECTION TYPE: ${inspectionType}`, xMargin, yPos); yPos += sectionSpacing;

        const col1X = xMargin;
        const col2X = xMargin + 80; 
        let colY = yPos;

        doc.setFontSize(10).setFont(undefined, 'bold');
        doc.text("Owner/Operator:", col1X, colY);
        doc.text("Landowner:", col2X, colY); colY += lineSpacing;
        doc.setFont(undefined, 'normal');

        doc.text(`Name: ${document.getElementById('formOwnerName').value}`, col1X, colY);
        doc.text(`Name: ${document.getElementById('formLandownerName').value}`, col2X, colY); colY += lineSpacing;
        doc.text(`Company: ${document.getElementById('formOwnerCompany').value}`, col1X, colY);
        doc.text(`Address: ${document.getElementById('formLandownerAddress').value}`, col2X, colY); colY += lineSpacing;
        doc.text(`Address: ${document.getElementById('formOwnerAddress').value}`, col1X, colY);
        doc.text(`City, State, Zip: ${document.getElementById('formLandownerCityStateZip').value}`, col2X, colY); colY += lineSpacing;
        doc.text(`City, State, Zip: ${document.getElementById('formOwnerCityStateZip').value}`, col1X, colY);
        doc.text(`Harvest Acreage: ${document.getElementById('formHarvestAcreage').value}`, col2X, colY); colY += lineSpacing;
        doc.text(`Master Logger: ${document.getElementById('formMasterLogger').value}`, col1X, colY);
        doc.text(`Master Logger ID: ${document.getElementById('formMasterLoggerID').value}`, col2X, colY); colY += lineSpacing;
        yPos = colY + sectionSpacing;
        
        doc.text("Location Description:", xMargin, yPos); yPos += 5;
        const locDescLines = doc.splitTextToSize(document.getElementById('formLocationDescription').value, 180);
        doc.text(locDescLines, xMargin, yPos); yPos += (locDescLines.length * (lineSpacing -2) ) + sectionSpacing; // Adjusted spacing for textarea


        doc.setFontSize(10).setFont(undefined, 'bold');
        doc.text("PERFORMANCE STANDARD INSPECTED", xMargin, yPos); yPos += lineSpacing;
        doc.setFont(undefined, 'normal');
        
        const standards = [
            { name: "Master Logger On-site", id: "bmpMasterLogger" },
            { name: "BMP #1-Access Roads, Trails & Landings", id: "bmp1" },
            { name: "BMP #3-Streamside Management Zones (SMZ)", id: "bmp3" },
            { name: "BMP #4-Sinkholes, Sinking Streams & Caves", id: "bmp4" },
            { name: "BMP #5-Fluids & Trash", id: "bmp5" },
            { name: "BMP #7-Fertilizers", id: "bmp7" },
            { name: "BMP #10-Wetlands", id: "bmp10" }
        ];
        
        let yPosForStandardColumn1 = yPos;
        let yPosForStandardColumn2 = yPos;

        standards.forEach((std, index) => {
            const val = getRadioValue(std.id) || 'N/A';
            const text = `${std.name}: ${val}`;
            if (index < 4) { // First column (max 4 items)
                doc.text(text, xMargin, yPosForStandardColumn1);
                yPosForStandardColumn1 += lineSpacing;
            } else { // Second column
                doc.text(text, xMargin + 95, yPosForStandardColumn2); // Adjust X for second column
                yPosForStandardColumn2 += lineSpacing;
            }
        });
        yPos = Math.max(yPosForStandardColumn1, yPosForStandardColumn2) + sectionSpacing - lineSpacing;


        doc.text("COMMENTS/OTHER CONDITIONS:", xMargin, yPos); yPos += 5;
        const commentsLines = doc.splitTextToSize(document.getElementById('formComments').value, 180);
        doc.text(commentsLines, xMargin, yPos); yPos += (commentsLines.length * (lineSpacing-2)) + sectionSpacing; // Adjusted spacing

        doc.setFontSize(10).setFont(undefined, 'bold');
        doc.text("Abatement & Compliance", xMargin, yPos); yPos += lineSpacing;
        doc.setFont(undefined, 'normal');
        doc.text(`TYPE OF ENFORCEMENT ACTION: ${document.getElementById('formEnforcementAction').value}`, xMargin, yPos); yPos += lineSpacing;
        doc.text(`CASE NO.: ${document.getElementById('formCaseNo').value}`, xMargin, yPos); yPos += lineSpacing;
        doc.text(`Remedial measures completed? ${getRadioValue('remedialCompleted')}`, xMargin, yPos); yPos += lineSpacing;
        doc.text("Remedial measures not completed:", xMargin, yPos); yPos += 5;
        const remedialLines = doc.splitTextToSize(document.getElementById('formRemedialNotCompleted').value, 180);
        doc.text(remedialLines, xMargin, yPos); yPos += (remedialLines.length * (lineSpacing-2)) + sectionSpacing; // Adjusted spacing

        doc.text(`INSPECTOR: ${document.getElementById('formInspector').value}`, xMargin, yPos);
        doc.text(`RECEIVED BY: ${document.getElementById('formReceivedBy').value}`, xMargin + 90, yPos); yPos += lineSpacing;
        
        doc.text(`DATE OF INSPECTION: ${document.getElementById('formDateInspection').value}`, xMargin, yPos);
        doc.text(`SIGNATURE: ____________________`, xMargin + 90, yPos); yPos += lineSpacing;
        
        let deliveryText = "Delivery: ";
        if(document.getElementById('formPersonalService').checked) deliveryText += "Personal Service, ";
        if(document.getElementById('formFirstClassMail').checked) deliveryText += "First Class Mail, ";
        deliveryText += `Cert. Mail No: ${document.getElementById('formCertifiedMailNo').value}`;
        doc.text(deliveryText, xMargin, yPos); yPos += sectionSpacing;

        doc.text("www.kentucky.gov", xMargin, doc.internal.pageSize.getHeight() - 10);
        doc.text("Kentucky UNBRIDLED SPIRIT", doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});


        try {
            doc.save(`${currentSiteCode}.pdf`);
            document.getElementById('page3').querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => el.value = '');
            document.getElementById('page3').querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(el => el.checked = false);
            currentSiteCode = null;
            currentCountyCode = null;
            currentLatitude = null;
            currentLongitude = null;
            gpsCoordinatesInput.value = '';
            countySelect.value = '';
            showPage('page1');
        } catch (e) {
            console.error("Error saving PDF:", e);
            page3Error.textContent = `Failed to generate or save PDF: ${e.message}. The Site Code ${currentSiteCode} has been registered. Please try saving the PDF again. If you cannot resolve the issue, manually note details.`;
        }
    });

    populateCountyDropdown();
    showPage('page1'); 
});

console.log("script.js file loaded");
