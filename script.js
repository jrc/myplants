// --- DATA & STATE ---
const appState = { fileHandle: null, items: [], editingPlantId: null, pendingWatering: null };
const plantDatabase = [
    { name: 'Aloe Vera', latinName: 'Aloe vera', wikipedia: 'Aloe_vera', type: 'succulent', sunlight: 'direct', interval: 21 },
    { name: 'Basil', latinName: 'Ocimum basilicum', wikipedia: 'Basil', type: 'leafy', sunlight: 'direct', interval: 4 },
    { name: 'Boston Fern', latinName: 'Nephrolepis exaltata', wikipedia: 'Nephrolepis_exaltata', type: 'leafy', sunlight: 'indirect', interval: 7 },
    { name: 'Chinese Money Plant', latinName: 'Pilea peperomioides', wikipedia: 'Pilea_peperomioides', type: 'leafy', sunlight: 'indirect', interval: 9 },
    { name: 'Common Ivy', latinName: 'Hedera helix', wikipedia: 'Hedera_helix', type: 'leafy', sunlight: 'indirect', interval: 7 },
    { name: 'Fiddle Leaf Fig', latinName: 'Ficus lyrata', wikipedia: 'Ficus_lyrata', type: 'leafy', sunlight: 'indirect', interval: 10 },
    { name: 'Golden Pothos', latinName: 'Epipremnum aureum', wikipedia: 'Epipremnum_aureum', type: 'leafy', sunlight: 'indirect', interval: 8 },
    { name: 'Monstera Deliciosa', latinName: 'Monstera deliciosa', wikipedia: 'Monstera_deliciosa', type: 'leafy', sunlight: 'indirect', interval: 9 },
    { name: 'Orchid', latinName: 'Orchidaceae', wikipedia: 'Orchidaceae', type: 'flowering', sunlight: 'indirect', interval: 10 },
    { name: 'Parlor Palm', latinName: 'Chamaedorea elegans', wikipedia: 'Chamaedorea_elegans', type: 'leafy', sunlight: 'low', interval: 8 },
    { name: 'Peace Lily', latinName: 'Spathiphyllum', wikipedia: 'Spathiphyllum', type: 'leafy', sunlight: 'low', interval: 7 },
    { name: 'Porcelain Flower', latinName: 'Hoya carnosa', wikipedia: 'Hoya_carnosa', type: 'flowering', sunlight: 'indirect', interval: 12 },
    { name: 'Rubber Plant', latinName: 'Ficus elastica', wikipedia: 'Ficus_elastica', type: 'leafy', sunlight: 'indirect', interval: 10 },
    { name: 'Snake Plant', latinName: 'Dracaena trifasciata', wikipedia: 'Dracaena_trifasciata', type: 'succulent', sunlight: 'low', interval: 14 },
    { name: 'Spider Plant', latinName: 'Chlorophytum comosum', wikipedia: 'Chlorophytum_comosum', type: 'leafy', sunlight: 'indirect', interval: 7 },
    { name: 'White Bird of Paradise', latinName: 'Strelitzia nicolai', wikipedia: 'Strelitzia_nicolai', type: 'leafy', sunlight: 'indirect', interval: 7 },
    { name: 'ZZ Plant', latinName: 'Zamioculcas', wikipedia: 'Zamioculcas', type: 'succulent', sunlight: 'low', interval: 18 },
];

// --- DOM ELEMENTS ---
const createBtn = document.getElementById('create-file');
const openBtn = document.getElementById('open-file');
const listTitleEl = document.getElementById('list-title');
const plantListEl = document.getElementById('plant-list');
const welcomeScreen = document.getElementById('welcome-screen');
const appContent = document.getElementById('app-content');
const addPlantBtn = document.getElementById('add-plant-btn');
const plantForm = document.getElementById('plant-form');
const plantModalEl = document.getElementById('plant-modal');
const plantModal = new bootstrap.Modal(plantModalEl);
const waterConfirmModalEl = document.getElementById('water-confirm-modal');
const waterConfirmModal = new bootstrap.Modal(waterConfirmModalEl);
const confirmWaterBtn = document.getElementById('confirm-water-btn');
const wikiLinkContainer = document.getElementById('wiki-link-container');
const wikiLink = document.getElementById('wiki-link');
const deleteInModalBtn = document.getElementById('delete-in-modal-btn');

