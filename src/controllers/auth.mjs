import jwt from "jsonwebtoken";
import UserSchema from "../models/user.mjs";

const Auth = class Auth {
    constructor(app, connect) {
        this.app = app;
        // on ajoute cette ligne pour utiliser le model user, afin de matcher la bdd
        this.UserModel = connect.model("user", UserSchema);
        this.run();
    }

    // Obtention du token JWT à partir de l'en-tête Authorization de la requête HTTP
    // Ce token s'obtien lors d'un POST sur /auth avec un nom et un rôle dans le body de la requête
    auth() {
        this.app.post("/auth", async (req, res) => {
            try {
                
                const { firstname, lastname, email } = req.body;
                
                const user = await this.UserModel.findOne({ firstname, lastname, email });

                if (!user) return res.status(401).json({code: 401, message: "Utilisateur inconnu"});

                const token = jwt.sign({
                    id: user._id.toString(),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email
                }, process.env.JWT_SECRET); // JWT_SECRET (fichier .env) est la clé secrète pour signer le token, 
                    // elle doit être la même pour vérifier le token dans le middleware authToken() du serveur

                res.status(200);
                res.json({token});


            } catch (err) {
                res.status(500);
                res.json({
                    error: err.message
                });
            }


        });
    }
    
  


    run() {
        this.auth();
    }
};

export default Auth;