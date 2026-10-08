import mongoose from "mongoose";

// on définit le schéma d'un utilisateur
const UserSchema = new mongoose.Schema({
    firstname: {
        type: String,
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true,
        // minlength / maxlength : longueur minimale et maximale du texte
        minlength: 2,
        maxlength: 50
    },
    lastname: {
        type: String,
        required: true,
        trim: true,
        minlength: 2,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        // unique : MongoDB refuse deux users avec le même email
        unique: true,
        // lowercase : l'email est enregistré en minuscules
        lowercase: true,
        trim: true,
        // match : l'email doit respecter ce format (expression régulière)
        match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    age: {
        type: Number,
        // min : valeur minimale acceptée
        min: 0,
        max: 130
    }
}, {
    // timestamps ajoute automatiquement les champs createdAt et updatedAt
    timestamps: true,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default UserSchema;
