// Inizializzazione di Dexie
const db = new Dexie('PoloTecnicoDB');
db.version(1).stores({
    interventi: '++id, clienteId, data, tipo, etichetta',
    clienti: '++id, nome',
    materiali: '++id, nome',
    interventiPianificati: '++id, clienteId, data',
    etichette: '++id, nome',
    manutenzioniRicorrenti: '++id, clienteId, impiantoId, tipo, frequenza',
    impianti: '++id, clienteId, tipo, contratto',
    commesse: '++id, impiantoId, descrizione, stato'
});

// Stato dell'applicazione
let state = {
    activeTab: 'dashboard',
    filtri: {
        ricerca: '',
        tipo: '',
        dataInizio: '',
        dataFine: ''
    },
    tema: localStorage.getItem('tema') || 'light',
    paginaCorrente: 1,
    elementiPerPagina: 10,
    notifiche: []
};

let calendar;

// Funzioni di utilità
function saveState() {
    localStorage.setItem('tema', state.tema);
}

function setActiveTab(tabName) {
    state.activeTab = tabName;
    renderContent();
    updateNavButtons();
}

function updateNavButtons() {
    document.querySelectorAll('nav button').forEach(btn => {
        btn.className = btn.id.includes(state.activeTab) 
            ? 'mr-2 mb-2 p-2 bg-blue-500 text-white rounded'
            : 'mr-2 mb-2 p-2 bg-gray-200 rounded';
    });
}

function showModal(modalId, message) {
    document.getElementById(modalId + 'Message').textContent = message;
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function showToast(message, type = 'success') {
    toastr.options = {
        "closeButton": true,
        "progressBar": true,
        "positionClass": "toast-top-right",
        "timeOut": "5000"
    }
    toastr[type](message);
}

// Funzioni di validazione
function validateIntervento(intervento) {
    if (!intervento.cliente) return "Il cliente è obbligatorio";
    if (!intervento.tipo) return "Il tipo di intervento è obbligatorio";
    if (!intervento.data) return "La data è obbligatoria";
    if (!intervento.durata || intervento.durata <= 0) return "La durata deve essere maggiore di zero";
    if (!intervento.costo || intervento.costo <= 0) return "Il costo deve essere maggiore di zero";
    return null;
}

function validateCliente(cliente) {
    if (!cliente.nome) return "Il nome del cliente è obbligatorio";
    if (!cliente.indirizzo) return "L'indirizzo del cliente è obbligatorio";
    if (!cliente.telefono) return "Il telefono del cliente è obbligatorio";
    if (!cliente.email || !cliente.email.includes('@')) return "L'email del cliente non è valida";
    return null;
}

function validateMateriale(materiale) {
    if (!materiale.nome) return "Il nome del materiale è obbligatorio";
    if (!materiale.quantita || materiale.quantita <= 0) return "La quantità deve essere maggiore di zero";
    if (!materiale.prezzo || materiale.prezzo <= 0) return "Il prezzo deve essere maggiore di zero";
    return null;
}

// Renderizzazione del contenuto
async function renderContent() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="loader"></div>';

    switch(state.activeTab) {
        case 'dashboard':
            await renderDashboard();
            break;
        case 'nuovoIntervento':
            await renderNuovoIntervento();
            break;
        case 'listaInterventi':
            await renderListaInterventi();
            break;
        case 'gestioneMateriali':
            await renderGestioneMateriali();
            break;
        case 'reportFinanziario':
            await renderReportFinanziario();
            break;
        case 'gestioneClienti':
            await renderGestioneClienti();
            break;
        case 'pianificazioneInterventi':
            await renderPianificazioneInterventi();
            break;
        case 'fatturazione':
            await renderFatturazione();
            break;
        case 'impianti':
            await renderImpianti();
            break;
        case 'commesse':
            await renderCommesse();
            break;
        case 'calendario':
            await renderCalendario();
            break;
    }
}

