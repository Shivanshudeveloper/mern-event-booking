const expres = require('express');
const bodyParser = require('body-parser');

// GraphQL
const graphqlHttp = require('express-graphql');
// Schema from Graphql
const { buildSchema } = require('graphql');
// MongoDB
const mongoose = require('mongoose');
// Bcrypt
const bcrypt = require('bcryptjs');


// Event Model
const Event = require('./models/Event');
// User Model
const User = require('./models/User');

// Initializing the Express App
const apps = expres();

const events = [];

const port = process.env.PORT || 3000;

apps.use(bodyParser.json());

apps.use('/graphql', graphqlHttp({
    schema: buildSchema(`
        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery {
            events: [Event!]!
            users: [User!]
        }

        type RootMutation {
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }

        schema {
            query: RootQuery
            mutation: RootMutation
        }
    `),
    rootValue: {
        events: () => {
            return Event.find()
                .then(events => {
                    return events.map(event => {
                        return { ...event._doc, _id: event.id };
                    });
                })
        },

        users: () => {
            User.find()
                .then(users => {
                    return users.map(user => {
                        return {...user._doc, _id: user.id};
                    });
                })
        },

        createEvent: (args) => {
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price,
                date: args.eventInput.date,
                creator: "5e3ea260a8348c3e08c6fc6b"
            });
            let createdEvent;
            return event.save()
                .then(result => {
                    createdEvent = {...result._doc, _id: result._doc._id.toString()}
                    return User.findById('5e3ea260a8348c3e08c6fc6b')
                })
                .then(user => {
                    if (!user) {
                        throw new Error('User exist already')
                    }
                    user.createdEvents.push(event);
                    return user.save();
                })
                .then(result => {
                    return createdEvent;
                })
                .catch(err => {
                    console.error(err);
                    throw err;
                })
        },

        createUser: (args) => {
            return User.findOne({email: args.userInput.email}).then(user => {
                    if (user) {
                        throw new Error('User exist already')
                    }
                    return bcrypt.hash(args.userInput.password, 12)
                })
                .then(hashedPassword => {
                    const user = new User({
                        email: args.userInput.email,
                            password: hashedPassword
                        });
                        return user.save();
                    })
                    .then(user => {
                        return {...user._doc, password: null, _id: user.id};
                    })
                    .catch(err => {
                        throw err;
                    })
        }
    },

    graphiql: true
}));

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/mern-app', { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Server Started"))
    .catch(err => console.log(err));


apps.listen(port, () => {
    console.log(`Server Started on port ${port}`);
});