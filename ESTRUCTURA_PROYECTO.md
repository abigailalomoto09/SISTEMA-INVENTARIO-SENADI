# Estructura Completa del Proyecto Sistema Inventario SENADI

## 📁 Estructura de Directorios

```
SistemaInventarioV3/
│
├── pom.xml                                          (Maven configuration)
├── nb-configuration.xml                             (NetBeans config)
├── README.md                                        (Documentación del proyecto)
├── ESTRUCTURA_PROYECTO.md                           (Este archivo)
│
├── inventario_dtic_2026_modelo_workbench_compatible.sql
│                                                    (Script SQL principal)
│
├── src/
│   └── main/
│       ├── java/
│       │   └── com/mycompany/sistemainventariov3/
│       │       │
│       │       ├── ConnectionTest.java             (Programa de prueba conexión)
│       │       ├── JAXRSConfiguration.java         (Configuración path /resources)
│       │       │
│       │       ├── model/
│       │       │   ├── Usuario.java                (Entidad usuarios)
│       │       │   ├── HistoricoCambio.java        (Entidad histórico cambios)
│       │       │   ├── Custodio.java               (Entidad custodios)
│       │       │   ├── Ubicacion.java              (Entidad ubicaciones)
│       │       │   ├── PC.java                     (Entidad PCs - desktops)
│       │       │   └── Laptop.java                 (Entidad Laptops)
│       │       │
│       │       ├── dao/
│       │       │   ├── DAOGenerico.java            (Base DAO genérica con CRUD)
│       │       │   ├── UsuarioDAO.java             (DAO para usuarios)
│       │       │   ├── PCDAO.java                  (DAO para PCs)
│       │       │   ├── LaptopDAO.java              (DAO para Laptops)
│       │       │   ├── CustodioDAO.java            (DAO para custodios)
│       │       │   ├── UbicacionDAO.java           (DAO para ubicaciones)
│       │       │   └── HistoricoCambioDAO.java     (DAO para histórico)
│       │       │
│       │       ├── service/
│       │       │   ├── UsuarioService.java         (Lógica autenticación)
│       │       │   ├── HistoricoService.java       (Lógica histórico cambios)
│       │       │   └── BienService.java            (Lógica CRUD bienes)
│       │       │
│       │       ├── dto/
│       │       │   ├── LoginRequest.java           (DTO solicitud login)
│       │       │   └── ApiResponse.java            (DTO respuesta genérica)
│       │       │
│       │       ├── util/
│       │       │   ├── JPAUtil.java                (Singleton EntityManager)
│       │       │   ├── SesionUsuario.java          (Context usuario actual)
│       │       │   └── EncriptacionUtil.java       (Hash MD5)
│       │       │
│       │       └── resources/
│       │           ├── JAXRSConfiguration.java
│       │           ├── DatabaseResource.java        (REST endpoint ejemplo)
│       │           ├── JavaEE8Resource.java         (REST endpoint ejemplo)
│       │           ├── LoginResource.java           (REST login)
│       │           ├── InventarioResource.java      (REST CRUD)
│       │           ├── BusquedaResource.java        (REST búsqueda)
│       │           ├── HistoricoResource.java       (REST histórico)
│       │           └── ReportesResource.java        (REST reportes/Excel)
│       │
│       ├── resources/
│       │   └── META-INF/
│       │       └── persistence.xml                  (JPA config MySQL)
│       │
│       └── webapp/
│           ├── index.html                           (Login + Dashboard)
│           ├── dashboard.html                       (Interfaz principal)
│           │
│           ├── css/
│           │   └── estilos.css                      (Estilos SENADI - 400+ líneas)
│           │
│           ├── js/
│           │   └── main.js                          (Lógica frontend - 2000+ líneas)
│           │
│           └── WEB-INF/
│               ├── beans.xml
│               └── web.xml
│
└── target/
    ├── SistemaInventarioV3-1.0-SNAPSHOT.war         (WAR final)
    ├── classes/
    │   └── com/mycompany/sistemainventariov3/       (Bytecode compilado)
    └── (otros archivos de compilación)
```

