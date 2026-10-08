import mongoose from "mongoose";

// on définit le schéma d'un groupe
const Schema = new mongoose.Schema({
    group_name: {
        type: String,
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true
    },

    group_description: {
        type: String,
        trim: true
    },

    group_icon: {
        type: String,
        trim: true
    },

    group_photo: {
        type: String,
        trim: true
    },

    group_type: {
        type: String,
        // enum : seules ces valeurs sont acceptées
        enum: ["public", "private", "secret"],
        required: true
    },

    group_members_can_post: {
        type: Boolean,
        required: true
    },

    group_members_can_create_events: {
        type: Boolean,
        required: true
    },

    group_admins_list: {
        // on définit un tableau d'ObjectId qui référence les documents de la collection "user"
        type: [mongoose.Schema.Types.ObjectId],
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "user",
        // validate : la fonction doit renvoyer true, ici la liste doit contenir au moins un élément
        validate: (list) => list.length > 0
    },

    group_members_list: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: "user",
        validate: (list) => list.length > 0
    }
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "groups",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default Schema;
