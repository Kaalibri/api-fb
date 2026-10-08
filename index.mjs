import Server from "./src/server.mjs"

// Affichage des arguments passés au script
// process.argv est un tableau contenant les arguments passés au script Node.js
console.log(process.argv);
console.log("Arguments passés au script :", process.argv.slice(2));

const server = new Server();
server.run();

console.log("Hello World!");