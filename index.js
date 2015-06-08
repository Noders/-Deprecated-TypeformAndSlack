var request = require('request'); // COOL PACKAGE TO DO HTTP REQUESTS
var _ = require('lodash'); //COOL LIBRARY
var CronJob = require('cron').CronJob; //COOL CRON MANAGER FOR NODE
var Datastore = require('nedb') //COOL DATABASE




//LOADS DB;
var emprendedores = new Datastore({
    filename: '700.json', //NAME OF THE JSON FILE YOU WANT TO SAVE YOUR TYPEFORM DATA TO
    autoload: true
});



//VARIABLES
var timer = {
    every_minute: '*/1 * * * *',
    every_second: '* * * * * *',
    every_fifteen: '*/15 * * * *'
};
var typeform = {
    KEY: 'YOUR_TYPEFORM_KEY',
    URL: 'https://api.typeform.com/v0/form/YOUR_TYPEFORM_FORM_ID?key=YOUR_TYPEFORM_KEY&completed=true',
    FORM_ID: 'YOUR_TYPEFORM_FORM_ID', // THE ID FOR THE FORM ... THE ONE THE USER SEES IN THE URL WHEN FILLING YOUR FORM
    FORM: {
        email: 'email_5983646', //THE NAME TYPEFORM GIVES TO FIELDS 
        nombre: 'textfield_5983571',
        apellido: 'textfield_5983588'
    }
};
var slack = {
    KEY: 'YOUR_SLACK_ADMIN_TOKEN',
    CHANNELS_ENCRYPTED: [
        'ARRAY',
        'OF',
        'THE',
        'IDS',
        'SLACK',
        'GIVES',
        'TO',
        'CHANNELS',
        'YOU',
        'WANT',
        'TO',
        'INVITE',
        'THE',
        'USER',
        'TO'
    ] // CAN BE OBTAINED BY LOOKING INTO THE REQUEST SLACK DOES WHEN INVITING A NEW USER 
};




//cada segundo
new CronJob(timer.every_fifteen, function() {
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
    request.get(typeform.URL + '&offset=' + offset, function(err, data) {
        if (err) {
            console.log(err)
        } else if (data) {
            var respuestas = JSON.parse(data.body).responses;
            saveToDataBase(respuestas);
        }
    })
}

//SAVES THE INFO TO THE DATABASE
var saveToDataBase = function(respuestas) {
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
                        email: respuesta.answers[typeform.FORM.email],
                        nombre: respuesta.answers[typeform.FORM.nombre],
                        apellido: respuesta.answers[typeform.FORM.apellido]
                    }
                    //agregar el emprendedor a slack
                    emprendedores.insert(emp, function(err) {
                        if (err) {
                            console.log(err)
                        } else {
                            invitarEmprendedorASlack(emp)
                        }
                    })
                }
            })

    })
}



//*INVITES USER TO SLACK*//
var invitarEmprendedorASlack = function(emprendedor) {
    var inviteUrl = 'https://7oo.slack.com/api/users.admin.invite?t=' + (Date.parse(new Date()) / 1000)
    request.post({
        url: inviteUrl,
        form: {
            email: emprendedor.email,
            channels: slack.CHANNELS_ENCRYPTED.join(),
            first_name: emprendedor.nombre,
            last_name: emprendedor.apellido,
            token: slack.KEY,
            set_active: true
        }
    }, function(err, httpResponse, body) {
        console.log(body)
    })
}

var start = function() {
    getPaginationToQueryTypeForms();
}
start();
