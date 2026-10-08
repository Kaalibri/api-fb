import mongoose from "mongoose";

// on définit le schéma d'un événement
const Schema = new mongoose.Schema({
    event_name: {
        type: String, 
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true, 
    },

    event_description: {
        type: String,
        trim: true, 
    },
    
    event_begin: {
        type: Date,
        required: true,
    },

    event_end: {
        type: Date,
        required: true,
    },

    event_location: {
        type: String,
        trim: true,
        required: true,
    },

    event_photo: {
        type: String,
        trim: true,
    },

    is_event_private: {
        type: Boolean,
        required: true,
    },

    event_organisators_list: {
        // on définit un tableau d'ObjectId qui référence les documents de la collection "user"
        type: [mongoose.Schema.Types.ObjectId],
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "user",
        // validate : la fonction doit renvoyer true, ici la liste doit contenir au moins un élément
        validate: (list) => list.length > 0,
    },

    event_members_list: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user",
    },

    // rempli seulement quand l'événement est créé dans un groupe
    event_group: {
        // ObjectId : on stocke l'id d'un autre document, pas une copie de ses données
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
    }
        
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "events",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents    
    versionKey: false
});

export default Schema;