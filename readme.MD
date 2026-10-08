# Description

API REST de gestion d'évènements.

Elle gère les utilisateurs, les événements, les groupes, les fils de discussion, les albums photo, les sondages et la billetterie.

## Stack
- Express 5.2.1
- Mongoose 8.24.5
- CORS 2.8.6
- dotenv 18.0.6
- express-rate-limit 8.7.1
- helmet 8.3.0
- jsonwebtoken 9.0.3
- ESLint 9.39.5 (développement)

## Installation
```bash
git clone https://github.com/Kaalibri/api-fb.git
cd api-fb
sudo apt update
sudo apt upgrade -y
npm install express mongoose dotenv jsonwebtoken helmet cors express-rate-limit
npm install --save-dev eslint @eslint/js globals
```

## MongoDB Atlas
### Création de la base de données :
- Créer un cluster gratuit sur https://www.mongodb.com/atlas
- Database Access : créer un utilisateur et son mot de passe
- Network Access : autoriser son adresse IP
- Connect > Drivers : copier l'URL de connexion
- Ajouter le nom de la base à la fin de l'URL, par exemple db_api_fb

La base et les collections sont créées automatiquement à la première écriture.

## Configuration
Copier le fichier .env.example en .env, puis remplir les valeurs :

- PORT : port du serveur
- MONGODB_URI : URL de connexion MongoDB Atlas
- JWT_SECRET : clé secrète qui signe les tokens
- CORS_ORIGINS : origine autorisée à appeler l'API

Génération d'une clé secrète :
```bash
openssl rand -hex 32
```

## Lancement du serveur
```bash
npm run dev
```

Le serveur écoute sur http://localhost:3000

## Lint
```bash
npm run lint
npm run lint:fix
```

## Structure du projet
```
index.mjs              point d'entrée
src/server.mjs         serveur Express, middlewares, routes
src/config.mjs         lecture du fichier .env
src/models/            schémas Mongoose (un par collection)
src/controllers/       routes (un fichier par ressource)
postman/               collection Postman
```

## Collections
- users : firstname, lastname, email, age
- events : event_name, event_description, event_begin, event_end, event_location, event_photo, is_event_private, event_organisators_list, event_members_list, event_group
- groups : group_name, group_description, group_icon, group_photo, group_type, group_members_can_post, group_members_can_create_events, group_admins_list, group_members_list
- threads : thread_group, thread_event
- messages : message_content, message_thread, message_author, message_parent, message_date
- albums : album_name, album_description, album_event, album_date
- photos : photo_url, photo_album, photo_author, photo_date
- comments : comment_content, comment_photo, comment_author, comment_date
- polls : poll_title, poll_event, poll_author, poll_questions (question_title, question_answers)
- poll_answers : answer_poll, answer_question, answer_user, answer_choice, answer_date
- ticket_types : ticket_type_name, ticket_type_amount, ticket_type_quantity, ticket_type_event, ticket_type_author
- tickets : ticket_type, ticket_event, ticket_lastname, ticket_firstname, ticket_address, ticket_date

## Règles de gestion
- Deux users ne peuvent pas avoir le même email.
- Un événement a au moins un organisateur, et sa date de fin est après sa date de début.
- Un groupe a au moins un administrateur et un membre.
- Un événement créé dans un groupe invite automatiquement tous les membres du groupe.
- Un fil de discussion est lié à un groupe ou à un événement, jamais aux deux.
- Seuls les membres du groupe ou les participants de l'événement peuvent écrire dans son fil.
- Seuls les participants d'un événement peuvent poster une photo ou la commenter.
- Seul un organisateur peut créer un sondage. Un participant ne répond qu'une fois par question.
- La billetterie n'existe que pour les événements publics. Seul un organisateur crée les types de billets.
- Un type de billet a une quantité limitée, et une personne ne peut obtenir qu'un billet par événement.