---

## 📄 Archivos Principales por Componente

### 🔐 Autenticación
- `LoginResource.java` - Endpoint POST /resources/login
- `UsuarioService.java` - Validación con MD5
- `Usuario.java` - Entidad con rol (ADMIN/TECNICO)
- `EncriptacionUtil.java` - Hash MD5

### 📊 Gestión de Inventario
- `InventarioResource.java` - CRUD endpoints
- `BienService.java` - Lógica negocio con histórico
- `PC.java` / `Laptop.java` - Entidades bienes
- `PCDAO.java` / `LaptopDAO.java` - Acceso datos

### 📝 Histórico de Cambios
- `HistoricoCambio.java` - Entidad auditoría
- `HistoricoService.java` - Registro automático cambios
- `HistoricoResource.java` - Queries histórico
- `HistoricoCambioDAO.java` - Acceso datos cambios

### 🔍 Búsqueda Avanzada
- `BusquedaResource.java` - Endpoint dinámico
- Soporta: criterio, valor, tipo_bien como parámetros

### 📈 Reportes
- `ReportesResource.java` - Endpoints reportes/Excel
- Integración Apache POI (estructura definida)

### 🎨 Frontend
- `index.html` - Pantalla login
- `dashboard.html` - Interfaz usuario
- `css/estilos.css` - Estilos institucionales
- `js/main.js` - Lógica JavaScript + API calls

### ⚙️ Utilidades
- `JPAUtil.java` - Gestión EntityManager
- `SesionUsuario.java` - ThreadLocal usuario actual
- `DAOGenerico.java` - Base para todos los DAOs

### 🔧 Configuración
- `persistence.xml` - JPA MySQL
- `JAXRSConfiguration.java` - Path /resources

---

## 🗄️ Base de Datos

### Tablas Utilizadas
```
usuarios                            (Usuarios con rol)
historico_cambios                   (Auditoría)
custodios                           (Responsables)
ubicaciones                         (Ubicaciones físicas)
pcs                                 (Computadoras de escritorio)
laptops                             (Computadoras portátiles)
perifericos                         (Periféricos)
impresoras                          (Impresoras)
proyectores                         (Proyectores)
escaners                            (Escáneres)
telefonos                           (Teléfonos)
bienes_control_administrativo       (Otros bienes)
```

### Tablas NO Utilizadas
- infraestructura
- licencias
- modems
- formato

---

## 🚀 Compilación y Ejecución

### Compilar
```bash
mvn clean compile
```

### Empaquetar
```bash
mvn clean package
```

### Resultado
```
target/SistemaInventarioV3-1.0-SNAPSHOT.war
```

### Desplegar en Tomcat
```bash
cp target/SistemaInventarioV3-1.0-SNAPSHOT.war $CATALINA_HOME/webapps/
```

### Acceder
```
http://localhost:8080/SistemaInventarioV3/
```

---

## 👤 Credenciales de Prueba

| Usuario | Contraseña | Rol | Permisos |
|---------|-----------|-----|----------|
| admin | admin123 | Administrador | Crear, Editar, Eliminar, Cambiar Estado |
| tecnico | tecnico123 | Técnico | Crear, Editar (solo custodio), Ver Histórico |

---

## 📡 Endpoints REST API

### Autenticación
```
POST   /resources/login                    Iniciar sesión
GET    /resources/login/actual             Usuario actual
POST   /resources/login/logout             Cerrar sesión
```

### Inventario
```
GET    /resources/inventario/pcs           Listar PCs
GET    /resources/inventario/laptops       Listar Laptops
GET    /resources/inventario/{tipo}/{id}   Obtener detalle
POST   /resources/inventario/{tipo}        Crear bien
PUT    /resources/inventario/{tipo}/{id}   Actualizar bien
DELETE /resources/inventario/{tipo}/{id}   Eliminar bien
```

