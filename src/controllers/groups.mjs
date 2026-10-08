// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import GroupSchema from "../models/group.mjs";
import UserSchema from "../models/user.mjs";
import EventSchema from "../models/event.mjs";
import ThreadSchema from "../models/thread.mjs";

const Groups = class Groups {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // GroupSchema est le schéma Mongoose que nous avons défini dans models/group.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.GroupModel = connect.model("group", GroupSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.UserModel = connect.model("user", UserSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.ThreadModel = connect.model("thread", ThreadSchema);
        this.run();
    }

    getGroups() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /groups, cette fonction sera exécutée
        this.app.get("/groups", async (req, res) => {
            try {
                const groups = await this.GroupModel.find();

                res.status(200);
                res.json(groups);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getGroupById() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/groups/:id", async (req, res) => {
            try {
                // populate() remplace les id des listes par les documents users complets
                const group = await this.GroupModel.findById(req.params.id)
                    .populate("group_admins_list")
                    .populate("group_members_list");

                res.status(200);
                res.json(group);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postGroup() {
        this.app.post("/groups", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {
                    group_name,
                    group_description,
                    group_icon,
                    group_photo,
                    group_type,
                    group_members_can_post,
                    group_members_can_create_events,
                    group_admins_list,
                    group_members_list
                } = req.body;

                // un groupe doit avoir au moins un administrateur
                if (!group_admins_list || group_admins_list.length === 0) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "At least one admin is required"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // un groupe doit avoir au moins un membre
                if (!group_members_list || group_members_list.length === 0) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "At least one member is required"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const group = await this.GroupModel.create({
                    group_name,
                    group_description,
                    group_icon,
                    group_photo,
                    group_type,
                    group_members_can_post,
                    group_members_can_create_events,
                    group_admins_list,
                    group_members_list
                });

                // chaque groupe a son fil de discussion : on le crée en même temps que le groupe
                await this.ThreadModel.create({ thread_group: group._id });

                // code 201 -> created
                res.status(201);
                res.json(group);
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

    putGroup() {
        this.app.put("/groups/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                // runValidators : applique les règles du schéma, ignorées par défaut sur une mise à jour
                const group = await this.GroupModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true, runValidators: true });

                // code 200 -> OK
                res.status(200);
                res.json(group);
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

    patchGroup() {
        this.app.patch("/groups/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const group = await this.GroupModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

                res.status(200);
                res.json(group);
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

    deleteGroupById() {
        this.app.delete("/groups/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const group = await this.GroupModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(group);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postGroupMember() {
        this.app.post("/groups/:id/members", async (req, res) => {
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
                const group = await this.GroupModel.findByIdAndUpdate(req.params.id, { $addToSet: { group_members_list: user_id } }, { new: true });

                if (!group) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Group not found"
                    });
                    return;
                }

                res.status(200);
                res.json(group);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    deleteGroupMember() {
        this.app.delete("/groups/:id/members/:iduser", async (req, res) => {
            try {
                // on retire l'id du user de la liste des membres ($pull)
                const group = await this.GroupModel.findByIdAndUpdate(req.params.id, { $pull: { group_members_list: req.params.iduser } }, { new: true });

                if (!group) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Group not found"
                    });
                    return;
                }

                res.status(200);
                res.json(group);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getGroupEvents() {
        this.app.get("/groups/:id/events", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const events = await this.EventModel.find({ event_group: req.params.id });

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

    postGroupEvent() {
        this.app.post("/groups/:id/events", async (req, res) => {
            try {
                // on vérifie que le groupe existe avant de continuer (sinon 404)
                const group = await this.GroupModel.findById(req.params.id);

                if (!group) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Group not found"
                    });
                    return;
                }

                const {
                    event_name,
                    event_description,
                    event_begin,
                    event_end,
                    event_location,
                    event_photo,
                    is_event_private,
                    event_organisators_list
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

                // le premier organisateur de la liste est considéré comme le créateur de l'événement
                const author = event_organisators_list[0];
                // includes() renvoie true si l'id est dans la liste, false sinon
                const isAdmin = group.group_admins_list.includes(author);
                const isMember = group.group_members_list.includes(author);

                // ni administrateur ni membre du groupe : 403 Forbidden
                if (!isAdmin && !isMember) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only members of the group can create an event"
                    });
                    return;
                }

                // simple membre : il faut que le groupe autorise ses membres à créer des événements
                if (!isAdmin && !group.group_members_can_create_events) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Members are not allowed to create events in this group"
                    });
                    return;
                }

                const event = await this.EventModel.create({
                    event_name,
                    event_description,
                    event_begin,
                    event_end,
                    event_location,
                    event_photo,
                    is_event_private,
                    event_organisators_list,
                    // tous les membres du groupe sont invités automatiquement
                    event_members_list: group.group_members_list,
                    // on garde le lien entre l'événement et son groupe
                    event_group: group._id
                });

                res.status(201);
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

    // chaque méthode appelée ici déclare sa route dans Express
    // tant qu'une méthode n'est pas appelée ici, sa route n'existe pas (404 Not Found)
    run() {
        this.getGroups();
        this.getGroupById();
        this.postGroup();
        this.putGroup();
        this.patchGroup();
        this.deleteGroupById();
        this.postGroupMember();
        this.deleteGroupMember();
        this.getGroupEvents();
        this.postGroupEvent();
    }
};

export default Groups;
