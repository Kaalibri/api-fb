import mongoose from "mongoose";

// on définit le schéma d'un fil de discussion
const Schema = new mongoose.Schema({
    // un fil est lié à un groupe OU à un événement (vérifié dans le contrôleur threads.mjs)
    thread_group: {
        // ObjectId : on stocke l'id d'un autre document, pas une copie de ses données
        type: mongoose.Schema.Types.ObjectId,
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "group"
    },

    thread_event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "event"
    }
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "threads",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default Schema;