async function renderDashboard() {
    const interventi = await db.interventi.toArray();
    const clienti = await db.clienti.toArray();
    const interventiPianificati = await db.interventiPianificati.toArray();

    const interventiPerMese = {};
    const incassiPerMese = {};

    interventi.forEach(intervento => {
        const mese = intervento.data.substring(0, 7);
        interventiPerMese[mese] = (interventiPerMese[mese] || 0) + 1;
        incassiPerMese[mese] = (incassiPerMese[mese] || 0) + Number(intervento.costo);
    });

    const mesi = Object.keys(interventiPerMese).sort();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Dashboard</h2>
        <div class="dashboard-grid">
            <div class="dashboard-card">
                <h3>Andamento Interventi</h3>
                <canvas id="graficoInterventi"></canvas>
            </div>
            <div class="dashboard-card">
                <h3>Andamento Incassi</h3>
                <canvas id="graficoIncassi"></canvas>
            </div>
        </div>
        <div class="dashboard-card mt-4">
            <h3>Riepilogo</h3>
            <p><strong>Totale interventi:</strong> ${interventi.length}</p>
            <p><strong>Incasso totale:</strong> €${interventi.reduce((acc, int) => acc + Number(int.costo), 0).toFixed(2)}</p>
            <p><strong>Media incasso per intervento:</strong> €${(interventi.reduce((acc, int) => acc + Number(int.costo), 0) / interventi.length || 0).toFixed(2)}</p>
            <p><strong>Totale clienti:</strong> ${clienti.length}</p>
            <p><strong>Interventi pianificati:</strong> ${interventiPianificati.length}</p>
        </div>
    `;

    new Chart(document.getElementById('graficoInterventi').getContext('2d'), {
        type: 'bar',
        data: {
            labels: mesi,
            datasets: [{
                label: 'Numero di Interventi',
                data: mesi.map(mese => interventiPerMese[mese]),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });

    new Chart(document.getElementById('graficoIncassi').getContext('2d'), {
        type: 'line',
        data: {
            labels: mesi,
            datasets: [{
                label: 'Incassi (€)',
                data: mesi.map(mese => incassiPerMese[mese]),
                fill: false,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function renderNuovoIntervento() {
    const clienti = await db.clienti.toArray();
    const etichette = await db.etichette.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Nuovo Intervento</h2>
        <form id="formNuovoIntervento" class="space-y-2">
            <select class="w-full p-2 border rounded" id="cliente" required>
                <option value="">Seleziona Cliente</option>
                ${clienti.map(cliente => `<option value="${cliente.id}">${cliente.nome}</option>`).join('')}
            </select>
            <input class="w-full p-2 border rounded" placeholder="Tipo di intervento" id="tipo" required>
            <input class="w-full p-2 border rounded" type="date" id="data" required>
            <input class="w-full p-2 border rounded" placeholder="Durata (ore)" type="number" id="durata" required>
            <input class="w-full p-2 border rounded" placeholder="Costo (€)" type="number" id="costo" required>
            <select class="w-full p-2 border rounded" id="etichetta">
                <option value="">Seleziona Etichetta</option>
                ${etichette.map(e => `<option value="${e.id}">${e.nome}</option>`).join('')}
            </select>
            <input class="w-full p-2 border rounded" placeholder="Tecnico" id="tecnico" required>
            <textarea class="w-full p-2 border rounded" placeholder="Note" id="note"></textarea>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Aggiungi Intervento</button>
        </form>
    `;

    document.getElementById('formNuovoIntervento').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovoIntervento = {
            clienteId: parseInt(document.getElementById('cliente').value),
            tipo: document.getElementById('tipo').value,
            data: document.getElementById('data').value,
            durata: document.getElementById('durata').value,
            costo: document.getElementById('costo').value,
            etichettaId: document.getElementById('etichetta').value,
            tecnico: document.getElementById('tecnico').value,
            note: document.getElementById('note').value
        };

        const errorMessage = validateIntervento(nuovoIntervento);
        if (errorMessage) {
            showModal('errorModal', errorMessage);
            return;
        }

        try {
            await db.interventi.add(nuovoIntervento);
            this.reset();
            showModal('successModal', 'Intervento aggiunto con successo!');
            showToast('Nuovo intervento registrato', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante il salvataggio dell\'intervento.');
        }
    });
}

