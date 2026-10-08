// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import TicketSchema from "../models/ticket.mjs";
import TicketTypeSchema from "../models/ticketType.mjs";

const Tickets = class Tickets {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // TicketSchema est le schéma Mongoose que nous avons défini dans models/ticket.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.TicketModel = connect.model("ticket", TicketSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.TicketTypeModel = connect.model("ticketType", TicketTypeSchema);
        this.run();
    }

    getTickets() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /tickets, cette fonction sera exécutée
        this.app.get("/tickets", async (req, res) => {
            try {
                const tickets = await this.TicketModel.find();

                res.status(200);
                res.json(tickets);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getTicketTypeTickets() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/ticket-types/:id/tickets", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const tickets = await this.TicketModel.find({ ticket_type: req.params.id });

                res.status(200);
                res.json(tickets);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getTicketById() {
        this.app.get("/tickets/:id", async (req, res) => {
            try {
                const ticket = await this.TicketModel.findById(req.params.id);

                res.status(200);
                res.json(ticket);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postTicket() {
        this.app.post("/tickets", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {ticket_type, ticket_lastname, ticket_firstname, ticket_address} = req.body;

                // on vérifie que le type de billet existe avant de continuer (sinon 404)
                const ticketType = await this.TicketTypeModel.findById(ticket_type);

                if (!ticketType) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Ticket type not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // countDocuments() compte les billets déjà vendus pour ce type de billet
                const soldTickets = await this.TicketModel.countDocuments({ ticket_type });

                // quantité limitée : on refuse la vente quand tout le stock est vendu
                if (soldTickets >= ticketType.ticket_type_quantity) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "No ticket left for this ticket type"
                    });
                    return;
                }

                // l'événement du billet est celui du type de billet, le client n'a pas à l'envoyer
                const ticket_event = ticketType.ticket_type_event;
                // une personne (même nom, prénom et adresse) ne peut avoir qu'un billet par événement
                const existingTicket = await this.TicketModel.findOne({ticket_event, ticket_lastname, ticket_firstname, ticket_address});

                if (existingTicket) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "This person already has a ticket for this event"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const ticket = await this.TicketModel.create({
                    ticket_type,
                    ticket_event,
                    ticket_lastname,
                    ticket_firstname,
                    ticket_address
                });

                // code 201 -> created
                res.status(201);
                res.json(ticket);
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

    deleteTicketById() {
        this.app.delete("/tickets/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const ticket = await this.TicketModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(ticket);
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
        this.getTickets();
        this.getTicketTypeTickets();
        this.getTicketById();
        this.postTicket();
        this.deleteTicketById();
    }
};

export default Tickets;
