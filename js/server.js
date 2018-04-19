const https = require('https');
const fs = require('fs');
const express = require('express');
const session = require('client-sessions');
const pug = require('pug');
const body_parser = require('body-parser');

const auth = require('./auth_dummy.js');

const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/gcloud.blakethomas.blog/cert.pem')
};

const app = express();
const WEBROOT = '/home/beebop/src/cs-final-project/html/';

app.set('views', '../views');
app.set('view engine', 'pug');

app.use(session({
    cookieName:'session',
    secret:"asdf-ghjkl", 	// FIXME
    duration: 2 * 60 * 60 * 1000,
    activeDuration: 5 * 60 * 1000,
}));


app.use(body_parser.urlencoded({extended:true}));

app.get('/', (req, res) => {
    if(req.session && req.session.user) {
	process.stdout.write("logged in\n");
	res.render('dashboard', {user: req.session.user});
    } else if(req.session && req.session.showlogout) {
	res.render('index', {showlogout:true});
	req.session.reset();
    } else {
	res.render('index');
    }
});

app.post('/login', (req, res) => {
    var valid = auth.auth(req.body.email, req.body.pass);
    if(valid) {
	req.session.user = req.body.email;
	res.redirect('/');
	process.stdout.write(req.session.user + '\n');
    } else {
	// TODO
    }
});

app.get('/logout', (req, res) => {
    req.session.reset();
    req.session.showlogout = true;
    res.redirect('/');
});

https.createServer(options, app).listen(443);

