const { Client } = require('pg');
const hash = require('password-hash');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'csproj',
    password: 'tmp!foo'
});

exports.auth = function (req, res, callback) {
    var email = req.body.email;
    var pass = req.body.pass;
    console.log("`" + pass + "`");
    return client.query('SELECT * FROM users WHERE email=$1::text', [email], (err, q) => {
        if (err) console.log(err)
        else {
            if (q.rowCount != 1) callback(false);
            var ph = q.rows[0].pwhash;
            console.log("`" + ph + "`");
            callback(hash.verify(pass, ph), q.rows[0]);
        }
    });
}

exports.newuser = function (req, res, callback = (valid, data) => { }) {
    var email = req.body.email;
    var pass = req.body.pass;
    var code = req.body.code;
    var fail = false;

    client.query('SELECT COUNT(*) FROM users WHERE email=$1::text', [email], (err, q) => {
        if (err) {
            console.log(err);
            callback(false, { err: "postgres" });
        } else if (q.rows[0].count > 0) {
            callback(false, { err: "duplicate-email" });

        } else {
            client.query('SELECT COUNT(*) FROM classes WHERE code=$1::text AND accept=true', [code], (err, q) => {
                if (err) {
                    console.log(err);
                    callback(false, { err: "postgres" });
                    fail = true;
                } else if (q.rows[0].count <= 0) {
                    callback(false, { err: "invalid-code" });
                    fail = true;
                } else {
                    var pwh = hash.generate(pass, { algorithm: 'sha256' });
                    client.query('INSERT INTO users (email, pwhash, admin) VALUES ($1, $2, $3) RETURNING id', [email, pwh, false], (err, q) => {
                        callback(true, { id: q.rows[0].id });
                    });
                }
            });
        }
    });


}


exports.init = function () {
    client.connect();
}