(function () {
    const body = document.body;
    const page = body.dataset.page || "login";
    const role = body.dataset.role || null;
    const currentPath = window.location.pathname;
    const isUserRole = role === "usuario" || role === "tecnico" || role === "custodio";
    const pathDepth = currentPath.split("/").filter(Boolean).length;
    const basePrefix = page === "login" || pathDepth <= 2 ? "." : (isUserRole ? "../.." : "..");
    const API_BASE = `${basePrefix}/resources`;
    const STORAGE_SESSION = "inventario.session.demo";
    const PAGE_SIZE = 100;
    const VALID_STATES = [
        "OPERATIVO",
        "NO OPERATIVO",
        "REPORTADO PARA DAR DE BAJA"
    ];
    const TYPE_CONFIG = {
        pc: { label: "PC" },
        laptop: { label: "Laptop" },
        periferico: { label: "Periférico" },
        impresora: { label: "Impresora" },
        escaner: { label: "Escáner" },
        telefono: { label: "Teléfono" },
        proyector: { label: "Proyector" },
        infraestructura: { label: "Infraestructura" },
        licencia: { label: "Licencia" },
        modem: { label: "Modem" },
        bien_control_admin: { label: "Control admin." }
    };
    const CATEGORY_CONFIG = {
        laptops: {
            label: "Laptop",
            hint: "Equipo portátil para trabajo administrativo o técnico.",
            fields: ["procesador", "ram", "discoDuro", "sistemaOperativo", "numeroSerie"]
        },
        desktop: {
            label: "Desktop",
            hint: "Estación fija con foco en rendimiento de oficina o laboratorio.",
            fields: ["procesador", "ram", "discoDuro", "sistemaOperativo", "numeroSerie"]
        },
        telefonos: {
            label: "Teléfonos",
            hint: "Terminal telefónica o móvil asignada a un custodio o dependencia.",
            fields: ["numeroSerie", "linea", "imei"]
        },
        escaners: {
            label: "Escáner",
            hint: "Equipo de digitalización con datos de resolución y conexión.",
            fields: ["numeroSerie", "resolucion", "conexion"]
        },
        impresoras: {
            label: "Impresora",
            hint: "Equipo de impresión con tecnología y tipo de conexión.",
            fields: ["numeroSerie", "tecnologia", "conexion"]
        },
        perifericos: {
            label: "Periféricos",
            hint: "Accesorios como teclados, mouse, bases o monitores auxiliares.",
            fields: ["numeroSerie", "conexion", "compatibilidad"]
        },
        proyectores: {
            label: "Proyector",
            hint: "Equipo audiovisual con datos de resolución y brillo.",
            fields: ["numeroSerie", "resolucion", "lumenes"]
        },
        infraestructura: {
            label: "Infraestructura",
            hint: "Equipamiento de red, comunicaciones o soporte tecnolÃ³gico institucional.",
            fields: ["numeroSerie", "ip", "caracteristicas"]
        },
        licencias: {
            label: "Licencia",
            hint: "Activos lÃ³gicos o licencias de software asociadas al inventario.",
            fields: ["numeroSerie", "caracteristicas"]
        },
        modem: {
            label: "Modem",
            hint: "Equipos de conectividad mÃ³vil o fija con plan y servicio asociado.",
            fields: ["numeroSerie", "ip", "caracteristicas"]
        }
    };
    const SEARCH_QUICK_PRESETS = [
        { label: "Operativos", criteria: [{ field: "estado", value: "OPERATIVO" }] },
        { label: "No operativos", criteria: [{ field: "estado", value: "NO OPERATIVO" }] },
        { label: "PC", criteria: [{ field: "tipo", value: "pc" }] },
        { label: "Dell", criteria: [{ field: "marca", value: "Dell" }] }
    ];
    const NAV_ICONS = {
        dashboard: iconMarkup("dashboard"),
        inventario: iconMarkup("inventory"),
        // busqueda: iconMarkup("search"),  // COMENTADO: redundante con filtros de inventario
        "nuevo-equipo": iconMarkup("plusBox"),
        actas: iconMarkup("clipboard")
    };
    const INVENTORY_AUTOCOMPLETE = {
        filterCodigoSbai: "codigoSbai",
        filterCodigoMegan: "codigoMegan",
        filterDescripcion: "descripcion",
        filterMarca: "marca",
        filterModelo: "modelo",
        filterSerie: "numeroSerie",
        filterCustodio: "custodio",
        filterEdificio: "ubicacionEdificio",
        filterPiso: "ubicacionPiso",
        filterDireccion: "ubicacionDireccion"
    };
    const state = {
        session: null,
        inventory: [],
        filteredInventory: [],
        inventoryPage: 1,
        inventorySort: { key: "codigoSbai", direction: "asc" },
        searchCriteria: [],
        searchResults: [],
        equipmentFieldCatalog: {},
        exportSelection: null,
        sidebarOpen: false
    };

    document.addEventListener("DOMContentLoaded", () => {
        if (page === "login") {
            initLogin();
            return;
        }
        initShell();
    });

    function apiFetch(path, options) {
        return fetch(`${API_BASE}${path}`, Object.assign({ credentials: "same-origin" }, options || {}));
    }

    function setDemoSession(session) {
        localStorage.setItem(STORAGE_SESSION, JSON.stringify(session));
    }

    function getDemoSession() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_SESSION) || "null");
        } catch (error) {
            return null;
        }
    }

    function clearDemoSession() {
        localStorage.removeItem(STORAGE_SESSION);
    }

    function mapSession(data) {
        const rol = (data.rol || "").toUpperCase();
        let mappedRole, roleLabel;
        if (rol === "ADMINISTRADOR") {
            mappedRole = "admin";
            roleLabel = "Administrador";
        } else if (rol === "CUSTODIO") {
            mappedRole = "custodio";
            roleLabel = "Custodio";
        } else {
            mappedRole = "tecnico";
            roleLabel = "Tecnico";
        }

        const permisosPorRol = {
            admin:    { puedeEditarTodos: true,  puedeActualizarEstado: true,  puedeEditarCustodio: true,  puedeVer: true, puedeCrearEquipo: true,  puedeExportarInventario: true, puedeVerHistorial: true },
            tecnico:  { puedeEditarTodos: false, puedeActualizarEstado: false, puedeEditarCustodio: true,  puedeVer: true, puedeCrearEquipo: false, puedeExportarInventario: true, puedeVerHistorial: true },
            custodio: { puedeEditarTodos: false, puedeActualizarEstado: false, puedeEditarCustodio: false, puedeVer: true, puedeCrearEquipo: false, puedeExportarInventario: true, puedeVerHistorial: true }
        };

        return {
            username: data.usuario || data.username || "usuario",
            displayName: data.nombreCompleto || data.usuario || "Usuario",
            role: mappedRole,
            roleLabel: roleLabel,
            idCustodio: data.idCustodio || null,
            permisos: permisosPorRol[mappedRole] || permisosPorRol.tecnico,
            rolesDisponibles: data.rolesDisponibles || [rol]
        };
    }

    function redirectForRole(session) {
        let target;
        if (session.role === "admin") {
            target = `${basePrefix}/pages/dashboard.html`;
        } else if (session.role === "custodio") {
            target = `${basePrefix}/pages/custodio/dashboard.html`;
        } else {
            target = `${basePrefix}/pages/usuario/dashboard.html`;
        }
        window.location.href = target.replace("/pages/pages/", "/pages/");
    }

    function initLogin() {
        startClock();
        document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
        const demo = getDemoSession();
        if (demo) {
            redirectForRole(demo);
        }
    }

    async function handleLogin(event) {
        event.preventDefault();
        const submit = document.getElementById("loginSubmit");
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const rolElegido = document.getElementById("rolElegido")?.value || "";
        submit.disabled = true;
        hideLoginError();
        try {
            const response = await apiFetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, rolElegido })
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "Credenciales inválidas");
            }
            const session = mapSession(payload.data);
            setDemoSession(session);
            redirectForRole(session);
            return;
        } catch (error) {
            const demo = buildDemoSession(username, password);
            if (demo) {
                setDemoSession(demo);
                redirectForRole(demo);
                return;
            }
            showLoginError(error.message || "No fue posible iniciar sesión");
        } finally {
            submit.disabled = false;
        }
    }

    function buildDemoSession(username, password) {
        if (username === "admin" && password === "admin123") {
            return { username: "admin", displayName: "Administrador Demo", role: "admin", roleLabel: "Administrador", permisos: { puedeEditarTodos: true, puedeActualizarEstado: true, puedeEditarCustodio: true, puedeVer: true, puedeCrearEquipo: true, puedeExportarInventario: true, puedeVerHistorial: true } };
        }
        if ((username === "tecnico" || username === "usuario") && password === "tecnico123") {
            return { username: "tecnico", displayName: "Técnico Demo", role: "tecnico", roleLabel: "Técnico", permisos: { puedeEditarTodos: false, puedeActualizarEstado: false, puedeEditarCustodio: true, puedeVer: true, puedeCrearEquipo: false, puedeExportarInventario: true, puedeVerHistorial: true } };
        }
        return null;
    }

    function showLoginError(message) {
        const error = document.getElementById("loginError");
        if (!error) {
            return;
        }
        error.textContent = message;
        error.classList.remove("is-hidden");
    }

    function hideLoginError() {
        document.getElementById("loginError")?.classList.add("is-hidden");
    }

    function startClock() {
        const dateEl = document.getElementById("liveDate");
        const clockEl = document.getElementById("liveClock");
        if (!dateEl || !clockEl) {
            return;
        }
        const refresh = () => {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString("es-EC", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
            clockEl.textContent = now.toLocaleTimeString("es-EC");
        };
        refresh();
        setInterval(refresh, 1000);
    }

    async function initShell() {
        state.session = await resolveSession();
        if (!state.session) {
            window.location.href = `${basePrefix}/index.html`.replace("/pages/index.html", "/index.html");
            return;
        }
        if (state.session.role !== role) {
            redirectForRole(state.session);
            return;
        }
        if (page === "busqueda") {
            const target = role === "admin"
                ? `${basePrefix}/pages/inventario.html`
                : (role === "custodio" ? `${basePrefix}/pages/custodio/inventario.html` : `${basePrefix}/pages/usuario/inventario.html`);
            window.location.href = target;
            return;
        }
        renderShell();
        bindShellEvents();
        await loadInitialData();
    }

    async function resolveSession() {
        try {
            const response = await apiFetch("/login/actual");
            if (!response.ok) {
                throw new Error("Sin sesión");
            }
            const payload = await response.json();
            if (payload.success && payload.data) {
                const session = mapSession(payload.data);
                setDemoSession(session);
                return session;
            }
        } catch (error) {
            return getDemoSession();
        }
        return getDemoSession();
    }

    function renderShell() {
        const appShell = document.getElementById("appShell");
        appShell.innerHTML = `
            <div class="app-shell role-${role}">
                <aside class="sidebar" id="sidebar">
                    <div class="sidebar__brand">
                        <div class="brand-mark">SI</div>
                        <div>
                            <strong>Sistema Inventario</strong>
                            <span>${role === "admin" ? "Panel administrativo" : role === "custodio" ? "Panel custodio" : "Panel técnico"}</span>
                        </div>
                    </div>
                    <div class="sidebar__user">
                        <div class="avatar">${state.session.displayName.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${escapeHtml(state.session.displayName)}</strong>
                            <span>${state.session.roleLabel}</span>
                        </div>
                    </div>
                    <nav class="sidebar__nav">${buildNav()}</nav>
                    <button class="sidebar__logout" id="logoutButton">Cerrar sesión</button>
                </aside>
                <div class="app-main">
                    <header class="topbar">
                        <div class="topbar__actions">
                            <button class="topbar__toggle" id="sidebarToggle">☰</button>
                            <div class="topbar__title">
                                <h1>${pageTitle(page)}</h1>
                                <p>${pageDescription(page)}</p>
                            </div>
                        </div>
                        <div class="user-chip">${escapeHtml(state.session.displayName)} · ${state.session.roleLabel}</div>
                    </header>
                    <main class="content" id="pageContent"></main>
                </div>
            </div>
            <div class="modal-root" id="modalRoot"></div>
            <div class="toast-stack" id="toastStack"></div>
        `;
        document.getElementById("pageContent").innerHTML = renderPage();
    }

    function buildNav() {
        let nav;
        if (role === "admin") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/inventario.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`],
                ["actas", "ACTAS", `${basePrefix}/pages/actas.html`]
            ];
        } else if (role === "custodio") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/custodio/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/custodio/inventario.html`]
            ];
        } else {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`]
            ];
        }
        return nav
            .map(([key, label, href]) => `<a href="${href}" class="${key === page ? "is-active" : ""}"><span>•</span><span>${label}</span></a>`)
            .join("");
    }

    function pageTitle(pageName) {
        const titles = {
            dashboard: "Bienvenido",
            inventario: "Inventario",
            busqueda: "Búsqueda avanzada",
            "nuevo-equipo": "Nuevo equipo",
            actas: "Actas",
            "acta-equipos": "Acta de Equipos",
            "acta-software": "Acta de Software",
            "acta-rc": "Acta RC"
        };
        return titles[pageName] || "Sistema de Inventario";
    }

    function pageDescription(pageName) {
        const descriptions = {
            dashboard: "Accesos rápidos y vista general del sistema.",
            inventario: "Filtros combinables, tabla dinámica y exportación del resultado filtrado.",
            busqueda: "Búsqueda multi-criterio en cliente sobre el inventario cargado.",
            "nuevo-equipo": "Formulario dinámico por categoría con guardado simulado."
        };
        return descriptions[pageName] || "";
    }

    function renderPage() {
        if (page === "dashboard") {
            return renderDashboard();
        }
        if (page === "inventario") {
            return renderInventoryPage();
        }
        if (page === "busqueda") {
            return renderSearchPage();
        }
        if (page === "nuevo-equipo") {
            return renderNewEquipmentPage();
        }
        if (page === "actas") {
            return renderActasHubPage();
        }
        if (page === "acta-equipos" || page === "acta-software" || page === "acta-rc") {
            return renderActaFormPage(page);
        }
        return "";
    }

    function renderDashboard() {
        return `
            <section class="hero">
                <div class="hero__grid">
                    <div>
                        <h2>Inventario institucional conectado a la base real.</h2>
                        <p>Consulta equipos tecnológicos, aplica filtros por varios campos y exporta el resultado actual desde el mismo módulo de inventario.</p>
                    </div>
                    <div class="stats-grid">
                        <article class="stat-card"><span>Total cargado</span><strong id="statTotal">--</strong></article>
                        <article class="stat-card"><span>Operativos</span><strong id="statActive">--</strong></article>
                        <article class="stat-card"><span>Ubicaciones</span><strong id="statLocations">--</strong></article>
                    </div>
                </div>
            </section>
            <div class="section-heading">
                <div>
                    <h2>Accesos rápidos</h2>
                    <p>Inventario, búsqueda y herramientas principales del sistema.</p>
                </div>
            </div>
            <section class="quick-grid">${dashboardCards().join("")}</section>
        `;
    }

    function dashboardCards() {
        let cards;
        if (role === "admin") {
            cards = [
                ["Inventario", "Filtra, revisa y exporta el inventario completo.", `${basePrefix}/pages/inventario.html`],
                ["Nuevo Equipo", "Registra un nuevo equipo tecnológico.", `${basePrefix}/pages/nuevo-equipo.html`]
            ];
        } else if (role === "custodio") {
            cards = [
                ["Mi Inventario", "Equipos asignados a tu custodia.", `${basePrefix}/pages/custodio/inventario.html`]
            ];
        } else {
            cards = [
                ["Inventario", "Filtra equipos, cambia custodios y revisa el historial.", `${basePrefix}/pages/usuario/inventario.html`]
            ];
        }
        return cards.map(([title, text, href]) => `<a class="mini-card" href="${href}"><strong>${title}</strong><span>${text}</span></a>`);
    }

    function renderInventoryPage() {
        return `
            <section class="panel">
                <div class="stats-grid">
                    <article class="stat-card"><span>Total de equipos</span><strong id="inventoryStatTotal">--</strong></article>
                </div>
                <div class="filters-grid">
                    <div class="field-group">
                        <label for="filterTipo">Tipo</label>
                        <select id="filterTipo">
                            <option value="">Todos</option>
                            ${buildTypeOptions()}
                        </select>
                    </div>
                    <div class="field-group">
                        <label for="filterCodigoSbai">Código SBYE</label>
                        <input id="filterCodigoSbai" type="text" placeholder="Filtrar por código SBYE">
                    </div>
                    <div class="field-group">
                        <label for="filterCodigoMegan">Código Megan</label>
                        <input id="filterCodigoMegan" type="text" placeholder="Filtrar por código Megan">
                    </div>
                    <div class="field-group">
                        <label for="filterDescripcion">Descripción</label>
                        <input id="filterDescripcion" type="text" placeholder="Filtrar por descripción">
                    </div>
                    <div class="field-group">
                        <label for="filterMarca">Marca</label>
                        <input id="filterMarca" type="text" placeholder="Filtrar por marca">
                    </div>
                    <div class="field-group">
                        <label for="filterModelo">Modelo</label>
                        <input id="filterModelo" type="text" placeholder="Filtrar por modelo">
                    </div>
                    <div class="field-group">
                        <label for="filterSerie">Serie</label>
                        <input id="filterSerie" type="text" placeholder="Filtrar por serie">
                    </div>
                    <div class="field-group">
                        <label for="filterCustodio">Custodio</label>
                        <input id="filterCustodio" type="text" placeholder="Filtrar por custodio">
                    </div>
                    <div class="field-group">
                        <label for="filterEdificio">Edificio</label>
                        <input id="filterEdificio" type="text" placeholder="Filtrar por edificio">
                    </div>
                    <div class="field-group">
                        <label for="filterPiso">Piso</label>
                        <input id="filterPiso" type="text" placeholder="Filtrar por piso">
                    </div>
                    <div class="field-group">
                        <label for="filterDireccion">Dirección</label>
                        <input id="filterDireccion" type="text" placeholder="Filtrar por dirección">
                    </div>
                    <div class="field-group">
                        <label for="filterEstado">Estado</label>
                        <select id="filterEstado">
                            <option value="">Todos</option>
                            ${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}
                        </select>
                    </div>
                </div>
                <div class="toolbar" style="margin-top:16px;">
                    <button class="btn btn-primary" id="applyInventoryFilters">Filtrar</button>
                    <button class="btn btn-secondary" id="clearInventoryFilters">Limpiar</button>
                    <button class="btn btn-success" id="exportInventoryExcel">Exportar a Excel</button>
                    <button class="btn btn-secondary" id="exportInventoryPdf">Exportar a PDF</button>
                </div>
                <div id="inventoryMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDireccion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="inventoryMobile"></div>
                <div class="pagination">
                    <span id="inventoryPaginationMeta"></span>
                    <div class="toolbar">
                        <button class="btn btn-secondary" id="prevPage">Anterior</button>
                        <button class="btn btn-secondary" id="nextPage">Siguiente</button>
                    </div>
                </div>
            </section>
        `;
    }

    function renderSearchPage() {
        const criteriaOptions = ["tipo", "codigoMegan", "codigoSbai", "descripcion", "numeroSerie", "marca", "modelo", "custodio", "ubicacion", "estado", "procesador", "caracteristicas"];
        return `
            <section class="panel">
                <div class="tag-builder">
                    <div class="field-group">
                        <label for="criteriaField">Campo</label>
                        <select id="criteriaField">${criteriaOptions.map((field) => `<option value="${field}">${labelForColumn(field)}</option>`).join("")}</select>
                    </div>
                    <div class="field-group">
                        <label for="criteriaValue">Valor</label>
                        <input id="criteriaValue" type="text" placeholder="Ingresa un valor">
                    </div>
                    <div class="field-group">
                        <label>&nbsp;</label>
                        <button class="btn btn-primary" id="addCriteria">Agregar criterio</button>
                    </div>
                </div>
                <div class="search-tags" id="searchQuickPresets">
                    ${SEARCH_QUICK_PRESETS.map((item, index) => `<button class="search-tag search-tag--button" type="button" data-search-preset="${index}">${item.label}</button>`).join("")}
                </div>
                <div class="search-tags" id="searchTags"></div>
                <div class="toolbar" style="margin-top:16px;">
                    <button class="btn btn-primary" id="runSearch">Buscar</button>
                    <button class="btn btn-secondary" id="clearSearch">Limpiar</button>
                </div>
                <div id="searchMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Código Megan</th>
                                <th>Código SBYE</th>
                                <th>Descripción</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th>Custodio</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody id="searchBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="searchMobile"></div>
                <div class="empty-state hidden" id="searchEmpty">Carga los datos y aplica uno o varios criterios para filtrar.</div>
            </section>
        `;
    }

    function renderNewEquipmentPage() {
        return `
            <section class="panel">
                <div class="split">
                    <div>
                        <div class="field-group">
                            <label for="equipmentCategory">Categoría</label>
                            <select id="equipmentCategory">
                                <option value="laptops">Laptop</option>
                                <option value="desktop">Desktop</option>
                                <option value="telefonos">Teléfonos</option>
                                <option value="escaners">Escáner</option>
                                <option value="impresoras">Impresora</option>
                                <option value="perifericos">Periférico</option>
                                <option value="proyectores">Proyector</option>
                            </select>
                        </div>
                        <form id="newEquipmentForm">
                            <div class="form-grid" id="dynamicEquipmentFields"></div>
                            <div class="form-actions" style="margin-top:18px;">
                                <button class="btn btn-primary" type="submit">Guardar equipo</button>
                                <button class="btn btn-secondary" type="reset">Limpiar</button>
                            </div>
                        </form>
                    </div>
                    <div class="panel" style="margin-top:0;">
                        <h3>Comportamiento</h3>
                        <p class="muted">Esta pantalla mantiene el formulario dinámico de registro simulado del proyecto.</p>
                        <div class="report-history" id="equipmentFieldSummary"></div>
                    </div>
                </div>
            </section>
        `;
    }

    function bindShellEvents() {
        document.getElementById("sidebarToggle")?.addEventListener("click", () => {
            state.sidebarOpen = !state.sidebarOpen;
            document.getElementById("sidebar")?.classList.toggle("is-open", state.sidebarOpen);
        });
        document.getElementById("logoutButton")?.addEventListener("click", logout);
        document.getElementById("modalRoot")?.addEventListener("click", (event) => {
            if (event.target.classList.contains("modal-backdrop")) {
                closeModal();
            }
        });

        if (page === "inventario") {
            bindInventoryEvents();
        }
        if (page === "busqueda") {
            // COMENTADO: redundante con filtros del módulo de inventario
            // return renderSearchPage();
            return renderInventoryPage();
        }
        if (page === "busqueda") {
            // COMENTADO: redundante con filtros del módulo de inventario
            // bindSearchEvents();
        }
        if (page === "nuevo-equipo") {
            bindNewEquipmentEvents();
        }
        if (isActasPage(page)) {
            bindActasEvents();
        }
    }

    async function loadInitialData() {
        if (page === "dashboard" || page === "inventario" || page === "busqueda" || page === "acta-equipos") {
            await loadInventory();
            updateDashboardStats();
        }
        if (page === "inventario") {
            renderInventory();
        }
        if (page === "busqueda") {
            // COMENTADO: redundante con filtros del módulo de inventario
            // renderSearchTags();
            // renderSearchResults([]);
        }
        if (page === "nuevo-equipo") {
            renderDynamicFields(document.getElementById("equipmentCategory").value);
        }
    }

    async function loadInventory() {
        const items = await fetchInventoryType("todos");
        state.inventory = normalizeItems(items);
        state.filteredInventory = state.inventory.slice();
    }

    async function fetchInventoryType(type) {
        try {
            const response = await apiFetch(`/inventario/${type}`);
            if (!response.ok) {
                throw new Error(type);
            }
            const payload = await response.json();
            return Array.isArray(payload.data) ? payload.data : [];
        } catch (error) {
            showToast("Error", "No se pudo cargar el inventario desde el backend.", "danger");
            return [];
        }
    }

    function normalizeItems(items) {
        return items.map((item) => ({
            id: item.id,
            tipo: item.tipo || "",
            subtipo: item.subtipo || "",
            codigoSbai: item.codigoSbai || "",
            codigoMegan: item.codigoMegan || "",
            descripcion: item.descripcion || "",
            numeroSerie: item.numeroSerie || "",
            marca: item.marca || "",
            modelo: item.modelo || "",
            custodio: item.custodio || "",
            ubicacion: item.ubicacion || "",
            ubicacionEdificio: item.ubicacionEdificio || "",
            ubicacionPiso: item.ubicacionPiso || "",
            ubicacionDireccion: item.ubicacionDireccion || "",
            estado: normalizeState(item.estado || ""),
            procesador: item.procesador || "",
            caracteristicas: item.caracteristicas || "",
            observacion: item.observacion || "",
            ip: item.ip || "",
            fechaIngreso: item.fechaIngreso || "",
            ultimoMantenimiento: item.ultimoMantenimiento || "",
            raw: item
        }));
    }

    function updateDashboardStats() {
        if (page !== "dashboard") {
            return;
        }
        const total = state.inventory.length;
        const active = state.inventory.filter((item) => item.estado === "OPERATIVO").length;
        const locations = new Set(state.inventory.map((item) => item.ubicacion).filter(Boolean)).size;
        setText("statTotal", total);
        setText("statActive", active);
        setText("statLocations", locations);
    }

    function bindInventoryEvents() {
        inventoryFilterIds().forEach((id) => {
            document.getElementById(id)?.addEventListener("input", applyInventoryFilters);
            document.getElementById(id)?.addEventListener("change", applyInventoryFilters);
        });
        document.getElementById("applyInventoryFilters")?.addEventListener("click", applyInventoryFilters);
        document.getElementById("clearInventoryFilters")?.addEventListener("click", clearInventoryFilters);
        document.getElementById("exportInventoryExcel")?.addEventListener("click", () => openExportDialog("excel"));
        document.getElementById("exportInventoryPdf")?.addEventListener("click", () => openExportDialog("pdf"));
        document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => sortInventory(button.dataset.sort)));
        document.getElementById("prevPage")?.addEventListener("click", () => changePage(-1));
        document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
    }

    function inventoryFilterIds() {
        return [
            "filterTipo",
            "filterCodigoSbai",
            "filterCodigoMegan",
            "filterDescripcion",
            "filterMarca",
            "filterModelo",
            "filterSerie",
            "filterCustodio",
            "filterEdificio",
            "filterPiso",
            "filterDireccion",
            "filterEstado"
        ];
    }

    function readInventoryFilters() {
        return {
            tipo: document.getElementById("filterTipo")?.value.trim().toLowerCase() || "",
            codigoSbai: document.getElementById("filterCodigoSbai")?.value.trim().toLowerCase() || "",
            codigoMegan: document.getElementById("filterCodigoMegan")?.value.trim().toLowerCase() || "",
            descripcion: document.getElementById("filterDescripcion")?.value.trim().toLowerCase() || "",
            marca: document.getElementById("filterMarca")?.value.trim().toLowerCase() || "",
            modelo: document.getElementById("filterModelo")?.value.trim().toLowerCase() || "",
            numeroSerie: document.getElementById("filterSerie")?.value.trim().toLowerCase() || "",
            custodio: document.getElementById("filterCustodio")?.value.trim().toLowerCase() || "",
            edificio: document.getElementById("filterEdificio")?.value.trim().toLowerCase() || "",
            piso: document.getElementById("filterPiso")?.value.trim().toLowerCase() || "",
            direccion: document.getElementById("filterDireccion")?.value.trim().toLowerCase() || "",
            estado: document.getElementById("filterEstado")?.value.trim().toLowerCase() || ""
        };
    }

    function applyInventoryFilters() {
        const filters = readInventoryFilters();
        state.inventoryPage = 1;
        state.filteredInventory = state.inventory.filter((item) => {
            return matchesFilter(item.tipo, filters.tipo)
                && matchesFilter(item.codigoSbai, filters.codigoSbai)
                && matchesFilter(item.codigoMegan, filters.codigoMegan)
                && matchesFilter(item.descripcion, filters.descripcion)
                && matchesFilter(item.marca, filters.marca)
                && matchesFilter(item.modelo, filters.modelo)
                && matchesFilter(item.numeroSerie, filters.numeroSerie)
                && matchesFilter(item.custodio, filters.custodio)
                && matchesFilter(item.ubicacionEdificio, filters.edificio)
                && matchesFilter(item.ubicacionPiso, filters.piso)
                && matchesFilter(item.ubicacionDireccion, filters.direccion)
                && matchesFilter(item.estado, filters.estado);
        });
        sortInventory(state.inventorySort.key, false);
    }

    function changePage(delta) {
        const totalPages = Math.max(1, Math.ceil(state.filteredInventory.length / PAGE_SIZE));
        const nextPage = Math.min(totalPages, Math.max(1, state.inventoryPage + delta));
        if (nextPage === state.inventoryPage) {
            return;
        }
        state.inventoryPage = nextPage;
        renderInventory();
    }

    function clearInventoryFilters() {
        inventoryFilterIds().forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = "";
            }
        });
        state.filteredInventory = state.inventory.slice();
        state.inventoryPage = 1;
        sortInventory(state.inventorySort.key, false);
    }

    function matchesFilter(value, filter) {
        return !filter || String(value || "").toLowerCase().includes(filter);
    }

    function sortInventory(key, toggleDirection = true) {
        if (toggleDirection && state.inventorySort.key === key) {
            state.inventorySort.direction = state.inventorySort.direction === "asc" ? "desc" : "asc";
        } else {
            state.inventorySort = { key, direction: "asc" };
        }
        const factor = state.inventorySort.direction === "asc" ? 1 : -1;
        state.filteredInventory.sort((a, b) => String(a[key] || "").localeCompare(String(b[key] || ""), "es", { numeric: true }) * factor);
        renderInventory();
    }

    function renderInventory() {
        const tbody = document.getElementById("inventoryBody");
        const mobile = document.getElementById("inventoryMobile");
        if (!tbody || !mobile) {
            return;
        }
        const total = state.filteredInventory.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        state.inventoryPage = Math.min(state.inventoryPage, totalPages);
        const start = (state.inventoryPage - 1) * PAGE_SIZE;
        const pageItems = state.filteredInventory.slice(start, start + PAGE_SIZE);

        updateInventoryStats();
        setText("inventoryMeta", `${total} resultados filtrados · página ${state.inventoryPage} de ${totalPages}`);
        setText("inventoryPaginationMeta", pageItems.length ? `Mostrando ${start + 1}-${start + pageItems.length}` : "Sin resultados");
        tbody.innerHTML = pageItems.length
            ? pageItems.map(renderInventoryRow).join("")
            : `<tr><td colspan="11">No hay equipos para los filtros aplicados.</td></tr>`;
        mobile.innerHTML = pageItems.map(renderMobileInventoryCard).join("");
    }

    function updateInventoryStats() {
        setText("inventoryStatTotal", state.filteredInventory.length);
    }

    function renderInventoryRow(item) {
        const permisos = state.session && state.session.permisos ? state.session.permisos : {};
        const btnEditar = permisos.puedeEditarTodos
            ? `<button class="btn-action btn-edit-full" onclick="abrirModalEditar(${item.id})">Editar</button>`
            : "";
        const btnCustodio = !permisos.puedeEditarTodos && permisos.puedeEditarCustodio
            ? `<button class="btn-action btn-edit" onclick="abrirModalCustodio(${item.id})">Custodio</button>`
            : "";
        const btnEstado = !permisos.puedeEditarTodos && permisos.puedeActualizarEstado
            ? `<button class="btn-action btn-state" onclick="abrirModalEstado(${item.id}, '${escapeHtml(item.estado || '')}')">Estado</button>`
            : "";
        const btnHistorial = `<button class="btn-action btn-history" onclick="abrirModalHistorial(${item.id})">Historial</button>`;
        return `
            <tr>
                <td>${escapeHtml(item.codigoSbai || "-")}</td>
                <td>${escapeHtml(item.codigoMegan || "-")}</td>
                <td>${escapeHtml(item.descripcion || "-")}</td>
                <td>${escapeHtml(displayInventoryType(item))}</td>
                <td>${escapeHtml(item.marca || "-")}</td>
                <td>${escapeHtml(item.modelo || "-")}</td>
                <td>${escapeHtml(item.numeroSerie || "-")}</td>
                <td>${escapeHtml(item.custodio || "-")}</td>
                <td>${escapeHtml(item.ubicacionEdificio || "-")}</td>
                <td>${escapeHtml(item.ubicacionPiso || "-")}</td>
                <td>${escapeHtml(item.ubicacionDireccion || "-")}</td>
                <td>${escapeHtml(item.procesador || item.caracteristicas || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
                <td class="actions-cell">${btnEditar} ${btnCustodio} ${btnEstado} ${btnHistorial}</td>
            </tr>
        `;
    }

    function renderMobileInventoryCard(item) {
        return `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai || "-")} · ${escapeHtml(displayInventoryType(item))}</strong>
                <span>Megan: ${escapeHtml(item.codigoMegan || "-")}</span>
                <span>Descripción: ${escapeHtml(item.descripcion || "-")}</span>
                <span>Marca / Modelo: ${escapeHtml(item.marca || "-")} ${escapeHtml(item.modelo || "")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Ubicación: ${escapeHtml(item.ubicacion || "-")}</span>
                <span>Detalle: ${escapeHtml(item.procesador || item.caracteristicas || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
            </article>
        `;
    }

    function exportInventoryToExcel() {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }
        const header = ["Código SBYE", "Código Megan", "Descripción", "Tipo", "Marca", "Modelo", "Serie", "Custodio", "Edificio", "Piso", "Dirección", "Detalle", "Estado"];
        const bodyRows = rows.map((item) => [
            item.codigoSbai,
            item.codigoMegan,
            item.descripcion,
            displayInventoryType(item),
            item.marca,
            item.modelo,
            item.numeroSerie,
            item.custodio,
            item.ubicacionEdificio,
            item.ubicacionPiso,
            item.ubicacionDireccion,
            item.procesador || item.caracteristicas,
            item.estado
        ]);
        const table = `
            <table>
                <thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
                <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "")}</td>`).join("")}</tr>`).join("")}</tbody>
            </table>`;
        downloadBlob(
            new Blob([`\ufeff<html><head><meta charset="UTF-8"></head><body>${table}</body></html>`], { type: "application/vnd.ms-excel" }),
            `inventario_filtrado_${timestampForFile()}.xls`
        );
    }

    function exportInventoryToPdf() {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }
        const win = window.open("", "_blank");
        if (!win) {
            showToast("Bloqueado", "Permite ventanas emergentes para generar el PDF.", "info");
            return;
        }
        win.document.write(`
            <html>
                <head>
                    <title>Inventario filtrado</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 24px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                        h1 { margin-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <h1>Inventario filtrado</h1>
                    <p>Total exportado: ${rows.length}</p>
                    <table>
                        <thead>
                            <tr>
                                <th>Código SBYE</th>
                                <th>Código Megan</th>
                                <th>Descripción</th>
                                <th>Tipo</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th>Custodio</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows.map((item) => `
                                <tr>
                                    <td>${escapeHtml(item.codigoSbai || "-")}</td>
                                    <td>${escapeHtml(item.codigoMegan || "-")}</td>
                                    <td>${escapeHtml(item.descripcion || "-")}</td>
                                    <td>${escapeHtml(displayInventoryType(item))}</td>
                                    <td>${escapeHtml(item.marca || "-")}</td>
                                    <td>${escapeHtml(item.modelo || "-")}</td>
                                    <td>${escapeHtml(item.custodio || "-")}</td>
                                    <td>${escapeHtml(item.ubicacion || "-")}</td>
                                    <td>${escapeHtml(item.estado || "-")}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                    <script>window.onload = function(){ window.print(); }<\/script>
                </body>
            </html>
        `);
        win.document.close();
    }

    function bindSearchEvents() {
        document.getElementById("addCriteria")?.addEventListener("click", () => {
            const field = document.getElementById("criteriaField").value;
            const value = document.getElementById("criteriaValue").value.trim();
            if (!value) {
                return;
            }
            state.searchCriteria.push({ field, value });
            document.getElementById("criteriaValue").value = "";
            renderSearchTags();
        });
        document.getElementById("runSearch")?.addEventListener("click", runSearch);
        document.getElementById("clearSearch")?.addEventListener("click", () => {
            state.searchCriteria = [];
            renderSearchTags();
            renderSearchResults([]);
        });
        document.querySelectorAll("[data-search-preset]").forEach((button) =>
            button.addEventListener("click", () => applySearchPreset(Number(button.dataset.searchPreset)))
        );
    }

    function renderSearchTags() {
        const container = document.getElementById("searchTags");
        if (!container) {
            return;
        }
        container.innerHTML = state.searchCriteria.map((criteria, index) => `
            <span class="search-tag">${labelForColumn(criteria.field)}: ${escapeHtml(criteria.value)} <button class="table-sort" data-remove="${index}">×</button></span>
        `).join("");
        container.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
            state.searchCriteria.splice(Number(button.dataset.remove), 1);
            renderSearchTags();
        }));
    }

    function runSearch() {
        state.searchResults = state.inventory.filter((item) => state.searchCriteria.every((criteria) =>
            String(item[criteria.field] || "").toLowerCase().includes(String(criteria.value || "").toLowerCase())
        ));
        renderSearchResults(state.searchResults);
    }

    function renderSearchResults(results) {
        const tbody = document.getElementById("searchBody");
        const mobile = document.getElementById("searchMobile");
        const empty = document.getElementById("searchEmpty");
        if (!tbody || !mobile || !empty) {
            return;
        }
        const hasCriteria = state.searchCriteria.length > 0;
        empty.classList.toggle("hidden", hasCriteria);
        setText("searchMeta", hasCriteria ? `${results.length} resultados encontrados.` : "Añade criterios para iniciar la búsqueda.");
        if (!hasCriteria) {
            tbody.innerHTML = "";
            mobile.innerHTML = "";
            return;
        }
        tbody.innerHTML = results.length ? results.map((item) => `
            <tr>
                <td>${escapeHtml(item.codigoMegan || "-")}</td>
                <td>${escapeHtml(item.codigoSbai || "-")}</td>
                <td>${escapeHtml(item.descripcion || "-")}</td>
                <td>${escapeHtml(item.marca || "-")}</td>
                <td>${escapeHtml(item.modelo || "-")}</td>
                <td>${escapeHtml(item.custodio || "-")}</td>
                <td>${escapeHtml(item.ubicacion || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
                <td>${escapeHtml(item.procesador || item.caracteristicas || "-")}</td>
            </tr>
        `).join("") : '<tr><td colspan="9">No se encontraron coincidencias.</td></tr>';
        mobile.innerHTML = results.map((item) => `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai || "-")}</strong>
                <span>Descripción: ${escapeHtml(item.descripcion || "-")}</span>
                <span>Marca / Modelo: ${escapeHtml(item.marca || "-")} ${escapeHtml(item.modelo || "")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
            </article>
        `).join("");
    }

    function applySearchPreset(index) {
        const preset = SEARCH_QUICK_PRESETS[index];
        if (!preset) {
            return;
        }
        state.searchCriteria = preset.criteria.map((item) => Object.assign({}, item));
        renderSearchTags();
        runSearch();
    }

    function bindNewEquipmentEvents() {
        document.getElementById("equipmentCategory")?.addEventListener("change", (event) => renderDynamicFields(event.target.value));
        document.getElementById("newEquipmentForm")?.addEventListener("submit", (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const category = document.getElementById("equipmentCategory").value;
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            showToast("Guardando", "Simulando guardado del formulario...", "info");
            setTimeout(() => {
                button.disabled = false;
                form.reset();
                document.getElementById("equipmentCategory").value = category;
                renderDynamicFields(category);
                showToast("Equipo simulado", "El nuevo equipo se registró en la interfaz sin usar API.", "success");
            }, 900);
        });
    }

    function renderDynamicFields(category) {
        const container = document.getElementById("dynamicEquipmentFields");
        if (!container) {
            return;
        }
        const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.laptops;
        const fields = ["codigoMegan", "codigoSbai", "descripcion", "marca", "modelo", "custodio", "ubicacion", "estado"].concat(categoryConfig.fields || []);
        container.innerHTML = fields.map((field) => {
            if (field === "estado") {
                return editField(field, labelForColumn(field), "OPERATIVO", false, "select");
            }
            return editField(field, labelForColumn(field), "");
        }).join("");
        const select = container.querySelector('select[name="estado"]');
        if (select) {
            select.value = "OPERATIVO";
        }
        setText("equipmentCategoryHint", categoryConfig.hint || "");
        renderEquipmentSummary(categoryConfig, fields);
    }

    function renderEquipmentSummary(categoryConfig, fields) {
        const summary = document.getElementById("equipmentFieldSummary");
        if (!summary) {
            return;
        }
        summary.innerHTML = `
            <article class="report-history__item">
                <strong>${categoryConfig.label}</strong>
                <div class="muted">${categoryConfig.hint || ""}</div>
            </article>
            <article class="report-history__item">
                <strong>Detalle de campos</strong>
                <div class="muted">${fields.map((field) => labelForColumn(field)).join(" · ")}</div>
            </article>
        `;
    }

    async function logout() {
        try {
            await apiFetch("/login/logout", { method: "POST" });
        } catch (error) {
            // noop
        }
        clearDemoSession();
        window.location.href = `${basePrefix}/index.html`.replace("/pages/index.html", "/index.html");
    }

    function openModal(title, bodyHtml, actions, extraClass) {
        const modalRoot = document.getElementById("modalRoot");
        modalRoot.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal${extraClass ? " " + extraClass : ""}">
                <div class="modal__header">
                    <h3>${title}</h3>
                    <button class="modal-close" id="modalClose">×</button>
                </div>
                <div class="modal__body">${bodyHtml}</div>
                <div class="modal__footer form-actions" id="modalFooter"></div>
            </div>
        `;
        modalRoot.classList.add("is-open");
        document.getElementById("modalClose").addEventListener("click", closeModal);
        const footer = document.getElementById("modalFooter");
        (actions || [{ label: "Cerrar", className: "btn btn-secondary", onClick: closeModal }]).forEach((action) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = action.className;
            button.textContent = action.label;
            button.addEventListener("click", action.onClick);
            footer.appendChild(button);
        });
    }

    function closeModal() {
        const modalRoot = document.getElementById("modalRoot");
        modalRoot.classList.remove("is-open");
        modalRoot.innerHTML = "";
    }

    function showToast(title, message, type) {
        const stack = document.getElementById("toastStack");
        if (!stack) {
            return;
        }
        const toast = document.createElement("div");
        toast.className = `toast toast-${type || "info"}`;
        toast.innerHTML = `<strong>${title}</strong><span>${message}</span>`;
        stack.appendChild(toast);
        setTimeout(() => toast.remove(), 3200);
    }

    function buildTypeOptions() {
        return Object.keys(TYPE_CONFIG)
            .map((key) => `<option value="${key}">${TYPE_CONFIG[key].label}</option>`)
            .join("");
    }

    function typeLabel(type) {
        return TYPE_CONFIG[type]?.label || type || "-";
    }

    function displayInventoryType(item) {
        const base = typeLabel(item?.tipo);
        const subtipo = String(item?.subtipo || "").trim();
        return item?.tipo === "infraestructura" && subtipo ? `${base} - ${subtipo}` : base;
    }

    function normalizeState(value) {
        const normalized = String(value || "").trim().toUpperCase();
        if (VALID_STATES.includes(normalized)) {
            return normalized;
        }
        if (normalized === "ACTIVO") {
            return "OPERATIVO";
        }
        if (normalized === "INACTIVO" || normalized === "DAÑADO" || normalized === "DANADO") {
            return "NO OPERATIVO";
        }
        if (normalized === "REPORTADO PARA BAJA" || normalized === "BAJA") {
            return "REPORTADO PARA DAR DE BAJA";
        }
        return "NO OPERATIVO";
    }

    function labelForColumn(key) {
        const labels = {
            codigoSbai: "Código SBYE",
            codigoMegan: "Código Megan",
            descripcion: "Descripción",
            tipo: "Tipo",
            marca: "Marca",
            modelo: "Modelo",
            numeroSerie: "S/N",
            custodio: "Custodio",
            ubicacion: "Ubicación",
            ubicacionEdificio: "Edificio",
            ubicacionPiso: "Piso",
            ubicacionDireccion: "Dirección",
            estado: "Estado",
            procesador: "Detalle",
            caracteristicas: "Características",
            observacion: "Observaciones",
            sistemaOperativo: "SO",
            ram: "RAM",
            discoDuro: "Disco Duro",
            linea: "Línea",
            imei: "IMEI",
            resolucion: "Resolución",
            conexion: "Conexión",
            tecnologia: "Tecnología",
            compatibilidad: "Compatibilidad",
            lumenes: "Lúmenes"
        };
        return labels[key] || key;
    }

    function stateBadge(status) {
        const label = normalizeState(status);
        if (label === "OPERATIVO") {
            return `<span class="badge badge-success">${label}</span>`;
        }
        if (label === "REPORTADO PARA DAR DE BAJA") {
            return `<span class="badge badge-danger">${label}</span>`;
        }
        return `<span class="badge badge-warning">${label}</span>`;
    }

    function editField(name, label, value, disabled, type) {
        if (type === "textarea") {
            return `<label class="field-group"><span>${label}</span><textarea name="${name}" ${disabled ? "disabled" : ""}>${escapeHtml(value || "")}</textarea></label>`;
        }
        if (type === "select") {
            return `<label class="field-group"><span>${label}</span><select name="${name}" ${disabled ? "disabled" : ""}>
                ${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}
            </select></label>`;
        }
        return `<label class="field-group"><span>${label}</span><input name="${name}" value="${escapeHtml(value || "")}" ${disabled ? "readonly" : ""}></label>`;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function stripHtml(html) {
        const div = document.createElement("div");
        div.innerHTML = html;
        return div.textContent || div.innerText || "";
    }

    function formatDate(value) {
        return new Date(value).toLocaleString("es-EC");
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = value;
        }
    }

    function timestampForFile() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0"),
            String(now.getHours()).padStart(2, "0"),
            String(now.getMinutes()).padStart(2, "0")
        ].join("");
    }

    function downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function iconMarkup(type) {
        const icons = {
            dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="8" rx="2"></rect><rect x="14" y="3" width="7" height="5" rx="2"></rect><rect x="14" y="12" width="7" height="9" rx="2"></rect><rect x="3" y="15" width="7" height="6" rx="2"></rect></svg>',
            inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5 12 4l8 3.5-8 3.5L4 7.5Z"></path><path d="M4 12.5 12 16l8-3.5"></path><path d="M4 17.5 12 21l8-3.5"></path><path d="M4 7.5v10"></path><path d="M20 7.5v10"></path></svg>',
            search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6"></circle><path d="m20 20-4.2-4.2"></path></svg>',
            plusBox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"></rect><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>',
            clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"></rect><path d="M9 4.5h6"></path><path d="M9 9h6"></path><path d="M9 13h6"></path><path d="M9 17h4"></path></svg>',
            spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z"></path><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17Z"></path></svg>',
            edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"></path></svg>',
            repeat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>',
            history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"></path><path d="M3.05 13a9 9 0 1 0 .5-4.5"></path><path d="M12 7v5l4 2"></path></svg>',
            circle: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"></circle></svg>'
        };
        return icons[type] || icons.circle;
    }

    function renderAutocompleteField(id, label, placeholder) {
        const listId = `${id}List`;
        return `
            <div class="field-group">
                <label for="${id}">${label}</label>
                <input id="${id}" type="text" list="${listId}" autocomplete="off" placeholder="${placeholder}">
                <datalist id="${listId}"></datalist>
                <small class="helper-text">Puedes escribir manualmente o elegir una coincidencia sugerida.</small>
            </div>
        `;
    }

    function collectAutocompleteValues(itemKey, term) {
        const values = state.inventory
            .map((item) => String(item[itemKey] || "").trim())
            .filter(Boolean)
            .filter((value) => !term || value.toLowerCase().includes(term));
        return Array.from(new Set(values))
            .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }))
            .slice(0, 12);
    }

    function updateAutocompleteForInput(fieldId) {
        const input = document.getElementById(fieldId);
        const list = document.getElementById(`${fieldId}List`);
        const itemKey = INVENTORY_AUTOCOMPLETE[fieldId];
        if (!input || !list || !itemKey) {
            return;
        }
        const term = input.value.trim().toLowerCase();
        const options = collectAutocompleteValues(itemKey, term);
        list.innerHTML = options.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
    }

    function refreshInventoryAutocompletes() {
        Object.keys(INVENTORY_AUTOCOMPLETE).forEach((fieldId) => updateAutocompleteForInput(fieldId));
    }

    function isActasPage(pageName) {
        return ["actas", "acta-equipos", "acta-software", "acta-rc"].includes(pageName);
    }

    function actasBasePath() {
        if (role === "admin") {
            return `${basePrefix}/pages`;
        }
        if (role === "custodio") {
            return `${basePrefix}/pages/custodio`;
        }
        return `${basePrefix}/pages/usuario`;
    }

    function renderActasHubPage() {
        const basePath = actasBasePath();
        const cards = [
            ["Equipos", "Acta de mantenimiento preventivo de equipos.", `${basePath}/acta-equipos.html`],
            ["Software", "Acta de programas y aplicaciones instaladas.", `${basePath}/acta-software.html`],
            ["RC", "Acta de mantenimiento preventivo RC.", `${basePath}/acta-rc.html`]
        ];

        return `
            <section class="hero hero--actas">
                <div class="hero__grid">
                    <div class="hero-copy">
                        <div class="eyebrow">Modulo ACTAS</div>
                        <h2>Formatos listos para documentar mantenimientos y revisiones.</h2>
                        <p>Selecciona el tipo de acta que necesitas completar. Cada apartado conserva la linea visual actual del sistema y presenta un formulario limpio para registro interno.</p>
                    </div>
                    <div class="hero-panel">
                        <div class="hero-panel__label">Apartados</div>
                        <div class="stats-grid stats-grid--compact">
                            <article class="stat-card"><span>Formularios</span><strong>3</strong></article>
                            <article class="stat-card"><span>Modulo</span><strong>ACTAS</strong></article>
                        </div>
                    </div>
                </div>
            </section>
            <div class="section-heading">
                <div>
                    <h2>Selecciona un formato</h2>
                    <p>Accesos directos a las actas disponibles dentro del modulo.</p>
                </div>
            </div>
            <section class="quick-grid">
                ${cards.map(([title, text, href]) => `
                    <a class="mini-card mini-card--action" href="${href}">
                        <span class="mini-card__icon" aria-hidden="true">${iconMarkup("clipboard")}</span>
                        <strong>${title}</strong>
                        <span>${text}</span>
                        <small>Abrir formulario</small>
                    </a>
                `).join("")}
            </section>
        `;
    }

    function actaConfig(pageName) {
        const basePath = actasBasePath();
        const commonFooter = `
            <div class="form-actions acta-form__actions">
                <button class="btn btn-primary" type="submit">Guardar acta</button>
                <button class="btn btn-secondary" type="reset">Limpiar</button>
                <a class="btn btn-secondary" href="${basePath}/actas.html">Volver</a>
            </div>
        `;

        const configs = {
            "acta-equipos": {
                eyebrow: "Mantenimiento preventivo",
                title: "Formulario de equipos",
                description: "Registro para documentar la revision preventiva realizada sobre equipos tecnologicos.",
                hint: "Completa los datos principales del equipo, la revision aplicada y las observaciones finales.",
                fields: `
                    <div class="field-group"><label for="actaFechaEquipo">Fecha</label><input id="actaFechaEquipo" name="fecha" type="date" required></div>
                    <div class="field-group"><label for="actaTecnicoEquipo">Tecnico responsable</label><input id="actaTecnicoEquipo" name="tecnico" type="text" required></div>
                    <div class="field-group"><label for="actaCustodioEquipo">Custodio</label><input id="actaCustodioEquipo" name="custodio" type="text"></div>
                    <div class="field-group"><label for="actaAreaEquipo">Area</label><input id="actaAreaEquipo" name="area" type="text"></div>
                    <div class="field-group"><label for="actaCodigoEquipo">Codigo del equipo</label><input id="actaCodigoEquipo" name="codigoEquipo" type="text"></div>
                    <div class="field-group"><label for="actaSerieEquipo">Numero de serie</label><input id="actaSerieEquipo" name="numeroSerie" type="text"></div>
                    <div class="field-group"><label for="actaTipoEquipo">Tipo de equipo</label><input id="actaTipoEquipo" name="tipoEquipo" type="text"></div>
                    <div class="field-group"><label for="actaMarcaEquipo">Marca y modelo</label><input id="actaMarcaEquipo" name="marcaModelo" type="text"></div>
                    <div class="field-group"><label for="actaLimpiezaEquipo">Limpieza</label><select id="actaLimpiezaEquipo" name="limpieza"><option value="">Seleccione</option><option>Realizada</option><option>No aplica</option></select></div>
                    <div class="field-group"><label for="actaDiagnosticoEquipo">Diagnostico</label><select id="actaDiagnosticoEquipo" name="diagnostico"><option value="">Seleccione</option><option>Operativo</option><option>Con novedad</option><option>Requiere seguimiento</option></select></div>
                    <div class="field-group field-group--wide"><label for="actaTrabajoEquipo">Trabajo realizado</label><textarea id="actaTrabajoEquipo" name="trabajoRealizado" rows="4"></textarea></div>
                    <div class="field-group field-group--wide"><label for="actaObservacionEquipo">Observaciones</label><textarea id="actaObservacionEquipo" name="observaciones" rows="4"></textarea></div>
                    ${commonFooter}
                `
            },
            "acta-software": {
                eyebrow: "Programas y aplicaciones",
                title: "Formulario de software",
                description: "Registro de programas y aplicaciones instaladas en un equipo institucional.",
                hint: "Utiliza este formato para dejar constancia del software validado o instalado durante la intervencion.",
                fields: `
                    <div class="field-group"><label for="actaFechaSoftware">Fecha</label><input id="actaFechaSoftware" name="fecha" type="date" required></div>
                    <div class="field-group"><label for="actaTecnicoSoftware">Tecnico responsable</label><input id="actaTecnicoSoftware" name="tecnico" type="text" required></div>
                    <div class="field-group"><label for="actaUsuarioSoftware">Usuario o custodio</label><input id="actaUsuarioSoftware" name="usuarioCustodio" type="text"></div>
                    <div class="field-group"><label for="actaEquipoSoftware">Equipo</label><input id="actaEquipoSoftware" name="equipo" type="text"></div>
                    <div class="field-group"><label for="actaCodigoSoftware">Codigo del equipo</label><input id="actaCodigoSoftware" name="codigoEquipo" type="text"></div>
                    <div class="field-group"><label for="actaSistemaSoftware">Sistema operativo</label><input id="actaSistemaSoftware" name="sistemaOperativo" type="text"></div>
                    <div class="field-group field-group--wide"><label for="actaSoftwareInstalado">Programas instalados</label><textarea id="actaSoftwareInstalado" name="programasInstalados" rows="5"></textarea></div>
                    <div class="field-group"><label for="actaLicenciaSoftware">Licenciamiento</label><select id="actaLicenciaSoftware" name="licenciamiento"><option value="">Seleccione</option><option>Verificado</option><option>Pendiente</option><option>No aplica</option></select></div>
                    <div class="field-group"><label for="actaRevisionSoftware">Revision final</label><select id="actaRevisionSoftware" name="revisionFinal"><option value="">Seleccione</option><option>Conforme</option><option>Con observaciones</option></select></div>
                    <div class="field-group field-group--wide"><label for="actaObservacionSoftware">Observaciones</label><textarea id="actaObservacionSoftware" name="observaciones" rows="4"></textarea></div>
                    ${commonFooter}
                `
            },
            "acta-rc": {
                eyebrow: "Mantenimiento preventivo RC",
                title: "Formulario RC",
                description: "Registro orientado al mantenimiento preventivo RC bajo el mismo formato institucional.",
                hint: "Documenta los datos del recurso, el mantenimiento efectuado y el estado de cierre.",
                fields: `
                    <div class="field-group"><label for="actaFechaRc">Fecha</label><input id="actaFechaRc" name="fecha" type="date" required></div>
                    <div class="field-group"><label for="actaTecnicoRc">Tecnico responsable</label><input id="actaTecnicoRc" name="tecnico" type="text" required></div>
                    <div class="field-group"><label for="actaDependenciaRc">Dependencia</label><input id="actaDependenciaRc" name="dependencia" type="text"></div>
                    <div class="field-group"><label for="actaUbicacionRc">Ubicacion</label><input id="actaUbicacionRc" name="ubicacion" type="text"></div>
                    <div class="field-group"><label for="actaCodigoRc">Codigo RC</label><input id="actaCodigoRc" name="codigoRc" type="text"></div>
                    <div class="field-group"><label for="actaEquipoRc">Equipo o recurso</label><input id="actaEquipoRc" name="equipoRecurso" type="text"></div>
                    <div class="field-group"><label for="actaEstadoRc">Estado inicial</label><select id="actaEstadoRc" name="estadoInicial"><option value="">Seleccione</option><option>Operativo</option><option>Con novedad</option><option>Fuera de servicio</option></select></div>
                    <div class="field-group"><label for="actaResultadoRc">Resultado</label><select id="actaResultadoRc" name="resultado"><option value="">Seleccione</option><option>Atendido</option><option>Pendiente</option><option>Escalado</option></select></div>
                    <div class="field-group field-group--wide"><label for="actaTrabajoRc">Trabajo realizado</label><textarea id="actaTrabajoRc" name="trabajoRealizado" rows="4"></textarea></div>
                    <div class="field-group field-group--wide"><label for="actaObservacionRc">Observaciones</label><textarea id="actaObservacionRc" name="observaciones" rows="4"></textarea></div>
                    ${commonFooter}
                `
            }
        };

        return configs[pageName];
    }

    function renderActaFormPage(pageName) {
        if (pageName === "acta-equipos") {
            return renderActaEquiposPage();
        }

        const config = actaConfig(pageName);
        if (!config) {
            return "";
        }

        return `
            <section class="panel panel--narrow acta-form-panel">
                <div class="inventory-header inventory-header--form">
                    <div>
                        <div class="eyebrow">${config.eyebrow}</div>
                        <h2>${config.title}</h2>
                        <p>${config.description}</p>
                    </div>
                    <div class="inventory-header__badge">
                        <span>${iconMarkup("clipboard")}</span>
                        <strong>ACTAS</strong>
                    </div>
                </div>
                <div class="helper-banner">${config.hint}</div>
                <form class="acta-form" data-acta-form="${pageName}">
                    <div class="form-grid acta-form__grid">
                        ${config.fields}
                    </div>
                </form>
            </section>
        `;
    }

    const ACTA_PC_SUBSECTIONS = [
        { key: "pc", label: "PC", active: true },
        { key: "laptop", label: "Laptop", active: false },
        { key: "impresora", label: "Impresora", active: false },
        { key: "escaner", label: "Escáner", active: false },
        { key: "otros", label: "Otros", active: false }
    ];

    const ACTA_PC_ACTIVITY_ROWS = [
        "DESFRAGMENTACIÓN DE DISCOS",
        "DEPURACIÓN DE SOFTWARE",
        "ANÁLISIS Y LIMPIEZA DE VIRUS",
        "INSTALACIÓN DE ACTUALIZACIONES (PARCHES) DEL SISTEMA OPERATIVO Y DE APLICACIONES.",
        "LIMPIEZA DE PARTES Y PIEZAS",
        "REORGANIZACIÓN DE CABLES DE CONEXIÓN",
        "OTRAS ACCIONES REALIZADAS"
    ];

    const ACTA_PC_CERTIFICATION_TEXT = "Certifico que los elementos detallados en el presente documento, me han sido instalados para mi cuidado y custodia con el propósito de cumplir con las tareas y asignaciones propias de mi cargo en la Institución, siendo estos de mi única y exclusiva responsabilidad. Me comprometo a usar correctamente los recursos, y solo para los fines establecidos, a no instalar ni permitir la instalación de software por personal ajeno al área de soporte de DTIC, dado cualquier novedad dar conocimiento a los técnicos de DTIC.";

    function actaAssetPath(name) {
        return `${basePrefix}/assets/actas/${name}`;
    }

    function renderActaEquiposPage() {
        return `
            <section class="panel panel--narrow acta-form-panel">
                <div class="inventory-header inventory-header--form">
                    <div>
                        <div class="eyebrow">Mantenimiento preventivo</div>
                        <h2>Formulario de equipos</h2>
                        <p>El subapartado PC replica el formato oficial del acta institucional y reutiliza datos existentes del inventario para autocompletar el documento.</p>
                    </div>
                    <div class="inventory-header__badge">
                        <span>${iconMarkup("clipboard")}</span>
                        <strong>ACTAS</strong>
                    </div>
                </div>

                <div class="acta-subtabs" aria-label="Subapartados de mantenimiento preventivo de equipos">
                    ${ACTA_PC_SUBSECTIONS.map((item) => `
                        <button type="button" class="acta-subtab${item.key === "pc" ? " is-active" : ""}" ${item.key === "pc" || item.key === "laptop" ? `data-acta-type="${item.key}"` : "disabled"}>${item.label}</button>
                    `).join("")}
                </div>

                <div class="acta-search-panel">
                    <div>
                        <div class="eyebrow">Buscador inicial</div>
                        <h3>Seleccione el equipo para generar el acta</h3>
                        <p>Busque por custodio, codigo SBYE, codigo Megan, marca, modelo, serie, edificio o estado.</p>
                    </div>
                    <div class="acta-search-panel__grid">
                        <div class="field-group">
                            <label for="actaEquipoTipoBusqueda">Tipo</label>
                            <select id="actaEquipoTipoBusqueda">
                                <option value="pc">PC</option>
                                <option value="laptop">Laptop</option>
                            </select>
                        </div>
                        <div class="field-group acta-search-panel__query">
                            <label for="actaEquipoBusqueda">Campo de busqueda</label>
                            <input id="actaEquipoBusqueda" type="search" placeholder="Ej. custodio, SBYE, marca, serie...">
                        </div>
                        <button type="button" class="btn btn-primary" id="actaEquipoBuscarButton">Buscar</button>
                    </div>
                    <div id="actaEquipoResultados" class="acta-search-results"></div>
                </div>

                <div class="acta-toolbar">
                    <div class="field-group acta-toolbar__field">
                        <label for="actaPcSelector">Equipo seleccionado</label>
                        <select id="actaPcSelector" required>
                            <option value="">Seleccione un equipo desde el buscador</option>
                        </select>
                    </div>
                    <div class="acta-toolbar__actions">
                        <button type="button" class="btn btn-primary" id="actaPcPreviewButton">Previsualizar</button>
                        <button type="button" class="btn btn-secondary" id="actaPcExportDocxButton">Exportar DOCX</button>
                        <button type="button" class="btn btn-secondary" id="actaPcExportPdfButton">Exportar PDF</button>
                        <button type="button" class="btn btn-secondary" id="actaPcResetButton">Limpiar</button>
                    </div>
                </div>

                <form id="actaPcForm" class="acta-pc-form">
                    <div class="acta-sheet">
                        <div class="acta-sheet__header">
                            <img src="${actaAssetPath("logo_ecuador.png")}" alt="República del Ecuador" class="acta-sheet__logo acta-sheet__logo--ecuador">
                            <img src="${actaAssetPath("logo_senadi.png")}" alt="Servicio Nacional de Derechos Intelectuales" class="acta-sheet__logo acta-sheet__logo--senadi">
                        </div>

                        <div class="acta-sheet__titles">
                            <h3>${"SERVICIO NACIONAL DE DERECHOS INTELECTUALES"}</h3>
                            <h4>${"DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN"}</h4>
                            <h2>${"FORMULARIO DE MANTENIMIENTO PREVENTIVO DE EQUIPOS"}</h2>
                        </div>

                        <table class="acta-table">
                            <tr><th colspan="6">DATOS DEL FUNCIONARIO SENADI</th></tr>
                            <tr>
                                <td class="acta-table__label">NOMBRE</td>
                                <td colspan="2"><input id="actaFuncionarioNombre" name="funcionarioNombre" class="acta-input" required></td>
                                <td class="acta-table__label">CARGO</td>
                                <td><input id="actaFuncionarioCargo" name="funcionarioCargo" class="acta-input" required></td>
                                <td class="acta-table__label-value"><input id="actaFuncionarioExtension" name="funcionarioExtension" class="acta-input" placeholder="N° EXT."></td>
                            </tr>
                            <tr>
                                <td class="acta-table__label">CORREO</td>
                                <td colspan="2"><input id="actaFuncionarioCorreo" name="funcionarioCorreo" class="acta-input" type="email" required></td>
                                <td class="acta-table__label">AREA</td>
                                <td><input id="actaFuncionarioArea" name="funcionarioArea" class="acta-input" required></td>
                                <td class="acta-table__label-value"><input id="actaFuncionarioEdificio" name="funcionarioEdificio" class="acta-input" placeholder="EDIFICIO" required></td>
                            </tr>
                        </table>

                        <table class="acta-table acta-table--equipos">
                            <tr><th colspan="5">EQUIPOS</th></tr>
                            <tr>
                                <th>TIPO</th>
                                <th>MARCA</th>
                                <th>MODELO</th>
                                <th>SERIAL</th>
                                <th>CODIGO</th>
                            </tr>
                            <tr>
                                <td><input id="actaDesktopTipo" class="acta-input" value="PC"></td>
                                <td><input id="actaDesktopMarca" class="acta-input"></td>
                                <td><input id="actaDesktopModelo" class="acta-input"></td>
                                <td><input id="actaDesktopSerial" class="acta-input"></td>
                                <td><input id="actaDesktopCodigo" class="acta-input" required></td>
                            </tr>
                            <tr>
                                <td><input id="actaLaptopTipo" class="acta-input" value="LAPTOP"></td>
                                <td><input id="actaLaptopMarca" class="acta-input"></td>
                                <td><input id="actaLaptopModelo" class="acta-input"></td>
                                <td><input id="actaLaptopSerial" class="acta-input"></td>
                                <td><input id="actaLaptopCodigo" class="acta-input"></td>
                            </tr>
                        </table>

                        <table class="acta-table acta-table--actividades">
                            <tr><th colspan="4" class="acta-table__title-dark">COMPUTADORA</th></tr>
                            <tr>
                                <th rowspan="2" class="acta-table__label-large">ACTIVIDADES DE MANTENIMIENTOS</th>
                                <th colspan="3">INSTALADO</th>
                            </tr>
                            <tr>
                                <th>FECHA</th>
                                <th>ESTADO</th>
                                <th>OBSERVACIÓN</th>
                            </tr>
                            ${ACTA_PC_ACTIVITY_ROWS.map((activity, index) => `
                                <tr class="${index === 3 ? "acta-table__row--tall" : ""}">
                                    <td class="acta-table__activity">${activity}</td>
                                    <td><input id="actaActividadFecha${index}" class="acta-input" type="date"></td>
                                    <td><input id="actaActividadEstado${index}" class="acta-input"></td>
                                    <td><textarea id="actaActividadObservacion${index}" class="acta-input acta-input--textarea" rows="${index === 3 ? 4 : 2}"></textarea></td>
                                </tr>
                            `).join("")}
                        </table>

                        <p class="acta-certification">${ACTA_PC_CERTIFICATION_TEXT}</p>

                        <table class="acta-table acta-table--firma">
                            <tr><th colspan="2">ENTREGA RECEPCION DE EQUIPO</th></tr>
                            <tr>
                                <th>ENTREGA</th>
                                <th>RECIBE</th>
                            </tr>
                            <tr>
                                <td>
                                    <label class="acta-signature-field">Nombre:
                                        <input id="actaEntregaNombre" class="acta-input" required>
                                    </label>
                                </td>
                                <td>
                                    <label class="acta-signature-field">Nombre:
                                        <input id="actaRecibeNombre" class="acta-input" required>
                                    </label>
                                </td>
                            </tr>
                            <tr class="acta-table__row--firma">
                                <td>
                                    <label class="acta-signature-field">Firma:
                                        <input id="actaEntregaFirma" class="acta-input">
                                    </label>
                                </td>
                                <td>
                                    <label class="acta-signature-field">Firma:
                                        <input id="actaRecibeFirma" class="acta-input">
                                    </label>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                    <label class="acta-signature-field">Fecha:
                                        <input id="actaEntregaFecha" class="acta-input" type="date" required>
                                    </label>
                                </td>
                                <td>
                                    <label class="acta-signature-field">Fecha:
                                        <input id="actaRecibeFecha" class="acta-input" type="date" required>
                                    </label>
                                </td>
                            </tr>
                        </table>

                        <div class="acta-sheet__footer">
                            <div class="acta-sheet__footer-text">
                                <span>Dirección: Av. República E7-197 y Diego de Almagro – Edificio FORUM 300</span>
                                <span>Código postal: 170518 / Quito – Ecuador</span>
                                <span>Teléfono: +539-2 394 0000</span>
                                <span>www.derechosintelectuales.gob.ec</span>
                            </div>
                            <img src="${actaAssetPath("logo_nuevo_ecuador.png")}" alt="El Nuevo Ecuador" class="acta-sheet__footer-logo">
                        </div>
                    </div>
                </form>
            </section>
        `;
    }

    function getActaPcItems() {
        return state.inventory.filter((item) => String(item.tipo || "").toLowerCase() === "pc");
    }

    function loadActaPcInitialData() {
        const select = document.getElementById("actaPcSelector");
        if (!select) {
            return;
        }
        const items = getActaPcItems();
        select.innerHTML = '<option value="">Seleccione un equipo PC</option>' + items.map((item) => `
            <option value="${item.id}">${escapeHtml([item.codigoSbai || item.codigoMegan || `ID ${item.id}`, item.marca, item.modelo, item.custodio].filter(Boolean).join(" · "))}</option>
        `).join("");

        const today = new Date().toISOString().slice(0, 10);
        ["actaEntregaFecha", "actaRecibeFecha"].forEach((id) => {
            const input = document.getElementById(id);
            if (input && !input.value) {
                input.value = today;
            }
        });
        if (state.session?.displayName) {
            const entrega = document.getElementById("actaEntregaNombre");
            if (entrega && !entrega.value) {
                entrega.value = state.session.displayName;
            }
        }
    }

    function bindActaPcEvents() {
        document.getElementById("actaPcSelector")?.addEventListener("change", (event) => {
            const item = getActaPcItems().find((row) => String(row.id) === String(event.target.value));
            if (item) {
                autofillActaPcForm(item);
            }
        });
        document.getElementById("actaPcPreviewButton")?.addEventListener("click", openActaPcPreview);
        document.getElementById("actaPcResetButton")?.addEventListener("click", resetActaPcForm);
    }

    function autofillActaPcForm(item) {
        setInputValue("actaFuncionarioNombre", item.custodio || "");
        setInputValue("actaFuncionarioEdificio", item.ubicacionEdificio || "");
        setInputValue("actaDesktopMarca", item.marca || "");
        setInputValue("actaDesktopModelo", item.modelo || "");
        setInputValue("actaDesktopSerial", item.numeroSerie || "");
        setInputValue("actaDesktopCodigo", item.codigoSbai || item.codigoMegan || "");
    }

    function resetActaPcForm() {
        document.getElementById("actaPcForm")?.reset();
        document.getElementById("actaPcSelector").value = "";
        setInputValue("actaDesktopTipo", "DESKTOP");
        setInputValue("actaLaptopTipo", "LAPTOP");
        loadActaPcInitialData();
    }

    function getActaSelectedType() {
        return document.getElementById("actaEquipoTipoBusqueda")?.value || "pc";
    }

    function getActaEquipoItems(type = getActaSelectedType()) {
        return state.inventory.filter((item) => String(item.tipo || "").toLowerCase() === type);
    }

    function loadActaPcInitialData() {
        const select = document.getElementById("actaPcSelector");
        if (!select) {
            return;
        }
        const selectedType = getActaSelectedType();
        const items = getActaEquipoItems(selectedType);
        select.innerHTML = `<option value="">Seleccione un equipo ${escapeHtml(typeLabel(selectedType))} desde el buscador</option>` + items.map((item) => `
            <option value="${item.id}">${escapeHtml(actaEquipoOptionLabel(item))}</option>
        `).join("");
        renderActaEquipoResults(items.slice(0, 8));

        const today = new Date().toISOString().slice(0, 10);
        ["actaEntregaFecha", "actaRecibeFecha"].forEach((id) => {
            const input = document.getElementById(id);
            if (input && !input.value) {
                input.value = today;
            }
        });
        if (state.session?.displayName) {
            const entrega = document.getElementById("actaEntregaNombre");
            if (entrega && !entrega.value) {
                entrega.value = state.session.displayName;
            }
        }
    }

    function bindActaPcEvents() {
        document.getElementById("actaPcSelector")?.addEventListener("change", (event) => {
            const item = state.inventory.find((row) => String(row.id) === String(event.target.value));
            if (item) {
                selectActaEquipo(item.id);
            }
        });
        document.getElementById("actaEquipoBuscarButton")?.addEventListener("click", runActaEquipoSearch);
        document.getElementById("actaEquipoBusqueda")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                runActaEquipoSearch();
            }
        });
        document.getElementById("actaEquipoTipoBusqueda")?.addEventListener("change", (event) => {
            syncActaTypeTab(event.target.value);
            clearSelectedActaEquipo();
            loadActaPcInitialData();
        });
        document.querySelectorAll("[data-acta-type]").forEach((button) => {
            button.addEventListener("click", () => {
                const type = button.dataset.actaType || "pc";
                const typeSelect = document.getElementById("actaEquipoTipoBusqueda");
                if (typeSelect) {
                    typeSelect.value = type;
                }
                syncActaTypeTab(type);
                clearSelectedActaEquipo();
                loadActaPcInitialData();
            });
        });
        document.getElementById("actaPcPreviewButton")?.addEventListener("click", openActaPcPreview);
        document.getElementById("actaPcExportDocxButton")?.addEventListener("click", () => exportActaPc("docx"));
        document.getElementById("actaPcExportPdfButton")?.addEventListener("click", () => exportActaPc("pdf"));
        document.getElementById("actaPcResetButton")?.addEventListener("click", resetActaPcForm);
    }

    function actaEquipoOptionLabel(item) {
        return [
            item.codigoSbai || item.codigoMegan || `ID ${item.id}`,
            displayInventoryType(item),
            item.marca,
            item.modelo,
            item.custodio
        ].filter(Boolean).join(" · ");
    }

    function syncActaTypeTab(type) {
        document.querySelectorAll("[data-acta-type]").forEach((button) => {
            button.classList.toggle("is-active", button.dataset.actaType === type);
        });
    }

    function runActaEquipoSearch() {
        const term = (document.getElementById("actaEquipoBusqueda")?.value || "").trim().toLowerCase();
        const type = getActaSelectedType();
        const items = getActaEquipoItems(type).filter((item) => {
            if (!term) {
                return true;
            }
            return [
                item.codigoSbai,
                item.codigoMegan,
                item.descripcion,
                item.marca,
                item.modelo,
                item.numeroSerie,
                item.custodio,
                item.ubicacion,
                item.ubicacionEdificio,
                item.ubicacionPiso,
                item.ubicacionDireccion,
                item.estado
            ].some((value) => String(value || "").toLowerCase().includes(term));
        });
        renderActaEquipoResults(items.slice(0, 25));
        if (!items.length) {
            showToast("Sin resultados", "No se encontraron equipos con ese criterio.", "info");
        }
    }

    function renderActaEquipoResults(items) {
        const container = document.getElementById("actaEquipoResultados");
        if (!container) {
            return;
        }
        if (!items.length) {
            container.innerHTML = '<div class="empty-state">Ingrese un criterio de busqueda o cambie el tipo de equipo.</div>';
            return;
        }
        container.innerHTML = `
            <div class="acta-search-results__meta">${items.length} coincidencia(s) visibles. Seleccione una para autocompletar el acta.</div>
            <div class="acta-search-results__list">
                ${items.map((item) => `
                    <button type="button" class="acta-search-card" data-acta-select="${item.id}">
                        <strong>${escapeHtml(item.codigoSbai || item.codigoMegan || `ID ${item.id}`)} · ${escapeHtml(displayInventoryType(item))}</strong>
                        <span>${escapeHtml([item.marca, item.modelo, item.numeroSerie].filter(Boolean).join(" / ") || "Sin marca/modelo registrado")}</span>
                        <span>Custodio: ${escapeHtml(item.custodio || "-")} · Edificio: ${escapeHtml(item.ubicacionEdificio || "-")}</span>
                    </button>
                `).join("")}
            </div>
        `;
        container.querySelectorAll("[data-acta-select]").forEach((button) => {
            button.addEventListener("click", () => selectActaEquipo(button.dataset.actaSelect));
        });
    }

    function selectActaEquipo(id) {
        const item = state.inventory.find((row) => String(row.id) === String(id));
        if (!item) {
            return;
        }
        const typeSelect = document.getElementById("actaEquipoTipoBusqueda");
        if (typeSelect) {
            typeSelect.value = item.tipo || "pc";
        }
        syncActaTypeTab(item.tipo || "pc");
        document.getElementById("actaPcSelector").value = item.id;
        autofillActaPcForm(item);
        document.querySelectorAll(".acta-search-card").forEach((card) => {
            card.classList.toggle("is-selected", String(card.dataset.actaSelect) === String(item.id));
        });
        showToast("Equipo seleccionado", "El acta se autocompleto con los datos del inventario.", "success");
    }

    function autofillActaPcForm(item) {
        const selectedType = String(item.tipo || "pc").toLowerCase();
        setInputValue("actaFuncionarioNombre", item.custodio || "");
        setInputValue("actaFuncionarioEdificio", item.ubicacionEdificio || "");
        setInputValue("actaFuncionarioArea", item.ubicacionDireccion || item.ubicacion || "");
        setInputValue("actaDesktopTipo", selectedType === "laptop" ? "LAPTOP" : "PC");
        setInputValue("actaDesktopMarca", item.marca || "");
        setInputValue("actaDesktopModelo", item.modelo || "");
        setInputValue("actaDesktopSerial", item.numeroSerie || "");
        setInputValue("actaDesktopCodigo", item.codigoSbai || item.codigoMegan || "");
        setInputValue("actaLaptopMarca", selectedType === "laptop" ? item.marca || "" : "");
        setInputValue("actaLaptopModelo", selectedType === "laptop" ? item.modelo || "" : "");
        setInputValue("actaLaptopSerial", selectedType === "laptop" ? item.numeroSerie || "" : "");
        setInputValue("actaLaptopCodigo", selectedType === "laptop" ? item.codigoSbai || item.codigoMegan || "" : "");
        setInputValue("actaRecibeNombre", item.custodio || "");
    }

    function resetActaPcForm() {
        document.getElementById("actaPcForm")?.reset();
        clearSelectedActaEquipo();
        setInputValue("actaDesktopTipo", getActaSelectedType() === "laptop" ? "LAPTOP" : "PC");
        setInputValue("actaLaptopTipo", "LAPTOP");
        loadActaPcInitialData();
    }

    function clearSelectedActaEquipo() {
        const selector = document.getElementById("actaPcSelector");
        if (selector) {
            selector.value = "";
        }
        document.querySelectorAll(".acta-search-card").forEach((card) => card.classList.remove("is-selected"));
    }

    function setInputValue(id, value) {
        const input = document.getElementById(id);
        if (input) {
            input.value = value || "";
        }
    }

    function openActaPcPreview() {
        const form = document.getElementById("actaPcForm");
        const selector = document.getElementById("actaPcSelector");
        if (!form || !selector?.value) {
            showToast("Equipo requerido", "Seleccione un equipo desde el buscador inicial para autocompletar el acta.", "warning");
            return;
        }
        if (!form.reportValidity()) {
            return;
        }
        const payload = buildActaPcPayload();
        openModal(
            "Previsualización del Acta de Equipo",
            `<div class="acta-preview">${renderActaPcPreview(payload)}</div>`,
            [
                { label: "Exportar DOCX", className: "btn btn-primary", onClick: () => exportActaPc("docx") },
                { label: "Exportar PDF", className: "btn btn-secondary", onClick: () => exportActaPc("pdf") },
                { label: "Cerrar", className: "btn btn-secondary", onClick: closeModal }
            ],
            "modal--wide"
        );
    }

    function buildActaPcPayload() {
        const selectedType = getActaSelectedType();
        return {
            subapartado: selectedType,
            equipoSeleccionado: document.getElementById("actaPcSelector")?.value || "",
            funcionario: {
                nombre: document.getElementById("actaFuncionarioNombre")?.value.trim() || "",
                cargo: document.getElementById("actaFuncionarioCargo")?.value.trim() || "",
                extension: document.getElementById("actaFuncionarioExtension")?.value.trim() || "",
                correo: document.getElementById("actaFuncionarioCorreo")?.value.trim() || "",
                area: document.getElementById("actaFuncionarioArea")?.value.trim() || "",
                edificio: document.getElementById("actaFuncionarioEdificio")?.value.trim() || ""
            },
            desktop: {
                tipo: document.getElementById("actaDesktopTipo")?.value.trim() || (selectedType === "laptop" ? "LAPTOP" : "PC"),
                marca: document.getElementById("actaDesktopMarca")?.value.trim() || "",
                modelo: document.getElementById("actaDesktopModelo")?.value.trim() || "",
                serial: document.getElementById("actaDesktopSerial")?.value.trim() || "",
                codigo: document.getElementById("actaDesktopCodigo")?.value.trim() || ""
            },
            laptop: {
                tipo: document.getElementById("actaLaptopTipo")?.value.trim() || "LAPTOP",
                marca: document.getElementById("actaLaptopMarca")?.value.trim() || "",
                modelo: document.getElementById("actaLaptopModelo")?.value.trim() || "",
                serial: document.getElementById("actaLaptopSerial")?.value.trim() || "",
                codigo: document.getElementById("actaLaptopCodigo")?.value.trim() || ""
            },
            actividades: ACTA_PC_ACTIVITY_ROWS.map((actividad, index) => ({
                actividad,
                fecha: document.getElementById(`actaActividadFecha${index}`)?.value || "",
                estado: document.getElementById(`actaActividadEstado${index}`)?.value.trim() || "",
                observacion: document.getElementById(`actaActividadObservacion${index}`)?.value.trim() || ""
            })),
            certificacion: ACTA_PC_CERTIFICATION_TEXT,
            entrega: {
                nombre: document.getElementById("actaEntregaNombre")?.value.trim() || "",
                firma: document.getElementById("actaEntregaFirma")?.value.trim() || "",
                fecha: document.getElementById("actaEntregaFecha")?.value || ""
            },
            recibe: {
                nombre: document.getElementById("actaRecibeNombre")?.value.trim() || "",
                firma: document.getElementById("actaRecibeFirma")?.value.trim() || "",
                fecha: document.getElementById("actaRecibeFecha")?.value || ""
            }
        };
    }

    function renderActaPcPreview(payload) {
        const funcionario = payload.funcionario || {};
        const desktop = payload.desktop || {};
        const laptop = payload.laptop || {};
        const actividades = Array.isArray(payload.actividades) ? payload.actividades : [];

        return `
            <div class="acta-sheet acta-sheet--preview">
                <div class="acta-sheet__header">
                    <img src="${actaAssetPath("logo_ecuador.png")}" alt="República del Ecuador" class="acta-sheet__logo acta-sheet__logo--ecuador">
                    <img src="${actaAssetPath("logo_senadi.png")}" alt="Servicio Nacional de Derechos Intelectuales" class="acta-sheet__logo acta-sheet__logo--senadi">
                </div>
                <div class="acta-sheet__titles">
                    <h3>SERVICIO NACIONAL DE DERECHOS INTELECTUALES</h3>
                    <h4>DIRECCIÓN DE TECNOLOGÍAS DE LA INFORMACIÓN Y COMUNICACIÓN</h4>
                    <h2>FORMULARIO DE MANTENIMIENTO PREVENTIVO DE EQUIPOS</h2>
                </div>
                <table class="acta-table">
                    <tr><th colspan="6">DATOS DEL FUNCIONARIO SENADI</th></tr>
                    <tr>
                        <td class="acta-table__label">NOMBRE</td>
                        <td colspan="2">${escapeHtml(funcionario.nombre || "")}</td>
                        <td class="acta-table__label">CARGO</td>
                        <td>${escapeHtml(funcionario.cargo || "")}</td>
                        <td>${escapeHtml(funcionario.extension || "")}</td>
                    </tr>
                    <tr>
                        <td class="acta-table__label">CORREO</td>
                        <td colspan="2">${escapeHtml(funcionario.correo || "")}</td>
                        <td class="acta-table__label">AREA</td>
                        <td>${escapeHtml(funcionario.area || "")}</td>
                        <td>${escapeHtml(funcionario.edificio || "")}</td>
                    </tr>
                </table>
                <table class="acta-table acta-table--equipos">
                    <tr><th colspan="5">EQUIPOS</th></tr>
                    <tr><th>TIPO</th><th>MARCA</th><th>MODELO</th><th>SERIAL</th><th>CODIGO</th></tr>
                    <tr><td>${escapeHtml(desktop.tipo || "")}</td><td>${escapeHtml(desktop.marca || "")}</td><td>${escapeHtml(desktop.modelo || "")}</td><td>${escapeHtml(desktop.serial || "")}</td><td>${escapeHtml(desktop.codigo || "")}</td></tr>
                    <tr><td>${escapeHtml(laptop.tipo || "")}</td><td>${escapeHtml(laptop.marca || "")}</td><td>${escapeHtml(laptop.modelo || "")}</td><td>${escapeHtml(laptop.serial || "")}</td><td>${escapeHtml(laptop.codigo || "")}</td></tr>
                </table>
                <table class="acta-table acta-table--actividades">
                    <tr><th colspan="4" class="acta-table__title-dark">COMPUTADORA</th></tr>
                    <tr><th rowspan="2" class="acta-table__label-large">ACTIVIDADES DE MANTENIMIENTOS</th><th colspan="3">INSTALADO</th></tr>
                    <tr><th>FECHA</th><th>ESTADO</th><th>OBSERVACIÓN</th></tr>
                    ${ACTA_PC_ACTIVITY_ROWS.map((activity, index) => {
                        const row = actividades[index] || {};
                        return `
                            <tr class="${index === 3 ? "acta-table__row--tall" : ""}">
                                <td class="acta-table__activity">${activity}</td>
                                <td>${escapeHtml(row.fecha || "")}</td>
                                <td>${escapeHtml(row.estado || "")}</td>
                                <td class="acta-preview__observation">${escapeHtml(row.observacion || "")}</td>
                            </tr>
                        `;
                    }).join("")}
                </table>
                <p class="acta-certification">${escapeHtml(payload.certificacion || ACTA_PC_CERTIFICATION_TEXT)}</p>
                <table class="acta-table acta-table--firma">
                    <tr><th colspan="2">ENTREGA RECEPCION DE EQUIPO</th></tr>
                    <tr><th>ENTREGA</th><th>RECIBE</th></tr>
                    <tr><td><strong>Nombre:</strong> ${escapeHtml(payload.entrega?.nombre || "")}</td><td><strong>Nombre:</strong> ${escapeHtml(payload.recibe?.nombre || "")}</td></tr>
                    <tr class="acta-table__row--firma"><td><strong>Firma:</strong> ${escapeHtml(payload.entrega?.firma || "")}</td><td><strong>Firma:</strong> ${escapeHtml(payload.recibe?.firma || "")}</td></tr>
                    <tr><td><strong>Fecha:</strong> ${escapeHtml(payload.entrega?.fecha || "")}</td><td><strong>Fecha:</strong> ${escapeHtml(payload.recibe?.fecha || "")}</td></tr>
                </table>
                <div class="acta-sheet__footer">
                    <div class="acta-sheet__footer-text">
                        <span>Dirección: Av. República E7-197 y Diego de Almagro – Edificio FORUM 300</span>
                        <span>Código postal: 170518 / Quito – Ecuador</span>
                        <span>Teléfono: +539-2 394 0000</span>
                        <span>www.derechosintelectuales.gob.ec</span>
                    </div>
                    <img src="${actaAssetPath("logo_nuevo_ecuador.png")}" alt="El Nuevo Ecuador" class="acta-sheet__footer-logo">
                </div>
            </div>
        `;
    }

    async function exportActaPc(format) {
        try {
            const form = document.getElementById("actaPcForm");
            const selector = document.getElementById("actaPcSelector");
            if (!form || !selector?.value) {
                showToast("Equipo requerido", "Seleccione un equipo desde el buscador inicial para autocompletar el acta.", "warning");
                return;
            }
            if (!form.reportValidity()) {
                return;
            }
            const payload = buildActaPcPayload();
            const response = await apiFetch(`/actas/equipos/pc/export/${format}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                let message = "No se pudo exportar el acta.";
                try {
                    const errorPayload = await response.json();
                    message = errorPayload.message || errorPayload.error || message;
                } catch (error) {
                    // ignore parsing fallback
                }
                throw new Error(message);
            }
            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition") || "";
            const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
            const filename = match?.[1] || `acta_mantenimiento_pc.${format}`;
            downloadBlob(blob, filename);
            showToast("Exportación lista", `El documento ${format.toUpperCase()} fue generado correctamente.`, "success");
        } catch (error) {
            showToast("Error", error.message || "No se pudo exportar el acta.", "danger");
        }
    }

    function buildNav() {
        let nav;
        if (role === "admin") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/inventario.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`],
                ["actas", "ACTAS", `${basePrefix}/pages/actas.html`]
            ];
        } else if (role === "custodio") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/custodio/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/custodio/inventario.html`]
            ];
        } else {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`]
            ];
        }
        return nav
            .map(([key, label, href]) => `
                <a href="${href}" class="${key === page ? "is-active" : ""}">
                    <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || iconMarkup("circle")}</span>
                    <span>${label}</span>
                </a>
            `)
            .join("");
    }

    function pageDescription(pageName) {
        const descriptions = {
            dashboard: "Resumen visual del sistema y accesos directos por rol.",
            inventario: "Consulta, escribe, filtra y exporta el inventario con sugerencias en vivo.",
            busqueda: "Búsqueda multi-criterio en cliente sobre el inventario cargado.",
            "nuevo-equipo": "Formulario guiado por categoría para preparar nuevos registros."
        };
        return descriptions[pageName] || "";
    }

    function renderDashboard() {
        return `
            <section class="hero hero--dashboard">
                <div class="hero__grid">
                    <div class="hero-copy">
                        <div class="eyebrow">Centro de control</div>
                        <h2>Inventario institucional conectado a la base real.</h2>
                        <p>Consulta equipos tecnológicos, filtra por varios campos escribiendo manualmente y aprovecha sugerencias basadas en registros ya guardados en la base.</p>
                    </div>
                    <div class="hero-panel">
                        <div class="hero-panel__label">Vista rápida</div>
                        <div class="stats-grid stats-grid--compact">
                            <article class="stat-card"><span>Total cargado</span><strong id="statTotal">--</strong></article>
                            <article class="stat-card"><span>Operativos</span><strong id="statActive">--</strong></article>
                            <article class="stat-card"><span>Ubicaciones</span><strong id="statLocations">--</strong></article>
                            <article class="stat-card"><span>Rol activo</span><strong>${role === "admin" ? "Administrador" : role === "custodio" ? "Custodio" : "Técnico"}</strong></article>
                        </div>
                    </div>
                </div>
            </section>
            <section class="spotlight-strip">
                <article class="spotlight-card">
                    <span class="spotlight-card__icon">${iconMarkup("inventory")}</span>
                    <div>
                        <strong>Inventario listo para filtrar</strong>
                        <p>Los filtros del módulo muestran coincidencias mientras escribes y siguen permitiendo ingreso manual libre.</p>
                    </div>
                </article>
                <!--
                <article class="spotlight-card">
                    <span class="spotlight-card__icon">${iconMarkup("search")}</span>
                    <div>
                        <strong>Búsqueda más ágil</strong>
                        <p>Combina criterios y revisa rápidamente custodios, ubicaciones, marcas y estados.</p>
                    </div>
                </article>
                -->
            </section>
            <div class="section-heading">
                <div>
                    <h2>Navegación rápida</h2>
                    <p>Accesos principales del sistema con iconografía más clara y lectura más limpia.</p>
                </div>
            </div>
            <section class="quick-grid">${dashboardCards().join("")}</section>
        `;
    }

    function dashboardCards() {
        const cards = role === "admin"
            ? [
                ["Inventario", "Filtra, revisa y exporta el inventario visible.", `${basePrefix}/pages/inventario.html`, "inventory"],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["Búsqueda", "Aplica múltiples criterios sobre la data cargada.", `${basePrefix}/pages/busqueda.html`, "search"],
                ["Nuevo Equipo", "Completa el formulario guiado por categoría.", `${basePrefix}/pages/nuevo-equipo.html`, "plusBox"]
            ]
            : [
                ["Inventario", "Filtra, revisa y exporta el inventario visible.", `${basePrefix}/pages/usuario/inventario.html`, "inventory"],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["Búsqueda", "Aplica múltiples criterios sobre la data cargada.", `${basePrefix}/pages/usuario/busqueda.html`, "search"]
            ];
        return cards
            .filter(([title]) => title !== "Búsqueda")
            .map(([title, text, href, icon]) => `
            <a class="mini-card mini-card--action" href="${href}">
                <span class="mini-card__icon" aria-hidden="true">${iconMarkup(icon)}</span>
                <strong>${title}</strong>
                <span>${text}</span>
                <small>Abrir módulo</small>
            </a>
        `);
    }

    function renderInventoryPage() {
        return `
            <section class="panel inventory-panel">
                <div class="inventory-header">
                    <div>
                        <div class="eyebrow">Módulo de inventario</div>
                        <h2>Inventario institucional</h2>
                        <p>Escribe libremente en los campos del filtro. Mientras avanzas, el sistema te sugiere coincidencias ya registradas en la base para acelerar la selección.</p>
                    </div>
                    <div class="inventory-header__badge">
                        <span>${iconMarkup("spark")}</span>
                        <strong>Inventario</strong>
                    </div>
                </div>
                <div class="stats-grid stats-grid--compact">
                    <article class="stat-card"><span>Total filtrado</span><strong id="inventoryStatTotal">--</strong></article>
                    <article class="stat-card"><span>Rol en uso</span><strong>${role === "admin" ? "Administrador" : "Técnico"}</strong></article>
                </div>
                <div class="filters-grid filters-grid--inventory">
                    <div class="field-group">
                        <label for="filterTipo">Tipo</label>
                        <select id="filterTipo">
                            <option value="">Todos</option>
                            ${buildTypeOptions()}
                        </select>
                        <small class="helper-text">Selecciona una familia de equipos para acotar la consulta.</small>
                    </div>
                    ${renderAutocompleteField("filterCodigoSbai", "Código SBYE", "Filtrar por código SBYE")}
                    ${renderAutocompleteField("filterCodigoMegan", "Código Megan", "Filtrar por código Megan")}
                    ${renderAutocompleteField("filterDescripcion", "Descripción", "Filtrar por descripción")}
                    ${renderAutocompleteField("filterMarca", "Marca", "Filtrar por marca")}
                    ${renderAutocompleteField("filterModelo", "Modelo", "Filtrar por modelo")}
                    ${renderAutocompleteField("filterSerie", "Número de serie", "Filtrar por número de serie")}
                    ${renderAutocompleteField("filterCustodio", "Custodio", "Filtrar por custodio")}
                    ${renderAutocompleteField("filterEdificio", "Edificio", "Filtrar por edificio")}
                    ${renderAutocompleteField("filterPiso", "Piso", "Filtrar por piso")}
                    ${renderAutocompleteField("filterDireccion", "Dirección", "Filtrar por dirección")}
                    <div class="field-group">
                        <label for="filterEstado">Estado</label>
                        <select id="filterEstado">
                            <option value="">Todos</option>
                            ${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}
                        </select>
                        <small class="helper-text">Mantén “Todos” para combinarlo con otros filtros libres.</small>
                    </div>
                </div>
                <div class="toolbar" style="margin-top:16px;">
                    <button class="btn btn-primary" id="applyInventoryFilters">Filtrar</button>
                    <button class="btn btn-secondary" id="clearInventoryFilters">Limpiar</button>
                    <button class="btn btn-success" id="exportInventoryExcel">Exportar a Excel</button>
                    <button class="btn btn-secondary" id="exportInventoryPdf">Exportar a PDF</button>
                </div>
                <div id="inventoryMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDireccion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="inventoryMobile"></div>
                <div class="pagination">
                    <span id="inventoryPaginationMeta"></span>
                    <div class="toolbar">
                        <button class="btn btn-secondary" id="prevPage">Anterior</button>
                        <button class="btn btn-secondary" id="nextPage">Siguiente</button>
                    </div>
                </div>
            </section>
        `;
    }

    function renderNewEquipmentPage() {
        return `
            <section class="panel panel--narrow">
                <div class="inventory-header inventory-header--form">
                    <div>
                        <div class="eyebrow">Nuevo equipo</div>
                        <h2>Registro guiado por categoría</h2>
                        <p>Selecciona el tipo de equipo y completa los campos visibles. La vista se adapta según la categoría elegida para mantener el formulario ordenado.</p>
                    </div>
                </div>
                <div class="field-group">
                    <label for="equipmentCategory">Categoría</label>
                    <select id="equipmentCategory">
                        <option value="laptops">Laptop</option>
                        <option value="desktop">Desktop</option>
                        <option value="telefonos">Teléfonos</option>
                        <option value="escaners">Escáner</option>
                        <option value="impresoras">Impresora</option>
                        <option value="perifericos">Periférico</option>
                        <option value="proyectores">Proyector</option>
                    </select>
                </div>
                <div class="helper-banner" id="equipmentCategoryHint"></div>
                <form id="newEquipmentForm">
                    <div class="form-grid" id="dynamicEquipmentFields"></div>
                    <div class="form-actions" style="margin-top:18px;">
                        <button class="btn btn-primary" type="submit">Guardar equipo</button>
                        <button class="btn btn-secondary" type="reset">Limpiar</button>
                    </div>
                </form>
            </section>
        `;
    }

    async function loadInitialData() {
        if (page === "dashboard" || page === "inventario" || page === "busqueda" || page === "acta-equipos") {
            await loadInventory();
            updateDashboardStats();
        }
        if (page === "inventario") {
            renderInventory();
            refreshInventoryAutocompletes();
        }
        if (page === "busqueda") {
            renderSearchTags();
            renderSearchResults([]);
        }
        if (page === "nuevo-equipo") {
            renderDynamicFields(document.getElementById("equipmentCategory").value);
        }
    }

    function bindInventoryEvents() {
        inventoryFilterIds().forEach((id) => {
            document.getElementById(id)?.addEventListener("input", () => {
                updateAutocompleteForInput(id);
                applyInventoryFilters();
            });
            document.getElementById(id)?.addEventListener("change", applyInventoryFilters);
        });
        document.getElementById("applyInventoryFilters")?.addEventListener("click", applyInventoryFilters);
        document.getElementById("clearInventoryFilters")?.addEventListener("click", clearInventoryFilters);
        document.getElementById("exportInventoryExcel")?.addEventListener("click", () => openExportDialog("excel"));
        document.getElementById("exportInventoryPdf")?.addEventListener("click", () => openExportDialog("pdf"));
        document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => sortInventory(button.dataset.sort)));
        document.getElementById("prevPage")?.addEventListener("click", () => changePage(-1));
        document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
    }

    function clearInventoryFilters() {
        inventoryFilterIds().forEach((id) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = "";
            }
        });
        state.filteredInventory = state.inventory.slice();
        state.inventoryPage = 1;
        refreshInventoryAutocompletes();
        sortInventory(state.inventorySort.key, false);
    }

    function renderInventory() {
        const tbody = document.getElementById("inventoryBody");
        const mobile = document.getElementById("inventoryMobile");
        if (!tbody || !mobile) {
            return;
        }
        const total = state.filteredInventory.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        state.inventoryPage = Math.min(state.inventoryPage, totalPages);
        const start = (state.inventoryPage - 1) * PAGE_SIZE;
        const pageItems = state.filteredInventory.slice(start, start + PAGE_SIZE);

        updateInventoryStats();
        setText("inventoryMeta", `${total} resultados filtrados · página ${state.inventoryPage} de ${totalPages}`);
        setText("inventoryPaginationMeta", pageItems.length ? `Mostrando ${start + 1}-${start + pageItems.length}` : "Sin resultados");
        tbody.innerHTML = pageItems.length
            ? pageItems.map(renderInventoryRow).join("")
            : `<tr><td colspan="11">No hay equipos para los filtros aplicados.</td></tr>`;
        mobile.innerHTML = pageItems.map(renderMobileInventoryCard).join("");
        refreshInventoryAutocompletes();
    }

    function renderDynamicFields(category) {
        const container = document.getElementById("dynamicEquipmentFields");
        if (!container) {
            return;
        }
        const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.laptops;
        const fields = ["codigoMegan", "codigoSbai", "descripcion", "marca", "modelo", "custodio", "ubicacion", "estado"].concat(categoryConfig.fields || []);
        container.innerHTML = fields.map((field) => {
            if (field === "estado") {
                return editField(field, labelForColumn(field), "OPERATIVO", false, "select");
            }
            return editField(field, labelForColumn(field), "");
        }).join("");
        const select = container.querySelector('select[name="estado"]');
        if (select) {
            select.value = "OPERATIVO";
        }
        setText("equipmentCategoryHint", categoryConfig.hint || "");
    }

    function labelForColumn(key) {
        const labels = {
            codigoSbai: "Código SBYE",
            codigoMegan: "Código Megan",
            descripcion: "Descripción",
            tipo: "Tipo",
            marca: "Marca",
            modelo: "Modelo",
            numeroSerie: "Número de serie",
            custodio: "Custodio",
            ubicacion: "Ubicación",
            ubicacionEdificio: "Edificio",
            ubicacionPiso: "Piso",
            ubicacionDireccion: "Dirección",
            estado: "Estado",
            procesador: "Detalle",
            caracteristicas: "Características",
            observacion: "Observaciones",
            sistemaOperativo: "SO",
            ram: "RAM",
            discoDuro: "Disco Duro",
            linea: "Línea",
            imei: "IMEI",
            resolucion: "Resolución",
            conexion: "Conexión",
            tecnologia: "Tecnología",
            compatibilidad: "Compatibilidad",
            lumenes: "Lúmenes"
        };
        return labels[key] || key;
    }

    function pageDescription(pageName) {
        const descriptions = {
            dashboard: "Resumen visual del sistema y accesos directos por rol.",
            inventario: "",
            busqueda: "Busqueda multi-criterio en cliente sobre el inventario cargado.",
            "nuevo-equipo": "Formulario preparado con los campos definidos en la base de datos.",
            actas: "Acceso a las actas de mantenimiento y control disponibles en el sistema.",
            "acta-equipos": "Formulario para registrar mantenimiento preventivo de equipos.",
            "acta-software": "Formulario para registrar programas y aplicaciones instaladas.",
            "acta-rc": "Formulario para registrar mantenimiento preventivo RC."
        };
        return descriptions[pageName] || "";
    }

    function renderAutocompleteField(id, label, placeholder) {
        const listId = `${id}List`;
        return `
            <div class="field-group">
                <label for="${id}">${label}</label>
                <input id="${id}" type="text" list="${listId}" autocomplete="off" placeholder="${placeholder}">
                <datalist id="${listId}"></datalist>
            </div>
        `;
    }

    function renderInventoryPage() {
        return `
            <section class="panel inventory-panel">
                <div class="inventory-header">
                    <div>
                        <div class="eyebrow">Modulo de inventario</div>
                        <h2>Inventario institucional</h2>
                        <p id="inventoryIntroText">Utiliza los filtros para localizar equipos por codigo, custodio, ubicacion, marca, modelo y estado. Los resultados pueden descargarse en formatos formales.</p>
                    </div>
                    <div class="inventory-header__badge">
                        <span>${iconMarkup("spark")}</span>
                        <strong>Inventario</strong>
                    </div>
                </div>
                <div class="stats-grid stats-grid--compact">
                    <article class="stat-card"><span>Total filtrado</span><strong id="inventoryStatTotal">--</strong></article>
                    <article class="stat-card"><span>Rol en uso</span><strong>${role === "admin" ? "Administrador" : "Tecnico"}</strong></article>
                </div>
                <div class="filters-grid filters-grid--inventory">
                    <div class="field-group">
                        <label for="filterTipo">Tipo</label>
                        <select id="filterTipo">
                            <option value="">Todos</option>
                            ${buildTypeOptions()}
                        </select>
                    </div>
                    ${renderAutocompleteField("filterCodigoSbai", "Codigo SBYE", "Filtrar por codigo")}
                    ${renderAutocompleteField("filterCodigoMegan", "Codigo Megan", "Filtrar por codigo")}
                    ${renderAutocompleteField("filterDescripcion", "Descripcion", "Filtrar por descripcion")}
                    ${renderAutocompleteField("filterMarca", "Marca", "Filtrar por marca")}
                    ${renderAutocompleteField("filterModelo", "Modelo", "Filtrar por modelo")}
                    ${renderAutocompleteField("filterSerie", "Numero de serie", "Filtrar por numero")}
                    ${renderAutocompleteField("filterCustodio", "Custodio", "Filtrar por custodio")}
                    ${renderAutocompleteField("filterEdificio", "Edificio", "Filtrar por edificio")}
                    ${renderAutocompleteField("filterPiso", "Piso", "Filtrar por piso")}
                    ${renderAutocompleteField("filterDireccion", "Dirección", "Filtrar por dirección")}
                    <div class="field-group">
                        <label for="filterEstado">Estado</label>
                        <select id="filterEstado">
                            <option value="">Todos</option>
                            ${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}
                        </select>
                    </div>
                </div>
                <div class="toolbar" style="margin-top:16px;">
                    <button class="btn btn-primary" id="applyInventoryFilters">Filtrar</button>
                    <button class="btn btn-secondary" id="clearInventoryFilters">Limpiar</button>
                    <button class="btn btn-success" id="exportInventoryExcel">Exportar a Excel</button>
                    <button class="btn btn-secondary" id="exportInventoryPdf">Exportar a PDF</button>
                </div>
                <div id="inventoryMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDireccion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="inventoryMobile"></div>
                <div class="pagination">
                    <span id="inventoryPaginationMeta"></span>
                    <div class="toolbar">
                        <button class="btn btn-secondary" id="prevPage">Anterior</button>
                        <button class="btn btn-secondary" id="nextPage">Siguiente</button>
                    </div>
                </div>
            </section>
        `;
    }

    function renderNewEquipmentPage() {
        return `
            <section class="panel panel--narrow">
                <div class="inventory-header inventory-header--form">
                    <div>
                        <div class="eyebrow">Nuevo equipo</div>
                        <h2>Registro por tipo de activo</h2>
                        <p>Selecciona el tipo de equipo y completa todos los campos definidos para ese activo segun la estructura actual de la base de datos.</p>
                    </div>
                </div>
                <div class="field-group">
                    <label for="equipmentCategory">Categoria</label>
                    <select id="equipmentCategory">
                        <option value="">Cargando tipos...</option>
                    </select>
                </div>
                <div class="helper-banner" id="equipmentCategoryHint">Cargando campos desde la base de datos...</div>
                <form id="newEquipmentForm">
                    <div class="form-grid" id="dynamicEquipmentFields"></div>
                    <div class="form-actions" style="margin-top:18px;">
                        <button class="btn btn-primary" type="submit">Guardar equipo</button>
                        <button class="btn btn-secondary" type="reset">Limpiar</button>
                    </div>
                </form>
                <div class="report-history" id="equipmentFieldSummary" style="margin-top:18px;"></div>
            </section>
        `;
    }

    async function loadInitialData() {
        if (page === "dashboard" || page === "inventario" || page === "busqueda" || page === "acta-equipos") {
            await loadInventory();
            updateDashboardStats();
        }
        if (page === "inventario") {
            renderInventory();
            refreshInventoryAutocompletes();
            document.querySelectorAll(".filters-grid--inventory .helper-text").forEach((item) => item.remove());
            const topbarDescription = document.querySelector(".topbar__title p");
            if (topbarDescription) {
                topbarDescription.textContent = "";
            }
        }
        if (page === "busqueda") {
            renderSearchTags();
            renderSearchResults([]);
        }
        if (page === "nuevo-equipo") {
            await loadEquipmentFieldCatalog();
            populateEquipmentCategoryOptions();
            renderDynamicFields(document.getElementById("equipmentCategory").value);
        }
        if (page === "acta-equipos") {
            loadActaPcInitialData();
        }
    }

    async function loadEquipmentFieldCatalog() {
        try {
            const response = await apiFetch("/inventario/campos");
            if (!response.ok) {
                throw new Error("catalogo");
            }
            const payload = await response.json();
            state.equipmentFieldCatalog = payload.data || {};
        } catch (error) {
            state.equipmentFieldCatalog = {};
            showToast("Campos no disponibles", "No se pudo cargar el catalogo de campos desde la base de datos.", "danger");
        }
    }

    function populateEquipmentCategoryOptions() {
        const select = document.getElementById("equipmentCategory");
        if (!select) {
            return;
        }
        const tipos = Object.keys(state.equipmentFieldCatalog);
        select.innerHTML = tipos.length
            ? tipos.map((tipo) => `<option value="${tipo}">${escapeHtml(state.equipmentFieldCatalog[tipo].label || typeLabel(tipo))}</option>`).join("")
            : '<option value="">Sin tipos disponibles</option>';
    }

    function bindNewEquipmentEvents() {
        document.getElementById("equipmentCategory")?.addEventListener("change", (event) => renderDynamicFields(event.target.value));
        document.getElementById("newEquipmentForm")?.addEventListener("submit", async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const category = document.getElementById("equipmentCategory").value;
            const button = form.querySelector('button[type="submit"]');
            button.disabled = true;
            try {
                const payload = collectEquipmentFormPayload(form);
                const response = await apiFetch(`/inventario/${category}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "No se pudo guardar el equipo.");
                }
                await loadInventory();
                button.disabled = false;
                form.reset();
                document.getElementById("equipmentCategory").value = category;
                renderDynamicFields(category);
                showToast("Equipo guardado", "El equipo se registro correctamente en la base de datos.", "success");
            } catch (error) {
                button.disabled = false;
                showToast("Error al guardar", error.message || "No se pudo registrar el equipo.", "danger");
            }
        });
        document.getElementById("newEquipmentForm")?.addEventListener("reset", () => {
            const category = document.getElementById("equipmentCategory")?.value;
            setTimeout(() => renderDynamicFields(category), 0);
        });
    }

    function bindActasEvents() {
        if (page === "acta-equipos") {
            bindActaPcEvents();
            return;
        }
        document.querySelectorAll("[data-acta-form]").forEach((form) => {
            form.addEventListener("submit", (event) => {
                event.preventDefault();
                const formKey = event.currentTarget.dataset.actaForm;
                const config = actaConfig(formKey);
                showToast("Acta lista", `${config?.title || "Formulario"} preparada para revision interna.`, "success");
            });
        });
    }

    function collectEquipmentFormPayload(form) {
        const payload = {};
        Array.from(form.elements).forEach((element) => {
            if (!element.name) {
                return;
            }
            const value = (element.value || "").trim();
            payload[element.name] = value;
        });
        return payload;
    }

    function renderDynamicFields(category) {
        const container = document.getElementById("dynamicEquipmentFields");
        const hint = document.getElementById("equipmentCategoryHint");
        const summary = document.getElementById("equipmentFieldSummary");
        if (!container || !hint || !summary) {
            return;
        }
        const categoryConfig = state.equipmentFieldCatalog[category];
        if (!categoryConfig) {
            container.innerHTML = "";
            hint.textContent = "No hay definicion de campos disponible para este tipo.";
            summary.innerHTML = "";
            return;
        }
        const fields = Array.isArray(categoryConfig.fields) ? categoryConfig.fields : [];
        container.innerHTML = renderDynamicDbFieldGroups(fields);
        setupNewEquipmentAutocompletes();
        hint.textContent = categoryConfig.hint || "";
        summary.innerHTML = `
            <article class="report-history__item">
                <strong>${escapeHtml(categoryConfig.label || typeLabel(category))}</strong>
                <div class="muted">${escapeHtml(categoryConfig.hint || "")}</div>
            </article>
            <article class="report-history__item">
                <strong>Detalle de campos</strong>
                <div class="muted">${fields.map((field) => escapeHtml(field.label || field.name)).join(" · ")}</div>
            </article>
        `;
    }

    function renderDynamicDbField(field) {
        const name = field.name;
        const label = displayDbFieldLabel(field);
        const required = field.required ? "required" : "";
        const autocompleteCatalog = autocompleteCatalogForField(name);
        if (field.inputType === "textarea") {
            return `<label class="field-group field-group--wide"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" ${required}></textarea></label>`;
        }
        if (name === "estado" || field.inputType === "select") {
            return `<label class="field-group"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}" ${required}>${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}</select></label>`;
        }
        const htmlType = field.inputType === "number" ? "number" : (field.inputType === "date" ? "date" : "text");
        if (autocompleteCatalog) {
            const listId = `new_${name}_list`;
            return `<label class="field-group"><span>${escapeHtml(label)}</span><input type="${htmlType}" name="${escapeHtml(name)}" list="${listId}" autocomplete="off" data-catalog="${autocompleteCatalog}" ${required}><datalist id="${listId}"></datalist></label>`;
        }
        return `<label class="field-group"><span>${escapeHtml(label)}</span><input type="${htmlType}" name="${escapeHtml(name)}" ${required}></label>`;
    }

    function displayDbFieldLabel(field) {
        const name = String(field?.name || "").trim();
        const label = String(field?.label || name).trim();
        const normalizedName = name.toLowerCase();
        const normalizedLabel = label.toLowerCase();
        if (normalizedName === "ram" || normalizedLabel === "ram") {
            return "RAM";
        }
        if (normalizedName === "so" || normalizedLabel === "so") {
            return "SO";
        }
        if (normalizedName === "ip" || normalizedLabel === "ip") {
            return "IP";
        }
        return label || name;
    }

    function renderDynamicDbFieldGroups(fields) {
        const groups = groupDynamicDbFields(fields);
        return groups.map((group) => `
            <section class="equipment-field-section">
                <div class="equipment-field-section__header">
                    <h3>${escapeHtml(group.title)}</h3>
                </div>
                <div class="equipment-field-section__grid">
                    ${group.fields.map((field) => renderDynamicDbField(field)).join("")}
                </div>
            </section>
        `).join("");
    }

    function groupDynamicDbFields(fields) {
        const groupDefinitions = [
            { title: "Identificacion", names: ["codigo_megan", "codigo_sbye", "codigo_anterior", "descripcion", "marca", "modelo", "sn", "serie", "numero_serie", "estado", "costo"] },
            { title: "Custodio y ubicacion", names: ["custodio_nombre", "id_custodio_actual", "anterior_custodio", "id_ubicacion", "ubicacion_edificio", "ubicacion_piso", "ubicacion_direccion"] },
            { title: "Caracteristicas tecnicas", names: ["procesador", "ram", "disco_duro", "so", "ip", "mac", "tipo_periferico", "tipo_impresora", "resolucion", "conexion", "tecnologia", "compatibilidad", "lumenes", "subtipo", "megas"] },
            { title: "Fechas", names: ["fecha_ingreso", "ultima_actualizacion", "ultimo_mantenimiento"] },
            { title: "Contrato y servicio", names: ["numero_contrato", "numero_servicio", "plan_comercial", "estado_servicio"] },
            { title: "Observaciones", names: ["caracteristicas", "anotaciones", "observacion", "observaciones"] }
        ];
        const groups = groupDefinitions.map((definition) => ({ title: definition.title, names: definition.names, fields: [] }));
        const extraGroup = { title: "Datos adicionales", names: [], fields: [] };

        fields.forEach((field) => {
            const name = String(field.name || "").toLowerCase();
            const group = groups.find((item) => item.names.includes(name)) || extraGroup;
            group.fields.push(field);
        });

        return groups.concat(extraGroup).filter((group) => group.fields.length);
    }

    function autocompleteCatalogForField(name) {
        if (name === "marca" || name === "modelo") {
            return name;
        }
        if (name === "custodio_nombre") {
            return "custodios";
        }
        if (name === "ubicacion_edificio" || name === "ubicacion_piso" || name === "ubicacion_direccion") {
            return "ubicaciones";
        }
        return "";
    }

    function setupNewEquipmentAutocompletes() {
        document.querySelectorAll("#dynamicEquipmentFields [data-catalog]").forEach((input) => {
            const load = debounce(() => loadNewEquipmentSuggestions(input), 220);
            input.addEventListener("input", load);
            loadNewEquipmentSuggestions(input);
        });
    }

    function debounce(callback, delay) {
        let timerId;
        return (...args) => {
            window.clearTimeout(timerId);
            timerId = window.setTimeout(() => callback(...args), delay);
        };
    }

    async function loadNewEquipmentSuggestions(input) {
        const catalog = input.dataset.catalog;
        const term = input.value.trim();
        const params = new URLSearchParams();
        if (term) {
            params.set("q", term);
        }
        params.set("limit", "80");

        try {
            let values = [];
            if (catalog === "marca" || catalog === "modelo") {
                values = await fetchCatalogStrings(`/inventario/catalogos/${catalog}?${params.toString()}`);
            } else if (catalog === "custodios") {
                const rows = await fetchCatalogObjects(`/inventario/custodios?${params.toString()}`);
                values = rows.map((item) => item.nombre).filter(Boolean);
            } else if (catalog === "ubicaciones") {
                const rows = await fetchCatalogObjects(`/inventario/ubicaciones?${params.toString()}`);
                const key = input.name.replace("ubicacion_", "");
                values = rows.map((item) => item[key]).filter(Boolean);
            }
            fillInputDatalist(input, values);
        } catch (error) {
            fillInputDatalist(input, []);
        }
    }

    async function fetchCatalogStrings(path) {
        const response = await apiFetch(path);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(payload.message || "Catalogo no disponible.");
        }
        return Array.isArray(payload.data) ? payload.data : [];
    }

    async function fetchCatalogObjects(path) {
        const response = await apiFetch(path);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(payload.message || "Catalogo no disponible.");
        }
        return Array.isArray(payload.data) ? payload.data : [];
    }

    function fillInputDatalist(input, values) {
        const listId = input.getAttribute("list");
        const list = listId ? document.getElementById(listId) : null;
        if (!list) {
            return;
        }
        const unique = Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean))).slice(0, 80);
        list.innerHTML = unique.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");
    }

    function formatFieldValueForInput(field, value) {
        if (value === null || value === undefined) {
            return "";
        }
        if (field?.inputType === "date") {
            const text = String(value).trim();
            return text.length >= 10 ? text.slice(0, 10) : text;
        }
        return String(value);
    }

    function renderDynamicDbEditField(field, value) {
        const name = field.name;
        const label = displayDbFieldLabel(field);
        const required = field.required ? "required" : "";
        const autocompleteCatalog = autocompleteCatalogForField(name);
        const safeValue = escapeHtml(formatFieldValueForInput(field, value));

        if (field.inputType === "textarea") {
            return `<label class="field-group field-group--wide"><span>${escapeHtml(label)}</span><textarea name="${escapeHtml(name)}" ${required}>${safeValue}</textarea></label>`;
        }
        if (name === "estado" || field.inputType === "select") {
            const selected = normalizeState(value || "");
            return `<label class="field-group"><span>${escapeHtml(label)}</span><select name="${escapeHtml(name)}" ${required}>${VALID_STATES.map((item) => `<option value="${item}" ${selected === item ? "selected" : ""}>${item}</option>`).join("")}</select></label>`;
        }

        const htmlType = field.inputType === "number" ? "number" : (field.inputType === "date" ? "date" : "text");
        if (autocompleteCatalog) {
            const listId = `edit_${name}_list`;
            return `<label class="field-group"><span>${escapeHtml(label)}</span><input type="${htmlType}" name="${escapeHtml(name)}" value="${safeValue}" list="${listId}" autocomplete="off" data-catalog="${autocompleteCatalog}" ${required}><datalist id="${listId}"></datalist></label>`;
        }
        return `<label class="field-group"><span>${escapeHtml(label)}</span><input type="${htmlType}" name="${escapeHtml(name)}" value="${safeValue}" ${required}></label>`;
    }

    function renderDynamicDbEditFieldGroups(fields, values) {
        const groups = groupDynamicDbFields(fields);
        return groups.map((group) => `
            <section class="equipment-field-section">
                <div class="equipment-field-section__header">
                    <h3>${escapeHtml(group.title)}</h3>
                </div>
                <div class="equipment-field-section__grid">
                    ${group.fields.map((field) => renderDynamicDbEditField(field, values?.[field.name])).join("")}
                </div>
            </section>
        `).join("");
    }

    function setupEditEquipmentAutocompletes() {
        document.querySelectorAll("#editEquipmentForm [data-catalog]").forEach((input) => {
            const load = debounce(() => loadNewEquipmentSuggestions(input), 220);
            input.addEventListener("input", load);
            loadNewEquipmentSuggestions(input);
        });
    }

    const INVENTORY_EXPORT_COLUMNS = [
        { key: "codigoSbai", label: "Codigo SBYE", weight: 1.1 },
        { key: "codigoMegan", label: "Codigo Megan", weight: 1.1 },
        { key: "descripcion", label: "Descripcion", weight: 3.2 },
        { key: "tipo", label: "Tipo", weight: 1.2 },
        { key: "marca", label: "Marca", weight: 1.2 },
        { key: "modelo", label: "Modelo", weight: 1.6 },
        { key: "numeroSerie", label: "Numero de serie", weight: 1.6 },
        { key: "custodio", label: "Custodio", weight: 2.0 },
        { key: "ubicacion", label: "Ubicacion", weight: 2.2 },
        { key: "detalle", label: "Detalle", weight: 2.4 },
        { key: "estado", label: "Estado", weight: 1.4 },
        { key: "ip", label: "IP", weight: 1.0 },
        { key: "observacion", label: "Observaciones", weight: 2.0 }
    ];

    function openExportDialog(format) {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }

        const selected = new Set((state.exportSelection?.keys || INVENTORY_EXPORT_COLUMNS.map((col) => col.key)));
        const isPdf = format === "pdf";
        const formatIcon = isPdf ? "📄" : "📊";
        const title = isPdf ? `${formatIcon} Exportar PDF` : `${formatIcon} Exportar Excel`;

        openModal(
            title,
            `
                <div class="export-dialog">
                    <div class="export-columns-section">
                        <div class="export-section-header">
                            <span class="export-section-title">Campos a exportar</span>
                            <div class="export-quick-actions">
                                <button class="btn btn-secondary btn-sm" type="button" id="exportSelectAll">Todos</button>
                                <button class="btn btn-secondary btn-sm" type="button" id="exportSelectNone">Ninguno</button>
                            </div>
                        </div>
                        <div class="export-field-list">
                            ${INVENTORY_EXPORT_COLUMNS.map((col) => `
                                <label class="export-field-item">
                                    <input type="checkbox" class="export-field-checkbox" data-export-col="${escapeHtml(col.key)}" ${selected.has(col.key) ? "checked" : ""}>
                                    <span class="export-field-label">${escapeHtml(col.label)}</span>
                                </label>
                            `).join("")}
                        </div>
                        <small class="helper-text">Se exportarán los <strong>${rows.length}</strong> registros filtrados actualmente.</small>
                    </div>
                    <div class="export-preview-section">
                        <div class="export-section-header">
                            <span class="export-section-title">Previsualización <span class="export-preview-badge">(primeros 5 registros)</span></span>
                        </div>
                        <div class="export-preview-wrapper" id="exportPreviewWrapper"></div>
                    </div>
                </div>
            `,
            [
                { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
                ...(isPdf ? [
                    {
                        label: "Imprimir",
                        className: "btn btn-secondary",
                        onClick: () => {
                            const keys = readSelectedExportKeys();
                            if (!keys.length) { showToast("Seleccione campos", "Debe seleccionar al menos un campo.", "info"); return; }
                            closeModal();
                            exportInventoryToPrint(keys);
                        }
                    },
                    {
                        label: "Descargar PDF",
                        className: "btn btn-primary",
                        onClick: () => {
                            const keys = readSelectedExportKeys();
                            state.exportSelection = { keys };
                            if (!keys.length) { showToast("Seleccione campos", "Debe seleccionar al menos un campo.", "info"); return; }
                            closeModal();
                            exportInventoryToPdf(keys);
                        }
                    }
                ] : [
                    {
                        label: "Exportar Excel",
                        className: "btn btn-primary",
                        onClick: () => {
                            const keys = readSelectedExportKeys();
                            state.exportSelection = { keys };
                            if (!keys.length) { showToast("Seleccione campos", "Debe seleccionar al menos un campo.", "info"); return; }
                            closeModal();
                            exportInventoryToExcel(keys);
                        }
                    }
                ])
            ],
            "modal--wide"
        );

        function renderExportPreview() {
            const keys = readSelectedExportKeys();
            const wrapper = document.getElementById("exportPreviewWrapper");
            if (!wrapper) return;
            if (!keys.length) {
                wrapper.innerHTML = '<p class="export-preview-empty">Seleccione al menos un campo para previsualizar.</p>';
                return;
            }
            const cols = INVENTORY_EXPORT_COLUMNS.filter((col) => keys.includes(col.key));
            const previewRows = rows.slice(0, 5);
            wrapper.innerHTML = `
                <div class="export-preview-scroll">
                    <table class="export-preview-table">
                        <thead>
                            <tr>${cols.map((col) => `<th>${escapeHtml(col.label)}</th>`).join("")}</tr>
                        </thead>
                        <tbody>
                            ${previewRows.map((item) => `
                                <tr>${cols.map((col) => `<td>${escapeHtml(inventoryExportValue(item, col.key) || "—")}</td>`).join("")}</tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        document.getElementById("exportSelectAll")?.addEventListener("click", () => {
            setAllExportCheckboxes(true);
            renderExportPreview();
        });
        document.getElementById("exportSelectNone")?.addEventListener("click", () => {
            setAllExportCheckboxes(false);
            renderExportPreview();
        });
        document.querySelectorAll("[data-export-col]").forEach((input) => {
            input.addEventListener("change", renderExportPreview);
        });
        renderExportPreview();
    }

    function setAllExportCheckboxes(checked) {
        document.querySelectorAll("[data-export-col]").forEach((input) => {
            input.checked = Boolean(checked);
        });
    }

    function readSelectedExportKeys() {
        return Array.from(document.querySelectorAll("[data-export-col]"))
            .filter((input) => input.checked)
            .map((input) => input.dataset.exportCol)
            .filter(Boolean);
    }

    function inventoryExportValue(item, key) {
        if (key === "tipo") {
            return displayInventoryType(item);
        }
        if (key === "detalle") {
            return item.procesador || item.caracteristicas || "";
        }
        if (key === "ip") {
            return item.raw?.ip || item.ip || "";
        }
        if (key === "observacion") {
            return item.raw?.observacion || item.observacion || "";
        }
        return item[key] || "";
    }

    function exportInventoryToExcel(keys) {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }

        const cols = INVENTORY_EXPORT_COLUMNS.filter((col) => keys.includes(col.key));
        const header = cols.map((col) => col.label);
        const bodyRows = rows.map((item) => cols.map((col) => inventoryExportValue(item, col.key)));
        const generatedAt = new Date().toLocaleString("es-EC");
        const documentHtml = `
            <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Calibri, Arial, sans-serif; color: #16324f; margin: 32px; background: #fff; }
                        .sheet-header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1565c0; }
                        .sheet-header h1 { margin: 0 0 6px; font-size: 20px; color: #0d47a1; font-weight: 700; }
                        .sheet-header .subtitle { margin: 0 0 10px; font-size: 13px; color: #4d6480; font-weight: 600; }
                        .sheet-meta { display: flex; gap: 24px; flex-wrap: wrap; margin-top: 8px; }
                        .sheet-meta span { font-size: 11px; color: #6b7a8d; background: #f0f6ff; border-radius: 4px; padding: 3px 8px; }
                        table { width: 100%; border-collapse: collapse; font-size: 12px; }
                        thead tr { background: #1565c0; }
                        th { background: #1565c0; color: #fff; font-weight: 700; border: 1px solid #0d47a1; padding: 10px 9px; text-align: left; white-space: nowrap; }
                        td { border: 1px solid #d0dcea; padding: 8px 9px; vertical-align: top; color: #2c3e50; }
                        tbody tr:nth-child(even) { background: #f3f8ff; }
                        tbody tr:hover { background: #e8f0fb; }
                        .sheet-footer { margin-top: 18px; font-size: 11px; color: #9aabb8; text-align: right; }
                    </style>
                </head>
                <body>
                    <div class="sheet-header">
                        <h1>Reporte de Inventario Tecnológico</h1>
                        <div class="subtitle">Dirección de Tecnologías de Información y Comunicación — SENADI</div>
                        <div class="sheet-meta">
                            <span>📅 Fecha: ${escapeHtml(generatedAt)}</span>
                            <span>📦 Registros exportados: ${rows.length}</span>
                            <span>📋 Campos seleccionados: ${cols.length}</span>
                        </div>
                    </div>
                    <table>
                        <thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
                        <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "")}</td>`).join("")}</tr>`).join("")}</tbody>
                    </table>
                    <div class="sheet-footer">Generado por Sistema de Inventario DTIC · ${escapeHtml(generatedAt)}</div>
                </body>
            </html>`;
        downloadBlob(new Blob([`\ufeff${documentHtml}`], { type: "application/vnd.ms-excel" }), `reporte_inventario_${timestampForFile()}.xls`);
    }

    function buildReportHtml(cols, rows, now, dateStr) {
        const headerRow = cols.map((c) => "<th>" + c.label + "</th>").join("");
        const bodyRows = rows.map((item, i) => {
            const cells = cols.map((c) => "<td>" + (inventoryExportValue(item, c.key) || "-") + "</td>").join("");
            return "<tr class=\"" + (i % 2 === 0 ? "even" : "odd") + "\">" + cells + "</tr>";
        }).join("");
        return (
            "<div class=\"rpt-header\"><div>" +
            "<div class=\"rpt-org\">SENADI — Dirección de Tecnologías de la Información y Comunicación</div>" +
            "<div class=\"rpt-sub\">Reporte de Inventario Tecnológico</div>" +
            "</div><div class=\"rpt-meta\">" +
            "<div>Fecha: " + dateStr + "</div>" +
            "<div>Emitido: " + now + "</div>" +
            "<div>Total: <strong>" + rows.length + "</strong> registro(s)</div>" +
            "</div></div>" +
            "<table><thead><tr>" + headerRow + "</tr></thead><tbody>" + bodyRows + "</tbody></table>" +
            "<div class=\"rpt-footer\">" +
            "<span>SENADI — DTIC • " + now + "</span>" +
            "<span>" + rows.length + " registro(s) • " + cols.length + " campo(s)</span>" +
            "</div>"
        );
    }

    const REPORT_CSS = [
        "* { box-sizing: border-box; margin: 0; padding: 0; }",
        "body, div { font-family: Arial, sans-serif; font-size: 9pt; color: #111; }",
        ".rpt-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0 8px; border-bottom: 2px solid #1565c0; margin-bottom: 10px; }",
        ".rpt-org { font-size: 12pt; font-weight: bold; color: #1565c0; }",
        ".rpt-sub { font-size: 9pt; color: #444; margin-top: 3px; }",
        ".rpt-meta { text-align: right; font-size: 8pt; color: #555; line-height: 1.7; }",
        "table { width: 100%; border-collapse: collapse; table-layout: auto; }",
        "thead tr { background: #1565c0; color: #fff; }",
        "thead th { padding: 5px 6px; font-size: 8pt; font-weight: bold; text-align: left; border: 1px solid #0d47a1; }",
        "tbody tr:nth-child(even) { background: #f0f5fb; }",
        "tbody tr:nth-child(odd)  { background: #ffffff; }",
        "tbody td { padding: 4px 6px; font-size: 8pt; border: 1px solid #cfd8e8; vertical-align: top; word-break: break-word; }",
        ".rpt-footer { margin-top: 12px; border-top: 1px solid #bbb; padding-top: 5px; font-size: 7.5pt; color: #666; display: flex; justify-content: space-between; }"
    ].join(" ");

    function exportInventoryToPdf(keys) {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }
        const blob = buildInventoryPdfBlob(rows, keys);
        downloadBlob(blob, "reporte_inventario_" + timestampForFile() + ".pdf");
    }

    function exportInventoryToPrint(keys) {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }
        const cols = INVENTORY_EXPORT_COLUMNS.filter((col) => keys.includes(col.key));
        const now = new Date().toLocaleString("es-EC");
        const dateStr = new Date().toLocaleDateString("es-EC", { year: "numeric", month: "long", day: "numeric" });
        const body = buildReportHtml(cols, rows, now, dateStr);
        const printCss = REPORT_CSS +
            " @media print { @page { margin:1.2cm; size:A4 landscape; } thead { display:table-header-group; } tr { page-break-inside:avoid; } }";
        const html = "<!DOCTYPE html><html lang='es'><head><meta charset='UTF-8'>" +
            "<title>Reporte Inventario SENADI</title>" +
            "<style>" + printCss + "</style></head><body style='padding:16px'>" +
            body + "<script>window.onload=function(){window.focus();window.print();}<\/script></body></html>";
        const win = window.open("", "_blank", "width=1100,height=800,scrollbars=yes");
        if (!win) { showToast("Bloqueado", "Permite ventanas emergentes para imprimir.", "warning"); return; }
        win.document.open();
        win.document.write(html);
        win.document.close();
    }

    function buildInventoryPdfBlob(rows, keys) {
        const W = 842, H = 595, M = 20;
        const cols = INVENTORY_EXPORT_COLUMNS.filter((c) => keys.includes(c.key));
        const totalWeight = cols.reduce((s, c) => s + (c.weight || 1), 0) || 1;
        const tableW = W - M * 2;

        // Calcular anchos de columna
        const colWidths = cols.map((c) => Math.max(30, Math.floor(tableW * (c.weight || 1) / totalWeight)));
        const usedW = colWidths.reduce((s, w) => s + w, 0);
        colWidths[colWidths.length - 1] += tableW - usedW;
        const colX = [];
        let cx = M;
        colWidths.forEach((w) => { colX.push(cx); cx += w; });

        const HEADER_H = 14;
        const ROW_H = 12;
        const FS = 7;
        const FS_H = 7.5;
        const PAGE_TOP = H - M - 38;   // y donde empieza la cabecera de tabla
        const PAGE_BOT = M + 10;
        const rowsPerPage = Math.max(1, Math.floor((PAGE_TOP - PAGE_BOT - HEADER_H) / ROW_H));

        function pdfEsc(v) {
            return String(v || "-")
                .normalize("NFD").replace(/[̀-ͯ]/g, "")
                .replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
                .replace(/[\r\n\t]/g, " ").trim();
        }
        function trunc(v, w) {
            const s = pdfEsc(v);
            const max = Math.max(2, Math.floor(w / (FS * 0.52)) - 1);
            return s.length <= max ? s : s.slice(0, max - 1) + ".";
        }
        function truncH(v, w) {
            const s = pdfEsc(v);
            const max = Math.max(2, Math.floor(w / (FS_H * 0.52)) - 1);
            return s.length <= max ? s : s.slice(0, max - 1) + ".";
        }

        const objects = [];
        function addObj(content) { objects.push(content); return objects.length; }

        const fontId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
        const fontBoldId = addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
        const pageRefs = [];

        const now = pdfEsc(new Date().toLocaleString("es-EC"));
        const totalPages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

        for (let p = 0; p < totalPages; p++) {
            const pageRows = rows.slice(p * rowsPerPage, (p + 1) * rowsPerPage);
            const ops = [];

            // --- Encabezado de pagina ---
            ops.push("0 g");
            ops.push("BT /F2 13 Tf " + M + " " + (H - M - 13) + " Td (Reporte de Inventario - SENADI DTIC) Tj ET");
            ops.push("BT /F1 8 Tf " + M + " " + (H - M - 25) + " Td (Emitido: " + now + "   Total: " + rows.length + " registros   Pagina " + (p + 1) + "/" + totalPages + ") Tj ET");

            // --- Cabecera de tabla (fondo azul) ---
            const thY = PAGE_TOP - HEADER_H;
            ops.push("0.18 0.38 0.75 rg");
            ops.push(M + " " + thY + " " + tableW + " " + HEADER_H + " re f");
            ops.push("1 g");
            cols.forEach((col, i) => {
                ops.push("BT /F2 " + FS_H + " Tf " + (colX[i] + 2) + " " + (thY + 4) + " Td (" + truncH(col.label.toUpperCase(), colWidths[i] - 4) + ") Tj ET");
            });

            // --- Filas de datos ---
            ops.push("0 g");
            pageRows.forEach((item, ri) => {
                const ry = thY - (ri + 1) * ROW_H;
                if (ri % 2 === 0) {
                    ops.push("0.93 0.96 0.99 rg");
                    ops.push(M + " " + ry + " " + tableW + " " + ROW_H + " re f");
                    ops.push("0 g");
                }
                cols.forEach((col, ci) => {
                    const val = inventoryExportValue(item, col.key);
                    ops.push("BT /F1 " + FS + " Tf " + (colX[ci] + 2) + " " + (ry + 3) + " Td (" + trunc(val, colWidths[ci] - 4) + ") Tj ET");
                });
            });

            // --- Grilla (lineas horizontales y verticales) ---
            ops.push("0.15 w");
            ops.push("0.4 0.4 0.4 RG");
            // Borde exterior
            const gridH = HEADER_H + pageRows.length * ROW_H;
            const gridY = thY - pageRows.length * ROW_H;
            ops.push(M + " " + gridY + " " + tableW + " " + gridH + " re S");
            // Lineas horizontales entre filas
            for (let r = 0; r <= pageRows.length; r++) {
                const ly = thY - r * ROW_H;
                ops.push(M + " " + ly + " m " + (M + tableW) + " " + ly + " l S");
            }
            // Lineas verticales entre columnas
            for (let ci = 1; ci < cols.length; ci++) {
                ops.push(colX[ci] + " " + gridY + " m " + colX[ci] + " " + PAGE_TOP + " l S");
            }

            // --- Pie de pagina ---
            ops.push("0 g");
            ops.push("BT /F1 7 Tf " + M + " " + (M + 2) + " Td (SENADI - DTIC | " + now + ") Tj ET");

            const stream = ops.join("\n");
            const streamId = addObj("<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream");
            const pageId = addObj("<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 " + W + " " + H + "] /Contents " + streamId + " 0 R /Resources << /Font << /F1 " + fontId + " 0 R /F2 " + fontBoldId + " 0 R >> >> >>");
            pageRefs.push(pageId);
        }

        const pagesId = addObj("<< /Type /Pages /Count " + pageRefs.length + " /Kids [" + pageRefs.map((id) => id + " 0 R").join(" ") + "] >>");
        const catalogId = addObj("<< /Type /Catalog /Pages " + pagesId + " 0 R >>");

        const normalized = objects.map((obj, idx) =>
            (idx + 1) + " 0 obj\n" + obj.replace(/PAGES_REF 0 R/g, pagesId + " 0 R") + "\nendobj\n"
        );

        let pdf = "%PDF-1.4\n";
        const offsets = [];
        normalized.forEach((obj) => { offsets.push(pdf.length); pdf += obj; });
        const xrefStart = pdf.length;
        pdf += "xref\n0 " + (normalized.length + 1) + "\n0000000000 65535 f \n";
        offsets.forEach((o) => { pdf += String(o).padStart(10, "0") + " 00000 n \n"; });
        pdf += "trailer\n<< /Size " + (normalized.length + 1) + " /Root " + catalogId + " 0 R >>\nstartxref\n" + xrefStart + "\n%%EOF";
        return new Blob([pdf], { type: "application/pdf" });
    }

    function buildInventoryPdfBlob_UNUSED_OLD(rows, keys) {
        const pageWidth = 842;
        const pageHeight = 595;
        const margin = 28;
        const headerHeight = 64;
        const footerHeight = 22;
        const tableTop = pageHeight - headerHeight;
        const tableBottom = margin + footerHeight;
        const availableWidth = pageWidth - margin * 2;

        const cols = INVENTORY_EXPORT_COLUMNS.filter((col) => keys.includes(col.key));
        const totalWeight = cols.reduce((sum, col) => sum + (col.weight || 1), 0) || 1;

        const columns = cols.map((col, idx) => {
            const width = Math.max(48, Math.floor(availableWidth * ((col.weight || 1) / totalWeight)));
            const x = margin + cols.slice(0, idx).reduce((sum, prev) => sum + Math.max(48, Math.floor(availableWidth * ((prev.weight || 1) / totalWeight))), 0);
            return { key: col.key, title: col.label.toUpperCase(), x, width };
        });

        // Ajuste final de la ultima columna para cubrir el total.
        if (columns.length) {
            const used = columns[columns.length - 1].x - margin + columns[columns.length - 1].width;
            const diff = availableWidth - used;
            columns[columns.length - 1].width += diff;
        }

        const objects = [];
        const pageRefs = [];
        const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        const fontBoldId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

        function addObject(content) {
            objects.push(content);
            return objects.length;
        }

        function lineCapacity(width, fontSize) {
            // Aproximacion conservadora: Helvetica ~0.5*fontSize por caracter.
            return Math.max(6, Math.floor(width / (fontSize * 0.52)));
        }

        function wrapLines(value, maxChars) {
            const clean = String(value || "-").replace(/\s+/g, " ").trim();
            if (!clean) {
                return ["-"];
            }
            if (clean.length <= maxChars) {
                return [clean];
            }
            const words = clean.split(" ");
            const lines = [];
            let current = "";
            for (const word of words) {
                if (!current) {
                    current = word;
                    continue;
                }
                if ((current + " " + word).length <= maxChars) {
                    current += " " + word;
                    continue;
                }
                lines.push(current);
                current = word;
            }
            if (current) {
                lines.push(current);
            }
            // Hard-wrap para palabras extremadamente largas
            const finalLines = [];
            for (const line of lines) {
                if (line.length <= maxChars) {
                    finalLines.push(line);
                    continue;
                }
                for (let i = 0; i < line.length; i += maxChars) {
                    finalLines.push(line.slice(i, i + maxChars));
                }
            }
            return finalLines;
        }

        function drawText(content, fontRef, fontSize, x, y, text) {
            content.push(`BT /${fontRef} ${fontSize} Tf ${x} ${y} Td (${escapePdfText(text)}) Tj ET`);
        }

        function renderPage(pageRows, pageIndex, totalPages) {
            const content = [];
            // Header
            content.push("0 g");
            drawText(content, "F2", 16, margin, pageHeight - 34, "Reporte de Inventario Filtrado");
            drawText(content, "F1", 9, margin, pageHeight - 50, `Emitido: ${escapePdfText(new Date().toLocaleString("es-EC"))}`);
            drawText(content, "F1", 9, margin + 240, pageHeight - 50, `Total: ${rows.length}`);
            drawText(content, "F1", 9, pageWidth - margin - 110, pageHeight - 50, `Pagina ${pageIndex}/${totalPages}`);

            // Table header background
            const headerY = tableTop - 18;
            content.push("0.90 0.94 0.98 rg");
            content.push(`${margin} ${headerY - 6} ${pageWidth - margin * 2} 18 re f`);
            content.push("0 g");
            columns.forEach((col) => {
                drawText(content, "F2", 7.8, col.x + 2, headerY, col.title);
            });

            // Row rendering with wrapping (no truncation)
            let cursorY = headerY - 16;
            const fontSize = 7.2;
            const lineHeight = 9;
            const cellPadding = 2;

            for (let i = 0; i < pageRows.length; i += 1) {
                const item = pageRows[i];
                const wrapped = columns.map((col) => {
                    const raw = inventoryExportValue(item, col.key);
                    const cap = lineCapacity(col.width - cellPadding * 2, fontSize);
                    return wrapLines(raw || "-", cap);
                });
                const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
                const rowHeight = Math.max(14, (maxLines * lineHeight) + 4);

                if (cursorY - rowHeight < tableBottom) {
                    break;
                }

                if (i % 2 === 0) {
                    content.push("0.97 0.98 1 rg");
                    content.push(`${margin} ${cursorY - rowHeight + 3} ${pageWidth - margin * 2} ${rowHeight} re f`);
                    content.push("0 g");
                }

                columns.forEach((col, colIndex) => {
                    const lines = wrapped[colIndex];
                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
                        drawText(
                            content,
                            "F1",
                            fontSize,
                            col.x + cellPadding,
                            cursorY - (lineIndex * lineHeight),
                            lines[lineIndex]
                        );
                    }
                });

                // Grid lines
                content.push("0.15 w");
                content.push(`${margin} ${cursorY - rowHeight + 3} ${pageWidth - margin * 2} ${rowHeight} re S`);
                columns.forEach((col) => {
                    content.push(`${col.x} ${cursorY - rowHeight + 3} 0 ${rowHeight} re S`);
                });
                cursorY -= rowHeight;
            }

            return content.join("\n");
        }

        // Paginacion real con wrapping (sin truncar)
        const fontSize = 7.2;
        const lineHeight = 9;
        const cellPadding = 2;
        const headerY = tableTop - 18;
        const startY = headerY - 16;

        const preparedRows = rows.map((item) => {
            const wrapped = columns.map((col) => {
                const raw = inventoryExportValue(item, col.key);
                const cap = lineCapacity(col.width - cellPadding * 2, fontSize);
                return wrapLines(raw || "-", cap);
            });
            const maxLines = Math.max(1, ...wrapped.map((lines) => lines.length));
            const rowHeight = Math.max(14, (maxLines * lineHeight) + 4);
            return { item, wrapped, rowHeight };
        });

        const realizedPages2 = [];
        let cursor = 0;
        while (cursor < preparedRows.length) {
            let y = startY;
            const page = [];
            while (cursor < preparedRows.length) {
                const next = preparedRows[cursor];
                if (y - next.rowHeight < tableBottom) {
                    break;
                }
                page.push(next);
                y -= next.rowHeight;
                cursor += 1;
            }
            if (!page.length) {
                page.push(preparedRows[cursor]);
                cursor += 1;
            }
            realizedPages2.push(page);
        }

        // Render final: recalcula cortando por espacio disponible real
        if (false) {
        const realizedPages = [];
        let index = 0;
        while (index < rows.length) {
            let end = Math.min(rows.length, index + 20);
            while (end > index + 1) {
                const attempt = rows.slice(index, end);
                const streamText = renderPage(attempt, 1, 1);
                // Si el stream no incluye cortes, se asume OK (el corte real lo hace por bottom).
                // Ajuste: renderPage se detiene por bottom sin señal, asi que medimos con un truco:
                // contamos cuantas filas entraron buscando "re S" de cada fila (aprox).
                const renderedRows = (streamText.match(/ re S/g) || []).length;
                // Header agrega 1 rect; cada fila agrega 1 rect, entonces filas ~= renderedRows-1.
                const rowsFit = Math.max(0, renderedRows - 1);
                if (rowsFit >= attempt.length) {
                    break;
                }
                end = index + rowsFit;
            }
            if (end <= index) {
                end = index + 1;
            }
            realizedPages.push(rows.slice(index, end));
            index = end;
        }

        }
        const totalPages = realizedPages2.length || 1;
        realizedPages2.forEach((pageRows, pageIdx) => {
            const content = [];
            content.push("0 g");
            drawText(content, "F2", 16, margin, pageHeight - 34, "Reporte de Inventario Filtrado");
            drawText(content, "F1", 9, margin, pageHeight - 50, `Emitido: ${escapePdfText(new Date().toLocaleString("es-EC"))}`);
            drawText(content, "F1", 9, margin + 240, pageHeight - 50, `Total: ${rows.length}`);
            drawText(content, "F1", 9, pageWidth - margin - 110, pageHeight - 50, `Pagina ${pageIdx + 1}/${totalPages}`);

            content.push("0.90 0.94 0.98 rg");
            content.push(`${margin} ${headerY - 6} ${pageWidth - margin * 2} 18 re f`);
            content.push("0 g");
            columns.forEach((col) => {
                drawText(content, "F2", 7.8, col.x + 2, headerY, col.title);
            });

            let cursorY = startY;
            pageRows.forEach((row, stripeIndex) => {
                if (stripeIndex % 2 === 0) {
                    content.push("0.97 0.98 1 rg");
                    content.push(`${margin} ${cursorY - row.rowHeight + 3} ${pageWidth - margin * 2} ${row.rowHeight} re f`);
                    content.push("0 g");
                }

                columns.forEach((col, colIndex) => {
                    const lines = row.wrapped[colIndex];
                    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
                        drawText(content, "F1", fontSize, col.x + cellPadding, cursorY - (lineIndex * lineHeight), lines[lineIndex]);
                    }
                });

                content.push("0.15 w");
                content.push(`${margin} ${cursorY - row.rowHeight + 3} ${pageWidth - margin * 2} ${row.rowHeight} re S`);
                columns.forEach((col) => {
                    content.push(`${col.x} ${cursorY - row.rowHeight + 3} 0 ${row.rowHeight} re S`);
                });
                cursorY -= row.rowHeight;
            });

            const stream = content.join("\n");
            const streamId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
            const pageId = addObject(`<< /Type /Page /Parent PAGES_REF 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${streamId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`);
            pageRefs.push(pageId);
        });

        const pagesId = addObject(`<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.map((id) => `${id} 0 R`).join(" ")}] >>`);
        const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

        const normalizedObjects = objects.map((object, idx) => {
            const objectId = idx + 1;
            return `${objectId} 0 obj\n${object.replace(/PAGES_REF 0 R/g, `${pagesId} 0 R`)}\nendobj\n`;
        });

        let pdf = "%PDF-1.4\n";
        const offsets = [0];
        normalizedObjects.forEach((object) => {
            offsets.push(pdf.length);
            pdf += object;
        });
        const xrefStart = pdf.length;
        pdf += `xref\n0 ${normalizedObjects.length + 1}\n`;
        pdf += "0000000000 65535 f \n";
        for (let i = 1; i < offsets.length; i += 1) {
            pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
        }
        pdf += `trailer\n<< /Size ${normalizedObjects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
        return new Blob([pdf], { type: "application/pdf" });
    }

    function escapePdfText(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\\/g, "\\\\")
            .replace(/\(/g, "\\(")
            .replace(/\)/g, "\\)")
            .replace(/\r|\n/g, " ");
    }

    function fitPdfText(value, maxLength) {
        const clean = String(value || "").replace(/\s+/g, " ").trim();
        if (clean.length <= maxLength) {
            return clean;
        }
        return `${clean.slice(0, Math.max(0, maxLength - 3))}...`;
    }

    function labelForColumn(key) {
        const labels = {
            codigoSbai: "Codigo SBYE",
            codigoMegan: "Codigo Megan",
            descripcion: "Descripcion",
            tipo: "Tipo",
            marca: "Marca",
            modelo: "Modelo",
            numeroSerie: "Numero de serie",
            custodio: "Custodio",
            ubicacion: "Ubicacion",
            ubicacionEdificio: "Edificio",
            ubicacionPiso: "Piso",
            ubicacionDireccion: "Dirección",
            estado: "Estado",
            procesador: "Detalle",
            caracteristicas: "Caracteristicas",
            observacion: "Observaciones",
            sistemaOperativo: "SO",
            ram: "RAM",
            discoDuro: "Disco duro",
            linea: "Linea",
            imei: "IMEI",
            resolucion: "Resolucion",
            conexion: "Conexion",
            tecnologia: "Tecnologia",
            compatibilidad: "Compatibilidad",
            lumenes: "Lumenes",
            codigo_megan: "Codigo Megan",
            codigo_sbye: "Codigo SBYE",
            sn: "Numero de serie",
            fecha_ingreso: "Fecha de ingreso",
            costo: "Costo",
            ultima_actualizacion: "Ultima actualizacion",
            ultimo_mantenimiento: "Ultimo mantenimiento",
            id_custodio_actual: "Custodio actual (ID)",
            id_ubicacion: "Ubicacion (ID)",
            tipo_periferico: "Tipo de periferico",
            tipo_impresora: "Tipo de impresora",
            codigo_anterior: "Codigo anterior",
            numero_contrato: "Numero de contrato",
            numero_servicio: "Numero de servicio",
            plan_comercial: "Plan comercial",
            estado_servicio: "Estado del servicio",
            anterior_custodio: "Custodio anterior",
            subtipo: "Subtipo",
            megas: "Megas",
            acreditacion: "Acreditacion",
            anotaciones: "Anotaciones",
            acta_ugdt: "Acta UGDT",
            acta_ugad: "Acta UGAD"
        };
        return labels[key] || key;
    }

    // ---------- Overrides de roles y acciones ----------

    function defaultPermissionsByRole(roleName) {
        if (roleName === "admin") {
            return {
                puedeEditarTodos: true,
                puedeActualizarEstado: true,
                puedeVer: true,
                puedeCrearEquipo: true,
                puedeEditarCustodio: true,
                puedeExportarInventario: true,
                puedeVerHistorial: true
            };
        }
        if (roleName === "custodio") {
            return {
                puedeEditarTodos: false,
                puedeActualizarEstado: false,
                puedeVer: true,
                puedeCrearEquipo: false,
                puedeEditarCustodio: false,
                puedeExportarInventario: false,
                puedeVerHistorial: true
            };
        }
        return {
            puedeEditarTodos: false,
            puedeActualizarEstado: false,
            puedeVer: true,
            puedeCrearEquipo: false,
            puedeEditarCustodio: true,
            puedeExportarInventario: true,
            puedeVerHistorial: true
        };
    }

    function mapSession(data) {
        const rolRaw = String(data?.rol || "").trim().toUpperCase();
        const role = rolRaw.includes("ADMIN")
            ? "admin"
            : (rolRaw.includes("CUSTODIO") ? "custodio" : "tecnico");

        const roleLabel = role === "admin"
            ? "Administrador"
            : (role === "custodio" ? "Custodio" : "Tecnico");

        const fallbackName = data?.nombreCompleto || data?.usuario || data?.username || "Usuario";
        const permissions = Object.assign({}, defaultPermissionsByRole(role), data?.permisos || {});

        return {
            username: data?.usuario || data?.username || "usuario",
            displayName: fallbackName,
            role,
            roleLabel,
            accessRole: role === "admin" ? "ADMINISTRADOR" : (role === "custodio" ? "CUSTODIO" : "TECNICO"),
            idCustodio: data?.idCustodio ?? null,
            permissions,
            permisos: permissions
        };
    }

    function buildDemoSession() {
        return null;
    }

    function initLogin() {
        startClock();
        clearDemoSession();
        document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
    }

    async function resolveSession() {
        try {
            const response = await apiFetch("/login/actual");
            if (!response.ok) {
                clearDemoSession();
                return null;
            }
            const payload = await response.json();
            if (payload.success && payload.data) {
                const session = mapSession(payload.data);
                setDemoSession(session);
                return session;
            }
        } catch (error) {
            clearDemoSession();
            return null;
        }
        clearDemoSession();
        return null;
    }

    function redirectForRole(session) {
        const roleName = session?.role || "tecnico";
        let target;
        if (roleName === "admin") {
            target = `${basePrefix}/pages/dashboard.html`;
        } else if (roleName === "custodio") {
            target = `${basePrefix}/pages/custodio/dashboard.html`;
        } else {
            target = `${basePrefix}/pages/usuario/dashboard.html`;
        }
        window.location.href = target.replace("/pages/pages/", "/pages/");
    }

    function isRoleAllowedForPage(pageRole, sessionRole) {
        if (pageRole === "admin") {
            return sessionRole === "admin";
        }
        if (pageRole === "tecnico") {
            return sessionRole === "tecnico";
        }
        if (pageRole === "custodio") {
            return sessionRole === "custodio";
        }
        if (pageRole === "usuario") {
            return sessionRole === "tecnico" || sessionRole === "custodio";
        }
        return true;
    }

    async function initShell() {
        state.session = await resolveSession();
        if (!state.session) {
            window.location.href = `${basePrefix}/index.html`.replace("/pages/index.html", "/index.html");
            return;
        }
        if (!isRoleAllowedForPage(role, state.session.role)) {
            redirectForRole(state.session);
            return;
        }
        if (page === "busqueda") {
            const target = state.session?.role === "admin"
                ? `${basePrefix}/pages/inventario.html`
                : (state.session?.role === "custodio"
                    ? `${basePrefix}/pages/custodio/inventario.html`
                    : `${basePrefix}/pages/usuario/inventario.html`);
            window.location.href = target;
            return;
        }
        if (page === "nuevo-equipo" && !canCreateEquipment()) {
            redirectForRole(state.session);
            return;
        }
        renderShell();
        bindShellEvents();
        await loadInitialData();
    }

    function buildNav() {
        const roleName = state.session?.role || role;
        let nav;
        if (roleName === "admin") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Busqueda", `${basePrefix}/pages/busqueda.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`],
                ["actas", "ACTAS", `${basePrefix}/pages/actas.html`]
            ];
        } else if (roleName === "custodio") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/custodio/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/custodio/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Busqueda", `${basePrefix}/pages/custodio/busqueda.html`]
                ["actas", "ACTAS", `${basePrefix}/pages/custodio/actas.html`]
            ];
        } else {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Busqueda", `${basePrefix}/pages/usuario/busqueda.html`]
                ["actas", "ACTAS", `${basePrefix}/pages/usuario/actas.html`]
            ];
        }

        return nav
            .filter(([key]) => key !== "busqueda")
            .map(([key, label, href]) => `
                <a href="${href}" class="${(key === "actas" && isActasPage(page)) || key === page ? "is-active" : ""}">
                    <span class="nav-icon" aria-hidden="true">${NAV_ICONS[key] || iconMarkup("circle")}</span>
                    <span>${label}</span>
                </a>
            `)
            .join("");
    }

    function renderShell() {
        const appShell = document.getElementById("appShell");
        const roleName = state.session?.role || role;
        const panelLabel = roleName === "admin"
            ? "Panel administrativo"
            : (roleName === "custodio" ? "Panel custodio" : "Panel tecnico");

        appShell.innerHTML = `
            <div class="app-shell role-${roleName}">
                <aside class="sidebar" id="sidebar">
                    <div class="sidebar__brand">
                        <div class="brand-mark">SI</div>
                        <div>
                            <strong>Sistema Inventario</strong>
                            <span>${panelLabel}</span>
                        </div>
                    </div>
                    <div class="sidebar__user">
                        <div class="avatar">${state.session.displayName.charAt(0).toUpperCase()}</div>
                        <div>
                            <strong>${escapeHtml(state.session.displayName)}</strong>
                            <span>${state.session.roleLabel}</span>
                        </div>
                    </div>
                    <nav class="sidebar__nav">${buildNav()}</nav>
                    <button class="sidebar__logout" id="logoutButton">Cerrar sesion</button>
                </aside>
                <div class="app-main">
                    <header class="topbar">
                        <div class="topbar__actions">
                            <button class="topbar__toggle" id="sidebarToggle">☰</button>
                            <div class="topbar__title">
                                <h1>${pageTitle(page)}</h1>
                                <p>${pageDescription(page)}</p>
                            </div>
                        </div>
                        <div class="user-chip">${escapeHtml(state.session.displayName)} · ${state.session.roleLabel}</div>
                    </header>
                    <main class="content" id="pageContent"></main>
                </div>
            </div>
            <div class="modal-root" id="modalRoot"></div>
            <div class="toast-stack" id="toastStack"></div>
        `;
        document.getElementById("pageContent").innerHTML = renderPage();
    }

    function pageDescription(pageName) {
        const descriptions = {
            dashboard: "Resumen visual del sistema y accesos directos por rol.",
            inventario: "Consulta y gestion del inventario con control por rol.",
            busqueda: "Busqueda multi-criterio en cliente sobre el inventario cargado.",
            "nuevo-equipo": "Formulario preparado con los campos definidos en la base de datos.",
            actas: "Acceso a las actas de mantenimiento y control disponibles en el sistema.",
            "acta-equipos": "Formulario para registrar mantenimiento preventivo de equipos.",
            "acta-software": "Formulario para registrar programas y aplicaciones instaladas.",
            "acta-rc": "Formulario para registrar mantenimiento preventivo RC."
        };
        return descriptions[pageName] || "";
    }

    function canEditCustodio() {
        return Boolean(state.session?.permissions?.puedeEditarCustodio);
    }

    function canEditAll() {
        return Boolean(state.session?.permissions?.puedeEditarTodos);
    }

    function canChangeState() {
        return Boolean(state.session?.permissions?.puedeActualizarEstado);
    }

    function canExportInventory() {
        return Boolean(state.session?.permissions?.puedeExportarInventario);
    }

    function canCreateEquipment() {
        return Boolean(state.session?.permissions?.puedeCrearEquipo);
    }

    function canViewHistory() {
        if (!state.session?.permissions) {
            return true;
        }
        return state.session.permissions.puedeVerHistorial !== false;
    }

    function renderInventoryPage() {
        const canExport = canExportInventory();
        return `
            <section class="panel inventory-panel">
                <div class="inventory-header">
                    <div>
                        <div class="eyebrow">Modulo de inventario</div>
                        <h2>Inventario institucional</h2>
                        <p id="inventoryIntroText">Utiliza los filtros para localizar equipos por codigo, custodio, ubicacion, marca, modelo y estado.</p>
                    </div>
                </div>
                <div class="filters-grid filters-grid--inventory">
                    <div class="field-group">
                        <label for="filterTipo">Tipo</label>
                        <select id="filterTipo">
                            <option value="">Todos</option>
                            ${buildTypeOptions()}
                        </select>
                    </div>
                    ${renderAutocompleteField("filterCodigoSbai", "Codigo SBYE", "Filtrar por codigo")}
                    ${renderAutocompleteField("filterCodigoMegan", "Codigo Megan", "Filtrar por codigo")}
                    ${renderAutocompleteField("filterDescripcion", "Descripcion", "Filtrar por descripcion")}
                    ${renderAutocompleteField("filterMarca", "Marca", "Filtrar por marca")}
                    ${renderAutocompleteField("filterModelo", "Modelo", "Filtrar por modelo")}
                    ${renderAutocompleteField("filterSerie", "Numero de serie", "Filtrar por numero")}
                    ${renderAutocompleteField("filterCustodio", "Custodio", "Filtrar por custodio")}
                    ${renderAutocompleteField("filterEdificio", "Edificio", "Filtrar por edificio")}
                    ${renderAutocompleteField("filterPiso", "Piso", "Filtrar por piso")}
                    ${renderAutocompleteField("filterDireccion", "Dirección", "Filtrar por dirección")}
                    <div class="field-group">
                        <label for="filterEstado">Estado</label>
                        <select id="filterEstado">
                            <option value="">Todos</option>
                            ${VALID_STATES.map((item) => `<option value="${item}">${item}</option>`).join("")}
                        </select>
                    </div>
                </div>
                <div class="toolbar" style="margin-top:16px;">
                    <button class="btn btn-primary" id="applyInventoryFilters">Filtrar</button>
                    <button class="btn btn-secondary" id="clearInventoryFilters">Limpiar</button>
                    ${canExport ? '<button class="btn btn-success" id="exportInventoryExcel">Exportar a Excel</button>' : ""}
                    ${canExport ? '<button class="btn btn-secondary" id="exportInventoryPdf">Exportar a PDF</button>' : ""}
                </div>
                <div id="inventoryMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDireccion", "procesador", "estado"]
                .map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="inventoryBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="inventoryMobile"></div>
                <div class="pagination">
                    <span id="inventoryPaginationMeta"></span>
                    <div class="toolbar">
                        <button class="btn btn-secondary" id="prevPage">Anterior</button>
                        <button class="btn btn-secondary" id="nextPage">Siguiente</button>
                    </div>
                </div>
            </section>
        `;
    }

    function buildInventoryActionButtons(item, options) {
        const buttons = [];
        const wrap = options?.wrap !== false;
        if (canEditAll()) {
            buttons.push(`<button class="icon-btn" type="button" data-inv-action="editar" data-id="${item.id}" aria-label="Editar equipo" title="Editar equipo">${iconMarkup("edit")}</button>`);
        } else if (canEditCustodio()) {
            buttons.push(`<button class="icon-btn" type="button" data-inv-action="editar" data-id="${item.id}" aria-label="Editar custodio" title="Editar custodio">${iconMarkup("edit")}</button>`);
        }
        if (canChangeState()) {
            buttons.push(`<button class="icon-btn" type="button" data-inv-action="estado" data-id="${item.id}" aria-label="Cambiar estado" title="Cambiar estado">${iconMarkup("repeat")}</button>`);
        }
        if (canViewHistory()) {
            buttons.push(`<button class="icon-btn" type="button" data-inv-action="historial" data-id="${item.id}" aria-label="Ver historial" title="Ver historial">${iconMarkup("history")}</button>`);
        }
        if (!buttons.length) {
            return '<span class="muted">Sin acciones</span>';
        }
        const body = buttons.join("");
        return wrap ? `<div class="action-row">${body}</div>` : body;
    }

    function renderInventoryRow(item) {
        return `
            <tr>
                <td>${escapeHtml(item.codigoSbai || "-")}</td>
                <td>${escapeHtml(item.codigoMegan || "-")}</td>
                <td>${escapeHtml(item.descripcion || "-")}</td>
                <td>${escapeHtml(displayInventoryType(item))}</td>
                <td>${escapeHtml(item.marca || "-")}</td>
                <td>${escapeHtml(item.modelo || "-")}</td>
                <td>${escapeHtml(item.numeroSerie || "-")}</td>
                <td>${escapeHtml(item.custodio || "-")}</td>
                <td>${escapeHtml(item.ubicacionEdificio || "-")}</td>
                <td>${escapeHtml(item.ubicacionPiso || "-")}</td>
                <td>${escapeHtml(item.ubicacionDireccion || "-")}</td>
                <td>${escapeHtml(item.procesador || item.caracteristicas || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
                <td>${buildInventoryActionButtons(item)}</td>
            </tr>
        `;
    }

    function renderMobileInventoryCard(item) {
        return `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai || "-")} · ${escapeHtml(displayInventoryType(item))}</strong>
                <span>Megan: ${escapeHtml(item.codigoMegan || "-")}</span>
                <span>Descripcion: ${escapeHtml(item.descripcion || "-")}</span>
                <span>Marca / Modelo: ${escapeHtml(item.marca || "-")} ${escapeHtml(item.modelo || "")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Ubicacion: ${escapeHtml(item.ubicacion || "-")}</span>
                <span>Detalle: ${escapeHtml(item.procesador || item.caracteristicas || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
                <div class="action-row" style="margin-top:10px;">${buildInventoryActionButtons(item, { wrap: false })}</div>
            </article>
        `;
    }

    function renderInventory() {
        const tbody = document.getElementById("inventoryBody");
        const mobile = document.getElementById("inventoryMobile");
        if (!tbody || !mobile) {
            return;
        }
        const total = state.filteredInventory.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        state.inventoryPage = Math.min(state.inventoryPage, totalPages);
        const start = (state.inventoryPage - 1) * PAGE_SIZE;
        const pageItems = state.filteredInventory.slice(start, start + PAGE_SIZE);

        updateInventoryStats();
        setText("inventoryMeta", `${total} resultados filtrados · pagina ${state.inventoryPage} de ${totalPages}`);
        setText("inventoryPaginationMeta", pageItems.length ? `Mostrando ${start + 1}-${start + pageItems.length}` : "Sin resultados");
        tbody.innerHTML = pageItems.length
            ? pageItems.map(renderInventoryRow).join("")
            : `<tr><td colspan="12">No hay equipos para los filtros aplicados.</td></tr>`;
        mobile.innerHTML = pageItems.map(renderMobileInventoryCard).join("");
        refreshInventoryAutocompletes();
    }

    function bindInventoryEvents() {
        inventoryFilterIds().forEach((id) => {
            document.getElementById(id)?.addEventListener("input", () => {
                updateAutocompleteForInput(id);
                applyInventoryFilters();
            });
            document.getElementById(id)?.addEventListener("change", applyInventoryFilters);
        });
        document.getElementById("applyInventoryFilters")?.addEventListener("click", applyInventoryFilters);
        document.getElementById("clearInventoryFilters")?.addEventListener("click", clearInventoryFilters);
        if (canExportInventory()) {
            document.getElementById("exportInventoryExcel")?.addEventListener("click", () => openExportDialog("excel"));
            document.getElementById("exportInventoryPdf")?.addEventListener("click", () => openExportDialog("pdf"));
        }
        document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => sortInventory(button.dataset.sort)));
        document.getElementById("prevPage")?.addEventListener("click", () => changePage(-1));
        document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
        document.getElementById("inventoryBody")?.addEventListener("click", handleInventoryActionClick);
        document.getElementById("inventoryMobile")?.addEventListener("click", handleInventoryActionClick);
    }

    async function handleInventoryActionClick(event) {
        const button = event.target.closest("[data-inv-action]");
        if (!button) {
            return;
        }
        const action = button.dataset.invAction;
        const id = Number(button.dataset.id || 0);
        const item = state.inventory.find((entry) => Number(entry.id) === id);
        if (!item) {
            return;
        }
        if (action === "editar") {
            if (canEditAll()) {
                await abrirModalEditar(item.id);
            } else {
                await openCustodioEditor(item);
            }
            return;
        }
        if (action === "estado") {
            await openStateEditor(item);
            return;
        }
        if (action === "historial") {
            await openHistoryViewer(item);
        }
    }

    async function loadCustodios(query, limit) {
        const params = new URLSearchParams();
        const term = typeof query === "string" ? query.trim() : "";
        if (term) {
            params.set("q", term);
        }
        const max = Number.isFinite(limit) && limit > 0 ? Math.trunc(limit) : 0;
        if (max > 0) {
            params.set("limit", String(max));
        }
        const path = params.toString() ? `/inventario/custodios?${params.toString()}` : "/inventario/custodios";
        const response = await apiFetch(path);
        const payload = await response.json();
        if (!response.ok || !payload.success) {
            throw new Error(payload.message || "No se pudo cargar custodios.");
        }
        return Array.isArray(payload.data) ? payload.data : [];
    }

    async function openCustodioEditor(item) {
        try {
            const custodios = await loadCustodios(null, 500);
            const opcionesCustodio = custodios.map((c) => {
                const nombre = String(c?.nombre || "");
                return `<option value="${c.id}">${escapeHtml(nombre)}</option>`;
            }).join("");
            const datalistOpts = custodios.map((c) =>
                `<option value="${escapeHtml(String(c?.nombre || ""))}"></option>`
            ).join("");

            const tipoLabel = {
                pc: "PC", laptop: "Laptop", periferico: "Periférico", impresora: "Impresora",
                escaner: "Escáner", telefono: "Teléfono", proyector: "Proyector",
                infraestructura: "Infraestructura", licencia: "Licencia",
                bien_control_admin: "Bien Control Adm.", modem: "Módem"
            };
            const hoy = new Date().toISOString().split("T")[0];
            const roSt = "opacity:.55;cursor:not-allowed;background:#f4f6fb;border-color:#e0e9f6;";

            openModal(
                `Editar custodio — ${escapeHtml(item.codigoSbai || String(item.id))}`,
                `<div>
                    <div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:9px 14px;margin-bottom:14px;font-size:13px;color:#7a5f00;display:flex;align-items:center;gap:8px;">
                        <span style="font-size:16px;">ℹ️</span>
                        <span>Los campos en gris son de <strong>solo lectura</strong>. Únicamente puede modificar el <strong>custodio</strong>.</span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="editFormGrid2">
                        <label class="edit-field"><span>Código SBYE</span><input value="${escapeHtml(item.codigoSbai || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Código Megan</span><input value="${escapeHtml(item.codigoMegan || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field" style="grid-column:span 2;"><span>Descripción</span><input value="${escapeHtml(item.descripcion || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Tipo</span><input value="${escapeHtml(tipoLabel[item.tipo] || item.tipo || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Marca</span><input value="${escapeHtml(item.marca || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Modelo</span><input value="${escapeHtml(item.modelo || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Número de serie</span><input value="${escapeHtml(item.numeroSerie || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field" style="grid-column:span 2;">
                            <span>Custodio <em style="color:var(--primary);font-weight:600;font-style:normal;">(editable)</em></span>
                            <select name="id_custodio_actual" id="custodioSelectEdit" style="border-color:var(--primary);">
                                <option value="">-- Sin custodio --</option>${opcionesCustodio}
                            </select>
                        </label>
                        <label class="edit-field"><span>Edificio</span><input value="${escapeHtml(item.ubicacionEdificio || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field"><span>Piso</span><input value="${escapeHtml(item.ubicacionPiso || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field" style="grid-column:span 2;"><span>Dirección / Área</span><input value="${escapeHtml(item.ubicacionDireccion || "")}" disabled style="${roSt}"></label>
                        <label class="edit-field" style="grid-column:span 2;"><span>Detalle</span><textarea disabled rows="2" style="${roSt}">${escapeHtml(item.observacion || item.caracteristicas || "")}</textarea></label>
                        <hr style="grid-column:span 2;border:none;border-top:1px solid #dce7f3;margin:2px 0 4px;">
                        <label class="edit-field" style="grid-column:span 2;">
                            <span>Registrado por <em style="color:var(--primary);font-weight:600;font-style:normal;">(requerido)</em></span>
                            <input id="registradoPorInput" list="listCustodiosSug" autocomplete="off" placeholder="Escriba su nombre completo..." style="font-weight:500;">
                            <datalist id="listCustodiosSug">${datalistOpts}</datalist>
                        </label>
                        <label class="edit-field">
                            <span>Fecha del cambio</span>
                            <input type="date" id="fechaCambioInput" value="${hoy}">
                        </label>
                    </div>
                </div>`,
                [
                    { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
                    {
                        label: "Guardar cambio",
                        className: "btn btn-primary",
                        onClick: async () => {
                            const sel = document.getElementById("custodioSelectEdit");
                            const regPor = document.getElementById("registradoPorInput");
                            if (!sel?.value) { showToast("Aviso", "Seleccione un custodio.", "warning"); return; }
                            if (!regPor?.value.trim()) { showToast("Aviso", "Ingrese el nombre de quien registra el cambio.", "warning"); return; }
                            try {
                                const r = await apiFetch(`/inventario/${item.id}/custodio`, {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        idCustodio: parseInt(sel.value),
                                        registradoPor: regPor.value.trim()
                                    })
                                });
                                const p = await r.json();
                                if (!r.ok || !p.success) throw new Error(p.message || "Error al guardar");
                                closeModal();
                                showUpdatedInventoryRow(p.data);
                                showToast("Custodio actualizado", "El cambio se guardó correctamente en el historial.", "success");
                            } catch (err) {
                                showToast("Error", err.message, "danger");
                            }
                        }
                    }
                ]
            );

            const selCustodio = document.getElementById("custodioSelectEdit");
            if (selCustodio && item.custodio) {
                const match = custodios.find((c) => String(c.nombre).trim().toLowerCase() === String(item.custodio).trim().toLowerCase());
                if (match) selCustodio.value = String(match.id);
            }
        } catch (error) {
            showToast("Error", error.message || "No se pudo abrir el editor.", "danger");
        }
    }

    async function saveCustodioChange(item, idCustodio) {
        try {
            const response = await apiFetch(`/inventario/${item.id}/custodio`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idCustodio })
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "No se pudo actualizar el custodio.");
            }
            closeModal();
            showUpdatedInventoryRow(payload.data);
            showToast("Custodio actualizado", "El cambio se guardo correctamente.", "success");
        } catch (error) {
            showToast("Error", error.message || "No se pudo guardar el cambio de custodio.", "danger");
        }
    }

    async function openStateEditor(item) {
        openModal(
            `Cambiar estado (${escapeHtml(item.codigoSbai || item.id)})`,
            `
                <div class="field-group">
                    <label for="nuevoEstadoSelect">Estado</label>
                    <select id="nuevoEstadoSelect">
                        ${VALID_STATES.map((estado) => `<option value="${estado}" ${normalizeState(item.estado) === estado ? "selected" : ""}>${estado}</option>`).join("")}
                    </select>
                </div>
            `,
            [
                { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
                {
                    label: "Guardar",
                    className: "btn btn-primary",
                    onClick: async () => {
                        const estado = document.getElementById("nuevoEstadoSelect")?.value || "";
                        await saveStateChange(item, estado);
                    }
                }
            ]
        );
    }

    function showUpdatedInventoryRow(updated) {
        if (!updated) {
            return;
        }
        const normalized = normalizeItems([updated])[0];
        const index = state.inventory.findIndex((row) => row.id === normalized.id);
        if (index >= 0) {
            state.inventory[index] = normalized;
        } else {
            state.inventory.push(normalized);
        }
        state.filteredInventory = [normalized];
        state.inventoryPage = 1;
        renderInventory();
        if (typeof refreshInventoryAutocompletes === "function") {
            refreshInventoryAutocompletes();
        }
    }

    async function saveStateChange(item, estado) {
        try {
            const response = await apiFetch(`/inventario/${item.id}/estado`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado })
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "No se pudo actualizar el estado.");
            }
            closeModal();
            showUpdatedInventoryRow(payload.data);
            showToast("Estado actualizado", "El estado del equipo fue actualizado.", "success");
        } catch (error) {
            showToast("Error", error.message || "No se pudo guardar el estado.", "danger");
        }
    }

    function renderHistoryVersionCards(historial) {
        const usableRows = historial.filter((h) => {
            const accion = String(h.accion || "").toLowerCase();
            return !accion.includes("completa del equipo") && !String(h.valorNuevo || "").toLowerCase().includes("campos actualizados:");
        });
        const rows = usableRows.length ? usableRows : historial;
        return `
            <div style="display:grid;gap:12px;">
                ${rows.map((h, index) => {
                    const version = rows.length - index;
                    const ant = h.valorAnterior && h.valorAnterior !== "?" ? escapeHtml(h.valorAnterior) : "Sin dato anterior";
                    const nvo = h.valorNuevo && h.valorNuevo !== "?" ? escapeHtml(h.valorNuevo) : "Sin dato actualizado";
                    const rol = escapeHtml(h.rol || "ADMINISTRADOR");
                    const usuario = escapeHtml(h.usuario || "-");
                    const fecha = h.fecha ? new Date(h.fecha).toLocaleString("es-EC") : "-";
                    return `<article style="border:1px solid #dce7f3;border-radius:14px;background:#fff;padding:14px;box-shadow:0 8px 20px rgba(15,31,56,.05);">
                        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                            <strong style="color:var(--primary);">Versión ${version} · ${escapeHtml(h.accion || "Cambio")}</strong>
                            <span style="color:#61708a;font-size:12px;">${fecha}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                            <div style="background:#fff8e1;border:1px solid #ffe2a8;border-radius:10px;padding:10px;"><strong>Antes</strong><div style="margin-top:6px;">${ant}</div></div>
                            <div style="background:#eaf7ee;border:1px solid #ccebd5;border-radius:10px;padding:10px;"><strong>Después</strong><div style="margin-top:6px;color:#155724;font-weight:600;">${nvo}</div></div>
                        </div>
                        <div style="margin-top:10px;color:#61708a;font-size:12px;border-top:1px solid #eef2f9;padding-top:8px;">
                            Cambio realizado por: <strong>${usuario}</strong> · Rol: <strong>${rol}</strong>
                        </div>
                    </article>`;
                }).join("")}
            </div>
        `;
    }

    async function openHistoryViewer(item) {
        try {
            const response = await apiFetch(`/inventario/${item.id}/historial`);
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "No se pudo consultar el historial.");
            }
            const historial = Array.isArray(payload.data) ? payload.data : [];
            const bodyHtml = historial.length
                ? `<div style="display:flex;flex-direction:column;gap:10px;">
                    ${historial.map((h) => {
                        const ant = escapeHtml(h.valorAnterior || "-");
                        const nvo = escapeHtml(h.valorNuevo || "-");
                        const fecha = h.fecha ? new Date(h.fecha).toLocaleString("es-EC") : "-";
                        const rolLabel = h.rol ? escapeHtml(h.rol) : "TÉCNICO";
                        const usuLabel = h.usuario ? escapeHtml(h.usuario) : "-";
                        return `<div style="background:#f8fafd;border:1px solid #dce7f3;border-radius:10px;padding:12px 14px;">
                            <div style="font-weight:600;color:var(--primary);margin-bottom:6px;font-size:14px;">${escapeHtml(h.accion || "Cambio")}</div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 14px;font-size:13px;">
                                <div style="color:#61708a;">Antes:</div>
                                <div style="color:#61708a;">Ahora:</div>
                                <div style="background:#fff3cd;border-radius:5px;padding:3px 7px;font-weight:500;">${ant}</div>
                                <div style="background:#d4edda;border-radius:5px;padding:3px 7px;font-weight:600;color:#155724;">${nvo}</div>
                            </div>
                            <div style="margin-top:8px;font-size:12px;color:#61708a;border-top:1px solid #eef2f9;padding-top:6px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;">
                                <span>Registrado por: <strong>${usuLabel}</strong> — Rol: <strong>${rolLabel}</strong></span>
                                <span>📅 ${fecha}</span>
                            </div>
                        </div>`;
                    }).join("")}
                  </div>`
                : '<p style="color:#61708a;text-align:center;padding:24px;">No hay historial registrado para este equipo.</p>';

            openModal(
                `Historial — ${escapeHtml(item.codigoSbai || item.id)}`,
                historial.length ? renderHistoryVersionCards(historial) : bodyHtml,
                [{ label: "Cerrar", className: "btn btn-secondary", onClick: closeModal }]
            );
        } catch (error) {
            showToast("Error", error.message || "No se pudo abrir el historial.", "danger");
        }
    }

    function renderNewEquipmentPage() {
        return `
            <section class="panel panel--narrow">
                <div class="inventory-header inventory-header--form">
                    <div>
                        <div class="eyebrow">Nuevo equipo</div>
                        <h2>Registro por tipo de activo</h2>
                    </div>
                </div>
                <div class="field-group">
                    <label for="equipmentCategory">Categoria</label>
                    <select id="equipmentCategory">
                        <option value="">Cargando tipos...</option>
                    </select>
                </div>
                <div class="helper-banner" id="equipmentCategoryHint"></div>
                <form id="newEquipmentForm">
                    <div class="form-grid" id="dynamicEquipmentFields"></div>
                    <div class="form-actions" style="margin-top:18px;">
                        <button class="btn btn-primary" type="submit">Guardar equipo</button>
                        <button class="btn btn-secondary" type="reset">Limpiar</button>
                    </div>
                </form>
                <div class="report-history" id="equipmentFieldSummary" style="margin-top:18px;"></div>
            </section>
        `;
    }

    function renderDynamicFields(category) {
        const container = document.getElementById("dynamicEquipmentFields");
        const hint = document.getElementById("equipmentCategoryHint");
        const summary = document.getElementById("equipmentFieldSummary");
        if (!container || !hint || !summary) {
            return;
        }
        const categoryConfig = state.equipmentFieldCatalog[category];
        if (!categoryConfig) {
            container.innerHTML = "";
            hint.textContent = "";
            summary.innerHTML = "";
            return;
        }
        const fields = Array.isArray(categoryConfig.fields) ? categoryConfig.fields : [];
        container.innerHTML = renderDynamicDbFieldGroups(fields);
        setupNewEquipmentAutocompletes();
        hint.textContent = "";
        summary.innerHTML = "";
    }

    // ==================== MODALES DE ACCIÓN (accesibles desde onclick en la tabla) ====================

    // Campos editables por tipo de equipo
    const CAMPOS_TIPO = {
        pc:              ["procesador", "ram", "disco_duro", "so", "ip"],
        laptop:          ["procesador", "ram", "disco_duro", "so", "ip"],
        impresora:       ["tipo_impresora", "ip", "caracteristicas"],
        periferico:      ["tipo_periferico", "caracteristicas"],
        escaner:         ["caracteristicas"],
        telefono:        ["caracteristicas"],
        proyector:       ["caracteristicas", "acta_ugdt", "acta_ugad", "anotaciones"],
        infraestructura: ["subtipo", "caracteristicas", "acta_ugdt", "acta_ugad", "anotaciones"],
        licencia:        ["caracteristicas", "acta_ugdt", "acta_ugad", "anotaciones"],
        bien_control_admin: ["codigo_anterior"],
        modem:           ["numero_contrato", "numero_servicio", "plan_comercial", "estado_servicio", "megas", "acreditacion", "caracteristicas", "anotaciones"]
    };
    const LABEL_CAMPO = {
        procesador: "Procesador", ram: "RAM", disco_duro: "Disco Duro", so: "Sistema Operativo", ip: "IP",
        tipo_impresora: "Tipo Impresora", tipo_periferico: "Tipo Periférico", subtipo: "Subtipo",
        caracteristicas: "Características", anotaciones: "Anotaciones", codigo_anterior: "Código Anterior",
        acta_ugdt: "Acta UGDT", acta_ugad: "Acta UGAD",
        numero_contrato: "Nº Contrato", numero_servicio: "Nº Servicio",
        plan_comercial: "Plan Comercial", estado_servicio: "Estado Servicio", megas: "Megas",
        acreditacion: "Acreditación"
    };

    async function abrirModalEditar(idEquipo) {
        const item = state.inventory.find((i) => i.id === idEquipo);
        if (!item) { showToast("Error", "Equipo no encontrado en el inventario cargado.", "danger"); return; }

        // Cargar custodios y ubicaciones en paralelo
        let custodios = [], ubicaciones = [];
        try {
            const [rc, ru] = await Promise.all([
                apiFetch("/inventario/custodios?limit=500"),
                apiFetch("/inventario/ubicaciones?limit=500")
            ]);
            const pc = await rc.json(); custodios = Array.isArray(pc.data) ? pc.data : [];
            const pu = await ru.json(); ubicaciones = Array.isArray(pu.data) ? pu.data : [];
        } catch (_) { /* continuar sin autocompletar */ }

        const opcionesCustodio = custodios.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join("");

        const tipoLabel = {
            pc: "PC", laptop: "Laptop", periferico: "Periférico", impresora: "Impresora",
            escaner: "Escáner", telefono: "Teléfono", proyector: "Proyector",
            infraestructura: "Infraestructura", licencia: "Licencia",
            bien_control_admin: "Bien Control Adm.", modem: "Módem"
        };

        const bodyHtml = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" id="editFormGrid">
                <label class="edit-field"><span>Código SBYE</span><input name="codigo_sbye" value="${escapeHtml(item.codigoSbai || "")}"></label>
                <label class="edit-field"><span>Código Megan</span><input name="codigo_megan" value="${escapeHtml(item.codigoMegan || "")}"></label>
                <label class="edit-field" style="grid-column:span 2;"><span>Descripción</span><input name="descripcion" value="${escapeHtml(item.descripcion || "")}"></label>
                <label class="edit-field"><span>Tipo</span><input value="${escapeHtml(tipoLabel[item.tipo] || item.tipo || "")}" disabled style="opacity:.6;cursor:not-allowed;"></label>
                <label class="edit-field"><span>Marca</span><input name="marca" value="${escapeHtml(item.marca || "")}"></label>
                <label class="edit-field"><span>Modelo</span><input name="modelo" value="${escapeHtml(item.modelo || "")}"></label>
                <label class="edit-field"><span>Número de serie</span><input name="sn" value="${escapeHtml(item.numeroSerie || "")}"></label>
                <label class="edit-field"><span>Custodio</span>
                    <select name="id_custodio_actual"><option value="">-- Sin custodio --</option>${opcionesCustodio}</select>
                </label>
                <label class="edit-field"><span>Edificio</span><input name="ubicacion_edificio" value="${escapeHtml(item.ubicacionEdificio || "")}"></label>
                <label class="edit-field"><span>Piso</span><input name="ubicacion_piso" value="${escapeHtml(item.ubicacionPiso || "")}"></label>
                <label class="edit-field" style="grid-column:span 2;"><span>Dirección / Área</span><input name="ubicacion_direccion" value="${escapeHtml(item.ubicacionDireccion || "")}"></label>
                <label class="edit-field" style="grid-column:span 2;"><span>Detalle</span><textarea name="observacion" rows="2">${escapeHtml(item.observacion || "")}</textarea></label>
            </div>`;

        openModal(`Editar equipo #${idEquipo} — ${(item.tipo || "").toUpperCase()}`, bodyHtml, [
            {
                label: "Guardar cambios", className: "btn btn-primary", onClick: async () => {
                    const grid = document.getElementById("editFormGrid");
                    if (!grid) return;
                    const payload = {};
                    grid.querySelectorAll("input, select, textarea").forEach((el) => {
                        if (el.name) payload[el.name] = el.value;
                    });
                    try {
                        const r = await apiFetch(`/inventario/${item.tipo}/${idEquipo}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                        const p = await r.json();
                        if (!r.ok || !p.success) throw new Error(p.message || "Error al guardar");
                        const updated = p.data;
                        const idx = state.inventory.findIndex((i) => i.id === idEquipo);
                        if (idx !== -1) {
                            const prev = state.inventory[idx];
                            state.inventory[idx] = Object.assign(prev, {
                                descripcion: updated.descripcion ?? prev.descripcion,
                                codigoSbai: updated.codigoSbai ?? prev.codigoSbai,
                                codigoMegan: updated.codigoMegan ?? prev.codigoMegan,
                                marca: updated.marca ?? prev.marca,
                                modelo: updated.modelo ?? prev.modelo,
                                numeroSerie: updated.numeroSerie ?? prev.numeroSerie,
                                custodio: updated.custodio ?? prev.custodio,
                                ubicacion: updated.ubicacion ?? prev.ubicacion,
                                ubicacionEdificio: updated.ubicacionEdificio ?? prev.ubicacionEdificio,
                                ubicacionPiso: updated.ubicacionPiso ?? prev.ubicacionPiso,
                                ubicacionDireccion: updated.ubicacionDireccion ?? prev.ubicacionDireccion,
                                estado: normalizeState(updated.estado ?? prev.estado),
                                observacion: updated.observacion ?? prev.observacion,
                                raw: updated
                            });
                            applyInventoryFilters();
                        }
                        showToast("Guardado", "Equipo actualizado correctamente.", "success");
                        closeModal();
                    } catch (err) {
                        showToast("Error", err.message, "danger");
                    }
                }
            },
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal }
        ]);

        // Pre-seleccionar custodio actual
        const selCustodio = document.querySelector('#editFormGrid select[name="id_custodio_actual"]');
        if (selCustodio) {
            const match = custodios.find((c) => c.nombre === item.custodio);
            if (match) selCustodio.value = match.id;
        }
    }

    async function abrirModalCustodio(idEquipo) {
        return abrirModalEditar(idEquipo);
    }

    async function abrirModalEditar(idEquipo) {
        const item = state.inventory.find((i) => i.id === idEquipo);
        if (!item) { showToast("Error", "Equipo no encontrado en el inventario cargado.", "danger"); return; }

        try {
            if (!state.equipmentFieldCatalog || !Object.keys(state.equipmentFieldCatalog).length) {
                await loadEquipmentFieldCatalog();
            }

            const categoryConfig = state.equipmentFieldCatalog[item.tipo];
            if (!categoryConfig) {
                throw new Error("No se pudo cargar la definicion del formulario para este tipo de equipo.");
            }

            const detailResponse = await apiFetch(`/inventario/${idEquipo}/edicion`);
            const detailPayload = await detailResponse.json();
            if (!detailResponse.ok || !detailPayload.success) {
                throw new Error(detailPayload.message || "No se pudo cargar la informacion completa del equipo.");
            }

            const editValues = detailPayload.data || {};
            const fields = Array.isArray(categoryConfig.fields) ? categoryConfig.fields : [];
            const bodyHtml = `
                <div class="helper-banner" style="margin-bottom:16px;">Rol administrativo con edicion completa habilitada para todos los campos del formulario.</div>
                <form id="editEquipmentForm">
                    <div class="form-grid" id="editFormGrid">${renderDynamicDbEditFieldGroups(fields, editValues)}</div>
                </form>`;

            openModal(`Editar equipo #${idEquipo} - ${(categoryConfig.label || item.tipo || "").toUpperCase()}`, bodyHtml, [
                {
                    label: "Guardar cambios", className: "btn btn-primary", onClick: async () => {
                        const form = document.getElementById("editEquipmentForm");
                        if (!form) return;
                        const payload = collectEquipmentFormPayload(form);
                        try {
                            const r = await apiFetch(`/inventario/${item.tipo}/${idEquipo}`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(payload)
                            });
                            const p = await r.json();
                            if (!r.ok || !p.success) throw new Error(p.message || "Error al guardar");
                            showUpdatedInventoryRow(p.data);
                            showToast("Guardado", "Equipo actualizado correctamente.", "success");
                            closeModal();
                        } catch (err) {
                            showToast("Error", err.message, "danger");
                        }
                    }
                },
                { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal }
            ]);

            setupEditEquipmentAutocompletes();
        } catch (error) {
            showToast("Error", error.message || "No se pudo abrir el editor completo.", "danger");
        }
    }

    async function abrirModalCustodio(idEquipo) {
        const item = state.inventory.find((i) => i.id === idEquipo);
        if (!item) {
            showToast("Error", "Equipo no encontrado en el inventario cargado.", "danger");
            return;
        }
        return openCustodioEditor(item);
    }

    async function abrirModalEstado(idEquipo, estadoActual) {
        const opcionesEstado = VALID_STATES.map((s) => `<option value="${s}" ${s === estadoActual ? "selected" : ""}>${s}</option>`).join("");
        openModal("Cambiar Estado", `
            <div class="field-group">
                <label for="estadoSelect">Nuevo estado</label>
                <select id="estadoSelect" style="width:100%;padding:10px;border-radius:10px;border:1px solid #dce7f3;">${opcionesEstado}</select>
            </div>
        `, [
            {
                label: "Guardar", className: "btn btn-primary", onClick: async () => {
                    const nuevoEstado = document.getElementById("estadoSelect").value;
                    try {
                        const r = await apiFetch(`/inventario/${idEquipo}/estado`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ estado: nuevoEstado })
                        });
                        const p = await r.json();
                        if (!r.ok || !p.success) throw new Error(p.message || "Error al actualizar");
                        const idx = state.inventory.findIndex((i) => i.id === idEquipo);
                        if (idx !== -1) {
                            state.inventory[idx].estado = normalizeState(nuevoEstado);
                            applyInventoryFilters();
                        }
                        showToast("Listo", "Estado actualizado correctamente.", "success");
                        closeModal();
                    } catch (err) {
                        showToast("Error", err.message, "danger");
                    }
                }
            },
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal }
        ]);
    }

    async function abrirModalHistorial(idEquipo) {
        openModal("Historial del Equipo", `<div id="historialContent" style="min-height:80px;"><p style="color:#61708a;padding:16px;">Cargando historial...</p></div>`, [
            { label: "Cerrar", className: "btn btn-secondary", onClick: closeModal }
        ]);
        try {
            const res = await apiFetch(`/inventario/${idEquipo}/historial`);
            const payload = await res.json();
            const historial = Array.isArray(payload.data) ? payload.data : [];
            const container = document.getElementById("historialContent");
            if (!historial.length) {
                container.innerHTML = `<p style="color:#61708a;text-align:center;padding:24px;">Sin registros de historial para este equipo.</p>`;
                return;
            }
            container.innerHTML = renderHistoryVersionCards(historial);
            return;
            container.innerHTML = `
                <div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;font-size:13px;">
                        <thead>
                            <tr style="background:#eef4fb;">
                                <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #dce7f3;white-space:nowrap;">Acción</th>
                                <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #dce7f3;">Datos anteriores</th>
                                <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #dce7f3;">Datos actualizados</th>
                                <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #dce7f3;white-space:nowrap;">Registrado por</th>
                                <th style="padding:9px 10px;text-align:left;border-bottom:2px solid #dce7f3;white-space:nowrap;">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historial.map((h) => {
                                const ant = h.valorAnterior && h.valorAnterior !== "?" ? escapeHtml(h.valorAnterior) : "—";
                                const nvo = h.valorNuevo && h.valorNuevo !== "?" ? escapeHtml(h.valorNuevo) : "—";
                                const rol = escapeHtml(h.rol || "ADMINISTRADOR");
                                const usuario = escapeHtml(h.usuario || "-");
                                const fecha = h.fecha ? new Date(h.fecha).toLocaleString("es-EC") : "-";
                                return `<tr style="border-bottom:1px solid #f0f4fa;">
                                    <td style="padding:8px 10px;white-space:nowrap;font-weight:500;">${escapeHtml(h.accion || "-")}</td>
                                    <td style="padding:8px 10px;"><span style="background:#fff3cd;border-radius:4px;padding:2px 6px;">${ant}</span></td>
                                    <td style="padding:8px 10px;"><span style="background:#d4edda;border-radius:4px;padding:2px 6px;font-weight:600;color:#155724;">${nvo}</span></td>
                                    <td style="padding:8px 10px;white-space:nowrap;"><span style="font-size:11px;background:#e8f0fe;color:var(--primary);border-radius:4px;padding:2px 6px;font-weight:600;">${rol}</span><br><span style="color:#61708a;font-size:12px;">${usuario}</span></td>
                                    <td style="padding:8px 10px;white-space:nowrap;color:#61708a;">${fecha}</td>
                                </tr>`;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            document.getElementById("historialContent").innerHTML = `<p style="color:red;padding:12px;">Error: ${escapeHtml(e.message)}</p>`;
        }
    }

    if (typeof window !== "undefined") {
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.showToast = showToast;
        window.formatDate = formatDate;
        window.abrirModalEditar = abrirModalEditar;
        window.abrirModalCustodio = abrirModalCustodio;
        window.abrirModalEstado = abrirModalEstado;
        window.abrirModalHistorial = abrirModalHistorial;
    }
})();
