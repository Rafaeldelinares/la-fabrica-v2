const API_BASE = 'http://localhost:5000/api/infraestructura';

// Utils
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');
    msg.textContent = message;

    if (isError) {
        toast.style.borderColor = '#ef4444'; // red-500
    } else {
        toast.style.borderColor = '#d00000'; // bybusiness
    }

    toast.classList.remove('translate-y-20', 'opacity-0');
    setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0');
    }, 3000);
}

function renderStatusIndicator(status) {
    if (status.includes('UP') || status.includes('Up')) {
        return `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ONLINE</span>`;
    }
    return `<span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20"><span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>OFFLINE</span>`;
}

// Data Fetching
async function fetchRecursos() {
    try {
        const res = await fetch(`${API_BASE}/recursos`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        document.getElementById('ram-loading').classList.add('hidden');
        document.getElementById('cpu-loading').classList.add('hidden');
        document.getElementById('disk-loading').classList.add('hidden');

        document.getElementById('ram-content').classList.remove('hidden');
        document.getElementById('cpu-content').classList.remove('hidden');
        document.getElementById('disk-content').classList.remove('hidden');

        if (data.ram_total_gb) {
            document.getElementById('ram-usado').innerHTML = `${parseFloat(data.ram_usado_gb).toFixed(2)}<span class="text-sm font-normal text-slate-500">GB</span>`;
            document.getElementById('ram-total').textContent = `Total: ${parseFloat(data.ram_total_gb).toFixed(2)} GB`;
            const rpm = data.ram_porcentaje || 0;
            document.getElementById('ram-percent').textContent = `${rpm}%`;
            document.getElementById('ram-bar').style.width = `${rpm}%`;
            document.getElementById('ram-percent').className = `text-xs font-bold ${rpm > 80 ? 'text-bybusiness' : 'text-emerald-400'}`;
        }

        if (data.disco_total_gb) {
            document.getElementById('disco-usado').innerHTML = `${parseFloat(data.disco_usado_gb).toFixed(2)}<span class="text-sm font-normal text-slate-500">GB</span>`;
            document.getElementById('disco-total').textContent = `Total: ${parseFloat(data.disco_total_gb).toFixed(2)} GB`;
            const dpm = data.disco_porcentaje || 0;
            document.getElementById('disco-percent').textContent = `${dpm}%`;
            document.getElementById('disco-bar').style.width = `${dpm}%`;
            document.getElementById('disco-percent').className = `text-xs font-bold ${dpm > 80 ? 'text-bybusiness' : 'text-emerald-400'}`;
        }

        if (data.cpu_load !== undefined) {
            document.getElementById('cpu-load').textContent = data.cpu_load.toFixed(2);
            document.getElementById('sys-uptime').textContent = data.uptime || 'Unknown';
        }

    } catch (err) {
        console.warn("API de recursos no disponible. Mostrando datos UI de ejemplo.");
        // show dummy on fail to display UI perfectly
        document.getElementById('ram-loading').classList.add('hidden');
        document.getElementById('ram-content').classList.remove('hidden');
        document.getElementById('ram-usado').innerHTML = `12.4<span class="text-sm font-normal text-slate-500">GB</span>`;
        document.getElementById('ram-total').textContent = `Total: 16.00 GB`;
        document.getElementById('ram-percent').textContent = `76%`;
        document.getElementById('ram-bar').style.width = `76%`;
        document.getElementById('ram-percent').className = `text-xs font-bold text-emerald-400`;

        document.getElementById('disk-loading').classList.add('hidden');
        document.getElementById('disk-content').classList.remove('hidden');
        document.getElementById('disco-usado').innerHTML = `45.2<span class="text-sm font-normal text-slate-500">GB</span>`;
        document.getElementById('disco-total').textContent = `Total: 80.00 GB`;
        document.getElementById('disco-percent').textContent = `56%`;
        document.getElementById('disco-bar').style.width = `56%`;
        document.getElementById('disco-percent').className = `text-xs font-bold text-emerald-400`;

        document.getElementById('cpu-loading').classList.add('hidden');
        document.getElementById('cpu-content').classList.remove('hidden');
        document.getElementById('cpu-load').textContent = `0.45`;
        document.getElementById('sys-uptime').textContent = `up 15 days, 4:20`;
    }
}

async function fetchContenedores() {
    try {
        const res = await fetch(`${API_BASE}/contenedores`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        const tbody = document.getElementById('cont-tbody');
        document.getElementById('cont-count').textContent = data.length || 0;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-4 py-8 text-center text-slate-500">No hay contenedores registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(c => `
            <tr class="hover:bg-slate-800/50 transition-colors group">
                <td class="px-4 py-3 whitespace-nowrap">${renderStatusIndicator(c.estado)}</td>
                <td class="px-4 py-3 text-slate-200 font-medium">${c.nombre}</td>
                <td class="px-4 py-3 text-slate-400 font-normal truncate max-w-[150px] text-xs">${c.imagen}</td>
                <td class="px-4 py-3 text-slate-500 text-xs hidden md:table-cell truncate max-w-[200px] font-mono">${c.puertos || '-'}</td>
            </tr>
        `).join('');

    } catch (err) {
        document.getElementById('cont-count').textContent = 2;
        // Dummy data default
        const tbody = document.getElementById('cont-tbody');
        tbody.innerHTML = `
            <tr class="hover:bg-slate-800/50 transition-colors group">
                <td class="px-4 py-3">${renderStatusIndicator('UP')}</td>
                <td class="px-4 py-3 text-slate-200">postgres-db</td>
                <td class="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">postgres:14</td>
                <td class="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px] font-mono">5432/tcp</td>
            </tr>
            <tr class="hover:bg-slate-800/50 transition-colors group">
                <td class="px-4 py-3">${renderStatusIndicator('UP')}</td>
                <td class="px-4 py-3 text-slate-200">n8n-main</td>
                <td class="px-4 py-3 text-slate-400 text-xs truncate max-w-[150px]">n8nio/n8n:latest</td>
                <td class="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px] font-mono">0.0.0.0:5678->5678/tcp</td>
            </tr>
        `;
    }
}

async function fetchEndpoints() {
    try {
        const res = await fetch(`${API_BASE}/endpoints`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        const list = document.getElementById('endpoints-list');
        if (!data || data.length === 0) {
            list.innerHTML = `<div class="text-xs text-slate-500">No hay endpoints definidos.</div>`;
            return;
        }

        list.innerHTML = data.map(e => `
            <div class="border border-slate-700/50 rounded p-2 hover:border-slate-600 transition-colors bg-navy-900/30">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-slate-300 uppercase">${e.servicio}</span>
                    <span class="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">${e.metodo || 'ALL'}</span>
                </div>
                <div class="text-[11px] text-bybusiness font-mono truncate cursor-pointer hover:underline" title="${e.url}">${e.url}</div>
            </div>
        `).join('');

    } catch (err) {
        // dummy fallback
        document.getElementById('endpoints-list').innerHTML = `
            <div class="border border-slate-700/50 rounded p-2 bg-navy-900/30">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-slate-300 uppercase">n8n Webhook</span>
                    <span class="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded">POST</span>
                </div>
                <div class="text-[11px] text-bybusiness font-mono truncate">https://n8n.ia-bybusiness.online/webhook/demo</div>
            </div>
        `;
    }
}

async function fetchImages() {
    try {
        const res = await fetch(`${API_BASE}/imagenes`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();

        const list = document.getElementById('images-list');
        if (!data || data.length === 0) {
            list.innerHTML = `<div class="text-xs text-slate-500">No hay imágenes.</div>`;
            return;
        }

        list.innerHTML = data.map(i => `
            <div class="flex justify-between items-center text-xs py-1 border-b border-navy-700/50 last:border-0 hover:bg-slate-800/30 p-1 rounded">
                <div class="truncate pr-2 w-[160px]">
                    <span class="text-slate-300">${i.nombre.split('/').pop()}</span>
                    <span class="text-slate-500 ml-0.5">:${i.tag}</span>
                </div>
                <span class="text-slate-400 tabular-nums">${i.size_mb ? i.size_mb.toFixed(0) + ' MB' : '-'}</span>
            </div>
        `).join('');

    } catch (err) {
        // dummy fallback
        document.getElementById('images-list').innerHTML = `
             <div class="flex justify-between items-center text-xs py-1 border-b border-navy-700/50">
                <div class="truncate"><span class="text-slate-300">ubuntu</span><span class="text-slate-500 ml-1">:20.04</span></div>
                <span class="text-slate-400">72 MB</span>
            </div>
            <div class="flex justify-between items-center text-xs py-1 border-b border-navy-700/50">
                <div class="truncate"><span class="text-slate-300">nginx</span><span class="text-slate-500 ml-1">:latest</span></div>
                <span class="text-slate-400">140 MB</span>
            </div>
        `;
    }
}

// Init
document.getElementById('btn-sync').addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync');
    const originalContent = btn.innerHTML;

    try {
        btn.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-bybusiness" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> CARGANDO...`;
        btn.disabled = true;

        const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
        if (!res.ok) throw new Error('Sync Error');

        showToast("Sincronización iniciada en segundo plano.");

        // Polling to simulate data loading / update
        setTimeout(() => {
            fetchRecursos();
            fetchContenedores();
            fetchImages();
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 3000);

    } catch (e) {
        showToast("Modo offline: Sincronización simulada.", false);
        setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.disabled = false;
        }, 1500);
    }
});

