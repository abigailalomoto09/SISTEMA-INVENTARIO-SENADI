package com.mycompany.sistemainventariov3.dao;

import com.mycompany.sistemainventariov3.model.UsuarioRol;
import javax.persistence.EntityManager;
import java.util.List;

/**
 * DAO para UsuarioRol (multi-rol)
 */
public class UsuarioRolDAO extends DAOGenerico<UsuarioRol, Integer> {
    
    public UsuarioRolDAO() {
        super(UsuarioRol.class);
    }
    
    /**
     * Roles de un usuario específico
     */
    @SuppressWarnings("unchecked")
    public List<UsuarioRol> findByUsuario(Integer idUsuario) {
        EntityManager em = getEM();
        try {
            return em.createQuery("FROM UsuarioRol WHERE idUsuario = :idUsuario ORDER BY rol")
                .setParameter("idUsuario", idUsuario)
                .getResultList();
        } catch (Exception e) {
            return null;
        }
    }
    
    /**
     * Verificar si usuario tiene rol específico
     */
    public boolean hasRol(Integer idUsuario, UsuarioRol.RolEnum rol) {
        EntityManager em = getEM();
        Long count = (Long) em.createQuery("SELECT COUNT(ur) FROM UsuarioRol ur WHERE ur.idUsuario = :idUsuario AND ur.rol = :rol")
            .setParameter("idUsuario", idUsuario)
            .setParameter("rol", rol)
            .getSingleResult();
        return count != null && count > 0;
    }
}

