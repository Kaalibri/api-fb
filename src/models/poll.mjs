import mongoose from "mongoose";

// on définit le schéma d'un sondage
const Schema = new mongoose.Schema({
    poll_title: {
        type: String,
        required: true,
        // trim supprime les espaces au début et à la fin de la chaîne de caractères
        trim: true
    },

    poll_event: {
        // ObjectId : on stocke l'id d'un autre document, pas une copie de ses données
        type: mongoose.Schema.Types.ObjectId,
        // ref : nom du modèle visé, pour que Mongoose sache à quelle collection se référer
        ref: "event",
        required: true
    },

    poll_author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },

    // un sondage contient un tableau de questions, chaque question a ses réponses possibles
    poll_questions: {
        type: [{
            question_title: {
                type: String,
                required: true,
                trim: true
            },
            question_answers: {
                type: [String],
                // il faut au moins deux réponses possibles par question
                validate: (list) => list.length > 1
            }
        }],
        // validate : la fonction doit renvoyer true, ici la liste doit contenir au moins un élément
        validate: (list) => list.length > 0
    }
}, {
    // on définit le nom de la collection dans laquelle les documents seront stockés
    collection: "polls",
    // on désactive la minimisation des documents (par défaut, Mongoose minimise les documents en supprimant les champs vides)
    minimize: false,
    // on désactive la création automatique du champ __v (versionKey) qui est utilisé par Mongoose pour gérer les versions des documents
    versionKey: false
});

export default Schema;
