const express = require("express");
const config = require('../config');
const { Pool } = require('pg');
const rutas = express.Router();

const BaseDatos = new Pool(config.connectionData);

//obtiene las plagas con sus respectivas etaspas que no han sido sometidas al borrado lógico.
var get_plagas = async() => {
    let consulta = `select * from "ETAPAS_PLAGA" 
    inner join 
    "PLAGA" on "ETAPAS_PLAGA".nombre_comun_plaga = "PLAGA".nombre_comun_plaga 
    where
    "PLAGA".fue_borrado = false and  "ETAPAS_PLAGA".fue_borrado = false`;
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

//obtiene la plaga con sus respectivas etaspas que no han sido sometidas al borrado lógico.
var get_plaga = async(nombre_comun_plaga) => {
    let consulta = `SELECT * FROM "ETAPAS_PLAGA" 
    where
    nombre_comun_plaga = '${nombre_comun_plaga}' and fue_borrado = false;`;
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta.rows;
}

var post_plaga = async(req) => {
    let values = "";
    let numero_etapas_plaga = req.body.nombre_etapa_plaga.length;
    let nombre_plaga_decode = decodeURIComponent(req.body.nombre_comun_plaga);
    for (let i = 0; i < numero_etapas_plaga; i = i + 1) {
        values = values + `('${decodeURIComponent(req.body.nombre_etapa_plaga[i])}','${nombre_plaga_decode}', 
                                    '${decodeURIComponent(req.body.procedimiento_etapa_plaga[i])}'),`
    }
    let consulta_plaga = `INSERT INTO public."PLAGA"(nombre_comun_plaga) VALUES 
            ('${nombre_plaga_decode}');`;
    let consulta_etapas = `INSERT INTO public."ETAPAS_PLAGA" 
            (nombre_etapa_plaga, nombre_comun_plaga, procedimiento_etapa_plaga)
            VALUES ${values}`;
    consulta_etapas = consulta_etapas.slice(0, -1) + ";";
    let consulta = `${consulta_plaga} ${consulta_etapas}`;
    console.log("consulta", consulta);
    const cliente_bd = await BaseDatos.connect();
    var resp = await cliente_bd.query(consulta);
    cliente_bd.release();
    console.log("resp", resp);
    return resp;
}

var eliminar_plaga = async(nombre_comun_plaga) => {
    let consulta = `UPDATE public."PLAGA"
	SET fue_borrado=true WHERE nombre_comun_plaga = '${nombre_comun_plaga}';`;
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

var actualizar_nombre_plaga = async(nombre_comun_plaga_nuevo, nombre_comun_plaga_viejo) => {
    let consulta = `UPDATE public."PLAGA"
	SET nombre_comun_plaga='${decodeURIComponent(nombre_comun_plaga_nuevo)}'
    WHERE nombre_comun_plaga='${nombre_comun_plaga_viejo}';`
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

var post_etapa_plaga = async(nombre_etapa_plaga, procedimiento_etapa_plaga, nombre_comun_plaga) => {
    let consulta = `INSERT INTO public."ETAPAS_PLAGA"(
    nombre_etapa_plaga, procedimiento_etapa_plaga, nombre_comun_plaga)
    VALUES ('${nombre_etapa_plaga}', '${procedimiento_etapa_plaga}', '${nombre_comun_plaga}');`
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

var actualizar_etapa_plaga = async(nombre_etapa_plaga, procedimiento_etapa_plaga, id_etapa_plaga) => {
    let consulta = `UPDATE public."ETAPAS_PLAGA" SET
    nombre_etapa_plaga = '${nombre_etapa_plaga}', procedimiento_etapa_plaga = '${procedimiento_etapa_plaga}'
    WHERE id_etapa_plaga = ${id_etapa_plaga};`
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

var eliminar_etapa_plaga = async(id_etapa_plaga) => {
    let consulta = `update public."ETAPAS_PLAGA" set fue_borrado = true
    where id_etapa_plaga = '${id_etapa_plaga}';`
    console.log(consulta);
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    return rta;
}

var actualizar_plaga = async(req, res) => {
    function estaVacio(elemento) {
        return elemento === '';
    }

    let algo_tratamiento = req.body.procedimiento_etapa_plaga.findIndex(estaVacio) == -1;
    let algo_etapas = req.body.nombre_etapa_plaga.findIndex(estaVacio) == -1;

    if (!req.params.nombre_comun_plaga || !algo_tratamiento || !algo_etapas) {
        res.status(400).send({ message: 'Ingrese todos los campos' });
    } else {
        try {
            rta = await get_plaga(req.params.nombre_comun_plaga);
        } catch (err) {
            console.log(err);
            res.status(500).send({ message: `Algo inesperado ocurrió obteniendo la plaga ${req.params["nombre_comun_plaga"]}.` })
        }

        let ids_viejos = rta.map(etapa => { return etapa.id_etapa_plaga });
        let ids_nuevos = req.body.ids_etapas_plaga;
        let procedimientos = req.body.procedimiento_etapa_plaga.map(procedimiento => { return decodeURIComponent(procedimiento) });
        let etapas = req.body.nombre_etapa_plaga.map(etapa => { return decodeURIComponent(etapa) });

        for (let i = 0; i < ids_nuevos.length; i++) {
            if (ids_nuevos[i] == -1) {
                //se agrega una nueva etapa en la bd's
                try {
                    rta = await post_etapa_plaga(etapas[i], procedimientos[i], req.params["nombre_comun_plaga"]);
                    if (!rta) {
                        res.status(400).send({ message: `No se pudo insertar la etapa de la plaga ${req.params["nombre_comun_plaga"]}` });
                    }
                } catch (err) {
                    res.status(500).send({ message: `Algo inesperado ocurrió tratando de agregar una nueva etapa en la ${req.params["nombre_comun_plaga"]}` })
                    console.log(err);
                };
            } else {
                //se modifica una etapa que ya estaba en la bd's
                try {
                    rta = await actualizar_etapa_plaga(etapas[i], procedimientos[i], ids_nuevos[i]);
                    if (!rta) {
                        res.status(400).send({ message: `No se pudo actualizar la etapa de la plaga ${req.params["nombre_comun_plaga"]}` });
                    }
                } catch (err) {
                    res.status(500).send({ message: `Algo inesperado ocurrió actualizando la etapa de la plaga ${req.params["nombre_comun_plaga"]}` })
                    console.log(err);
                };
            }
        }
        for (let i = 0; i < ids_viejos.length; i++) {
            if (!ids_nuevos.includes(ids_viejos[i])) {
                //hago un borrado lógico
                try {
                    rta = await eliminar_etapa_plaga(ids_viejos[i]);
                    if (!rta) {
                        res.status(400).send({ message: `No se pudo eliminar la etapa de la plaga ${req.params["nombre_comun_plaga"]}.` });
                    }
                } catch (err) {
                    res.status(500).send({ message: `Algo inesperado ocurrió eliminando la etapa de la plaga ${req.params["nombre_comun_plaga"]}.` });
                    console.log(err);
                };
            }
        }
        try {
            rta = await actualizar_nombre_plaga(req.body.nombre_comun_plaga, req.params["nombre_comun_plaga"])
            if (!rta) {
                res.status(400).send({ message: `No se pudo editar el nombre de la plaga ${req.params["nombre_comun_plaga"]}.` });
            }
        } catch (err) {
            res.status(500).send({ message: `Algo inesperado ocurrió eliminando la etapa de la plaga ${req.params["nombre_comun_plaga"]}.` });
            console.log(err);
        };
        res.status(200).send({ message: `Se editó correctamente la plaga.` });
    }
}

rutas.route('/plagas')
    .get((req, res) => {
        get_plagas().then(rta => {
            if (!rta) {
                res.status(400).send({ message: 'No se pudo obtener el listado de plagas' });
            } else {
                res.status(200).send(rta.rows);
            }
        }).catch(
            err => { res.status(400).send({ message: 'Algo inesperado ocurrió' }); }
        )
    })
    .post((req, res) => {
        console.log("body", req.body);

        function estaVacio(elemento) {
            return elemento === '';
        }
        //si es TRUE es pq el array req.body.tratamiento_etapa_enfermedad tiene elementos
        //console.log("tipo de variable", typeof req.body.procedimiento_etapa_plaga);
        algo_tratamiento = req.body.procedimiento_etapa_plaga.findIndex(estaVacio) == -1;
        algo_etapas = req.body.nombre_etapa_plaga.findIndex(estaVacio) == -1;
        /*console.log("algo_tratamiento", algo_tratamiento);
        console.log("algo_etapas", algo_etapas);
        console.log("req.body.nombre_comun_plaga", req.body.nombre_comun_plaga);
        console.log(req.body);
        console.log("etpas", req.body.etapas_enfermedad.length);
        console.log("trta", req.body.tratamiento_etapa_enfermedad.length);*/
        if (!req.body.nombre_comun_plaga || !algo_tratamiento || !algo_etapas) {
            res.status(400).send({ message: 'Ingrese todos los campos' });
        } else {
            post_plaga(req).then(rta => {
                console.log("rta en post", rta);
                if (!rta) {
                    res.status(400).send({ message: 'No se pudo insertar la plaga' });
                } else {
                    res.status(200).send({ message: 'Se agregó correctamente' });
                }
            }).catch(err => {
                res.status(500).send({ message: 'Algo inesperado ocurrió' })
                console.log(err);
            });
        }
    })

rutas.route('/plaga/:nombre_comun_plaga')
    .get((req, res) => {
        get_plaga(decodeURIComponent(req.params.nombre_comun_plaga)).then(rta => {
            if (!rta) {
                res.status(400).send({ message: 'No se pudo obtener la plaga.' });
            } else {
                //res.status(200).send(rta.map(etapa => { return etapa.id_etapa_plaga }));
                res.status(200).send(rta);
                console.log(rta);
            }
        }).catch(err => {
            console.log(err);
            res.status(500).send({ message: 'Algo inesperado ocurrió.' })
        })
    })
    .delete((req, res) => {
        eliminar_plaga(decodeURIComponent(req.params["nombre_comun_plaga"])).then(rta => {
            console.log("req.params", req.params);
            if (!rta) {
                res.status(400).send({ message: 'No se pudo eliminar la plaga.' });
            } else {
                res.status(200).send({ message: 'Se eliminó la plaga.' });
            }
        }).catch(err => {
            console.log(err);
            console.log("req.params", req.params);
            res.status(500).send({ message: 'Algo inesperado ocurrió.' })
        })
    })
    .put((req, res) => {

        actualizar_plaga(req, res).then(rta => {

        })
    })

module.exports = rutas;