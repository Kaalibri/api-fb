import express from "express";
import mongoose from "mongoose";

import config from "./config.mjs";
import routes from "./controllers/routes.mjs";
import jwt from "jsonwebtoken";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";


const Server = class Server {
    constructor() {
        // Create an instance of the Express application,
        // which will be used to handle incoming requests and define routes.
        this.app = express();
        // Si process.argv[2] est défini, on prend la configuration correspondante,
        // sinon on prend la configuration par défaut (development)
        this.config = config[process.argv[2]] || config.development;
    }

    // Connect to the MongoDB database using Mongoose
    // Documentation : https://mongoosejs.com/docs/connections.html
    async dbConnect() {
        // Prend l'URL de connexion à MongoDB depuis la config.mjs
        const host = this.config.mongodb;

        // Création d'une connexion à la base de données MongoDB en utilisant Mongoose.
        // Documentation : https://mongoosejs.com/docs/connections.html
        this.connect = await mongoose.createConnection(host).asPromise();

        // Gestion des événements de connexion à la base de données
        this.connect.on("error", (err) => {
            console.error("[ERROR] api dbConnect() -> mongodb error", err);
        });

        // Gestion de l'événement de déconnexion de la base de données
        this.connect.on("disconnected", () => {
            console.log("[ERROR] api dbConnect() -> mongodb disconnected");
        });

        // Gestion de l'événement de fermeture du processus (SIGINT)
        // Documentation : https://nodejs.org/api/process.html#signal-events
        process.on("SIGINT", async () => {
            await this.connect.close();
            console.log("[CLOSE] api dbConnect() -> mongodb closed");
            process.exit(0);
        });
    }

    

    // middleware de vérification du token JWT
    authToken(req, res, next) {
        // rappel header = metadata de la requête HTTP, contient des informations sur la requête
        // le même Authirization dans Postman est en fait un header HTTP qui contient le token JWT
        // on écrit ['authorization'] car le nom du header contient un tiret, donc on ne peut pas utiliser la notation pointée (req.headers.authorization)
        if (!req.headers['authorization']) return res.sendStatus(403); // Forbidden

        const token = req.headers['authorization'];
        jwt.verify(token, 'efrei', (err, user) => {
            if (err) return res.sendStatus(401); // Unauthorized

            req.user = user;
            // permet de ne pas renvoyer de résultat si le token est invalide ou absent
            next();
        })
    }

    // Middleware configuration
    // Middleware est une fonction qui est exécutée
    // avant que la requête ne soit traitée par les routes.
    // Plus précisément, le middleware est exécuté
    // avant que la requête ne soit transmise à la route correspondante.
    // et sert à traiter les données de la requête avant qu'elles ne soient utilisées par les routes.
    // exemple de ce que fait le middleware express.json() : il parse le body de la requête et le transforme en objet JSON
    middleware() {
        // l'ordre d'exécution des middlewares est important, car ils sont exécutés dans l'ordre dans lequel ils sont définis.
        this.app.use(rateLimit{
            windowMs: 60*60*1000, // 1 heure
            limit: 100 // 100 requêtes par IP
        })
        this.app.use(helmet());
        this.app.use(cors({
            origin: this.config.corsOrigins,
            methods: ["GET","POST", "PUT", "PATCH", "DELETE"],
            allowedHeaders: ["Content-Type", "Authorization"]
        }));
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: true}));
    }


    // Route configuration
    routes() {
        // Sans cette ligne, le serveur ne sait pas comment gérer
        // les routes définies dans le fichier routes.mjs.
        // On crée une nouvelle instance de la classe Users en lui passant
        // l'application Express ET nouvellement la connexion Mongoose
        new routes.Users(this.app, this.connect, this.authToken);
        // ajout de this.connect pour autoriser auth à se co à la base et chercher les users présents
        new routes.Auth(this.app, this.connect);
        new routes.Photos(this.app, this.connect);
        new routes.Albums(this.app, this.connect);


        this.app.use((req, res) => {
            res.status(404).json({
                code: 404,
                message: "Not Found"
            })

        });
    }
    // Start the server
    // Ajout de async pour pouvoir utiliser await dans la méthode run()
    async run() {
        try{
            // On attend que la connexion à la base de données soit établie avant de continuer (await)
            await this.dbConnect();
            this.middleware();
            this.routes();
            this.app.listen(this.config.port);
            console.log("Serveur lancé sur le port : ", this.config.port);
        } catch (err) {
            console.error(`[ERROR] api run() -> ${err}`);
        }
    }
};

// Export the Server class as the default export
export default Server;