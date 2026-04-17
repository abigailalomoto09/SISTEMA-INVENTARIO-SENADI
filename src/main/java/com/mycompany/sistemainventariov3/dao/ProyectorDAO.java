package com.mycompany.sistemainventariov3.dao;

import com.mycompany.sistemainventariov3.model.Proyector;
import javax.persistence.EntityManager;
import java.util.List;

public class ProyectorDAO extends DAOGenerico<Proyector, String> {

    public ProyectorDAO() {
        super(Proyector.class);
    }

    public Proyector buscarPorCodigoMegan(String codigoMegan) {
        EntityManager em = getEM();
        try {
            return (Proyector) em.createQuery("FROM Proyector WHERE codigoMegan = :codigo").setParameter("codigo", codigoMegan).getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }

    public Proyector buscarPorCodigoSbai(String codigoSbai) {
        EntityManager em = getEM();
        try {
            return (Proyector) em.createQuery("FROM Proyector WHERE codigoSbaiOriginal = :codigo").setParameter("codigo", codigoSbai).getSingleResult();
        } catch (javax.persistence.NoResultException e) {
            return null;
        }
    }

    public List<Proyector> buscarPorEstado(String estado) {
        EntityManager em = getEM();
        return em.createQuery("FROM Proyector WHERE estado = :estado").setParameter("estado", estado).getResultList();
    }

    public List<Proyector> buscarPorMarca(String marca) {
        EntityManager em = getEM();
        return em.createQuery("FROM Proyector WHERE marca LIKE :marca").setParameter("marca", "%" + marca + "%").getResultList();
    }
}
