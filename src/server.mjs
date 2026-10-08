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
        // le même Authorization dans Postman est en fait un header HTTP qui contient le token JWT
        // 403 Forbidden : la requête n'a pas de header Authorization
        if (!req.headers["authorization"]) return res.sendStatus(403);

        const token = req.headers["authorization"];
        // jwt.verify() vérifie la signature du token avec la clé secrète JWT_SECRET du fichier .env
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            // 401 Unauthorized : le token est faux ou a été modifié
            if (err) return res.sendStatus(401);

            // on range les données du token (id, firstname, lastname, email) dans req.user, pour les routes
            req.user = user;
            // next() passe la main à la route, il n'est appelé que si le token est valide
            next();
        });
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
        // rateLimit limite le nombre de requêtes par adresse IP
        this.app.use(rateLimit({
            // 1 heure
            windowMs: 60*60*1000,
            // 1000 requêtes par IP
            limit: 1000
        }));
        // helmet ajoute des en-têtes HTTP de sécurité
        this.app.use(helmet());
        // cors définit quels sites ont le droit d'appeler l'API
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
        new routes.Users(this.app, this.connect);
        // ajout de this.connect pour autoriser auth à se co à la base et chercher les users présents
        new routes.Auth(this.app, this.connect);
        // Events reçoit en plus authToken, pour protéger la lecture des événements par un token
        new routes.Events(this.app, this.connect, this.authToken);
        new routes.Groups(this.app, this.connect);
        new routes.Threads(this.app, this.connect);
        new routes.Messages(this.app, this.connect);
        new routes.Albums(this.app, this.connect);
        new routes.Photos(this.app, this.connect);
        new routes.Comments(this.app, this.connect);
        new routes.Polls(this.app, this.connect);
        new routes.PollAnswers(this.app, this.connect);
        new routes.TicketTypes(this.app, this.connect);
        new routes.Tickets(this.app, this.connect);

        // si aucune route ne correspond à la requête, on renvoie 404 Not Found
        this.app.use((req, res) => {
            res.status(404).json({
                code: 404,
                message: "Not Found"
            });
        });
    }

    // Start the server
    // Ajout de async pour pouvoir utiliser await dans la méthode run()
    async run() {
        try {
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