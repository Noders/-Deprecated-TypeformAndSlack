var request = require('request'); // COOL PACKAGE TO DO HTTP REQUESTS
var _ = require('lodash'); //COOL LIBRARY
var CronJob = require('cron').CronJob; //COOL CRON MANAGER FOR NODE
var Datastore = require('nedb') //COOL DATABASE
var config = require('./config')


//LOADS DB;
var emprendedores = new Datastore({
    filename: '700.json', //NAME OF THE JSON FILE YOU WANT TO SAVE YOUR TYPEFORM DATA TO
    autoload: true
});


//cada segundo
new CronJob(config.timer.every_fifteen, function() {
    start()
}, null, true, 'America/Los_Angeles');

// GETS AMOUNT OF SAVED USERS TO SEE WHERE TO PAGINATE THE TYPEFORM QUERY
var getPaginationToQueryTypeForms = function() {
    emprendedores.find({}, function(err, docs) {
        getInfoFromTypeForms(docs.length);
    })
}

//GETS TE INFO FROM TYPEFORMS
var getInfoFromTypeForms = function(offset) {
    request.get(config.typeform.URL + '&offset=' + offset, function(err, data) {
        if (err) {
            console.log(err)
        } else if (data) {
            var respuestas = JSON.parse(data.body).responses;
            listaDeCanales(respuestas)

        }
    })
}



var listaDeCanales = function(respuestas) {
    request.post({
        url: config.slack.channelsUrls,
        form: {
            token: config.slack.KEY,
            exclude_archived: 1
        }
    }, function(err, httpResponse, body) {
        var channelsIDS = _.pluck(JSON.parse(body).channels, "id");
        saveToDataBase(respuestas, channelsIDS);

    })
}

//SAVES THE INFO TO THE DATABASE
var saveToDataBase = function(respuestas, channelsIDS) {
    _.each(respuestas, function(respuesta, i) {
        //CHECK IF THERE IS ANY PERSON WITH THAT ID
        emprendedores.find({
                id: respuesta.id
            },
            function(err, data) {
                //GUARDAR NUEVO PERSON
                if (data.length === 0) {
                    var emp = {
                            id: respuesta.id,
                            date: respuesta.metadata.date_submit,
                            email: respuesta.answers[config.typeform.FORM.email],
                            nombre: respuesta.answers[config.typeform.FORM.nombre],
                            apellido: respuesta.answers[config.typeform.FORM.apellido]
                        }
                        //agregar el emprendedor a slack
                    emprendedores.insert(emp, function(err) {
                        if (err) {
                            console.log(err)
                        } else {
                            invitarEmprendedorASlack(emp, channelsIDS);
                        }
                    })
                }
            })

    })
}






//*INVITES USER TO SLACK*//
var invitarEmprendedorASlack = function(emprendedor, channelsIDS) {
    var inviteUrl = config.slack.inviteUrl + (Date.parse(new Date()) / 1000)
        request.post({
            url: inviteUrl,
            form: {
                email: emprendedor.email,
                channels: channelsIDS.join(','),
                first_name: emprendedor.nombre,
                last_name: emprendedor.apellido,
                token: slack.KEY,
                set_active: true
            }
        }, function(err, httpResponse, body) {
        })
}

var start = function() {
    getPaginationToQueryTypeForms();
}
start();
