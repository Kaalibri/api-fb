// on importe tous les contrôleurs du dossier controllers
import Users from "./users.mjs";
import Auth from "./auth.mjs";
import Events from "./events.mjs";
import Groups from "./groups.mjs";
import Threads from "./threads.mjs";
import Messages from "./messages.mjs";
import Albums from "./albums.mjs";
import Photos from "./photos.mjs";
import Comments from "./comments.mjs";
import Polls from "./polls.mjs";
import PollAnswers from "./pollAnswers.mjs";
import TicketTypes from "./ticketTypes.mjs";
import Tickets from "./tickets.mjs";

// on les regroupe dans un seul objet, utilisé dans server.mjs (exemple : new routes.Users(...))
export default {
    Users: Users,
    Auth: Auth,
    Events: Events,
    Groups: Groups,
    Threads: Threads,
    Messages: Messages,
    Albums: Albums,
    Photos: Photos,
    Comments: Comments,
    Polls: Polls,
    PollAnswers: PollAnswers,
    TicketTypes: TicketTypes,
    Tickets: Tickets
};