// Cargar workflows de n8n
async function fetchWorkflows() {
    try {
        const res = await fetch(`${API_BASE}/workflows`);
        if (!res.ok) throw new Error('API Error');
        const data = await res.json();
        const container = document.getElementById('workflows-container');
        if (!container) return;

        if (!data || data.length === 0) {
            container.innerHTML = `<div class="text-xs text-slate-500">No hay workflows.</div>`;
            return;
        }

        container.innerHTML = data.map(workflow => `
            <div class="border border-slate-700/50 rounded p-2 hover:border-slate-600 transition-colors bg-navy-900/30">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-bold text-slate-300 truncate mr-2" title="${workflow.nombre}">${workflow.nombre}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded ${workflow.activo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'} whitespace-nowrap">
                        ${workflow.activo ? '● ACTIVO' : '○ INACTIVO'}
                    </span>
                </div>
                ${workflow.webhook_urls && workflow.webhook_urls.length > 0 ?
                workflow.webhook_urls.map(url => `<div class="text-[10px] text-bybusiness font-mono truncate cursor-pointer hover:underline" title="${url}">🔗 ${url.split('/').pop()}</div>`).join('')
                : '<div class="text-[10px] text-slate-500 italic">Sin webhooks</div>'}
            </div>
        `).join('');
    } catch (err) {
        console.error('Error cargando workflows:', err);
        const container = document.getElementById('workflows-container');
        if (container) {
            container.innerHTML = `<div class="text-xs text-rose-500">Error al cargar workflows</div>`;
        }
    }
}

// Load initial data
document.addEventListener('DOMContentLoaded', () => {
    fetchRecursos();
    fetchContenedores();
    fetchEndpoints();
    fetchImages();
    fetchWorkflows();
});