// --- CORE FILE & UI LOGIC ---
async function saveFile() {
    if (!appState.fileHandle) return;
    try {
        const writable = await appState.fileHandle.createWritable();
        await writable.write(JSON.stringify(appState.items, null, 2));
        await writable.close();
    } catch (err) {
        console.error("Error saving file:", err);
    }
}

async function loadFileContent(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const content = await file.text();
        appState.items = content ? JSON.parse(content) : [];
        renderPlantList();
    } catch (err) {
        console.error("Error loading file content:", err);
    }
}

function showAppUI() {
    welcomeScreen.style.display = 'none';
    appContent.style.display = 'block';
    listTitleEl.textContent = appState.fileHandle.name.replace(/\.json$/i, '');
}

// --- APPLICATION LOGIC ---
function isSameDay(d1, d2) {
    // Strip time component for accurate day comparison
    const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return date1.getTime() === date2.getTime();
}

function getLastWatered(plant) {
    if (!plant.wateringHistory || plant.wateringHistory.length === 0) return null;
    return new Date(plant.wateringHistory[plant.wateringHistory.length - 1]);
}

function renderPlantList() {
    plantListEl.innerHTML = '';

    const sortedPlants = [...appState.items].sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue));


    const groups = { today: [], tomorrow: [], next3Days: [], future: [] };
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    const next3Days = new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000);

    sortedPlants.forEach(plant => {
        const dueDate = new Date(plant.nextDue);
        const dueDateNoTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

        if (dueDateNoTime <= today) groups.today.push(plant);
        else if (isSameDay(dueDate, tomorrow)) groups.tomorrow.push(plant);
        else if (dueDate < next3Days) groups.next3Days.push(plant);
        else groups.future.push(plant);
    });

    const renderGroup = (title, plants) => {
        if (plants.length === 0 && title !== 'Today') {
            return;
        }
        
        // Add a header for the group
        const header = `<p class="text-muted small mt-4 mb-2">${title.toUpperCase()}</p>`;
        plantListEl.insertAdjacentHTML('beforeend', header);

        const listContainer = document.createElement('ul');
        listContainer.className = 'list-group';


        if (plants.length === 0 && title === 'Today') {
            listContainer.innerHTML = `<li class="list-group-item text-center text-muted">All done for today!</li>`;
            plantListEl.appendChild(listContainer);
            return;
        }

        // Sort plants by date, then room name, then plant name
        plants.sort((a, b) => {
            const dayA = new Date(a.nextDue).setHours(0, 0, 0, 0);
            const dayB = new Date(b.nextDue).setHours(0, 0, 0, 0);
            if (dayA !== dayB) {
                return dayA - dayB;
            }

            const roomA = a.roomName || '';
            const roomB = b.roomName || '';
            if (roomA.localeCompare(roomB) !== 0) {
                return roomA.localeCompare(roomB);
            }
            
            return a.name.localeCompare(b.name);
        });


        plants.forEach(plant => {
            const dueDate = new Date(plant.nextDue);
            const isOverdue = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()) < today;

            let dueDateHtml = '';
            if (title !== 'Today' || isOverdue) {
                const dateClass = isOverdue ? 'text-danger' : 'text-body-secondary';
                dueDateHtml = `<div class="due-date-text ${dateClass}">
                                  Due ${dueDate.toLocaleDateString()}
                               </div>`;
            }
            
            let roomHtml = '';
            if (plant.roomName) {
                 roomHtml = `<div class="due-date-text text-body-secondary">${plant.roomName}</div>`;
            }

            let actionButtonsHtml = '';
            if (title === 'Today') {
                actionButtonsHtml = `
                    <div class="btn-group" role="group">
                        <button class="feedback-btn btn btn-sm btn-outline-dark" data-id="${plant.id}" data-feedback="dry" title="Soil was too dry">🌵</button>
                        <button class="feedback-btn btn btn-sm btn-outline-dark ok-btn" data-id="${plant.id}" data-feedback="ok" title="Soil was just right">👌</button>
                        <button class="feedback-btn btn btn-sm btn-outline-dark" data-id="${plant.id}" data-feedback="soggy" title="Soil was too soggy">💦</button>
                    </div>
                `;
                    // <div class="btn-group ms-1" role="group">
                    //     <button class="snooze-btn btn btn-sm btn-outline-dark" data-id="${plant.id}" title="Snooze by 1 day">💤</button>
                    // </div>
            } else if (plant.wateringHistory && plant.wateringHistory.length > 0) {
                actionButtonsHtml = `
                    <button class="undo-btn btn btn-sm btn-outline-dark" data-id="${plant.id}" title="Undo last watering">⟲</button>
                `;
            }

            const itemHtml = `
                <li class="list-group-item d-flex align-items-center">
                    <div class="flex-grow-1">
                        <div class="plant-name-wrapper">
                            <strong class="fs-5 plant-name">${plant.name}</strong>
                        </div>
                         ${roomHtml}
                         ${dueDateHtml}
                    </div>
                    <div class="plant-actions d-flex align-items-center">
                        ${actionButtonsHtml}
                        <button class="edit-btn btn btn-sm btn-outline-secondary ms-2" data-id="${plant.id}" title="Edit">✎</button>
                    </div>
                </li>
            `;
            listContainer.insertAdjacentHTML('beforeend', itemHtml);
        });
        plantListEl.appendChild(listContainer);
    };

    renderGroup('Today', groups.today);
    renderGroup('Tomorrow', groups.tomorrow);
    renderGroup('Next 3 Days', groups.next3Days);
    renderGroup('Future', groups.future);
}


