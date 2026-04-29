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
    const PAGE_SIZE = 10;
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
        "nuevo-equipo": iconMarkup("plusBox")
    };
    const INVENTORY_AUTOCOMPLETE = {
        filterCodigoSbai: "codigoSbai",
        filterCodigoMegan: "codigoMegan",
        filterDescripcion: "descripcion",
        filterMarca: "marca",
        filterModelo: "modelo",
        filterSerie: "numeroSerie",
        filterCustodio: "custodio",
        filterUbicacion: "ubicacion"
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
        return {
            username: data.usuario || data.username || "usuario",
            displayName: data.nombreCompleto || data.usuario || "Usuario",
            role: rol === "ADMINISTRADOR" ? "admin" : "usuario",
            roleLabel: rol === "ADMINISTRADOR" ? "Administrador" : "Usuario técnico"
        };
    }

    function redirectForRole(session) {
        const target = session.role === "admin" ? `${basePrefix}/pages/dashboard.html` : `${basePrefix}/pages/usuario/dashboard.html`;
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
        submit.disabled = true;
        hideLoginError();
        try {
            const response = await apiFetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
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
            return { username: "admin", displayName: "admin", role: "admin", roleLabel: "Administrador" };
        }
        if ((username === "tecnico" || username === "usuario") && password === "tecnico123") {
            return { username: "tecnico", displayName: "tecnico", role: "usuario", roleLabel: "Usuario técnico" };
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
                            <span>${role === "admin" ? "Panel administrativo" : "Panel técnico"}</span>
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
        const nav = role === "admin"
            ? [
                ["dashboard", "Dashboard", `${basePrefix}/pages/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Búsqueda", `${basePrefix}/pages/busqueda.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`]
            ]
            : [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Búsqueda", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
        return nav
            .filter(([key]) => key !== "busqueda")
            .map(([key, label, href]) => `<a href="${href}" class="${key === page ? "is-active" : ""}"><span>•</span><span>${label}</span></a>`)
            .join("");
    }

    function pageTitle(pageName) {
        const titles = {
            dashboard: "Bienvenido",
            inventario: "Inventario",
            busqueda: "Búsqueda avanzada",
            "nuevo-equipo": "Nuevo equipo"
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
        const cards = role === "admin"
            ? [
                ["Inventario", "Filtra, revisa y exporta el inventario visible.", `${basePrefix}/pages/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["Búsqueda", "Aplica múltiples criterios sobre la data cargada.", `${basePrefix}/pages/busqueda.html`],
                ["Nuevo Equipo", "Formulario dinámico de registro simulado.", `${basePrefix}/pages/nuevo-equipo.html`]
            ]
            : [
                ["Inventario", "Filtra, revisa y exporta el inventario visible.", `${basePrefix}/pages/usuario/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["Búsqueda", "Aplica múltiples criterios sobre la data cargada.", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
        return cards
            .filter(([title]) => title !== "Búsqueda")
            .map(([title, text, href]) => `<a class="mini-card" href="${href}"><strong>${title}</strong><span>${text}</span></a>`);
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
                        <label for="filterUbicacion">Ubicación</label>
                        <input id="filterUbicacion" type="text" placeholder="Filtrar por ubicación">
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
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
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
                        <div class="helper-banner" id="equipmentCategoryHint"></div>
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
    }

    async function loadInitialData() {
        if (page === "dashboard" || page === "inventario" || page === "busqueda") {
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
            estado: normalizeState(item.estado || ""),
            procesador: item.procesador || "",
            caracteristicas: item.caracteristicas || "",
            observacion: item.observacion || "",
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
        document.getElementById("exportInventoryExcel")?.addEventListener("click", exportInventoryToExcel);
        document.getElementById("exportInventoryPdf")?.addEventListener("click", exportInventoryToPdf);
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
            "filterUbicacion",
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
            ubicacion: document.getElementById("filterUbicacion")?.value.trim().toLowerCase() || "",
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
                && matchesFilter(item.ubicacion, filters.ubicacion)
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
                <td>${escapeHtml(item.ubicacion || "-")}</td>
                <td>${escapeHtml(item.procesador || item.caracteristicas || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
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
        const header = ["Código SBYE", "Código Megan", "Descripción", "Tipo", "Marca", "Modelo", "Serie", "Custodio", "Ubicación", "Detalle", "Estado"];
        const bodyRows = rows.map((item) => [
            item.codigoSbai,
            item.codigoMegan,
            item.descripcion,
            displayInventoryType(item),
            item.marca,
            item.modelo,
            item.numeroSerie,
            item.custodio,
            item.ubicacion,
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

    function openModal(title, bodyHtml, actions) {
        const modalRoot = document.getElementById("modalRoot");
        modalRoot.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal">
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

    function buildNav() {
        const nav = role === "admin"
            ? [
                ["dashboard", "Dashboard", `${basePrefix}/pages/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Búsqueda", `${basePrefix}/pages/busqueda.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`]
            ]
            : [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Búsqueda", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
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
                        <div class="hero-pills">
                            <span class="hero-pill">Inventario operativo</span>
                            <span class="hero-pill">Filtros con sugerencias</span>
                            <span class="hero-pill">Exportación inmediata</span>
                        </div>
                    </div>
                    <div class="hero-panel">
                        <div class="hero-panel__label">Vista rápida</div>
                        <div class="stats-grid stats-grid--compact">
                            <article class="stat-card"><span>Total cargado</span><strong id="statTotal">--</strong></article>
                            <article class="stat-card"><span>Operativos</span><strong id="statActive">--</strong></article>
                            <article class="stat-card"><span>Ubicaciones</span><strong id="statLocations">--</strong></article>
                            <article class="stat-card"><span>Rol activo</span><strong>${role === "admin" ? "Admin" : "Técnico"}</strong></article>
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
                    ${renderAutocompleteField("filterUbicacion", "Ubicación", "Filtrar por ubicación")}
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
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
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
        if (page === "dashboard" || page === "inventario" || page === "busqueda") {
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
        document.getElementById("exportInventoryExcel")?.addEventListener("click", exportInventoryToExcel);
        document.getElementById("exportInventoryPdf")?.addEventListener("click", exportInventoryToPdf);
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
            "nuevo-equipo": "Formulario preparado con los campos definidos en la base de datos."
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
                    ${renderAutocompleteField("filterUbicacion", "Ubicacion", "Filtrar por ubicacion")}
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
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacion", "procesador", "estado"].map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("")}
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
        if (page === "dashboard" || page === "inventario" || page === "busqueda") {
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
        const title = isPdf ? "Exportar PDF" : "Exportar Excel";

        openModal(
            title,
            `
                <div class="field-group">
                    <label>Campos a exportar</label>
                    <div class="toolbar" style="margin-top:8px;">
                        <button class="btn btn-secondary" type="button" id="exportSelectAll">Todos</button>
                        <button class="btn btn-secondary" type="button" id="exportSelectNone">Ninguno</button>
                    </div>
                    <div style="margin-top:10px; max-height: 260px; overflow:auto; border:1px solid rgba(22,50,79,0.15); padding:10px; border-radius:6px;">
                        ${INVENTORY_EXPORT_COLUMNS.map((col) => `
                            <label style="display:flex; align-items:center; gap:10px; padding:6px 2px;">
                                <input type="checkbox" data-export-col="${escapeHtml(col.key)}" ${selected.has(col.key) ? "checked" : ""}>
                                <span>${escapeHtml(col.label)}</span>
                            </label>
                        `).join("")}
                    </div>
                    <small class="helper-text">Se exportan solo los registros filtrados actualmente.</small>
                </div>
            `,
            [
                { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
                {
                    label: "Exportar",
                    className: "btn btn-primary",
                    onClick: () => {
                        const keys = readSelectedExportKeys();
                        state.exportSelection = { keys };
                        if (!keys.length) {
                            showToast("Seleccione campos", "Debe seleccionar al menos un campo para exportar.", "info");
                            return;
                        }
                        closeModal();
                        if (isPdf) {
                            exportInventoryToPdf(keys);
                        } else {
                            exportInventoryToExcel(keys);
                        }
                    }
                }
            ]
        );

        document.getElementById("exportSelectAll")?.addEventListener("click", () => {
            setAllExportCheckboxes(true);
        });
        document.getElementById("exportSelectNone")?.addEventListener("click", () => {
            setAllExportCheckboxes(false);
        });
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
                        body { font-family: Calibri, Arial, sans-serif; color: #16324f; margin: 24px; }
                        .sheet-header { margin-bottom: 18px; }
                        .sheet-header h1 { margin: 0 0 4px; font-size: 22px; }
                        .sheet-header p { margin: 2px 0; font-size: 12px; color: #4d6480; }
                        table { width: 100%; border-collapse: collapse; }
                        th { background: #d9e8f6; color: #16324f; font-weight: 700; border: 1px solid #9eb6ce; padding: 9px 8px; text-align: left; }
                        td { border: 1px solid #c7d6e5; padding: 8px; vertical-align: top; }
                        tbody tr:nth-child(even) { background: #f7fbff; }
                    </style>
                </head>
                <body>
                    <div class="sheet-header">
                        <h1>Reporte de Inventario Filtrado</h1>
                        <p>Sistema de Inventario DTIC</p>
                        <p>Fecha de emision: ${escapeHtml(generatedAt)}</p>
                        <p>Total exportado: ${rows.length}</p>
                    </div>
                    <table>
                        <thead><tr>${header.map((cell) => `<th>${escapeHtml(cell)}</th>`).join("")}</tr></thead>
                        <tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell || "")}</td>`).join("")}</tr>`).join("")}</tbody>
                    </table>
                </body>
            </html>`;
        downloadBlob(new Blob([`\ufeff${documentHtml}`], { type: "application/vnd.ms-excel" }), `reporte_inventario_${timestampForFile()}.xls`);
    }

    function exportInventoryToPdf(keys) {
        const rows = state.filteredInventory;
        if (!rows.length) {
            showToast("Sin datos", "No hay resultados filtrados para exportar.", "info");
            return;
        }
        downloadBlob(buildInventoryPdfBlob(rows, keys), `reporte_inventario_${timestampForFile()}.pdf`);
    }

    function buildInventoryPdfBlob(rows, keys) {
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
            permissions
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
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`]
            ];
        } else if (roleName === "custodio") {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/custodio/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/custodio/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Busqueda", `${basePrefix}/pages/custodio/busqueda.html`]
            ];
        } else {
            nav = [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`],
                // COMENTADO: redundante con filtros del módulo de inventario
                // ["busqueda", "Busqueda", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
        }

        return nav
            .filter(([key]) => key !== "busqueda")
            .map(([key, label, href]) => `
                <a href="${href}" class="${key === page ? "is-active" : ""}">
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
            "nuevo-equipo": "Formulario preparado con los campos definidos en la base de datos."
        };
        return descriptions[pageName] || "";
    }

    function canEditCustodio() {
        return Boolean(state.session?.permissions?.puedeEditarCustodio);
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
                    ${renderAutocompleteField("filterUbicacion", "Ubicacion", "Filtrar por ubicacion")}
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
                                ${["codigoSbai", "codigoMegan", "descripcion", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacion", "procesador", "estado"]
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
        if (canEditCustodio()) {
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
                <td>${escapeHtml(item.ubicacion || "-")}</td>
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
            await openCustodioEditor(item);
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
            const custodiosIniciales = await loadCustodios(null, 120);
            if (!custodiosIniciales.length) {
                showToast("Sin custodios", "No hay custodios disponibles para asignar.", "info");
                return;
            }
            openModal(
                `Editar custodio (${escapeHtml(item.codigoSbai || item.id)})`,
                `
                    <div class="field-group">
                        <label for="custodioSearchInput">Buscar custodio</label>
                        <input id="custodioSearchInput" type="text" autocomplete="off" placeholder="Escriba para filtrar por nombre o usuario">
                        <small class="helper-text">Selecciona un custodio existente para asociarlo al equipo.</small>
                    </div>
                    <div class="field-group">
                        <label for="nuevoCustodioSelect">Custodio</label>
                        <select id="nuevoCustodioSelect" size="10"></select>
                        <small id="custodioSearchMeta" class="helper-text"></small>
                    </div>
                    <p class="muted">Custodio actual: ${escapeHtml(item.custodio || "-")}</p>
                `,
                [
                    { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
                    {
                        label: "Guardar",
                        className: "btn btn-primary",
                        onClick: async () => {
                            const select = document.getElementById("nuevoCustodioSelect");
                            const idCustodio = Number(select?.value || 0);
                            if (!idCustodio) {
                                showToast("Dato invalido", "Seleccione un custodio valido.", "danger");
                                return;
                            }
                            await saveCustodioChange(item, idCustodio);
                        }
                    }
                ]
            );

            const select = document.getElementById("nuevoCustodioSelect");
            const search = document.getElementById("custodioSearchInput");
            const meta = document.getElementById("custodioSearchMeta");

            if (!select) {
                return;
            }

            const nombreActual = String(item.custodio || "").trim().toLowerCase();
            const renderOptions = (list) => {
                const previous = Number(select.value || 0);
                select.innerHTML = list
                    .map((custodio) => {
                        const nombre = String(custodio?.nombre || "");
                        const username = String(custodio?.username || "").trim();
                        const label = username ? `${nombre} (${username})` : nombre;
                        return `<option value="${custodio.id}">${escapeHtml(label)}</option>`;
                    })
                    .join("");

                if (meta) {
                    meta.textContent = `${list.length} coincidencias`;
                }

                if (previous && list.some((custodio) => Number(custodio.id) === previous)) {
                    select.value = String(previous);
                    return;
                }

                if (nombreActual) {
                    const match = list.find((custodio) => String(custodio?.nombre || "").trim().toLowerCase() === nombreActual);
                    if (match) {
                        select.value = String(match.id);
                        return;
                    }
                }

                if (list.length) {
                    select.value = String(list[0].id);
                }
            };

            renderOptions(custodiosIniciales);

            if (!search) {
                return;
            }

            let debounceId;
            const runSearch = async () => {
                const term = search.value.trim();
                const resultados = await loadCustodios(term, 120);
                renderOptions(resultados);
            };

            search.addEventListener("input", () => {
                window.clearTimeout(debounceId);
                debounceId = window.setTimeout(() => {
                    runSearch().catch((error) => {
                        showToast("Error", error.message || "No se pudo buscar custodios.", "danger");
                    });
                }, 250);
            });
        } catch (error) {
            showToast("Error", error.message || "No se pudo abrir la edicion de custodio.", "danger");
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
            await loadInventory();
            applyInventoryFilters();
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
            await loadInventory();
            applyInventoryFilters();
            showToast("Estado actualizado", "El estado del equipo fue actualizado.", "success");
        } catch (error) {
            showToast("Error", error.message || "No se pudo guardar el estado.", "danger");
        }
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
                ? historial.map((registro) => `
                    <article class="report-history__item">
                        <strong>${escapeHtml(registro.accion || "Cambio")}</strong>
                        <div class="muted">Usuario: ${escapeHtml(registro.usuario || "-")} | Rol: ${escapeHtml(registro.rol || "-")}</div>
                        <div class="muted">Anterior: ${escapeHtml(registro.valorAnterior || "-")}</div>
                        <div class="muted">Nuevo: ${escapeHtml(registro.valorNuevo || "-")}</div>
                        <div class="muted">Fecha: ${escapeHtml(formatDate(registro.fecha))}</div>
                    </article>
                `).join("")
                : '<p class="muted">No hay historial registrado para este equipo.</p>';

            openModal(
                `Historial del equipo ${escapeHtml(item.codigoSbai || item.id)}`,
                `<div class="report-history">${bodyHtml}</div>`,
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

    if (typeof window !== "undefined") {
        window.openModal = openModal;
        window.closeModal = closeModal;
        window.showToast = showToast;
        window.formatDate = formatDate;
    }
})();
