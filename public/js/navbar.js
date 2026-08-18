export function initNavbar() {
    const currentPath = window.location.pathname;
    
    // 1. Array ordenado alfabéticamente
    const navItems = [
        { name: 'Inicio', icon: 'bx-home-alt', href: 'home.html' },
        { name: 'Calificaciones', icon: 'bx-task', href: 'calificaciones.html' },
        { name: 'Deméritos', icon: 'bx-shield-x', href: 'demeritos.html' },
        { name: 'Horario', icon: 'bx-time', href: 'horario.html' }
    ];

    // 2. Construcción de la barra lateral (Desktop y Mobile) + Overlay oscurecedor
    const desktopRoot = document.getElementById('navbar-root');
    if (desktopRoot) {
        desktopRoot.innerHTML = `
            <div class="sidebar-overlay" id="sidebarOverlay"></div>
            <aside class="student-sidebar" id="studentSidebar">
                <div class="sidebar-header">
                    <span class="sidebar-title">MENÚ ESTUDIANTIL</span>
                </div>
                <nav class="sidebar-nav">
                    ${navItems.map(item => {
                        const isActive = currentPath.includes(item.href) ? 'active' : '';
                        return `
                        <a href="${item.href}" class="nav-item ${isActive}">
                            <i class='bx ${item.icon}'></i>
                            <span>${item.name}</span>
                        </a>`;
                    }).join('')}
                </nav>
            </aside>
        `;
    }

    // 3. Limpiamos cualquier rastro del menú inferior por seguridad
    const mobileRoot = document.getElementById('navbar-mobile-root');
    if (mobileRoot) {
        mobileRoot.innerHTML = ''; 
    }

    // 4. SOLUCIÓN INFALIBLE (CAZADOR DE BOTÓN)
    // Buscamos activamente el botón de la hamburguesa cada 50ms hasta que el userbar lo dibuje.
    const cazarBoton = setInterval(() => {
        const userbarContenedor = document.getElementById('userbar-root');
        
        if (userbarContenedor) {
            // La hamburguesa siempre es el primer <button> que existe dentro del userbar
            const hamburguesa = userbarContenedor.querySelector('button'); 
            
            if (hamburguesa) {
                clearInterval(cazarBoton); // Lo encontramos, detenemos la búsqueda

                // Le inyectamos el evento a la fuerza, silenciando cualquier otro script
                hamburguesa.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    
                    const sidebar = document.getElementById('studentSidebar');
                    const overlay = document.getElementById('sidebarOverlay');
                    
                    if (sidebar && overlay) {
                        sidebar.classList.toggle('open');
                        overlay.classList.toggle('active');
                    }
                });
            }
        }
    }, 50);

    // 5. Cerrar el menú al tocar la pantalla oscura
    document.addEventListener('click', (e) => {
        if (e.target.closest('#sidebarOverlay')) {
            document.getElementById('studentSidebar').classList.remove('open');
            document.getElementById('sidebarOverlay').classList.remove('active');
        }
    });
}