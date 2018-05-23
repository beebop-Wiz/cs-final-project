const https = require('https');
const http = require('http');
const fs = require('fs');
const express = require('express');
const session = require('client-sessions');
const pug = require('pug');
const body_parser = require('body-parser');

const auth = require('./auth_postgres.js'); // this can be changed to use other authentication methods; for example, one could create auth_ldap.js
const datastore = require('./datastore_postgres.js');


const options = {
    // TODO: CHANGE ME!
    key: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/cert.pem')
};

const app = express();
// TODO: CHANGE ME!
const WEBROOT = '/home/beebop/src/cs-final-project/html/';

app.set('views', '../views');
app.set('view engine', 'pug');

app.use(session({
    cookieName: 'session',
    secret: "asdf-ghjkl", 	// TODO: generate an actual secret
                                // might want to generate per server run?
    duration: 2 * 60 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));


app.use(body_parser.urlencoded({ extended: true }));

function renderError(req, res, err) {
    res.render('error', { err: err });
}

app.get('/', (req, res) => {
    // TODO: The index page should be updated to handle errors with renderError
    if (req.session && req.session.showlogout) {
        res.render('index', { showlogout: true });
        req.session.reset();
    } else if (req.session && req.session.showlogfail) {
        res.render('index', { showlogfail: true });
        req.session.reset();
    } else if (req.session && req.session.showjoinerr) {
        res.render('index', { showjoinerr: true, error: req.session.error }); // TODO: convert login errors to this format
        req.session.reset();
    } else {
        res.render('index');
    }
});

app.get('/class', (req, res) => {
    if (req.session && req.session.admin) {
        var p_cl = datastore.getClassInfo(req.query.id);
        var p_students = p_cl.then(cl => datastore.getStudentsForClass(cl.id));
        var p_assignments = p_cl.then(cl => datastore.getAssignmentsForClass(cl.id));
        Promise.all([p_cl, p_students, p_assignments]).then(([cl, students, assignments]) => {
            res.render('class_admin', { user: req.session.user, info: cl, students: students, assignments: assignments });
        }).catch(err => {
            renderError(req, res, err);
        });
    } else if (req.session) {

	// This code was commented out because it stopped working and I couldn't figure out why in 10 minutes.
	// It is a better way of doing the thing so could definitely be fixed.
	
        // var p_cl = datastore.getClassInfo(req.query.id) ;
        // var p_assignments = p_cl.then(datastore.getAssignmentsForClassWithCompletion(req.query.id, req.session.id));
        // Promise.all([p_cl, p_assignments])
        //     .then(([cl, assignments]) => {
        //         res.render('class', { user: req.session.user, info: cl, assignments: assignments });
        //     }).catch(err => {
        //         renderError(req, res, err);
        //     });
	datastore.getClassInfo(req.query.id).then((cl) => {
	    datastore.getAssignmentsForClassWithCompletion(req.query.id, req.session.id).then((assignments) => {
		res.render('class', { user: req.session.user, info: cl, assignments: assignments });
	    });
	});
    } else {
        res.redirect('/');
    }
});

app.get('/student', (req, res) => {
    if (req.session && req.session.admin) {
        var p_student = datastore.getStudentInfo(req.query.id);
        var p_cl = datastore.getClassInfo(req.query.cl);
        Promise.all([p_cl, p_student])
            .then(([cl, student]) => {
                return datastore.getAssignmentsForClassWithCompletion(cl.id, req.query.id)
                    .then(assignments => {
                        res.render('student', { user: req.session.user, info: cl, assignments: assignments, student: student })
                    });
            }).catch(err => {
                renderError(req, res, err);
            });
    } else {
        res.redirect('/');
    }
});

app.post('/newclass', (req, res) => {
    if (req.session && req.session.admin) {
        datastore.checkClassNameExists(req.body.name, (err, exists) => {
            if (err) renderError(req, res, err);
            else if (exists) {
                req.session.showclassexists = true;
                res.redirect('/newclass');
            } else {
                datastore.createClass(req.session.id, req.body.name, (err, cid) => {
                    if (err) renderError(req, res, err);
                    else res.redirect('/class?id=' + cid);
                });
            }
        });
    } else {
        res.redirect('/');
    }
});

app.get('/newclass', (req, res) => {
    if (req.session && req.session.admin) {
        res.render('newclass', { user: req.session.user, classfail: req.session.showclassexists });
        req.session.showclassexists = false;
    } else {
        res.redirect('/');
    }
});

function renderAdminDashboard(req, res) {
    datastore.getClassesOwnedByUser(req.session.id, (err, classes) => {
        res.render('dashboard_admin', { user: req.session.user, classes: classes });
    });
}

function renderDashboard(req, res) {
    datastore.getEnrolledClasses(req.session.id, (err, classes) => {
        res.render('dashboard', { user: req.session.user, classes: classes });
    });
}

app.get('/dashboard', (req, res) => {
    if (req.session && req.session.user) {
        if (req.session.admin)
            renderAdminDashboard(req, res);
        else
            renderDashboard(req, res);
    } else {
        req.session.reset();
        res.redirect('/');
    }
});

app.post('/login', (req, res) => {
    auth.auth(req, res, (valid, data) => {
        console.log("auth: " + valid);
        if (valid) {
            req.session.user = data.name;
            req.session.admin = data.admin;
            console.log(req.session.admin);
            req.session.id = data.id;
            res.redirect('/dashboard');
            process.stdout.write(req.session.user + '\n');
        } else {
            req.session.reset();
            req.session.showlogfail = true;
            res.redirect('/');
        }
    });
});

app.get('/newuser', (req, res) => {
    datastore.getClassByCode(req.query.code, (err, cl) => {
        if (cl) {
            req.session.code = req.query.code;
            res.render('newuser');
        } else {
            req.session.reset();
            req.session.showjoinerr = true;
            req.session.error = err;
            res.redirect('/');
        }
    });
});

app.get('/newassign', (req, res) => {
    res.render('newassign', { user: req.session.user, classid: req.query.class });
});

app.post('/newassign', (req, res) => {
    console.log(JSON.stringify(req.body));
    var words = [];
    for (var i = 1; req.body["word_" + i] != undefined; i++) {
        words[i - 1] = req.body["word_" + i];
    }
    var assign_data = {
        wc_min: req.body.wc_min,
        wc_max: req.body.wc_max,
        words: words
    };
    console.log(JSON.stringify(assign_data));
    datastore.addAssignment(req.body.title, req.session.id, req.body.class, assign_data, req.body.date)
        .then(function () { res.redirect('/class?id=' + req.body.class) })
        .catch(err => { renderError(req, res, err) });
});

app.get('/submission', (req, res) => {
    if (req.session.admin) {
        var p_sub = datastore.getSubmission(req.query.id);
        var p_assign = p_sub.then(sub => datastore.getAssignment(sub.assignment));
        Promise.all([p_sub, p_assign])
            .then(([sub, assign]) => {
                res.render("submission", { user: req.session.user, sub: sub, assignment: assign, admin: true });
            }).catch(err => {
                renderError(req, res, err);
            });
    } else if (req.session.id) {
        var p_sub = datastore.getSubmission(req.query.id);
        var p_assign = p_sub.then(sub => datastore.getAssignment(sub.assignment));
        Promise.all([p_sub, p_assign])
            .then(([sub, assign]) => {
                res.render("submission", { user: req.session.user, sub: sub, assignment: assign });
            }).catch(err => {
                renderError(req, res, err);
            });
    } else {
        res.redirect('/');
    }
});

app.get('/assign', (req, res) => {
    if (req.session.admin) {
        var p_assign = datastore.getAssignment(req.query.id);
        var p_subs = p_assign.then(assign => datastore.getSubmissionsByAssignment(assign.id));
        Promise.all([p_assign, p_subs])
            .then(([assign, subs]) => {
                res.render("assign_admin", { user: req.session.user, assignment: assign, subs: subs });
            }).catch(err => {
                renderError(req, res, err);
            });
    } else {
        datastore.getAssignment(req.query.id)
            .then(assign => {
                res.render("assign", { user: req.session.user, assignment: assign });
            })
            .catch(err => {
                renderError(req, res, err);
            })
    }
});

app.post('/assign', (req, res) => {
    // TODO validation
    datastore.submitAssignment(req.session.id, req.body.id, req.body.sub, (err, success) => {
        res.redirect('/dashboard');
    });
});

app.post('/join', (req, res) => {
    auth.newuser(req, res, req.session.code, (valid, data) => {
        console.log("/join callback");
        if (valid) {
            req.session.user = req.body.email;
            req.session.id = data.id;
            datastore.getClassByCode(req.session.code, (err, cl) => {
                datastore.addToClass(data.id, cl, (err, success) => {
                    if (success) {
                        res.redirect('dashboard');
                    } else {
                        req.session.reset();
                        req.session.showjoinerr = true;
                        req.session.error = err;
                        console.log(err);
                        res.redirect('/');
                    }
                });
            });
        } else {
            req.session.reset();
            req.session.showjoinerr = true;
            req.session.error = data;
            res.redirect('/');
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.reset();
    req.session.showlogout = true;
    res.redirect('/');
});

auth.init();
datastore.init();
https.createServer(options, app).listen(443);
//http.createServer(app).listen(80);