async function renderListaInterventi() {
    const interventi = await db.interventi.toArray();
    const interventiPaginati = paginazioneInterventi(filtraInterventi(interventi));

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Lista Interventi</h2>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Cliente</th>
                    <th class="p-2 text-left">Tipo</th>
                    <th class="p-2 text-left">Data</th>
                    <th class="p-2 text-left">Durata</th>
                    <th class="p-2 text-left">Costo</th>
                    <th class="p-2 text-left">Etichetta</th>
                    <th class="p-2 text-left">Tecnico</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${interventiPaginati.map(intervento => `
                    <tr class="border-b">
                        <td class="p-2">${intervento.cliente}</td>
                        <td class="p-2">${intervento.tipo}</td>
                        <td class="p-2">${intervento.data}</td>
                        <td class="p-2">${intervento.durata} ore</td>
                        <td class="p-2">€${intervento.costo}</td>
                        <td class="p-2"><span class="etichetta etichetta-${intervento.etichetta}">${intervento.etichetta}</span></td>
                        <td class="p-2">${intervento.tecnico}</td>
                        <td class="p-2">
                            <button onclick="eliminaIntervento(${intervento.id})" class="bg-red-500 text-white p-1 rounded">Elimina</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    renderPaginazione(interventi.length);
}

async function renderGestioneMateriali() {
    const materiali = await db.materiali.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Gestione Materiali</h2>
        <form id="formNuovoMateriale" class="space-y-2 mb-4">
            <input class="w-full p-2 border rounded" placeholder="Nome materiale" id="nomeMateriale" required>
            <input class="w-full p-2 border rounded" placeholder="Quantità" type="number" id="quantitaMateriale" required>
            <input class="w-full p-2 border rounded" placeholder="Prezzo unitario (€)" type="number" id="prezzoMateriale" required>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Aggiungi Materiale</button>
        </form>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Nome</th>
                    <th class="p-2 text-left">Quantità</th>
                    <th class="p-2 text-left">Prezzo Unitario</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${materiali.map(materiale => `
                    <tr class="border-b">
                        <td class="p-2">${materiale.nome}</td>
                        <td class="p-2">${materiale.quantita}</td>
                        <td class="p-2">€${materiale.prezzo}</td>
                        <td class="p-2">
                            <button onclick="eliminaMateriale(${materiale.id})" class="bg-red-500 text-white p-1 rounded">Elimina</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('formNuovoMateriale').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovoMateriale = {
            nome: document.getElementById('nomeMateriale').value,
            quantita: document.getElementById('quantitaMateriale').value,
            prezzo: document.getElementById('prezzoMateriale').value
        };

        const errorMessage = validateMateriale(nuovoMateriale);
        if (errorMessage) {
            showModal('errorModal', errorMessage);
            return;
        }

        try {
            await db.materiali.add(nuovoMateriale);
            this.reset();
            renderGestioneMateriali();
            showModal('successModal', 'Materiale aggiunto con successo!');
            showToast('Nuovo materiale registrato', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante il salvataggio del materiale.');
        }
    });
}

async function renderReportFinanziario() {
    const interventi = await db.interventi.toArray();
    const totaleInterventi = interventi.length;
    const fatturato = interventi.reduce((acc, int) => acc + Number(int.costo), 0);
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Report Finanziario</h2>
        <div class="space-y-2 mb-4">
            <p><strong>Totale interventi:</strong> ${totaleInterventi}</p>
            <p><strong>Fatturato totale:</strong> €${fatturato.toFixed(2)}</p>
        </div>
        <canvas id="graficoFinanziario"></canvas>
    `;

    const ctx = document.getElementById('graficoFinanziario').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: interventi.map(int => int.data),
            datasets: [{
                label: 'Fatturato',
                data: interventi.map(int => int.costo),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function renderGestioneClienti() {
    const clienti = await db.clienti.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Gestione Clienti</h2>
        <form id="formNuovoCliente" class="space-y-2 mb-4">
            <input class="w-full p-2 border rounded" placeholder="Nome Cliente" id="nomeCliente" required>
            <input class="w-full p-2 border rounded" placeholder="Indirizzo" id="indirizzoCliente" required>
            <input class="w-full p-2 border rounded" placeholder="Telefono" id="telefonoCliente" required>
            <input class="w-full p-2 border rounded" placeholder="Email" id="emailCliente" type="email" required>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Aggiungi Cliente</button>
        </form>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Nome</th>
                    <th class="p-2 text-left">Indirizzo</th>
                    <th class="p-2 text-left">Telefono</th>
                    <th class="p-2 text-left">Email</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${clienti.map(cliente => `
                    <tr class="border-b">
                        <td class="p-2">${cliente.nome}</td>
                        <td class="p-2">${cliente.indirizzo}</td>
                        <td class="p-2">${cliente.telefono}</td>
                        <td class="p-2">${cliente.email}</td>
                        <td class="p-2">
                            <button onclick="visualizzaStoricoInterventi(${cliente.id})" class="bg-blue-500 text-white p-1 rounded">Storico Interventi</button>
                            <button onclick="eliminaCliente(${cliente.id})" class="bg-red-500 text-white p-1 rounded">Elimina</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('formNuovoCliente').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovoCliente = {
            nome: document.getElementById('nomeCliente').value,
            indirizzo: document.getElementById('indirizzoCliente').value,
            telefono: document.getElementById('telefonoCliente').value,
            email: document.getElementById('emailCliente').value
        };

        const errorMessage = validateCliente(nuovoCliente);
        if (errorMessage) {
            showModal('errorModal', errorMessage);
            return;
        }

        try {
            await db.clienti.add(nuovoCliente);
            this.reset();
            renderGestioneClienti();
            showModal('successModal', 'Cliente aggiunto con successo!');
            showToast('Nuovo cliente registrato', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante il salvataggio del cliente.');
        }
    });
}

