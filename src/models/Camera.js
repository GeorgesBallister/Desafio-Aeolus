// Mongoose
const mongoose = require('mongoose');

//Schema da Camera (Todos os campos são obrigatorios no documento do desafio)
const CameraSchema = new mongoose.Schema({
    // Pelo que entendi, a criação do Schema vai ter sua estrutura como se fosse um Dictionary.
    name: {
        type: String, 
        required:true
    },
    // ID tem que ser sempre unico (Provavelmente porque deve ser um UUID)
    cameraID: {
        type:String,
        required: true,
        unique: true
    }
    ,
    zone: {
        type:String,
        required: false
    }
    ,
    rtsp: {
        type:String,
        required: false
    }
},
// Cria os campos de createAt e UpdatedAt no schema de forma automatica
{timestamps: true});

// Exportando a criação do Schema como um modulo chamado "Camera" para puxar depois
module.exports = mongoose.model('Camera', CameraSchema);
