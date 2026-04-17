package com.mycompany.sistemainventariov3.dao;

import com.mycompany.sistemainventariov3.model.Telefono;
import javax.persistence.EntityManager;
import java.util.List;

/**
 * DAO para la entidad Telefono
 */
public class TelefonoDAO extends DAOGenerico<Telefono, String> {
    
    public TelefonoDAO() {
        super(Telefono.class);
    }
    
    public Telefono buscarPorCodigoMegan(String codigoMegan) {
        EntityManager em = getEM();
        try {
            return (Telefono) em.createQuery("FROM Telefono WHERE codigoMegan = :codigo")
                    .setParameter("codigo", codigoMegan)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public Telefono buscarPorCodigoSbai(String codigoSbai) {
        EntityManager em = getEM();
        try {
            return (Telefono) em.createQuery("FROM Telefono WHERE codigoSbaiOriginal = :codigo")
                    .setParameter("codigo", codigoSbai)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public List<Telefono> buscarPorEstado(String estado) {
        EntityManager em = getEM();
        return em.createQuery("FROM Telefono WHERE estado = :estado")
                .setParameter("estado", estado)
                .getResultList();
    }
    
    public List<Telefono> buscarPorMarca(String marca) {
        EntityManager em = getEM();
        return em.createQuery("FROM Telefono WHERE marca LIKE :marca")
                .setParameter("marca", "%" + marca + "%")
                .getResultList();
    }
}