async function visualizzaStoricoInterventi(clienteId) {
    const cliente = await db.clienti.get(clienteId);
    const interventiCliente = await db.interventi.where('clienteId').equals(clienteId).toArray();
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Storico Interventi - ${cliente.nome}</h2>
        <button onclick="renderGestioneClienti()" class="mb-4 bg-gray-300 p-2 rounded">Torna alla lista clienti</button>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Data</th>
                    <th class="p-2 text-left">Tipo</th>
                    <th class="p-2 text-left">Durata</th>
                    <th class="p-2 text-left">Costo</th>
                    <th class="p-2 text-left">Tecnico</th>
                    <th class="p-2 text-left">Note</th>
                </tr>
            </thead>
            <tbody>
                ${interventiCliente.map(intervento => `
                    <tr class="border-b">
                        <td class="p-2">${intervento.data}</td>
                        <td class="p-2">${intervento.tipo}</td>
                        <td class="p-2">${intervento.durata} ore</td>
                        <td class="p-2">€${intervento.costo}</td>
                        <td class="p-2">${intervento.tecnico}</td>
                        <td class="p-2">${intervento.note}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function renderPianificazioneInterventi() {
    const clienti = await db.clienti.toArray();
    const interventiPianificati = await db.interventiPianificati.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Pianificazione Interventi</h2>
        <form id="formPianificaIntervento" class="space-y-2 mb-4">
            <select class="w-full p-2 border rounded" id="clientePianificazione" required>
                <option value="">Seleziona Cliente</option>
                ${clienti.map(cliente => `<option value="${cliente.id}">${cliente.nome}</option>`).join('')}
            </select>
            <input class="w-full p-2 border rounded" type="date" id="dataPianificazione" required>
            <input class="w-full p-2 border rounded" placeholder="Tipo di intervento" id="tipoPianificazione" required>
            <textarea class="w-full p-2 border rounded" placeholder="Note" id="notePianificazione"></textarea>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Pianifica Intervento</button>
        </form>
        <h3 class="text-lg font-semibold mb-2">Interventi Pianificati</h3>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Data</th>
                    <th class="p-2 text-left">Cliente</th>
                    <th class="p-2 text-left">Tipo</th>
                    <th class="p-2 text-left">Note</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${interventiPianificati.map(intervento => `
                    <tr class="border-b">
                        <td class="p-2">${intervento.data}</td>
                        <td class="p-2">${clienti.find(c => c.id == intervento.clienteId).nome}</td>
                        <td class="p-2">${intervento.tipo}</td>
                        <td class="p-2">${intervento.note}</td>
                        <td class="p-2">
                            <button onclick="completaIntervento(${intervento.id})" class="bg-green-500 text-white p-1 rounded">Completa</button>
                            <button onclick="eliminaInterventoPianificato(${intervento.id})" class="bg-red-500 text-white p-1 rounded">Elimina</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('formPianificaIntervento').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovoInterventoPianificato = {
            clienteId: parseInt(document.getElementById('clientePianificazione').value),
            data: document.getElementById('dataPianificazione').value,
            tipo: document.getElementById('tipoPianificazione').value,
            note: document.getElementById('notePianificazione').value
        };

        try {
            await db.interventiPianificati.add(nuovoInterventoPianificato);
            this.reset();
            renderPianificazioneInterventi();
            showModal('successModal', 'Intervento pianificato con successo!');
            showToast('Nuovo intervento pianificato', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante la pianificazione dell\'intervento.');
        }
    });
}

