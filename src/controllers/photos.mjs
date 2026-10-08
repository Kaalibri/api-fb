// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import PhotoSchema from "../models/photo.mjs";
import AlbumSchema from "../models/album.mjs";
import EventSchema from "../models/event.mjs";

const Photos = class Photos {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // PhotoSchema est le schéma Mongoose que nous avons défini dans models/photo.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.PhotoModel = connect.model("photo", PhotoSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.AlbumModel = connect.model("album", AlbumSchema);
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getAlbumPhotos() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /albums/:id/photos, cette fonction sera exécutée
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/albums/:id/photos", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const photos = await this.PhotoModel.find({ photo_album: req.params.id });

                res.status(200);
                res.json(photos);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getPhotoById() {
        this.app.get("/photos/:id", async (req, res) => {
            try {
                const photo = await this.PhotoModel.findById(req.params.id);

                res.status(200);
                res.json(photo);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postPhoto() {
        this.app.post("/photos", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {photo_url, photo_album, photo_author} = req.body;

                // on vérifie que l'album existe avant de continuer (sinon 404)
                const album = await this.AlbumModel.findById(photo_album);

                if (!album) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Album not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
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
                const isOrganizer = event.event_organisators_list.includes(photo_author);
                const isMember = event.event_members_list.includes(photo_author);

                // ni organisateur ni membre de l'événement : 403 Forbidden
                if (!isOrganizer && !isMember) {
                    res.status(403);
                    res.json({
                        code: 403,
                        message: "Only participants of the event can post a photo"
                    });
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const photo = await this.PhotoModel.create({photo_url, photo_album, photo_author});

                // code 201 -> created
                res.status(201);
                res.json(photo);
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

    deletePhotoById() {
        this.app.delete("/photos/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const photo = await this.PhotoModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(photo);
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
        this.getAlbumPhotos();
        this.getPhotoById();
        this.postPhoto();
        this.deletePhotoById();
    }
};

export default Photos;
