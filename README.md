# cs-final-project

Note to instructor: This project is (and will be) available at
github.com/beebop-Wiz/cs-final-project - see that for latest version

Blake Thomas

# DESCRIPTION
Online homework thing for Chinese. Supports vocabulary assignments
using Chinese-language input methods.


# LISTING
/schema.txt: PostgreSQL dump of the database schema.
/js/auth_dummy.js: Dummy authentication module used for early testing.
/js/auth_postgres.js: PostgreSQL-based password authentication module.
/js/datastore_postgres.js: PostgreSQL-based data backend module.
/js/genpass.js: Standalone test program used to generate valid password hashes.
/js/server.js: HTTP(S) server and main application logic.
/views/<various>.pug: Front-end HTML templates.

All files not listed here are part of the build system or
auto-generated or generally unimportant to the application's actual
functionality.

# RUNNING
This project requires:
- NodeJS version 8.11 or greater
- PostgreSQL version 10 or greater
- (optionally) valid HTTPS certificates for your domain

Approximate instructions for setting up a local environment:

- Install NodeJS v. 8.11 or greater.
- Run `npm install` to update Node dependencies.
- Install PostgreSQL v. 10 or greater.
- Import `schema.txt` into a new PostgreSQL database.
- Create an administrator/teacher user by:
 - editing genpass.js with your desired password
 - running genpass.js to obtain a password hash
 - run `INSERT INTO users (email, pwhash, admin, name) VALUES (<your e-mail/login>, <your password hash>, true, <your name>)` in PostgreSQL to add the user
- Modify the `client` object in `auth_postgres.js` with your database credentials / connection information
- Do the same for `datastore_postgres.js`
- If you have HTTPS certificates, modify `options` in `server.js` to reflect their locations.
- If you do not have HTTPS certificates, at the bottom of `server.js`
  comment `https.createServer...` and uncomment
  `http.createServer...`.
- Run the server with `node server.js` from the `js` directory. May
  require admin/root privileges to open a low-numbered port; if this
  is not available, change the `.listen(443)` or `.listen(80)` to your
  desired alternate port number.

Note to instructor: Upon request I will make a similar test environment available on my personal website.

# ADDITIONAL INFORMATIOON

Various screenshots are included in /screenshots.
