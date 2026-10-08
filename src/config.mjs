// dotenv lit le fichier .env et range ses valeurs dans process.env
import dotenv from "dotenv";

// quiet: true évite que dotenv affiche un message à chaque démarrage
dotenv.config({ quiet: true });

export default {
    development: {
        type: "development",
        // process.env.PORT = valeur de PORT dans le fichier .env (même principe pour les lignes suivantes)
        port: process.env.PORT,
        mongodb: process.env.MONGODB_URI,
        corsOrigins: [process.env.CORS_ORIGINS]
    },
    production: {
        type: "production",
        port: process.env.PORT,
        mongodb: process.env.MONGODB_URI,
        corsOrigins: [process.env.CORS_ORIGINS]
    }
};
