# CryWEB
Website implements a messaging system with the improved end-to-end encryption algorithm for secure messaging systems through the server, ensuring a high level of protection and optimal use of server ability.

The user has opportunity to register and get his private key, his public key is sent to the server and will be used for the first level of ECDSA encryption of users. Authorized user has access to IDs of messages of account for choose to get necessary message. To request message need to enter the user's private key, this must also be done to write a message to other users.

I used tech stack on this project:
- Node.js;
- Express.js;
- express-session;
- MongoDB;
- Mongoose.

To run, you need to install node.js, then go to directory where the package.json file is located through terminal and run "npm install" command to install all application modules. To start, use command "npm run start", on port 3000 the server is launched, now can go to it by link: http://localhost:3000/
  
## Link to diploma work
https://drive.google.com/file/d/1vi4HbGKlJRF3IhDFLFvvxGWYouaILV4k/view?usp=share_link
