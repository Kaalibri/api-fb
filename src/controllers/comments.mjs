// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import CommentSchema from "../models/comment.mjs";
import PhotoSchema from "../models/photo.mjs";
import AlbumSchema from "../models/album.mjs";
import EventSchema from "../models/event.mjs";

const Comments = class Comments {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // CommentSchema est le schéma Mongoose que nous avons défini dans models/comment.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.CommentModel = connect.model("comment", CommentSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.PhotoModel = connect.model("photo", PhotoSchema);
        this.AlbumModel = connect.model("album", AlbumSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getPhotoComments() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /photos/:id/comments, cette fonction sera exécutée
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/photos/:id/comments", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const comments = await this.CommentModel.find({ comment_photo: req.params.id });

                res.status(200);
                res.json(comments);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getCommentById() {
        this.app.get("/comments/:id", async (req, res) => {
            try {
                const comment = await this.CommentModel.findById(req.params.id);

                res.status(200);
                res.json(comment);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postComment() {
        this.app.post("/comments", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {comment_content, comment_photo, comment_author} = req.body;

                // on vérifie que la photo existe avant de continuer (sinon 404)
                const photo = await this.PhotoModel.findById(comment_photo);

                if (!photo) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Photo not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // on récupère l'album de la photo, puis son événement
                const album = await this.AlbumModel.findById(photo.photo_album);

                if (!album) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Album not found"
                    });
                    return;
                }

                // on récupère l'événement de l'album, pour vérifier que l'auteur y participe
                const event = await this.EventModel.findById(album.album_event);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    return;
                }

                // includes() renvoie true si l'id est dans la liste, false sinon
                const isOrganizer = event.event_organisators_list.includes(comment_author);
                const isMember = event.event_members_list.includes(comment_author);

                // ni organisateur ni membre de l'événement : 403 Forbidden
                if (!isOrganizer && !isMember) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only participants of the event can comment a photo"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const comment = await this.CommentModel.create({comment_content, comment_photo, comment_author});

                // code 201 -> created
                res.status(201);
                res.json(comment);
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

    deleteCommentById() {
        this.app.delete("/comments/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const comment = await this.CommentModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(comment);
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
        this.getPhotoComments();
        this.getCommentById();
        this.postComment();
        this.deleteCommentById();
    }
};

export default Comments;
