// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import PollSchema from "../models/poll.mjs";
import EventSchema from "../models/event.mjs";

const Polls = class Polls {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // PollSchema est le schéma Mongoose que nous avons défini dans models/poll.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.PollModel = connect.model("poll", PollSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getPolls() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /polls, cette fonction sera exécutée
        this.app.get("/polls", async (req, res) => {
            try {
                const polls = await this.PollModel.find();

                res.status(200);
                res.json(polls);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getEventPolls() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/events/:id/polls", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const polls = await this.PollModel.find({ poll_event: req.params.id });

                res.status(200);
                res.json(polls);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getPollById() {
        this.app.get("/polls/:id", async (req, res) => {
            try {
                const poll = await this.PollModel.findById(req.params.id);

                res.status(200);
                res.json(poll);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postPoll() {
        this.app.post("/polls", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {poll_title, poll_event, poll_author, poll_questions} = req.body;

                // on vérifie que l'événement existe avant de continuer (sinon 404)
                const event = await this.EventModel.findById(poll_event);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // seul un organisateur de l'événement peut créer un sondage
                if (!event.event_organisators_list.includes(poll_author)) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only an organizer of the event can create a poll"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const poll = await this.PollModel.create({poll_title, poll_event, poll_author, poll_questions});

                // code 201 -> created
                res.status(201);
                res.json(poll);
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

    putPoll() {
        this.app.put("/polls/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                // runValidators : applique les règles du schéma, ignorées par défaut sur une mise à jour
                const poll = await this.PollModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true, runValidators: true });

                // code 200 -> OK
                res.status(200);
                res.json(poll);
            } catch (err) {
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

    patchPoll() {
        this.app.patch("/polls/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const poll = await this.PollModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

                res.status(200);
                res.json(poll);
            } catch (err) {
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

    deletePollById() {
        this.app.delete("/polls/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const poll = await this.PollModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(poll);
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
        this.getPolls();
        this.getEventPolls();
        this.getPollById();
        this.postPoll();
        this.putPoll();
        this.patchPoll();
        this.deletePollById();
    }
};

export default Polls;