function savePlant(event) {
    event.preventDefault();
    const formData = new FormData(plantForm);
    const id = formData.get('id');
    const plantData = {
        name: formData.get('name'),
        plantType: formData.get('plantType'),
        roomName: formData.get('roomName'),
        sunlight: formData.get('sunlight'),
        intervalDays: parseInt(formData.get('intervalDays'), 10),
    };

    if (id) {
        const plant = appState.items.find(p => p.id === id);
        Object.assign(plant, plantData);
        const lastWateredDate = getLastWatered(plant);
        if (lastWateredDate) {
            plant.nextDue = new Date(lastWateredDate.getTime() + plant.intervalDays * 24 * 60 * 60 * 1000).toISOString();
        }
    } else {
        appState.items.push({
            id: crypto.randomUUID(),
            wateringHistory: [],
            ...plantData,
            nextDue: new Date().toISOString(),
        });
    }

    plantModal.hide();
    renderPlantList();
    saveFile();
}

function handleWatering(id, feedback) {
    const plant = appState.items.find(p => p.id === id);
    if (!plant) return;

    if (!plant.wateringHistory) plant.wateringHistory = [];
    plant.wateringHistory.push(new Date().toISOString());

    if (feedback === 'dry' && plant.intervalDays > 1) {
        plant.intervalDays -= 1;
    }

    const lastWateredDate = getLastWatered(plant);
    plant.nextDue = new Date(lastWateredDate.getTime() + plant.intervalDays * 24 * 60 * 60 * 1000).toISOString();

    renderPlantList();
    saveFile();
}

function handleSoggyFeedback(id) {
    const plant = appState.items.find(p => p.id === id);
    if (!plant) return;

    plant.intervalDays += 1;
    // Reschedule from today, since we are not watering it.
    plant.nextDue = new Date(new Date().getTime() + plant.intervalDays * 24 * 60 * 60 * 1000).toISOString();
    renderPlantList();
    saveFile();
}


function snoozePlant(id) {
    const plant = appState.items.find(p => p.id === id);
    if (plant) {
        const currentDueDate = new Date(plant.nextDue);
        // Snooze from today, not from the original due date
        const today = new Date();
        plant.nextDue = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
        renderPlantList();
        saveFile();
    }
}