### Búsqueda
```
GET    /resources/busqueda?tipo=pcs&criterio=marca&valor=Dell
GET    /resources/busqueda/megan/{codigo}
GET    /resources/busqueda/sbai/{codigo}
```

### Histórico
```
GET    /resources/historico/bien/{tabla}/{id}
GET    /resources/historico/usuario/{usuario}
GET    /resources/historico/tabla/{tabla}
```

### Reportes
```
GET    /resources/reportes/pcs/excel
GET    /resources/reportes/laptops/excel
GET    /resources/reportes/inventario/excel
GET    /resources/reportes/estadisticas
```

---

## 🎨 Paleta de Colores SENADI

```css
/* Colores Institucionales */
--azul-oscuro: #002d5b;         /* Encabezados */
--azul-medio: #0052a3;          /* Acentos */
--azul-claro: #4A90E2;          /* Enlaces */
--blanco: #ffffff;              /* Fondo */
--gris-claro: #f5f5f5;          /* Fondo secundario */
```

---

## 📋 Capas Arquitectura

```
┌─────────────────────────────────────────┐
│        Frontend (HTML/CSS/JS)           │
│     (index.html, dashboard.html)        │
├─────────────────────────────────────────┤
│      REST Controllers (JAX-RS)          │
│   LoginResource, InventarioResource...  │
├─────────────────────────────────────────┤
│      Service Layer (Negocios)           │
│   UsuarioService, BienService, etc.     │
├─────────────────────────────────────────┤
│      DAO Layer (Acceso Datos)           │
│   DAOGenerico, PCDAO, LaptopDAO, etc.   │
├─────────────────────────────────────────┤
│      JPA/Hibernate Entities             │
│   Usuario, PC, Laptop, HistoricoCambio  │
├─────────────────────────────────────────┤
│         MySQL Database                  │
│    (inventario_dtic_2026)               │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tecnologías por Capa

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|----------|
| Backend | Java | 11 | Lenguaje principal |
| Web | JAX-RS | 2.1 | Framework REST |
| ORM | Hibernate/JPA | 5.6 | Mapeo Objeto-Relacional |
| BD | MySQL | 8.x | Base de datos relacional |
| JSON | GSON | 2.10.1 | Serialización JSON |
| Excel | Apache POI | 5.2.3 | Exportación Excel |
| Build | Maven | 3.6+ | Gestor de dependencias |
| Frontend | HTML/CSS/JS | - | Interfaz usuario |

---

## 📊 Diagrama de Clases Simplificado

```
Usuario (model)
    ↓
UsuarioDAO (dao) ← UsuarioService (service)
    ↓                     ↓
persistence.xml       LoginResource (rest)
    ↓                     ↑
MySQL BD              main.js (frontend)
```

---

## ✅ Estado de Completitud

- [x] Modelo JPA (6 entidades)
- [x] DAOs (7 clases)
- [x] Servicios (3 clases)
- [x] REST Controllers (5 recursos)
- [x] Frontend HTML (2 archivos)
- [x] Frontend CSS (1 archivo - 400+ líneas)
- [x] Frontend JavaScript (1 archivo - 2000+ líneas)
- [x] Configuración JPA + MySQL
- [x] Utilidades (JPAUtil, SesionUsuario, EncriptacionUtil)

---

## 📌 Notas Importantes

1. **Encriptación:** Usa MD5 (desarrollo, NO usar en producción)
2. **Roles:** ADMINISTRADOR y TECNICO hardcoded en enum
3. **Histórico:** Automático en toda creación/modificación
4. **Duplicados:** Código Megan y Código SBAI deben ser únicos
5. **Timezone:** America/Lima en conexión MySQL
6. **Charset:** UTF-8MB4 en base de datos

---

## 🔗 Archivos de Configuración Clave

- `pom.xml` - Dependencias Maven
- `persistence.xml` - JPA Configuration
- `web.xml` - Configuración Servlet
- `beans.xml` - CDI Configuration
- `JAXRSConfiguration.java` - Path REST

---

Documento generado automáticamente - Proyecto completo en 6 fases implementadas.

