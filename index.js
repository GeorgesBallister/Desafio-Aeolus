//* ============ Início do Servidor ============
import app from './src/app.js';

// Definir a porta do servidor
const PORT = process.env.PORT || 3000;

// Iniciar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});