package com.mycompany.sistemainventariov3.dao;

import com.mycompany.sistemainventariov3.model.Escaner;
import javax.persistence.EntityManager;
import java.util.List;

/**
 * DAO para la entidad Escaner
 */
public class EscanerDAO extends DAOGenerico<Escaner, String> {
    
    public EscanerDAO() {
        super(Escaner.class);
    }
    
    public Escaner buscarPorCodigoMegan(String codigoMegan) {
        EntityManager em = getEM();
        try {
            return (Escaner) em.createQuery("FROM Escaner WHERE codigoMegan = :codigo")
                    .setParameter("codigo", codigoMegan)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public Escaner buscarPorCodigoSbai(String codigoSbai) {
        EntityManager em = getEM();
        try {
            return (Escaner) em.createQuery("FROM Escaner WHERE codigoSbaiOriginal = :codigo")
                    .setParameter("codigo", codigoSbai)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public List<Escaner> buscarPorEstado(String estado) {
        EntityManager em = getEM();
        return em.createQuery("FROM Escaner WHERE estado = :estado")
                .setParameter("estado", estado)
                .getResultList();
    }
    
    public List<Escaner> buscarPorMarca(String marca) {
        EntityManager em = getEM();
        return em.createQuery("FROM Escaner WHERE marca LIKE :marca")
                .setParameter("marca", "%" + marca + "%")
                .getResultList();
    }
}
