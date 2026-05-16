package com.mycompany.sistemainventariov3.bean;

import com.mycompany.sistemainventariov3.model.Usuario;
import com.mycompany.sistemainventariov3.util.LDAP;
import com.mycompany.sistemainventariov3.util.SesionUsuario;

import javax.faces.application.FacesMessage;
import javax.faces.bean.ManagedBean;
import javax.faces.bean.SessionScoped;
import javax.faces.context.FacesContext;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Bean para autenticación LDAP contra SC_Inventario
 * Soporta 3 grupos: SC_ADMIN, SC_TECNICO, SC_CUSTODIO
 * 
 * Nota: Los técnicos heredan permisos de custodio
 */
@ManagedBean(name = "loginBean")
@SessionScoped
public class LoginBean implements Serializable {

    private static final long serialVersionUID = 1L;

    // Grupos LDAP de SC_Inventario
    private static final String GRUPO_SC_INVENTARIO = "SC_Inventario";
    private static final String GRUPO_ADMIN = "SC_ADMIN";
    private static final String GRUPO_TECNICO = "SC_TECNICO";
    private static final String GRUPO_CUSTODIO = "SC_CUSTODIO";

    // Propiedades de login
    private String usuario;
    private String clave;
    private boolean logeado = false;
    private boolean shake = true;

    // Información del usuario autenticado
    private String nombreCompleto;
    private String grupoActual; // SC_Inventario, SC_ADMIN, SC_TECNICO, SC_CUSTODIO
    private List<String> gruposDisponibles = new ArrayList<>();
    private Map<String, Boolean> permisos = new HashMap<>();
    private boolean esAdmin = false;
    private boolean esTecnico = false;
    private boolean esCustodio = false;

    // Para modo lectura (opcional)
    private boolean lectura = false;

    private LDAP ldapUtil = new LDAP();

    /**
     * Método login adaptado para SC_Inventario
     * Verifica primero SC_Inventario, luego los 3 grupos disponibles
     */
    public void login() {
        FacesMessage msg = null;

        if (usuario == null || usuario.trim().isEmpty() || clave == null || clave.trim().isEmpty()) {
            msg = new FacesMessage(FacesMessage.SEVERITY_ERROR, "Error", "Usuario y contraseña requeridos");
            FacesContext.getCurrentInstance().addMessage(null, msg);
            shake = true;
            return;
        }

        usuario = usuario.trim();

        // PASO 1: Validar pertenencia a SC_Inventario (principal)
        int resultadoInventario = ldapUtil.validarIngresoLDAPRestringido(usuario, clave);

        switch (resultadoInventario) {
            case 1: // Usuario está en SC_Inventario
                // PASO 2: Verificar qué grupo tiene (SC_ADMIN, SC_TECNICO, SC_CUSTODIO)
                verificarGruposDelUsuario();

                // Si tiene al menos un grupo válido
                if (!gruposDisponibles.isEmpty()) {
                    logeado = true;
                    shake = false;
                    lectura = false;

                    // Obtener información del usuario desde LDAP
                    Map<String, String> infoLDAP = ldapUtil.obtenerInfoUsuarioLDAP(usuario, clave);
                    nombreCompleto = infoLDAP.getOrDefault("displayName", usuario);

                    System.out.println("✓ Autenticación exitosa para: " + usuario);
                    System.out.println("  Rol principal: " + grupoActual);
                    System.out.println("  Grupos disponibles: " + gruposDisponibles);
                    System.out.println("  Nombre: " + nombreCompleto);

                    // Crear sesión
                    Usuario usuarioSesion = new Usuario(usuario, null, grupoActual, nombreCompleto, null, true);
                    usuarioSesion.setRolesDisponibles(gruposDisponibles);
                    SesionUsuario.setUsuarioActual(usuarioSesion);

                    // Mensaje de bienvenida
                    msg = new FacesMessage(FacesMessage.SEVERITY_INFO, "Bienvenid@", nombreCompleto + " - " + grupoActual);
                } else {
                    msg = new FacesMessage(FacesMessage.SEVERITY_WARN, "Login Error",
                            "No tiene grupos asignados en SC_Inventario");
                    shake = true;
                }
                break;

            case -1: // Usuario no está en SC_Inventario
                msg = new FacesMessage(FacesMessage.SEVERITY_WARN, "Login Error",
                        "No tiene autorización para acceder a SC_Inventario");
                shake = true;
                System.out.println("✗ Usuario no autorizado: " + usuario);
                break;

            default: // Caso 0: Credenciales incorrectas
                msg = new FacesMessage(FacesMessage.SEVERITY_ERROR, "Login Error",
                        "Credenciales Incorrectas");
                shake = true;
                System.out.println("✗ Credenciales incorrectas para: " + usuario);
                break;
        }

        FacesContext.getCurrentInstance().addMessage(null, msg);
    }

