package com.mycompany.sistemainventariov3.dao;

import com.mycompany.sistemainventariov3.model.Impresora;
import javax.persistence.EntityManager;
import java.util.List;

/**
 * DAO para la entidad Impresora
 */
public class ImpresoraDAO extends DAOGenerico<Impresora, String> {
    
    public ImpresoraDAO() {
        super(Impresora.class);
    }
    
    public Impresora buscarPorCodigoMegan(String codigoMegan) {
        EntityManager em = getEM();
        try {
            return (Impresora) em.createQuery("FROM Impresora WHERE codigoMegan = :codigo")
                    .setParameter("codigo", codigoMegan)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public Impresora buscarPorCodigoSbai(String codigoSbai) {
        EntityManager em = getEM();
        try {
            return (Impresora) em.createQuery("FROM Impresora WHERE codigoSbaiOriginal = :codigo")
                    .setParameter("codigo", codigoSbai)
                    .getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }
    
    public List<Impresora> buscarPorEstado(String estado) {
        EntityManager em = getEM();
        return em.createQuery("FROM Impresora WHERE estado = :estado")
                .setParameter("estado", estado)
                .getResultList();
    }
    
    public List<Impresora> buscarPorMarca(String marca) {
        EntityManager em = getEM();
        return em.createQuery("FROM Impresora WHERE marca LIKE :marca")
                .setParameter("marca", "%" + marca + "%")
                .getResultList();
    }
}
