// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import PollAnswerSchema from "../models/pollAnswer.mjs";
import PollSchema from "../models/poll.mjs";
import EventSchema from "../models/event.mjs";

const PollAnswers = class PollAnswers {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // PollAnswerSchema est le schéma Mongoose que nous avons défini dans models/pollAnswer.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.PollAnswerModel = connect.model("pollAnswer", PollAnswerSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.PollModel = connect.model("poll", PollSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getPollAnswers() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /polls/:id/answers, cette fonction sera exécutée
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/polls/:id/answers", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const answers = await this.PollAnswerModel.find({ answer_poll: req.params.id });

                res.status(200);
                res.json(answers);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getPollAnswerById() {
        this.app.get("/poll-answers/:id", async (req, res) => {
            try {
                const answer = await this.PollAnswerModel.findById(req.params.id);

                res.status(200);
                res.json(answer);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postPollAnswer() {
        this.app.post("/poll-answers", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {answer_poll, answer_question, answer_user, answer_choice} = req.body;

                // on vérifie que le sondage existe avant de continuer (sinon 404)
                const poll = await this.PollModel.findById(answer_poll);

                if (!poll) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Poll not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // on récupère l'événement du sondage, pour vérifier que le user y participe
                const event = await this.EventModel.findById(poll.poll_event);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    return;
                }

                // includes() renvoie true si l'id est dans la liste, false sinon
                const isOrganizer = event.event_organisators_list.includes(answer_user);
                const isMember = event.event_members_list.includes(answer_user);

                // ni organisateur ni membre de l'événement : 403 Forbidden
                if (!isOrganizer && !isMember) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only participants of the event can answer a poll"
                    });
                    return;
                }

                // .id() cherche dans les questions du sondage celle qui a cet _id (null si elle n'existe pas)
                const question = poll.poll_questions.id(answer_question);

                if (!question) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "Question not found in this poll"
                    });
                    return;
                }

                // la réponse choisie doit faire partie des réponses possibles de la question
                if (!question.question_answers.includes(answer_choice)) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "This answer is not available for this question"
                    });
                    return;
                }

                // une seule réponse par question : on cherche si ce participant a déjà répondu
                const existingAnswer = await this.PollAnswerModel.findOne({answer_poll, answer_question, answer_user});

                if (existingAnswer) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "Question already answered"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const answer = await this.PollAnswerModel.create({answer_poll, answer_question, answer_user, answer_choice});

                // code 201 -> created
                res.status(201);
                res.json(answer);
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

    deletePollAnswerById() {
        this.app.delete("/poll-answers/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const answer = await this.PollAnswerModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(answer);
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
        this.getPollAnswers();
        this.getPollAnswerById();
        this.postPollAnswer();
        this.deletePollAnswerById();
    }
};

export default PollAnswers;