## Requêtes POSTMAN utilisées :
Collection à importer dans Postman : postman/Z_TP Collection FB.postman_collection.json
Puis modifier les :id

### Users
```
GET    http://localhost:3000/users
GET    http://localhost:3000/users/:id
POST   http://localhost:3000/users
PUT    http://localhost:3000/users/:id
PATCH  http://localhost:3000/users/:id
DELETE http://localhost:3000/users/:id
```

### Auth
```
POST   http://localhost:3000/auth
```

### Evenements
```
GET    http://localhost:3000/events
GET    http://localhost:3000/events/:id
POST   http://localhost:3000/events
PUT    http://localhost:3000/events/:id
PATCH  http://localhost:3000/events/:id
DELETE http://localhost:3000/events/:id
POST   http://localhost:3000/events/:id/members
DELETE http://localhost:3000/events/:id/members/:iduser
```

### Groupes
```
GET    http://localhost:3000/groups
GET    http://localhost:3000/groups/:id
POST   http://localhost:3000/groups
PUT    http://localhost:3000/groups/:id
PATCH  http://localhost:3000/groups/:id
DELETE http://localhost:3000/groups/:id
POST   http://localhost:3000/groups/:id/members
DELETE http://localhost:3000/groups/:id/members/:iduser
GET    http://localhost:3000/groups/:id/events
POST   http://localhost:3000/groups/:id/events
```

### Fils de discussion
```
GET    http://localhost:3000/threads
GET    http://localhost:3000/threads/:id
GET    http://localhost:3000/groups/:id/thread
GET    http://localhost:3000/events/:id/thread
POST   http://localhost:3000/threads
DELETE http://localhost:3000/threads/:id
```

### Messages
```
GET    http://localhost:3000/threads/:id/messages
GET    http://localhost:3000/messages/:id
POST   http://localhost:3000/messages
DELETE http://localhost:3000/messages/:id
```

### Albums
```
GET    http://localhost:3000/albums
GET    http://localhost:3000/events/:id/albums
GET    http://localhost:3000/albums/:id
POST   http://localhost:3000/albums
PUT    http://localhost:3000/albums/:id
PATCH  http://localhost:3000/albums/:id
DELETE http://localhost:3000/albums/:id
```

### Photos
```
GET    http://localhost:3000/albums/:id/photos
GET    http://localhost:3000/photos/:id
POST   http://localhost:3000/photos
DELETE http://localhost:3000/photos/:id
```

### Commentaires
```
GET    http://localhost:3000/photos/:id/comments
GET    http://localhost:3000/comments/:id
POST   http://localhost:3000/comments
DELETE http://localhost:3000/comments/:id
```

### Sondages
```
GET    http://localhost:3000/polls
GET    http://localhost:3000/events/:id/polls
GET    http://localhost:3000/polls/:id
POST   http://localhost:3000/polls
PUT    http://localhost:3000/polls/:id
PATCH  http://localhost:3000/polls/:id
DELETE http://localhost:3000/polls/:id
```

### Réponses aux sondages
```
GET    http://localhost:3000/polls/:id/answers
GET    http://localhost:3000/poll-answers/:id
POST   http://localhost:3000/poll-answers
DELETE http://localhost:3000/poll-answers/:id
```

### Types de billets
```
GET    http://localhost:3000/ticket-types
GET    http://localhost:3000/events/:id/ticket-types
GET    http://localhost:3000/ticket-types/:id
POST   http://localhost:3000/ticket-types
PUT    http://localhost:3000/ticket-types/:id
PATCH  http://localhost:3000/ticket-types/:id
DELETE http://localhost:3000/ticket-types/:id
```

### Billets
```
GET    http://localhost:3000/tickets
GET    http://localhost:3000/ticket-types/:id/tickets
GET    http://localhost:3000/tickets/:id
POST   http://localhost:3000/tickets
DELETE http://localhost:3000/tickets/:id
```
