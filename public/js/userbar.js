import { auth, db } from './initFirebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

export async function initUserbar(options = {}) {
    const root = document.getElementById('userbar-root');
    if (!root) return;

    const brandHref = options.brandHref || '../index.html';

    // 1. INYECTAR ESTILOS EXTREMOS (A prueba de conflictos con tu userbar.css)
    if (!document.getElementById('userbar-ultra-styles')) {
        const style = document.createElement('style');
        style.id = 'userbar-ultra-styles';
        style.innerHTML = `
            .ub-master-container { display: flex !important; justify-content: space-between !important; align-items: center !important; width: 100% !important; padding: 0 1rem !important; }
            .ub-left-zone { display: flex !important; align-items: center !important; gap: 0.8rem !important; z-index: 9999 !important; visibility: visible !important; opacity: 1 !important; }
            
            .ub-btn-menu { 
                display: none !important; /* Oculto en PC por defecto */
                background: transparent !important; 
                border: none !important; 
                color: white !important; 
                cursor: pointer !important; 
                padding: 0 !important; 
                margin: 0 !important;
                align-items: center !important; 
                justify-content: center !important; 
            }
            .ub-btn-menu svg { width: 32px !important; height: 32px !important; }
            .ub-btn-menu:active { transform: scale(0.9); }

            .ub-logo-text { color: white !important; font-weight: 800 !important; font-size: 1rem !important; text-decoration: none !important; white-space: nowrap !important;}

            /* Forzar aparición de hamburguesa en Tablet/Móvil */
            @media (max-width: 1024px) {
                .ub-btn-menu { display: flex !important; } 
            }
            /* Ocultar solo el texto en pantallas mini (343px) para que la hamburguesa respire */
            @media (max-width: 450px) {
                .ub-logo-text { display: none !important; } 
            }
        `;
        document.head.appendChild(style);
    }

    // 2. INYECTAR ESTRUCTURA HTML
    root.innerHTML = `
        <div class="userbar ub-master-container">
            
            <div class="ub-left-zone">
                <button id="btnMobileMenu" class="ub-btn-menu" aria-label="Abrir Menú">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
                <a href="${brandHref}" class="ub-logo-text">CE Cantón Los Prados</a>
            </div>
            
            <div class="userbar-right">
                <div class="userbar-user" id="userbarDropdownToggle">
                    <div class="userbar-avatar" id="ubAvatar">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </div>
                    <div class="userbar-info" id="ubInfo">
                        <div class="userbar-skeleton">
                            <div class="skeleton-line w-sm"></div>
                            <div class="skeleton-line w-full"></div>
                        </div>
                    </div>
                    <svg class="userbar-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>

                    <div class="userbar-dropdown">
                        <div class="userbar-dropdown-header">
                            <div class="userbar-dropdown-name" id="ddName">Cargando...</div>
                            <div class="userbar-dropdown-email" id="ddEmail">Sincronizando</div>
                        </div>
                        <button class="userbar-dropdown-item danger" id="ubLogoutBtn">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> 
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // --- 3. LÓGICA DEL MENÚ HAMBURGUESA (ABRIR SIDEBAR) BLINDADA ---
    const menuToggle = document.getElementById('btnMobileMenu');
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Busca la sidebar, ya sea por clase o tomando el primer elemento dentro de su root
            const sidebar = document.querySelector('.admin-sidebar') || document.getElementById('admin-sidebar-root').firstElementChild;
            
            if (sidebar) {
                const isActive = sidebar.classList.contains('active');
                if (!isActive) {
                    sidebar.classList.add('active');
                    sidebar.classList.add('show');
                    // Forzar aparición directa por si el CSS falla
                    sidebar.style.setProperty('transform', 'translateX(0)', 'important');
                    sidebar.style.setProperty('left', '0', 'important');
                } else {
                    sidebar.classList.remove('active');
                    sidebar.classList.remove('show');
                    sidebar.style.removeProperty('transform');
                    sidebar.style.removeProperty('left');
                }
            }
        });
    }

    // --- 4. CERRAR SIDEBAR AL HACER CLIC FUERA DE ELLA ---
    document.addEventListener('click', (e) => {
        const sidebar = document.querySelector('.admin-sidebar') || document.getElementById('admin-sidebar-root')?.firstElementChild;
        const menuBtn = document.getElementById('btnMobileMenu');
        
        if (sidebar && sidebar.classList.contains('active')) {
            // Si el clic no fue dentro de la sidebar ni en el botón hamburguesa, se cierra
            if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
                sidebar.classList.remove('active');
                sidebar.classList.remove('show');
                sidebar.style.removeProperty('transform');
                sidebar.style.removeProperty('left');
            }
        }
    });

    const toggleBtn = document.getElementById('userbarDropdownToggle');
    const logoutBtn = document.getElementById('ubLogoutBtn');

    // --- LÓGICA DE MENÚ DESPLEGABLE DEL USUARIO ---
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBtn.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!toggleBtn.contains(e.target)) {
                toggleBtn.classList.remove('open');
            }
        });
    }

    // --- CERRAR SESIÓN ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            localStorage.removeItem('iconic_userData'); // Limpiamos la caché
            await signOut(auth);
            window.location.href = brandHref;
        });
    }

    // --- FUNCIÓN PARA PINTAR LA UI ---
    const renderUserData = (nombre, correo) => {
        const initials = nombre.substring(0, 2).toUpperCase();
        const avatarEl = document.getElementById('ubAvatar');
        const infoEl = document.getElementById('ubInfo');
        const nameEl = document.getElementById('ddName');
        const emailEl = document.getElementById('ddEmail');

        if(avatarEl) avatarEl.innerText = initials;
        if(infoEl) {
            infoEl.innerHTML = `
                <div class="userbar-name">${nombre}</div>
                <div class="userbar-email">${correo}</div>
            `;
        }
        if(nameEl) nameEl.innerText = nombre;
        if(emailEl) emailEl.innerText = correo;
    };

    // --- LISTENER DE ESTADO DE SESIÓN Y CACHÉ LOCALSTORAGE ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const currentEmail = user.email;
            
            // 1. REVISAR LOCALSTORAGE PRIMERO (Carga ultra rápida 0ms)
            const cachedDataStr = localStorage.getItem('iconic_userData');
            if (cachedDataStr) {
                try {
                    const cachedData = JSON.parse(cachedDataStr);
                    if (cachedData.email === currentEmail || cachedData.correo === currentEmail) {
                        const nombre = cachedData.nombreCompleto || cachedData.nombre || cachedData.name || currentEmail;
                        renderUserData(nombre, currentEmail);
                        return; // Cortamos ejecución aquí
                    }
                } catch (e) {
                    console.warn("Caché corrupta, recargando...");
                }
            }

            // 2. DESCARGAR DE FIREBASE SI NO HAY CACHÉ
            const isStudent = /^\d+$/.test(currentEmail.split('@')[0]); 
            
            try {
                const collectionName = isStudent ? 'users' : 'docentes';
                const searchField = isStudent ? 'email' : 'correo';
                
                let q = query(collection(db, collectionName), where(searchField, '==', currentEmail));
                let snap = await getDocs(q);

                if (snap.empty && isStudent) {
                    q = query(collection(db, collectionName), where('correo', '==', currentEmail));
                    snap = await getDocs(q);
                }

                if (!snap.empty) {
                    const dbData = snap.docs[0].data();
                    localStorage.setItem('iconic_userData', JSON.stringify(dbData));
                    const dbNombre = dbData.nombreCompleto || dbData.nombre || dbData.name || currentEmail;
                    renderUserData(dbNombre, currentEmail);
                } else {
                    localStorage.removeItem('iconic_userData');
                    await signOut(auth);
                    window.location.href = brandHref;
                }
            } catch (error) {
                console.error("Error obteniendo datos del usuario:", error);
                const nameEl = document.getElementById('ddName');
                if(nameEl) nameEl.innerText = "Error de conexión";
            }
        } else {
            localStorage.removeItem('iconic_userData');
        }
    });
}