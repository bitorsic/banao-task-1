# Postomania
Backend for a social media platform, where users can create posts, and like and comment on them  

## API Documentation
The API documentation will shortly be updated

## Installation
- Install the required node packages using `npm i`
- Either install MongoDB locally, or use MongoDB Atlas, and create a database on it  
- Take note of the password, and the URL as we'll paste this in .env  
- Have an email address (preferably not GMail) to send the password reset emails, we'll use the email id and password for it in configuration  

## Configuration
- Create a file named `.env` in the directory as follows:
```
DB_URL="<URL to the database>"
LOGIN_KEY="<any random string>"
RESET_KEY="<another random string, different from above>"
CRYPTO_KEY="<a base64 encoded string for 32 bytes of data>"
EMAIL_USER="<the email id to be used to send password reset emails>"
EMAIL_PASS="<password for the email id>"
```

## Running the server
To run the server, simply run the `index.js` file using `node index.js`