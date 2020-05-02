var { buildSchema } = require('graphql');
var graphqlHTTP = require('express-graphql');


const types = `
    type Contact {
        name:String,
        email:String,
        tel:String
    }
`
var schema = buildSchema(`
    ${types},
    type Query {
        hello: String,
    },
    type Mutation {
        contactForm(name:String!, email:String, tel:String): Boolean
    }
`);


const root = {
    hello: () => {
        return 'Hello world!';
    },
    contactForm: ({name, email, tel}) => {
        //console.log("root: contact form: ");
        return true
    }
};



var apiRouter = graphqlHTTP(async (request, response, graphQLParams) => {
    //console.log("graphql api: ");
    return ({
        schema: schema,
        rootValue: root,
        graphiql: true,
        rootValue: root
        })
    }
)


module.exports = apiRouter
