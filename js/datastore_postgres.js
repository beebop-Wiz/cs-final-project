const { Client } = require('pg');
const randomstring = require('randomstring');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'csproj',
    password: 'tmp!foo'
});

exports.getClassesOwnedByUser = function (id, callback = (err, classes) => { }) {
    client.query('SELECT * FROM classes WHERE creator=$1', [id], (err, q) => {
        if (err) {
            console.log(err);
            callback(err, undefined);
        } else {
            callback(err, q.rows);
        }
    });
}

exports.getEnrolledClasses = function (id, callback = (err, classes => { })) {
    client.query('SELECT * FROM classes WHERE id = (SELECT class FROM studentclasses WHERE student=$1)', [id], (err, q) => {
        if(err) {
            console.log(err);
            callback({type: 'postgres', data:err}, undefined);
        } else {
            callback(err, q.rows);
        }
    });
}

exports.checkClassNameExists = function (name, callback = (err, exists) => { }) {
    client.query('SELECT COUNT(*) FROM classes WHERE name=$1', [name], (err, q) => {
        if (err) {
            console.log(err);
            callback(err, undefined);
        } else {
            callback(err, q.rows[0].count > 0);
        }
    });
}

exports.createClass = function (owner, name, callback = (err, cid) => { }) {
    var code = randomstring.generate({ // TODO collisions
        length: 8,
        charset: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    });
    client.query('INSERT INTO classes (creator, name, code) VALUES ($1, $2, $3) RETURNING id', [owner, name, code], (err, q) => {
        if (err) {
            console.log(err);
            callback(err, undefined);
        } else {
            callback(err, q.rows[0].id);
        }
    });
}

exports.getClassInfo = function (id, callback = (err, info) => { }) {
    client.query('SELECT * FROM classes WHERE id=$1', [id], (err, q) => {
        if (err) {
            console.log(err);
            callback(err, undefined);
        } else {
            callback(err, q.rows[0]);
        }
    });
}

exports.getClassByCode = function (code, callback = (err, id) => { }) {
    client.query('SELECT id FROM classes WHERE code=$1::text', [code], (err, q) => {
        if (err) {
            console.log(err);
            callback({ 'type': 'postgres', data: err }, undefined);
        } else if (q.rowCount != 1) {
            console.log(err);
            callback({ 'type': 'invalid', data: { 'reason': 'nonexistent-class' } }, undefined);
        } else {
            console.log(q.rows[0].id);
            callback(err, q.rows[0].id);
        }
    });
}

exports.addToClass = function (student, cl, callback = (err, success) => { }) {
    client.query('SELECT COUNT(*) FROM classes WHERE id=$1::integer AND accept=true', [cl], (err, q) => {
        if (err) {
            console.log(err);
            callback({ type: 'postgres', data: err }, false);
        } else if (q.rows[0].count != 1) {
            callback({ type: 'invalid', data: { 'reason': 'nonexistent-class' } }, false);
        } else {
            client.query('INSERT INTO studentclasses (student, class) VALUES ($1, $2)', [student, cl], (err, q) => {
                if (err) {
                    console.log(err);
                    callback({ type: 'postgres', data: err }, false);
                } else {
                    callback(err, true);
                }
            });
        }
    });
}

exports.getStudentsForClass = function(cl, callback = (err, students) => {}) {
    client.query('SELECT users.id,email,admin,name FROM users JOIN studentclasses ON (users.id = studentclasses.student) WHERE class=$1', [cl], (err, q) => {
        if(err) {
            console.log(err);
            callback({type:'postgres', data:err}, undefined);
        } else {
            callback(err, q.rows);
        }
    })
}

exports.commitTransaction = function (callback = (err) => { }) {
    client.query('COMMIT', (err) => {
        if (err) console.log(err);
        callback(err);
    });
}

exports.openTransaction = function (callback = (err) => { }) {
    client.query('BEGIN', (err) => {
        if (err) exports.rollbackTransaction();
        callback(err);
    });
}

exports.rollbackTransaction = function () {
    client.query('ROLLBACK', (err) => {
        if (err) console.log(err);
    });
}

exports.init = function () {
    client.connect();
}