async function renderFatturazione() {
    const clienti = await db.clienti.toArray();
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Fatturazione</h2>
        <form id="formGeneraFattura" class="space-y-2 mb-4">
            <select class="w-full p-2 border rounded" id="clienteFattura" required>
                <option value="">Seleziona Cliente</option>
                ${clienti.map(cliente => `<option value="${cliente.id}">${cliente.nome}</option>`).join('')}
            </select>
            <input class="w-full p-2 border rounded" type="date" id="dataInizioFattura" required>
            <input class="w-full p-2 border rounded" type="date" id="dataFineFattura" required>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Genera Fattura</button>
        </form>
    `;

    document.getElementById('formGeneraFattura').addEventListener('submit', async function(e) {
        e.preventDefault();
        const clienteId = document.getElementById('clienteFattura').value;
        const dataInizio = document.getElementById('dataInizioFattura').value;
        const dataFine = document.getElementById('dataFineFattura').value;
        await generaFattura(clienteId, dataInizio, dataFine);
    });
}

async function renderImpianti() {
    const impianti = await db.impianti.toArray();
    const clienti = await db.clienti.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Gestione Impianti</h2>
        <form id="formNuovoImpianto" class="space-y-2 mb-4">
            <select class="w-full p-2 border rounded" id="clienteImpianto" required>
                <option value="">Seleziona Cliente</option>
                ${clienti.map(c => `<option value="${c.id}">${c.nome}</option>`).join('')}
            </select>
            <input class="w-full p-2 border rounded" placeholder="Tipo di impianto" id="tipoImpianto" required>
            <textarea class="w-full p-2 border rounded" placeholder="Dettagli contratto" id="contrattoImpianto"></textarea>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Aggiungi Impianto</button>
        </form>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Cliente</th>
                    <th class="p-2 text-left">Tipo</th>
                    <th class="p-2 text-left">Contratto</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${impianti.map(impianto => `
                    <tr class="border-b">
                        <td class="p-2">${clienti.find(c => c.id === impianto.clienteId).nome}</td>
                        <td class="p-2">${impianto.tipo}</td>
                        <td class="p-2">${impianto.contratto}</td>
                        <td class="p-2">
                            <button onclick="visualizzaDettagliImpianto(${impianto.id})" class="bg-blue-500 text-white p-1 rounded">
                                <i class="fas fa-eye mr-1"></i>Dettagli
                            </button>
                            <button onclick="eliminaImpianto(${impianto.id})" class="bg-red-500 text-white p-1 rounded">
                                <i class="fas fa-trash mr-1"></i>Elimina
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('formNuovoImpianto').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovoImpianto = {
            clienteId: parseInt(document.getElementById('clienteImpianto').value),
            tipo: document.getElementById('tipoImpianto').value,
            contratto: document.getElementById('contrattoImpianto').value
        };

        try {
            await db.impianti.add(nuovoImpianto);
            this.reset();
            renderImpianti();
            showToast('Nuovo impianto aggiunto', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'aggiunta dell\'impianto.');
        }
    });
}

