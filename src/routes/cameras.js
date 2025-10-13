//* Imports
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

// Instancia o Prisma Client e o Router do Express
const router = Router();
const prisma = new PrismaClient();

// * Create = HTTP Post # Endpoint "/"
// 1. Puxei o metodo manipilador HTTP "POST" da função "Router" do express.
/* 2. Sua estrutura se cria da seguinte forma:
   Primeio ele pede um caminho raiz para as requisição, aqui foi definido como '/' (slash).
   Depois ele pede que seja passado uma função de controller, no caso uma função callback assincrona.
   Pra essa arrow function que foi pasada, tivemos 2 sobrecargas de metodo:
   req = Vai comportar as informações da requisição do HTTP que o cliente enviou como Head, Body em JSON (basicamente obrigatotrio ser em JSON), parametres e et cetera.
   res = Vai ser a resposta que vai voltar para o cliente
*/ 
router.post('/', async (req, res) => {
    // 3. Começei com um tratamento de erros try e catch.
    try {
        // 3.1 Foi criado um objeto constante para comportar o return do metodo Create do prisma para a camera.
        // ps. A função utilzia o await porque espera o MongoDB retornar uma resposta
        const camera = await prisma.camera.create({
            data: req.body
        });
        // 3.3 Retorna o codigo 200 (OK) + estrutura do registro no banco
        res.status(201).json(camera);        
     // 4. Bloco de tratamento de erro caso algo aconteça
    } catch(error){
        // 4.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
        res.status(400).json({ Erro: error.message })
    }
});

//* Ler tudo do banco = HTTP  Get
router.get('/', async (req,res) => {
    // 1. Puxei o metodo manipilador HTTP "GET" da função "Router" do express.
    // Try e catch para tratamento de erros
    try {
        console.log('Antes do findMany');// Debug
        // 2. Criei uma constante com await para comportar o retorno do metodo findMany do prisma
        // FindMany = Busca todos os registros do banco
        const todasAsCameras = await prisma.camera.findMany({
            // Ordemar por data de criação, da mais nova para a mais antiga
            orderBy: {createdAt: 'desc'}
        });
        console.log('Depois do findMany');// Debug
        // 3. Retorna o codigo 200 (OK) + estrutura do registro no banco
        res.status(200).json(todasAsCameras);
    // 4. Bloco de tratamento de erro caso algo aconteça
    } catch (error) {
        // 4.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
        res.status(400).json({ Erro: error.message })
    }
});
//* Buscar por ID = HTTP Get
router.get('/:id', async (req,res) => {
    try{
        // 1. Constante para comportar o retorno do metodo findUnique do prisma
        // FindUnique vai buscar um registro unico com base em um parametro passado para ele, no caso o ID que foi passado como parametro na rota representado pelo :id
        const camera = await prisma.camera.findUnique({
        // 2. Aqui o prisma faz um where tal qual o SQL, passando o id da rota como parametro para buscar o id do registro, ou seja da camera
        where: {id: req.params.id}
    });
    // 3. Caso o registro volte como nulo, ele retorna que a camera não foi encontrada (404 Not Found + Mensagem)
    if (!camera){
        return res.status(404).json({ Erro: "Camera não encontrada"})
    }
    // 4. Se tudo ocorrer bem, retorna o codigo 200 (OK) + estrutura do registro no banco
    res.status(200).json(camera);
    
    // 5. Bloco de tratamento de erro caso algo aconteça
    } catch (error) {
        // 5.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
        res.status(400).json({ Erro: error.message })
    }
});


//* Atualizar Registro = HTTP  Put
router.put('/:id', async (req,res) => {
    try {
        // 1. Constante para comportar o retorno do metodo update do prisma
        const camera = await prisma.camera.update({
            // 2. where para buscar o id do registro que vai ser atualizado
            where: {id: req.params.id},
            // 3. data para passar os novos dados que vão ser atualizados, no caso eles vão estar no body do request
            data: req.body
        });
        // 4. Validação que nem as outras rotas, caso o registro não seja encontrado
        if (!camera){
            return res.status(404).json({ Erro: "Camera não encontrada"})
        }
        // 5. Retorna o codigo 200 (OK) + estrutura do registro no banco
        res.status(200).json(camera);
        // 6. Bloco de tratamento de erro caso algo aconteça
        } catch (error) {
            // 6.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
            res.status(400).json({ Erro: error.message })
        }
});

//* Apagar = HTTP  Delete
router.delete('/:id', async (req,res) => {
    try {
        // 1. Deleta o registro com base no id passado como parametro na rota
        await prisma.camera.delete({
            where: {id: req.params.id}
        });
        // 2. Retorna o codigo 204 (No Content) para informar que deu tudo certo, mas não tem conteudo para retornar por isso o end()
        res.status(204).end();

      // 3. Bloco de tratamento de erro caso algo aconteça
    } catch (error) {
        // 3.1 Apenas retona o erro que aconteceu, codigo 400 (Bad Request) + Mensagem doque aconteceu
        res.status(400).json({ Erro: error.message })
    }
})

//* Export da Rota
export default router; // Como aqui só tem uma rota, pode ser export default