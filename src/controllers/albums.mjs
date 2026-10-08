// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import AlbumSchema from "../models/album.mjs";
import EventSchema from "../models/event.mjs";

const Albums = class Albums {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // AlbumSchema est le schéma Mongoose que nous avons défini dans models/album.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.AlbumModel = connect.model("album", AlbumSchema);
        // les autres modèles servent aux vérifications faites dans les routes (existence, droits de l'auteur)
        this.EventModel = connect.model("event", EventSchema);
        this.run();
    }

    getAlbums() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /albums, cette fonction sera exécutée
        this.app.get("/albums", async (req, res) => {
            try {
                const albums = await this.AlbumModel.find();

                res.status(200);
                res.json(albums);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getEventAlbums() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/events/:id/albums", async (req, res) => {
            try {
                // on ne garde que les documents liés à l'id passé dans l'URL
                const albums = await this.AlbumModel.find({ album_event: req.params.id });

                res.status(200);
                res.json(albums);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getAlbumById() {
        this.app.get("/albums/:id", async (req, res) => {
            try {
                const album = await this.AlbumModel.findById(req.params.id);

                res.status(200);
                res.json(album);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postAlbum() {
        this.app.post("/albums", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {album_name, album_description, album_event} = req.body;

                // on vérifie que l'événement existe avant de continuer (sinon 404)
                const event = await this.EventModel.findById(album_event);

                if (!event) {
                    res.status(404);
                    res.json({
                        code: 404,
                        message: "Event not found"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const album = await this.AlbumModel.create({album_name, album_description, album_event});

                // code 201 -> created
                res.status(201);
                res.json(album);
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

    putAlbum() {
        this.app.put("/albums/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                // runValidators : applique les règles du schéma, ignorées par défaut sur une mise à jour
                const album = await this.AlbumModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true, runValidators: true });

                // code 200 -> OK
                res.status(200);
                res.json(album);
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

    patchAlbum() {
        this.app.patch("/albums/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const album = await this.AlbumModel.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

                res.status(200);
                res.json(album);
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

    deleteAlbumById() {
        this.app.delete("/albums/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const album = await this.AlbumModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(album);
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
        this.getAlbums();
        this.getEventAlbums();
        this.getAlbumById();
        this.postAlbum();
        this.putAlbum();
        this.patchAlbum();
        this.deleteAlbumById();
    }
};

export default Albums;
