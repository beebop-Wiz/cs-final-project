const { Client } = require('pg');
const randomstring = require('randomstring');

const client = new Client({
    user: 'beebop',
    host: '/var/run/postgresql',
 //   host: 'localhost',
    database: 'csproj',
    password: 'undefined'
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
        if (err) {
            console.log(err);
            callback({ type: 'postgres', data: err }, undefined);
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
    client.query('INSERT INTO classes (creator, name, code, accept) VALUES ($1, $2, $3, true) RETURNING id', [owner, name, code], (err, q) => {
        if (err) {
            console.log(err);
            callback(err, undefined);
        } else {
            callback(err, q.rows[0].id);
        }
    });
}

exports.getClassInfo = function (id) {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM classes WHERE id=$1', [id], (err, q) => {
            if (err) {
                console.log(err);
                reject({ 'type': 'postgres', data: err, source: 'getClassInfo' });
            } else if (q.rows[0]) {
                resolve(q.rows[0]);
            } else {
                reject({ 'type': 'invalid', data: { 'reason': 'nonexistent-class' }, source: 'getClassInfo' });
            }
        });
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

exports.addAssignment = function (title, owner, cl, assign, date) {
    return new Promise((resolve, reject) => {
        client.query('INSERT INTO assignments (title, owner, class, assign, due_date) VALUES ($1, $2, $3, $4, $5)', [title, owner, cl, assign, date], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err });
            } else {
                resolve();
            }
        });
    });
}

exports.getAssignmentsForClass = function (cl) {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM assignments WHERE class=$1', [cl], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err });
            } else {
                resolve(q.rows);
            }
        });
    });
}

exports.getAssignmentsForClassWithCompletion = function (cl, student) {
    return new Promise((resolve, reject) => {
        client.query('SELECT assignments.id,title,owner,class,date,due_date,submissions.id AS sub FROM assignments'
            + ' LEFT OUTER JOIN submissions ON (submissions.assignment = assignments.id AND submissions.student = $1) WHERE class=$2 ORDER BY due_date', [student, cl], (err, q) => {
                if (err) {
                    console.log(err);
                    reject({ type: 'postgres', data: err });
                } else {
		    console.log(cl);
		    console.log(student);
		    console.log(q.rows);
                    resolve(q.rows);
                }
            });
    });
}

exports.getAssignment = function (id) {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM assignments WHERE id=$1', [id], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err });
            } else {
                resolve(q.rows[0]);
            }
        });
    });
}

exports.submitAssignment = function (user, assign, text, callback = (err, success) => { }) {
    client.query('INSERT INTO submissions (student, assignment, value) VALUES ($1, $2, $3) ON CONFLICT (student, assignment) DO UPDATE SET value = EXCLUDED.value, date = CURRENT_TIMESTAMP', [user, assign, text], (err, q) => {
        if (err) {
            console.log(err);
            callback({ type: 'postgres', data: err }, false);
        } else {
            callback(err, true);
        }
    });
}

exports.getSubmissionsByAssignment = function (assign) {
    return new Promise((resolve, reject) => {
        client.query('SELECT submissions.id,date,student,assignment,value,users.name FROM submissions JOIN users ON (users.id = submissions.student) WHERE assignment=$1 ORDER BY date', [assign], (err, q) => {
            if (err) {
                reject({ type: 'postgres', data: err });
            } else {
                resolve(q.rows);
            }
        });
    });
}

exports.getSubmission = function (id) {
    return new Promise((resolve, reject) => {
        client.query('SELECT submissions.id,date,student,assignment,value,users.name FROM submissions JOIN users ON (users.id = submissions.student) WHERE submissions.id=$1', [id], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err });
            } else {
                resolve(q.rows[0]);
            }
        });
    });
}

exports.getStudentsForClass = function (cl) {
    return new Promise((resolve, reject) => {
        client.query('SELECT users.id,email,admin,name FROM users JOIN studentclasses ON (users.id = studentclasses.student) WHERE class=$1', [cl], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err, source: 'getStudentsForClass' });
            } else {
                resolve(q.rows);
            }
        })
    });
}

exports.getStudentInfo = function (id) {
    return new Promise((resolve, reject) => {
        client.query('SELECT * FROM users WHERE id=$1', [id], (err, q) => {
            if (err) {
                console.log(err);
                reject({ type: 'postgres', data: err });
            } else if (q.rowCount == 0) {
                reject({ 'type': 'invalid', data: { 'reason': 'nonexistent-student' } });
            } else {
                resolve(q.rows[0]);
            }
        });
    });
}

exports.init = function (errcb) {
    client.connect();
}
