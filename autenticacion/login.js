const express = require('express');
const bcrypt = require('bcryptjs');
const auth_util = require('./util');
const config = require('../config');

const rutas = express.Router();

rutas.post('/login', function(req, res) {
    auth_util.get_usuario(req.body.cc_usuario).then(user => {
        //console.log("user", user);
        if (!user) {
            res.status(401).send({ success: false, message: "Usuario o contraseña incorrectos" });
        } else {
            if (user.validado) {
                bcrypt.compare(req.body.contrasena_usuario, user.contrasena_usuario, (err, isValid) => {
                    if (err) {
                        res.status(501).send({ message: "Error inesperado" });
                    }
                    if (!isValid) {
                        res.status(401).send({ success: false, message: "Usuario o contraseña incorrectos" });
                    } else {
                        const fecha_creacion_ms = Date.now();
                        const fecha_expiracion_ms = fecha_creacion_ms + config.auth.token_duration_minutes * 60000; //milisegundos
                        const signedToken = auth_util.generar_token(user.cc_usuario, user.rol);

                        res.status(200).send({
                            success: true,
                            token: signedToken,
                            rol: user.rol,
                            vence: fecha_expiracion_ms,
                            creacion: fecha_creacion_ms
                        });
                    }
                })
            } else {
                res.status(401).send({ success: false, message: "El usuario no ha sido validado por un administrador" });
            }
        }
    }).catch(err => {
        console.log(err);
        res.status(501).send({ message: "Ha ocurrido un error, intentelo más tarde!" })
    })
});

module.exports = rutas;