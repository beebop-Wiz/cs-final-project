const { Client } = require('pg');
const hash = require('password-hash');

const client = new Client({
    user: 'beebop',
    host: '/var/run/postgresql',
    database: 'csproj',
    password: undefined,
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

exports.newuser = function (req, res, code, callback = (valid, data) => { }) {
    var email = req.body.email;
    var pass = req.body.pass;
    var name = req.body.name;
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
                    client.query('INSERT INTO users (email, pwhash, admin, name) VALUES ($1, $2, $3, $4::text) RETURNING id', [email, pwh, false, name], (err, q) => {
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
