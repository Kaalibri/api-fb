// importation des schémas Mongoose définis dans le dossier models
// ../ permet de remonter d'un niveau dans l'arborescence des dossiers
import UserSchema from "../models/user.mjs";

const Users = class Users {
    // ajout de connect en paramètre pour pouvoir utiliser la connexion Mongoose dans le contrôleur
    constructor(app, connect) {
        this.app = app;
        this.connect = connect;

        // UserSchema est le schéma Mongoose que nous avons défini dans models/user.mjs
        // connect est la connexion Mongoose que nous avons établie dans server.mjs
        // model() crée un modèle Mongoose basé sur le schéma et la connexion
        this.UserModel = connect.model("user", UserSchema);
        this.run();
    }

    getUsers() {
        // ajout de async pour pouvoir utiliser await dans la fonction de callback
        // callback c'est la fonction qui sera exécutée lorsque la route sera appelée,
        // donc quand un client fera une requête GET sur /users, cette fonction sera exécutée
        this.app.get("/users", async (req, res) => {
            try {
                const users = await this.UserModel.find();

                res.status(200);
                res.json(users);
            } catch (err) {
                // on affiche l'erreur dans le terminal du serveur pour comprendre ce qui s'est passé
                console.error("[ERROR] GET /users -> ", err.message);
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    getUserById() {
        // :id est un paramètre de route, sa valeur se lit dans req.params.id
        this.app.get("/users/:id", async (req, res) => {
            try {
                const user = await this.UserModel.findById(req.params.id);

                res.status(200);
                res.json(user);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    postUser() {
        this.app.post("/users", async (req, res) => {
            try {
                // on récupère les données envoyées par le client dans la requête POST
                // destructuring : on ne garde que les champs attendus, le reste de req.body est ignoré
                const {firstname, lastname, email, age} = req.body;

                // l'email doit être unique : on cherche si un user l'utilise déjà
                const existingUser = await this.UserModel.findOne({ email });

                if (existingUser) {
                    res.status(400);
                    res.json({
                        code: 400,
                        message: "Email already used"
                    });
                    // return arrête la fonction ici, sinon le code continuerait et enverrait une deuxième réponse
                    return;
                }

                // create() vérifie les règles du schéma puis enregistre le document dans MongoDB
                // l'id est généré automatiquement par MongoDB, donc on ne le fournit pas
                const user = await this.UserModel.create({firstname, lastname, email, age});

                // code 201 -> created
                res.status(201);
                res.json(user);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    putUser() {
        this.app.put("/users/:id", async (req, res) => {
            try {
                // Documentation : https://mongoosejs.com/docs/api/model.html#Model.findOneAndReplace()
                // new: true -> retourne le document après la mise à jour, sinon retourne le document avant la mise à jour
                const user = await this.UserModel.findOneAndReplace({ _id: req.params.id }, req.body, { new: true });

                // code 200 -> OK
                res.status(200);
                res.json(user);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    patchUser() {
        this.app.patch("/users/:id", async (req, res) => {
            try {
                // PATCH : seuls les champs envoyés dans req.body sont modifiés, les autres ne changent pas
                const user = await this.UserModel.findByIdAndUpdate(req.params.id, req.body, { new: true });

                res.status(200);
                res.json(user);
            } catch {
                res.status(500);
                res.json({
                    code: 500,
                    message: "Internal Server Error"
                });
            }
        });
    }

    deleteUserById() {
        this.app.delete("/users/:id", async (req, res) => {
            try {
                // findByIdAndDelete() supprime le document et renvoie le document supprimé (null s'il n'existait pas)
                const user = await this.UserModel.findByIdAndDelete(req.params.id);

                res.status(200);
                res.json(user);
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
        this.getUsers();
        this.getUserById();
        this.postUser();
        this.putUser();
        this.patchUser();
        this.deleteUserById();
    }
};

export default Users;
