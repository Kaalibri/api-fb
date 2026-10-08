// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import TicketTypeSchema from "../models/ticketType.mjs";
import EventSchema from "../models/event.mjs";

const TicketTypes = class TicketTypes {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // TicketTypeSchema est le schéma Mongoose que nous avons défini dans models/ticketType.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.TicketTypeModel = connect.model("ticketType", TicketTypeSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getTicketTypes() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /ticket-types, cette fonction sera exécutée
        this.app.get("/ticket-types", async (req, res) => {
            try {
                const ticketTypes = await this.TicketTypeModel.find();

                res.status(200);
                res.json(ticketTypes);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getEventTicketTypes() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/events/:id/ticket-types", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const ticketTypes = await this.TicketTypeModel.find({ ticket_type_event: req.params.id });

                res.status(200);
                res.json(ticketTypes);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getTicketTypeById() {
        this.app.get("/ticket-types/:id", async (req, res) => {
            try {
                const ticketType = await this.TicketTypeModel.findById(req.params.id);

                res.status(200);
                res.json(ticketType);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postTicketType() {
        this.app.post("/ticket-types", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {
                    ticket_type_name,
                    ticket_type_amount,
                    ticket_type_quantity,
                    ticket_type_event,
                    ticket_type_author
                } = req.body;

                // on vérifie que l'événement existe avant de continuer (sinon 404)
                const event = await this.EventModel.findById(ticket_type_event);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // la billetterie n'existe que pour les événements publics
                if (event.is_event_private) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "Ticketing is only available for public events"
                    });
                    return;
                }

                // seul un organisateur de l'événement peut créer un type de billet
                if (!event.event_organisators_list.includes(ticket_type_author)) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only an organizer of the event can create a ticket type"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const ticketType = await this.TicketTypeModel.create({
                    ticket_type_name,
                    ticket_type_amount,
                    ticket_type_quantity,
                    ticket_type_event,
                    ticket_type_author
                });

                // code 201 -> created
                res.status(201);
                res.json(ticketType);
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

    putTicketType() {
        this.app.put("/ticket-types/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                // runValidators : applique les règles du schéma, ignorées par défaut sur une mise à jour
                const ticketType = await this.TicketTypeModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true, runValidators: true });

                // code 200 -> OK
                res.status(200);
                res.json(ticketType);
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

    patchTicketType() {
        this.app.patch("/ticket-types/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const ticketType = await this.TicketTypeModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

                res.status(200);
                res.json(ticketType);
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

    deleteTicketTypeById() {
        this.app.delete("/ticket-types/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const ticketType = await this.TicketTypeModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(ticketType);
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
        this.getTicketTypes();
        this.getEventTicketTypes();
        this.getTicketTypeById();
        this.postTicketType();
        this.putTicketType();
        this.patchTicketType();
        this.deleteTicketTypeById();
    }
};

export default TicketTypes;
