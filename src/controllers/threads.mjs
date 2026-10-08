// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import ThreadSchema from "../models/thread.mjs";
import GroupSchema from "../models/group.mjs";
import EventSchema from "../models/event.mjs";

const Threads = class Threads {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // ThreadSchema est le schéma Mongoose que nous avons défini dans models/thread.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.ThreadModel = connect.model("thread", ThreadSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.GroupModel = connect.model("group", GroupSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getThreads() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /threads, cette fonction sera exécutée
        this.app.get("/threads", async (req, res) => {
            try {
                const threads = await this.ThreadModel.find();

                res.status(200);
                res.json(threads);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getThreadById() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/threads/:id", async (req, res) => {
            try {
                const thread = await this.ThreadModel.findById(req.params.id);

                res.status(200);
                res.json(thread);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getGroupThread() {
        this.app.get("/groups/:id/thread", async (req, res) => {
            try {
                const thread = await this.ThreadModel.findOne({ thread_group: req.params.id });

                res.status(200);
                res.json(thread);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getEventThread() {
        this.app.get("/events/:id/thread", async (req, res) => {
            try {
                const thread = await this.ThreadModel.findOne({ thread_event: req.params.id });

                res.status(200);
                res.json(thread);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postThread() {
        this.app.post("/threads", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {thread_group, thread_event} = req.body;

                // un fil est lié à un groupe OU à un événement, jamais aux deux
                if (thread_group && thread_event) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "A thread is linked to a group or an event, not both"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // et il doit être lié à l'un des deux
                if (!thread_group && !thread_event) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "A thread must be linked to a group or an event"
                    });
                    return;
                }

                if (thread_group) {
                    // on vérifie que le groupe existe avant de continuer (sinon 404)
                    const group = await this.GroupModel.findById(thread_group);

                    if (!group) {
                        res.status(404);
                        res.json({
                            code: 404,
                            message: "Group not found"
                        });
                        return;
                    }
                }

                if (thread_event) {
                    // on vérifie que l'événement existe avant de continuer (sinon 404)
                    const event = await this.EventModel.findById(thread_event);

                    if (!event) {
                        res.status(404);
                        res.json({
                            code: 404,
                            message: "Event not found"
                        });
                        return;
                    }
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const thread = await this.ThreadModel.create({thread_group, thread_event});

                // code 201 -> created
                res.status(201);
                res.json(thread);
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

    deleteThreadById() {
        this.app.delete("/threads/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const thread = await this.ThreadModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(thread);
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
        this.getThreads();
        this.getThreadById();
        this.getGroupThread();
        this.getEventThread();
        this.postThread();
        this.deleteThreadById();
    }
};

export default Threads;