    /**
     * Verifica a qué grupos de SC_Inventario pertenece el usuario
     * y establece permisos según el rol
     */
    private void verificarGruposDelUsuario() {
        gruposDisponibles.clear();
        permisos.clear();

        // PASO 2.1: Verificar SC_ADMIN
        int resultAdmin = ldapUtil.validarIngresoLDAPRestringido(usuario, clave, GRUPO_ADMIN);
        if (resultAdmin == 1) {
            gruposDisponibles.add(GRUPO_ADMIN);
            if (grupoActual == null) {
                grupoActual = GRUPO_ADMIN;
            }
            esAdmin = true;
            System.out.println("  ✓ Usuario es ADMINISTRADOR");
        }

        // PASO 2.2: Verificar SC_TECNICO
        int resultTecnico = ldapUtil.validarIngresoLDAPRestringido(usuario, clave, GRUPO_TECNICO);
        if (resultTecnico == 1) {
            gruposDisponibles.add(GRUPO_TECNICO);
            if (grupoActual == null) {
                grupoActual = GRUPO_TECNICO;
            }
            esTecnico = true;
            // Los técnicos también heredan permisos de custodio
            gruposDisponibles.add(GRUPO_CUSTODIO);
            esCustodio = true;
            System.out.println("  ✓ Usuario es TECNICO (+ CUSTODIO)");
        }

        // PASO 2.3: Verificar SC_CUSTODIO (solo si no es técnico)
        if (!esTecnico) {
            int resultCustodio = ldapUtil.validarIngresoLDAPRestringido(usuario, clave, GRUPO_CUSTODIO);
            if (resultCustodio == 1) {
                gruposDisponibles.add(GRUPO_CUSTODIO);
                if (grupoActual == null) {
                    grupoActual = GRUPO_CUSTODIO;
                }
                esCustodio = true;
                System.out.println("  ✓ Usuario es CUSTODIO");
            }
        }

        // Establecer permisos según el grupo actual
        establecerPermisos();
    }

    /**
     * Establece los permisos del usuario según su grupo actual
     */
    private void establecerPermisos() {
        // Limpiar permisos previos
        permisos.clear();

        if (GRUPO_ADMIN.equals(grupoActual)) {
            // ADMINISTRADOR - Acceso total
            permisos.put("puedeEditarTodos", true);
            permisos.put("puedeActualizarEstado", true);
            permisos.put("puedeVer", true);
            permisos.put("puedeCrearEquipo", true);
            permisos.put("puedeEditarCustodio", true);
            permisos.put("puedeExportarInventario", true);
            permisos.put("puedeVerHistorial", true);

        } else if (GRUPO_TECNICO.equals(grupoActual)) {
            // TECNICO - Puede hacer modificaciones
            permisos.put("puedeEditarTodos", false);
            permisos.put("puedeActualizarEstado", true);  // ← Puede cambiar estado
            permisos.put("puedeVer", true);
            permisos.put("puedeCrearEquipo", true);       // ← Puede crear equipos
            permisos.put("puedeEditarCustodio", false);
            permisos.put("puedeExportarInventario", true);
            permisos.put("puedeVerHistorial", true);

        } else if (GRUPO_CUSTODIO.equals(grupoActual)) {
            // CUSTODIO - Solo lectura y algunas acciones
            permisos.put("puedeEditarTodos", false);
            permisos.put("puedeActualizarEstado", false);
            permisos.put("puedeVer", true);
            permisos.put("puedeCrearEquipo", false);
            permisos.put("puedeEditarCustodio", false);
            permisos.put("puedeExportarInventario", false);
            permisos.put("puedeVerHistorial", true);
        }
    }

