const https = require('https');
const http = require('http');
const fs = require('fs');
const express = require('express');
const session = require('client-sessions');
const pug = require('pug');
const body_parser = require('body-parser');

const auth = require('./auth_postgres.js'); // this can be changed to use other authentication methods; for example, one could create auth_ldap.js
const datastore = require('./datastore_postgres.js');


/*const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/cert.pem')
};*/

const app = express();
const WEBROOT = '/home/beebop/src/cs-final-project/html/';

app.set('views', '../views');
app.set('view engine', 'pug');

app.use(session({
    cookieName: 'session',
    secret: "asdf-ghjkl", 	// FIXME
    duration: 2 * 60 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));


app.use(body_parser.urlencoded({ extended: true }));

app.get('/', (req, res) => {
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
        datastore.getClassInfo(req.query.id, (err, cl) => {
            if (err || !cl) res.redirect('/dashboard');
            else res.render('class_admin', { user: req.session.user, info: cl });
        });
    } else if(req.session) {
        datastore.getClassInfo(req.query.id, (err, cl) => {
            if (err || !cl) res.redirect('/dashboard');
            else res.render('class', { user: req.session.user, info: cl });
        });
    } else {
        res.redirect('/');
    }
});

app.post('/newclass', (req, res) => {
    if (req.session && req.session.admin) {
        datastore.checkClassNameExists(req.body.name, (err, exists) => {
            if (exists) {
                req.session.showclassexists = true;
                res.redirect('/newclass');
            } else {
                datastore.createClass(req.session.id, req.body.name, (err, cid) => {
                    res.redirect('/class?id=' + cid);
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
            req.session.user = req.body.email;
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

app.post('/join', (req, res) => {
    datastore.openTransaction();
    auth.newuser(req, res, (valid, data) => {
        console.log("/join callback");
        if (valid) {
            req.session.user = req.body.email;
            req.session.id = data.id;
            datastore.getClassByCode(req.body.code, (err, cl) => {
                datastore.addToClass(data.id, cl, (err, success) => {
                    if (success) {
                        datastore.commitTransaction();
                        res.redirect('dashboard');
                    } else {
                        datastore.rollbackTransaction();
                        req.session.reset();
                        req.session.showjoinerr = true;
                        req.session.error = err;
                        console.log(err);
                        res.redirect('/');
                    }
                });
            });
        } else {
            datastore.rollbackTransaction();
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
//https.createServer(options, app).listen(443);
http.createServer(app).listen(80);
