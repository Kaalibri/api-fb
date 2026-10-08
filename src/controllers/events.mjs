// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import EventSchema from "../models/event.mjs";
import UserSchema from "../models/user.mjs";

const Events = class Events {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect, authToken) {
        this.app = app;
        this.connect = connect;
        // ajout de authToken en paramètre pour pouvoir utiliser le middleware d'authentification dans le contrôleur
        this.authToken = authToken;

        // EventSchema est le schéma Mongoose que nous avons défini dans models/event.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.EventModel = connect.model("event", EventSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.UserModel = connect.model("user", UserSchema);
        this.run();
    }

    getEvents() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /events, cette fonction sera exécutée
        // this.authToken est exécuté avant le callback : sans token valide, la requête s'arrête là
        this.app.get("/events", this.authToken, async (req, res) => {
            try {
                const allEvents = await this.EventModel.find();

                // filter() garde les événements pour lesquels la fonction renvoie true
                // req.user contient les données du token JWT (voir authToken dans server.mjs)
                const events = allEvents.filter((event) => {
                    // événement public : visible par tout le monde
                    if (!event.is_event_private) return true;
                    // événement privé : visible seulement par ses organisateurs et ses membres
                    if (event.event_organisators_list.includes(req.user.id)) return true;
                    if (event.event_members_list.includes(req.user.id)) return true;

                    return false;
                });

                res.status(200);
                res.json(events);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getEventById() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/events/:id", this.authToken, async (req, res) => {
            try {
                // on vérifie que l'événement existe avant de continuer (sinon 404)
                const event = await this.EventModel.findById(req.params.id);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // includes() renvoie true si l'id est dans la liste, false sinon
                const isOrganizer = event.event_organisators_list.includes(req.user.id);
                const isMember = event.event_members_list.includes(req.user.id);

                // événement privé : réservé à ses organisateurs et à ses membres
                if (event.is_event_private && !isOrganizer && !isMember) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "This event is private"
                    });
                    return;
                }

                // populate() remplace les id des listes par les documents users complets
                await event.populate("event_organisators_list");
                await event.populate("event_members_list");

                res.status(200);
                res.json(event);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postEvent() {
        this.app.post("/events", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {
                    event_name,
                    event_description,
                    event_begin,
                    event_end,
                    event_location,
                    event_photo,
                    is_event_private,
                    event_organisators_list,
                    event_members_list
                } = req.body;

                // un événement doit avoir au moins un organisateur
                if (!event_organisators_list || event_organisators_list.length === 0) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "At least one organizer is required"
                    });
                    return;
                }

                // new Date() transforme le texte reçu en date, pour pouvoir comparer la fin et le début
                if (new Date(event_end) < new Date(event_begin)) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "event_end must be after event_begin"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const event = await this.EventModel.create({
                    event_name,
                    event_description,
                    event_begin,
                    event_end,
                    event_location,
                    event_photo,
                    is_event_private,
                    event_organisators_list,
                    event_members_list
                });

                // code 201 -> created
                res.status(201);
                res.json(event);
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

    putEvent() {
        this.app.put("/events/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                // runValidators : applique les règles du schéma, ignorées par défaut sur une mise à jour
                const event = await this.EventModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true, runValidators: true });

                // code 200 -> OK
                res.status(200);
                res.json(event);
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

    patchEvent() {
        this.app.patch("/events/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const event = await this.EventModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

                res.status(200);
                res.json(event);
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

    deleteEventById() {
        this.app.delete("/events/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const event = await this.EventModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(event);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postEventMember() {
        this.app.post("/events/:id/members", async (req, res) => {
            try {
                const {user_id} = req.body;

                // on vérifie que l'utilisateur existe avant de continuer (sinon 404)
                const user = await this.UserModel.findById(user_id);

                if (!user) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "User not found"
                    });
                    return;
                }

                // on ajoute l'id du user dans la liste des membres ($addToSet évite les doublons)
                const event = await this.EventModel.findByIdAndUpdate(req.params.id, { $addToSet: { event_members_list: user_id } }, { new: true });

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    return;
                }

                res.status(200);
                res.json(event);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    deleteEventMember() {
        this.app.delete("/events/:id/members/:iduser", async (req, res) => {
            try {
                // on retire l'id du user de la liste des membres ($pull)
                const event = await this.EventModel.findByIdAndUpdate(req.params.id, { $pull: { event_members_list: req.params.iduser } }, { new: true });

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    return;
                }

                res.status(200);
                res.json(event);
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
        this.getEvents();
        this.getEventById();
        this.postEvent();
        this.putEvent();
        this.patchEvent();
        this.deleteEventById();
        this.postEventMember();
        this.deleteEventMember();
    }
};

export default Events;
