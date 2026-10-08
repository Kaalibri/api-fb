import mongoose from "mongoose";

// on définit le schéma d'un type de billet
const Schema = new mongoose.Schema({
    ticket_type_name: {
        type: String,
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true
    },

    ticket_type_amount: {
        type: Number,
        required: true,
        // min : valeur minimale acceptée
        min: 0
    },

    ticket_type_quantity: {
        type: Number,
        required: true,
        min: 1
    },

    ticket_type_event: {
        // ObjectId : on stocke l'id d'un autre document, pas une copie de ses données
        type: mongoose.Schema.Types.ObjectId,
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "event",
        required: true
    },

    ticket_type_author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    }
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "ticket_types",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default Schema;
