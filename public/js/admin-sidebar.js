// public/js/admin-sidebar.js
import { auth, db } from './initFirebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

export async function initAdminSidebar() {
    const sidebarRoot = document.getElementById('admin-sidebar-root');
    if (!sidebarRoot) return;

    onAuthStateChanged(auth, (user) => {
        if (!user) return;

        try {
            // Sinergia de RAM: Reutiliza el caché generado por userbar.js
            const q = query(collection(db, 'docentes'), where('correo', '==', user.email));
            
            onSnapshot(q, (snap) => {
                const cargo = !snap.empty ? snap.docs[0].data().cargo.toLowerCase() : 'docente';
                renderSidebar(sidebarRoot, cargo);

                const overlay = document.getElementById('navbarOverlay');
                const sidebar = document.querySelector('.admin-sidebar');
                if (overlay && sidebar) {
                    overlay.addEventListener('click', () => {
                        sidebar.classList.remove('mobile-open');
                        overlay.classList.remove('active');
                    });
                }
            });
        } catch (error) {
            console.error("Error loading sidebar:", error);
        }
    });
}

function renderSidebar(container, cargo) {
    const currentPath = window.location.pathname;
    const isDir = cargo === 'director';
    const isSub = cargo === 'subdirector';
    const isDoc = cargo === 'docente';

    let html = `
    <style>
        @media (max-width: 768px) {
            .sidebar-header { padding: 1rem; }
            .sidebar-content { padding-bottom: 2rem; }
            .sidebar-section { margin-top: 0.8rem; margin-bottom: 0.2rem; font-size: 0.7rem; }
            .sidebar-link { padding: 0.5rem 1.2rem; font-size: 0.85rem; }
            .sidebar-link.active { border-radius: 8px; }
        }
    </style>

    <aside class="admin-sidebar" id="mainNavbar">
        <div class="sidebar-header">
            <div style="font-weight: 800; font-size: 1.1rem; color: var(--primary-dark); letter-spacing: -0.5px;">Módulos</div>
            <div style="font-size: 0.75rem; color: var(--accent); text-transform: capitalize;">Panel de ${cargo}</div>
        </div>
        <div class="sidebar-content">
            
            <div class="sidebar-section">General</div>
            <a href="admin.html" class="sidebar-link ${currentPath.includes('admin.html') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                Inicio
            </a>

            <div class="sidebar-section">Gestión Académica</div>`;

    // OPCIONES PARA DIRECTOR, SUBDIRECTOR O DOCENTE (Orden Alfabético: A, C, D, E, F, H, P)
    if (isDir || isSub || isDoc) {
        html += `
            <a href="asistencia.html" class="sidebar-link ${currentPath.includes('asistencia') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                Asistencia
            </a>
            <a href="calificaciones.html" class="sidebar-link ${currentPath.includes('calificaciones') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Calificaciones
            </a>
            <a href="demeritos.html" class="sidebar-link ${currentPath.includes('demeritos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Deméritos
            </a>
            <a href="estudiantes.html" class="sidebar-link ${currentPath.includes('estudiantes') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                Estudiantes
            </a>
            <a href="fichas.html" class="sidebar-link ${currentPath.includes('fichas') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Fichas Escolares
            </a>
            <a href="horarios.html" class="sidebar-link ${currentPath.includes('horarios') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Horarios
            </a>
            <a href="pago_alimentos.html" class="sidebar-link ${currentPath.includes('pago_alimentos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
                Pago Alimentos
            </a>
        `;
    }

    // OPCIONES PARA DIRECTOR O SUBDIRECTOR (Orden Alfabético: F, I, P)
    if (isDir || isSub) {
        html += `

            <a href="permisos.html" class="sidebar-link ${currentPath.includes('permisos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Permisos
            </a>
        `;
    }

    // OPCIONES EXCLUSIVAS DE DIRECTOR (Orden Alfabético: A, A, B, C, C, C, D, G, M, R)
    if (isDir) {
        html += `
            <div class="sidebar-section">Root</div>
            <a href="asignaturas.html" class="sidebar-link ${currentPath.includes('asignaturas') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                Asignaturas
            </a>
            <a href="avisos.html" class="sidebar-link ${currentPath.includes('avisos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Avisos y Eventos
            </a>
            <a href="backup.html" class="sidebar-link ${currentPath.includes('backup') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Backup y Respaldo
            </a>
            <a href="calendario.html" class="sidebar-link ${currentPath.includes('calendario') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                Calendario
            </a>
            <a href="ciclo.html" class="sidebar-link ${currentPath.includes('ciclo') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 1-9 9m9-9a9 9 0 0 0-9-9m9 9H3m9 9a9 9 0 0 1-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"/></svg>
                Ciclo Escolar
            </a>
            <a href="consola.html" class="sidebar-link ${currentPath.includes('consola') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                Consola
            </a>
            <a href="docentes.html" class="sidebar-link ${currentPath.includes('docentes') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Docentes
            </a>
            <a href="fondos.html" class="sidebar-link ${currentPath.includes('fondos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                Fondos
            </a>
            <a href="grados.html" class="sidebar-link ${currentPath.includes('grados') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
                Grados
            </a>
            <a href="inventarios.html" class="sidebar-link ${currentPath.includes('inventarios') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Inventarios
            </a>
            <a href="matricula.html" class="sidebar-link ${currentPath.includes('matricula') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                Matrícula
            </a>
            <a href="recursos.html" class="sidebar-link ${currentPath.includes('recursos') ? 'active' : ''}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                Recursos
            </a>
            <a href="generador.html" class="sidebar-link" id="nav-generador">
    <i class='bx bxs-file-doc'></i> <span>Generador Documentos</span>
</a>
        `;
    }

    html += `</div></aside><div class="navbar-overlay" id="navbarOverlay"></div>`;
    container.innerHTML = html;
}