function undoLastWatering(id) {
    const plant = appState.items.find(p => p.id === id);
    if (!plant || !plant.wateringHistory || plant.wateringHistory.length === 0) return;

    plant.wateringHistory.pop(); // Remove the last watering entry

    const lastWateredDate = getLastWatered(plant); // Get the new last watering date

    if (lastWateredDate) {
        // Reschedule based on the new last watering date
        plant.nextDue = new Date(lastWateredDate.getTime() + plant.intervalDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
        // If no history remains, make it due immediately so it reappears in 'Today'
        plant.nextDue = new Date().toISOString();
    }

    renderPlantList();
    saveFile();
}


function editPlant(id) {
    appState.editingPlantId = id;
    const plant = appState.items.find(p => p.id === id);
    if (plant) {
        plantForm.id.value = plant.id;
        plantForm.name.value = plant.name;
        plantForm.plantType.value = plant.plantType;
        plantForm.roomName.value = plant.roomName || '';
        plantForm.sunlight.value = plant.sunlight;
        plantForm.intervalDays.value = plant.intervalDays;
        plantModalEl.querySelector('.modal-title').textContent = 'Edit Plant';
        deleteInModalBtn.style.display = 'block';
        handlePlantSelection({ target: { value: plant.name } });
        plantModal.show();
    }
}

function deletePlant(id) {
    // A simple confirmation dialog
    if (confirm("Are you sure you want to delete this plant?")) {
        appState.items = appState.items.filter(p => p.id !== id);
        plantModal.hide();
        renderPlantList();
        saveFile();
    }
}

function populatePlantDatalist() {
    const datalist = document.getElementById('plant-options');
    plantDatabase.sort((a, b) => a.name.localeCompare(b.name));
    plantDatabase.forEach(plant => {
        const option = document.createElement('option');
        option.value = plant.name;
        datalist.appendChild(option);
    });
}

function handlePlantSelection(event) {
    const selectedPlantName = event.target.value;
    const plantData = plantDatabase.find(p => p.name === selectedPlantName);
    if (plantData) {
        plantForm.plantType.value = plantData.type;
        plantForm.sunlight.value = plantData.sunlight;
        plantForm.intervalDays.value = plantData.interval;

        const url = `https://en.wikipedia.org/wiki/${plantData.wikipedia}`;
        wikiLink.href = url;
        wikiLink.textContent = url.replace('https://', '');
        wikiLinkContainer.style.display = 'block';
    } else {
        wikiLinkContainer.style.display = 'none';
    }
}

// --- EVENT LISTENERS ---
createBtn.addEventListener('click', async () => {
    try {
        appState.fileHandle = await window.showSaveFilePicker({ suggestedName: 'My Plants.json', types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }] });
        appState.items = [];
        await saveFile();
        renderPlantList();
        showAppUI();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Error creating file:", err);
        } else {
            console.info("Save file picker cancelled.");
        }
    }
});

openBtn.addEventListener('click', async () => {
    try {
        const [handle] = await window.showOpenFilePicker({ types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }] });
        appState.fileHandle = handle;
        await loadFileContent(handle);
        showAppUI();
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Error opening file:", err);
        } else {
            console.info("Open file picker cancelled.");
        }
    }
});

addPlantBtn.addEventListener('click', () => {
    appState.editingPlantId = null;
    plantForm.reset();
    plantForm.id.value = '';
    wikiLinkContainer.style.display = 'none';
    deleteInModalBtn.style.display = 'none';
    plantModalEl.querySelector('.modal-title').textContent = 'Add Plant';
    plantModal.show();
});

plantForm.addEventListener('submit', savePlant);
document.getElementById('plant-name-list').addEventListener('input', handlePlantSelection);
deleteInModalBtn.addEventListener('click', () => {
    if (appState.editingPlantId) {
        deletePlant(appState.editingPlantId);
    }
});

confirmWaterBtn.addEventListener('click', () => {
    if (appState.pendingWatering) {
        handleWatering(appState.pendingWatering.id, appState.pendingWatering.feedback);
        appState.pendingWatering = null;
        waterConfirmModal.hide();
    }
});

plantListEl.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const id = button.dataset.id;
    if (!id) return;

    if (button.classList.contains('edit-btn')) editPlant(id);
    if (button.classList.contains('snooze-btn')) snoozePlant(id);
    if (button.classList.contains('undo-btn')) {
        if (confirm("Are you sure you want to undo the last watering? This cannot be undone.")) {
            undoLastWatering(id);
        }
    }
    if (button.classList.contains('feedback-btn')) {
        const feedback = button.dataset.feedback;
        if (feedback === 'dry' || feedback === 'ok') {
            appState.pendingWatering = { id, feedback };
            waterConfirmModal.show();
        } else if (feedback === 'soggy') {
            handleSoggyFeedback(id);
        }
    }
});

// --- INITIALIZATION ---
populatePlantDatalist();