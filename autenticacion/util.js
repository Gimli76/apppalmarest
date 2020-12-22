const express = require("express");
const passport = require('passport');
const jsonwebtoken = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
//dos librerias necesarias para la configuración del passport-jwt
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
//librerias para establecer la conexión a la base de datos
const { Pool } = require('pg');
const config = require('../config');
const BaseDatos = new Pool(config.connectionData);

const rutas = express.Router();

const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: config.auth.PUB_KEY,
    algorithms: ['RS256']
};

passport.use(new JwtStrategy(options, function (jwt_payload, done) {
    return done(null, { cc_usuario: jwt_payload.sub, rol_usuario: jwt_payload.rol });
}));

const get_usuario = async (cc_usuario) => {
    let consulta = `SELECT cc_usuario, contrasena_usuario, rol, validado FROM "USUARIO" WHERE cc_usuario = '${cc_usuario}';`;
    const cliente_bd = await BaseDatos.connect();
    let rta = await cliente_bd.query(consulta);
    cliente_bd.release();
    let user = rta.rows[0];
    return user;
}

const encriptar_clave = (clave) => {
    return bcrypt.hashSync(clave, config.auth.password_salt_rounds);
}

const generar_token = (cc_usuario, rol) => {
    const payload = { sub: cc_usuario, rol: rol };

    return jsonwebtoken.sign(payload,
        config.auth.PRIV_KEY, {
        expiresIn: config.auth.token_duration_minutes * 60,  // segundos
        notBefore: "0d",
        algorithm: 'RS256'
    }
    );
}

// Si el usuario envía un token válido y tiene alguno de los roles indicados en el arreglo 'roles',
// se cargan los datos req.account.cc_usuario y req.account.rol_usuario.
// Si el token no es válido o el usuario no tiene el rol necesario, se envía un mensaje de error.
const authorize = (roles) => {
    // 'roles' debe ser un arreglo
    if (!Array.isArray(roles)) {
        console.log(global.process.module.filename, "authorize(roles):", "'roles' no es un arreglo.")
        return null;
    }
    return [
        passport.authorize('jwt', { session: false }),
        function (req, res, next) {
            token_user = req.account;
            if (!token_user) {
                res.status(401).send({ success: false, message: "La sesión no es válida o ha expirado" })
            } else {
                get_usuario(token_user.cc_usuario).then(db_user => {
                    if (!db_user) {
                        res.status(401).send({ success: false, message: "No existe el usuario en nuestra base de datos" });
                    } else {
                        if (roles.length && !roles.includes(db_user.rol)) {
                            // Si 'roles' es vacío, asumo que todos los roles tienen permiso.
                            res.status(403).send({ success: false, message: "El usuario no está autorizado a realizar esta acción" });
                        } else {
                            next();
                        }
                    }
                });
            }
        }];
}

// Util endpoint to hash some text
// Requires a json of the form:
// {
//   contrasenia: "yourock"
// }
// IMPORTANT: this must be disabled for production!
rutas.post('/test/encriptar', (req, res) => {
    console.log("req", req);
    if (!req.body["contrasenia"]) {
        res.status(400).send({
            message: 'Se requiere el campo "contrasenia"'
        });
    } else {
        res.status(200).send({
            message: `${encriptar_clave(req.body.contrasenia)}`
        });
    }
});

// Testeo autorización al rol "user"
rutas.get('/test/authorize/user', authorize(["user"]), function (req, res) {
    console.log(req.account.cc_usuario);
    res.status(200).send({ success: true, cc_usuario: req.account.cc_usuario, rol: req.account.rol_usuario })
});

// Testeo autorización a cualquier rol
rutas.get('/test/authorize', authorize([]), function (req, res) {
    console.log(req.account.cc_usuario);
    res.status(200).send({ success: true, cc_usuario: req.account.cc_usuario, rol: req.account.rol_usuario })
});

// Testeo autorización al rol "admin"
rutas.get('/test/authorize/admin', authorize(["admin"]), function (req, res) {
    console.log(req.account.cc_usuario);
    res.status(200).send({ success: true, cc_usuario: req.account.cc_usuario, rol: req.account.rol_usuario })
});

// Testeo autorización al rol "user" y "admin"
rutas.get(['/test/authorize/admin/user', '/test/authorize/user/admin'], authorize(["admin", "user"]), function (req, res) {
    console.log(req.account.cc_usuario);
    res.status(200).send({ success: true, cc_usuario: req.account.cc_usuario, rol: req.account.rol_usuario })
});

// Testear error al no ingresar un arreglo
/*rutas.get('/test/authorize/error', authorize(), function (req, res) {
    console.log(req.account.cc_usuario, req.account.rol_usuario);
    res.status(200).send({ success: true, cc_usuario: req.account.cc_usuario, rol: req.account.rol_usuario })
});*/

module.exports = {
    generar_token,
    authorize,
    encriptar_clave,
    get_usuario,
    rutas
};