async function renderCommesse() {
    const commesse = await db.commesse.toArray();
    const impianti = await db.impianti.toArray();

    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <h2 class="text-xl font-bold mb-4 text-blue-600">Gestione Commesse</h2>
        <form id="formNuovaCommessa" class="space-y-2 mb-4">
            <select class="w-full p-2 border rounded" id="impiantoCommessa" required>
                <option value="">Seleziona Impianto</option>
                ${impianti.map(i => `<option value="${i.id}">${i.tipo} - ${i.cliente}</option>`).join('')}
            </select>
            <textarea class="w-full p-2 border rounded" placeholder="Descrizione commessa" id="descrizioneCommessa" required></textarea>
            <select class="w-full p-2 border rounded" id="statoCommessa" required>
                <option value="pianificata">Pianificata</option>
                <option value="in corso">In Corso</option>
                <option value="completata">Completata</option>
            </select>
            <button type="submit" class="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 transition">Aggiungi Commessa</button>
        </form>
        <table class="w-full">
            <thead class="bg-gray-100">
                <tr>
                    <th class="p-2 text-left">Impianto</th>
                    <th class="p-2 text-left">Descrizione</th>
                    <th class="p-2 text-left">Stato</th>
                    <th class="p-2 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody>
                ${commesse.map(commessa => `
                    <tr class="border-b">
                        <td class="p-2">${impianti.find(i => i.id === commessa.impiantoId).tipo}</td>
                        <td class="p-2">${commessa.descrizione}</td>
                        <td class="p-2"><span class="stato-commessa stato-${commessa.stato.replace(' ', '-')}">${commessa.stato}</span></td>
                        <td class="p-2">
                            <button onclick="modificaStatoCommessa(${commessa.id})" class="bg-blue-500 text-white p-1 rounded">
                                <i class="fas fa-edit mr-1"></i>Modifica Stato
                            </button>
                            <button onclick="eliminaCommessa(${commessa.id})" class="bg-red-500 text-white p-1 rounded">
                                <i class="fas fa-trash mr-1"></i>Elimina
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('formNuovaCommessa').addEventListener('submit', async function(e) {
        e.preventDefault();
        const nuovaCommessa = {
            impiantoId: parseInt(document.getElementById('impiantoCommessa').value),
            descrizione: document.getElementById('descrizioneCommessa').value,
            stato: document.getElementById('statoCommessa').value
        };

        try {
            await db.commesse.add(nuovaCommessa);
            this.reset();
            renderCommesse();
            showToast('Nuova commessa aggiunta', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'aggiunta della commessa.');
        }
    });
}

async function renderCalendario() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div id="calendar"></div>';

    const interventiPianificati = await db.interventiPianificati.toArray();
    const clienti = await db.clienti.toArray();
    const eventi = interventiPianificati.map(intervento => ({
        id: intervento.id,
        title: intervento.tipo,
        start: intervento.data,
        allDay: true,
        extendedProps: {
            clienteId: intervento.clienteId,
            note: intervento.note
        }
    }));

    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: eventi,
        eventClick: function(info) {
            showEventDetails(info.event);
        },
        dateClick: function(info) {
            promptNewEvent(info.dateStr);
        }
    });

    calendar.render();
}

function showEventDetails(event) {
    const cliente = state.clienti.find(c => c.id === event.extendedProps.clienteId);
    showModal('eventDetailsModal', `
        <h3>${event.title}</h3>
        <p>Data: ${event.start.toLocaleDateString()}</p>
        <p>Cliente: ${cliente ? cliente.nome : 'N/A'}</p>
        <p>Note: ${event.extendedProps.note || 'Nessuna nota'}</p>
    `);
}

async function promptNewEvent(date) {
    const clienti = await db.clienti.toArray();
    const clientiOptions = clienti.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    
    showModal('newEventModal', `
        <h3>Nuovo Intervento Pianificato</h3>
        <form id="newEventForm">
            <select id="newEventCliente" required>
                <option value="">Seleziona Cliente</option>
                ${clientiOptions}
            </select>
            <input type="text" id="newEventTipo" placeholder="Tipo di intervento" required>
            <textarea id="newEventNote" placeholder="Note"></textarea>
            <input type="hidden" id="newEventDate" value="${date}">
            <button type="submit">Salva</button>
        </form>
    `);

    document.getElementById('newEventForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuovoIntervento = {
            clienteId: document.getElementById('newEventCliente').value,
            tipo: document.getElementById('newEventTipo').value,
            data: document.getElementById('newEventDate').value,
            note: document.getElementById('newEventNote').value
        };

        try {
            const id = await db.interventiPianificati.add(nuovoIntervento);
            calendar.addEvent({
                id: id,
                title: nuovoIntervento.tipo,
                start: nuovoIntervento.data,
                allDay: true,
                extendedProps: {
                    clienteId: nuovoIntervento.clienteId,
                    note: nuovoIntervento.note
                }
            });
            hideModal('newEventModal');
            showToast('Intervento pianificato aggiunto', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'aggiunta dell\'intervento pianificato.');
        }
    });
}

// Funzioni di utilità

function filtraInterventi(interventi) {
    return interventi.filter(intervento => {
        const matchRicerca = intervento.cliente.toLowerCase().includes(state.filtri.ricerca.toLowerCase()) ||
                             intervento.tipo.toLowerCase().includes(state.filtri.ricerca.toLowerCase());
        const matchTipo = state.filtri.tipo ? intervento.tipo === state.filtri.tipo : true;
        const matchData = (!state.filtri.dataInizio || intervento.data >= state.filtri.dataInizio) &&
                          (!state.filtri.dataFine || intervento.data <= state.filtri.dataFine);
        return matchRicerca && matchTipo && matchData;
    });
}

function paginazioneInterventi(interventi) {
    const inizio = (state.paginaCorrente - 1) * state.elementiPerPagina;
    const fine = inizio + state.elementiPerPagina;
    return interventi.slice(inizio, fine);
}

function renderPaginazione(totaleInterventi) {
    const totalePagine = Math.ceil(totaleInterventi / state.elementiPerPagina);
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';

    if (totalePagine > 1) {
        for (let i = 1; i <= totalePagine; i++) {
            const button = document.createElement('button');
            button.innerText = i;
            button.classList.add('px-3', 'py-1', 'border', 'rounded');
            if (i === state.paginaCorrente) {
                button.classList.add('bg-blue-500', 'text-white');
            } else {
                button.classList.add('bg-white');
            }
            button.addEventListener('click', () => {
                state.paginaCorrente = i;
                renderListaInterventi();
            });
            paginationElement.appendChild(button);
        }
    }
}

function toggleTheme() {
    state.tema = state.tema === 'light' ? 'dark' : 'light';
    document.body.classList.toggle('dark-mode', state.tema === 'dark');
    localStorage.setItem('tema', state.tema);
}

function initializeDatePicker() {
    flatpickr("#filterDateRange", {
        mode: "range",
        dateFormat: "Y-m-d",
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                state.filtri.dataInizio = selectedDates[0].toISOString().split('T')[0];
                state.filtri.dataFine = selectedDates[1].toISOString().split('T')[0];
                if (state.activeTab === 'listaInterventi') renderListaInterventi();
            }
        }
    });
}

// Funzioni di eliminazione

async function eliminaIntervento(interventoId) {
    if (confirm("Sei sicuro di voler eliminare questo intervento?")) {
        try {
            await db.interventi.delete(interventoId);
            renderListaInterventi();
            showToast('Intervento eliminato con successo', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione dell\'intervento.');
        }
    }
}

async function eliminaCliente(clienteId) {
    if (confirm("Sei sicuro di voler eliminare questo cliente? Questa azione eliminerà anche tutti gli interventi associati.")) {
        try {
            await db.transaction('rw', db.clienti, db.interventi, db.interventiPianificati, async () => {
                await db.clienti.delete(clienteId);
                await db.interventi.where('clienteId').equals(clienteId).delete();
                await db.interventiPianificati.where('clienteId').equals(clienteId).delete();
            });
            renderGestioneClienti();
            showToast('Cliente e relativi interventi eliminati con successo', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione del cliente.');
        }
    }
}

async function eliminaMateriale(materialeId) {
    if (confirm("Sei sicuro di voler eliminare questo materiale?")) {
        try {
            await db.materiali.delete(materialeId);
            renderGestioneMateriali();
            showToast('Materiale eliminato con successo', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione del materiale.');
        }
    }
}

async function eliminaImpianto(impiantoId) {
    if (confirm("Sei sicuro di voler eliminare questo impianto? Questa azione eliminerà anche tutte le commesse associate.")) {
        try {
            await db.transaction('rw', db.impianti, db.commesse, db.manutenzioniRicorrenti, async () => {
                await db.impianti.delete(impiantoId);
                await db.commesse.where('impiantoId').equals(impiantoId).delete();
                await db.manutenzioniRicorrenti.where('impiantoId').equals(impiantoId).delete();
            });
            renderImpianti();
            showToast('Impianto e relative commesse eliminati con successo', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione dell\'impianto.');
        }
    }
}

async function eliminaCommessa(commessaId) {
    if (confirm("Sei sicuro di voler eliminare questa commessa?")) {
        try {
            await db.commesse.delete(commessaId);
            renderCommesse();
            showToast('Commessa eliminata con successo', 'success');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione della commessa.');
        }
    }
}

async function eliminaInterventoPianificato(interventoId) {
    if (confirm("Sei sicuro di voler eliminare questo intervento pianificato?")) {
        try {
            await db.interventiPianificati.delete(interventoId);
            renderPianificazioneInterventi();
            showToast('Intervento pianificato eliminato', 'info');
        } catch (error) {
            showModal('errorModal', 'Errore durante l\'eliminazione dell\'intervento pianificato.');
        }
    }
}

// Funzione per generare la fattura
async function generaFattura(clienteId, dataInizio, dataFine) {
    const cliente = await db.clienti.get(parseInt(clienteId));
    const interventi = await db.interventi
        .where('clienteId').equals(parseInt(clienteId))
        .and(int => int.data >= dataInizio && int.data <= dataFine)
        .toArray();

    if (interventi.length === 0) {
        showModal('errorModal', 'Nessun intervento trovato per il periodo selezionato');
        return;
    }

    const totale = interventi.reduce((acc, int) => acc + Number(int.costo), 0);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Fattura', 105, 20, null, null, 'center');
    doc.setFontSize(12);
    doc.text(`Cliente: ${cliente.nome}`, 20, 40);
    doc.text(`Periodo: dal ${dataInizio} al ${dataFine}`, 20, 50);

    doc.autoTable({
        startY: 60,
        head: [['Data', 'Tipo', 'Durata', 'Costo']],
        body: interventi.map(int => [int.data, int.tipo, `${int.durata} ore`, `€${int.costo}`]),
        foot: [['', '', 'Totale', `€${totale.toFixed(2)}`]],
    });

    doc.save(`fattura_${cliente.nome}_${dataInizio}_${dataFine}.pdf`);
    showModal('successModal', 'Fattura generata con successo!');
    showToast('Fattura generata e scaricata', 'success');
}

// Inizializzazione dell'applicazione
function initApp() {
    if (state.tema === 'dark') {
        document.body.classList.add('dark-mode');
    }

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    document.getElementById('userMenu').addEventListener('click', () => {
        // Implementare la logica per il menu utente
    });

    document.getElementById('btnNotifiche').addEventListener('click', () => {
        // Implementare la logica per visualizzare le notifiche
    });

    initializeDatePicker();

    // Aggiunta degli event listener ai pulsanti di navigazione
    document.getElementById('btnDashboard').addEventListener('click', () => setActiveTab('dashboard'));
    document.getElementById('btnNuovoIntervento').addEventListener('click', () => setActiveTab('nuovoIntervento'));
    document.getElementById('btnListaInterventi').addEventListener('click', () => setActiveTab('listaInterventi'));
    document.getElementById('btnGestioneMateriali').addEventListener('click', () => setActiveTab('gestioneMateriali'));
    document.getElementById('btnReportFinanziario').addEventListener('click', () => setActiveTab('reportFinanziario'));
    document.getElementById('btnGestioneClienti').addEventListener('click', () => setActiveTab('gestioneClienti'));
    document.getElementById('btnPianificazioneInterventi').addEventListener('click', () => setActiveTab('pianificazioneInterventi'));
    document.getElementById('btnFatturazione').addEventListener('click', () => setActiveTab('fatturazione'));
    document.getElementById('btnImpianti').addEventListener('click', () => setActiveTab('impianti'));
    document.getElementById('btnCommesse').addEventListener('click', () => setActiveTab('commesse'));
    document.getElementById('btnCalendario').addEventListener('click', () => setActiveTab('calendario'));

    // Gestione dei filtri e della ricerca
    document.getElementById('searchInput').addEventListener('input', function(e) {
        state.filtri.ricerca = e.target.value;
        if (state.activeTab === 'listaInterventi') renderListaInterventi();
    });

    document.getElementById('filterType').addEventListener('change', function(e) {
        state.filtri.tipo = e.target.value;
        if (state.activeTab === 'listaInterventi') renderListaInterventi();
    });

    document.getElementById('applyFilters').addEventListener('click', function() {
        if (state.activeTab === 'listaInterventi') renderListaInterventi();
    });

    document.getElementById('resetFilters').addEventListener('click', function() {
        document.getElementById('searchInput').value = '';
        document.getElementById('filterType').value = '';
        document.getElementById('filterDateRange').value = '';
        state.filtri = { ricerca: '', tipo: '', dataInizio: '', dataFine: '' };
        if (state.activeTab === 'listaInterventi') renderListaInterventi();
    });

    // Gestione dei modali
    document.getElementById('closeErrorModal').addEventListener('click', () => hideModal('errorModal'));
    document.getElementById('closeSuccessModal').addEventListener('click', () => hideModal('successModal'));
    document.getElementById('closeEventDetailsModal').addEventListener('click', () => hideModal('eventDetailsModal'));
    document.getElementById('closeNewEventModal').addEventListener('click', () => hideModal('newEventModal'));

    // Renderizzazione iniziale
    renderContent();
    updateNavButtons();
}

// Chiamare initApp() quando il documento è pronto
document.addEventListener('DOMContentLoaded', initApp);