    /**
     * Cambia el grupo/rol actual del usuario
     * Útil cuando el usuario tiene múltiples roles disponibles
     */
    public void cambiarGrupo(String nuevoGrupo) {
        if (gruposDisponibles.contains(nuevoGrupo)) {
            grupoActual = nuevoGrupo;
            establecerPermisos();
            System.out.println("Grupo cambiado a: " + nuevoGrupo);
            FacesMessage msg = new FacesMessage(FacesMessage.SEVERITY_INFO, "Éxito",
                    "Grupo cambiado a " + nuevoGrupo);
            FacesContext.getCurrentInstance().addMessage(null, msg);
        }
    }

    /**
     * Logout - Limpia la sesión
     */
    public void logout() {
        usuario = null;
        clave = null;
        logeado = false;
        shake = true;
        nombreCompleto = null;
        grupoActual = null;
        gruposDisponibles.clear();
        permisos.clear();
        esAdmin = false;
        esTecnico = false;
        esCustodio = false;
        SesionUsuario.limpiar();
        System.out.println("Usuario cerró sesión");
    }

    /**
     * Verifica si el usuario tiene un permiso específico
     */
    public boolean tienePermiso(String nombrePermiso) {
        return permisos.getOrDefault(nombrePermiso, false);
    }

    /**
     * Verifica si el usuario tiene un grupo/rol específico disponible
     */
    public boolean tieneGrupo(String grupo) {
        return gruposDisponibles.contains(grupo);
    }

    // GETTERS Y SETTERS
    public String getUsuario() {
        return usuario;
    }

    public void setUsuario(String usuario) {
        this.usuario = usuario;
    }

    public String getClave() {
        return clave;
    }

    public void setClave(String clave) {
        this.clave = clave;
    }

    public boolean isLogeado() {
        return logeado;
    }

    public void setLogeado(boolean logeado) {
        this.logeado = logeado;
    }

    public boolean isShake() {
        return shake;
    }

    public void setShake(boolean shake) {
        this.shake = shake;
    }

    public String getNombreCompleto() {
        return nombreCompleto;
    }

    public void setNombreCompleto(String nombreCompleto) {
        this.nombreCompleto = nombreCompleto;
    }

    public String getGrupoActual() {
        return grupoActual;
    }

    public void setGrupoActual(String grupoActual) {
        this.grupoActual = grupoActual;
    }

    public List<String> getGruposDisponibles() {
        return gruposDisponibles;
    }

    public void setGruposDisponibles(List<String> gruposDisponibles) {
        this.gruposDisponibles = gruposDisponibles;
    }

    public Map<String, Boolean> getPermisos() {
        return permisos;
    }

    public void setPermisos(Map<String, Boolean> permisos) {
        this.permisos = permisos;
    }

    public boolean isEsAdmin() {
        return esAdmin;
    }

    public boolean isEsTecnico() {
        return esTecnico;
    }

    public boolean isEsCustodio() {
        return esCustodio;
    }

    public boolean isLectura() {
        return lectura;
    }

    public void setLectura(boolean lectura) {
        this.lectura = lectura;
    }
}
