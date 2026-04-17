(function () {
    const body = document.body;
    const page = body.dataset.page || "login";
    const role = body.dataset.role || null;
    const currentPath = window.location.pathname;
    const isUserRole = role === "usuario";
    const pathDepth = currentPath.split("/").filter(Boolean).length;
    const basePrefix = page === "login" || pathDepth <= 2 ? "." : (isUserRole ? "../.." : "..");
    const API_BASE = `${basePrefix}/resources`;
    const STORAGE_SESSION = "inventario.session.demo";
    const STORAGE_REPORTS = "inventario.reports.recent";
    const PAGE_SIZE = 10;
    const state = {
        session: null,
        inventory: [],
        filteredInventory: [],
        inventoryPage: 1,
        inventorySort: { key: "codigoSbai", direction: "asc" },
        searchCriteria: [],
        searchResults: [],
        recentReports: [],
        sidebarOpen: false,
        visibleColumns: [],
    };

    const CATEGORY_CONFIG = {
        laptops: {
            label: "Laptop",
            hint: "Equipo portatil para trabajo administrativo o tecnico.",
            fields: ["procesador", "ram", "discoDuro", "sistemaOperativo", "numeroSerie", "ip"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "ip", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "procesador", "ram", "discoDuro", "sistemaOperativo", "estado", "observacion"]
        },
        desktop: {
            label: "Desktop",
            hint: "Estacion fija con foco en rendimiento de oficina o laboratorio.",
            fields: ["procesador", "ram", "discoDuro", "sistemaOperativo", "numeroSerie", "ip"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "ip", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "procesador", "ram", "discoDuro", "sistemaOperativo", "estado", "observacion"]
        },
        telefonos: {
            label: "Telefonos",
            hint: "Terminal telefonica o movil asignada a un custodio o dependencia.",
            fields: ["numeroSerie", "caracteristicas"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "caracteristicas", "estado", "observacion"]
        },
        escaners: {
            label: "Escanners",
            hint: "Equipo de digitalizacion con datos de resolucion y conexion.",
            fields: ["numeroSerie", "caracteristicas"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "caracteristicas", "estado", "observacion"]
        },
        impresoras: {
            label: "Impresoras",
            hint: "Equipo de impresion con tecnologia y tipo de conexion.",
            fields: ["numeroSerie", "ip", "caracteristicas"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "ip", "caracteristicas", "estado", "observacion"]
        },
        proyectores: {
            label: "Proyectores",
            hint: "Equipo audiovisual con datos de resolucion y brillo.",
            fields: ["numeroSerie", "caracteristicas", "actaUgdt", "actaUgad", "anotaciones"],
            columns: ["codigoSbaiOriginal", "codigoMegan", "descripcion", "marca", "modelo", "numeroSerie", "custodio", "custodioAnterior", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "caracteristicas", "estado", "observacion", "actaUgdt", "actaUgad", "anotaciones"]
        }
    };

    const INVENTORY_QUICK_FILTERS = [
        { label: "Solo operativos", type: "status", value: "OPERATIVO" },
        { label: "Solo desktop", type: "type", value: "pcs" },
        { label: "Solo laptop", type: "type", value: "laptops" },
        { label: "Solo telefonos", type: "type", value: "telefonos" },
        { label: "Solo impresoras", type: "type", value: "impresoras" },
        { label: "Limpiar filtros", type: "reset", value: "" }
    ];

    const SEARCH_QUICK_PRESETS = [
        { label: "Operativos", criteria: [{ field: "estado", value: "OPERATIVO" }] },
        { label: "No operativos", criteria: [{ field: "estado", value: "NO OPERATIVO" }] },
        { label: "Dell", criteria: [{ field: "marca", value: "Dell" }] },
        { label: "Intel", criteria: [{ field: "procesador", value: "Intel" }] }
    ];

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
            roleLabel: rol === "ADMINISTRADOR" ? "Administrador" : "Usuario técnico",
            permissions: data.permisos || {}
        };
    }

    function redirectForRole(session) {
        const target = session.role === "admin" ? `${basePrefix}/pages/dashboard.html` : `${basePrefix}/pages/usuario/dashboard.html`;
        window.location.href = target.replace("/pages/pages/", "/pages/");
    }

    function initLogin() {
        startClock();
        document.getElementById("loginForm")?.addEventListener("submit", handleLogin);
        restoreDemoLoginSession();
    }

    function restoreDemoLoginSession() {
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
            return { username: "admin", displayName: "admin", role: "admin", roleLabel: "Administrador", permissions: {} };
        }
        if ((username === "tecnico" || username === "usuario") && password === "tecnico123") {
            return { username: "tecnico", displayName: "tecnico", role: "usuario", roleLabel: "Usuario técnico", permissions: {} };
        }
        return null;
    }

    function showLoginError(message) {
        const error = document.getElementById("loginError");
        error.textContent = message;
        error.classList.remove("is-hidden");
        document.querySelector(".login-card")?.classList.add("shake");
        setTimeout(() => document.querySelector(".login-card")?.classList.remove("shake"), 400);
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
            dateEl.textContent = now.toLocaleDateString("es-EC", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
            clockEl.textContent = now.toLocaleTimeString("es-EC");
        };
        refresh();
        setInterval(refresh, 1000);
    }

    async function initShell() {
        state.recentReports = loadRecentReports();
        state.session = await resolveSession();
        if (!state.session) {
            window.location.href = `${basePrefix}/index.html`.replace("/pages/index.html", "/index.html");
            return;
        }
        if (state.session.role !== role) {
            redirectForRole(state.session);
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
                            <button class="topbar__toggle" id="sidebarToggle"><i class="fas fa-bars"></i></button>
                            <div class="topbar__title">
                                <h1>${pageTitle(page)}</h1>
                                <p>${pageDescription(page, role)}</p>
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
                ["busqueda", "Busqueda", `${basePrefix}/pages/busqueda.html`],
                ["nuevo-equipo", "Nuevo Equipo", `${basePrefix}/pages/nuevo-equipo.html`]
            ]
            : [
                ["dashboard", "Dashboard", `${basePrefix}/pages/usuario/dashboard.html`],
                ["inventario", "Inventario", `${basePrefix}/pages/usuario/inventario.html`],
                ["busqueda", "Busqueda", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
        return nav.map(([key, label, href]) => `<a href="${href}" class="${key === page ? "is-active" : ""}"><span>•</span><span>${label}</span></a>`).join("");
    }

    function pageTitle(pageName) {
        const titles = {
            dashboard: "Bienvenido",
            inventario: "Inventario completo",
            busqueda: "Busqueda avanzada",
            "nuevo-equipo": "Nuevo equipo"
        };
        return titles[pageName] || "Sistema de Inventario";
    }

    function pageDescription(pageName, currentRole) {
        const descriptions = {
            dashboard: currentRole === "admin" ? "Accesos rapidos y vista general del sistema." : "Accesos directos para consulta y reportes.",
            inventario: currentRole === "admin" ? "Filtro, edicion, historico y cambio de estado." : "Consulta completa con edicion limitada de custodio.",
            busqueda: "Busqueda multi-criterio client-side con tags.",
            "nuevo-equipo": "Formulario dinamico por categoria con guardado simulado."
        };
        return descriptions[pageName] || "";
    }

    function renderPage() {
        if (page === "dashboard") { return renderDashboard(); }
        if (page === "inventario") { return renderInventoryPage(); }
        if (page === "busqueda") { return renderSearchPage(); }
        if (page === "nuevo-equipo") { return renderNewEquipmentPage(); }
        return "";
    }

    function renderDashboard() {
        return `
            <section class="hero">
                <div class="hero__grid">
                    <div>
                        <h2>${role === "admin" ? "Control centralizado del inventario institucional." : "Consulta técnica del inventario institucional."}</h2>
                        <p>${role === "admin"
                            ? "Gestiona equipos, revisa cambios recientes y entra directo a registro, búsqueda o reportes."
                            : "Accede al inventario, aplica búsquedas avanzadas y descarga reportes con una interfaz verde dedicada al rol técnico."}</p>
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
                    <h2>Accesos rapidos</h2>
                    <p>${role === "admin" ? "Nuevo Equipo, Busqueda y Exportar." : "Ver Inventario, Busqueda y Exportar."}</p>
                </div>
            </div>
            <section class="quick-grid">${dashboardCards().join("")}</section>
        `;
    }

    function dashboardCards() {
        const cards = role === "admin"
            ? [
                ["Nuevo Equipo", "Registrar equipos por categoria con formulario dinamico.", `${basePrefix}/pages/nuevo-equipo.html`],
                ["Busqueda", "Filtrar por codigo, custodio, ubicacion, estado o procesador.", `${basePrefix}/pages/busqueda.html`]
            ]
            : [
                ["Ver Inventario", "Consultar el inventario y actualizar solo custodio.", `${basePrefix}/pages/usuario/inventario.html`],
                ["Busqueda", "Aplicar criterios multiples y revisar resultados sin acciones.", `${basePrefix}/pages/usuario/busqueda.html`]
            ];
        return cards.map(([title, text, href]) => `<a class="mini-card" href="${href}"><strong>${title}</strong><span>${text}</span></a>`);
    }

    function renderInventoryPage() {
        return `
            <section class="panel">
                <div class="stats-grid" id="inventoryStats">
                    <article class="stat-card"><span>Total</span><strong id="inventoryStatTotal">--</strong></article>
                    <article class="stat-card"><span>Operativos</span><strong id="inventoryStatActive">--</strong></article>
                    <article class="stat-card"><span>No operativos</span><strong id="inventoryStatInactive">--</strong></article>
                    <article class="stat-card"><span>Baja</span><strong id="inventoryStatLow">--</strong></article>
                </div>
                <div class="filters-grid">
                    <div class="field-group">
                        <label for="filterStatus">Estado</label>
                        <select id="filterStatus">
                            <option value="">Todos</option>
                            <option value="OPERATIVO">OPERATIVO</option>
                            <option value="NO OPERATIVO">NO OPERATIVO</option>
                            <option value="REPORTADO PARA DAR DE BAJA">REPORTADO PARA DAR DE BAJA</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label for="filterLocation">Ubicacion</label>
                        <input id="filterLocation" type="text" placeholder="Edificio, piso o detalle">
                    </div>
                    <div class="field-group">
                        <label for="filterType">Categoria</label>
                        <select id="filterType">
                            <option value="">Todas</option>
                            <option value="pcs">Desktop</option>
                            <option value="laptops">Laptop</option>
                            <option value="telefonos">Telefonos</option>
                            <option value="escaners">Escanners</option>
                            <option value="impresoras">Impresoras</option>
                            <option value="proyectores">Proyectores</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label>&nbsp;</label>
                        <div class="toolbar">
                            <button class="btn btn-secondary" id="columnSelectorBtn" type="button"><i class="fas fa-columns"></i> Columnas</button>
                            <button class="btn btn-primary" id="exportBtn" type="button"><i class="fas fa-file-export"></i> Exportar</button>
                        </div>
                    </div>
                </div>
                <div id="columnSelectorPanel" class="column-selector-panel hidden">
                    <div class="column-selector-grid" id="columnSelectorGrid"></div>
                </div>
                <div class="search-tags" id="inventoryQuickFilters">
                    ${INVENTORY_QUICK_FILTERS.map((item) => `<button class="search-tag search-tag--button" type="button" data-quick-filter="${item.type}" data-value="${item.value}">${item.label}</button>`).join("")}
                </div>
                ${role === "usuario" ? '<div class="helper-banner">Como usuario tecnico, solo puede modificar el campo Actual Custodio.</div>' : ""}
                <div id="inventoryMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr id="inventoryHeaderRow"></tr>
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
        const criteriaOptions = ["codigoMegan", "codigoSbai", "numeroSerie", "marca", "modelo", "custodio", "ubicacion", "estado", "procesador"];
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
                                <th>Numero de Serie</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th>Custodio</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                                <th>Procesador</th>
                                ${role === "admin" ? "<th>Acciones</th>" : ""}
                            </tr>
                        </thead>
                        <tbody id="searchBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="searchMobile"></div>
                <div class="empty-state hidden" id="searchEmpty">Carga los datos y aplica uno o varios criterios para filtrar en cliente.</div>
            </section>
        `;
    }

    function renderReportsPage() {
        return `
            <section class="panel">
                <div class="stats-grid">
                    <article class="stat-card"><span>Registros elegibles</span><strong id="reportStatTotal">--</strong></article>
                    <article class="stat-card"><span>Desktop</span><strong id="reportStatPcs">--</strong></article>
                    <article class="stat-card"><span>Laptop</span><strong id="reportStatLaptops">--</strong></article>
                    <article class="stat-card"><span>Con criterio activo</span><strong id="reportStatFiltered">--</strong></article>
                </div>
                <div class="report-filters">
                    <div class="field-group">
                        <label for="reportFormat">Formato</label>
                        <select id="reportFormat">
                            <option value="pdf">PDF</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label for="reportScope">Cobertura</label>
                        <select id="reportScope">
                            <option value="completo">Completo</option>
                            <option value="pcs">Desktop</option>
                            <option value="laptops">Laptop</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label for="reportCriteria">Criterio</label>
                        <select id="reportCriteria">
                            <option value="codigos">Códigos</option>
                            <option value="marca">Marca</option>
                            <option value="modelo">Modelo</option>
                            <option value="custodio">Custodio</option>
                            <option value="caracteristicas">Características</option>
                            <option value="observaciones">Observaciones</option>
                            <option value="completo">Completo</option>
                        </select>
                    </div>
                    <div class="field-group">
                        <label for="reportValue">Valor opcional</label>
                        <input id="reportValue" type="text" placeholder="Filtro informativo">
                    </div>
                </div>
                <div class="helper-banner">${role === "admin"
                    ? "Admin puede generar salidas por criterio y revisar una vista previa antes de descargar."
                    : "Usuario técnico usa la misma generación de reportes y la descarga Excel sale por el API disponible."}</div>
                <div class="report-grid" style="margin-top:18px;">
                    <article class="report-card">
                        <strong>Generar PDF</strong>
                        <p class="muted">Prepara una vista imprimible con el criterio seleccionado.</p>
                        <button class="btn btn-primary" id="downloadPdf">Generar PDF</button>
                    </article>
                    <article class="report-card">
                        <strong>Generar Excel</strong>
                        <p class="muted">Usa el endpoint real disponible para descargas `.xlsx`.</p>
                        <button class="btn btn-success" id="downloadExcel">Generar Excel</button>
                    </article>
                </div>
                <div class="section-heading">
                    <div>
                        <h2>Vista previa</h2>
                        <p>Resumen dinámico de los equipos que entrarían en el reporte.</p>
                    </div>
                </div>
                <div id="reportPreviewMeta" class="search-results-meta"></div>
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Código</th>
                                <th>Marca</th>
                                <th>Modelo</th>
                                <th>Custodio</th>
                                <th>Ubicación</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody id="reportPreviewBody"></tbody>
                    </table>
                </div>
                <div class="mobile-cards" id="reportPreviewMobile"></div>
                <div class="section-heading">
                    <div>
                        <h2>Reportes recientes</h2>
                        <p>Se conservan en memoria local del navegador.</p>
                    </div>
                    <button class="btn btn-secondary" id="clearRecentReports">Limpiar recientes</button>
                </div>
                <div class="report-history" id="recentReports"></div>
            </section>
        `;
    }

    function renderNewEquipmentPage() {
        return `
            <section class="panel">
                <div class="split">
                    <div>
                        <div class="field-group">
                            <label for="equipmentCategory">Categoria</label>
                            <select id="equipmentCategory">
                                <option value="laptops">Laptop</option>
                                <option value="desktop">Desktop</option>
                                <option value="telefonos">Telefonos</option>
                                <option value="escaners">Escanners</option>
                                <option value="impresoras">Impresoras</option>
                                <option value="proyectores">Proyectores</option>
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
                        <p class="muted">Esta pantalla replica el frontend perdido: cambia dinámicamente por categoría y usa guardado simulado con setTimeout, sin conexión al API.</p>
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
            if (event.target.classList.contains("modal-backdrop")) { closeModal(); }
        });

        if (page === "inventario") { bindInventoryEvents(); }
        if (page === "busqueda") { bindSearchEvents(); }
        if (page === "nuevo-equipo") { bindNewEquipmentEvents(); }
    }

    async function loadInitialData() {
        if (page === "dashboard" || page === "inventario" || page === "busqueda") {
            await loadInventory();
            updateDashboardStats();
        }
        if (page === "inventario") {
            renderColumnSelector();
            renderInventory();
        }
        if (page === "busqueda") {
            renderSearchTags();
            renderSearchResults([]);
        }
        if (page === "nuevo-equipo") {
            renderDynamicFields(document.getElementById("equipmentCategory").value);
        }
    }

    async function loadInventory() {
        const [pcs, laptops, telefonos, escaners, impresoras, proyectores] = await Promise.all([
            fetchInventoryType("pcs"), fetchInventoryType("laptops"),
            fetchInventoryType("telefonos"), fetchInventoryType("escaners"),
            fetchInventoryType("impresoras"), fetchInventoryType("proyectores")
        ]);
        state.inventory = normalizeItems(pcs, "pcs")
            .concat(normalizeItems(laptops, "laptops"))
            .concat(normalizeItems(telefonos, "telefonos"))
            .concat(normalizeItems(escaners, "escaners"))
            .concat(normalizeItems(impresoras, "impresoras"))
            .concat(normalizeItems(proyectores, "proyectores"));
        state.filteredInventory = state.inventory.slice();
        // Initialize visible columns
        if (state.visibleColumns.length === 0) {
            state.visibleColumns = ["codigoSbai", "codigoMegan", "tipo", "marca", "modelo", "numeroSerie", "custodio", "ubicacionEdificio", "ubicacionPiso", "ubicacionDetalle", "estado"];
        }
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
            return [];
        }
    }

    function normalizeItems(items, type) {
        return items.map((item) => ({
            tipo: type,
            codigoSbai: item.codigoSbaiOriginal || item.codigoSbai || "",
            codigoSbaiOriginal: item.codigoSbaiOriginal || "",
            codigoMegan: item.codigoMegan || "",
            numeroSerie: item.numeroSerie || "",
            marca: item.marca || "",
            modelo: item.modelo || "",
            custodio: item.custodioActual?.nombre || "",
            custodioAnterior: item.custodioAnterior?.nombre || "",
            ubicacion: [item.ubicacion?.edificio, item.ubicacion?.piso, item.ubicacion?.detalle].filter(Boolean).join(" - "),
            ubicacionEdificio: item.ubicacion?.edificio || "",
            ubicacionPiso: item.ubicacion?.piso || "",
            ubicacionDetalle: item.ubicacion?.detalle || "",
            estado: item.estado || "OPERATIVO",
            procesador: item.procesador || "",
            ip: item.ip || "",
            observacion: item.observacion || "",
            caracteristicas: item.caracteristicas || "",
            ram: item.ram || "",
            discoDuro: item.discoDuro || "",
            sistemaOperativo: item.sistemaOperativo || "",
            actaUgdt: item.actaUgdt || "",
            actaUgad: item.actaUgad || "",
            anotaciones: item.anotaciones || "",
            descripcion: item.descripcion || "",
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
        ["filterStatus", "filterLocation", "filterType"].forEach((id) => {
            document.getElementById(id)?.addEventListener("input", applyInventoryFilters);
            document.getElementById(id)?.addEventListener("change", applyInventoryFilters);
        });
        document.getElementById("prevPage")?.addEventListener("click", () => changePage(-1));
        document.getElementById("nextPage")?.addEventListener("click", () => changePage(1));
        document.querySelectorAll("[data-quick-filter]").forEach((button) => button.addEventListener("click", () => applyQuickInventoryFilter(button.dataset.quickFilter, button.dataset.value)));
        document.getElementById("columnSelectorBtn")?.addEventListener("click", toggleColumnSelector);
        document.getElementById("exportBtn")?.addEventListener("click", showExportModal);
    }

    // ==================== COLUMN SELECTOR ====================

    const ALL_INVENTORY_COLUMNS = [
        "codigoSbai", "codigoMegan", "tipo", "descripcion", "ip", "marca", "modelo",
        "numeroSerie", "custodio", "custodioAnterior", "ubicacionEdificio", "ubicacionPiso",
        "ubicacionDetalle", "procesador", "ram", "discoDuro", "sistemaOperativo",
        "caracteristicas", "estado", "observacion", "actaUgdt", "actaUgad", "anotaciones"
    ];

    function renderColumnSelector() {
        const grid = document.getElementById("columnSelectorGrid");
        if (!grid) { return; }
        grid.innerHTML = ALL_INVENTORY_COLUMNS.map((col) => {
            const checked = state.visibleColumns.includes(col) ? "checked" : "";
            return `<label class="column-checkbox"><input type="checkbox" value="${col}" ${checked}><span>${labelForColumn(col)}</span></label>`;
        }).join("");
        grid.querySelectorAll("input[type=checkbox]").forEach((cb) => {
            cb.addEventListener("change", () => {
                state.visibleColumns = Array.from(grid.querySelectorAll("input:checked")).map((i) => i.value);
                renderInventory();
            });
        });
    }

    function toggleColumnSelector() {
        const panel = document.getElementById("columnSelectorPanel");
        if (panel) { panel.classList.toggle("hidden"); }
    }

    // ==================== EXPORT ====================

    function showExportModal() {
        openModal("Exportar inventario", `
            <div class="field-group">
                <label for="exportFormat">Formato</label>
                <select id="exportFormat">
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                </select>
            </div>
            <p class="muted">Se exportara la vista filtrada actual con ${state.filteredInventory.length} registros.</p>
        `, [
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
            { label: "Exportar", className: "btn btn-primary", onClick: executeExport }
        ]);
    }

    function executeExport() {
        const format = document.getElementById("exportFormat").value;
        closeModal();
        if (format === "pdf") { exportPdf(); } else { exportExcel(); }
    }

    function exportPdf() {
        const cols = state.visibleColumns;
        const win = window.open("", "_blank");
        if (!win) { showToast("Bloqueado", "Permite ventanas emergentes para generar el PDF.", "info"); return; }
        win.document.write(`<html><head><title>Reporte Inventario</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:12px}</style></head><body><h1>Reporte de Inventario</h1><p>Generado: ${new Date().toLocaleString("es-EC")} | ${state.filteredInventory.length} registros</p><table><thead><tr>${cols.map((c) => `<th>${labelForColumn(c)}</th>`).join("")}</tr></thead><tbody>${state.filteredInventory.map((item) => `<tr>${cols.map((c) => `<td>${escapeHtml(item[c] || "-")}</td>`).join("")}</tr>`).join("")}</tbody></table><script>window.onload=function(){window.print();}<\/script></body></html>`);
        win.document.close();
        showToast("PDF preparado", "Se abrio una vista imprimible.", "success");
    }

    function exportExcel() {
        const tipo = document.getElementById("filterType")?.value || "";
        const endpointMap = { pcs: "/reportes/pcs/excel", laptops: "/reportes/laptops/excel", telefonos: "/reportes/telefonos/excel", escaners: "/reportes/escaners/excel", impresoras: "/reportes/impresoras/excel", proyectores: "/reportes/proyectores/excel" };
        const endpoint = endpointMap[tipo] || "/reportes/inventario/excel";
        window.open(`${API_BASE}${endpoint}`, "_blank");
        showToast("Excel solicitado", "Se inicio la descarga.", "success");
    }

    function applyInventoryFilters() {
        const status = document.getElementById("filterStatus").value.trim().toLowerCase();
        const location = document.getElementById("filterLocation").value.trim().toLowerCase();
        const type = document.getElementById("filterType").value;
        state.inventoryPage = 1;
        state.filteredInventory = state.inventory.filter((item) => {
            const matchesStatus = !status || item.estado.toLowerCase().includes(status);
            const matchesLocation = !location || item.ubicacion.toLowerCase().includes(location);
            const matchesType = !type || item.tipo === type;
            return matchesStatus && matchesLocation && matchesType;
        });
        sortInventory(state.inventorySort.key, false);
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
        const headerRow = document.getElementById("inventoryHeaderRow");
        if (!tbody || !mobile) { return; }
        const cols = state.visibleColumns;
        // Render header
        if (headerRow) {
            headerRow.innerHTML = cols.map((key) => `<th><button class="table-sort" data-sort="${key}">${labelForColumn(key)}</button></th>`).join("") + "<th>Acciones</th>";
        }
        const total = state.filteredInventory.length;
        const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        state.inventoryPage = Math.min(state.inventoryPage, totalPages);
        const start = (state.inventoryPage - 1) * PAGE_SIZE;
        const pageItems = state.filteredInventory.slice(start, start + PAGE_SIZE);
        updateInventoryStats();
        setText("inventoryMeta", `${total} resultados - pagina ${state.inventoryPage} de ${totalPages}`);
        setText("inventoryPaginationMeta", pageItems.length ? `Mostrando ${start + 1}-${start + pageItems.length}` : "Sin resultados");
        tbody.innerHTML = pageItems.length ? pageItems.map((item) => {
            const cells = cols.map((key) => {
                if (key === "estado") return `<td>${stateBadge(item[key])}</td>`;
                if (key === "tipo") return `<td>${tipoLabel(item[key])}</td>`;
                return `<td>${escapeHtml(item[key] || "-")}</td>`;
            }).join("");
            return `<tr>${cells}<td>${renderInventoryActions(item)}</td></tr>`;
        }).join("") : `<tr><td colspan="${cols.length + 1}">No hay equipos para los filtros aplicados.</td></tr>`;
        mobile.innerHTML = pageItems.map(renderMobileInventoryCard).join("");
        tbody.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleInventoryAction));
        mobile.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleInventoryAction));
        document.querySelectorAll("[data-sort]").forEach((button) => button.addEventListener("click", () => sortInventory(button.dataset.sort)));
    }

    function tipoLabel(tipo) {
        const labels = { pcs: "Desktop", laptops: "Laptop", telefonos: "Telefonos", escaners: "Escanners", impresoras: "Impresoras", proyectores: "Proyectores" };
        return labels[tipo] || tipo;
    }

    function updateInventoryStats() {
        if (page !== "inventario") {
            return;
        }
        const total = state.filteredInventory.length;
        const active = state.filteredInventory.filter((item) => item.estado === "OPERATIVO").length;
        const inactive = state.filteredInventory.filter((item) => item.estado === "NO OPERATIVO").length;
        const low = state.filteredInventory.filter((item) => item.estado === "REPORTADO PARA DAR DE BAJA").length;
        setText("inventoryStatTotal", total);
        setText("inventoryStatActive", active);
        setText("inventoryStatInactive", inactive);
        setText("inventoryStatLow", low);
    }

    function renderInventoryRow(item) {
        return `
            <tr>
                <td>${escapeHtml(item.codigoSbai)}</td>
                <td>${escapeHtml(item.codigoMegan)}</td>
                <td>${item.tipo === "pcs" ? "Desktop" : "Laptop"}</td>
                <td>${escapeHtml(item.marca)}</td>
                <td>${escapeHtml(item.modelo)}</td>
                <td>${escapeHtml(item.numeroSerie)}</td>
                <td>${escapeHtml(item.custodio || "-")}</td>
                <td>${escapeHtml(item.ubicacion || "-")}</td>
                <td>${escapeHtml(item.procesador || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
                <td>${renderInventoryActions(item)}</td>
            </tr>
        `;
    }

    function renderMobileInventoryCard(item) {
        return `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai)} · ${escapeHtml(item.marca)} ${escapeHtml(item.modelo)}</strong>
                <span>Megan: ${escapeHtml(item.codigoMegan || "-")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Ubicación: ${escapeHtml(item.ubicacion || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
                <div class="action-row" style="margin-top:12px;">${renderInventoryActions(item)}</div>
            </article>
        `;
    }

    function renderInventoryActions(item) {
        const buttons = [];
        if (role === "admin") {
            buttons.push(`<button class="icon-btn" data-action="edit" data-id="${item.codigoSbai}" title="Editar"><i class="fas fa-edit"></i></button>`);
        } else {
            buttons.push(`<button class="icon-btn" data-action="custodian" data-id="${item.codigoSbai}" title="Editar custodio"><i class="fas fa-user-edit"></i></button>`);
        }
        buttons.push(`<button class="icon-btn" data-action="history" data-id="${item.codigoSbai}" title="Historial"><i class="fas fa-history"></i></button>`);
        if (role === "admin") {
            buttons.push(`<button class="icon-btn" data-action="status" data-id="${item.codigoSbai}" title="Cambiar estado"><i class="fas fa-exchange-alt"></i></button>`);
        }
        return `<div class="action-row">${buttons.join("")}</div>`;
    }

    async function handleInventoryAction(event) {
        const id = event.currentTarget.dataset.id;
        const action = event.currentTarget.dataset.action;
        const item = state.inventory.find((entry) => entry.codigoSbai === id);
        if (!item) {
            return;
        }
        if (action === "history") {
            await showHistoryModal(item);
        } else if (action === "status") {
            showStatusModal(item);
        } else if (action === "edit") {
            showEditModal(item);
        } else if (action === "custodian") {
            showCustodianModal(item);
        }
    }

    async function showHistoryModal(item) {
        let history = [];
        try {
            const response = await apiFetch(`/historico/bien/${item.tipo}/${encodeURIComponent(item.codigoSbai)}`);
            const payload = await response.json();
            history = Array.isArray(payload.data) ? payload.data : [];
        } catch (error) {
            history = [];
        }
        const fallbackHistory = history.length ? history : [
            { fechaCambio: new Date().toISOString(), usuario: "sistema", campo: "custodio", valorAnterior: "Sin dato", valorNuevo: item.custodio || "Sin dato", tipoOperacion: "CONSULTA" }
        ];
        openModal("Historial del equipo", `
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Fecha</th><th>Usuario</th><th>Campo</th><th>Anterior</th><th>Nuevo</th><th>Operación</th></tr></thead>
                    <tbody>${fallbackHistory.map((row) => `
                        <tr>
                            <td>${formatDate(row.fechaCambio)}</td>
                            <td>${escapeHtml(row.usuario || "-")}</td>
                            <td>${escapeHtml(row.campo || "-")}</td>
                            <td>${escapeHtml(row.valorAnterior || "-")}</td>
                            <td>${escapeHtml(row.valorNuevo || "-")}</td>
                            <td>${escapeHtml(row.tipoOperacion || "-")}</td>
                        </tr>
                    `).join("")}</tbody>
                </table>
            </div>
        `);
    }

    function showEditModal(item) {
        openModal("Editar equipo", `
            <form id="editItemForm" class="form-grid">
                ${editField("codigoSbai", "Código SBYE", item.codigoSbai, true)}
                ${editField("codigoMegan", "Código Megan", item.codigoMegan)}
                ${editField("marca", "Marca", item.marca)}
                ${editField("modelo", "Modelo", item.modelo)}
                ${editField("numeroSerie", "Número de serie", item.numeroSerie)}
                ${editField("procesador", "Procesador", item.procesador)}
                ${editField("estado", "Estado", item.estado, false, "select")}
                ${editField("observacion", "Observaciones", item.observacion, false, "textarea")}
            </form>
        `, [
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
            { label: "Guardar cambios", className: "btn btn-primary", onClick: () => saveAdminEdit(item) }
        ]);
        const select = document.querySelector('#editItemForm select[name="estado"]');
        if (select) {
            select.value = item.estado;
        }
    }

    function showCustodianModal(item) {
        openModal("Editar custodio", `
            <div class="helper-banner">Como usuario técnico, solo puede modificar el campo Actual Custodio.</div>
            <form id="custodianForm" class="form-grid" style="margin-top:16px;">
                ${editField("codigoSbai", "Código SBYE", item.codigoSbai, true)}
                ${editField("marca", "Marca", item.marca, true)}
                ${editField("modelo", "Modelo", item.modelo, true)}
                ${editField("estado", "Estado", item.estado, true)}
                ${editField("custodio", "Actual Custodio", item.custodio)}
            </form>
        `, [
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
            { label: "Guardar", className: "btn btn-primary", onClick: () => saveCustodianEdit(item) }
        ]);
    }

    function showStatusModal(item) {
        openModal("Cambiar estado", `
            <div class="field-group">
                <label for="statusSelect">Nuevo estado</label>
                <select id="statusSelect">
                    <option value="OPERATIVO">OPERATIVO</option>
                    <option value="NO OPERATIVO">NO OPERATIVO</option>
                    <option value="REPORTADO PARA DAR DE BAJA">REPORTADO PARA DAR DE BAJA</option>
                </select>
            </div>
        `, [
            { label: "Cancelar", className: "btn btn-secondary", onClick: closeModal },
            { label: "Actualizar", className: "btn btn-primary", onClick: () => saveStatus(item) }
        ]);
        document.getElementById("statusSelect").value = item.estado;
    }

    async function saveAdminEdit(item) {
        const form = document.getElementById("editItemForm");
        const formData = new FormData(form);
        const raw = Object.assign({}, item.raw);
        formData.forEach((value, key) => {
            raw[key] = value;
        });
        try {
            const response = await apiFetch(`/inventario/${item.tipo}/${encodeURIComponent(item.codigoSbai)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(raw)
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "No fue posible guardar");
            }
            showToast("Guardado", "Equipo actualizado correctamente.", "success");
            closeModal();
            await loadInventory();
            renderInventory();
        } catch (error) {
            showToast("Sin cambios", "La edición administrativa depende de los endpoints completos del backend actual.", "info");
        }
    }

    function saveCustodianEdit(item) {
        const newCustodian = document.querySelector('#custodianForm [name="custodio"]').value.trim();
        item.custodio = newCustodian;
        item.raw.custodioActual = Object.assign({}, item.raw.custodioActual || {}, { nombre: newCustodian });
        state.filteredInventory = state.inventory.slice();
        applyInventoryFilters();
        closeModal();
        showToast("Custodio actualizado", "El cambio se aplicó en la interfaz actual.", "success");
    }

    async function saveStatus(item) {
        const status = document.getElementById("statusSelect").value;
        const raw = Object.assign({}, item.raw, { estado: status });
        try {
            const response = await apiFetch(`/inventario/${item.tipo}/${encodeURIComponent(item.codigoSbai)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(raw)
            });
            const payload = await response.json();
            if (!response.ok || !payload.success) {
                throw new Error(payload.message || "No fue posible guardar");
            }
        } catch (error) {
            showToast("Aviso", "Se reflejó el cambio visual aunque el backend actual es más limitado.", "info");
        }
        item.estado = status;
        item.raw.estado = status;
        applyInventoryFilters();
        closeModal();
        showToast("Estado actualizado", "El estado del equipo se actualizó.", "success");
    }

    function changePage(step) {
        const totalPages = Math.max(1, Math.ceil(state.filteredInventory.length / PAGE_SIZE));
        state.inventoryPage = Math.max(1, Math.min(totalPages, state.inventoryPage + step));
        renderInventory();
    }

    function applyQuickInventoryFilter(type, value) {
        if (type === "reset") {
            document.getElementById("filterStatus").value = "";
            document.getElementById("filterLocation").value = "";
            document.getElementById("filterType").value = "";
        }
        if (type === "status") {
            document.getElementById("filterStatus").value = value;
        }
        if (type === "type") {
            document.getElementById("filterType").value = value;
        }
        applyInventoryFilters();
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
        document.getElementById("criteriaValue")?.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                document.getElementById("addCriteria")?.click();
            }
        });
        document.getElementById("runSearch")?.addEventListener("click", runSearch);
        document.getElementById("clearSearch")?.addEventListener("click", () => {
            state.searchCriteria = [];
            renderSearchTags();
            renderSearchResults([]);
        });
        document.querySelectorAll("[data-search-preset]").forEach((button) => button.addEventListener("click", () => applySearchPreset(Number(button.dataset.searchPreset))));
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
        state.searchResults = state.inventory.filter((item) => state.searchCriteria.every((criteria) => String(item[criteria.field] || "").toLowerCase().includes(criteria.value.toLowerCase())));
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
                <td>${escapeHtml(item.codigoMegan)}</td>
                <td>${escapeHtml(item.codigoSbai)}</td>
                <td>${escapeHtml(item.numeroSerie || "-")}</td>
                <td>${escapeHtml(item.marca || "-")}</td>
                <td>${escapeHtml(item.modelo || "-")}</td>
                <td>${escapeHtml(item.custodio || "-")}</td>
                <td>${escapeHtml(item.ubicacion || "-")}</td>
                <td>${stateBadge(item.estado)}</td>
                <td>${escapeHtml(item.procesador || "-")}</td>
                ${role === "admin" ? `<td><div class="action-row"><button class="icon-btn" data-action="edit" data-id="${item.codigoSbai}"><i class="fas fa-edit"></i></button><button class="icon-btn" data-action="history" data-id="${item.codigoSbai}"><i class="fas fa-history"></i></button></div></td>` : ""}
            </tr>
        `).join("") : `<tr><td colspan="${role === "admin" ? 10 : 9}">No se encontraron coincidencias.</td></tr>`;
        mobile.innerHTML = results.map((item) => `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai)}</strong>
                <span>Marca: ${escapeHtml(item.marca || "-")}</span>
                <span>Modelo: ${escapeHtml(item.modelo || "-")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
            </article>
        `).join("");
        tbody.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", handleInventoryAction));
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

    function bindReportEvents() {
        document.getElementById("downloadPdf")?.addEventListener("click", generatePdfReport);
        document.getElementById("downloadExcel")?.addEventListener("click", generateExcelReport);
        ["reportFormat", "reportScope", "reportCriteria", "reportValue"].forEach((id) => {
            document.getElementById(id)?.addEventListener("input", renderReportPreview);
            document.getElementById(id)?.addEventListener("change", renderReportPreview);
        });
        document.getElementById("clearRecentReports")?.addEventListener("click", clearRecentReports);
    }

    function getReportConfig() {
        return {
            format: document.getElementById("reportFormat").value,
            scope: document.getElementById("reportScope").value,
            criteria: document.getElementById("reportCriteria").value,
            value: document.getElementById("reportValue").value.trim()
        };
    }

    function generatePdfReport() {
        const config = getReportConfig();
        const dataset = filterReportDataset(config);
        const win = window.open("", "_blank");
        if (!win) {
            showToast("Bloqueado", "Permite ventanas emergentes para generar el PDF.", "info");
            return;
        }
        win.document.write(`
            <html><head><title>Reporte PDF</title><style>body{font-family:Arial;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}</style></head>
            <body>
                <h1>Reporte de Inventario</h1>
                <p>Cobertura: ${config.scope} | Criterio: ${config.criteria}${config.value ? ` | Valor: ${escapeHtml(config.value)}` : ""}</p>
                <table>
                    <thead><tr><th>Código</th><th>Marca</th><th>Modelo</th><th>Custodio</th><th>Estado</th></tr></thead>
                    <tbody>${dataset.map((item) => `<tr><td>${escapeHtml(item.codigoSbai)}</td><td>${escapeHtml(item.marca)}</td><td>${escapeHtml(item.modelo)}</td><td>${escapeHtml(item.custodio)}</td><td>${escapeHtml(item.estado)}</td></tr>`).join("")}</tbody>
                </table>
                <script>window.onload = function(){ window.print(); }<\/script>
            </body></html>
        `);
        win.document.close();
        saveRecentReport(config, dataset.length);
        renderRecentReports();
        renderReportPreview();
        showToast("PDF preparado", "Se abrió una vista imprimible para guardar como PDF.", "success");
    }

    function generateExcelReport() {
        const config = getReportConfig();
        const endpointMap = {
            pcs: "/reportes/pcs/excel",
            laptops: "/reportes/laptops/excel",
            completo: "/reportes/inventario/excel"
        };
        window.open(`${API_BASE}${endpointMap[config.scope] || endpointMap.completo}`, "_blank");
        saveRecentReport(config, filterReportDataset(config).length);
        renderRecentReports();
        renderReportPreview();
        showToast("Excel solicitado", "Se inició la descarga desde el endpoint disponible.", "success");
    }

    function filterReportDataset(config) {
        return state.inventory.filter((item) => {
            const matchesScope = config.scope === "completo" || item.tipo === config.scope;
            if (!matchesScope) {
                return false;
            }
            if (!config.value) {
                return true;
            }
            const value = config.value.toLowerCase();
            if (config.criteria === "codigos") {
                return item.codigoSbai.toLowerCase().includes(value) || item.codigoMegan.toLowerCase().includes(value);
            }
            if (config.criteria === "completo") {
                return JSON.stringify(item).toLowerCase().includes(value);
            }
            if (config.criteria === "observaciones") {
                return item.observacion.toLowerCase().includes(value);
            }
            if (config.criteria === "caracteristicas") {
                return `${item.procesador} ${item.modelo}`.toLowerCase().includes(value);
            }
            return String(item[config.criteria] || "").toLowerCase().includes(value);
        });
    }

    function loadRecentReports() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_REPORTS) || "[]");
        } catch (error) {
            return [];
        }
    }

    function saveRecentReport(config, total) {
        const updated = [
            {
                timestamp: new Date().toISOString(),
                format: config.format,
                scope: config.scope,
                criteria: config.criteria,
                value: config.value,
                total: total
            }
        ].concat(state.recentReports).slice(0, 8);
        state.recentReports = updated;
        localStorage.setItem(STORAGE_REPORTS, JSON.stringify(updated));
    }

    function clearRecentReports() {
        state.recentReports = [];
        localStorage.removeItem(STORAGE_REPORTS);
        renderRecentReports();
        showToast("Historial limpio", "Se vació la lista local de reportes recientes.", "info");
    }

    function renderRecentReports() {
        const container = document.getElementById("recentReports");
        if (!container) {
            return;
        }
        container.innerHTML = state.recentReports.length
            ? state.recentReports.map((item) => `
                <article class="report-history__item">
                    <strong>${item.format.toUpperCase()} · ${item.scope}</strong>
                    <div class="muted">${item.criteria}${item.value ? ` · ${escapeHtml(item.value)}` : ""} · ${item.total} registros · ${formatDate(item.timestamp)}</div>
                </article>
            `).join("")
            : '<div class="empty-state">Aún no hay reportes generados en esta sesión local.</div>';
    }

    function renderReportPreview() {
        if (page !== "reportes") {
            return;
        }
        const config = getReportConfig();
        const results = filterReportDataset(config);
        const tbody = document.getElementById("reportPreviewBody");
        const mobile = document.getElementById("reportPreviewMobile");
        if (!tbody || !mobile) {
            return;
        }

        setText("reportStatTotal", state.inventory.length);
        setText("reportStatPcs", state.inventory.filter((item) => item.tipo === "pcs").length);
        setText("reportStatLaptops", state.inventory.filter((item) => item.tipo === "laptops").length);
        setText("reportStatFiltered", results.length);
        setText("reportPreviewMeta", `${results.length} registros coinciden con la selección actual. Se muestran hasta 5 en la vista previa.`);

        const previewItems = results.slice(0, 5);
        tbody.innerHTML = previewItems.length
            ? previewItems.map((item) => `
                <tr>
                    <td>${escapeHtml(item.codigoSbai)}</td>
                    <td>${escapeHtml(item.marca || "-")}</td>
                    <td>${escapeHtml(item.modelo || "-")}</td>
                    <td>${escapeHtml(item.custodio || "-")}</td>
                    <td>${escapeHtml(item.ubicacion || "-")}</td>
                    <td>${stateBadge(item.estado)}</td>
                </tr>
            `).join("")
            : '<tr><td colspan="6">No hay registros para la configuración elegida.</td></tr>';

        mobile.innerHTML = previewItems.map((item) => `
            <article class="mobile-card">
                <strong>${escapeHtml(item.codigoSbai)}</strong>
                <span>Marca: ${escapeHtml(item.marca || "-")}</span>
                <span>Modelo: ${escapeHtml(item.modelo || "-")}</span>
                <span>Custodio: ${escapeHtml(item.custodio || "-")}</span>
                <span>Estado: ${stripHtml(stateBadge(item.estado))}</span>
            </article>
        `).join("");
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
        if (!container) { return; }
        const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.laptops;
        const columns = categoryConfig.columns || [];
        container.innerHTML = columns.map((field) => {
            if (field === "estado") {
                return editField(field, labelForColumn(field), "OPERATIVO", false, "select");
            }
            if (field === "observacion" || field === "caracteristicas" || field === "anotaciones") {
                return editField(field, labelForColumn(field), "", false, "textarea");
            }
            return editField(field, labelForColumn(field), "");
        }).join("");
        const select = container.querySelector('select[name="estado"]');
        if (select) { select.value = "OPERATIVO"; }
        setText("equipmentCategoryHint", categoryConfig.hint || "");
        renderEquipmentSummary(categoryConfig, columns);
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
                <strong>Campos incluidos</strong>
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
                    <button class="modal-close" id="modalClose"><i class="fas fa-times"></i></button>
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

    function labelForColumn(key) {
        const labels = {
            codigoSbai: "Codigo SBAI",
            codigoSbaiOriginal: "Codigo SBAI",
            codigoMegan: "Codigo Megan",
            tipo: "Categoria",
            marca: "Marca",
            modelo: "Modelo",
            numeroSerie: "Numero de Serie",
            custodio: "Custodio",
            custodioAnterior: "Custodio Anterior",
            ubicacion: "Ubicacion",
            ubicacionEdificio: "Edificio",
            ubicacionPiso: "Piso",
            ubicacionDetalle: "Detalle",
            estado: "Estado",
            procesador: "Procesador",
            observacion: "Observaciones",
            sistemaOperativo: "Sistema Operativo",
            ram: "RAM",
            discoDuro: "Disco Duro",
            ip: "IP",
            caracteristicas: "Caracteristicas",
            descripcion: "Descripcion",
            actaUgdt: "Acta UGDT",
            actaUgad: "Acta UGAD",
            anotaciones: "Anotaciones"
        };
        return labels[key] || key;
    }

    function stateBadge(status) {
        if (status === "OPERATIVO") {
            return '<span class="badge badge-success">OPERATIVO</span>';
        }
        if (status === "NO OPERATIVO") {
            return '<span class="badge badge-warning">NO OPERATIVO</span>';
        }
        return '<span class="badge badge-danger">REPORTADO PARA DAR DE BAJA</span>';
    }

    function editField(name, label, value, disabled, type) {
        if (type === "textarea") {
            return `<label class="field-group"><span>${label}</span><textarea name="${name}" ${disabled ? "disabled" : ""}>${escapeHtml(value || "")}</textarea></label>`;
        }
        if (type === "select") {
            return `<label class="field-group"><span>${label}</span><select name="${name}" ${disabled ? "disabled" : ""}>
                <option value="OPERATIVO">OPERATIVO</option>
                <option value="NO OPERATIVO">NO OPERATIVO</option>
                <option value="REPORTADO PARA DAR DE BAJA">REPORTADO PARA DAR DE BAJA</option>
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
})();
