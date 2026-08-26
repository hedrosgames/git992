const http = require('http');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const HOST = '127.0.0.1'; // Garante acesso estritamente local (mesma máquina)

let currentWorkDir = process.cwd();

const UNITY_GITIGNORE = `# This .gitignore file should be placed at the root of your Unity project directory
#
# Get latest from https://github.com/github/gitignore/blob/main/Unity.gitignore
#
.utmp/
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Uu]ser[Ss]ettings/
/*.tmp
/*.user
/*.userprefs
/*.pidb
/*.booproj
/*.svd
/*.pdb
/*.mdb
/*.opendb
/*.VC.db
/[Aa]ssets/AssetStoreTools*
/[Aa]ssets/Plugins/Editor/JetBrains*
.vs/
.gradle/
ExportedObj/
.consulo/
*.csproj
*.unityproj
*.sln
*.suo
*.tmp
*.user
*.userprefs
*.pidb
*.booproj
*.svd
*.pdb
*.mdb
*.opendb
*.VC.db
sysinfo.txt
*.apk
*.aab
*.unitypackage
*.app
crashlytics-build.properties
/[Aa]ssets/[Aa]ddressable[Aa]ssets[Dd]ata/*/*.bin*
/[Aa]ssets/[Ss]treamingAssets/aa.meta
/[Aa]ssets/[Ss]treamingAssets/aa/*
`;

const server = http.createServer((req, res) => {
  // Cabeçalhos CORS para permitir requisições do HTML local
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Responde imediatamente a requisições prévias do navegador (Preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/api/cwd' && req.method === 'GET') {
    res.writeHead(200);
    return res.end(JSON.stringify({ cwd: currentWorkDir }));
  }

  if (req.url === '/api/set-cwd' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const { targetDir } = JSON.parse(body);
        if (targetDir && fs.existsSync(targetDir)) {
          currentWorkDir = path.resolve(targetDir);
          res.writeHead(200);
          return res.end(JSON.stringify({ success: true, cwd: currentWorkDir }));
        } else {
          res.writeHead(400);
          return res.end(JSON.stringify({ erro: "Diretório não encontrado." }));
        }
      } catch (e) {
        res.writeHead(400);
        return res.end(JSON.stringify({ erro: "Requisição inválida." }));
      }
    });
    return;
  }

  if (req.url === '/api/criar-gitignore' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        const dados = body ? JSON.parse(body) : {};
        const workDir = (dados.cwd && fs.existsSync(dados.cwd)) ? dados.cwd : currentWorkDir;
        const destino = path.join(workDir, '.gitignore');
        const jaExiste = fs.existsSync(destino);

        if (jaExiste && !dados.overwrite) {
          res.writeHead(200);
          return res.end(JSON.stringify({
            saida: `Já existe um .gitignore em:\n${destino}`,
            erro: null,
            exists: true,
            cwd: workDir
          }));
        }

        fs.writeFileSync(destino, UNITY_GITIGNORE, 'utf8');
        res.writeHead(200);
        return res.end(JSON.stringify({
          saida: `Arquivo .gitignore (padrão Unity) criado em:\n${destino}`,
          erro: null,
          exists: false,
          cwd: workDir
        }));
      } catch (err) {
        res.writeHead(400);
        return res.end(JSON.stringify({ erro: err.message || 'Falha ao criar o .gitignore.' }));
      }
    });
    return;
  }

  if (req.url === '/api/exec-git' && req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { comando, cwd } = JSON.parse(body);

        // Validação básica de segurança
        if (!comando || !comando.trim().startsWith('git ')) {
          res.writeHead(400);
          return res.end(JSON.stringify({ erro: "Apenas comandos iniciados por 'git ' são permitidos!" }));
        }

        const workDir = (cwd && fs.existsSync(cwd)) ? cwd : currentWorkDir;

        // Executa o comando no terminal local com buffer ampliado
        exec(comando, {
          cwd: workDir,
          maxBuffer: 10 * 1024 * 1024, // 10MB
          windowsHide: true
        }, (error, stdout, stderr) => {
          res.writeHead(200);
          res.end(JSON.stringify({
            saida: stdout || stderr || '',
            erro: error ? (error.message || stderr) : null,
            cwd: workDir
          }));
        });

      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ erro: "Erro ao processar a requisição." }));
      }
    });

  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ erro: "Rota não encontrada." }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Painel Git Hedros rodando em: http://${HOST}:${PORT} [CWD: ${currentWorkDir}]`);
});
