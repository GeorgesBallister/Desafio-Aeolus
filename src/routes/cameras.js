//* Imports
const express = require('express');
const router = express.Router();

//* Modulos
const Camera = require('../models/Camera');

// * Create = HTTP Post # Endpoint "/"
// 1. Puxei o metodo manipilador HTTP "POST" da função "Router" do express.
/* 2. Sua estrutura se cria da seguinte forma:
   Primeio ele pede um caminho raiz para as requisição, aqui foi definido como '/' (slash).
   Depois ele pede que seja passado uma função de controller, no caso uma função callback assincrona.
   Pra essa arrow function que foi pasada, tivemos 2 sobrecargas de metodo:
   req = Vai comportar as informações da requisição do HTTP que o cliente enviou como Head, Body em JSON (basicamente obrigatotrio ser em JSON), parametres e et cetera.
   res = Vai ser a resposta que vai voltar para o cliente
*/ 
router.post('/', async (req, res)=>{
    // 3. Começei com um tratamento de erros try e catch.
    try {
        // 3.1 Foi criado um objeto constante para comportar o return do metodo Create da camera.
        // 
        const cameraJson = 
        /* 3.2 Foi usada a função "Create()" do objeto Camera para instruir o mongoose a criar este registro no banco de dados. 
        ps. A função utilzia o await porque espera o DB retornar uma resposta */
        await Camera.create(req.body);

        // 3.3 Retorna o codigo 200 (OK) + estrutura do registro no banco
        res.status(201).json(cameraJson);
    // 4. Bloco de tratamento derro caso algo aconteça
    } catch(err){
        // 4.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
        res.status(400).json({ Erro: err.mensage })
    }
});

//* Ler tudo do banco = HTTP  Get
router.get('/', async (req, res) =>{
    try {
        const todasAsCameras = Camera.find().sort({createdAt: -1});
        res.json(todasAsCameras);
    } catch (err) {
        res.status(400).json({ Erro: err.mensage })
    }
});
//* Buscar por ID = HTTP Get

//* Atualizar Registro = HTTP  Put

//* Apagar = HTTP  Delete

//* Export da Rota
module.exports = router;