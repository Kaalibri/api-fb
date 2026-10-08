// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import MessageSchema from "../models/message.mjs";
import ThreadSchema from "../models/thread.mjs";
import GroupSchema from "../models/group.mjs";
import EventSchema from "../models/event.mjs";

const Messages = class Messages {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // MessageSchema est le schéma Mongoose que nous avons défini dans models/message.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.MessageModel = connect.model("message", MessageSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.ThreadModel = connect.model("thread", ThreadSchema);
        this.GroupModel = connect.model("group", GroupSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getThreadMessages() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /threads/:id/messages, cette fonction sera exécutée
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/threads/:id/messages", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const messages = await this.MessageModel.find({ message_thread: req.params.id });

                res.status(200);
                res.json(messages);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getMessageById() {
        this.app.get("/messages/:id", async (req, res) => {
            try {
                const message = await this.MessageModel.findById(req.params.id);

                res.status(200);
                res.json(message);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postMessage() {
        this.app.post("/messages", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {message_content, message_thread, message_author, message_parent} = req.body;

                // on vérifie que le fil de discussion existe avant de continuer (sinon 404)
                const thread = await this.ThreadModel.findById(message_thread);

                if (!thread) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Thread not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // le fil appartient soit à un groupe, soit à un événement : les règles ne sont pas les mêmes
                if (thread.thread_group) {
                    // on récupère le groupe du fil, pour vérifier les droits de l'auteur
                    const group = await this.GroupModel.findById(thread.thread_group);

                    if (!group) {
                        res.status(404);
                        res.json({
                            code: 404,
                            message: "Group not found"
                        });
                        return;
                    }

                    // includes() renvoie true si l'id est dans la liste, false sinon
                    const isAdmin = group.group_admins_list.includes(message_author);
                    const isMember = group.group_members_list.includes(message_author);

                    // ni administrateur ni membre du groupe : 403 Forbidden
                    if (!isAdmin && !isMember) {
                        res.status(403);
                        res.json({
                            code: 403,
                            message: "Only members of the group can post a message"
                        });
                        return;
                    }

                    // simple membre : il faut que le groupe autorise ses membres à publier
                    if (!isAdmin && !group.group_members_can_post) {
                        res.status(403);
                        res.json({
                            code: 403,
                            message: "Members are not allowed to post in this group"
                        });
                        return;
                    }
                } else {
                    // on récupère l'événement du fil, pour vérifier que l'auteur y participe
                    const event = await this.EventModel.findById(thread.thread_event);

                    if (!event) {
                        res.status(404);
                        res.json({
                            code: 404,
                            message: "Event not found"
                        });
                        return;
                    }

                    const isOrganizer = event.event_organisators_list.includes(message_author);
                    const isMember = event.event_members_list.includes(message_author);

                    // ni organisateur ni membre de l'événement : 403 Forbidden
                    if (!isOrganizer && !isMember) {
                        res.status(403);
                        res.json({
                            code: 403,
                            message: "Only participants of the event can post a message"
                        });
                        return;
                    }
                }

                // message_parent est rempli quand le message est une réponse à un autre message
                if (message_parent) {
                    // on vérifie que le message parent existe avant de continuer (sinon 404)
                    const parent = await this.MessageModel.findById(message_parent);

                    if (!parent) {
                        res.status(404);
                        res.json({
                            code: 404,
                            message: "Parent message not found"
                        });
                        return;
                    }

                    // la réponse doit être dans le même fil que le message d'origine (toString() pour comparer deux ObjectId)
                    if (parent.message_thread.toString() !== thread._id.toString()) {
                        res.status(400);
                        res.json({
                            code: 400,
                            message: "The parent message is not in this thread"
                        });
                        return;
                    }
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const message = await this.MessageModel.create({message_content, message_thread, message_author, message_parent});

                // code 201 -> created
                res.status(201);
                res.json(message);
            } catch (err) {
                // ValidationError = un validateur du schéma a refusé les données (champ manquant, mauvaise valeur...)
                // c'est une erreur du client, donc on renvoie 400 Bad Request au lieu de 500
                if (err.name === "ValidationError") {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: err.message
                    });
                    return;
                }

                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    deleteMessageById() {
        this.app.delete("/messages/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const message = await this.MessageModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(message);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    // chaque méthode appelée ici déclare sa route dans Express
    // tant qu'une méthode n'est pas appelée ici, sa route n'existe pas (404 Not Found)
    run() {
        this.getThreadMessages();
        this.getMessageById();
        this.postMessage();
        this.deleteMessageById();
    }
};

export default Messages;
