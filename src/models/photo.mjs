import mongoose from "mongoose";

// on définit le schéma d'une photo
const Schema = new mongoose.Schema({
    photo_url: {
        type: String,
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true
    },

    photo_album: {
        // ObjectId : on stocke l'id d'un autre document, pas une copie de ses données
        type: mongoose.Schema.Types.ObjectId,
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "album",
        required: true
    },

    photo_author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    photo_date: {
        type: Date,
        // default : valeur mise automatiquement si le client n'envoie rien, ici la date du moment
        default: Date.now
    }
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "photos",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default Schema;
